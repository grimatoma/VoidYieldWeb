"""
Generate the player sprite sheet for VoidYield (v2).

Layout (448 x 192):
  4 rows (directions): SE, SW, NE, NW
  14 cols (animations):
    0-3   idle  (4 frames: breathing)
    4-9   walk  (6 frames: step cycle)
    10-13 mine  (4 frames: pickaxe swing)

Each frame is 32 x 48 pixels, pixel-art style, nearest-neighbor friendly.
The character is a space miner in a navy suit with amber trim, teal visor,
and a mag-boots stance. Back views show a backpack with a glowing vent.
"""
from PIL import Image

# ─── Palette ────────────────────────────────────────────────────────────────
OUTLINE   = (8, 14, 26, 255)
SUIT      = (34, 62, 102, 255)
SUIT_SHD  = (22, 40, 68, 255)
SUIT_HI   = (64, 104, 156, 255)
AMBER     = (212, 168, 67, 255)
AMBER_HI  = (250, 210, 110, 255)
AMBER_SHD = (150, 112, 40, 255)
HELMET    = (48, 86, 144, 255)
HELMET_HI = (94, 138, 198, 255)
HELMET_RM = (20, 38, 70, 255)
VISOR     = (0, 184, 212, 255)
VISOR_HI  = (183, 240, 255, 255)
VISOR_SHD = (8, 80, 110, 255)
SKIN      = (240, 196, 152, 255)
SKIN_SHD  = (176, 132, 98, 255)
BOOT      = (14, 22, 40, 255)
BOOT_HI   = (44, 62, 92, 255)
PACK      = (82, 48, 104, 255)
PACK_HI   = (134, 86, 160, 255)
PACK_GLOW = (0, 210, 240, 255)
HANDLE    = (112, 64, 36, 255)
HANDLE_HI = (154, 100, 64, 255)
METAL     = (192, 200, 212, 255)
METAL_HI  = (234, 238, 244, 255)
METAL_SHD = (118, 128, 146, 255)
SHADOW    = (0, 0, 0, 100)

# ─── Frame dimensions ───────────────────────────────────────────────────────
FW, FH = 32, 48
COLS, ROWS = 14, 4
SHEET_W, SHEET_H = FW * COLS, FH * ROWS

ROW_SE, ROW_SW, ROW_NE, ROW_NW = 0, 1, 2, 3
IDLE_RANGE  = range(0, 4)
WALK_RANGE  = range(4, 10)
MINE_RANGE  = range(10, 14)


def put(img, x, y, color):
    if color is None:
        return
    if 0 <= x < FW and 0 <= y < FH:
        img.putpixel((x, y), color)


def rect(img, x0, y0, x1, y1, color):
    if x1 < x0 or y1 < y0:
        return
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(img, x, y, color)


def hline(img, x0, x1, y, color):
    for x in range(x0, x1 + 1):
        put(img, x, y, color)


def vline(img, x, y0, y1, color):
    for y in range(y0, y1 + 1):
        put(img, x, y, color)


def outline_rect(img, x0, y0, x1, y1, color):
    hline(img, x0, x1, y0, color)
    hline(img, x0, x1, y1, color)
    vline(img, x0, y0, y1, color)
    vline(img, x1, y0, y1, color)


def ground_shadow(img, cx, by, rx=7, ry=2):
    for y in range(-ry, ry + 1):
        for x in range(-rx, rx + 1):
            if (x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01) <= 1.0:
                xx, yy = cx + x, by + y
                if 0 <= xx < FW and 0 <= yy < FH:
                    existing = img.getpixel((xx, yy))
                    if existing[3] == 0:
                        img.putpixel((xx, yy), SHADOW)


