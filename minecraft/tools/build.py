#!/usr/bin/env python3
"""ビヘイビアパックを .mcaddon（ダブルクリックでマイクラに入る形式）にまとめる。

- dist/kouryaku_dungeon.mcaddon    : 同梱の仮の単語（公開してよい版）
- private/kouryaku_dungeon.mcaddon : private/words.js がある時だけ。単語帳データ入り（git管理外）
"""
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
pack = root / "kouryaku_dungeon"
rp = root / "kouryaku_rp"
private_words = root / "private" / "words.js"


def build(out: Path, words: Path | None):
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(pack.rglob("*")):
            if not f.is_file():
                continue
            rel = f.relative_to(pack)
            src = words if words and rel.as_posix() == "scripts/words.js" else f
            z.write(src, Path("kouryaku_dungeon") / rel)
        for f in sorted(rp.rglob("*")):
            if f.is_file():
                z.write(f, Path("kouryaku_rp") / f.relative_to(rp))
    print(f"built {out} ({out.stat().st_size // 1024} KB)")


build(root / "dist" / "kouryaku_dungeon.mcaddon", None)
if private_words.exists():
    build(root / "private" / "kouryaku_dungeon.mcaddon", private_words)
