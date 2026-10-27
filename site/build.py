"""サイトを1枚のHTMLに組み立てる。

単語データ（ターゲット1900）は公開リポジトリに置けないので、
minecraft/private/words.js から Part1〜2（No.1〜1500）だけを読み込んで埋め込み、
出力も minecraft/private/site_out/（git管理外）に書く。

  python3 site/build.py            # 単語入り（公開用）
  python3 site/build.py --no-words # 単語なし（見た目の確認用）
"""
import json
import shutil
import pathlib
import subprocess
import sys

SITE = pathlib.Path(__file__).resolve().parent
ROOT = SITE.parent
PRIVATE = ROOT / "minecraft" / "private"
OUT = PRIVATE / "site_out" / "index.html"
JS = ["core", "voxel", "chars", "yokai_extra", "home", "timer", "learn", "yokai_ui", "record", "main"]
PART12_MAX = 1500


def load_words():
    src = PRIVATE / "words.js"
    code = src.read_text(encoding="utf-8").replace("export const WORDS", "const WORDS", 1)
    code += "\nprocess.stdout.write(JSON.stringify(WORDS));"
    words = json.loads(subprocess.run(["node", "-"], input=code, capture_output=True, check=True, text=True).stdout)
    return [w for w in words if int(w[2]) <= PART12_MAX]


def load_chars():
    """minecraft/private/chars/chars.json（キャラの設定）と chars/<id>.png などの絵を読み、絵は site_out/chars/<id>.webp に縮めて書き出す"""
    from PIL import Image
    src = PRIVATE / "chars"
    out = OUT.parent / "chars"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    cfg = src / "chars.json"
    chars = json.loads(cfg.read_text(encoding="utf-8")) if cfg.exists() else []
    for c in chars:
        img = next((p for ext in ("png", "webp", "jpg", "jpeg") if (p := src / f"{c['id']}.{ext}").exists()), None)
        if img:
            im = Image.open(img).convert("RGBA")
            im.thumbnail((512, 512), Image.LANCZOS)
            im.save(out / f"{c['id']}.webp", quality=92, method=6)
            c["img"] = f"chars/{c['id']}.webp"
    return chars


def main():
    words = [] if "--no-words" in sys.argv else load_words()
    chars = load_chars()
    js = "const CHARS = " + json.dumps(chars, ensure_ascii=False) + ";\n"
    js += "const TARGET_WORDS = " + json.dumps(words, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js += "\n".join((SITE / "js" / f"{n}.js").read_text(encoding="utf-8") for n in JS)
    css = (SITE / "style.css").read_text(encoding="utf-8")
    html = (SITE / "app.html").read_text(encoding="utf-8")
    html = html.replace("/*@CSS@*/", css).replace("/*@JS@*/", js.replace("</", "<\\/"))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"{OUT}  {len(html.encode()) / 1024:.0f} KB  words={len(words)}  chars={len(chars)}  (絵あり {sum(1 for c in chars if c.get('img'))})")


if __name__ == "__main__":
    main()
