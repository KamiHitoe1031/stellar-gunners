"""
Stellar Gunners - Area Background Image Generator
Generates a unique top-down background image for each stage area.
Uses Gemini API (gemini-3-pro-image-preview).
"""

import json
import os
import sys
import time
from pathlib import Path

# Reuse the generate_image function from generate_images.py
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))
from generate_images import generate_image, API_KEY, DELAY_BETWEEN_REQUESTS

STAGES_PATH = PROJECT_ROOT / "assets" / "data" / "stages.json"
OUTPUT_DIR = PROJECT_ROOT / "assets" / "images" / "area_backgrounds"

# Theme descriptions for top-down backgrounds
THEME_DESCRIPTIONS = {
    'city': 'post-apocalyptic urban street with cracked asphalt roads, ruined cars, damaged building walls on sides, scattered debris and rubble on road edges, open road in the middle',
    'city_interior': 'interior of an abandoned building viewed from above, tiled floor with cracks, broken furniture against walls, corridor walls forming passageways, doors and doorframes',
    'city_ruins': 'heavily destroyed city block from above, collapsed concrete structures, large rubble piles blocking paths, craters in the ground, exposed rebar and twisted metal',
    'underground': 'underground tunnel system from above, concrete corridor with pipes along walls, dim emergency lighting strips on floor, ventilation grates, water puddles on dark floor',
    'lab': 'high-tech research laboratory from above, clean white-blue floor tiles, computer terminal desks arranged in rows, glass containment chambers, holographic display stations',
    'lab_corridor': 'sterile laboratory corridor from above, polished metal floor panels, sealed vault-style doors on sides, fluorescent ceiling light reflections on floor, cable conduits along walls',
    'boss_arena': 'grand circular combat chamber from above, central open platform with glowing energy lines, massive energy conduits forming walls around the edges, pulsing red-purple void energy veins in the floor'
}

# Layout hints that describe obstacle density and arrangement
LAYOUT_HINTS = {
    'open': 'very open area with almost no obstacles, wide clear floor space for movement',
    'sparse': 'mostly open with a few scattered small obstacles like supply crates or small debris piles, plenty of room to maneuver',
    'moderate': 'medium density of obstacles - walls and barriers creating partial cover spots, mix of open areas and blocked sections',
    'corridor': 'narrow corridor-like passages between thick walls, creating lanes and chokepoints, limited lateral movement',
    'pillars': 'open area with evenly spaced large structural pillars or columns, creating a grid-like pattern of cover',
    'arena': 'circular arena layout with symmetrical pillar placement around the outer edges, large open center area',
    'bunker': 'heavily fortified area with many walls, barricades and sandbag positions creating defensive strongpoints and cover'
}


def build_area_prompt(stage_name, area_name, bg_theme, layout):
    """Build a detailed prompt for area-specific background image."""
    theme_desc = THEME_DESCRIPTIONS.get(bg_theme, THEME_DESCRIPTIONS['city'])
    layout_hint = LAYOUT_HINTS.get(layout, LAYOUT_HINTS['moderate'])

    prompt = (
        f"Create a top-down overhead view background image for a 2D sci-fi shooting game stage. "
        f"This is area '{area_name}' in stage '{stage_name}'. "
        f"Setting: {theme_desc}. "
        f"Layout style: {layout_hint}. "
        f"CRITICAL REQUIREMENTS: "
        f"1. Strictly top-down bird's eye view - camera looking STRAIGHT DOWN at the floor. "
        f"2. Walkable floor areas (roads, corridors, open ground) must be clearly LIGHTER and FLATTER in color. "
        f"3. Non-walkable obstacles (walls, rubble, heavy equipment, pillars) must be clearly DARKER and visually RAISED/3D. "
        f"4. The CENTER of the image MUST be open walkable space (this is where the player spawns). "
        f"5. All four EDGES of the image must have some walkable space (enemies enter from edges). "
        f"6. Clear visual contrast between walkable and non-walkable areas. "
        f"Style: detailed anime game background art, atmospheric sci-fi military setting, "
        f"no characters or creatures visible, only environment and structures. "
        f"Post-apocalyptic dystopian city aesthetic with advanced technology remnants."
    )
    return prompt


def generate_all_area_backgrounds(target_stages=None):
    """Generate background images for all areas in all stages."""
    with open(STAGES_PATH, 'r', encoding='utf-8') as f:
        stages = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total_areas = 0
    generated = 0
    skipped = 0
    errors = 0

    for stage in stages:
        stage_id = stage['id']
        stage_name = stage.get('name', stage_id)

        # Filter by target stages if specified
        if target_stages and stage_id not in target_stages:
            continue

        areas = stage.get('areas', [])
        if not areas:
            continue

        for area_idx, area in enumerate(areas):
            total_areas += 1
            filename = f"area_{stage_id}_{area_idx}.png"
            output_path = OUTPUT_DIR / filename

            if output_path.exists():
                print(f"  SKIP (exists): {filename}")
                skipped += 1
                continue

            bg_theme = area.get('bgTheme', 'city')
            layout = area.get('layout', 'moderate')
            area_name = area.get('areaName', f'Area {area_idx + 1}')

            print(f"\n{'='*60}")
            print(f"Stage: {stage_name} | Area {area_idx}: {area_name}")
            print(f"Theme: {bg_theme} | Layout: {layout}")
            print(f"{'='*60}")

            prompt = build_area_prompt(stage_name, area_name, bg_theme, layout)
            result = generate_image(prompt, str(output_path), aspect_ratio="4:3", image_size="1K")

            if result:
                generated += 1
            else:
                errors += 1
                print(f"  FAILED: {filename}")

            time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\n{'='*60}")
    print(f"Summary: {generated} generated, {skipped} skipped, {errors} errors (total {total_areas} areas)")
    print(f"{'='*60}")


def main():
    print("=" * 60)
    print("Stellar Gunners - Area Background Generator")
    print(f"API Key: {API_KEY[:10]}...")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    target_stages = None
    if len(sys.argv) > 1:
        # Allow specifying specific stages: python generate_area_backgrounds.py stage_1_1 stage_1_2
        target_stages = sys.argv[1:]
        print(f"Target stages: {target_stages}")

    generate_all_area_backgrounds(target_stages)
    print("\nDone!")


if __name__ == "__main__":
    main()
