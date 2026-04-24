"""
gen_major_infrastructure.py
Generates 4 animated pixel art sprite sheets for major infrastructure buildings.
All sheets: HORIZONTAL STRIP, 8 frames, RGBA transparent.
"""

from PIL import Image, ImageDraw
import math
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Palette ────────────────────────────────────────────────────────────────────
TRANSPARENT    = (0,   0,   0,   0)
GREY_DARK      = (50,  52,  64,  255)
GREY_MID       = (80,  84,  100, 255)
GREY_LIGHT     = (130, 136, 160, 255)
AMBER          = (212, 168, 67,  255)
AMBER_BRIGHT   = (255, 200, 80,  255)
AMBER_DIM      = (150, 110, 40,  255)
ORANGE         = (220, 130, 30,  255)
ORANGE_HOT     = (255, 160, 40,  255)
FLAME_RED      = (220, 60,  20,  255)
TEAL           = (0,   184, 212, 255)
VIOLET         = (75,  0,   130, 255)
VIOLET_BRIGHT  = (160, 60,  255, 255)
PURPLE         = (138, 91,  196, 255)
PURPLE_BRIGHT  = (180, 80,  240, 255)
SILVER         = (123, 168, 200, 255)
SILVER_BRIGHT  = (200, 230, 255, 255)
NAVY           = (13,  27,  62,  255)
NAVY_MID       = (22,  43,  85,  255)
GREEN          = (76,  175, 80,  255)
WHITE_FLASH    = (255, 255, 240, 255)
BLUE_WATER     = (80,  140, 200, 255)
CYAN_WATER     = (100, 200, 220, 255)
BLACK          = (0,   0,   0,   255)


def draw_rect(draw, x, y, w, h, color):
    draw.rectangle([x, y, x+w-1, y+h-1], fill=color)


def draw_circle_ring(img_pixels, cx, cy, radius, thickness, outer_color, inner_color=None, innermost_color=None):
    """Draw a filled ring by iterating pixels."""
    r_outer = radius
    r_inner = radius - thickness
    for dy in range(-r_outer - 1, r_outer + 2):
        for dx in range(-r_outer - 1, r_outer + 2):
            dist = math.sqrt(dx*dx + dy*dy)
            px, py = cx + dx, cy + dy
            if 0 <= px < img_pixels.size[0] and 0 <= py < img_pixels.size[1]:
                if r_inner <= dist <= r_outer:
                    # innermost 1px band
                    if innermost_color and dist <= r_inner + 1.0:
                        img_pixels.putpixel((px, py), innermost_color)
                    # inner edge band (~2px)
                    elif inner_color and dist <= r_inner + 3.0:
                        img_pixels.putpixel((px, py), inner_color)
                    else:
                        img_pixels.putpixel((px, py), outer_color)


def set_pixel(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)


