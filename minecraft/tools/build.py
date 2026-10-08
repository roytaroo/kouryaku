#!/usr/bin/env python3
"""ビヘイビアパックを .mcaddon（ダブルクリックでマイクラに入る形式）にまとめる。

private/words.js があればそれを単語データとして入れ、出力も git 管理外の private/ に置く。
無ければ同梱の仮の単語で dist/ に作る。
"""
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
pack = root / "kouryaku_dungeon"
private_words = root / "private" / "words.js"
use_private = private_words.exists()
out = (root / "private" if use_private else root / "dist") / "kouryaku_dungeon.mcaddon"
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(pack.rglob("*")):
        if not f.is_file():
            continue
        rel = f.relative_to(pack)
        src = private_words if use_private and rel.as_posix() == "scripts/words.js" else f
        z.write(src, Path("kouryaku_dungeon") / rel)
print(f"built {out} ({out.stat().st_size // 1024} KB){' with private words' if use_private else ''}")
