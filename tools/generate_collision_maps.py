"""
Stellar Gunners - Collision Map Generator
Analyzes area background images using Gemini Vision to extract
walkable/non-walkable grid data for game physics.
"""

import base64
import json
import os
import re
import sys
import time
from collections import deque
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))
from generate_images import API_KEY, DELAY_BETWEEN_REQUESTS

MODEL = "gemini-2.5-flash"
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

STAGES_PATH = PROJECT_ROOT / "assets" / "data" / "stages.json"
AREA_BG_DIR = PROJECT_ROOT / "assets" / "images" / "area_backgrounds"
OUTPUT_DIR = PROJECT_ROOT / "assets" / "data" / "collision_maps"

GRID_COLS = 30
GRID_ROWS = 22

CELL_W = 1200 // GRID_COLS  # 40px
CELL_H = 900 // GRID_ROWS   # ~41px

VISION_PROMPT = f"""Analyze this top-down game background image to create a detailed collision map.

The image is 1200x900px, divided into a {GRID_COLS}-column x {GRID_ROWS}-row grid.
Each cell is approximately {CELL_W}x{CELL_H} pixels.

For each cell:
- 0 = WALKABLE: flat ground, roads, paved areas, open floor, corridors, clearings, paths, grass, dirt
- 1 = BLOCKED: walls, pillars, building structures, large equipment, vehicles, containers, crates, barrels, thick pipes, control panels, server racks, rubble piles, barricades, fences, railings, water, pits

Classification rules:
- Small obstacles (crates, barrels, equipment, desks, chairs) that take up most of the cell = 1 (blocked)
- Narrow passages between obstacles should still be walkable (0) if there's room to walk
- Mark a cell as 1 if ANY substantial solid object occupies >40% of that cell
- Roads, paths, corridors, open areas = always 0
- Look carefully at the visual details - small objects matter at this resolution

Connectivity rules (CRITICAL):
- ALL walkable cells must form ONE connected region
- Center area (columns {GRID_COLS//2-2}-{GRID_COLS//2+2}, rows {GRID_ROWS//2-2}-{GRID_ROWS//2+1}) MUST be walkable
- Every edge must have at least 4 walkable cells connected to center
- Wall density: 15-35% of total cells ({int(GRID_ROWS*GRID_COLS*0.15)}-{int(GRID_ROWS*GRID_COLS*0.35)} wall cells out of {GRID_ROWS*GRID_COLS})

Output ONLY valid JSON, no markdown, no explanation:
{{"grid": [[0,0,0,...], [0,0,0,...], ...]}}

Exactly {GRID_ROWS} rows, each with exactly {GRID_COLS} values (0 or 1).
Row 0 = top, row {GRID_ROWS-1} = bottom. Column 0 = left, column {GRID_COLS-1} = right."""


