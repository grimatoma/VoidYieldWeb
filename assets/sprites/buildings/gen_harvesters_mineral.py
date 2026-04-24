"""
gen_harvesters_mineral.py
Generates 4 animated pixel-art sprite sheets for Mineral Harvester tiers.
Each sheet is a horizontal strip of 8 RGBA frames.
"""

from PIL import Image, ImageDraw
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Palette ──────────────────────────────────────────────────────────────────
DARK1   = (50,  52,  64,  255)   # #323440 dark grey body
DARK2   = (80,  80, 104,  255)   # #505068 mid grey body highlight
DARK3   = (40,  44,  56,  255)   # #282C38 darkest shadow
AMBER1  = (212, 168,  67,  255)  # #D4A843 amber bright
AMBER2  = (140, 106,  32,  255)  # #8C6A20 amber dim
RUST    = (196,  98,  42,  255)  # #C4622A rust ore hopper
TEAL1   = (  0, 184, 212,  255)  # #00B8D4 teal bright
TEAL2   = (  0, 100, 130,  255)  # teal dim
WHITE   = (255, 255, 255,  255)
SMOKE_L = (160, 160, 170, 180)   # light smoke
SMOKE_D = (100, 100, 110, 130)   # dark smoke
OFF     = (0,   0,   0,   0)     # transparent

def px(draw, x, y, col):
    draw.point((x, y), fill=col)

def rect(draw, x1, y1, x2, y2, col):
    draw.rectangle([x1, y1, x2, y2], fill=col)

def outline_rect(draw, x1, y1, x2, y2, fill, border):
    draw.rectangle([x1, y1, x2, y2], fill=fill, outline=border)

# ─────────────────────────────────────────────────────────────────────────────
# TIER 1 — Personal  32×32  8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_personal():
    FW, FH, N = 32, 32, 8
    sheet = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))

    # 4-step drill rotation colours (centre of 8×8 octagon drill head)
    DRILL_ROT = [AMBER1, AMBER2, DARK2, AMBER2]

    for f in range(N):
        frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)

        # ── Body 24×24 centred → (4,4)–(27,27) ──
        rect(d, 4, 4, 27, 27, DARK1)
        # edge highlights
        rect(d, 4, 4, 27, 4, DARK2)    # top edge
        rect(d, 4, 4, 4, 27, DARK2)    # left edge
        rect(d, 5, 27, 27, 27, DARK3)  # bottom shadow
        rect(d, 27, 5, 27, 27, DARK3)  # right shadow

        # ── Side intakes (rust) — left and right of body ──
        rect(d, 1, 10, 3, 21, RUST)
        rect(d, 28, 10, 30, 21, RUST)

        # ── Drill head — 8×8 "octagon" at body centre (12,12)–(19,19) ──
        # Draw a rough octagon by clipping corners of an 8×8 square
        drill_bg = DARK2
        rect(d, 12, 12, 19, 19, drill_bg)
        # clip corners of octagon (1px each corner)
        for cx, cy in [(12,12),(19,12),(12,19),(19,19)]:
            px(d, cx, cy, OFF)
        # drill centre pixel colour — 4-step rotation
        rot_col = DRILL_ROT[f % 4]
        rect(d, 14, 14, 17, 17, rot_col)

        # ── Fuel canister 4×6 amber (bottom-right corner) ──
        rect(d, 22, 21, 25, 26, AMBER2)
        rect(d, 22, 21, 25, 22, AMBER1)   # cap highlight

        # ── Amber indicator LED (top-right of body) blinks bright/dim ──
        led_col = AMBER1 if (f % 2 == 0) else AMBER2
        rect(d, 23, 6, 25, 7, led_col)

        sheet.paste(frame, (f * FW, 0))

    path = os.path.join(OUT_DIR, 'harvester_mineral_personal_sheet.png')
    sheet.save(path)
    print(f"  saved {path}  ({FW*N}×{FH})")


