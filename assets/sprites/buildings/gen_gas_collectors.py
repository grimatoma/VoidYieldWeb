"""
Gas Collector sprite sheet generator.
Produces 3 PNG files:
  gas_collector_personal_sheet.png  — 320×40  (8 × 40×40)
  gas_collector_medium_sheet.png    — 448×56  (8 × 56×56)
  gas_collector_heavy_sheet.png     — 576×72  (8 × 72×72)
"""

import math
import os
from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
TRANS       = (0,   0,   0,   0)
GREY_DARK   = (50,  52,  64,  255)
GREY_MID    = (80,  84,  100, 255)
GREY_LIGHT  = (130, 136, 160, 255)
AMBER       = (212, 168, 67,  255)
AMBER_DIM   = (140, 110, 40,  255)
TEAL        = (0,   184, 212, 255)
TEAL_DIM    = (0,   100, 130, 255)
YELLOW_GAS  = (232, 216, 112, 255)
YELLOW_DIM  = (160, 148, 60,  255)
SILVER      = (123, 168, 200, 255)
WHITE_SOFT  = (220, 210, 190, 255)
NAVY        = (13,  27,  62,  255)
BLACK_SOFT  = (20,  20,  30,  255)
GREEN       = (76,  175, 80,  255)

OUT_DIR = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# Low-level pixel helpers
# ---------------------------------------------------------------------------

def put(draw: ImageDraw.ImageDraw, x: int, y: int, color, size=1):
    """Paint a square pixel block."""
    if size == 1:
        draw.point((x, y), fill=color)
    else:
        draw.rectangle([x, y, x + size - 1, y + size - 1], fill=color)


def filled_circle(draw, cx, cy, r, color):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def ring(draw, cx, cy, r, thickness, color):
    for rr in range(r - thickness, r + 1):
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=color)


def hline(draw, x0, x1, y, color):
    draw.line([(x0, y), (x1, y)], fill=color)


def vline(draw, x, y0, y1, color):
    draw.line([(x, y0), (x, y1)], fill=color)


def rect_outline(draw, x0, y0, x1, y1, color, thickness=1):
    for t in range(thickness):
        draw.rectangle([x0 + t, y0 + t, x1 - t, y1 - t], outline=color)


def filled_rect(draw, x0, y0, x1, y1, color):
    draw.rectangle([x0, y0, x1, y1], fill=color)


def draw_vane(img_draw, cx, cy, angle_deg, length, width, color):
    """Draw a single turbine vane as a thin rotated rectangle."""
    rad = math.radians(angle_deg)
    # tip direction
    tx = cx + math.cos(rad) * length
    ty = cy + math.sin(rad) * length
    # perpendicular
    px = -math.sin(rad) * width / 2
    py = math.cos(rad) * width / 2

    pts = [
        (cx + px, cy + py),
        (cx - px, cy - py),
        (tx - px, ty - py),
        (tx + px, ty + py),
    ]
    img_draw.polygon(pts, fill=color)


def draw_blade(img_draw, cx, cy, angle_deg, length, width, base_color, tip_color):
    """Draw a turbine blade with a tip highlight."""
    rad = math.radians(angle_deg)
    px = -math.sin(rad) * width / 2
    py = math.cos(rad) * width / 2
    mid_x = cx + math.cos(rad) * (length * 0.6)
    mid_y = cy + math.sin(rad) * (length * 0.6)
    tip_x = cx + math.cos(rad) * length
    tip_y = cy + math.sin(rad) * length

    # base segment
    pts_base = [
        (cx + px * 1.2, cy + py * 1.2),
        (cx - px * 1.2, cy - py * 1.2),
        (mid_x - px, mid_y - py),
        (mid_x + px, mid_y + py),
    ]
    img_draw.polygon(pts_base, fill=base_color)
    # tip segment
    pts_tip = [
        (mid_x + px, mid_y + py),
        (mid_x - px, mid_y - py),
        (tip_x, tip_y),
    ]
    img_draw.polygon(pts_tip, fill=tip_color)


