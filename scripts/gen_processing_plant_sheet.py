"""
Generate processing_plant_sheet.png — 512×64 (8 frames × 64×64)
Processing Plant: Tier-1 factory, top-down pixel art, animated.
"""

from PIL import Image, ImageDraw
import os

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
TRANS        = (0,   0,   0,   0)
GREY_DARK    = (50,  52,  64,  255)
GREY_MID     = (80,  84,  100, 255)
GREY_LIGHT   = (130, 136, 160, 255)
AMBER        = (212, 168, 67,  255)
AMBER_DIM    = (140, 110, 40,  255)
AMBER_BRIGHT = (255, 200, 80,  255)
TEAL         = (0,   184, 212, 255)
RUST         = (196, 98,  42,  255)
RUST_DARK    = (130, 60,  20,  255)
SILVER       = (123, 168, 200, 255)
WHITE_SOFT   = (220, 210, 190, 255)
SMOKE        = (100, 100, 120, 200)
SMOKE_DIM    = (70,  70,  85,  150)
NAVY         = (13,  27,  62,  255)
BLACK_SOFT   = (20,  20,  30,  255)
GREEN        = (76,  175, 80,  255)
RED          = (200, 60,  60,  255)

FRAME_W, FRAME_H = 64, 64
NUM_FRAMES = 8

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def px(img, x, y, color):
    if 0 <= x < FRAME_W and 0 <= y < FRAME_H:
        img.putpixel((x, y), color)

def rect_fill(img, x0, y0, x1, y1, color):
    draw = ImageDraw.Draw(img)
    draw.rectangle([x0, y0, x1, y1], fill=color)

def rect_outline(img, x0, y0, x1, y1, color, width=1):
    draw = ImageDraw.Draw(img)
    draw.rectangle([x0, y0, x1, y1], outline=color, width=width)

def hline(img, x0, x1, y, color):
    for x in range(x0, x1 + 1):
        px(img, x, y, color)

def vline(img, x, y0, y1, color):
    for y in range(y0, y1 + 1):
        px(img, x, y, color)

# ---------------------------------------------------------------------------
# Draw one frame
# ---------------------------------------------------------------------------

