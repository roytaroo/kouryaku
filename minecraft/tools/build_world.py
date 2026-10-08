#!/usr/bin/env python3
"""ワールド（.mcworld）にアドオンを埋め込む。ダブルクリックで、パック込みのワールドとして取り込める。

使い方: python3 tools/build_world.py 入力.mcworld [出力.mcworld]
private/words.js があれば単語帳入りの単語データを使う。出力の既定は private/ の下（git管理外）。
"""
import json
import sys
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
bp, rp = root / "kouryaku_dungeon", root / "kouryaku_rp"
private_words = root / "private" / "words.js"
src = Path(sys.argv[1])
out = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "private" / (src.stem + "_攻略ダンジョン.mcworld")


def header(pack):
    h = json.loads((pack / "manifest.json").read_text(encoding="utf-8"))["header"]
    return {"pack_id": h["uuid"], "version": h["version"]}


out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    skip = ("behavior_packs/kouryaku_dungeon/", "resource_packs/kouryaku_rp/", "world_behavior_packs.json", "world_resource_packs.json")
    for info in zin.infolist():
        if info.filename.startswith(skip):
            continue
        z.writestr(info, zin.read(info.filename))
    for pack, folder in ((bp, "behavior_packs/kouryaku_dungeon"), (rp, "resource_packs/kouryaku_rp")):
        for f in sorted(pack.rglob("*")):
            if not f.is_file():
                continue
            rel = f.relative_to(pack)
            use = private_words if pack == bp and rel.as_posix() == "scripts/words.js" and private_words.exists() else f
            z.write(use, f"{folder}/{rel.as_posix()}")
    z.writestr("world_behavior_packs.json", json.dumps([header(bp)], indent=2))
    z.writestr("world_resource_packs.json", json.dumps([header(rp)], indent=2))
print(f"built {out} ({out.stat().st_size // 1024} KB)")