# ---------------------------------------------------------------------------
# TIER 1 — Personal (40×40, 8 frames)
# ---------------------------------------------------------------------------

def draw_personal_frame(frame: int) -> Image.Image:
    SIZE = 40
    img = Image.new("RGBA", (SIZE, SIZE), TRANS)
    d = ImageDraw.Draw(img)

    cx, cy = 20, 22

    # --- Base circle ---
    filled_circle(d, cx, cy, 16, GREY_DARK)
    ring(d, cx, cy, 16, 2, GREY_MID)

    # --- Intake mesh dots (top arc) ---
    for i in range(7):
        ang = math.radians(-120 + i * 40)
        mx = int(cx + math.cos(ang) * 12)
        my = int(cy + math.sin(ang) * 12)
        put(d, mx, my, GREY_LIGHT)

    # --- Solar strip (left side, slight angle) ---
    filled_rect(d, cx - 17, cy - 2, cx - 14, cy + 1, AMBER_DIM)
    put(d, cx - 16, cy - 1, AMBER)

    # --- 3 rotating vanes (120° apart, 45° per frame) ---
    base_angle = frame * 45
    vane_angles = [base_angle, base_angle + 120, base_angle + 240]
    for ang in vane_angles:
        draw_vane(d, cx, cy, ang, 14, 3, GREY_LIGHT)
    # Hub
    filled_circle(d, cx, cy, 3, GREY_MID)
    filled_circle(d, cx, cy, 1, GREY_DARK)

    # --- Gas tank at center ---
    tank_fill = (frame % 4) / 3.0  # slow rise pattern
    filled_circle(d, cx, cy, 5, YELLOW_DIM)
    # fill indicator arc
    fill_r = int(tank_fill * 4)
    if fill_r > 0:
        filled_circle(d, cx, cy, fill_r, YELLOW_GAS)
    filled_circle(d, cx, cy, 2, GREY_DARK)  # center dot

    # --- Status light (top-right) ---
    light_on = (frame % 2 == 0)
    put(d, cx + 12, cy - 12, GREEN if light_on else (30, 80, 35, 255), 2)

    return img


def make_personal():
    frames = 8
    W, H = 40, 40
    sheet = Image.new("RGBA", (W * frames, H), TRANS)
    for f in range(frames):
        sheet.paste(draw_personal_frame(f), (f * W, 0))
    out = os.path.join(OUT_DIR, "gas_collector_personal_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}  ({sheet.width}x{sheet.height})")


# ---------------------------------------------------------------------------
# TIER 2 — Medium (56×56, 8 frames)
# ---------------------------------------------------------------------------

