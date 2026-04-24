"""
Generate 4 animated pixel-art sprite sheets for Crystal Harvester tiers.
Output: assets/sprites/buildings/harvester_crystal_*_sheet.png
Each sheet: 8 frames horizontal strip, RGBA transparent background.
"""

from PIL import Image, ImageDraw
import math, os

OUT_DIR = "C:/Users/grima/Documents/aiDev/voidDev/VoidYieldWeb/assets/sprites/buildings"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Palette ──────────────────────────────────────────────────────────────────
TRANS         = (  0,   0,   0,   0)
NAVY          = ( 13,  27,  62, 255)
NAVY_MID      = ( 22,  43,  85, 255)
GREY_DARK     = ( 50,  52,  64, 255)
GREY_MID      = ( 80,  84, 100, 255)
GREY_LIGHT    = (130, 136, 160, 255)
TEAL          = (  0, 184, 212, 255)
TEAL_DIM      = (  0, 100, 130, 255)
TEAL_BRIGHT   = ( 80, 220, 240, 255)
SILVER        = (123, 168, 200, 255)
SILVER_BRIGHT = (180, 220, 250, 255)
SILVER_DIM    = ( 70, 100, 140, 255)
AMBER         = (212, 168,  67, 255)
AMBER_DIM     = (140, 110,  40, 255)
PURPLE        = (138,  91, 196, 255)
VIOLET        = ( 75,   0, 130, 255)
WHITE_SOFT    = (220, 210, 240, 255)
BLACK_SOFT    = ( 20,  20,  30, 255)

def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))

def pulse(frame, n_frames, lo, hi):
    """Sine-pulse between lo and hi colour over n_frames."""
    t = 0.5 + 0.5 * math.sin(2 * math.pi * frame / n_frames)
    return lerp_color(lo, hi, t)

def flicker(frame, n_frames, lo, hi):
    """Saw-tooth chase (for ring/conduit animations)."""
    t = (frame / n_frames) % 1.0
    return lerp_color(lo, hi, t)

def draw_diamond(draw, cx, cy, r, color):
    """Axis-aligned diamond (rhombus) centred at cx,cy with half-axis r."""
    pts = [(cx, cy-r), (cx+r, cy), (cx, cy+r), (cx-r, cy)]
    draw.polygon(pts, fill=color)

def draw_ring(draw, cx, cy, r, color, width=1):
    """Draw a circle ring (outline only)."""
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=color, width=width)

def clip_corners(draw, x0, y0, x1, y1, clip, fill):
    """Draw a rectangle with clipped corners (octagon)."""
    pts = [
        (x0+clip, y0),
        (x1-clip, y0),
        (x1,      y0+clip),
        (x1,      y1-clip),
        (x1-clip, y1),
        (x0+clip, y1),
        (x0,      y1-clip),
        (x0,      y0+clip),
    ]
    draw.polygon(pts, fill=fill)

# ─────────────────────────────────────────────────────────────────────────────
# TIER 1 — Crystal Core Extractor  32×32 × 8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_personal(frame, img_size=32):
    img = Image.new("RGBA", (img_size, img_size), TRANS)
    d   = ImageDraw.Draw(img)

    # Hexagonal-ish base  (clip 4px corners of a 24×24 square, centred)
    bx, by = 4, 5
    clip_corners(d, bx, by, bx+23, by+22, 4, GREY_DARK)

    # Collector vanes  (2×8 left + right)
    vane_col = lerp_color(SILVER_DIM, SILVER, (frame % 4) / 3)
    d.rectangle([2, 12, 3, 19],  fill=vane_col)
    d.rectangle([28, 12, 29, 19], fill=vane_col)

    # Fuel canister top-left  4×4 AMBER_DIM
    d.rectangle([5, 6, 8, 9], fill=AMBER_DIM)

    # TEAL energy ring (2px) around crystal focus (at 16,16)
    ring_col = pulse(frame, 8, TEAL_DIM, TEAL_BRIGHT)
    draw_ring(d, 16, 16, 5, ring_col, width=2)

    # 4 thin angular prongs (2px wide, SILVER) pointing inward
    prong_col = SILVER
    # top
    d.rectangle([15, 8, 16, 11],  fill=prong_col)
    # bottom
    d.rectangle([15, 20, 16, 23], fill=prong_col)
    # left
    d.rectangle([8, 15, 11, 16],  fill=prong_col)
    # right
    d.rectangle([20, 15, 23, 16], fill=prong_col)

    # Crystal focus: 6×6 diamond
    focus_col = pulse(frame, 8, SILVER, TEAL_BRIGHT)
    draw_diamond(d, 16, 16, 3, focus_col)

    return img

