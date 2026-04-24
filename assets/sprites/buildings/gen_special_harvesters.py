"""
gen_special_harvesters.py
Generates two animated pixel-art sprite sheets for VoidYield special harvester buildings.
  1. harvester_cave_drill_sheet.png  — 512×64  (64×64 × 8 frames)
  2. harvester_gas_trap_sheet.png    — 448×56  (56×56 × 8 frames)
"""

from PIL import Image, ImageDraw
import math, random, os

# ── Palette ──────────────────────────────────────────────────────────────────
GREY_DARK   = (50,  52,  64,  255)
GREY_MID    = (80,  84,  100, 255)
GREY_LIGHT  = (130, 136, 160, 255)
AMBER       = (212, 168, 67,  255)
VIOLET      = (75,  0,   130, 255)
PURPLE      = (138, 91,  196, 255)
DARK_GREEN  = (26,  42,  26,  255)
GREEN_GLOW  = (60,  180, 60,  255)
BLACK_DEEP  = (10,  10,  20,  255)
TEAL        = (0,   184, 212, 255)
TRANSPARENT = (0,   0,   0,   0)

def solid(color, alpha=None):
    r,g,b,a = color
    if alpha is not None:
        return (r,g,b,alpha)
    return (r,g,b,a)

# ── Helpers ───────────────────────────────────────────────────────────────────
def draw_rect(img, x, y, w, h, color):
    draw = ImageDraw.Draw(img)
    draw.rectangle([x, y, x+w-1, y+h-1], fill=color)

def draw_outline(img, x, y, w, h, color, thickness=1):
    draw = ImageDraw.Draw(img)
    for t in range(thickness):
        draw.rectangle([x+t, y+t, x+w-1-t, y+h-1-t], outline=color)

def draw_pixel(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)

def draw_circle(img, cx, cy, r, color):
    draw = ImageDraw.Draw(img)
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color)

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i]-c1[i])*t) for i in range(4))

# ─────────────────────────────────────────────────────────────────────────────
# 1. CAVE DRILL  (64×64 × 8 frames = 512×64)
# ─────────────────────────────────────────────────────────────────────────────

