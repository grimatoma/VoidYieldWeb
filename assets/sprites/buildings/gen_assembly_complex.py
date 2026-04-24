"""
Assembly Complex sprite sheet generator.
96x96 pixels per frame, 8 frames -> 768x96 output.
"""
import math
from PIL import Image, ImageDraw

# ── Palette ──────────────────────────────────────────────────────────────────
TRANS        = (  0,   0,   0,   0)
GREY_DARK    = ( 50,  52,  64, 255)
GREY_MID     = ( 80,  84, 100, 255)
GREY_LIGHT   = (130, 136, 160, 255)
NAVY         = ( 13,  27,  62, 255)
NAVY_MID     = ( 22,  43,  85, 255)
AMBER        = (212, 168,  67, 255)
AMBER_DIM    = (140, 110,  40, 255)
AMBER_BRIGHT = (255, 200,  80, 255)
AMBER_GLOW   = (255, 180,  50, 160)
ORANGE       = (220, 130,  30, 255)
ORANGE_HOT   = (255, 160,  40, 255)
TEAL         = (  0, 184, 212, 255)
TEAL_DIM     = (  0, 100, 130, 255)
SILVER       = (123, 168, 200, 255)
WHITE_FLASH  = (255, 255, 240, 255)
GREEN        = ( 76, 175,  80, 255)
BLACK_SOFT   = ( 20,  20,  30, 255)
RUST         = (196,  98,  42, 255)

FRAME_W = 96
FRAME_H = 96
NUM_FRAMES = 8
SHEET_W = FRAME_W * NUM_FRAMES

# ── Helpers ───────────────────────────────────────────────────────────────────

def px(img, x, y, c):
    """Set a single pixel if in bounds."""
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), c)