def make_personal_sheet():
    n = 8
    sheet = Image.new("RGBA", (32*n, 32), TRANS)
    for f in range(n):
        sheet.paste(make_personal(f), (f*32, 0))
    path = os.path.join(OUT_DIR, "harvester_crystal_personal_sheet.png")
    sheet.save(path)
    print(f"Saved {path}")

# ─────────────────────────────────────────────────────────────────────────────
# TIER 2 — Crystal Mining Array  48×48 × 8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_medium(frame, img_size=48):
    img = Image.new("RGBA", (img_size, img_size), TRANS)
    d   = ImageDraw.Draw(img)

    # 40×40 angular frame, clip 6px corners
    bx, by = 4, 4
    clip_corners(d, bx, by, bx+39, by+39, 6, GREY_DARK)

    # 4 angular support struts at corners (GREY_MID  5×5 squares inside frame)
    for (sx, sy) in [(6,6),(37,6),(6,37),(37,37)]:
        d.rectangle([sx, sy, sx+3, sy+3], fill=GREY_MID)

    # Collection hopper: 10×8 top
    d.rectangle([19, 5, 28, 12], fill=SILVER_DIM)
    # fine grid lines on hopper
    for gx in range(21, 28, 2):
        d.line([(gx, 5), (gx, 12)], fill=GREY_MID)

    # Fuel supply  6×10 on right
    d.rectangle([39, 19, 44, 28], fill=AMBER_DIM)

    # 3 crystal foci arranged in triangle around centre (24,24)
    foci = [
        (24, 13),  # top
        (16, 30),  # bottom-left
        (32, 30),  # bottom-right
    ]
    center = (24, 24)

    # Energy conduit lines (TEAL) from each focus to centre
    conduit_t = (frame / 8) % 1.0
    for i, (fx, fy) in enumerate(foci):
        phase = (conduit_t + i/3) % 1.0
        cc = lerp_color(TEAL_DIM, TEAL, phase)
        d.line([(fx, fy), center], fill=cc, width=2)

    # Centre hub: 8×8 circle (NAVY_MID) with TEAL ring
    cx, cy = center
    d.ellipse([cx-4, cy-4, cx+4, cy+4], fill=NAVY_MID)
    hub_ring = pulse(frame, 8, TEAL_DIM, TEAL_BRIGHT)
    draw_ring(d, cx, cy, 4, hub_ring, width=1)

    # Foci: each 6×6 diamond, cycle in wave pattern
    for i, (fx, fy) in enumerate(foci):
        phase = (frame / 8 + i / 3) % 1.0
        t = 0.5 + 0.5 * math.sin(2 * math.pi * phase)
        fc = lerp_color(SILVER, TEAL_BRIGHT, t)
        draw_diamond(d, fx, fy, 3, fc)

    return img

def make_medium_sheet():
    n = 8
    sheet = Image.new("RGBA", (48*n, 48), TRANS)
    for f in range(n):
        sheet.paste(make_medium(f), (f*48, 0))
    path = os.path.join(OUT_DIR, "harvester_crystal_medium_sheet.png")
    sheet.save(path)
    print(f"Saved {path}")