def blend(c1, c2, t):
    """Linear blend between two RGBA colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(4))


# ══════════════════════════════════════════════════════════════════════════════
# 1. LAUNCHPAD  96×96 × 8 = 768×96
# ══════════════════════════════════════════════════════════════════════════════
def gen_launchpad():
    W, H = 96, 96
    FRAMES = 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    # Perimeter light positions (8 evenly spaced around pad)
    pad_cx, pad_cy = 48, 50
    pad_r = 38
    light_positions = []
    for i in range(8):
        angle = math.radians(i * 45)
        lx = int(pad_cx + pad_r * math.cos(angle))
        ly = int(pad_cy + pad_r * math.sin(angle))
        light_positions.append((lx, ly))

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        pre_launch = f >= 6

        # ── Blast pad: 84×84, centered ──────────────────────────────────────
        bx, by = (W - 84) // 2, (H - 84) // 2
        draw_rect(draw, bx, by, 84, 84, GREY_DARK)

        # Scorch marks — radial lines from center
        for angle_deg in range(0, 360, 30):
            angle = math.radians(angle_deg)
            for r in range(4, 38, 2):
                sx = int(pad_cx + r * math.cos(angle))
                sy = int(pad_cy + r * math.sin(angle))
                c = blend(GREY_DARK, GREY_MID, min(1.0, r / 38))
                set_pixel(frame, sx, sy, c)

        # ── Flame deflector trench bottom ─────────────────────────────────
        tx, ty = pad_cx - 8, by + 84 - 10
        draw_rect(draw, tx, ty, 16, 8, BLACK)
        # Trench flicker on pre-launch frames
        if pre_launch:
            trench_col = ORANGE_HOT if f == 6 else FLAME_RED
            draw_rect(draw, tx + 2, ty + 2, 12, 4, trench_col)

        # ── Rocket mount circle ──────────────────────────────────────────
        mx, my = pad_cx - 12, pad_cy - 12
        draw.ellipse([mx, my, mx+24, my+24], fill=GREY_MID, outline=GREY_LIGHT)

        # ── Fuel feed pipes (4px wide) ────────────────────────────────────
        pulse = (f % 4) * 6  # offset for flow animation
        for pipe_x_start in [bx, bx + 60]:
            # horizontal pipe to mount
            for px in range(pipe_x_start, pad_cx - 12):
                t = ((px - pipe_x_start + pulse) % 24) / 24.0
                c = blend(AMBER_DIM, AMBER, t) if t > 0.5 else AMBER_DIM
                for dy in range(4):
                    set_pixel(frame, px, pad_cy - 2 + dy, c)

        # ── Launch tower: 12×40 on right side ─────────────────────────────
        tower_x = bx + 68
        tower_y = by + 10
        draw_rect(draw, tower_x, tower_y, 12, 40, GREY_DARK)
        # Crossbeam brackets every 8px
        for brace_y in range(tower_y + 4, tower_y + 40, 8):
            draw_rect(draw, tower_x - 4, brace_y, 16, 2, GREY_MID)

        # ── Hold arms: 4×20, from tower toward mount, oscillate ──────────
        arm_base_x = tower_x
        for arm_offset_y, arm_dir in [(tower_y + 8, 0), (tower_y + 22, 1)]:
            swing = int(4 * math.sin(math.radians(f * 45 + arm_dir * 90)))
            arm_end_x = arm_base_x - 20 + swing
            draw.line([arm_base_x, arm_offset_y + 2, arm_end_x, arm_offset_y + 2], fill=GREY_MID, width=4)

        # ── Perimeter pad lights (chase clockwise) ────────────────────────
        active_light = f % 8
        for i, (lx, ly) in enumerate(light_positions):
            dist_from_active = (i - active_light) % 8
            if dist_from_active == 0:
                col = AMBER_BRIGHT if not pre_launch else WHITE_FLASH
            elif dist_from_active == 1:
                col = AMBER
            else:
                col = AMBER_DIM
            # Beacon blink: frame 0,4 = brighter
            if f % 4 == 0 and i == 0:
                col = AMBER_BRIGHT
            draw_rect(draw, lx - 1, ly - 1, 3, 3, col)

        sheet.paste(frame, (f * W, 0))

    sheet.save(os.path.join(OUTPUT_DIR, "launchpad_animated_sheet.png"))
    print("OK launchpad_animated_sheet.png")


# ══════════════════════════════════════════════════════════════════════════════
# 2. CARGO SHIP BAY  96×80 × 8 = 768×80
# ══════════════════════════════════════════════════════════════════════════════
def gen_cargo_bay():
    W, H = 96, 80
    FRAMES = 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        ship_arriving = (f == 4)

        # ── Outer bay structure: 84×68 ────────────────────────────────────
        bx, by = (W - 84) // 2, (H - 68) // 2
        draw_rect(draw, bx, by, 84, 68, GREY_DARK)

        # ── Interior floor: 60×52 NAVY_MID ───────────────────────────────
        ix, iy = bx + 12, by + 8
        draw_rect(draw, ix, iy, 60, 52, NAVY_MID)

        # ── Bay doors top: 2 panels 26×10 ─────────────────────────────────
        draw_rect(draw, bx + 2,  by, 26, 10, GREY_MID)
        draw_rect(draw, bx + 56, by, 26, 10, GREY_MID)

        # ── Docking clamps — 4 corners 8×12 ───────────────────────────────
        for cx2, cy2 in [(ix, iy), (ix + 52, iy), (ix, iy + 40), (ix + 52, iy + 40)]:
            draw_rect(draw, cx2, cy2, 8, 12, GREY_LIGHT)

        # ── Loading crane arm: 4×60 horizontal ───────────────────────────
        crane_y = by + 20
        crane_move = int(6 * math.sin(math.radians(f * 45)))
        crane_x = ix + crane_move
        draw_rect(draw, ix, crane_y, 60, 4, GREY_LIGHT)
        # Crane hook: 8×8 hanging from center
        hook_x = crane_x + 26
        draw_rect(draw, hook_x, crane_y + 4, 8, 8, GREY_MID)
        draw.line([hook_x + 4, crane_y + 4, hook_x + 4, crane_y + 12], fill=GREY_LIGHT, width=2)

        # ── Cargo platform back: 24×16 ────────────────────────────────────
        plat_x = ix + 18
        plat_y = iy + 32
        plat_col = AMBER_BRIGHT if ship_arriving else GREY_MID
        draw_rect(draw, plat_x, plat_y, 24, 16, plat_col)

        # ── Fuel transfer lines (3 lines from walls) ──────────────────────
        pulse = (f % 4) * 5
        for line_y in [iy + 10, iy + 25, iy + 40]:
            for px in range(bx, ix):
                t = ((px + pulse) % 20) / 20.0
                c = blend(AMBER_DIM, AMBER, t) if t > 0.5 else AMBER_DIM
                set_pixel(frame, px, line_y, c)
                set_pixel(frame, px, line_y + 1, c)
                set_pixel(frame, px, line_y + 2, c)
                set_pixel(frame, px, line_y + 3, c)

        # ── Signal lights on entrance (2 GREEN + 2 AMBER) ─────────────────
        sig_lights = [
            (bx + 4,  by + 14, GREEN),
            (bx + 4,  by + 22, AMBER),
            (bx + 76, by + 14, GREEN),
            (bx + 76, by + 22, AMBER),
        ]
        for lx, ly, base_col in sig_lights:
            # Alternate: even frames GREEN active, odd frames AMBER active
            if f % 2 == 0:
                col = base_col if base_col == GREEN else GREY_MID
            else:
                col = base_col if base_col == AMBER else GREY_MID
            draw_rect(draw, lx, ly, 6, 6, col)

        # ── Nav guide lines on floor (dashed AMBER) ───────────────────────
        nav_pulse = (f * 3) % 6
        for nx in range(ix + 4, ix + 56, 6):
            draw_y = iy + 46
            if ((nx + nav_pulse) // 6) % 2 == 0:
                draw_rect(draw, nx, draw_y, 4, 2, AMBER)

        sheet.paste(frame, (f * W, 0))

    sheet.save(os.path.join(OUTPUT_DIR, "cargo_ship_bay_sheet.png"))
    print("OK cargo_ship_bay_sheet.png")


# ══════════════════════════════════════════════════════════════════════════════
# 3. WARP GATE  96×96 × 8 = 768×96
# ══════════════════════════════════════════════════════════════════════════════
def gen_warp_gate():
    W, H = 96, 96
    FRAMES = 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    cx, cy = 48, 46  # gate center
    gate_r = 44      # outer radius
    ring_thickness = 12

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        portal_flare = f in (3, 4)
        rot_offset = f * 5  # degrees

        # ── 4 I-beam structural supports at quarters ──────────────────────
        for angle_deg in [0, 90, 180, 270]:
            angle = math.radians(angle_deg)
            sx = int(cx + (gate_r + 6) * math.cos(angle))
            sy = int(cy + (gate_r + 6) * math.sin(angle))
            # vertical beam
            draw_rect(draw, sx - 3, sy - 15, 6, 30, GREY_DARK)
            # horizontal flanges
            draw_rect(draw, sx - 5, sy - 15, 10, 3, GREY_MID)
            draw_rect(draw, sx - 5, sy + 12, 10, 3, GREY_MID)

        # ── Outer gate ring ────────────────────────────────────────────────
        draw_circle_ring(frame, cx, cy, gate_r, ring_thickness, GREY_DARK, GREY_MID, VIOLET)

        # ── 8 node structures on ring at 45° intervals ────────────────────
        for i in range(8):
            node_angle = math.radians(i * 45 + rot_offset)
            nx = int(cx + gate_r * math.cos(node_angle))
            ny = int(cy + gate_r * math.sin(node_angle))
            draw.ellipse([nx-5, ny-5, nx+5, ny+5], fill=GREY_DARK, outline=GREY_MID)
            # Gem pulse: ripple wave — each node 1 frame offset
            gem_bright = ((f - i) % 8) < 2
            gem_col = PURPLE_BRIGHT if gem_bright else PURPLE
            draw.ellipse([nx-3, ny-3, nx+3, ny+3], fill=gem_col)

        # ── TEAL/VIOLET conduit lines from nodes inward ───────────────────
        for i in range(8):
            node_angle = math.radians(i * 45 + rot_offset)
            nx = int(cx + gate_r * math.cos(node_angle))
            ny = int(cy + gate_r * math.sin(node_angle))
            inner_x = int(cx + (gate_r - ring_thickness - 4) * math.cos(node_angle))
            inner_y = int(cy + (gate_r - ring_thickness - 4) * math.sin(node_angle))
            shimmer = ((f + i) % 3) == 0
            conduit_col = TEAL if i % 2 == 0 else VIOLET
            if shimmer:
                conduit_col = blend(conduit_col, WHITE_FLASH, 0.4)
            draw.line([nx, ny, inner_x, inner_y], fill=conduit_col, width=2)

        # ── Gate center — concentric void rings ───────────────────────────
        void_r = gate_r - ring_thickness - 2
        ring_offset = f * 2  # creates spin illusion
        for ring_i in range(6):
            r = void_r - ring_i * 5
            if r <= 0:
                break
            # Alternate VIOLET / NAVY, offset by frame for spin
            t = ((ring_i + ring_offset) % 6) / 6.0
            ring_col = blend(VIOLET, NAVY, t) if not portal_flare else blend(VIOLET_BRIGHT, VIOLET, t)
            if r > 2:
                draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=ring_col, width=1)

        # Fill center with deep NAVY/VIOLET
        center_r = void_r - 5 * 5
        if center_r > 0:
            fill_col = VIOLET_BRIGHT if portal_flare else VIOLET
            draw.ellipse([cx-center_r, cy-center_r, cx+center_r, cy+center_r], fill=fill_col)

        # ── Base control station bottom: 20×14 ───────────────────────────
        base_x = cx - 10
        base_y = H - 16
        draw_rect(draw, base_x, base_y, 20, 14, GREY_MID)
        # TEAL screens (pulse)
        screen_col = blend(TEAL, WHITE_FLASH, 0.3) if f % 2 == 0 else TEAL
        draw_rect(draw, base_x + 2, base_y + 2, 7, 5, screen_col)
        draw_rect(draw, base_x + 11, base_y + 2, 7, 5, screen_col)

        sheet.paste(frame, (f * W, 0))

    sheet.save(os.path.join(OUTPUT_DIR, "warp_gate_sheet.png"))
    print("OK warp_gate_sheet.png")


# ══════════════════════════════════════════════════════════════════════════════
# 4. ATMOSPHERIC WATER EXTRACTOR  56×64 × 8 = 448×64
# ══════════════════════════════════════════════════════════════════════════════
def gen_water_extractor():
    W, H = 56, 64
    FRAMES = 8
    sheet = Image.new("RGBA", (W * FRAMES, H), TRANSPARENT)

    # Atmospheric particle drift positions (fixed per frame)
    atmo_particles = [
        [(5, 8), (12, 3), (46, 6)],   # f0
        [(7, 5), (14, 2), (44, 8)],   # f1
        [(9, 3), (11, 6), (42, 5)],   # f2
        [(6, 7), (13, 4), (45, 3)],   # f3
        [(8, 4), (10, 8), (47, 6)],   # f4
        [(4, 6), (15, 3), (43, 4)],   # f5
        [(7, 3), (12, 7), (46, 2)],   # f6
        [(5, 5), (14, 5), (44, 7)],   # f7
    ]

    for f in range(FRAMES):
        frame = Image.new("RGBA", (W, H), TRANSPARENT)
        draw = ImageDraw.Draw(frame)

        # ── PURPLE tint outer edges ───────────────────────────────────────
        for ex in range(W):
            for ey in range(H):
                edge_dist = min(ex, W-1-ex, ey, H-1-ey)
                if edge_dist < 3:
                    t = 1.0 - edge_dist / 3.0
                    set_pixel(frame, ex, ey, (75, 0, 130, int(120 * t)))

        # ── Main body: 46×52 centered ─────────────────────────────────────
        bx, by = (W - 46) // 2, (H - 52) // 2 + 4
        draw_rect(draw, bx, by, 46, 52, GREY_DARK)

        # ── Atmospheric intake top: 30×16 ────────────────────────────────
        ix, iy = bx + 8, by - 10
        draw_rect(draw, ix, iy, 30, 16, GREY_MID)
        # 4-dot mesh (3×3 grid of dots)
        intake_flicker = f % 3 == 0
        for dot_row in range(3):
            for dot_col in range(4):
                dx = ix + 4 + dot_col * 7
                dy = iy + 4 + dot_row * 4
                dot_col_c = GREY_LIGHT if not intake_flicker else WHITE_FLASH
                draw_rect(draw, dx, dy, 2, 2, dot_col_c)

        # ── Condensation coil: zigzag 12×20 ──────────────────────────────
        coil_x, coil_y = bx + 17, by + 2
        coil_pts = []
        for i in range(10):
            zigx = coil_x + (0 if i % 2 == 0 else 12)
            zigy = coil_y + i * 2
            coil_pts.append((zigx, zigy))
        if len(coil_pts) > 1:
            draw.line(coil_pts, fill=GREY_LIGHT, width=2)

        # Condensation drip: CYAN_WATER pixel moving down coil
        drip_offset = f % 10
        drip_y = coil_y + drip_offset * 2
        drip_x = coil_x + (0 if (drip_offset % 2) == 0 else 12)
        if 0 <= drip_y < H:
            set_pixel(frame, drip_x, drip_y, CYAN_WATER)
            set_pixel(frame, drip_x, drip_y + 1, blend(CYAN_WATER, TRANSPARENT, 0.5))

        # ── Water collection cylinders: 10×20 each ────────────────────────
        fill_heights = [4 + (f * 2) % 14, 6 + (f * 3) % 12]
        for c_i, (cyl_x_off, fill_h) in enumerate(zip([bx + 2, bx + 34], fill_heights)):
            cyl_top = by + 24
            # Cylinder outline
            draw_rect(draw, cyl_x_off, cyl_top, 10, 20, GREY_MID)
            # Water fill from bottom
            fill_y = cyl_top + 20 - fill_h
            draw_rect(draw, cyl_x_off + 1, fill_y, 8, fill_h - 1, BLUE_WATER)
            # Inner glow top of water
            draw_rect(draw, cyl_x_off + 2, fill_y, 6, 2, CYAN_WATER)

        # ── Water output tank bottom: 14×12 ──────────────────────────────
        tank_x = bx + 16
        tank_y = by + 38
        draw_rect(draw, tank_x, tank_y, 14, 12, BLUE_WATER)
        # Fill level line fluctuates
        tank_level = 4 + (f % 4)
        draw_rect(draw, tank_x + 1, tank_y + 12 - tank_level, 12, 2, CYAN_WATER)
        draw_rect(draw, tank_x + 1, tank_y + 12 - tank_level - 1, 12, 1, WHITE_FLASH)

        # ── Atmospheric sensor pod top: 8×6 ───────────────────────────────
        sensor_x = bx + 19
        sensor_y = iy - 7
        draw_rect(draw, sensor_x, sensor_y, 8, 6, TEAL)
        # Eye blink
        eye_col = WHITE_FLASH if f % 4 < 2 else TEAL
        draw_rect(draw, sensor_x + 2, sensor_y + 1, 4, 4, eye_col)

        # ── Status panel front: 10×6 ──────────────────────────────────────
        draw_rect(draw, bx + 18, by + 44, 10, 6, GREY_MID)
        status_dot = TEAL if f % 2 == 0 else AMBER
        draw_rect(draw, bx + 19, by + 45, 3, 4, status_dot)

        # ── Atmospheric PURPLE drift particles ───────────────────────────
        for px, py in atmo_particles[f]:
            set_pixel(frame, px, py, PURPLE)
            set_pixel(frame, px + 1, py, (138, 91, 196, 180))

        sheet.paste(frame, (f * W, 0))

    sheet.save(os.path.join(OUTPUT_DIR, "atmospheric_water_extractor_sheet.png"))
    print("OK atmospheric_water_extractor_sheet.png")


# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    gen_launchpad()
    gen_cargo_bay()
    gen_warp_gate()
    gen_water_extractor()
    print("\nAll 4 sprite sheets generated successfully.")
