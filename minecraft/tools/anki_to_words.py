#!/usr/bin/env python3
"""Ankiの「ノートをプレーンテキストで書き出し」(.txt) から words.js を作る。

使い方:
  python3 anki_to_words.py deck.txt --preview              # 列の中身を確認する
  python3 anki_to_words.py deck.txt --word 1 --meaning 2   # words.js を書き出す（列番号は1始まり）
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path

# 市販の単語帳から作ったデータは公開リポジトリに載せないよう、git管理外の private/ に書き出す
OUT = Path(__file__).resolve().parent.parent / "private" / "words.js"


def clean(text: str) -> str:
    text = re.sub(r"\[sound:[^\]]*\]", "", text)
    text = re.sub(r"<br\s*/?>|<div>|</div>|<p>|</p>|<li>", "、", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).replace(" ", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"、{2,}", "、", text)
    return text.strip(" 、,")


def rows(path: Path):
    sep = "\t"
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if line.startswith("#"):
            m = re.match(r"#separator:(\w+)", line)
            if m:
                sep = {"tab": "\t", "comma": ",", "semicolon": ";", "space": " ", "pipe": "|"}.get(m.group(1), "\t")
            continue
        if line.strip():
            yield [f.strip('"') for f in line.split(sep)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("--word", type=int, default=1)
    ap.add_argument("--meaning", type=int, default=2)
    ap.add_argument("--num", type=int, default=0, help="単語番号の列（0なら無し）")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--max-meaning", type=int, default=40, help="意味がこれより長いときは最初の区切りまでに縮める")
    a = ap.parse_args()

    data = list(rows(a.src))
    if a.preview:
        for r in data[:5]:
            for k, f in enumerate(r, 1):
                print(f"  [{k}] {clean(f)[:60]}")
            print("-" * 40)
        print(f"{len(data)} 行")
        return

    seen, words = set(), []
    for r in data:
        if len(r) < max(a.word, a.meaning):
            continue
        w, m = clean(r[a.word - 1]), clean(r[a.meaning - 1])
        # 「（⇔ decrease ⇒ 223）」のような参照注記は意味から外す
        m = re.sub(r"[（(][^）)]*[⇔⇒→][^）)]*[）)]", "", m)
        m = re.sub(r"\s*[⇒→]\s*\d+", "", m).strip(" ；;、")
        num = clean(r[a.num - 1]) if a.num and len(r) >= a.num else ""
        if not w or not m or not re.search(r"[A-Za-z]", w) or w.lower() in seen:
            continue
        if len(m) > a.max_meaning:
            cut = re.split(r"[;；]|。", m)[0]
            m = cut if 0 < len(cut) <= a.max_meaning else m[: a.max_meaning - 1] + "…"
        seen.add(w.lower())
        words.append([w, m, num] if num else [w, m])

    if len(words) < 4:
        sys.exit("単語が4つ未満しか読めなかった。--preview で列番号を確認して。")
    body = ",\n".join("  " + json.dumps(x, ensure_ascii=False) for x in words)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        "// Ankiから自動生成（tools/anki_to_words.py）。手で直さず、元データを直して作り直す。\n"
        "// 形式: [英単語, 意味, 番号(任意)]\nexport const WORDS = [\n" + body + "\n];\n",
        encoding="utf-8",
    )
    print(f"{len(words)} 語を書き出した → {OUT}")
    for x in words[:5]:
        print("  " + " / ".join(x))


if __name__ == "__main__":
    main()