def analyze_image(image_path, retry=3):
    """Send image to Gemini Vision and get collision grid as JSON."""
    import requests

    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()

    headers = {
        "x-goog-api-key": API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "contents": [{
            "parts": [
                {"text": VISION_PROMPT},
                {"inlineData": {"mimeType": "image/png", "data": img_b64}}
            ]
        }],
        "generationConfig": {
            "responseModalities": ["TEXT"],
            "temperature": 0.1
        }
    }

    for attempt in range(retry + 1):
        try:
            print(f"  Analyzing: {Path(image_path).name} (attempt {attempt + 1})...", flush=True)
            response = requests.post(ENDPOINT, headers=headers, json=payload, timeout=180)

            if response.status_code == 429:
                wait_time = 90 * (attempt + 1)  # 90s, 180s, 270s, 360s
                print(f"  Rate limited. Waiting {wait_time}s...", flush=True)
                time.sleep(wait_time)
                continue

            response.raise_for_status()
            result = response.json()

            candidates = result.get("candidates", [])
            if not candidates:
                print(f"  WARNING: No candidates in response")
                if attempt < retry:
                    time.sleep(10)
                    continue
                return None

            parts = candidates[0].get("content", {}).get("parts", [])
            text_response = ""
            for part in parts:
                if "text" in part:
                    text_response += part["text"]

            if not text_response:
                print(f"  WARNING: No text in response")
                if attempt < retry:
                    time.sleep(10)
                    continue
                return None

            # Parse JSON from response (may contain markdown fences)
            json_str = text_response.strip()
            # Remove markdown code fences if present
            json_str = re.sub(r'^```json\s*', '', json_str)
            json_str = re.sub(r'^```\s*', '', json_str)
            json_str = re.sub(r'\s*```$', '', json_str)

            grid_data = json.loads(json_str)
            grid = grid_data.get("grid", [])

            if len(grid) != GRID_ROWS:
                print(f"  WARNING: Expected {GRID_ROWS} rows, got {len(grid)}")
                if attempt < retry:
                    time.sleep(10)
                    continue
                return None

            for i, row in enumerate(grid):
                if len(row) != GRID_COLS:
                    print(f"  WARNING: Row {i} has {len(row)} cols, expected {GRID_COLS}")
                    # Pad or truncate
                    if len(row) < GRID_COLS:
                        row.extend([0] * (GRID_COLS - len(row)))
                    else:
                        grid[i] = row[:GRID_COLS]

            print(f"  OK: Grid extracted ({GRID_ROWS}x{GRID_COLS})", flush=True)
            return grid

        except json.JSONDecodeError as e:
            print(f"  JSON parse error: {e}", flush=True)
            print(f"  Raw text: {text_response[:300]}", flush=True)
            if attempt < retry:
                time.sleep(15)
        except Exception as e:
            print(f"  Error: {e}", flush=True)
            if attempt < retry:
                time.sleep(15)

    return None


def flood_fill(grid, start_row, start_col):
    """BFS flood fill from start position, returns set of reachable (row, col)."""
    visited = set()
    queue = deque([(start_row, start_col)])
    visited.add((start_row, start_col))

    while queue:
        r, c = queue.popleft()
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < GRID_ROWS and 0 <= nc < GRID_COLS and (nr, nc) not in visited:
                if grid[nr][nc] == 0:
                    visited.add((nr, nc))
                    queue.append((nr, nc))

    return visited


def carve_path(grid, from_r, from_c, to_r, to_c):
    """Carve a walkable path between two points using simple line."""
    r, c = from_r, from_c
    while r != to_r or c != to_c:
        grid[r][c] = 0
        if r < to_r:
            r += 1
        elif r > to_r:
            r -= 1
        if c < to_c:
            c += 1
        elif c > to_c:
            c -= 1
        grid[r][c] = 0


