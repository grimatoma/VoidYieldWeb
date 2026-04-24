"""
Generate fabricator_sheet.png — 640×80 (8 frames × 80×80)
Fabricator: Tier 2 two-input factory with teal energy conduits.
"""

from PIL import Image, ImageDraw
import math
import os

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
TRANS       = (0, 0, 0, 0)
GREY_DARK   = (50, 52, 64, 255)
GREY_MID    = (80, 84, 100, 255)
GREY_LIGHT  = (130, 136, 160, 255)
NAVY        = (13, 27, 62, 255)
NAVY_MID    = (22, 43, 85, 255)
TEAL        = (0, 184, 212, 255)
TEAL_DIM    = (0, 100, 130, 255)
TEAL_BRIGHT = (80, 220, 240, 255)
TEAL_GLOW   = (0, 180, 200, 120)
AMBER       = (212, 168, 67, 255)
AMBER_DIM   = (140, 110, 40, 255)
SILVER      = (123, 168, 200, 255)
SILVER_DIM  = (70, 100, 140, 255)
GREEN       = (76, 175, 80, 255)
WHITE_SOFT  = (220, 210, 190, 255)
BLACK_SOFT  = (20, 20, 30, 255)

FRAME_W, FRAME_H = 80, 80
NUM_FRAMES = 8
SHEET_W = FRAME_W * NUM_FRAMES

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clip_to_frame(x, y, fw=FRAME_W, fh=FRAME_H):
    return 0 <= x < fw and 0 <= y < fh

def draw_pixel(draw, ox, x, y, color):
    """Draw a single pixel on the sheet, offset by ox (frame x-offset)."""
    draw.point((ox + x, y), fill=color)

def draw_rect(draw, ox, x, y, w, h, color):
    draw.rectangle([ox+x, y, ox+x+w-1, y+h-1], fill=color)

def draw_rect_outline(draw, ox, x, y, w, h, color, thickness=1):
    for t in range(thickness):
        draw.rectangle([ox+x+t, y+t, ox+x+w-1-t, y+h-1-t], outline=color)

def draw_line_px(draw, ox, x0, y0, x1, y1, color):
    draw.line([ox+x0, y0, ox+x1, y1], fill=color)

def draw_rotated_arm(draw, ox, cx, cy, angle_deg, arm_w=4, arm_len=20, color=GREY_LIGHT):
    """
    Draw a rotated rectangle (arm) centred at (cx,cy), extending arm_len pixels
    in the direction given by angle_deg (0 = right, 90 = down).
    Uses pixel-level rasterisation so it respects transparency.
    """
    angle = math.radians(angle_deg)
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)

    # The arm extends from center outward along angle
    # Local coords: length axis = [0..arm_len], width axis = [-arm_w/2..+arm_w/2]
    hw = arm_w / 2.0

    # Four corners in local space (arm base at center)
    local_corners = [
        (0,       -hw),
        (arm_len, -hw),
        (arm_len,  hw),
        (0,        hw),
    ]

    # Rotate and translate
    world_corners = []
    for lx, ly in local_corners:
        wx = cx + lx * cos_a - ly * sin_a
        wy = cy + lx * sin_a + ly * cos_a
        world_corners.append((ox + wx, wy))

    draw.polygon(world_corners, fill=color)

def draw_circuit_corner(draw, ox, x, y, color_base=NAVY_MID, color_trace=TEAL):
    """6×6 mini circuit board element."""
    draw_rect(draw, ox, x, y, 6, 6, color_base)
    # Horizontal trace
    draw_line_px(draw, ox, x+1, y+2, x+4, y+2, color_trace)
    # Vertical trace
    draw_line_px(draw, ox, x+3, y+1, x+3, y+4, color_trace)
    # Via dot
    draw_pixel(draw, draw, ox, x+3, y+2, color_trace)  # junction
    # Small node at corner
    draw_pixel(draw, ox, x+1, y+4, color_trace)
    draw_pixel(draw, ox, x+4, y+1, color_trace)


# Proper circuit corner without the double-draw bug:
def draw_circuit(img_draw, ox, x, y, trace_color=TEAL):
    """6×6 mini circuit board element on a NAVY_MID base."""
    img_draw.rectangle([ox+x, y, ox+x+5, y+5], fill=NAVY_MID)
    # H trace row 2
    img_draw.line([ox+x+1, y+2, ox+x+4, y+2], fill=trace_color)
    # V trace col 3
    img_draw.line([ox+x+3, y+1, ox+x+3, y+4], fill=trace_color)
    # Corner dots
    img_draw.point((ox+x+1, y+4), fill=trace_color)
    img_draw.point((ox+x+4, y+1), fill=trace_color)

# ---------------------------------------------------------------------------
# Build one frame
# ---------------------------------------------------------------------------