# ─── Body part drawing ──────────────────────────────────────────────────────
# Silhouette plan (32×48 frame, centered on x=16):
#   Head/helmet:  y  3..15   width 10 (x 11..20)
#   Neck:         y 15..16   width  6 (x 13..18)
#   Torso:        y 17..28   width 10 (x 11..20)
#   Hips:         y 29..31   width  8 (x 12..19)
#   Legs:         y 32..41   width  3 each, gap of 2px
#                   left  x 12..14
#                   right x 17..19
#   Boots:        y 42..45   width  4 each (slightly wider than legs)
#                   left  x 11..14
#                   right x 17..20
#   Shoulders/arms anchor at y=18, shoulder width extends to x 9/22
#
# For walk: legs alternate lifting by 2px; boots move with them.
# Bob is a whole-body vertical offset. Lean is a whole-body horizontal offset.


def draw_boot(img, x0, x1, y0, y1):
    rect(img, x0, y0, x1, y1, BOOT)
    hline(img, x0, x1, y0, BOOT_HI)
    outline_rect(img, x0 - 1, y0 - 1, x1 + 1, y1 + 1, OUTLINE)


def draw_leg(img, x0, x1, hip_y, foot_y, lift):
    """Draw a single leg from hip to the top of the boot, plus the boot."""
    # Leg shaft
    shaft_top = hip_y
    shaft_bot = foot_y - 3 - lift
    rect(img, x0, shaft_top, x1, shaft_bot, SUIT_SHD)
    # Highlight on the outer side
    vline(img, x0, shaft_top, shaft_bot, SUIT)
    # Outline
    vline(img, x0 - 1, shaft_top, shaft_bot, OUTLINE)
    vline(img, x1 + 1, shaft_top, shaft_bot, OUTLINE)
    # Boot
    boot_y0 = shaft_bot + 1
    boot_y1 = foot_y - lift
    draw_boot(img, x0 - 1, x1 + 1, boot_y0, boot_y1)


def draw_legs(img, bob, step, facing, stance=0):
    """
    step: -1 (left fwd), 0 (planted), +1 (right fwd)
    stance: extra vertical lift of both legs (for mining squat)
    """
    base_foot_y = 45 + bob
    hip_y = 30 + bob
    # Leg columns
    lx0, lx1 = 12, 14
    rx0, rx1 = 17, 19

    # Knee highlight (small seam)
    knee_y = hip_y + 6
    # Determine lift per leg
    if step == -1:
        left_lift, right_lift = 2, 0
    elif step == +1:
        left_lift, right_lift = 0, 2
    else:
        left_lift, right_lift = stance, stance

    draw_leg(img, lx0, lx1, hip_y, base_foot_y, left_lift)
    draw_leg(img, rx0, rx1, hip_y, base_foot_y, right_lift)

    # Hip/belt band on top of legs to visually separate from torso
    rect(img, 12, hip_y - 1, 19, hip_y - 1, BOOT)

    # Knee plates (little highlight marks, only on front-facing)
    if facing == 'S':
        put(img, lx0, knee_y - left_lift, SUIT_HI)
        put(img, rx1, knee_y - right_lift, SUIT_HI)