def draw_medium_frame(frame: int) -> Image.Image:
    SIZE = 56
    img = Image.new("RGBA", (SIZE, SIZE), TRANS)
    d = ImageDraw.Draw(img)

    # --- Main base (44×44 centred) ---
    bx0, by0, bx1, by1 = 6, 8, 49, 51
    filled_rect(d, bx0, by0, bx1, by1, GREY_DARK)
    rect_outline(d, bx0, by0, bx1, by1, GREY_MID, 3)

    # --- Solar array (top face, 3 cells) ---
    for i in range(3):
        sx = 8 + i * 10
        filled_rect(d, sx, 9, sx + 7, 12, SILVER)
        hline(d, sx + 1, sx + 6, 10, TEAL_DIM)

    # --- 3-blade turbine (top-left quadrant) ---
    tcx, tcy = 18, 22
    base_angle = frame * 45
    for b in range(3):
        ang = base_angle + b * 120
        draw_blade(d, tcx, tcy, ang, 12, 4, GREY_MID, GREY_LIGHT)
    filled_circle(d, tcx, tcy, 3, GREY_LIGHT)
    filled_circle(d, tcx, tcy, 1, GREY_DARK)

    # --- Gas processing unit (right-center) ---
    filled_rect(d, 34, 16, 47, 33, GREY_MID)
    rect_outline(d, 34, 16, 47, 33, GREY_LIGHT, 1)
    # Yellow gas detail lines
    hline(d, 36, 45, 20, YELLOW_GAS)
    hline(d, 36, 45, 25, YELLOW_DIM)
    hline(d, 36, 45, 30, YELLOW_GAS)

    # --- Pressure gauge (front centre) ---
    gcx, gcy = 28, 38
    filled_circle(d, gcx, gcy, 4, NAVY)
    ring(d, gcx, gcy, 4, 1, AMBER_DIM)
    # Needle oscillates
    needle_ang = math.radians(-60 + frame * 25)
    nx = int(gcx + math.cos(needle_ang) * 3)
    ny = int(gcy + math.sin(needle_ang) * 3)
    d.line([(gcx, gcy), (nx, ny)], fill=AMBER)

    # --- Two storage tanks (bottom-left) ---
    for i in range(2):
        tx0 = 8 + i * 10
        # tank fill pulse
        fill_h = int(3 + (frame % 4) * 1.5) if i == 0 else int(3 + ((frame + 2) % 4) * 1.5)
        filled_rect(d, tx0, 37, tx0 + 7, 49, YELLOW_DIM)
        filled_rect(d, tx0 + 1, 49 - fill_h, tx0 + 6, 48, YELLOW_GAS)
        rect_outline(d, tx0, 37, tx0 + 7, 49, GREY_LIGHT, 1)

    # --- Exhaust vent (top-right corner) ---
    filled_rect(d, 44, 9, 47, 14, GREY_MID)
    filled_rect(d, 45, 8, 46, 9, GREY_LIGHT)

    # --- TEAL status strip (bottom edge of base) ---
    filled_rect(d, 7, 49, 48, 50, TEAL_DIM if (frame % 2 == 0) else TEAL)

    return img


def make_medium():
    frames = 8
    W, H = 56, 56
    sheet = Image.new("RGBA", (W * frames, H), TRANS)
    for f in range(frames):
        sheet.paste(draw_medium_frame(f), (f * W, 0))
    out = os.path.join(OUT_DIR, "gas_collector_medium_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}  ({sheet.width}x{sheet.height})")


# ---------------------------------------------------------------------------
# TIER 3 — Heavy (72×72, 8 frames)
# ---------------------------------------------------------------------------

