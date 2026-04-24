"""
Generate pixel-art sprite sheets for Gate and Fence world elements.
Output: assets/sprites/buildings/
  - gate_sheet.png         256×48  (64×48 × 4 frames)
  - gate_post_sheet.png     32×48  (16×48 × 2 frames)
  - fence_straight_sheet.png 128×16 (32×16 × 4 frames)
  - fence_corner_sheet.png   64×32 (32×32 × 2 frames)
"""

from PIL import Image, ImageDraw
import os

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
GREY_DARK   = (50,  52,  64,  255)
GREY_MID    = (80,  84,  100, 255)
GREY_LIGHT  = (130, 136, 160, 255)
AMBER       = (212, 168, 67,  255)
AMBER_BRIGHT= (255, 200, 80,  255)
AMBER_DIM   = (140, 110, 40,  255)
TEAL        = (0,   184, 212, 255)
TEAL_DIM    = (0,   100, 130, 255)
SILVER      = (123, 168, 200, 255)
NAVY        = (13,  27,  62,  255)
BLACK_SOFT  = (10,  10,  20,  255)
TRANSPARENT = (0,   0,   0,   0)

OUT_DIR = r"C:/Users/grima/Documents/aiDev/voidDev/VoidYieldWeb/assets/sprites/buildings"
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def new_frame(w, h):
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    return img, ImageDraw.Draw(img)

def paste(sheet, frame, x_offset):
    sheet.paste(frame, (x_offset, 0))

def fill_rect(draw, x, y, w, h, color):
    draw.rectangle([x, y, x+w-1, y+h-1], fill=color)

def hline(draw, x0, x1, y, color):
    draw.line([(x0, y), (x1, y)], fill=color)

def vline(draw, x, y0, y1, color):
    draw.line([(x, y0), (x, y1)], fill=color)

# ---------------------------------------------------------------------------
# 1. gate_sheet.png  — 256×48, 64×48 × 4 frames
# ---------------------------------------------------------------------------
GATE_FW, GATE_FH = 64, 48
gate_sheet = Image.new("RGBA", (GATE_FW * 4, GATE_FH), TRANSPARENT)

