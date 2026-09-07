from PIL import Image
import sys
from collections import Counter

path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\apple\.codex\generated_images\juejin3\ig_bancho_idle.jpg"
im = Image.open(path).convert("RGB")
W, H = im.size
px = im.load()

# Full color histogram (subsample)
c = Counter()
for y in range(0, H, 2):
    for x in range(0, W, 2):
        c[px[x, y]] += 1
print("total sampled:", sum(c.values()), "unique colors:", len(c))
print("top 12 colors:")
for col, n in c.most_common(12):
    print("  ", col, n, "frac=%.3f" % (n / sum(c.values())))

# Horizontal scan across middle to see background profile
y = H // 2
print("\nhscan y=%d (every 128px):" % y)
for x in range(0, W, 128):
    print("  x=%d %s" % (x, px[x, y]))

# Vertical scan
x = W // 2
print("\nvscan x=%d (every 64px):" % x)
for yy in range(0, H, 64):
    print("  y=%d %s" % (yy, px[x, yy]))

# Check rows 0..10 for uniformity (top edge)
print("\ntop-edge colors (row 1):", Counter(px[xx, 1] for xx in range(0, W, 16)).most_common(4))
print("bottom-edge colors (row H-2):", Counter(px[xx, H-2] for xx in range(0, W, 16)).most_common(4))
