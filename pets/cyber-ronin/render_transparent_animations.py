#!/usr/bin/env python3
"""从宠物图集渲染透明背景动画：WebP / APNG（全透明）+ GIF（兼容版）。

用法: python render_transparent_animations.py [--ffmpeg <path>]
输出: <run_dir>/animations/<state>.{webp,apng,gif}
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

CELL_WIDTH = 192
CELL_HEIGHT = 208
STATES = {
    "idle": (0, [280, 110, 110, 140, 140, 320]),
    "running-right": (1, [120, 120, 120, 120, 120, 120, 120, 220]),
    "running-left": (2, [120, 120, 120, 120, 120, 120, 120, 220]),
    "waving": (3, [140, 140, 140, 280]),
    "jumping": (4, [140, 140, 140, 140, 280]),
    "failed": (5, [140, 140, 140, 140, 140, 140, 140, 240]),
    "waiting": (6, [150, 150, 150, 150, 150, 260]),
    "running": (7, [120, 120, 120, 120, 120, 220]),
    "review": (8, [150, 150, 150, 150, 150, 280]),
}


def shell_quote_for_concat(path: Path) -> str:
    return "'" + str(path).replace("'", "'\\''") + "'"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    args = parser.parse_args()

    run_dir = Path(__file__).resolve().parent
    atlas_path = run_dir / "final" / "spritesheet.webp"
    out_dir = run_dir / "animations"
    out_dir.mkdir(parents=True, exist_ok=True)

    atlas = Image.open(atlas_path).convert("RGBA")

    for state, (row, durations) in STATES.items():
        frames = [
            atlas.crop(
                (
                    col * CELL_WIDTH,
                    row * CELL_HEIGHT,
                    (col + 1) * CELL_WIDTH,
                    (row + 1) * CELL_HEIGHT,
                )
            ).convert("RGBA")
            for col in range(len(durations))
        ]

        # --- WebP（全透明，循环播放） ---
        frames[0].save(
            out_dir / f"{state}.webp",
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
        )

        # --- APNG（全透明，循环播放） ---
        frames[0].save(
            out_dir / f"{state}.apng",
            format="PNG",
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
        )

        # --- GIF（1-bit 透明，兼容版） ---
        with tempfile.TemporaryDirectory(prefix=f"codex-pet-{state}-") as temp_raw:
            temp = Path(temp_raw)
            frame_paths: list[Path] = []
            for i, f in enumerate(frames):
                fp = temp / f"{state}-{i:02d}.png"
                f.save(fp)
                frame_paths.append(fp)
            concat_path = temp / f"{state}.ffconcat"
            lines = ["ffconcat version 1.0"]
            for fp, d in zip(frame_paths, durations, strict=True):
                lines.append(f"file {shell_quote_for_concat(fp)}")
                lines.append(f"duration {d / 1000:.3f}")
            # concat demuxer 需要末尾重复最后一行，否则最后一段时长丢失
            lines.append(f"file {shell_quote_for_concat(frame_paths[-1])}")
            concat_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

            out_gif = out_dir / f"{state}.gif"
            cmd = [
                args.ffmpeg,
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_path),
                "-vf",
                "split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=alpha_threshold=128",
                "-loop",
                "0",
                str(out_gif),
            ]
            subprocess.run(cmd, check=True)

    print(f"wrote transparent animations to {out_dir}")


if __name__ == "__main__":
    main()
