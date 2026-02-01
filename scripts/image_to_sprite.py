#!/usr/bin/env python3
"""
Convert an image to a pixel sprite array for SpriteGenerator.ts
Analyzes each pixel and outputs 0 (background) or 1 (foreground)
"""

from PIL import Image
import sys
import os

def image_to_sprite(image_path: str, threshold: int = 128, target_width: int = None):
    """
    Convert image to sprite pixel array.

    Args:
        image_path: Path to the image file
        threshold: Brightness threshold (0-255). Pixels darker than this are foreground (1)
        target_width: Optional target width to resize to (maintains aspect ratio)

    Returns:
        2D list of 0s and 1s
    """
    # Load image
    img = Image.open(image_path)

    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # Resize if target width specified
    if target_width:
        aspect_ratio = img.height / img.width
        target_height = int(target_width * aspect_ratio)
        img = img.resize((target_width, target_height), Image.Resampling.NEAREST)

    width, height = img.size
    print(f"Image size: {width}x{height}", file=sys.stderr)

    pixels = []

    for y in range(height):
        row = []
        for x in range(width):
            r, g, b = img.getpixel((x, y))
            # Calculate brightness (grayscale value)
            brightness = (r + g + b) / 3
            # Dark pixels (below threshold) are foreground (1), light pixels are background (0)
            pixel_value = 1 if brightness < threshold else 0
            row.append(pixel_value)
        pixels.append(row)

    return pixels, width, height


def format_as_typescript(pixels: list, name: str = "SPRITE") -> str:
    """Format pixel array as TypeScript constant"""
    lines = [f"const {name} = {{"]
    lines.append("  pixels: [")

    for row in pixels:
        row_str = ",".join(str(p) for p in row)
        lines.append(f"    [{row_str}],")

    lines.append("  ],")
    lines.append("};")

    return "\n".join(lines)


def format_as_compact(pixels: list) -> str:
    """Format pixel array in compact form"""
    lines = ["["]

    for row in pixels:
        row_str = ",".join(str(p) for p in row)
        lines.append(f"  [{row_str}],")

    lines.append("]")

    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python image_to_sprite.py <image_path> [threshold] [target_width]")
        print("  threshold: 0-255, default 128. Pixels darker than this become 1")
        print("  target_width: optional, resize image to this width")
        sys.exit(1)

    image_path = sys.argv[1]
    threshold = int(sys.argv[2]) if len(sys.argv) > 2 else 128
    target_width = int(sys.argv[3]) if len(sys.argv) > 3 else None

    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    pixels, width, height = image_to_sprite(image_path, threshold, target_width)

    # Output TypeScript format
    print(format_as_typescript(pixels, "STACK_ATTACK_LOGO"))

    # Summary
    total_pixels = width * height
    filled_pixels = sum(sum(row) for row in pixels)
    print(f"\n// Dimensions: {width}x{height}", file=sys.stderr)
    print(f"// Total pixels: {total_pixels}", file=sys.stderr)
    print(f"// Filled pixels: {filled_pixels} ({filled_pixels/total_pixels*100:.1f}%)", file=sys.stderr)


if __name__ == "__main__":
    main()