def validate_and_fix_grid(grid):
    """Ensure grid is playable: center walkable, edges reachable, density reasonable."""
    # 1. Force center area to be walkable (player spawn)
    center_r = GRID_ROWS // 2
    center_c = GRID_COLS // 2
    for r in range(center_r - 2, center_r + 2):
        for c in range(center_c - 3, center_c + 3):
            if 0 <= r < GRID_ROWS and 0 <= c < GRID_COLS:
                grid[r][c] = 0

    # 2. Flood fill from center
    reachable = flood_fill(grid, center_r, center_c)

    # 3. Ensure each edge has reachable walkable cells
    edges = {
        'top': [(0, c) for c in range(GRID_COLS)],
        'bottom': [(GRID_ROWS - 1, c) for c in range(GRID_COLS)],
        'left': [(r, 0) for r in range(GRID_ROWS)],
        'right': [(r, GRID_COLS - 1) for r in range(GRID_ROWS)]
    }

    for edge_name, edge_cells in edges.items():
        reachable_on_edge = [(r, c) for r, c in edge_cells if (r, c) in reachable]
        if len(reachable_on_edge) < 2:
            # Carve a path from center to middle of this edge
            mid = edge_cells[len(edge_cells) // 2]
            carve_path(grid, center_r, center_c, mid[0], mid[1])
            # Also clear a few cells around the target
            for r, c in edge_cells:
                if abs(r - mid[0]) + abs(c - mid[1]) <= 2:
                    grid[r][c] = 0

    # 4. Cap wall density at 40%
    total = GRID_ROWS * GRID_COLS
    wall_count = sum(cell for row in grid for cell in row)
    if wall_count > total * 0.4:
        # Remove random walls until under 35%
        target = int(total * 0.35)
        wall_positions = [(r, c) for r in range(GRID_ROWS) for c in range(GRID_COLS) if grid[r][c] == 1]
        import random
        random.shuffle(wall_positions)
        while wall_count > target and wall_positions:
            r, c = wall_positions.pop()
            # Don't remove edge walls (keep some structure)
            if 1 <= r <= GRID_ROWS - 2 and 1 <= c <= GRID_COLS - 2:
                grid[r][c] = 0
                wall_count -= 1

    return grid


def generate_collision_maps(target_stages=None):
    """Generate collision maps for all stages."""
    with open(STAGES_PATH, 'r', encoding='utf-8') as f:
        stages = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for stage in stages:
        stage_id = stage['id']
        if target_stages and stage_id not in target_stages:
            continue

        areas = stage.get('areas', [])
        if not areas:
            continue

        output_path = OUTPUT_DIR / f"collision_{stage_id}.json"
        if output_path.exists():
            print(f"\nSKIP (exists): collision_{stage_id}.json")
            continue

        print(f"\n{'='*60}")
        print(f"Stage: {stage_id} ({stage.get('name', '')})")
        print(f"{'='*60}")

        collision_data = {
            "stageId": stage_id,
            "areas": []
        }

        for area_idx, area in enumerate(areas):
            area_name = area.get('areaName', f'Area {area_idx}')
            image_path = AREA_BG_DIR / f"area_{stage_id}_{area_idx}.png"

            if not image_path.exists():
                print(f"  WARNING: No image for area {area_idx} ({area_name}), skipping")
                # Generate a default open grid
                default_grid = [[0] * GRID_COLS for _ in range(GRID_ROWS)]
                collision_data["areas"].append({
                    "areaIndex": area_idx,
                    "areaName": area_name,
                    "grid": default_grid
                })
                continue

            print(f"\n  Area {area_idx}: {area_name}", flush=True)
            grid = analyze_image(str(image_path))

            if grid is None:
                print(f"  FAILED: Using default open grid for area {area_idx}", flush=True)
                grid = [[0] * GRID_COLS for _ in range(GRID_ROWS)]
            else:
                # Post-process to ensure playability
                grid = validate_and_fix_grid(grid)
                wall_count = sum(cell for row in grid for cell in row)
                total = GRID_ROWS * GRID_COLS
                print(f"  Wall density: {wall_count}/{total} ({wall_count/total*100:.1f}%)", flush=True)

            collision_data["areas"].append({
                "areaIndex": area_idx,
                "areaName": area_name,
                "grid": grid
            })

            # Respect rate limit: 15s between calls
            time.sleep(15)

        # Save collision data for this stage
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(collision_data, f, ensure_ascii=False, indent=2)
        print(f"\n  Saved: {output_path.name}")


def main():
    print("=" * 60)
    print("Stellar Gunners - Collision Map Generator")
    print(f"API Key: {API_KEY[:10]}...")
    print(f"Grid: {GRID_COLS}x{GRID_ROWS} ({CELL_W}x{CELL_H}px per cell)")
    print("=" * 60)

    target_stages = None
    if len(sys.argv) > 1:
        target_stages = sys.argv[1:]
        print(f"Target stages: {target_stages}")

    generate_collision_maps(target_stages)
    print("\nDone!")


if __name__ == "__main__":
    main()
