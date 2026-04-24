"""
Generate 6 animated pixel art sprite sheets for VoidYield support/infrastructure buildings.
Output: 8-frame horizontal strips, RGBA transparent background.
"""

from PIL import Image, ImageDraw
import math
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Palette
TRANSPARENT     = (0, 0, 0, 0)
GREY_DARK       = (50, 52, 64, 255)
GREY_MID        = (80, 84, 100, 255)
GREY_LIGHT      = (130, 136, 160, 255)
NAVY            = (13, 27, 62, 255)
NAVY_MID        = (22, 43, 85, 255)
AMBER           = (212, 168, 67, 255)
AMBER_BRIGHT    = (255, 200, 80, 255)
AMBER_WARM      = (255, 180, 100, 255)
TEAL            = (0, 184, 212, 255)
TEAL_DIM        = (0, 100, 130, 255)
TEAL_ENERGY     = (0, 200, 180, 255)
GREEN           = (76, 175, 80, 255)
WARM_TAN        = (160, 130, 90, 255)
WARM_WHITE      = (255, 240, 200, 255)
SILVER_BLUE     = (60, 90, 180, 255)
WHITE           = (255, 255, 255, 255)
RED             = (200, 60, 60, 255)


def fill_rect(draw, x, y, w, h, color):
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=color)


def draw_outline_rect(draw, x, y, w, h, color, thickness=1):
    for t in range(thickness):
        draw.rectangle([x + t, y + t, x + w - 1 - t, y + h - 1 - t], outline=color)