def draw_torso(img, bob, lean, facing):
    y0, y1 = 17 + bob, 29 + bob
    x0, x1 = 11 + lean, 20 + lean
    # Body block
    rect(img, x0, y0, x1, y1, SUIT)
    # Left highlight column
    vline(img, x0 + 1, y0 + 1, y1 - 1, SUIT_HI)
    # Right shadow column
    vline(img, x1 - 1, y0 + 1, y1 - 1, SUIT_SHD)
    # Outline
    outline_rect(img, x0, y0, x1, y1, OUTLINE)

    if facing == 'S':
        # Amber shoulder pauldrons
        hline(img, x0, x0 + 2, y0 + 1, AMBER)
        hline(img, x0, x0 + 2, y0 + 2, AMBER_SHD)
        hline(img, x1 - 2, x1, y0 + 1, AMBER)
        hline(img, x1 - 2, x1, y0 + 2, AMBER_SHD)
        # Chest pack
        cx0, cy0 = x0 + 3, y0 + 3
        cx1, cy1 = x1 - 3, y0 + 7
        rect(img, cx0, cy0, cx1, cy1, SUIT_SHD)
        outline_rect(img, cx0, cy0, cx1, cy1, HELMET_RM)
        # Status lights on the chest pack
        put(img, cx0 + 1, cy0 + 1, VISOR_HI)
        put(img, cx0 + 1, cy0 + 2, VISOR)
        put(img, cx1 - 1, cy0 + 1, AMBER_HI)
        put(img, cx1 - 1, cy0 + 2, AMBER)
        # Belt buckle
        put(img, (x0 + x1) // 2, y1 - 1, AMBER_HI)
        hline(img, (x0 + x1) // 2 - 1, (x0 + x1) // 2 + 1, y1, AMBER_SHD)
    else:
        # Backpack on the back (view)
        pack_x0, pack_x1 = x0 + 1, x1 - 1
        pack_y0, pack_y1 = y0 + 1, y1 - 2
        rect(img, pack_x0, pack_y0, pack_x1, pack_y1, PACK)
        # Pack highlights
        hline(img, pack_x0, pack_x1, pack_y0, PACK_HI)
        vline(img, pack_x0, pack_y0, pack_y1, PACK_HI)
        # Straps crossing around to the sides
        vline(img, x0, pack_y0 + 1, y1 - 1, AMBER_SHD)
        vline(img, x1, pack_y0 + 1, y1 - 1, AMBER_SHD)
        # Pack outline
        outline_rect(img, pack_x0, pack_y0, pack_x1, pack_y1, HELMET_RM)
        # Glowing vent on the bottom of the pack
        cx = (pack_x0 + pack_x1) // 2
        put(img, cx - 1, pack_y1 - 1, PACK_GLOW)
        put(img, cx, pack_y1 - 1, VISOR_HI)
        put(img, cx + 1, pack_y1 - 1, PACK_GLOW)


def draw_head(img, bob, facing, direction_lr, tilt=0):
    y0, y1 = 3 + bob, 15 + bob
    x0, x1 = 11, 20
    # Helmet shell
    rect(img, x0, y0, x1, y1, HELMET)
    # Top-left highlight
    hline(img, x0 + 1, x0 + 3, y0, HELMET_HI)
    put(img, x0, y0 + 1, HELMET_HI)
    # Right side shadow
    vline(img, x1, y0 + 1, y1 - 1, HELMET_RM)
    vline(img, x1 - 1, y0 + 2, y1 - 2, HELMET_RM)
    # Bottom rim
    hline(img, x0, x1, y1, HELMET_RM)
    # Neck
    rect(img, 13, y1 + 1, 18, y1 + 1, SUIT_SHD)
    hline(img, 13, 18, y1 + 2, OUTLINE)
    # Hard outline around helmet
    hline(img, x0, x1, y0 - 1, OUTLINE)
    vline(img, x0 - 1, y0, y1, OUTLINE)
    vline(img, x1 + 1, y0, y1, OUTLINE)
    hline(img, x0 - 1, x1 + 1, y1 + 1, OUTLINE)

    # Antenna
    put(img, 16, y0 - 2, OUTLINE)
    put(img, 16, y0 - 3, AMBER)
    put(img, 16, y0 - 4, AMBER_HI)

    if facing == 'S':
        # Visor window
        vx0, vx1 = x0 + 1, x1 - 1
        vy0, vy1 = y0 + 3, y1 - 2
        rect(img, vx0, vy0, vx1, vy1, VISOR)
        # Visor frame
        outline_rect(img, vx0 - 1, vy0 - 1, vx1 + 1, vy1 + 1, HELMET_RM)
        # Face peeking through the visor (shifted per 3/4 turn)
        face_shift = -1 if direction_lr == 'W' else 1
        fx = 15 + (face_shift // 2)
        # Skin tone
        rect(img, fx, vy0 + 1, fx + 1, vy1 - 1, SKIN)
        put(img, fx, vy1 - 1, SKIN_SHD)
        # Eye
        put(img, fx, vy0 + 2, OUTLINE)
        put(img, fx + 1, vy0 + 2, OUTLINE)
        # Visor reflections
        hline(img, vx0, vx0 + 2, vy0, VISOR_HI)
        put(img, vx0, vy0 + 1, VISOR_HI)
        put(img, vx0 + 1, vy0 + 2, VISOR_HI)
        # Bottom-right shine band
        hline(img, vx1 - 2, vx1, vy1, VISOR_SHD)
        put(img, vx1, vy1 - 1, VISOR_SHD)
    else:
        # Back of helmet: a panel seam down the middle + side turn shading
        vline(img, 16, y0 + 2, y1 - 1, HELMET_RM)
        vline(img, 15, y0 + 2, y1 - 1, HELMET_HI)
        # Vents (horizontal ticks)
        put(img, 13, y0 + 5, HELMET_RM)
        put(img, 18, y0 + 5, HELMET_RM)
        put(img, 13, y0 + 8, HELMET_RM)
        put(img, 18, y0 + 8, HELMET_RM)
        # 3/4 turn dark band on the far side
        if direction_lr == 'E':
            vline(img, x0 + 1, y0 + 1, y1 - 1, HELMET_RM)
        else:
            vline(img, x1 - 1, y0 + 1, y1 - 1, HELMET_RM)


def draw_arm(img, x0, x1, y0, y1, glove_y0=None, glove_y1=None):
    """Draw an arm as a rounded rectangle with glove at the bottom."""
    rect(img, x0, y0, x1, y1, SUIT_SHD)
    # Highlight strip on the outside
    vline(img, x0, y0, y1, SUIT)
    # Outline
    outline_rect(img, x0 - 1, y0 - 1, x1 + 1, y1 + 1, OUTLINE)
    # Glove
    gy0 = glove_y0 if glove_y0 is not None else y1 + 1
    gy1 = glove_y1 if glove_y1 is not None else y1 + 2
    rect(img, x0, gy0, x1, gy1, BOOT)
    hline(img, x0, x1, gy0, BOOT_HI)
    outline_rect(img, x0 - 1, gy0 - 1, x1 + 1, gy1 + 1, OUTLINE)


def draw_arms_idle(img, bob, facing, direction_lr, sway):
    """Arms hang straight down at the sides."""
    y0 = 18 + bob
    # Left arm (viewer's left = character's right for front-facing,
    #           but symmetric enough for our 3/4 style)
    l_y1 = 27 + bob + (sway if direction_lr == 'E' else 0)
    draw_arm(img, 8, 10, y0, l_y1)
    r_y1 = 27 + bob + (sway if direction_lr == 'W' else 0)
    draw_arm(img, 21, 23, y0, r_y1)


def draw_arms_walk(img, bob, facing, direction_lr, step):
    y0 = 18 + bob
    # Arms swing opposite to the legs.
    # step=+1 (right leg fwd) => left arm forward (shorter), right arm back (longer)
    left_delta  = -1 if step == +1 else (1 if step == -1 else 0)
    right_delta = -left_delta
    draw_arm(img, 8, 10, y0, 27 + bob + left_delta)
    draw_arm(img, 21, 23, y0, 27 + bob + right_delta)


# ─── Pickaxe ────────────────────────────────────────────────────────────────

def _line_points(x0, y0, x1, y1):
    """Bresenham line."""
    points = []
    dx = abs(x1 - x0); dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    x, y = x0, y0
    while True:
        points.append((x, y))
        if x == x1 and y == y1: break
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x += sx
        if e2 <= dx:
            err += dx; y += sy
    return points


def draw_pickaxe_with_arm(img, shoulder, angle_key, direction_lr):
    """
    Draw the tool arm (from shoulder to hand) and the pickaxe in one routine.
    angle_key 0..3 = wind-up overhead → mid-swing → strike → follow-through
    """
    mirror = 1 if direction_lr == 'E' else -1
    sx, sy = shoulder

    # For each pose we choose:
    #   hand: where the glove grips the handle (arm terminus)
    #   tip:  the far end of the handle (where the head sits)
    #   head_cells: relative cells forming the pickaxe head at the tip
    #   arm_path: list of points from shoulder to hand (we fatten to 2px wide)
    if angle_key == 0:
        # Wind-up: elbow up, hand near helmet, pickaxe head raised behind
        hand = (sx + mirror * 1, sy - 5)
        elbow = (sx + mirror * 2, sy - 2)
        tip = (sx - mirror * 2, sy - 11)
        head_cells_rel = [(-mirror, 1), (-mirror * 2, 1), (0, -1),
                          (mirror, 0), (mirror, 1)]
    elif angle_key == 1:
        # Mid-swing: arm up-forward at ~45°
        hand = (sx + mirror * 4, sy - 3)
        elbow = (sx + mirror * 2, sy - 2)
        tip = (sx + mirror * 7, sy - 7)
        head_cells_rel = [(mirror, -1), (mirror, 0), (-mirror, 1), (0, 1)]
    elif angle_key == 2:
        # Strike: arm extended forward, tool horizontal
        hand = (sx + mirror * 5, sy + 1)
        elbow = (sx + mirror * 3, sy + 0)
        tip = (sx + mirror * 8, sy + 1)
        head_cells_rel = [(mirror, 0), (mirror, 1), (mirror, -1), (0, 1)]
    else:
        # Follow-through: arm pulled down-forward
        hand = (sx + mirror * 4, sy + 4)
        elbow = (sx + mirror * 3, sy + 2)
        tip = (sx + mirror * 7, sy + 8)
        head_cells_rel = [(mirror, 1), (mirror, 0), (0, 2), (-mirror, 2)]

    # ── Tool arm (shoulder → elbow → hand), 2px wide with outline ──
    arm_path = _line_points(sx, sy, elbow[0], elbow[1]) + \
               _line_points(elbow[0], elbow[1], hand[0], hand[1])
    # Draw outline for arm
    for (x, y) in arm_path:
        for (dx, dy) in [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0),
                         (-1, 1), (0, 1), (1, 1)]:
            # Only paint outline where there is no body pixel yet
            xx, yy = x + dx, y + dy
            if 0 <= xx < FW and 0 <= yy < FH:
                if img.getpixel((xx, yy))[3] < 255:
                    put(img, xx, yy, OUTLINE)
    # Arm fill (suit color)
    for (x, y) in arm_path:
        put(img, x, y, SUIT_SHD)
    # Arm highlight on the outer edge
    for i, (x, y) in enumerate(arm_path):
        if i % 2 == 0:
            put(img, x, y - (1 if angle_key < 2 else 0), SUIT)

    # Glove at the hand position
    hx, hy = hand
    rect(img, hx - 1, hy - 1, hx + 1, hy + 1, BOOT)
    put(img, hx, hy, BOOT_HI)
    outline_rect(img, hx - 2, hy - 2, hx + 2, hy + 2, OUTLINE)

    # ── Handle: from hand to tip ──
    handle_pts = _line_points(hx, hy, tip[0], tip[1])
    for (x, y) in handle_pts:
        for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            xx, yy = x + dx, y + dy
            if 0 <= xx < FW and 0 <= yy < FH:
                if img.getpixel((xx, yy))[3] < 255:
                    put(img, xx, yy, OUTLINE)
    for (x, y) in handle_pts:
        put(img, x, y, HANDLE)
    for i, (x, y) in enumerate(handle_pts):
        if i % 2 == 0:
            put(img, x, y, HANDLE_HI)

    # ── Pickaxe head at the tip ──
    tx, ty = tip
    head_cells = {(tx + dx, ty + dy) for (dx, dy) in head_cells_rel}
    head_cells.add((tx, ty))
    # Outline
    for (x, y) in head_cells:
        for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            xx, yy = x + dx, y + dy
            if (xx, yy) not in head_cells:
                put(img, xx, yy, OUTLINE)
    # Fill
    for (x, y) in head_cells:
        put(img, x, y, METAL)
    # Shine: lighten the tip-most cell
    put(img, tx + mirror, ty, METAL_HI)
    # Darker shadow line on the underside
    put(img, tx, ty + 1, METAL_SHD)


# ─── Frame composer ─────────────────────────────────────────────────────────

def compose_frame(row, col):
    img = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))

    if row == ROW_SE:
        facing, lr = 'S', 'E'
    elif row == ROW_SW:
        facing, lr = 'S', 'W'
    elif row == ROW_NE:
        facing, lr = 'N', 'E'
    else:
        facing, lr = 'N', 'W'

    ground_shadow(img, 16, 46, rx=7, ry=2)

    if col in IDLE_RANGE:
        i = col
        bob_table  = [0, -1, 0, 0]
        sway_table = [0, 0, -1, 0]
        bob = bob_table[i]
        sway = sway_table[i]
        draw_legs(img, bob, 0, facing)
        draw_torso(img, bob, 0, facing)
        draw_arms_idle(img, bob, facing, lr, sway)
        draw_head(img, bob, facing, lr)
        return img

    if col in WALK_RANGE:
        i = col - 4  # 0..5
        # 6-frame walk cycle:
        #   0 pass (right-forward just planted), 1 contact lift (right fwd high),
        #   2 mid (right planted, left starting), 3 pass (left-forward planted),
        #   4 contact lift (left fwd high), 5 mid returning
        bob_table  = [0, -2, -1, 0, -2, -1]
        step_table = [+1, +1, +1, -1, -1, -1]
        bob = bob_table[i]
        step = step_table[i]
        draw_legs(img, bob, step, facing)
        draw_torso(img, bob, 0, facing)
        draw_arms_walk(img, bob, facing, lr, step)
        draw_head(img, bob, facing, lr)
        return img

    if col in MINE_RANGE:
        i = col - 10  # 0..3
        # Mining squats slightly on strike
        bob_table    = [-1, 0, 1, 0]
        stance_table = [0, 0, -1, 0]  # lift legs slightly for rooted stance
        bob = bob_table[i]
        stance = stance_table[i]
        draw_legs(img, bob, 0, facing, stance=stance)
        draw_torso(img, bob, 0, facing)
        # Supporting (non-tool) arm braced at body
        y0 = 18 + bob
        if lr == 'E':
            draw_arm(img, 8, 10, y0, 26 + bob)
            # Tool shoulder sits ON the right edge of the torso so the arm
            # emerges cleanly out of the body rather than floating.
            shoulder = (20, 19 + bob)
        else:
            draw_arm(img, 21, 23, y0, 26 + bob)
            shoulder = (11, 19 + bob)
        draw_head(img, bob, facing, lr)
        # Pickaxe swing (arm + tool, connected to body)
        draw_pickaxe_with_arm(img, shoulder, i, lr)
        # Impact spark on strike frame
        if i == 2:
            mirror = 1 if lr == 'E' else -1
            sx, sy = shoulder[0] + mirror * 11, shoulder[1] + 1
            put(img, sx, sy, METAL_HI)
            put(img, sx + mirror, sy + 1, AMBER_HI)
            put(img, sx + mirror, sy - 1, VISOR_HI)
            put(img, sx + mirror * 2, sy, AMBER)
            put(img, sx + mirror * 2, sy + 2, AMBER_SHD)
        return img

    return img


def build_sheet():
    sheet = Image.new('RGBA', (SHEET_W, SHEET_H), (0, 0, 0, 0))
    for row in range(ROWS):
        for col in range(COLS):
            frame = compose_frame(row, col)
            sheet.paste(frame, (col * FW, row * FH), frame)
    return sheet


if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else \
        '/home/user/VoidYieldWeb/assets/sprites/player/player_sheet.png'
    sheet = build_sheet()
    sheet.save(out)
    print(f'wrote {out} ({sheet.size[0]}x{sheet.size[1]})')