def draw_heavy_frame(frame: int) -> Image.Image:
    SIZE = 72
    img = Image.new("RGBA", (SIZE, SIZE), TRANS)
    d = ImageDraw.Draw(img)

    # --- Large industrial platform (60×60) ---
    px0, py0, px1, py1 = 6, 8, 65, 67
    filled_rect(d, px0, py0, px1, py1, GREY_DARK)
    # Heavy frame
    rect_outline(d, px0, py0, px1, py1, GREY_MID, 3)
    rect_outline(d, px0 + 3, py0 + 3, px1 - 3, py1 - 3, BLACK_SOFT, 1)

    # --- Corner mounting struts ---
    for sx, sy in [(px0, py0), (px1 - 3, py0), (px0, py1 - 3), (px1 - 3, py1 - 3)]:
        filled_rect(d, sx, sy, sx + 3, sy + 3, GREY_LIGHT)

    # --- Solar backup array (top area, 3×3 grid of 6×6 cells) ---
    for row in range(2):
        for col in range(3):
            scx = 10 + col * 8
            scy = 11 + row * 7
            filled_rect(d, scx, scy, scx + 5, scy + 5, TEAL_DIM)
            # alternating AMBER/TEAL highlights
            highlight = AMBER if (row + col) % 2 == 0 else TEAL
            put(d, scx + 1, scy + 1, highlight, 2)

    # --- Dual turbines on pylons ---
    turbine_positions = [(22, 28), (50, 28)]
    rotation_dirs = [1, -1]  # opposite rotation
    for ti, (tcx, tcy) in enumerate(turbine_positions):
        # Pylon
        vline(d, tcx, tcy + 5, py1 - 1, GREY_MID)
        put(d, tcx - 1, tcy + 4, GREY_LIGHT, 3)

        base_angle = frame * 45 * rotation_dirs[ti]
        for b in range(5):
            ang = base_angle + b * 72
            draw_blade(d, tcx, tcy, ang, 10, 3, GREY_MID, GREY_LIGHT)
        filled_circle(d, tcx, tcy, 3, GREY_LIGHT)
        filled_circle(d, tcx, tcy, 1, GREY_DARK)

    # --- Central processing tower (16×24 tall, center) ---
    tower_x0, tower_y0 = 28, 22
    tower_x1, tower_y1 = 43, 45
    filled_rect(d, tower_x0, tower_y0, tower_x1, tower_y1, GREY_MID)
    rect_outline(d, tower_x0, tower_y0, tower_x1, tower_y1, GREY_LIGHT, 1)
    # Catwalk markings
    for cw_y in range(tower_y0 + 5, tower_y1, 6):
        hline(d, tower_x0, tower_x1, cw_y, GREY_DARK)
    # Tower detail — narrow window / panel
    filled_rect(d, tower_x0 + 3, tower_y0 + 2, tower_x0 + 7, tower_y0 + 8, NAVY)
    put(d, tower_x0 + 4, tower_y0 + 3, TEAL, 2)

    # --- Pressure manifold (horizontal pipe connecting cylinders) ---
    manifold_y = 52
    hline(d, 10, 61, manifold_y, GREY_LIGHT)
    hline(d, 10, 61, manifold_y + 1, GREY_MID)
    hline(d, 10, 61, manifold_y + 2, GREY_LIGHT)
    hline(d, 10, 61, manifold_y + 3, GREY_MID)

    # --- 3 large storage cylinders (bottom row) ---
    cyl_xs = [10, 26, 42]
    for ci, cx0 in enumerate(cyl_xs):
        # Pulsing fill level
        fill_offset = (ci * 2 + frame) % 8
        fill_h = 4 + int(fill_offset * 1.5)
        cy0, cy1 = 54, 64
        filled_rect(d, cx0, cy0, cx0 + 8, cy1, YELLOW_DIM)
        filled_rect(d, cx0 + 1, cy1 - fill_h, cx0 + 7, cy1 - 1, YELLOW_GAS)
        rect_outline(d, cx0, cy0, cx0 + 8, cy1, GREY_LIGHT, 1)
        # Pipe connection to manifold
        vline(d, cx0 + 4, manifold_y + 4, cy0 - 1, GREY_MID)

    # --- Gas venting pipes + gas particles ---
    # Left vent
    filled_rect(d, px0 + 2, py0 + 8, px0 + 5, py0 + 14, GREY_MID)
    # Right vent
    filled_rect(d, px1 - 6, py0 + 8, px1 - 3, py0 + 14, GREY_MID)

    # Gas particles drift upward (2 per pipe, offset by frame)
    for pipe_x in [px0 + 3, px1 - 5]:
        for p in range(2):
            particle_y = (py0 + 6 - frame * 2 - p * 5) % SIZE
            if 0 <= particle_y < SIZE:
                put(d, pipe_x, particle_y, YELLOW_GAS)
                if pipe_x + 1 < SIZE:
                    put(d, pipe_x + 1, particle_y, (*YELLOW_GAS[:3], 160))

    # --- Chasing status lights (along bottom of platform frame) ---
    num_lights = 5
    active_light = frame % num_lights
    for li in range(num_lights):
        lx = px0 + 6 + li * 10
        ly = py1 - 2
        color = TEAL if li == active_light else TEAL_DIM
        put(d, lx, ly, color, 2)

    return img


def make_heavy():
    frames = 8
    W, H = 72, 72
    sheet = Image.new("RGBA", (W * frames, H), TRANS)
    for f in range(frames):
        sheet.paste(draw_heavy_frame(f), (f * W, 0))
    out = os.path.join(OUT_DIR, "gas_collector_heavy_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}  ({sheet.width}x{sheet.height})")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    make_personal()
    make_medium()
    make_heavy()
    print("Done — all 3 Gas Collector sprite sheets generated.")