def rect(img, x0, y0, x1, y1, c):
    """Filled rectangle (inclusive coords)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px(img, x, y, c)

def hrect(img, x0, y0, x1, y1, fill, border, bw=1):
    """Hollow rectangle with solid border."""
    rect(img, x0, y0, x1, y1, fill)
    for t in range(bw):
        draw_border(img, x0 + t, y0 + t, x1 - t, y1 - t, border)

def draw_border(img, x0, y0, x1, y1, c):
    for x in range(x0, x1 + 1):
        px(img, x, y0, c)
        px(img, x, y1, c)
    for y in range(y0, y1 + 1):
        px(img, x0, y, c)
        px(img, x1, y, c)

def line(img, x0, y0, x1, y1, c):
    """Bresenham line."""
    dx = abs(x1 - x0); dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    while True:
        px(img, x0, y0, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy; x0 += sx
        if e2 < dx:
            err += dx; y0 += sy

# ── Base static structure ─────────────────────────────────────────────────────

def draw_static_base(img, ox, oy):
    """
    Draw the static (non-animated) parts of the building onto img
    at frame offset (ox, oy).
    """
    cx = ox + 48  # frame center x
    cy = oy + 48  # frame center y

    # Transparent background (already transparent; fill navy background first)
    rect(img, ox, oy, ox + 95, oy + 95, TRANS)

    # ── Outer structure 84x84, centered → starts at (ox+6, oy+6) ────────────
    sx, sy = ox + 6, oy + 6
    ex, ey = ox + 89, oy + 89

    # Heavy frame fill (GREY_DARK, 4px walls)
    rect(img, sx, sy, ex, ey, GREY_DARK)

    # Interior floor 76x76 starting at (sx+4, sy+4)
    fx0, fy0 = sx + 4, sy + 4
    fx1, fy1 = ex - 4, ey - 4
    rect(img, fx0, fy0, fx1, fy1, NAVY_MID)

    # ── Power trunk line: 6px amber strip on left outer wall ─────────────────
    rect(img, sx, sy, sx + 5, ey, AMBER_DIM)
    rect(img, sx + 2, sy + 8, sx + 3, ey - 8, AMBER)

    # ── Structural corner columns 8x8 ────────────────────────────────────────
    for (cx2, cy2) in [(sx, sy), (ex - 7, sy), (sx, ey - 7), (ex - 7, ey - 7)]:
        rect(img, cx2, cy2, cx2 + 7, cy2 + 7, GREY_DARK)
        # highlight edge
        line(img, cx2 + 1, cy2 + 1, cx2 + 6, cy2 + 1, GREY_LIGHT)
        line(img, cx2 + 1, cy2 + 1, cx2 + 1, cy2 + 6, GREY_LIGHT)

    # ── Input bays (openings punched into the frame wall) ────────────────────
    # Left bay: 10w x 14h on left wall, vertically centered
    lb_x0, lb_y0 = sx, oy + 41
    lb_x1, lb_y1 = sx + 11, oy + 54
    rect(img, lb_x0, lb_y0, lb_x1, lb_y1, NAVY)
    draw_border(img, lb_x0, lb_y0, lb_x1, lb_y1, AMBER)
    draw_border(img, lb_x0 + 1, lb_y0 + 1, lb_x1 - 1, lb_y1 - 1, AMBER_DIM)

    # Top bay: 14w x 10h on top wall, horizontally centered
    tb_x0, tb_y0 = ox + 41, sy
    tb_x1, tb_y1 = ox + 54, sy + 11
    rect(img, tb_x0, tb_y0, tb_x1, tb_y1, NAVY)
    draw_border(img, tb_x0, tb_y0, tb_x1, tb_y1, AMBER)
    draw_border(img, tb_x0 + 1, tb_y0 + 1, tb_x1 - 1, tb_y1 - 1, AMBER_DIM)

    # Right bay: 10w x 14h on right wall, vertically centered
    rb_x0, rb_y0 = ex - 11, oy + 41
    rb_x1, rb_y1 = ex, oy + 54
    rect(img, rb_x0, rb_y0, rb_x1, rb_y1, NAVY)
    draw_border(img, rb_x0, rb_y0, rb_x1, rb_y1, AMBER)
    draw_border(img, rb_x0 + 1, rb_y0 + 1, rb_x1 - 1, rb_y1 - 1, AMBER_DIM)

    # Output bay: 14w x 14h on bottom wall, horizontally centered
    ob_x0, ob_y0 = ox + 41, ey - 11
    ob_x1, ob_y1 = ox + 54, ey
    rect(img, ob_x0, ob_y0, ob_x1, ob_y1, NAVY)
    draw_border(img, ob_x0, ob_y0, ob_x1, ob_y1, ORANGE)
    draw_border(img, ob_x0 + 1, ob_y0 + 1, ob_x1 - 1, ob_y1 - 1, RUST)

    # ── Floor track lines from bays toward center ─────────────────────────────
    # Left → center (horizontal track pair)
    for dy2 in [-1, 0, 1]:
        line(img, lb_x1 + 1, cy + dy2, cx - 12, cy + dy2, GREY_MID)
    # Top → center (vertical track pair)
    for dx2 in [-1, 0, 1]:
        line(img, cx + dx2, tb_y1 + 1, cx + dx2, cy - 12, GREY_MID)
    # Right → center
    for dy2 in [-1, 0, 1]:
        line(img, cx + 12, cy + dy2, rb_x0 - 1, cy + dy2, GREY_MID)
    # Bottom (output) → center
    for dx2 in [-1, 0, 1]:
        line(img, cx + dx2, cy + 12, cx + dx2, ob_y0 - 1, GREY_MID)

    # ── Central assembly platform 24x24 ──────────────────────────────────────
    ap_x0, ap_y0 = cx - 12, cy - 12
    ap_x1, ap_y1 = cx + 11, cy + 11
    rect(img, ap_x0, ap_y0, ap_x1, ap_y1, GREY_MID)
    # Hexagonal / chamfered feel: cut corners by 2px
    for cut in range(3):
        px(img, ap_x0 + cut, ap_y0 + (2 - cut), NAVY_MID)
        px(img, ap_x1 - cut, ap_y0 + (2 - cut), NAVY_MID)
        px(img, ap_x0 + cut, ap_y1 - (2 - cut), NAVY_MID)
        px(img, ap_x1 - cut, ap_y1 - (2 - cut), NAVY_MID)
    # ORANGE center highlights
    rect(img, cx - 4, cy - 4, cx + 3, cy + 3, ORANGE)
    rect(img, cx - 2, cy - 2, cx + 1, cy + 1, ORANGE_HOT)
    # Platform border
    draw_border(img, ap_x0, ap_y0, ap_x1, ap_y1, ORANGE)

    # ── Arc welder nodes at platform corners ──────────────────────────────────
    for (nx, ny) in [
        (ap_x0 - 1, ap_y0 - 1),
        (ap_x1 - 2, ap_y0 - 1),
        (ap_x0 - 1, ap_y1 - 2),
        (ap_x1 - 2, ap_y1 - 2),
    ]:
        rect(img, nx, ny, nx + 3, ny + 3, AMBER_BRIGHT)

    # ── Overhead cranes: two 4px-wide beams ──────────────────────────────────
    # Horizontal beam spanning width
    rect(img, fx0, cy - 2, fx1, cy + 1, GREY_LIGHT)
    # Vertical beam spanning height
    rect(img, cx - 2, fy0, cx + 1, fy1, GREY_LIGHT)
    # Crossing knuckle
    rect(img, cx - 2, cy - 2, cx + 1, cy + 1, SILVER)

    # ── Proximity bonus TEAL LEDs: top-right interior corner ─────────────────
    # Four dots in a small 2x2 grid
    led_bx, led_by = fx1 - 10, fy0 + 3
    for (lx, ly) in [(0, 0), (4, 0), (0, 4), (4, 4)]:
        rect(img, led_bx + lx, led_by + ly, led_bx + lx + 1, led_by + ly + 1, TEAL_DIM)

    # ── Re-draw corners on top of everything ─────────────────────────────────
    for (cx2, cy2) in [(sx, sy), (ex - 7, sy), (sx, ey - 7), (ex - 7, ey - 7)]:
        rect(img, cx2, cy2, cx2 + 7, cy2 + 7, GREY_DARK)
        line(img, cx2 + 1, cy2 + 1, cx2 + 6, cy2 + 1, GREY_LIGHT)
        line(img, cx2 + 1, cy2 + 1, cx2 + 1, cy2 + 6, GREY_LIGHT)


# ── Robotic arms ──────────────────────────────────────────────────────────────

# Arms defined by shoulder position (base fixed) + initial angle in degrees
# Shoulder positions relative to frame origin (0,0)
ARM_DEFS = [
    # (shoulder_x, shoulder_y, base_angle_deg, length)
    (48 - 26, 48,      180,  20),   # Left arm  — shoulder on left side
    (48,      48 - 26, 270,  20),   # Top arm   — shoulder on top
    (48 + 26, 48,        0,  20),   # Right arm — shoulder on right side
]
# Each arm rotates ±18° (slow oscillation)
ARM_SWING = 18.0   # degrees total swing
ARM_SPEED = 360.0 / 8  # full cycle in frames


def draw_arm(img, ox, oy, frame, arm_idx):
    """Draw one robotic arm for a given frame."""
    sx_r, sy_r, base_angle, length = ARM_DEFS[arm_idx]
    sx2 = ox + sx_r
    sy2 = oy + sy_r

    # Each arm offset by 2.67 frames to appear asynchronous
    phase = (frame + arm_idx * (8 / 3)) % 8
    t = phase / 8.0  # 0..1
    # Oscillate: sin wave for smooth swing
    swing_angle = math.sin(t * 2 * math.pi) * ARM_SWING
    angle_rad = math.radians(base_angle + swing_angle)

    ex2 = int(sx2 + length * math.cos(angle_rad))
    ey2 = int(sy2 + length * math.sin(angle_rad))

    # Draw arm body (4px width — draw 4 parallel lines)
    perp_rad = angle_rad + math.pi / 2
    for w in range(-1, 3):
        ox2 = int(w * math.cos(perp_rad))
        oy2 = int(w * math.sin(perp_rad))
        line(img, sx2 + ox2, sy2 + oy2, ex2 + ox2, ey2 + oy2, GREY_MID)

    # ORANGE joint at shoulder
    rect(img, sx2 - 2, sy2 - 2, sx2 + 2, sy2 + 2, ORANGE)
    # Tip
    rect(img, ex2 - 1, ey2 - 1, ex2 + 1, ey2 + 1, ORANGE_HOT)


# ── Track animation ───────────────────────────────────────────────────────────

def draw_animated_tracks(img, ox, oy, frame):
    """Draw floor track with dashes that shift each frame."""
    cx = ox + 48
    cy = oy + 48
    sx = ox + 6; sy = oy + 6
    ex = ox + 89; ey = oy + 89
    fx0 = sx + 4; fy0 = sy + 4
    fx1 = ex - 4; fy1 = ey - 4

    lb_x1 = sx + 11
    tb_y1 = sy + 11
    rb_x0 = ex - 11
    ob_y0 = ey - 11

    dash_offset = (frame * 2) % 8

    # Horizontal track (left bay → center, and center → right bay)
    for x in range(lb_x1 + 1, rb_x0):
        rel = (x - lb_x1 + dash_offset) % 8
        c = GREY_LIGHT if rel < 4 else GREY_DARK
        for dy2 in [-1, 1]:
            px(img, x, cy + dy2, c)

    # Vertical track (top bay → center, and center → output bay)
    for y in range(tb_y1 + 1, ob_y0):
        rel = (y - tb_y1 + dash_offset) % 8
        c = GREY_LIGHT if rel < 4 else GREY_DARK
        for dx2 in [-1, 1]:
            px(img, cx + dx2, y, c)


# ── Bay pulse ─────────────────────────────────────────────────────────────────

def draw_bay_pulse(img, ox, oy, frame):
    """Pulse input bay indicators independently."""
    sx = ox + 6; sy = oy + 6
    ex = ox + 89; ey = oy + 89

    # Left bay inner fill
    lb_inner_c = AMBER if (frame % 3 == 0) else AMBER_DIM
    rect(img, sx + 2, oy + 43, sx + 9, oy + 52, lb_inner_c)

    # Top bay inner fill
    tb_inner_c = AMBER if (frame % 3 == 1) else AMBER_DIM
    rect(img, ox + 43, sy + 2, ox + 52, sy + 9, tb_inner_c)

    # Right bay inner fill
    rb_inner_c = AMBER if (frame % 3 == 2) else AMBER_DIM
    rect(img, ex - 9, oy + 43, ex - 2, oy + 52, rb_inner_c)


# ── Arc flash ─────────────────────────────────────────────────────────────────

import random
rng = random.Random(42)  # deterministic

def draw_arc_flash(img, ox, oy, frame):
    """
    Arc welder sparks at assembly platform.
    Frame 6: big flash. Frames 2,5: small flash.
    """
    cx = ox + 48
    cy = oy + 48
    ap_x0, ap_y0 = cx - 12, cy - 12
    ap_x1, ap_y1 = cx + 11, cy + 11

    is_big_flash   = (frame == 6)
    is_small_flash = (frame in (2, 5))

    if is_big_flash:
        # Big arc flash — 7+ scattered sparks, platform edge glow
        spark_positions = [
            (-9, -8), (8, -9), (-8, 9), (9, 8), (0, -10),
            (-5, 5), (7, -3), (-3, -7), (6, 6),
        ]
        for (dx2, dy2) in spark_positions:
            sx2, sy2 = cx + dx2, cy + dy2
            rect(img, sx2 - 1, sy2 - 1, sx2 + 1, sy2 + 1, WHITE_FLASH)
            px(img, sx2, sy2, WHITE_FLASH)
        # ORANGE_HOT glow on platform edges
        for x in range(ap_x0, ap_x1 + 1):
            px(img, x, ap_y0, ORANGE_HOT)
            px(img, x, ap_y1, ORANGE_HOT)
        for y in range(ap_y0, ap_y1 + 1):
            px(img, ap_x0, y, ORANGE_HOT)
            px(img, ap_x1, y, ORANGE_HOT)
        # Welder node corners — full flash
        for (nx, ny) in [
            (ap_x0 - 1, ap_y0 - 1),
            (ap_x1 - 2, ap_y0 - 1),
            (ap_x0 - 1, ap_y1 - 2),
            (ap_x1 - 2, ap_y1 - 2),
        ]:
            rect(img, nx, ny, nx + 3, ny + 3, WHITE_FLASH)

    elif is_small_flash:
        # 2-3 arc sparks
        spark_sets = {
            2: [(-7, -6), (6, 7), (-2, 8)],
            5: [(8, -5), (-6, 4), (3, -9)],
        }
        for (dx2, dy2) in spark_sets[frame]:
            sx2, sy2 = cx + dx2, cy + dy2
            px(img, sx2, sy2, AMBER_BRIGHT)
            px(img, sx2 + 1, sy2, WHITE_FLASH)
            px(img, sx2, sy2 + 1, AMBER_BRIGHT)


# ── Crane shift ───────────────────────────────────────────────────────────────

def draw_crane(img, ox, oy, frame):
    """Overhead cranes shift 2px alternately each frame (subtle)."""
    cx = ox + 48
    cy = oy + 48
    sx = ox + 6; sy = oy + 6
    ex = ox + 89; ey = oy + 89
    fx0 = sx + 4; fy0 = sy + 4
    fx1 = ex - 4; fy1 = ey - 4

    # Horizontal crane: shift +/- 1 pixel on even/odd frames
    hshift = 1 if (frame % 2 == 0) else -1
    rect(img, fx0, cy - 2 + hshift, fx1, cy + 1 + hshift, GREY_LIGHT)

    # Vertical crane: shift +/- 1 pixel with opposite phase
    vshift = -1 if (frame % 2 == 0) else 1
    rect(img, cx - 2 + vshift, fy0, cx + 1 + vshift, fy1, GREY_LIGHT)

    # Crossing knuckle stays centered
    rect(img, cx - 2, cy - 2, cx + 1, cy + 1, SILVER)


# ── LED proximity bonus (frame 6 = all lit) ───────────────────────────────────

def draw_leds(img, ox, oy, frame):
    sx = ox + 6; sy = oy + 6
    ex = ox + 89; ey = oy + 89
    fx1 = ex - 4; fy0 = sy + 4

    led_bx, led_by = fx1 - 10, fy0 + 3
    c = TEAL if (frame == 6) else TEAL_DIM
    for (lx, ly) in [(0, 0), (4, 0), (0, 4), (4, 4)]:
        rect(img, led_bx + lx, led_by + ly, led_bx + lx + 1, led_by + ly + 1, c)


# ── Main sheet generation ─────────────────────────────────────────────────────

def build_sheet():
    sheet = Image.new("RGBA", (SHEET_W, FRAME_H), TRANS)

    for frame in range(NUM_FRAMES):
        ox = frame * FRAME_W
        oy = 0

        # 1. Static base structure
        draw_static_base(sheet, ox, oy)

        # 2. Animated tracks (overdraw floor, under cranes/arms)
        draw_animated_tracks(sheet, ox, oy, frame)

        # 3. Crane beams (animated shift)
        draw_crane(sheet, ox, oy, frame)

        # 4. Robotic arms
        for arm_idx in range(3):
            draw_arm(sheet, ox, oy, frame, arm_idx)

        # 5. Bay pulse
        draw_bay_pulse(sheet, ox, oy, frame)

        # 6. Arc welder flash
        draw_arc_flash(sheet, ox, oy, frame)

        # 7. LEDs
        draw_leds(sheet, ox, oy, frame)

    return sheet


if __name__ == "__main__":
    out_path = "C:/Users/grima/Documents/aiDev/voidDev/VoidYieldWeb/assets/sprites/buildings/assembly_complex_sheet.png"
    sheet = build_sheet()
    sheet.save(out_path)
    print(f"Saved: {out_path}")
    print(f"Size: {sheet.size[0]}x{sheet.size[1]} (expected 768x96)")
    assert sheet.size == (768, 96), f"Wrong size: {sheet.size}"
    print("OK — 768x96 verified.")