# ─────────────────────────────────────────────────────────────────────────────
# TIER 2 — Medium  48×48  8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_medium():
    FW, FH, N = 48, 48, 8
    sheet = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))

    # 4 positions for bright amber pixel chasing around drill head
    DRILL_CHASE = [(17,17), (20,17), (20,20), (17,20)]

    for f in range(N):
        frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)

        # ── Body 36×36 centred → (6,6)–(41,41) ──
        rect(d, 6, 6, 41, 41, DARK1)
        rect(d, 6, 6, 41, 6, DARK2)
        rect(d, 6, 6, 6, 41, DARK2)
        rect(d, 7, 41, 41, 41, DARK3)
        rect(d, 41, 7, 41, 41, DARK3)
        # panel detail lines
        rect(d, 8, 15, 8, 39, DARK3)
        rect(d, 39, 15, 39, 39, DARK3)

        # ── Drill assembly 12×12 at (18,18)–(29,29) ──
        rect(d, 18, 18, 29, 29, DARK2)
        for cx, cy in [(18,18),(29,18),(18,29),(29,29)]:
            px(d, cx, cy, OFF)
        # chasing bright amber pixel (4 positions, advances each frame)
        chase_pos = DRILL_CHASE[f % 4]
        rect(d, 18, 18, 29, 29, DARK3)
        for cx, cy in [(18,18),(29,18),(18,29),(29,29)]:
            px(d, cx, cy, OFF)
        px(d, chase_pos[0], chase_pos[1], AMBER1)
        # inner drill core
        rect(d, 21, 21, 26, 26, DARK1)

        # ── Fuel tank 8×14 amber (right side) ──
        rect(d, 33, 10, 40, 23, AMBER2)
        rect(d, 33, 10, 40, 12, AMBER1)
        rect(d, 34, 24, 39, 24, DARK3)

        # ── Ore hopper 10×8 rust (top centre) ──
        rect(d, 15, 7, 24, 14, RUST)
        rect(d, 15, 7, 24, 8, (220, 120, 60, 255))  # highlight top

        # ── 3 LED indicators (left side of body) — blink offset by 1 each ──
        for i, ly in enumerate([12, 20, 28]):
            phase = (f + i) % 2
            led_col = AMBER1 if phase == 0 else AMBER2
            rect(d, 7, ly, 9, ly+2, led_col)

        # ── Smoke particles (above hopper, drift up) ──
        # 1-2 grey pixels per frame, cycling positions
        smoke_x = [17, 20, 23]
        for si, sx in enumerate(smoke_x):
            if (f + si) % 3 == 0:
                sy = 5 - ((f // 2) % 3)
                if 0 <= sy <= 6:
                    px(d, sx, max(0, sy), SMOKE_L)
                    if sy > 1:
                        px(d, sx, sy - 1, SMOKE_D)

        sheet.paste(frame, (f * FW, 0))

    path = os.path.join(OUT_DIR, 'harvester_mineral_medium_sheet.png')
    sheet.save(path)
    print(f"  saved {path}  ({FW*N}×{FH})")


# ─────────────────────────────────────────────────────────────────────────────
# TIER 3 — Heavy  64×64  8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_heavy():
    FW, FH, N = 64, 64, 8
    sheet = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))

    # 3 drill positions — each drill spins, offset 2 frames apart
    # Drill centres (top-left of each 8px circle): left, centre-top, right
    DRILL_CENTRES = [(18, 26), (28, 18), (38, 26)]
    DRILL_CHASE = [(0,-3), (3,0), (0,3), (-3,0)]  # N E S W offsets

    for f in range(N):
        frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)

        # ── Body 52×52 centred → (6,6)–(57,57) ──
        rect(d, 6, 6, 57, 57, DARK1)
        rect(d, 6, 6, 57, 6, DARK2)
        rect(d, 6, 6, 6, 57, DARK2)
        rect(d, 7, 57, 57, 57, DARK3)
        rect(d, 57, 7, 57, 57, DARK3)
        # inner panel detail
        rect(d, 9, 9, 56, 56, DARK1)
        rect(d, 10, 10, 10, 55, DARK3)
        rect(d, 55, 10, 55, 55, DARK3)

        # ── Cooling fins (left side, 3×12 thin rects) ──
        fin_bright = [(80, 80, 104, 255), (60, 60, 80, 255)]
        for fi, fy in enumerate([14, 28, 42]):
            fin_col = fin_bright[(f // 2 + fi) % 2]
            rect(d, 1, fy, 4, fy + 11, fin_col)

        # ── Large fuel tank 12×20 (right side) ──
        rect(d, 44, 8, 55, 27, AMBER2)
        rect(d, 44, 8, 55, 11, AMBER1)
        rect(d, 45, 28, 54, 28, DARK3)
        # tank bands
        rect(d, 44, 17, 55, 17, DARK3)

        # ── Ore hopper 16×12 (top centre) ──
        rect(d, 18, 7, 33, 18, RUST)
        rect(d, 18, 7, 33, 9, (210, 110, 55, 255))

        # ── Triple drill array (3 8-px circles, rough) ──
        for di, (dx, dy) in enumerate(DRILL_CENTRES):
            frame_offset = (f + di * 2) % 4
            chase = DRILL_CHASE[frame_offset]
            # drill body
            rect(d, dx, dy, dx+7, dy+7, DARK2)
            for cx, cy in [(dx,dy),(dx+7,dy),(dx,dy+7),(dx+7,dy+7)]:
                px(d, cx, cy, OFF)
            # bright pixel chasing
            bright_x = dx + 3 + chase[0]
            bright_y = dy + 3 + chase[1]
            bright_x = max(dx+1, min(dx+6, bright_x))
            bright_y = max(dy+1, min(dy+6, bright_y))
            px(d, bright_x, bright_y, AMBER1)

        # ── 4 LED indicators (right side of body) ──
        for i, ly in enumerate([14, 22, 30, 38]):
            phase = (f + i) % 2
            led_col = AMBER1 if phase == 0 else AMBER2
            rect(d, 55, ly, 57, ly+2, led_col)

        # ── Smoke puffs above hopper ──
        smoke_xs = [20, 24, 28, 31]
        for si, sx in enumerate(smoke_xs):
            if (f + si) % 2 == 0:
                sy = 5 - ((f + si) % 4)
                if 0 <= sy <= 6:
                    px(d, sx, max(0, sy), SMOKE_L)
                    if sy > 0:
                        px(d, sx, max(0, sy-1), SMOKE_D)

        sheet.paste(frame, (f * FW, 0))

    path = os.path.join(OUT_DIR, 'harvester_mineral_heavy_sheet.png')
    sheet.save(path)
    print(f"  saved {path}  ({FW*N}×{FH})")


# ─────────────────────────────────────────────────────────────────────────────
# TIER 4 — Elite  80×80  8 frames
# ─────────────────────────────────────────────────────────────────────────────
def make_elite():
    FW, FH, N = 80, 80, 8
    sheet = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))

    # Quad drill centres (2×2 grid)
    DRILL_CENTRES = [(15, 15), (43, 15), (15, 43), (43, 43)]
    # Teal ring chase around each 12×12 drill head (8 positions)
    RING_POS = [
        (6, 0), (9, 2), (11, 6), (9, 9),
        (6, 11),(2, 9), (0, 6), (2, 2)
    ]
    # LED perimeter positions (12 LEDs around the body edge)
    led_perimeter = []
    cx_c, cy_c = 39, 39
    import math
    for i in range(12):
        angle = (2 * math.pi * i) / 12 - math.pi/2
        lx = int(cx_c + 36 * math.cos(angle))
        ly = int(cy_c + 36 * math.sin(angle))
        led_perimeter.append((lx, ly))

    for f in range(N):
        frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)

        # ── Body 68×68 with clipped corners → (6,6)–(73,73) ──
        rect(d, 6, 6, 73, 73, DARK1)
        # clip corners 4px
        for cx, cy in [(6,6),(73,6),(6,73),(73,73)]:
            ox, oy = (1 if cx == 6 else -1), (1 if cy == 6 else -1)
            for di in range(4):
                px(d, cx + ox*di, cy,        OFF)
                px(d, cx,        cy + oy*di, OFF)
        # highlights
        rect(d, 6, 6, 73, 7, DARK2)
        rect(d, 6, 6, 7, 73, DARK2)
        rect(d, 8, 72, 73, 73, DARK3)
        rect(d, 72, 8, 73, 73, DARK3)

        # ── Central power core 16×16 at (31,31)–(48,48) ──
        # Pulses amber ↔ bright amber
        core_col = AMBER1 if (f % 2 == 0) else (230, 190, 80, 255)
        rect(d, 31, 31, 48, 48, core_col)
        rect(d, 32, 32, 47, 47, AMBER2 if (f % 2 == 0) else AMBER1)
        # teal core ring
        teal_core = TEAL1 if (f % 4 < 2) else TEAL2
        rect(d, 33, 33, 46, 33, teal_core)
        rect(d, 33, 46, 46, 46, teal_core)
        rect(d, 33, 33, 33, 46, teal_core)
        rect(d, 46, 33, 46, 46, teal_core)

        # ── Energy conduits (lines from core corners to drill centres) ──
        # Pulse wave: bright pixel travels from core to drill
        conduit_col = TEAL1 if ((f % 4) < 2) else TEAL2
        # top-left conduit: core (31,31) → drill (26,26)
        for step in range(5):
            px(d, 31 - step, 31 - step, conduit_col if (f + step) % 4 < 2 else TEAL2)
        # top-right conduit: core (48,31) → drill (52,26)
        for step in range(5):
            px(d, 48 + step, 31 - step, conduit_col if (f + step + 1) % 4 < 2 else TEAL2)
        # bottom-left conduit
        for step in range(5):
            px(d, 31 - step, 48 + step, conduit_col if (f + step + 2) % 4 < 2 else TEAL2)
        # bottom-right conduit
        for step in range(5):
            px(d, 48 + step, 48 + step, conduit_col if (f + step + 3) % 4 < 2 else TEAL2)

        # ── Quad drill heads 12×12 with teal rings ──
        for di, (dx, dy) in enumerate(DRILL_CENTRES):
            # drill body
            rect(d, dx, dy, dx+11, dy+11, DARK2)
            for cx2, cy2 in [(dx,dy),(dx+11,dy),(dx,dy+11),(dx+11,dy+11)]:
                px(d, cx2, cy2, OFF)
            # teal ring chase (bright pixel chases around 8 positions)
            ring_frame = (f + di * 2) % 8
            rp = RING_POS[ring_frame]
            ring_bright = TEAL1 if ((f + di) % 2 == 0) else TEAL2
            px(d, dx + rp[0], dy + rp[1], ring_bright)
            # drill inner core
            inner_col = DARK3 if (f % 2 == 0) else DARK1
            rect(d, dx+4, dy+4, dx+7, dy+7, inner_col)

        # ── LED perimeter ring — chase pattern ──
        for li, (lx, ly) in enumerate(led_perimeter):
            # 3-LED chase group
            rel = (li - f * 2) % 12
            if rel < 3:
                led_col = TEAL1
            elif rel < 5:
                led_col = TEAL2
            else:
                led_col = (30, 60, 80, 255)
            if 0 <= lx < FW and 0 <= ly < FH:
                px(d, lx, ly, led_col)

        sheet.paste(frame, (f * FW, 0))

    path = os.path.join(OUT_DIR, 'harvester_mineral_elite_sheet.png')
    sheet.save(path)
    print(f"  saved {path}  ({FW*N}×{FH})")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("Generating Mineral Harvester sprite sheets…")
    make_personal()
    make_medium()
    make_heavy()
    make_elite()
    print("Done.")
