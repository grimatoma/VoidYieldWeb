"""
Generate 3 animated pixel art sprite sheets for VoidYield factory/science buildings.
Each sheet: HORIZONTAL STRIP, 8 frames, RGBA transparent.

1. research_lab_sheet.png     — 512×64  (8 × 64×64)
2. ore_refinery_sheet.png     — 512×64  (8 × 64×64)
3. fuel_synthesizer_sheet.png — 448×56  (8 × 56×56)
"""

from PIL import Image, ImageDraw
import math

# ── Palette ──────────────────────────────────────────────────────────────────
GREY_DARK    = (50,  52,  64,  255)
GREY_MID     = (80,  84,  100, 255)
GREY_LIGHT   = (130, 136, 160, 255)
NAVY         = (13,  27,  62,  255)
NAVY_MID     = (22,  43,  85,  255)
AMBER        = (212, 168, 67,  255)
TEAL         = (0,   184, 212, 255)
CYAN         = (0,   220, 220, 255)
SILVER       = (123, 168, 200, 255)
SILVER_BRIGHT= (180, 220, 250, 255)
GREEN        = (76,  175, 80,  255)
YELLOW_GAS   = (232, 216, 112, 255)
ORANGE       = (220, 130, 30,  255)
WHITE_FLASH  = (255, 255, 240, 255)
RUST         = (196, 98,  42,  255)
RUST_DARK    = (140, 60,  20,  255)
TRANSPARENT  = (0,   0,   0,   0)


def px(draw, x, y, color):
    """Draw single pixel."""
    draw.point((x, y), fill=color)


def rect(draw, x, y, w, h, color):
    """Filled rectangle."""
    draw.rectangle([x, y, x+w-1, y+h-1], fill=color)


def outline_rect(draw, x, y, w, h, border_color, fill_color=None):
    """Rectangle with border, optional fill."""
    if fill_color:
        draw.rectangle([x+1, y+1, x+w-2, y+h-2], fill=fill_color)
    draw.rectangle([x, y, x+w-1, y+h-1], outline=border_color, width=1)


def circle(draw, cx, cy, r, color):
    """Filled circle (pixel-art friendly, ~1px per scan line)."""
    for dy in range(-r, r+1):
        dx = int(math.sqrt(max(0, r*r - dy*dy)))
        draw.line([(cx-dx, cy+dy), (cx+dx, cy+dy)], fill=color)


def blend(c1, c2, t):
    """Linear blend between two RGBA colours; t in [0,1]."""
    return tuple(int(c1[i] + (c2[i]-c1[i])*t) for i in range(4))


# ─────────────────────────────────────────────────────────────────────────────
# 1.  RESEARCH LAB  (64×64 × 8)
# ─────────────────────────────────────────────────────────────────────────────

def build_research_lab_frame(f: int) -> Image.Image:
    W, H = 64, 64
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # ── Main body  54×50, centred horizontally, sitting at y=13
    bx, by = 5, 13
    rect(d, bx, by, 54, 50, GREY_DARK)
    # subtle top-edge highlight
    d.line([(bx, by), (bx+53, by)], fill=GREY_MID)
    # bottom-edge shadow
    d.line([(bx, by+49), (bx+53, by+49)], fill=(30, 32, 40, 255))

    # ── Crystal lattice slot  8×6  left side (x=8, y=27)
    lx, ly = 8, 27
    slot_fill = TEAL if (f % 4 == 3) else SILVER
    outline_rect(d, lx, ly, 8, 6, SILVER, slot_fill)

    # ── 3 thin antennas top  (1×10, tips at y=3)
    antenna_xs = [22, 28, 34]
    for i, ax in enumerate(antenna_xs):
        d.line([(ax, 3), (ax, 12)], fill=GREY_MID)
        tip_on = (f + i) % 3 == 0
        tip_color = WHITE_FLASH if tip_on else TEAL
        px(d, ax, 3, tip_color)

    # ── Dome: 20×20 circle, centre at (32, 25)
    dcx, dcy, dr = 32, 25, 9
    circle(d, dcx, dcy, dr, NAVY_MID)
    # dome frame ring (draw circle outline by overdrawing)
    for angle_deg in range(0, 360, 6):
        a = math.radians(angle_deg)
        fx2 = dcx + int(round(dr * math.cos(a)))
        fy2 = dcy + int(round(dr * math.sin(a)))
        px(d, fx2, fy2, GREY_MID)

    # 6 TEAL pixels orbit clockwise inside dome (advance 45° per frame)
    for i in range(6):
        angle = math.radians(i * 60 + f * 45)
        orb_r = 5
        ox = dcx + int(round(orb_r * math.cos(angle)))
        oy = dcy + int(round(orb_r * math.sin(angle)))
        px(d, ox, oy, TEAL)

    # ── TEAL conduit lines from dome bottom to chamber
    # dome bottom at roughly (32, 34); chamber left at (47, 27)
    d.line([(32, 34), (47, 33)], fill=TEAL)

    # ── Sample analysis chamber  14×12 hex-ish (right side, x=48, y=27)
    # pulse: SILVER_BRIGHT → TEAL → SILVER cycle over frames
    pulse_cycle = [SILVER_BRIGHT, SILVER_BRIGHT, TEAL, TEAL, SILVER, SILVER, SILVER_BRIGHT, SILVER_BRIGHT]
    chamber_glow = pulse_cycle[f % 8]
    cx2, cy2 = 48, 27
    # hex approximation: clipped rect
    rect(d, cx2+1, cy2,   12, 12, NAVY)
    rect(d, cx2,   cy2+2,  14, 8, NAVY)
    # interior glow
    rect(d, cx2+2, cy2+2, 10,  8, chamber_glow)
    # outline
    for xx in range(cx2, cx2+14):
        px(d, xx, cy2, GREY_LIGHT)
        px(d, xx, cy2+11, GREY_LIGHT)
    for yy in range(cy2, cy2+12):
        px(d, cx2, yy, GREY_LIGHT)
        px(d, cx2+13, yy, GREY_LIGHT)

    # ── 4 amber RP LEDs bottom edge (y=60)
    led_states = [(f + j) % 4 == 0 for j in range(4)]
    led_xs = [18, 24, 30, 36]
    for j, lx2 in enumerate(led_xs):
        color = WHITE_FLASH if led_states[j] else AMBER
        px(d, lx2, 60, color)
        px(d, lx2, 61, color)

    return img