def render_frame(sheet_draw, frame_idx):
    ox = frame_idx * FRAME_W

    # ----- Background: transparent -----
    for px in range(FRAME_W):
        for py in range(FRAME_H):
            sheet_draw.point((ox+px, py), fill=TRANS)

    # ----- Animation state -----
    arm_angle = frame_idx * 45          # degrees clockwise, 0=right
    # Conduit phase: left → right → output (3 phases across 8 frames)
    phase = frame_idx % 3               # 0,1,2
    node_bright = (frame_idx % 2 == 0)
    spark = (frame_idx % 4 == 0)

    left_port_color  = TEAL if phase == 0 else TEAL_DIM
    right_port_color = TEAL if phase == 1 else TEAL_DIM
    output_conduit   = TEAL if phase == 2 else TEAL_DIM
    node_ring_color  = TEAL_BRIGHT if node_bright else TEAL
    node_core_color  = TEAL_BRIGHT if spark else GREY_MID

    # ----- Outer frame: 68×68 with clipped corners (4px diagonal) -----
    # Placed centred in 80×80 → offset (6,6)
    fx, fy = 6, 6
    fw, fh = 68, 68

    # Fill the frame rect first
    sheet_draw.rectangle([ox+fx, fy, ox+fx+fw-1, fy+fh-1], fill=GREY_DARK)

    # Clip corners by setting them transparent (4px diagonal = triangle)
    clip = 4
    for i in range(clip):
        for j in range(clip - i):
            # top-left
            sheet_draw.point((ox+fx+j,      fy+i),          fill=TRANS)
            # top-right
            sheet_draw.point((ox+fx+fw-1-j, fy+i),          fill=TRANS)
            # bottom-left
            sheet_draw.point((ox+fx+j,      fy+fh-1-i),     fill=TRANS)
            # bottom-right
            sheet_draw.point((ox+fx+fw-1-j, fy+fh-1-i),     fill=TRANS)

    # ----- Power conduit: 4px TEAL stripe along top edge of frame -----
    sheet_draw.rectangle([ox+fx+clip, fy, ox+fx+fw-1-clip, fy+3], fill=TEAL)

    # ----- Structural bolts: 2×2 GREY_LIGHT at near-corners -----
    for bx, by in [(fx+3, fy+5), (fx+fw-5, fy+5), (fx+3, fy+fh-7), (fx+fw-5, fy+fh-7)]:
        sheet_draw.rectangle([ox+bx, by, ox+bx+1, by+1], fill=GREY_LIGHT)

    # ----- Inner workspace: 56×56 NAVY_MID -----
    wx, wy = fx+6, fy+6
    ww, wh = 56, 56
    sheet_draw.rectangle([ox+wx, wy, ox+wx+ww-1, wy+wh-1], fill=NAVY_MID)

    # ----- Left input port: 8×8 on left wall -----
    lp_x = fx        # left wall x
    lp_y = fy + (fh - 8) // 2
    # Punch a hole in outer frame and fill with NAVY, teal border
    sheet_draw.rectangle([ox+lp_x, lp_y, ox+lp_x+7, lp_y+7], fill=NAVY)
    sheet_draw.rectangle([ox+lp_x, lp_y, ox+lp_x+7, lp_y+7], outline=left_port_color)

    # ----- Right input port: 8×8 on right wall -----
    rp_x = fx + fw - 8
    rp_y = fy + (fh - 8) // 2
    sheet_draw.rectangle([ox+rp_x, lp_y, ox+rp_x+7, lp_y+7], fill=NAVY)
    sheet_draw.rectangle([ox+rp_x, lp_y, ox+rp_x+7, lp_y+7], outline=right_port_color)

    # ----- Output port: 10×10 on bottom wall -----
    op_x = fx + (fw - 10) // 2
    op_y = fy + fh - 10
    sheet_draw.rectangle([ox+op_x, op_y, ox+op_x+9, op_y+9], fill=NAVY)
    sheet_draw.rectangle([ox+op_x, op_y, ox+op_x+9, op_y+9], outline=output_conduit)
    # Teal frame (2px)
    sheet_draw.rectangle([ox+op_x, op_y, ox+op_x+9, op_y+9], outline=output_conduit)

    # ----- Central assembly node: 14×14 octagon -----
    # Centred in workspace
    node_cx = wx + ww // 2   # = fx+6 + 28 = 40
    node_cy = wy + wh // 2   # = fy+6 + 28 = 40
    node_r  = 7   # half of 14

    # Draw octagon as filled polygon
    def octagon_pts(cx, cy, r, ox_off):
        cut = int(r * 0.29)
        pts = [
            (ox_off+cx-r+cut, cy-r),
            (ox_off+cx+r-cut, cy-r),
            (ox_off+cx+r,     cy-r+cut),
            (ox_off+cx+r,     cy+r-cut),
            (ox_off+cx+r-cut, cy+r),
            (ox_off+cx-r+cut, cy+r),
            (ox_off+cx-r,     cy+r-cut),
            (ox_off+cx-r,     cy-r+cut),
        ]
        return pts

    # Outer ring (TEAL)
    sheet_draw.polygon(octagon_pts(node_cx, node_cy, node_r, ox), fill=node_ring_color)
    # Inner fill (GREY_MID or spark)
    sheet_draw.polygon(octagon_pts(node_cx, node_cy, node_r - 2, ox), fill=node_core_color)

    # ----- Teal conduit lines -----
    # Left port center → node center (horizontal + slight angle)
    lpc_x = lp_x + 8
    lpc_y = lp_y + 4
    # Right port center → node center
    rpc_x = rp_x
    rpc_y = rp_y + 4

    # Draw 2px wide conduit from left port to node
    cond_left_color = TEAL if phase == 0 else TEAL_DIM
    cond_right_color = TEAL if phase == 1 else TEAL_DIM
    cond_out_color   = TEAL if phase == 2 else TEAL_DIM

    for dy in range(2):
        sheet_draw.line([ox+lpc_x, lpc_y+dy, ox+node_cx-node_r, node_cy+dy], fill=cond_left_color)
    for dy in range(2):
        sheet_draw.line([ox+node_cx+node_r, node_cy+dy, ox+rpc_x, rpc_y+dy], fill=cond_right_color)

    # Output conduit: node center → output port center
    op_cx = op_x + 5
    op_cy = op_y
    for dx in range(2):
        sheet_draw.line([ox+node_cx+dx, node_cy+node_r, ox+node_cx+dx, op_cy], fill=cond_out_color)

    # ----- Circuit board elements in workspace corners -----
    draw_circuit(sheet_draw, ox, wx+2,        wy+2,        TEAL)
    draw_circuit(sheet_draw, ox, wx+ww-8,     wy+2,        TEAL)
    draw_circuit(sheet_draw, ox, wx+2,        wy+wh-8,     TEAL)
    draw_circuit(sheet_draw, ox, wx+ww-8,     wy+wh-8,     TEAL)

    # ----- Recipe indicator display: 12×8 panel on top wall -----
    ri_x = fx + (fw - 12) // 2
    ri_y = fy + 4   # sits just inside top power stripe
    sheet_draw.rectangle([ox+ri_x, ri_y, ox+ri_x+11, ri_y+7], fill=BLACK_SOFT)
    sheet_draw.rectangle([ox+ri_x, ri_y, ox+ri_x+11, ri_y+7], outline=AMBER)
    # Draw '2' in amber pixels (tiny 3×5 font)
    two = [
        (1,0),(2,0),
        (2,1),
        (1,2),(2,2),
        (1,3),
        (1,4),(2,4),
    ]
    char_ox = ri_x + 4
    char_oy = ri_y + 1
    for dx, dy in two:
        sheet_draw.point((ox+char_ox+dx, char_oy+dy), fill=AMBER)

    # ----- Status LEDs: 4 lights along bottom frame edge -----
    led_y = fy + fh - 4
    led_positions = [fx+12, fx+22, fx+fw-23, fx+fw-13]
    led_colors = [TEAL, TEAL_DIM, TEAL_DIM, TEAL]
    for i, lx in enumerate(led_positions):
        col = TEAL_BRIGHT if (frame_idx + i) % 4 == 0 else led_colors[i]
        sheet_draw.rectangle([ox+lx, led_y, ox+lx+3, led_y+2], fill=col)

    # ----- Rotating assembly arm -----
    # Arm rotates clockwise; 0°=pointing right (3 o'clock), goes CW
    # arm_angle measured clockwise from east; PIL y-axis is down so +angle = CW
    draw_rotated_arm(
        sheet_draw, ox,
        cx=node_cx, cy=node_cy,
        angle_deg=arm_angle,
        arm_w=4, arm_len=18,
        color=GREY_LIGHT
    )

    # Redraw the node on top of the arm
    sheet_draw.polygon(octagon_pts(node_cx, node_cy, node_r, ox), fill=node_ring_color)
    sheet_draw.polygon(octagon_pts(node_cx, node_cy, node_r - 2, ox), fill=node_core_color)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

OUT_DIR = r"C:/Users/grima/Documents/aiDev/voidDev/VoidYieldWeb/assets/sprites/buildings"
OUT_FILE = os.path.join(OUT_DIR, "fabricator_sheet.png")

sheet = Image.new("RGBA", (SHEET_W, FRAME_H), TRANS)
draw = ImageDraw.Draw(sheet)

for f in range(NUM_FRAMES):
    render_frame(draw, f)

sheet.save(OUT_FILE)
print(f"Saved: {OUT_FILE}")
print(f"Size:  {sheet.size[0]}×{sheet.size[1]} (expected {SHEET_W}×{FRAME_H})")
assert sheet.size == (SHEET_W, FRAME_H), "Size mismatch!"
print("OK — verification passed.")
