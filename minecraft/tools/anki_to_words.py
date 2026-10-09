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


def strip_refs(m: str) -> str:
    """「（⇔ decrease ⇒ 223）」「（≒ endure ⇒ 824）」のような反意語・類義語の注記を、入れ子の括弧ごと外す。"""
    out, i = [], 0
    while i < len(m):
        if m[i] in "（(" and m[i + 1:].lstrip()[:1] in ("⇔", "≒"):
            depth, j = 0, i
            while j < len(m):
                if m[j] in "（(":
                    depth += 1
                elif m[j] in "）)":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            i = j + 1
            continue
        out.append(m[i])
        i += 1
    m = "".join(out)
    m = re.sub(r"\s*⇒\s*\d+", "", m)  # 「⇒ 223」のような番号参照
    return m.strip(" ；;、")


def is_subseq(a: str, b: str) -> bool:
    it = iter(b)
    return all(ch in it for ch in a)


def fix_cloze(word: str, cloze: str) -> str:
    """穴埋めを1か所にそろえる。デッキの誤り（同じ穴が2か所・綴りの抜け）を直す。
    例: "vis{{c1::ite}}d the s{{c1::ite}}"（site）→ 2つ目だけ穴にする
        "d{{c1::rive}}s"（derive）→ "d{{c1::erive}}s"
    不規則変化（drew / stuck など）はそのまま。"""
    ms = list(re.finditer(r"([A-Za-z]*)\{\{c1::(.*?)\}\}", cloze))
    if not ms:
        return ""
    w = word.lower()
    keep = next((m for m in ms if (m.group(1) + m.group(2)).lower().startswith(w)), ms[-1] if len(ms) > 1 else ms[0])
    out = []
    last = 0
    for m in ms:
        out.append(cloze[last:m.start()])
        pre, inner = m.group(1), m.group(2)
        if m is keep:
            full = (pre + inner).lower()
            if len(w) >= 5 and not full.startswith(w) and len(full) == len(w) - 1 and is_subseq(full, w) and w.startswith(pre.lower()):
                inner = word[len(pre):]
            out.append(f"{pre}{{{{c1::{inner}}}}}")
        else:
            out.append(pre + inner)
        last = m.end()
    out.append(cloze[last:])
    return "".join(out)


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
    ap.add_argument("--cloze", type=int, default=0, help="穴埋め例文の列（{{c1::...}} 形式。0なら無し）")
    ap.add_argument("--ex-ja", type=int, default=0, help="例文の和訳の列（0なら無し）")
    ap.add_argument("--preview", action="store_true")
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
        m = strip_refs(m)
        num = clean(r[a.num - 1]) if a.num and len(r) >= a.num else ""
        cloze = clean(r[a.cloze - 1]) if a.cloze and len(r) >= a.cloze else ""
        if cloze:
            cloze = fix_cloze(w, cloze)
        ja = clean(r[a.ex_ja - 1]) if a.ex_ja and len(r) >= a.ex_ja else ""
        if not w or not m or not re.search(r"[A-Za-z]", w) or w.lower() in seen:
            continue
        seen.add(w.lower())
        row = [w, m, num]
        if cloze:
            row += [cloze, ja]
        words.append(row if num or cloze else [w, m])

    if len(words) < 4:
        sys.exit("単語が4つ未満しか読めなかった。--preview で列番号を確認して。")
    body = ",\n".join("  " + json.dumps(x, ensure_ascii=False) for x in words)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        "// Ankiから自動生成（tools/anki_to_words.py）。手で直さず、元データを直して作り直す。\n"
        "// 形式: [英単語, 意味, 番号, 穴埋め例文(任意), 例文の和訳(任意)]\nexport const WORDS = [\n" + body + "\n];\n",
        encoding="utf-8",
    )
    print(f"{len(words)} 語を書き出した → {OUT}")
    for x in words[:5]:
        print("  " + " / ".join(x))


if __name__ == "__main__":
    main()