# ─────────────────────────────────────────────────────────────────────────────
# TIER 3 — Deep Crystal Array  64×64 × 8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_heavy(frame, img_size=64):
    img = Image.new("RGBA", (img_size, img_size), TRANS)
    d   = ImageDraw.Draw(img)

    # 54×54 reinforced frame, clip 7px corners
    bx, by = 5, 5
    clip_corners(d, bx, by, bx+53, by+53, 7, GREY_DARK)

    # Reinforced mounting brackets at corners (heavy 6×6 GREY_DARK squares)
    for (mx, my) in [(5,5),(52,5),(5,52),(52,52)]:
        d.rectangle([mx, my, mx+5, my+5], fill=GREY_MID)
        d.rectangle([mx+1, my+1, mx+4, my+4], fill=GREY_DARK)

    # Heavy collection bin: 16×14 top
    d.rectangle([24, 6, 39, 19], fill=GREY_MID)
    d.line([(26,6),(26,19)], fill=SILVER, width=1)
    d.line([(36,6),(36,19)], fill=SILVER, width=1)
    d.line([(24,12),(39,12)], fill=SILVER, width=1)

    # Cooling fins at bottom (3 thin SILVER fins)
    for fx in [26, 31, 36]:
        d.rectangle([fx, 55, fx+1, 61], fill=SILVER)

    # Central resonance chamber: 14×14 circle at (32,36)
    cx, cy = 32, 36
    d.ellipse([cx-7, cy-7, cx+7, cy+7], fill=NAVY)
    chamber_ring = pulse(frame, 8, TEAL_DIM, TEAL_BRIGHT)
    draw_ring(d, cx, cy, 7, chamber_ring, width=2)

    # 6 crystal foci in hexagonal arrangement
    r_hex = 16
    foci = []
    for i in range(6):
        angle = math.pi/2 + i * math.pi / 3
        fx = int(cx + r_hex * math.cos(angle))
        fy = int(cy + r_hex * math.sin(angle))
        foci.append((fx, fy))

    # TEAL conduits forming hexagonal pattern
    conduit_t = (frame / 8) % 1.0
    for i in range(6):
        j = (i + 1) % 6
        phase = (conduit_t + i/6) % 1.0
        cc = lerp_color(TEAL_DIM, TEAL, phase)
        d.line([foci[i], foci[j]], fill=cc, width=1)
        d.line([foci[i], (cx, cy)], fill=lerp_color(TEAL_DIM, TEAL_DIM, 0.5), width=1)

    # VIOLET glow: faint dots near foci for deep resonance
    violet_alpha = int(60 + 60 * math.sin(2*math.pi*frame/8))
    violet_faint = (75, 0, 130, violet_alpha)
    for fx, fy in foci:
        img.putpixel((fx, fy), lerp_color(TRANS, VIOLET, violet_alpha/255))

    # Foci: ripple pattern
    for i, (fx, fy) in enumerate(foci):
        phase = ((frame - i) / 8) % 1.0
        t = 0.5 + 0.5 * math.sin(2 * math.pi * phase)
        fc = lerp_color(SILVER, TEAL_BRIGHT, t)
        draw_diamond(d, fx, fy, 3, fc)

    # Redraw chamber ring on top
    draw_ring(d, cx, cy, 7, chamber_ring, width=2)

    return img

def make_heavy_sheet():
    n = 8
    sheet = Image.new("RGBA", (64*n, 64), TRANS)
    for f in range(n):
        sheet.paste(make_heavy(f), (f*64, 0))
    path = os.path.join(OUT_DIR, "harvester_crystal_heavy_sheet.png")
    sheet.save(path)
    print(f"Saved {path}")

