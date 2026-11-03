"""公開中のサイト（1枚のHTML）から、非公開データを minecraft/private/ に戻す。

新しい会話では minecraft/private/ が無いので、ビルドの前にこれを使う。
  1. Artifact の read で index.html と chars/*.webp を保存する（site/NEXT.md 参照）
  2. python3 site/restore_private.py <保存した index.html> [<chars の .webp があるフォルダ>]

戻るもの：単語（Part1〜2だけ。公開版に入っている分）、古文、政経、キャラの設定と絵。
"""
import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRIVATE = ROOT / "minecraft" / "private"


def grab(html, name):
    key = "const " + name + " = "
    i = html.index(key) + len(key)
    val, _ = json.JSONDecoder().raw_decode(html[i:].replace("<\\/", "</"))
    return val


def main():
    html = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
    words = grab(html, "TARGET_WORDS")
    PRIVATE.mkdir(parents=True, exist_ok=True)
    (PRIVATE / "words.js").write_text("export const WORDS = " + json.dumps(words, ensure_ascii=False) + ";\n", encoding="utf-8")
    decks = PRIVATE / "decks"; decks.mkdir(exist_ok=True)
    for name, fn in (("KOBUN", "kobun.json"), ("SEIKEI_QA", "seikei_qa.json"), ("SEIKEI_QUIZ", "seikei_quiz.json")):
        (decks / fn).write_text(json.dumps(grab(html, name), ensure_ascii=False), encoding="utf-8")
    chars = grab(html, "CHARS")
    cdir = PRIVATE / "chars"; cdir.mkdir(exist_ok=True)
    for c in chars:
        c.pop("img", None)
    (cdir / "chars.json").write_text(json.dumps(chars, ensure_ascii=False, indent=1), encoding="utf-8")
    if len(sys.argv) > 2:
        for p in pathlib.Path(sys.argv[2]).glob("*.webp"):
            shutil.copy(p, cdir / p.name)
    print(f"words={len(words)} chars={len(chars)} -> {PRIVATE}")


if __name__ == "__main__":
    main()