def make_research_lab():
    frames = [build_research_lab_frame(f) for f in range(8)]
    sheet = Image.new("RGBA", (512, 64), TRANSPARENT)
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * 64, 0))
    return sheet


# ─────────────────────────────────────────────────────────────────────────────
# 2.  ORE REFINERY  (64×64 × 8)
# ─────────────────────────────────────────────────────────────────────────────

def build_ore_refinery_frame(f: int) -> Image.Image:
    W, H = 64, 64
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # ── Main body  54×52, x=5, y=10
    bx, by = 5, 10
    rect(d, bx, by, 54, 52, GREY_DARK)
    d.line([(bx, by), (bx+53, by)], fill=GREY_MID)
    d.line([(bx, by+51), (bx+53, by+51)], fill=(30, 32, 40, 255))

    # ── Ore input funnel top — trapezoid: wide=22 at top, narrows to 14
    # top edge at y=2, bottom at y=15 (14 px tall)
    fx_top = 21   # left of wide top
    fx_bot = 25   # left of narrow bottom
    for row in range(14):
        t = row / 13.0
        left  = int(fx_top + (fx_bot - fx_top) * t)
        width = int(22    + (14 - 22) * t)
        rect(d, left, 2+row, width, 1, RUST)
        # add rust-dark tint to sides
        px(d, left, 2+row, RUST_DARK)
        px(d, left+width-1, 2+row, RUST_DARK)
        # dropping ore pixel every 2 frames
        if (f % 2 == 0) and row == 6 + (f // 2) % 5:
            px(d, left + width//2, 2+row, RUST_DARK)

    # ── Processing chamber  18×16, centred x=23, y=19
    pcx, pcy = 23, 19
    # glow pulse: bright on even frames
    glow_t = 0.5 + 0.5 * math.sin(f * math.pi / 2)
    edge_col = blend(GREY_DARK, ORANGE, glow_t)
    rect(d, pcx, pcy, 18, 16, GREY_MID)
    # glowing border
    for xx in range(pcx, pcx+18):
        px(d, xx, pcy, edge_col)
        px(d, xx, pcy+15, edge_col)
    for yy in range(pcy, pcy+16):
        px(d, pcx, yy, edge_col)
        px(d, pcx+17, yy, edge_col)

    # ── Crusher teeth inside chamber — two 6×4 rectangles, alternate ±2px
    tooth_offset_a = 2 if f % 2 == 0 else 0
    tooth_offset_b = 0 if f % 2 == 0 else 2
    rect(d, pcx+2,  pcy+2+tooth_offset_a, 6, 4, GREY_LIGHT)
    rect(d, pcx+10, pcy+2+tooth_offset_b, 6, 4, GREY_LIGHT)

    # ── Output bin bottom  16×10, x=24, y=48
    obx, oby = 24, 48
    rect(d, obx, oby, 16, 10, GREY_MID)
    # inner highlight
    rect(d, obx+2, oby+2, 12, 6, SILVER)
    if f % 4 == 3:
        # silver bright pixel appearing
        px(d, obx+6, oby+4, SILVER_BRIGHT)

    # ── Steam pressure valve right side  6×8, x=51, y=25
    rect(d, 51, 25, 6, 8, GREY_MID)
    circle(d, 54, 25, 2, GREY_LIGHT)   # valve head
    # steam puff every 3 frames
    if f % 3 == 0:
        px(d, 54, 23, GREY_LIGHT)
        px(d, 53, 22, GREY_MID)
        px(d, 55, 21, GREY_MID)

    # ── Quality routing LEDs  bottom-right
    led_colors = [(0, 120, 255, 255), AMBER, WHITE_FLASH]
    for j, lc in enumerate(led_colors):
        lx2 = 46 + j*3
        active = (f // 2 + j) % 3 == 0
        c = WHITE_FLASH if active else lc
        px(d, lx2, 59, c)
        px(d, lx2, 60, c)

    return img


def make_ore_refinery():
    frames = [build_ore_refinery_frame(f) for f in range(8)]
    sheet = Image.new("RGBA", (512, 64), TRANSPARENT)
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * 64, 0))
    return sheet


# ─────────────────────────────────────────────────────────────────────────────
# 3.  FUEL SYNTHESIZER  (56×56 × 8)
# ─────────────────────────────────────────────────────────────────────────────

def build_fuel_synthesizer_frame(f: int) -> Image.Image:
    W, H = 56, 56
    img = Image.new("RGBA", (W, H), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # ── Main body  46×42, centred x=5, y=8
    bx, by = 5, 8
    rect(d, bx, by, 46, 42, GREY_DARK)
    d.line([(bx, by), (bx+45, by)], fill=GREY_MID)

    # ── Gas inlet pipe top  4×8  x=14, y=0  with YELLOW_GAS glow end
    rect(d, 14, 0, 4, 8, GREY_MID)
    if f % 2 == 0:
        px(d, 15, 0, YELLOW_GAS)
        px(d, 16, 0, YELLOW_GAS)

    # ── Large pressure vessel left  18×22 rounded-rect  x=7, y=11
    pvx, pvy = 7, 11
    rect(d, pvx+1, pvy,   16, 22, GREY_MID)
    rect(d, pvx,   pvy+1, 18, 20, GREY_MID)
    # YELLOW_GAS level strip — fill level animates: cycles over 8 frames
    max_fill = 16
    # level goes from 2 to max_fill and back
    level = int(2 + (max_fill - 2) * abs(math.sin(f * math.pi / 7)))
    strip_bottom = pvy + 19
    rect(d, pvx+3, strip_bottom - level, 12, level, YELLOW_GAS)

    # ── Reaction chamber right  14×14  x=31, y=14
    rcx, rcy = 31, 14
    rect(d, rcx, rcy, 14, 14, NAVY_MID)
    # ORANGE glow pulse
    glow_t = 0.4 + 0.6 * abs(math.sin(f * math.pi / 3))
    glow_col = blend(NAVY_MID, ORANGE, glow_t)
    rect(d, rcx+2, rcy+2, 10, 10, glow_col)
    # outline
    outline_rect(d, rcx, rcy, 14, 14, GREY_MID)

    # ── Output fuel tank bottom-right  12×16  x=33, y=33
    ftx, fty = 33, 33
    rect(d, ftx, fty, 12, 16, GREY_MID)
    fill_h = int(16 * 0.70)
    rect(d, ftx+2, fty + (16-fill_h), 8, fill_h, ORANGE)

    # ── Fuel output nozzle bottom  6×4  x=36, y=50
    rect(d, 36, 50, 6, 4, ORANGE)
    if f % 2 == 1:
        # orange drop below nozzle
        px(d, 39, 54, ORANGE)
        px(d, 38, 55, blend(ORANGE, TRANSPARENT, 0.5))

    # ── Pressure gauge  8×8 circle  x=22, y=35
    circle(d, 26, 39, 4, GREY_MID)
    # AMBER needle at ~70% (pointing toward bottom-right)
    needle_angle = math.radians(-90 + 70 * 1.8)  # 0% = straight left, 100% = straight right
    nx = 26 + int(3 * math.cos(needle_angle))
    ny = 39 + int(3 * math.sin(needle_angle))
    d.line([(26, 39), (nx, ny)], fill=AMBER)

    # ── Temperature LEDs  3-LED horizontal bar  x=10, y=50
    led_colors_temp = [GREEN, GREEN, GREEN]
    # heat spike on frames 5-6: middle LED goes AMBER
    if f in (5, 6):
        led_colors_temp[1] = AMBER
    for j, lc in enumerate(led_colors_temp):
        lx2 = 10 + j*4
        px(d, lx2, 50, lc)
        px(d, lx2, 51, lc)
        px(d, lx2+1, 50, lc)
        px(d, lx2+1, 51, lc)

    return img


def make_fuel_synthesizer():
    frames = [build_fuel_synthesizer_frame(f) for f in range(8)]
    sheet = Image.new("RGBA", (448, 56), TRANSPARENT)
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * 56, 0))
    return sheet


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

OUT = "C:/Users/grima/Documents/aiDev/voidDev/VoidYieldWeb/assets/sprites/buildings"

if __name__ == "__main__":
    import os

    paths = {
        "research_lab_sheet.png":     make_research_lab(),
        "ore_refinery_sheet.png":     make_ore_refinery(),
        "fuel_synthesizer_sheet.png": make_fuel_synthesizer(),
    }

    for name, img in paths.items():
        path = os.path.join(OUT, name)
        img.save(path)
        w, h = img.size
        print(f"  wrote {path}  ({w}x{h})")

    print("Done — 3 sprite sheets generated.")