def draw_gate_frame(door_w, gap):
    """
    door_w : width of each door panel
    gap    : gap between doors (center opening)
    Returns a 64×48 RGBA image.
    """
    img, draw = new_frame(GATE_FW, GATE_FH)
    frame_h = 44  # door height
    top = 2       # top offset

    # --- NAVY fill for center gap (visible when open) ---
    if gap > 0:
        left_door_right = (GATE_FW - gap) // 2
        right_door_left = (GATE_FW + gap) // 2
        fill_rect(draw, left_door_right, top, gap, frame_h, NAVY)

    # Left door — right-aligned to center
    left_x = (GATE_FW - gap) // 2 - door_w
    right_x = (GATE_FW + gap) // 2   # right door starts here

    for door_x in [left_x, right_x]:
        # Door body
        fill_rect(draw, door_x, top, door_w, frame_h, GREY_DARK)

        # 2px GREY_MID border
        draw.rectangle([door_x, top, door_x + door_w - 1, top + frame_h - 1],
                        outline=GREY_MID[:3] + (255,))

        # Vertical bolt-slide bar: 4×18 GREY_LIGHT, centered horizontally
        bar_x = door_x + (door_w - 4) // 2
        bar_y = top + (frame_h - 18) // 2
        fill_rect(draw, bar_x, bar_y, 4, 18, GREY_LIGHT)

        # AMBER corner lights 4×4 at top corners (inside border)
        fill_rect(draw, door_x + 1, top + 1, 4, 4, AMBER)
        fill_rect(draw, door_x + door_w - 5, top + 1, 4, 4, AMBER)

    # --- Hazard stripes at center seam ---
    seam_x = left_x + door_w   # right edge of left door
    stripe_h = frame_h
    stripe_w = 4
    sx = seam_x - 2  # straddle seam by 2px each side
    # Draw diagonal hazard stripes: alternating AMBER / GREY_DARK
    for row in range(top, top + stripe_h):
        col = (row - top) % 8
        color = AMBER if col < 4 else GREY_DARK
        # left side of seam
        if sx >= 0 and sx < GATE_FW:
            img.putpixel((sx, row), color)
            if sx + 1 < GATE_FW:
                img.putpixel((sx + 1, row), color)
        # right side of seam
        if sx + 2 < GATE_FW:
            img.putpixel((sx + 2, row), color)
            if sx + 3 < GATE_FW:
                img.putpixel((sx + 3, row), color)

    # AMBER status indicator 4×4 top center
    fill_rect(draw, GATE_FW // 2 - 2, top + 1, 4, 4, AMBER)

    return img

# Frame 0: closed — door_w=30, gap=0
f0 = draw_gate_frame(door_w=30, gap=0)

# Frame 1: opening — door_w=22, gap=16
f1 = draw_gate_frame(door_w=22, gap=16)

# Frame 2: open — door_w=12, gap=32
f2 = draw_gate_frame(door_w=12, gap=32)

# Frame 3: closing — same as frame 1
f3 = draw_gate_frame(door_w=22, gap=16)

for i, f in enumerate([f0, f1, f2, f3]):
    gate_sheet.paste(f, (i * GATE_FW, 0))

gate_path = os.path.join(OUT_DIR, "gate_sheet.png")
gate_sheet.save(gate_path)
print(f"Saved: {gate_path}  ({gate_sheet.size})")

# ---------------------------------------------------------------------------
# 2. gate_post_sheet.png — 32×48, 16×48 × 2 frames
# ---------------------------------------------------------------------------
POST_FW, POST_FH = 16, 48
post_sheet = Image.new("RGBA", (POST_FW * 2, POST_FH), TRANSPARENT)

def draw_post_frame(light_color):
    img, draw = new_frame(POST_FW, POST_FH)

    # 12×44 post body, centered in 16px width → x=2
    post_x = 2
    post_y = 2
    post_w = 12
    post_h = 44

    fill_rect(draw, post_x, post_y, post_w, post_h, GREY_DARK)

    # 1px GREY_MID highlight on left edge
    vline(draw, post_x, post_y, post_y + post_h - 1, GREY_MID)

    # Status light top: 4×4 at top-center
    sl_x = post_x + (post_w - 4) // 2
    sl_y = post_y + 2
    fill_rect(draw, sl_x, sl_y, 4, 4, light_color)

    # Security camera at y=10: 6×6 GREY_MID box
    cam_x = post_x + (post_w - 6) // 2
    cam_y = 10
    fill_rect(draw, cam_x, cam_y, 6, 6, GREY_MID)
    # TEAL 4×4 lens centered in camera
    lens_x = cam_x + 1
    lens_y = cam_y + 1
    fill_rect(draw, lens_x, lens_y, 4, 4, TEAL)

    return img

p0 = draw_post_frame(AMBER_DIM)
p1 = draw_post_frame(AMBER_BRIGHT)

for i, f in enumerate([p0, p1]):
    post_sheet.paste(f, (i * POST_FW, 0))

post_path = os.path.join(OUT_DIR, "gate_post_sheet.png")
post_sheet.save(post_path)
print(f"Saved: {post_path}  ({post_sheet.size})")

# ---------------------------------------------------------------------------
# 3. fence_straight_sheet.png — 128×16, 32×16 × 4 frames
# ---------------------------------------------------------------------------
FENCE_FW, FENCE_FH = 32, 16
fence_sheet = Image.new("RGBA", (FENCE_FW * 4, FENCE_FH), TRANSPARENT)

def draw_fence_straight(energized):
    img, draw = new_frame(FENCE_FW, FENCE_FH)
    wire_color  = TEAL   if energized else SILVER
    node_color  = TEAL   if energized else GREY_MID

    # Left post: 4×14 GREY_DARK at x=0
    fill_rect(draw, 0, 1, 4, 14, GREY_DARK)
    # Right post: 4×14 GREY_DARK at x=28
    fill_rect(draw, 28, 1, 4, 14, GREY_DARK)
    # Center post: 2×12 GREY_MID at x=14
    fill_rect(draw, 15, 2, 2, 12, GREY_MID)

    # 3 horizontal wire strands at y=3, y=8, y=12
    for wy in [3, 8, 12]:
        hline(draw, 0, FENCE_FW - 1, wy, wire_color)

    # Energy insulator nodes: 3×3 squares where wires meet posts
    # Posts at x=0..3, x=14..15, x=28..31
    post_centers_x = [2, 15, 30]   # approximate center of each post
    for px in post_centers_x:
        for wy in [3, 8, 12]:
            nx = px - 1
            ny = wy - 1
            fill_rect(draw, nx, ny, 3, 3, node_color)

    return img

fs0 = draw_fence_straight(False)
fs1 = draw_fence_straight(False)
fs2 = draw_fence_straight(True)
fs3 = draw_fence_straight(True)

for i, f in enumerate([fs0, fs1, fs2, fs3]):
    fence_sheet.paste(f, (i * FENCE_FW, 0))

fence_path = os.path.join(OUT_DIR, "fence_straight_sheet.png")
fence_sheet.save(fence_path)
print(f"Saved: {fence_path}  ({fence_sheet.size})")

# ---------------------------------------------------------------------------
# 4. fence_corner_sheet.png — 64×32, 32×32 × 2 frames
# ---------------------------------------------------------------------------
CORNER_FW, CORNER_FH = 32, 32
corner_sheet = Image.new("RGBA", (CORNER_FW * 2, CORNER_FH), TRANSPARENT)

def draw_fence_corner(energized):
    img, draw = new_frame(CORNER_FW, CORNER_FH)
    wire_color = TEAL if energized else SILVER

    # Corner post: 6×6 GREY_DARK top-left
    fill_rect(draw, 0, 0, 6, 6, GREY_DARK)

    # 3 horizontal wire strands going right from post
    # Wires at y=1, y=3, y=5 (within post height range), extending to x=31
    for wy in [1, 3, 5]:
        hline(draw, 6, CORNER_FW - 1, wy, wire_color)

    # 3 vertical wire strands going down from post
    # Wires at x=1, x=3, x=5 (within post width range), extending to y=31
    for wx in [1, 3, 5]:
        vline(draw, wx, 6, CORNER_FH - 1, wire_color)

    return img

fc0 = draw_fence_corner(False)
fc1 = draw_fence_corner(True)

for i, f in enumerate([fc0, fc1]):
    corner_sheet.paste(f, (i * CORNER_FW, 0))

corner_path = os.path.join(OUT_DIR, "fence_corner_sheet.png")
corner_sheet.save(corner_path)
print(f"Saved: {corner_path}  ({corner_sheet.size})")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\nAll sprite sheets generated successfully.")
print(f"  gate_sheet.png          {4*GATE_FW}×{GATE_FH}")
print(f"  gate_post_sheet.png      {2*POST_FW}×{POST_FH}")
print(f"  fence_straight_sheet.png {4*FENCE_FW}×{FENCE_FH}")
print(f"  fence_corner_sheet.png   {2*CORNER_FW}×{CORNER_FH}")