def draw_cave_drill_frame(frame_idx: int) -> Image.Image:
    W, H = 64, 64
    img = Image.new("RGBA", (W, H), TRANSPARENT)

    # Animation parameters
    # Drill shaft oscillates up/down ±2px (sinusoidal over 8 frames)
    # Motor shakes ±1px horizontal
    drill_offset_y = int(round(2 * math.sin(frame_idx * 2 * math.pi / 8)))   # ±2 px
    motor_shake_x  = int(round(1 * math.sin(frame_idx * 2 * math.pi / 4)))   # ±1 px (2× speed)

    # Violet glow pulse: bright on frame 0, dim on frame 4 (cos wave)
    glow_alpha = int(200 + 55 * math.cos(frame_idx * 2 * math.pi / 8))       # 145–255

    # Ore bin specks: appear on frames 2,3 then clear
    show_speck_a = frame_idx in (2, 3)
    show_speck_b = frame_idx in (3,)

    # ── Heavy mounting frame (54×54 centered, top-left at (5,5)) ──
    fx, fy = 5, 5
    draw_rect(img, fx, fy, 54, 54, GREY_DARK)
    draw_outline(img, fx, fy, 54, 54, GREY_MID, thickness=2)

    # ── Side anchor brackets (left 6×14, right 6×14) ──
    # Left bracket at (5, 26)
    bx_l, by = 5, 26
    for row in range(14):
        width = max(2, 6 - row // 3)        # taper outward from wall
        draw_rect(img, bx_l, by + row, width, 1, GREY_DARK)
    # Right bracket at (53, 26)
    bx_r = 53
    for row in range(14):
        width = max(2, 6 - row // 3)
        draw_rect(img, bx_r + (6 - width), by + row, width, 1, GREY_DARK)
    # Bracket highlight lines
    for row in range(0, 14, 3):
        draw_pixel(img, bx_l + 1, by + row, GREY_LIGHT)
        draw_pixel(img, bx_r + 4, by + row, GREY_LIGHT)

    # ── Gas fuel intake (8×6 AMBER on upper-right) ──
    draw_rect(img, 47, 10, 8, 6, AMBER)
    draw_outline(img, 47, 10, 8, 6, GREY_MID)
    # small GREY_LIGHT detail line
    draw_rect(img, 48, 12, 6, 1, GREY_LIGHT)

    # ── Ore collection bin (14×10 PURPLE, top of frame centered) ──
    bin_x = 25
    draw_rect(img, bin_x, 6, 14, 10, PURPLE)
    draw_outline(img, bin_x, 6, 14, 10, GREY_MID)
    # ore bin specks
    if show_speck_a:
        draw_pixel(img, bin_x + 4, 9, PURPLE)
        draw_pixel(img, bin_x + 4, 9, solid(GREY_LIGHT))
    if show_speck_b:
        draw_pixel(img, bin_x + 9, 11, PURPLE)
        draw_pixel(img, bin_x + 9, 11, solid(GREY_LIGHT))
    # Speck clearing (other frames: slight PURPLE speck on bin interior)
    if not show_speck_a and not show_speck_b:
        pass  # clear — already drawn bin solid

    # ── Drill motor housing (18×14 on shaft top, with motor shake) ──
    mx = 23 + motor_shake_x
    my = 17
    draw_rect(img, mx, my, 18, 14, GREY_DARK)
    draw_outline(img, mx, my, 18, 14, GREY_MID)
    # Small bolt dots (GREY_LIGHT 2×2 each)
    for bx, bby in [(mx+2, my+2), (mx+14, my+2), (mx+2, my+9), (mx+14, my+9)]:
        draw_rect(img, bx, bby, 2, 2, GREY_LIGHT)
    # 3 TEAL status LEDs on motor housing
    for i, lx in enumerate([mx+5, mx+8, mx+11]):
        draw_rect(img, lx, my+5, 2, 2, TEAL)

    # ── Central drill shaft (8×20 GREY_MID, vertical, center of frame) ──
    sx = 28
    sy = 31 + drill_offset_y      # base shaft position + oscillation
    draw_rect(img, sx, sy, 8, 20, GREY_MID)
    # Shaft highlight
    draw_rect(img, sx + 1, sy + 1, 2, 18, GREY_LIGHT)
    # Shaft shadow edge
    draw_rect(img, sx + 6, sy + 1, 1, 18, GREY_DARK)

    # ── Cave opening (16×12 BLACK_DEEP at bottom center) ──
    cav_x = 24
    cav_y = 47
    draw_rect(img, cav_x, cav_y, 16, 12, BLACK_DEEP)
    # VIOLET glow ring (1px border) with alpha pulse
    glow_color = (VIOLET[0], VIOLET[1], VIOLET[2], glow_alpha)
    draw_outline(img, cav_x, cav_y, 16, 12, glow_color, thickness=1)
    # Inner VIOLET ambient glow (softer, 2px in from edge, corners only)
    inner_glow = (VIOLET[0], VIOLET[1], VIOLET[2], glow_alpha // 2)
    for px, py in [(cav_x+2, cav_y+2), (cav_x+13, cav_y+2),
                   (cav_x+2, cav_y+9),  (cav_x+13, cav_y+9)]:
        draw_pixel(img, px, py, inner_glow)

    return img


def make_cave_drill_sheet():
    W, H = 64, 64
    sheet = Image.new("RGBA", (W * 8, H), TRANSPARENT)
    for i in range(8):
        frame = draw_cave_drill_frame(i)
        sheet.paste(frame, (i * W, 0))
    return sheet


# ─────────────────────────────────────────────────────────────────────────────
# 2. GAS TRAP  (56×56 × 8 frames = 448×56)
# ─────────────────────────────────────────────────────────────────────────────

def draw_gas_trap_frame(frame_idx: int) -> Image.Image:
    W, H = 56, 56
    img = Image.new("RGBA", (W, H), TRANSPARENT)

    # Animation: every 3rd frame is a "burst" frame (0, 3, 6)
    burst = (frame_idx % 3 == 0)

    # Burst intensity fades across off-frames (0→burst, 1→dim, 2→dimmer, 3→burst, …)
    phase = frame_idx % 3   # 0=burst, 1,2=off

    # ── Mounting legs (4 legs, 3×10 GREY_DARK below funnel) ──
    # Funnel base y = 42 (bottom of funnel is at y=42, so legs start at y=42)
    leg_y = 43
    leg_h = 10
    for lx in [6, 14, 37, 45]:
        draw_rect(img, lx, leg_y, 3, leg_h, GREY_DARK)
        draw_pixel(img, lx + 1, leg_y + 1, GREY_MID)

    # ── Wide funnel/cap at bottom ──
    # Trapezoid: wide base 40px at y=42 (x=8..47), narrows to 24px at y=30 (x=16..39)
    funnel_bottom_y = 42
    funnel_top_y    = 30
    funnel_height   = funnel_bottom_y - funnel_top_y   # 12
    funnel_base_w   = 40
    funnel_top_w    = 24
    funnel_center_x = W // 2

    for row in range(funnel_height + 1):
        t = row / funnel_height
        row_w = int(funnel_top_w + (funnel_base_w - funnel_top_w) * t)
        row_x = funnel_center_x - row_w // 2
        row_y = funnel_top_y + row
        draw_rect(img, row_x, row_y, row_w, 1, GREY_MID)

    # AMBER chevron stripes on funnel (diagonal 2px alternating)
    # Draw diagonal stripes over the funnel region
    for row in range(funnel_height + 1):
        t = row / funnel_height
        row_w = int(funnel_top_w + (funnel_base_w - funnel_top_w) * t)
        row_x = funnel_center_x - row_w // 2
        row_y = funnel_top_y + row
        # Stripe: pixel at column offset = (row * 2) mod 8 → alternating AMBER
        for col in range(row_w):
            stripe_val = (col + row * 2) % 8
            if stripe_val < 2:
                px = row_x + col
                py = row_y
                if 0 <= px < W and 0 <= py < H:
                    img.putpixel((px, py), AMBER if not burst else solid(AMBER, 255))

    # Funnel outline / warning border (2px AMBER on top edge, DARK outer edge)
    for row in range(funnel_height + 1):
        t = row / funnel_height
        row_w = int(funnel_top_w + (funnel_base_w - funnel_top_w) * t)
        row_x = funnel_center_x - row_w // 2
        row_y = funnel_top_y + row
        # Left and right edges
        if 0 <= row_x < W:
            img.putpixel((row_x,       row_y), GREY_DARK)
        if 0 <= row_x + row_w - 1 < W:
            img.putpixel((row_x + row_w - 1, row_y), GREY_DARK)
    # Top funnel edge line
    draw_rect(img, funnel_center_x - funnel_top_w//2, funnel_top_y, funnel_top_w, 1, AMBER)
    # Bottom funnel edge line
    draw_rect(img, funnel_center_x - funnel_base_w//2, funnel_bottom_y, funnel_base_w, 1, AMBER)

    # ── Central pressurized cylinder (16×24 DARK_GREEN body, x=20, y=6) ──
    cyl_x = 20
    cyl_y = 6
    cyl_w = 16
    cyl_h = 24

    # Cylinder body — in burst, top third goes GREEN_GLOW
    if burst:
        # Top 8px bright
        draw_rect(img, cyl_x, cyl_y,      cyl_w,  8,  GREEN_GLOW)
        draw_rect(img, cyl_x, cyl_y + 8,  cyl_w, 16,  DARK_GREEN)
    else:
        draw_rect(img, cyl_x, cyl_y,      cyl_w, cyl_h, DARK_GREEN)

    # 3 horizontal GREY_LIGHT ring stripes on cylinder
    for stripe_y in [cyl_y + 5, cyl_y + 12, cyl_y + 19]:
        draw_rect(img, cyl_x, stripe_y, cyl_w, 1, GREY_LIGHT)

    # Cylinder outline
    draw_outline(img, cyl_x, cyl_y, cyl_w, cyl_h, GREY_MID)

    # ── Pressure gauges (3 circles, 6×6 each on cylinder side) ──
    # Place on right side of cylinder (x=cyl_x + cyl_w + 1)
    gauge_x = cyl_x + cyl_w + 2
    for gi, gy in enumerate([cyl_y + 2, cyl_y + 9, cyl_y + 16]):
        draw_rect(img, gauge_x, gy, 6, 6, GREY_MID)
        draw_rect(img, gauge_x+1, gy+1, 4, 4, BLACK_DEEP)
        # Gauge needle indicator
        if burst and gi == 1:
            draw_pixel(img, gauge_x+3, gy+2, GREEN_GLOW)
        else:
            draw_pixel(img, gauge_x+3, gy+3, GREY_MID)

    # ── Vent valve on cylinder top (8×8 GREY_MID bump, 4×4 GREEN_GLOW nozzle) ──
    vv_x = cyl_x + cyl_w // 2 - 4   # centered on cylinder
    vv_y = cyl_y - 8
    draw_rect(img, vv_x, vv_y, 8, 8, GREY_MID)
    draw_outline(img, vv_x, vv_y, 8, 8, GREY_DARK)
    # Nozzle (4×4, centered on valve)
    nz_x = vv_x + 2
    nz_y = vv_y + 2
    nozzle_color = GREEN_GLOW if burst else solid(GREEN_GLOW, 120)
    draw_rect(img, nz_x, nz_y, 4, 4, nozzle_color)

    # ── Geyser burst — every 3rd frame ──
    if burst:
        # Green pixels shoot upward through funnel center (~6px tall column)
        burst_center_x = W // 2
        for by in range(funnel_top_y - 6, funnel_top_y):
            alpha = int(255 * (funnel_top_y - by) / 6)
            gc = (GREEN_GLOW[0], GREEN_GLOW[1], GREEN_GLOW[2], alpha)
            for bx in range(burst_center_x - 2, burst_center_x + 3):
                if 0 <= bx < W and 0 <= by < H:
                    img.putpixel((bx, by), gc)
        # Also fill the funnel center column with glow
        for by in range(funnel_top_y, funnel_bottom_y + 1):
            for bx in range(burst_center_x - 2, burst_center_x + 3):
                if 0 <= bx < W and 0 <= by < H:
                    img.putpixel((bx, by), GREEN_GLOW)

        # Warning stripes flash brighter (already drawn, re-tint amber border)
        draw_rect(img, funnel_center_x - funnel_top_w//2, funnel_top_y,    funnel_top_w,  2, AMBER)
        draw_rect(img, funnel_center_x - funnel_base_w//2, funnel_bottom_y, funnel_base_w, 2, AMBER)

    return img


def make_gas_trap_sheet():
    W, H = 56, 56
    sheet = Image.new("RGBA", (W * 8, H), TRANSPARENT)
    for i in range(8):
        frame = draw_gas_trap_frame(i)
        sheet.paste(frame, (i * W, 0))
    return sheet


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))

    drill_path = os.path.join(out_dir, "harvester_cave_drill_sheet.png")
    gas_path   = os.path.join(out_dir, "harvester_gas_trap_sheet.png")

    print("Generating harvester_cave_drill_sheet.png …")
    drill_sheet = make_cave_drill_sheet()
    drill_sheet.save(drill_path)
    print(f"  Saved: {drill_path}  ({drill_sheet.width}×{drill_sheet.height})")

    print("Generating harvester_gas_trap_sheet.png …")
    gas_sheet = make_gas_trap_sheet()
    gas_sheet.save(gas_path)
    print(f"  Saved: {gas_path}  ({gas_sheet.width}×{gas_sheet.height})")

    print("Done.")
