#!/usr/bin/env python3
"""ビヘイビアパックを .mcaddon（ダブルクリックでマイクラに入る形式）にまとめる。"""
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
pack = root / "kouryaku_dungeon"
out = root / "dist" / "kouryaku_dungeon.mcaddon"
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(pack.rglob("*")):
        if f.is_file():
            z.write(f, Path("kouryaku_dungeon") / f.relative_to(pack))
print(f"built {out} ({out.stat().st_size // 1024} KB)")
