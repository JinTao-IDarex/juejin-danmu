from PIL import Image
import sys

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\apple\.codex\generated_images\juejin3\ig_bancho_idle.jpg"
im = Image.open(path).convert("RGB")
W, H = im.size
print("size:", W, H)
px = im.load()

MAGENTA = (255, 0, 255)

def near_magenta(c, tol=40):
    r, g, b = c
    return abs(r - 255) <= tol and abs(g - 0) <= tol and abs(b - 255) <= tol

# 1. Check background at corners and edges
pts = [(0,0),(W-1,0),(0,H-1),(W-1,H-1),(W//2,0),(W//2,H-1),(0,H//2),(W-1,H//2)]
for p in pts:
    print("px", p, px[p[0], p[1]])

# 2. Build column occupancy mask (non-magenta)
col_occ = []
for x in range(W):
    cnt = 0
    for y in range(0, H, 2):
        if not near_magenta(px[x, y], 30):
            cnt += 1
    col_occ.append(cnt)

# Find runs of occupied columns
runs = []
in_run = False
start = 0
for x in range(W):
    if col_occ[x] > 0 and not in_run:
        in_run = True
        start = x
    elif col_occ[x] == 0 and in_run:
        in_run = False
        runs.append((start, x-1))
if in_run:
    runs.append((start, W-1))
print("occupied column runs (frames):", len(runs))
for r in runs:
    print("  run", r, "width", r[1]-r[0]+1, "peak_cols", max(col_occ[r[0]:r[1]+1]))

# 3. Count connected horizontal clusters of non-magenta (same as runs above)

# 4. Check for magenta bleed: count pixels that are near-magenta but inside pet areas.
#    Simpler: report distribution of "close to magenta but not pure" colors.
from collections import Counter
near_counter = Counter()
mag_inside = 0
for y in range(H):
    for x in range(W):
        c = px[x, y]
        if near_magenta(c, 25):
            if c != MAGENTA:
                near_counter[c] += 1
print("near-magenta (non-pure) pixel count:", sum(near_counter.values()))
print("top near-magenta colors:", near_counter.most_common(5))

# 5. Detect grid lines: within occupied region, find vertical columns that are nearly all magenta
#    between frames (gaps). Already inferred from runs.
gaps = []
for i in range(1, len(runs)):
    gaps.append((runs[i-1][1]+1, runs[i][0]-1))
print("gaps between frames:", [(g[0], g[1], g[1]-g[0]+1) for g in gaps])

# 6. Pure magenta background fraction
bg_cnt = sum(1 for y in range(0, H, 4) for x in range(0, W, 4) if px[x, y] == MAGENTA)
tot = sum(1 for y in range(0, H, 4) for x in range(0, W, 4))
print("pure-magenta sample fraction: %.3f" % (bg_cnt / tot))
