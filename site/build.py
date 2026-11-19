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
JS = ["core", "voxel", "chars", "yokai_extra", "home", "timer", "grammar_q", "learn", "yokai_ui", "pass", "record", "fit", "rpg_story", "rpg", "game_data", "game", "main"]
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


def load_rpg_bg():
    """英語RPGの背景（だいきが選んだ画像。minecraft/private/rpg_bg/<名前>.webp）を data URI にする"""
    import base64
    d = PRIVATE / "rpg_bg"
    return {p.stem: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted(d.glob("*.webp"))} if d.exists() else {}


def load_faces(name="rpg_face"):
    """英語RPGのキャラの顔（rpg_face/<キャラ>_<表情>.webp）や物語専用の敵（rpg_foe/<名前>.webp）"""
    import base64
    d = PRIVATE / name
    return {p.stem: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted(d.glob("*.webp"))} if d.exists() else {}


def load_game_art():
    """王道RPGの絵（ぴぽやさんの素材。minecraft/private/pipoya）"""
    import base64
    d = PRIVATE / "pipoya"
    if not d.exists():
        return {}
    uri = lambda p: "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
    return {"tiles": uri(d / "mapchip" / "MapChip" / "base.png"),
            "walk": {p.stem: uri(p) for p in sorted((d / "walk").glob("*.png")) if p.stem != "mio_raw"},
            "etc": {"chest": uri(d / "etc" / "pipo-etcchara001.png"), "torch": uri(d / "etc" / "pipo-etcchara003.png")}}


def load_pngs(name):
    """minecraft/private/<name>/*.png（モンスター・アイテムの素材。再配布NGなので公開しない）を {番号: data URI} にする"""
    import base64, re
    d = PRIVATE / name
    if not d.exists():
        return {}
    return {re.findall(r"\d+", p.stem)[-1]: "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted(d.glob("*.png"))}


def main():
    words = [] if "--no-words" in sys.argv else load_words()
    chars = load_chars()
    js = "const CHARS = " + json.dumps(chars, ensure_ascii=False) + ";\n"
    ko = PRIVATE / "decks" / "kobun.json"
    kobun = json.loads(ko.read_text(encoding="utf-8")) if ko.exists() and "--no-words" not in sys.argv else []
    sq = PRIVATE / "decks" / "seikei_qa.json"; sz = PRIVATE / "decks" / "seikei_quiz.json"
    seikei_qa = json.loads(sq.read_text(encoding="utf-8")) if sq.exists() and "--no-words" not in sys.argv else []
    seikei_quiz = json.loads(sz.read_text(encoding="utf-8")) if sz.exists() and "--no-words" not in sys.argv else []
    js += "const SEIKEI_QA = " + json.dumps(seikei_qa, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js += "const SEIKEI_QUIZ = " + json.dumps(seikei_quiz, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js += "const KOBUN = " + json.dumps(kobun, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js += "const RPG_BG = " + json.dumps(load_rpg_bg()) + ";\n"
    js += "const RPG_FACE = " + json.dumps(load_faces()) + ";\nconst RPG_FOE = " + json.dumps(load_faces("rpg_foe")) + ";\n"
    js += "const GAME_ART = " + json.dumps(load_game_art()) + ";\n"
    js += "const RPG_MON = " + json.dumps(load_pngs("rpg_mon")) + ";\nconst RPG_ITEM = " + json.dumps(load_pngs("rpg_item")) + ";\n"
    js += "const TARGET_WORDS = " + json.dumps(words, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js += "\n".join((SITE / "js" / f"{n}.js").read_text(encoding="utf-8") for n in JS)
    css = (SITE / "style.css").read_text(encoding="utf-8")
    html = (SITE / "app.html").read_text(encoding="utf-8")
    html = html.replace("/*@CSS@*/", css).replace("/*@JS@*/", js.replace("</", "<\\/"))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"{OUT}  {len(html.encode()) / 1024:.0f} KB  words={len(words)}  kobun={len(kobun)}  seikei={len(seikei_qa)}+{len(seikei_quiz)}  chars={len(chars)}  (絵あり {sum(1 for c in chars if c.get('img'))})")


if __name__ == "__main__":
    main()
