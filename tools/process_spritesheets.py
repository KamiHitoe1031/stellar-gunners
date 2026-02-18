"""
Process AI-generated 4x4 sprite sheets into game-ready horizontal strip sprite sheets.
Input: 1024x1024 4x4 grid with magenta (#FF00FF) background
Output: 1024x64 horizontal strip (16 frames x 64x64) with transparent background

Frame layout (4x4 grid -> 16 horizontal frames):
  Row 1 (0-3):  Idle front
  Row 2 (4-7):  Walk front
  Row 3 (8-11): Action/side (fire)
  Row 4 (12-15): Hit + Death
"""

from PIL import Image
import numpy as np
import os

CELL_SIZE = 256  # Each cell in the 4x4 grid
OUTPUT_SIZE = 64  # Output frame size
MAGENTA_THRESHOLD = 40  # Color distance threshold for magenta removal
GRID_COLS = 4
GRID_ROWS = 4

def remove_magenta_bg(img_array):
    """Remove magenta (#FF00FF) background, replace with transparency."""
    # Magenta: R=255, G=0, B=255
    r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]

    # Calculate distance from magenta
    dist = np.sqrt(
        (r.astype(float) - 255)**2 +
        g.astype(float)**2 +
        (b.astype(float) - 255)**2
    )

    # Create alpha channel: transparent where close to magenta
    alpha = np.where(dist < MAGENTA_THRESHOLD, 0, 255).astype(np.uint8)

    # Soft edge: anti-alias the boundary
    soft_zone = (dist >= MAGENTA_THRESHOLD) & (dist < MAGENTA_THRESHOLD + 30)
    alpha[soft_zone] = ((dist[soft_zone] - MAGENTA_THRESHOLD) / 30 * 255).clip(0, 255).astype(np.uint8)

    # Create RGBA
    rgba = np.dstack([img_array[:,:,:3], alpha])
    return rgba

def find_content_bbox(rgba_array):
    """Find the bounding box of non-transparent content."""
    alpha = rgba_array[:,:,3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not rows.any() or not cols.any():
        return 0, 0, rgba_array.shape[1], rgba_array.shape[0]
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    return cmin, rmin, cmax + 1, rmax + 1

def process_sprite_sheet(input_path, output_path):
    """Process one 1024x1024 sprite sheet into a 1024x64 horizontal strip."""
    img = Image.open(input_path).convert('RGB')
    img_array = np.array(img)

    # Remove magenta background from entire image
    rgba_array = remove_magenta_bg(img_array)
    rgba_img = Image.fromarray(rgba_array)

    # Create output horizontal strip
    total_frames = GRID_COLS * GRID_ROWS
    output_width = OUTPUT_SIZE * total_frames
    output = Image.new('RGBA', (output_width, OUTPUT_SIZE), (0, 0, 0, 0))

    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            frame_idx = row * GRID_COLS + col

            # Extract cell from original
            x1 = col * CELL_SIZE
            y1 = row * CELL_SIZE
            cell = rgba_img.crop((x1, y1, x1 + CELL_SIZE, y1 + CELL_SIZE))
            cell_array = np.array(cell)

            # Find content bounding box
            bbox = find_content_bbox(cell_array)
            content = cell.crop(bbox)

            # Scale content to fit in OUTPUT_SIZE with padding
            cw, ch = content.size
            if cw == 0 or ch == 0:
                continue

            # Scale to fit within OUTPUT_SIZE - 4 (2px padding each side)
            max_dim = OUTPUT_SIZE - 4
            scale = min(max_dim / cw, max_dim / ch)
            new_w = max(1, int(cw * scale))
            new_h = max(1, int(ch * scale))
            content_resized = content.resize((new_w, new_h), Image.LANCZOS)

            # Center in OUTPUT_SIZE x OUTPUT_SIZE frame
            paste_x = (OUTPUT_SIZE - new_w) // 2
            paste_y = (OUTPUT_SIZE - new_h) // 2

            output.paste(content_resized, (frame_idx * OUTPUT_SIZE + paste_x, paste_y), content_resized)

    output.save(output_path)
    return total_frames

def main():
    input_dir = 'assets/images/characters'
    output_dir = 'assets/images/game/spritesheets'
    os.makedirs(output_dir, exist_ok=True)

    for i in range(1, 7):
        input_path = os.path.join(input_dir, f'chr_0{i}_sprites.png')
        output_path = os.path.join(output_dir, f'chr_0{i}_normal.png')

        if not os.path.exists(input_path):
            print(f'  SKIP: {input_path} not found')
            continue

        frames = process_sprite_sheet(input_path, output_path)
        result = Image.open(output_path)
        print(f'  chr_0{i}: {result.size[0]}x{result.size[1]} ({frames} frames) -> {output_path}')

    print('\nDone! Sprite sheets processed.')

if __name__ == '__main__':
    main()
