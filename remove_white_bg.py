"""
把白底图片转成透明背景 PNG（适配黑白墨水画风）。
策略：亮度 > 阈值 → 全透明；亮度 < 下限 → 全不透明；中间渐变（抗锯齿）。
"""
from PIL import Image
import os

SRC_DIR = r"D:\2workspace\codex\juejin3\werewolf-characters"
OUT_DIR = os.path.join(SRC_DIR, "transparent")
os.makedirs(OUT_DIR, exist_ok=True)

# 阈值：高于此亮度视为"接近白色" → 透明
WHITE_THRESHOLD = 225
# 低于此亮度视为"接近黑色" → 不透明
BLACK_THRESHOLD = 200

for fname in sorted(os.listdir(SRC_DIR)):
    if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    src = os.path.join(SRC_DIR, fname)
    img = Image.open(src).convert("RGBA")
    r, g, b, a = img.split()

    # 计算每个像素亮度
    from PIL import ImageOps
    gray = ImageOps.grayscale(img.convert("RGB"))

    import numpy as np
    arr = np.array(gray, dtype=np.float32)

    # alpha: <BLACK_THRESHOLD → 255; >WHITE_THRESHOLD → 0; 中间渐变
    alpha_arr = np.clip(
        (WHITE_THRESHOLD - arr) / (WHITE_THRESHOLD - BLACK_THRESHOLD) * 255,
        0, 255
    ).astype(np.uint8)

    new_alpha = Image.fromarray(alpha_arr, mode="L")
    result = img.copy()
    result.putalpha(new_alpha)

    base = os.path.splitext(fname)[0]
    out_path = os.path.join(OUT_DIR, base + ".png")
    result.save(out_path, "PNG")
    print(f"done: {out_path}")

print("all done")
