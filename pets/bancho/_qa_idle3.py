from PIL import Image
import sys
import math

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\apple\.codex\generated_images\juejin3\ig_bancho_idle.jpg"
im = Image.open(path).convert("RGB")
W, H = im.size
px = im.load()

MAG = (255, 0, 255)
def dist(c):
    return math.sqrt((c[0]-255)**2 + (c[1]-0)**2 + (c[2]-255)**2)

TH = 160
# content mask
content = bytearray(W * H)
for y in range(H):
    base = y * W
    for x in range(W):
        if dist(px[x, y]) > TH:
            content[base + x] = 1

# connected components (4-connectivity) via scanline labeling
label = [-1] * (W * H)
cur = 0
for y in range(H):
    base = y * W
    for x in range(W):
        i = base + x
        if content[i] == 0:
            continue
        up = i - W if y > 0 else -1
        left = i - 1 if x > 0 else -1
        if left >= 0 and label[left] != -1:
            label[i] = label[left]
        elif up >= 0 and label[up] != -1:
            label[i] = label[up]
        else:
            cur += 1
            label[i] = cur
        # union if both
        if left >= 0 and up >= 0 and label[left] != -1 and label[up] != -1 and label[left] != label[up]:
            a, b = label[left], label[up]
            # simple relabel
            mn, mx = (a, b) if a < b else (b, a)
            for j in range(W * H):
                if label[j] == mx:
                    label[j] = mn

from collections import Counter, defaultdict
cnt = Counter(l for l in label if l != -1 and l > 0)
boxes = defaultdict(lambda: [W, H, -1, -1])
for y in range(H):
    base = y * W
    for x in range(W):
        l = label[base + x]
        if l > 0:
            b = boxes[l]
            b[0] = min(b[0], x); b[1] = min(b[1], y); b[2] = max(b[2], x); b[3] = max(b[3], y)

comp = sorted(cnt.items(), key=lambda kv: -kv[1])
print("components (label, pixelcount, bbox):")
for l, n in comp:
    if n < 20:
        continue
    b = boxes[l]
    print("  lbl=%d px=%d bbox=(%d,%d)-(%d,%d) w=%d h=%d" % (l, n, b[0], b[1], b[2], b[3], b[2]-b[0]+1, b[3]-b[1]+1))

# estimate number of distinct pets = large components whose width is reasonable
big = [(l, n) for l, n in comp if n >= 1000]
print("large components (>=1000 px):", len(big))

# magenta bleed check: count pixels in pet bbox regions that are close to magenta (dist < 90)
# i.e., magenta-ish colored pixels that are NOT background (surrounded by content)
bleed = 0
for l, n in comp:
    if n < 1000:
        continue
    b = boxes[l]
    for yy in range(b[1], b[3]+1):
        base = yy * W
        for xx in range(b[0], b[2]+1):
            if dist(px[xx, yy]) < 90:
                bleed += 1
print("magenta-ish pixels inside large pet bboxes (dist<90):", bleed)