# ---------------------------------------------------------------------------
# 1. DRONE BAY — 512×64 (8 frames × 64×64)
# ---------------------------------------------------------------------------
def gen_drone_bay():
    W, H, FRAMES = 64, 64, 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    # Octagon points helper (centered at cx,cy, radius r)
    def octagon_points(cx, cy, r):
        pts = []
        for i in range(8):
            angle = math.pi / 8 + i * math.pi / 4
            pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
        return pts

    # Perimeter light positions (8 lights evenly around rim radius ~28)
    cx, cy = 32, 32
    rim_r = 28
    light_positions = []
    for i in range(8):
        angle = -math.pi / 2 + i * (2 * math.pi / 8)
        lx = int(cx + rim_r * math.cos(angle))
        ly = int(cy + rim_r * math.sin(angle))
        light_positions.append((lx, ly))

    # Service arm base offset (oscillates ±4px on y)
    arm_offsets = [0, 1, 2, 3, 4, 3, 2, 1]  # 0..4..0 px swing

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        # Octagonal body: fill then rim
        oct_pts = octagon_points(cx, cy, 29)
        draw.polygon(oct_pts, fill=GREY_MID)
        oct_rim = octagon_points(cx, cy, 30)
        draw.polygon(oct_rim, outline=GREY_LIGHT, width=2)

        # AMBER cross landing marker (2px width)
        # Horizontal bar
        fill_rect(draw, cx - 14, cy - 1, 28, 2, AMBER)
        # Vertical bar
        fill_rect(draw, cx - 1, cy - 14, 2, 28, AMBER)

        # 4 drone docking ports at cardinal points (6×4, NAVY w/ TEAL border)
        for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            px = cx + dx * 18
            py = cy + dy * 18
            pw, ph = (6, 4) if dx == 0 else (4, 6)
            fill_rect(draw, px - pw // 2, py - ph // 2, pw, ph, NAVY)
            draw_outline_rect(draw, px - pw // 2, py - ph // 2, pw, ph, TEAL)

        # 4 service arms (4×16) oscillating ±4px
        arm_off = arm_offsets[f]
        # Top arm
        fill_rect(draw, cx - 2, cy - 14 - arm_off, 4, 14, GREY_MID)
        # Bottom arm
        fill_rect(draw, cx - 2, cy + arm_off, 4, 14, GREY_MID)
        # Left arm
        fill_rect(draw, cx - 14 - arm_off, cy - 2, 14, 4, GREY_MID)
        # Right arm
        fill_rect(draw, cx + arm_off, cy - 2, 14, 4, GREY_MID)

        # 4×4 AMBER status beacon center (blinks between AMBER and AMBER_BRIGHT)
        beacon_color = AMBER_BRIGHT if f % 2 == 0 else AMBER
        fill_rect(draw, cx - 2, cy - 2, 4, 4, beacon_color)

        # 8 perimeter lights: chase clockwise (1 lit per frame)
        for i, (lx, ly) in enumerate(light_positions):
            color = TEAL if i == f else TEAL_DIM
            fill_rect(draw, lx - 1, ly - 1, 2, 2, color)

        sheet.paste(frame, (f * W, 0))

    out = os.path.join(OUT_DIR, "building_drone_bay_animated_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}")


# ---------------------------------------------------------------------------
# 2. HABITATION MODULE — 512×56 (8 frames × 64×56)
# ---------------------------------------------------------------------------
def gen_habitation_module():
    W, H, FRAMES = 64, 56, 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    # Window positions (4 windows, 8×6 each)
    body_x, body_y = 6, 6
    body_w, body_h = 52, 44
    windows = [
        (10, 12),   # top-left
        (22, 12),   # top-right
        (34, 12),   # second row left
        (46, 12),   # second row right
    ]
    # Vent puff: shows on certain frames
    vent_cx = 32
    vent_y_base = body_y - 1

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        # Main body
        fill_rect(draw, body_x, body_y, body_w, body_h, WARM_TAN)
        draw_outline_rect(draw, body_x, body_y, body_w, body_h, GREY_MID)

        # AMBER_WARM base stripe (2px)
        fill_rect(draw, body_x, body_y + body_h - 2, body_w, 2, AMBER_WARM)

        # Solar receiver top: 14×6 SILVER_BLUE, shimmers
        solar_x = body_x + (body_w - 14) // 2
        solar_y = body_y - 6
        shimmer = (SILVER_BLUE[0] + 20, SILVER_BLUE[1] + 20, SILVER_BLUE[2] + 20, 255) if f % 4 < 2 else SILVER_BLUE
        fill_rect(draw, solar_x, solar_y, 14, 6, shimmer)
        draw_outline_rect(draw, solar_x, solar_y, 14, 6, GREY_MID)

        # Life support vent top center: 6×6 GREY_MID
        vent_x = body_x + (body_w - 6) // 2
        vent_y = body_y + 2
        fill_rect(draw, vent_x, vent_y, 6, 6, GREY_MID)

        # Vent exhaust puff on frames 0 and 4
        if f in (0, 4):
            # Single pixel puff above vent
            fill_rect(draw, vent_cx - 1, vent_y - 1, 2, 1,
                      (GREY_LIGHT[0], GREY_LIGHT[1], GREY_LIGHT[2], 180))

        # 4 windows
        for wi, (wx, wy) in enumerate(windows):
            # Window frames
            fill_rect(draw, wx - 1, wy - 1, 10, 8, GREY_DARK)
            # One window dims for 2 frames (window index 2 = "sleeping")
            if wi == 2 and f in (3, 4):
                inner = GREY_DARK
            else:
                # Flicker between WARM_WHITE and AMBER_WARM
                inner = WARM_WHITE if (f + wi) % 2 == 0 else AMBER_WARM
            fill_rect(draw, wx, wy, 8, 6, inner)

        # Airlock door center bottom
        door_x = body_x + (body_w - 10) // 2
        door_y = body_y + body_h - 12
        fill_rect(draw, door_x, door_y, 10, 12, GREY_DARK)
        fill_rect(draw, door_x + 1, door_y + 1, 8, 10, NAVY_MID)
        # Airlock LED: pulses GREEN
        led_color = GREEN if f % 2 == 0 else (40, 100, 40, 255)
        fill_rect(draw, door_x + 4, door_y + 1, 2, 2, led_color)

        sheet.paste(frame, (f * W, 0))

    out = os.path.join(OUT_DIR, "habitation_module_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}")


# ---------------------------------------------------------------------------
# 3. CRAFTING STATION — 320×40 (8 frames × 40×40)
# ---------------------------------------------------------------------------
def gen_crafting_station():
    W, H, FRAMES = 40, 40, 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        # Workshop table base
        fill_rect(draw, 4, 12, 32, 28, GREY_MID)
        fill_rect(draw, 4, 12, 32, 2, GREY_DARK)  # front edge

        # Workbench top surface
        fill_rect(draw, 6, 14, 28, 18, WARM_TAN)
        # Tool marks (horizontal lines)
        for ty in [18, 22, 26]:
            fill_rect(draw, 8, ty, 16, 1, GREY_DARK)

        # Tool rack back (6 tool silhouettes 1×6 spaced)
        for ti in range(6):
            tx = 7 + ti * 4
            fill_rect(draw, tx, 8, 1, 6, GREY_LIGHT)
            # vibrate tool index 2 on even frames
            if ti == 2 and f % 2 == 0:
                # draw 1px to the right
                pass  # already drawn at tx; shift by checking frame
        # Redraw vibrating tool
        vib_offset = 1 if f % 2 == 0 else 0
        fill_rect(draw, 14 + vib_offset, 8, 1, 6, GREY_LIGHT)

        # Holographic display: 10×8 TEAL border
        holo_bright = f % 3 < 2  # bright for 2 of 3 frames
        holo_border = TEAL if holo_bright else TEAL_DIM
        fill_rect(draw, 20, 10, 10, 8, holo_border)
        fill_rect(draw, 21, 11, 8, 6, NAVY)
        # Data pixels shift position
        dp_x = 22 + (f % 4)
        fill_rect(draw, dp_x, 13, 2, 1, TEAL if holo_bright else TEAL_DIM)

        # Overhead light strip: 6×2 AMBER_WARM, pulses
        light_color = AMBER_BRIGHT if f % 3 == 0 else AMBER_WARM
        fill_rect(draw, 16, 6, 6, 2, light_color)

        # Output tray right
        fill_rect(draw, 31, 24, 8, 6, GREY_MID)
        draw_outline_rect(draw, 31, 24, 8, 6, GREY_DARK)

        sheet.paste(frame, (f * W, 0))

    out = os.path.join(OUT_DIR, "crafting_station_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}")


# ---------------------------------------------------------------------------
# 4. TRADE HUB — 512×64 (8 frames × 64×64)
# ---------------------------------------------------------------------------
def gen_trade_hub():
    W, H, FRAMES = 64, 64, 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    # Radar sweep line angle per frame
    sweep_angles = [i * (360 / FRAMES) for i in range(FRAMES)]

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        # Main body
        fill_rect(draw, 5, 16, 54, 48, GREY_DARK)
        draw_outline_rect(draw, 5, 16, 54, 48, GREY_MID)

        # Uplink dish top: 28×16 ellipse area (SILVER rim, NAVY_MID interior, TEAL center)
        dish_x, dish_y = 18, 2
        # Draw as oval
        draw.ellipse([dish_x, dish_y, dish_x + 28, dish_y + 16],
                     fill=NAVY_MID, outline=GREY_LIGHT, width=2)
        # TEAL center dot
        fill_rect(draw, 31, 8, 3, 3, TEAL)

        # Radar sweep line (2px, from center of dish outward)
        angle_rad = math.radians(sweep_angles[f])
        dcx, dcy = 32, 10
        sweep_len = 12
        ex = int(dcx + sweep_len * math.cos(angle_rad))
        ey = int(dcy + sweep_len * math.sin(angle_rad))
        draw.line([(dcx, dcy), (ex, ey)], fill=GREY_LIGHT, width=2)

        # TEAL data pulse: travels from dish toward screens (frame-based y offset)
        pulse_y = 14 + (f * 4) % 20
        fill_rect(draw, 30, pulse_y, 2, 2, TEAL)

        # 3 market display screens front
        screen_colors = [
            [AMBER, GREEN, RED],        # screen 0 colors
            [GREEN, RED, AMBER],        # screen 1
            [RED, AMBER, GREEN],        # screen 2
        ]
        for si in range(3):
            sx = 8 + si * 16
            sy = 20
            fill_rect(draw, sx, sy, 10, 8, NAVY)
            # Indicator dot (2×2), cycles through colors
            ind_color = screen_colors[si][f % 3]
            fill_rect(draw, sx + 4, sy + 3, 2, 2, ind_color)

        # Credit counter: 14×6 AMBER glow
        credit_bright = AMBER_BRIGHT if f % 2 == 0 else AMBER
        fill_rect(draw, 25, 32, 14, 6, credit_bright)

        # 2 cargo pads sides: 8×8 GREY_LIGHT
        fill_rect(draw, 0, 48, 8, 8, GREY_LIGHT)
        fill_rect(draw, 56, 48, 8, 8, GREY_LIGHT)

        # Thin antenna: 2×12 with AMBER blinking tip
        fill_rect(draw, 55, 4, 2, 12, GREY_MID)
        tip_color = AMBER_BRIGHT if f % 2 == 0 else AMBER
        fill_rect(draw, 55, 4, 2, 2, tip_color)

        sheet.paste(frame, (f * W, 0))

    out = os.path.join(OUT_DIR, "trade_hub_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}")


# ---------------------------------------------------------------------------
# 5. SOLAR PANEL — 384×32 (8 frames × 48×32)
# ---------------------------------------------------------------------------
def gen_solar_panel():
    W, H, FRAMES = 48, 32, 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    # Solar cells: 5 cols × 3 rows, each 6×6 with 1px gaps
    # Panel starts at (2, 2), 44×26
    panel_x, panel_y = 2, 2
    cell_w, cell_h = 6, 6
    cols, rows = 5, 3
    # Cell top-left positions
    cells = []
    for row in range(rows):
        for col in range(cols):
            cx = panel_x + 2 + col * (cell_w + 1)
            cy = panel_y + 2 + row * (cell_h + 1)
            cells.append((cx, cy))

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        # Panel frame (GREY_MID border)
        fill_rect(draw, panel_x, panel_y, 44, 26, GREY_MID)

        # Draw all cells
        for ci, (cx, cy) in enumerate(cells):
            col = ci % cols
            # Shine sweep: bright column moves left→right (2 lit columns per frame)
            # lit_col cycles: frame 0 → cols 0,1; frame 1 → cols 1,2; ...
            is_lit = col in (f % cols, (f + 1) % cols)
            cell_color = (SILVER_BLUE[0] + 40, SILVER_BLUE[1] + 40, SILVER_BLUE[2] + 40, 255) if is_lit else SILVER_BLUE
            fill_rect(draw, cx, cy, cell_w, cell_h, cell_color)
            # Cell shine highlight (1×1 white top-left)
            fill_rect(draw, cx + 1, cy + 1, 1, 1, WHITE)
            # Cell border
            draw_outline_rect(draw, cx, cy, cell_w, cell_h, GREY_MID)

        # Pivot bar bottom: 4px thick GREY_DARK
        fill_rect(draw, panel_x, panel_y + 26, 44, 4, GREY_DARK)

        # AMBER power connector bottom center
        conn_color = AMBER_BRIGHT if f % 2 == 0 else AMBER
        fill_rect(draw, panel_x + 20, panel_y + 28, 4, 4, conn_color)

        sheet.paste(frame, (f * W, 0))

    out = os.path.join(OUT_DIR, "solar_panel_sheet.png")
    out_path = out
    sheet.save(out)
    print(f"Saved: {out}")


# ---------------------------------------------------------------------------
# 6. BATTERY BANK — 384×48 (8 frames × 48×48)
# ---------------------------------------------------------------------------
def gen_battery_bank():
    W, H, FRAMES = 48, 48, 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    # 4 battery cells in 2×2, each 14×14, inside 40×40 body centered
    body_x, body_y = 4, 6
    body_w, body_h = 40, 40
    # Cell positions (2px gap between, centered)
    cell_positions = [
        (body_x + 4,      body_y + 4),       # top-left
        (body_x + 22,     body_y + 4),       # top-right
        (body_x + 4,      body_y + 22),      # bottom-left
        (body_x + 22,     body_y + 22),      # bottom-right
    ]
    cell_w, cell_h = 14, 14

    # Charge levels per cell per frame (cells charge in sequence, 2-frame offset)
    # Level: 0..8 px height for energy bar inside cell
    def charge_level(cell_idx, frame):
        offset = cell_idx * 2
        return min(8, max(1, (frame + offset) % 8 + 1))

    for f in range(FRAMES):
        frame_img = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame_img)

        # Main body
        fill_rect(draw, body_x, body_y, body_w, body_h, GREY_DARK)
        draw_outline_rect(draw, body_x, body_y, body_w, body_h, GREY_MID)

        # Capacity readout top: 10×4 TEAL_ENERGY bar
        avg_charge = sum(charge_level(c, f) for c in range(4)) / 4
        cap_fill = int((avg_charge / 8) * 10)
        fill_rect(draw, body_x + 15, body_y - 4, 10, 4, GREY_MID)
        if cap_fill > 0:
            fill_rect(draw, body_x + 15, body_y - 4, cap_fill, 4, TEAL_ENERGY)

        # AMBER routing lines in X pattern between cells
        route_alpha = 255 if f % 2 == 0 else 140
        route_color = (AMBER[0], AMBER[1], AMBER[2], route_alpha)
        cx1 = body_x + 4 + cell_w
        cy1 = body_y + 4 + cell_h // 2
        cx2 = body_x + 22
        cy2 = body_y + 22 + cell_h // 2
        # Horizontal center lines
        fill_rect(draw, body_x + 18, body_y + 11, 4, 2,
                  (AMBER[0], AMBER[1], AMBER[2], route_alpha))
        fill_rect(draw, body_x + 18, body_y + 29, 4, 2,
                  (AMBER[0], AMBER[1], AMBER[2], route_alpha))
        # Vertical center line
        fill_rect(draw, body_x + 19, body_y + 11, 2, 20,
                  (AMBER[0], AMBER[1], AMBER[2], route_alpha))

        # Draw 4 battery cells
        for ci, (cx, cy) in enumerate(cell_positions):
            level = charge_level(ci, f)
            # Cell base
            fill_rect(draw, cx, cy, cell_w, cell_h, NAVY_MID)
            draw_outline_rect(draw, cx, cy, cell_w, cell_h, GREY_MID)
            # TEAL_ENERGY inner glow — pulsing
            glow_alpha = 200 if f % 2 == ci % 2 else 120
            glow_color = (TEAL_ENERGY[0], TEAL_ENERGY[1], TEAL_ENERGY[2], glow_alpha)
            fill_rect(draw, cx + 2, cy + 2, cell_w - 4, cell_h - 4, glow_color)
            # Energy level bar (2px wide, at bottom)
            bar_h = level
            fill_rect(draw, cx + 2, cy + cell_h - 2 - bar_h, cell_w - 4, bar_h,
                      TEAL_ENERGY)

        # Terminal blocks on sides: 8×6 GREY_LIGHT with AMBER contacts
        fill_rect(draw, 0, body_y + 17, 8, 6, GREY_LIGHT)
        fill_rect(draw, 1, body_y + 18, 2, 2, AMBER)
        fill_rect(draw, 40, body_y + 17, 8, 6, GREY_LIGHT)
        fill_rect(draw, 45, body_y + 18, 2, 2, AMBER)

        sheet.paste(frame_img, (f * W, 0))

    out = os.path.join(OUT_DIR, "battery_bank_sheet.png")
    sheet.save(out)
    print(f"Saved: {out}")


# ---------------------------------------------------------------------------
# Run all generators
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    gen_drone_bay()
    gen_habitation_module()
    gen_crafting_station()
    gen_trade_hub()
    gen_solar_panel()
    gen_battery_bank()
    print("\nAll 6 sprite sheets generated successfully.")
