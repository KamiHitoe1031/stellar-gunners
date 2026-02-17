"""
Stellar Gunners - Image Asset Processor
Resizes generated images to game-appropriate sizes.
Creates game-ready assets from AI-generated 1024x1024 images.
"""

import os
import json
from PIL import Image

PROJ_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(PROJ_ROOT, 'assets', 'images')
OUT_DIR = os.path.join(PROJ_ROOT, 'assets', 'images', 'game')

# Target sizes
CHAR_SPRITE_SIZE = 48       # Player character in-game size
ENEMY_SIZES = {
    'normal': 32,
    'elite': 40,
    'boss': 72,
}
ICON_SIZE = 64              # Face icon for HUD
PORTRAIT_HEIGHT = 600       # Scenario portrait height (maintain aspect ratio)

# Enemy size overrides from asset_requirements.md
ENEMY_SIZE_MAP = {
    'enemy_drone_01': 24,
    'enemy_drone_02': 28,
    'enemy_soldier_01': 32,
    'enemy_soldier_02': 36,
    'enemy_tank_01': 40,
    'enemy_sniper_01': 36,
    'enemy_healer_01': 28,
    'enemy_swarm_01': 20,
    'enemy_shield_01': 36,
    'boss_xr07': 72,
    'boss_nidhogg': 72,
    'boss_prototype': 72,
}


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def resize_image(src_path, dst_path, target_w, target_h=None):
    """Resize image. If target_h is None, use target_w for square."""
    if target_h is None:
        target_h = target_w
    img = Image.open(src_path)
    img = img.resize((target_w, target_h), Image.LANCZOS)
    img.save(dst_path, 'PNG')
    kb = os.path.getsize(dst_path) // 1024
    print(f'  {os.path.basename(dst_path)}: {target_w}x{target_h} ({kb} KB)')


def resize_maintain_aspect(src_path, dst_path, target_height):
    """Resize maintaining aspect ratio based on target height."""
    img = Image.open(src_path)
    ratio = target_height / img.height
    target_w = int(img.width * ratio)
    img = img.resize((target_w, target_height), Image.LANCZOS)
    img.save(dst_path, 'PNG')
    kb = os.path.getsize(dst_path) // 1024
    print(f'  {os.path.basename(dst_path)}: {target_w}x{target_height} ({kb} KB)')


def process_character_sprites():
    """Extract and resize character sprites for in-game use."""
    src = os.path.join(SRC_DIR, 'characters')
    dst = os.path.join(OUT_DIR, 'characters')
    ensure_dir(dst)
    print('\n=== Processing Character Sprites ===')

    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'):
            continue
        char_id = f.replace('_sprites.png', '')
        src_path = os.path.join(src, f)

        # Extract first cell (top-left 256x256 from 1024x1024 = idle frame 1)
        img = Image.open(src_path)
        cell_w = img.width // 4
        cell_h = img.height // 4
        cell = img.crop((0, 0, cell_w, cell_h))
        cell = cell.resize((CHAR_SPRITE_SIZE, CHAR_SPRITE_SIZE), Image.LANCZOS)
        out_path = os.path.join(dst, f'{char_id}.png')
        cell.save(out_path, 'PNG')
        kb = os.path.getsize(out_path) // 1024
        print(f'  {char_id}.png: {CHAR_SPRITE_SIZE}x{CHAR_SPRITE_SIZE} ({kb} KB)')


def process_enemy_sprites():
    """Resize enemy sprites to appropriate game sizes."""
    src = os.path.join(SRC_DIR, 'enemies')
    dst = os.path.join(OUT_DIR, 'enemies')
    ensure_dir(dst)
    print('\n=== Processing Enemy Sprites ===')

    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'):
            continue
        enemy_id = f.replace('.png', '')
        size = ENEMY_SIZE_MAP.get(enemy_id, 32)

        # For 2x2 sprite sheets, extract first cell
        img = Image.open(f'{src}/{f}')
        cell_w = img.width // 2
        cell_h = img.height // 2
        cell = img.crop((0, 0, cell_w, cell_h))
        cell = cell.resize((size, size), Image.LANCZOS)
        out_path = os.path.join(dst, f)
        cell.save(out_path, 'PNG')
        kb = os.path.getsize(out_path) // 1024
        print(f'  {f}: {size}x{size} ({kb} KB)')


def process_face_icons():
    """Resize face icons for HUD use."""
    src = os.path.join(SRC_DIR, 'ui')
    dst = os.path.join(OUT_DIR, 'ui')
    ensure_dir(dst)
    print('\n=== Processing Face Icons ===')

    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'):
            continue
        resize_image(
            os.path.join(src, f),
            os.path.join(dst, f),
            ICON_SIZE, ICON_SIZE
        )


def process_portraits():
    """Resize portraits for ScenarioScene (maintain aspect ratio)."""
    src = os.path.join(SRC_DIR, 'portraits')
    dst = os.path.join(OUT_DIR, 'portraits')
    ensure_dir(dst)
    print('\n=== Processing Portraits ===')

    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'):
            continue
        resize_maintain_aspect(
            os.path.join(src, f),
            os.path.join(dst, f),
            PORTRAIT_HEIGHT
        )


def process_backgrounds():
    """Copy backgrounds (already reasonable size)."""
    src = os.path.join(SRC_DIR, 'backgrounds')
    dst = os.path.join(OUT_DIR, 'backgrounds')
    ensure_dir(dst)
    print('\n=== Processing Backgrounds ===')

    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'):
            continue
        # Just copy - already reasonable resolution
        img = Image.open(os.path.join(src, f))
        print(f'  {f}: {img.width}x{img.height} (kept as-is)')
        img.save(os.path.join(dst, f), 'PNG')


def main():
    print('=' * 60)
    print('Stellar Gunners - Image Asset Processor')
    print(f'Source: {SRC_DIR}')
    print(f'Output: {OUT_DIR}')
    print('=' * 60)

    process_character_sprites()
    process_enemy_sprites()
    process_face_icons()
    process_portraits()
    process_backgrounds()

    print('\n' + '=' * 60)
    print('Done! Game-ready assets saved to assets/images/game/')
    print('=' * 60)


if __name__ == '__main__':
    main()
