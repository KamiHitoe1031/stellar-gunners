"""
Stellar Gunners - Area Background Image Processor
Resizes generated area backgrounds to game resolution (1200x900)
and creates stage selection thumbnails (160x120).
"""

import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).parent.parent
STAGES_PATH = PROJECT_ROOT / "assets" / "data" / "stages.json"
RAW_DIR = PROJECT_ROOT / "assets" / "images" / "area_backgrounds"
GAME_DIR = PROJECT_ROOT / "assets" / "images" / "game" / "area_backgrounds"
THUMB_DIR = PROJECT_ROOT / "assets" / "images" / "game" / "thumbnails"

GAME_WIDTH = 1200
GAME_HEIGHT = 900
THUMB_WIDTH = 160
THUMB_HEIGHT = 120


def process_backgrounds():
    """Resize raw backgrounds to game resolution."""
    GAME_DIR.mkdir(parents=True, exist_ok=True)

    count = 0
    for src_path in sorted(RAW_DIR.glob("area_*.png")):
        dst_path = GAME_DIR / src_path.name

        if dst_path.exists():
            print(f"  SKIP (exists): {src_path.name}")
            continue

        try:
            img = Image.open(src_path)
            resized = img.resize((GAME_WIDTH, GAME_HEIGHT), Image.LANCZOS)
            resized.save(dst_path, "PNG", optimize=True)
            size_kb = dst_path.stat().st_size / 1024
            print(f"  OK: {src_path.name} → {GAME_WIDTH}x{GAME_HEIGHT} ({size_kb:.0f} KB)")
            count += 1
        except Exception as e:
            print(f"  ERROR: {src_path.name}: {e}")

    print(f"\nProcessed {count} backgrounds to {GAME_DIR}")


def generate_thumbnails():
    """Create stage thumbnails from first area backgrounds."""
    THUMB_DIR.mkdir(parents=True, exist_ok=True)

    with open(STAGES_PATH, 'r', encoding='utf-8') as f:
        stages = json.load(f)

    count = 0
    for stage in stages:
        stage_id = stage['id']
        # Use first area's background as the stage thumbnail
        src_path = GAME_DIR / f"area_{stage_id}_0.png"
        if not src_path.exists():
            # Try raw directory
            src_path = RAW_DIR / f"area_{stage_id}_0.png"
        if not src_path.exists():
            print(f"  SKIP (no image): {stage_id}")
            continue

        dst_path = THUMB_DIR / f"{stage_id}.png"
        if dst_path.exists():
            print(f"  SKIP (exists): {stage_id}.png")
            continue

        try:
            img = Image.open(src_path)
            thumb = img.resize((THUMB_WIDTH, THUMB_HEIGHT), Image.LANCZOS)
            thumb.save(dst_path, "PNG", optimize=True)
            size_kb = dst_path.stat().st_size / 1024
            print(f"  OK: {stage_id}.png ({THUMB_WIDTH}x{THUMB_HEIGHT}, {size_kb:.0f} KB)")
            count += 1
        except Exception as e:
            print(f"  ERROR: {stage_id}: {e}")

    print(f"\nGenerated {count} thumbnails to {THUMB_DIR}")


def main():
    print("=" * 60)
    print("Stellar Gunners - Area Background Processor")
    print("=" * 60)

    task = sys.argv[1] if len(sys.argv) > 1 else "all"

    if task in ("resize", "all"):
        print("\n=== Resizing Backgrounds ===\n")
        process_backgrounds()

    if task in ("thumbs", "all"):
        print("\n=== Generating Thumbnails ===\n")
        generate_thumbnails()

    print("\nDone!")


if __name__ == "__main__":
    main()