def draw_frame(frame_idx: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME_W, FRAME_H), TRANS)

    running = frame_idx >= 2   # frames 0-1 idle, 2-7 running

    # ------------------------------------------------------------------
    # Drop shadow (1-px offset south-east, semi-transparent black)
    # ------------------------------------------------------------------
    shadow_color = (0, 0, 0, 80)
    bx, by = 5, 6          # building top-left (centered in 64×64)
    bw, bh = 54, 52
    rect_fill(img, bx + 2, by + 2, bx + bw + 1, by + bh + 1, shadow_color)

    # ------------------------------------------------------------------
    # Main body walls  (GREY_DARK)
    # ------------------------------------------------------------------
    rect_fill(img, bx, by, bx + bw - 1, by + bh - 1, GREY_DARK)

    # ------------------------------------------------------------------
    # Roof  (GREY_MID, 3px inset)
    # ------------------------------------------------------------------
    rx0, ry0 = bx + 3, by + 3
    rx1, ry1 = bx + bw - 4, by + bh - 4
    rect_fill(img, rx0, ry0, rx1, ry1, GREY_MID)

    # ------------------------------------------------------------------
    # Crosshatch grid on roof (4px spacing, GREY_LIGHT 1px lines)
    # ------------------------------------------------------------------
    grid_step = 4
    for gx in range(rx0, rx1 + 1, grid_step):
        vline(img, gx, ry0, ry1, GREY_LIGHT)
    for gy in range(ry0, ry1 + 1, grid_step):
        hline(img, rx0, rx1, gy, GREY_LIGHT)

    # ------------------------------------------------------------------
    # Corner bolts (2×2 GREY_LIGHT squares at outer wall corners)
    # ------------------------------------------------------------------
    for cx, cy in [(bx, by), (bx + bw - 2, by),
                   (bx, by + bh - 2), (bx + bw - 2, by + bh - 2)]:
        rect_fill(img, cx, cy, cx + 1, cy + 1, GREY_LIGHT)

    # ------------------------------------------------------------------
    # Smokestacks — top-left and top-right
    # Each: 6×10, GREY_MID outer, 4×4 BLACK_SOFT inner
    # They extend above the roof (start at by - 4, so partially above)
    # ------------------------------------------------------------------
    stack_positions = [(bx + 2, by - 4), (bx + bw - 8, by - 4)]
    for sx, sy in stack_positions:
        # outer cylinder (6 wide, 10 tall)
        rect_fill(img, sx, sy, sx + 5, sy + 9, GREY_MID)
        # rim highlight top
        hline(img, sx, sx + 5, sy, GREY_LIGHT)
        # inner opening (4×4 centered)
        inner_x = sx + 1
        inner_y = sy + 1
        rect_fill(img, inner_x, inner_y, inner_x + 3, inner_y + 3, BLACK_SOFT)

    # ------------------------------------------------------------------
    # Smoke particles from stacks (frames 2-7)
    # Pattern: each frame cycles smoke up by 1px
    # ------------------------------------------------------------------
    if running:
        cycle = (frame_idx - 2) % 6   # 0-5
        for sx, sy in stack_positions:
            # Particle 1: rises from sy - 1 upward
            p1y = sy - 1 - (cycle % 3)
            if 0 <= p1y < FRAME_H:
                smoke_col = SMOKE if (cycle % 2 == 0) else SMOKE_DIM
                px(img, sx + 2, p1y, smoke_col)
                if cycle % 3 > 0:
                    px(img, sx + 3, p1y - 1, SMOKE_DIM)
            # Particle 2 (offset by 3 frames so stacks alternate rhythm)
            p2y = sy - 2 - ((cycle + 3) % 4)
            if 0 <= p2y < FRAME_H:
                px(img, sx + 1, p2y, SMOKE_DIM)

    # ------------------------------------------------------------------
    # Input conveyor belt — left side (8 wide × 6 tall, centred vertically)
    # ------------------------------------------------------------------
    conv_y = by + bh // 2 - 3
    # left conveyor enters from left wall
    for seg in range(4):     # 4 × 2px segments
        shift = (frame_idx % 2) if running else 0
        seg_x = bx - 8 + seg * 2
        seg_color = RUST if ((seg + shift) % 2 == 0) else RUST_DARK
        rect_fill(img, seg_x, conv_y, seg_x + 1, conv_y + 5, seg_color)
    # belt entry arrow on wall
    px(img, bx, conv_y + 2, AMBER_DIM)
    px(img, bx, conv_y + 3, AMBER_DIM)

    # ------------------------------------------------------------------
    # Output conveyor belt — right side
    # ------------------------------------------------------------------
    for seg in range(4):
        shift = (frame_idx % 2) if running else 0
        seg_x = bx + bw + seg * 2
        seg_color = RUST if ((seg + shift) % 2 == 0) else RUST_DARK
        rect_fill(img, seg_x, conv_y, seg_x + 1, conv_y + 5, seg_color)
    # belt exit arrow on wall
    px(img, bx + bw - 1, conv_y + 2, AMBER_DIM)
    px(img, bx + bw - 1, conv_y + 3, AMBER_DIM)

    # ------------------------------------------------------------------
    # Central processing unit — 18×16 raised section, centered on roof
    # ------------------------------------------------------------------
    cpu_x = bx + (bw - 18) // 2
    cpu_y = by + (bh - 16) // 2 - 2
    cpu_color = GREY_MID if not running else (GREY_LIGHT if (frame_idx % 2 == 0) else GREY_MID)
    rect_fill(img, cpu_x, cpu_y, cpu_x + 17, cpu_y + 15, cpu_color)

    # AMBER border / hazard stripes (4px border around cpu)
    # top & bottom stripe
    for i in range(cpu_x, cpu_x + 18):
        stripe = AMBER if ((i - cpu_x) % 4 < 2) else AMBER_DIM
        px(img, i, cpu_y,      stripe)
        px(img, i, cpu_y + 15, stripe)
    # left & right stripe
    for i in range(cpu_y, cpu_y + 16):
        stripe = AMBER if ((i - cpu_y) % 4 < 2) else AMBER_DIM
        px(img, cpu_x,      i, stripe)
        px(img, cpu_x + 17, i, stripe)

    # Heat shimmer around cpu edges (running only)
    if running:
        shimmer_col = AMBER_DIM
        for dx in range(1, cpu_x + 17 - cpu_x):
            px(img, cpu_x + dx, cpu_y - 1,      shimmer_col)
            px(img, cpu_x + dx, cpu_y + 16,     shimmer_col)
        for dy in range(1, cpu_y + 15 - cpu_y):
            px(img, cpu_x - 1,  cpu_y + dy,     shimmer_col)
            px(img, cpu_x + 18, cpu_y + dy,     shimmer_col)

    # inner detail lines on cpu
    hline(img, cpu_x + 2, cpu_x + 15, cpu_y + 5,  GREY_DARK)
    hline(img, cpu_x + 2, cpu_x + 15, cpu_y + 10, GREY_DARK)
    vline(img, cpu_x + 8, cpu_y + 2, cpu_y + 13,  GREY_DARK)

    # ------------------------------------------------------------------
    # Chimney / vent pipe on top of cpu (4×6)
    # ------------------------------------------------------------------
    vent_x = cpu_x + 7
    vent_y = cpu_y - 6
    rect_fill(img, vent_x, vent_y, vent_x + 3, vent_y + 5, GREY_MID)
    px(img, vent_x + 1, vent_y,     GREY_LIGHT)
    px(img, vent_x + 2, vent_y,     GREY_LIGHT)
    rect_fill(img, vent_x + 1, vent_y + 1, vent_x + 2, vent_y + 2, BLACK_SOFT)

    # ------------------------------------------------------------------
    # Access door — bottom edge, 6×8, NAVY with AMBER frame
    # ------------------------------------------------------------------
    door_x = bx + (bw - 6) // 2
    door_y = by + bh - 8
    rect_fill(img, door_x, door_y, door_x + 5, door_y + 7, NAVY)
    rect_outline(img, door_x, door_y, door_x + 5, door_y + 7, AMBER, width=1)
    # door handle
    px(img, door_x + 4, door_y + 3, AMBER)
    px(img, door_x + 4, door_y + 4, AMBER)

    # ------------------------------------------------------------------
    # Status LEDs — 3 dots along bottom edge
    # ------------------------------------------------------------------
    led_y = by + bh - 3
    led_xs = [bx + bw // 2 - 4, bx + bw // 2, bx + bw // 2 + 4]
    led_colors_idle    = [AMBER, AMBER_DIM, RED]
    led_colors_running = [GREEN, GREEN,     GREEN]
    led_colors = led_colors_running if running else led_colors_idle
    for lx, lc in zip(led_xs, led_colors):
        px(img, lx, led_y, lc)
        px(img, lx, led_y - 1, lc)   # 1×2 LED

    # ------------------------------------------------------------------
    # Wall edge highlights (top and left outer edges of body = lighter)
    # ------------------------------------------------------------------
    hline(img, bx, bx + bw - 1, by,         GREY_MID)   # top wall edge
    vline(img, bx,      by, by + bh - 1,    GREY_MID)   # left wall edge
    hline(img, bx, bx + bw - 1, by + bh - 1, BLACK_SOFT)  # bottom shadow
    vline(img, bx + bw - 1, by, by + bh - 1, BLACK_SOFT)  # right shadow

    return img


# ---------------------------------------------------------------------------
# Assemble sheet
# ---------------------------------------------------------------------------

def main():
    sheet = Image.new("RGBA", (FRAME_W * NUM_FRAMES, FRAME_H), TRANS)
    for i in range(NUM_FRAMES):
        frame = draw_frame(i)
        sheet.paste(frame, (i * FRAME_W, 0))

    out_dir = r"C:/Users/grima/Documents/aiDev/voidDev/VoidYieldWeb/assets/sprites/buildings"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "processing_plant_sheet.png")
    sheet.save(out_path, "PNG")
    print(f"Saved: {out_path}")
    print(f"Size:  {sheet.size[0]}×{sheet.size[1]}")


if __name__ == "__main__":
    main()