# ─────────────────────────────────────────────────────────────────────────────
# TIER 4 — Elite Crystal Array  80×80 × 8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_elite(frame, img_size=80):
    img = Image.new("RGBA", (img_size, img_size), TRANS)
    d   = ImageDraw.Draw(img)

    # 72×72 frame with sophisticated angular design, clip 8px corners
    bx, by = 4, 4
    clip_corners(d, bx, by, bx+71, by+71, 8, GREY_DARK)
    # Inner frame highlight (SILVER-BLUE premium alloy edge)
    clip_corners(d, bx+1, by+1, bx+70, by+70, 8, NAVY_MID)
    clip_corners(d, bx+3, by+3, bx+68, by+68, 7, GREY_DARK)

    # Frame edge SILVER-BLUE highlights
    edge = SILVER_DIM
    d.line([(bx+8, bx), (bx+63, bx)], fill=edge, width=1)
    d.line([(bx+8, bx+71), (bx+63, bx+71)], fill=edge, width=1)
    d.line([(bx, bx+8), (bx, bx+63)], fill=edge, width=1)
    d.line([(bx+71, bx+8), (bx+71, bx+63)], fill=edge, width=1)

    cx, cy = 40, 40

    # Auto-fuel system: AMBER accent strip along bottom-right
    d.rectangle([58, 62, 70, 65], fill=AMBER_DIM)

    # Energy web: fine 1px conduit grid
    web_t = (frame / 8) % 1.0

    # 8 crystal foci in ring formation (each 8×8 with 3-pixel gems)
    r_ring = 26
    foci = []
    for i in range(8):
        angle = -math.pi/2 + i * 2 * math.pi / 8
        fx = int(cx + r_ring * math.cos(angle))
        fy = int(cy + r_ring * math.sin(angle))
        foci.append((fx, fy))

    # Void energy traces: 1-2px VIOLET lines (subtle)
    violet_t = (frame / 8) % 1.0
    for i in range(8):
        j = (i + 3) % 8
        vi = int(30 + 30 * math.sin(2*math.pi*(violet_t + i/8)))
        vc = (75, 0, 130, vi)
        d.line([foci[i], foci[j]], fill=vc, width=1)

    # Energy web lines connecting adjacent foci + to centre
    for i in range(8):
        j = (i + 1) % 8
        phase = (web_t + i/8) % 1.0
        wc = lerp_color(TEAL_DIM, TEAL, 0.3 + 0.7*phase)
        d.line([foci[i], foci[j]], fill=wc, width=1)
        d.line([foci[i], (cx, cy)], fill=TEAL_DIM, width=1)

    # Master resonance core: 20×20 with nested rings
    # Outermost ring: SILVER
    outer_silver = pulse(frame, 8, SILVER_DIM, SILVER_BRIGHT)
    draw_ring(d, cx, cy, 10, outer_silver, width=1)
    # Middle ring: TEAL (rotates — bright pixel chases)
    for ri in range(8):
        angle = 2*math.pi*ri/8 + 2*math.pi*frame/8
        rx = int(cx + 7 * math.cos(angle))
        ry = int(cy + 7 * math.sin(angle))
        intensity = 1.0 - (ri / 8) * 0.7
        rc = lerp_color(TEAL_DIM, TEAL_BRIGHT, intensity)
        if 0 <= rx < img_size and 0 <= ry < img_size:
            img.putpixel((rx, ry), rc)
    # Inner ring: VIOLET pulsing
    violet_inner = pulse(frame, 8, VIOLET, PURPLE)
    draw_ring(d, cx, cy, 4, violet_inner, width=1)
    # Core fill: NAVY_MID
    d.ellipse([cx-3, cy-3, cx+3, cy+3], fill=NAVY_MID)
    core_glow = pulse(frame, 8, TEAL_DIM, TEAL_BRIGHT)
    d.ellipse([cx-2, cy-2, cx+2, cy+2], fill=core_glow)

    # Foci: synchronized pulse (all together, breathing wave)
    for i, (fx, fy) in enumerate(foci):
        phase = (frame / 8 + i / 8) % 1.0
        t = 0.5 + 0.5 * math.sin(2*math.pi*phase)
        fc = lerp_color(SILVER, TEAL_BRIGHT, t)
        # 8×8 foci with 3-pixel gem centre
        draw_diamond(d, fx, fy, 3, SILVER_DIM)
        gem = lerp_color(SILVER, TEAL_BRIGHT, t)
        draw_diamond(d, fx, fy, 2, gem)

    return img

def make_elite_sheet():
    n = 8
    sheet = Image.new("RGBA", (80*n, 80), TRANS)
    for f in range(n):
        sheet.paste(make_elite(f), (f*80, 0))
    path = os.path.join(OUT_DIR, "harvester_crystal_elite_sheet.png")
    sheet.save(path)
    print(f"Saved {path}")

# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    make_personal_sheet()
    make_medium_sheet()
    make_heavy_sheet()
    make_elite_sheet()
    print("All 4 crystal harvester sprite sheets generated successfully.")
