"""全画面アプリ版（GitHub Pages に置く）を組み立てる。

公開されるのは、アプリの見た目とプログラムと「鍵のかかった」データ（data.enc）だけ。
単語・古文・政経・キャラの絵は AES-GCM で暗号化する。鍵は Supabase の kouryaku_secret にだけ置く
（ログインした人しか読めない）。鍵の元は minecraft/private/pwa_key.txt（git管理外）。

  python3 site/build_pwa.py                      # minecraft/private/pwa_out/ に出力
  python3 site/build_pwa.py --migrate <dir>      # <dir>/<col>/<id>.json の記録を最初の1回だけ移す分として入れる
"""
import base64
import gzip
import json
import os
import pathlib
import secrets
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build  # noqa: E402

SITE, PRIVATE = build.SITE, build.PRIVATE
OUT = PRIVATE / "pwa_out"
SB_JS = "supabase.js"  # site/pwa/vendor から同じサイトに置く（@supabase/supabase-js 2.49.4, MIT）


def key_bytes():
    f = PRIVATE / "pwa_key.txt"
    if not f.exists():
        f.write_text(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("="))
    s = f.read_text().strip()
    return s, base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def load_migrate(d):
    """ArtifactData で書き出した <dir>/<col>/<id>.json（または <dir>/<a>/<b>/<id>.json）を "col/id": data にまとめる"""
    out = {}
    root = pathlib.Path(d)
    for p in root.rglob("*.json"):
        rel = p.relative_to(root).with_suffix("")
        parts = rel.parts
        doc = json.loads(p.read_text(encoding="utf-8"))
        data = doc.get("data", doc) if isinstance(doc, dict) else doc
        out["/".join(parts[:-1]) + "/" + parts[-1] if len(parts) > 1 else parts[0]] = data
    return out


def icons():
    font = None
    for path in ("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",):
        if os.path.exists(path):
            font = path
    src = SITE / "pwa" / "icon.png"  # だいきが選んだアイコン
    for size in (192, 512, 180):
        if src.exists():
            im = Image.open(src).convert("RGB").resize((size, size), Image.LANCZOS)
        else:
            im = Image.new("RGB", (size, size), "#3a64d8")
            d = ImageDraw.Draw(im)
            if font:
                f = ImageFont.truetype(font, int(size * 0.56))
                d.text((size / 2, size / 2), "攻", font=f, fill="white", anchor="mm")
        name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
        im.save(OUT / name)


def main():
    cfg = json.loads((SITE / "pwa" / "config.json").read_text(encoding="utf-8"))
    if not cfg.get("supabaseUrl") or not cfg.get("supabaseAnonKey"):
        print("site/pwa/config.json に Supabase の URL と anon key を入れて")
    OUT.mkdir(parents=True, exist_ok=True)
    ver = os.environ.get("KR_VER") or str(int(pathlib.Path(SITE / "js").stat().st_mtime))

    # 1) 鍵のかかったデータ
    words = build.load_words()
    chars = build.load_chars()
    for c in chars:  # 絵は data URI にして一緒に暗号化（chars/ は公開しない）
        if c.get("img"):
            p = build.OUT.parent / c["img"]
            c["img"] = "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
    dk = lambda n: json.loads((PRIVATE / "decks" / n).read_text(encoding="utf-8")) if (PRIVATE / "decks" / n).exists() else []
    bundle = {"CHARS": chars, "SEIKEI_QA": dk("seikei_qa.json"), "SEIKEI_QUIZ": dk("seikei_quiz.json"), "KOBUN": dk("kobun.json"), "TARGET_WORDS": words, "RPG_BG": build.load_rpg_bg(), "RPG_MON": build.load_pngs("rpg_mon"), "RPG_ITEM": build.load_pngs("rpg_item"), "RPG_FACE": build.load_faces(), "RPG_FOE": build.load_faces("rpg_foe"), "GAME_ART": build.load_game_art()}
    if "--migrate" in sys.argv:
        bundle["MIGRATE"] = load_migrate(sys.argv[sys.argv.index("--migrate") + 1])
    raw = gzip.compress(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode())
    kstr, kb = key_bytes()
    iv = secrets.token_bytes(12)
    (OUT / "data.enc").write_bytes(iv + AESGCM(kb).encrypt(iv, raw, None))

    # 2) 本体のプログラム（データは入れない）
    (OUT / "app.js").write_text("\n".join((SITE / "js" / f"{n}.js").read_text(encoding="utf-8") for n in build.JS), encoding="utf-8")

    # 3) 画面
    css = (SITE / "style.css").read_text(encoding="utf-8") + (SITE / "pwa" / "gate.css").read_text(encoding="utf-8")
    html = (SITE / "app.html").read_text(encoding="utf-8")
    html = html.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
    head = f"""<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f5f6f8">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="攻略">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
"""
    gate = (SITE / "pwa" / "gate.html").read_text(encoding="utf-8")
    boot = f'<script>window.KR_CONFIG = {json.dumps({**cfg, "ver": ver})};</script>\n<script src="{SB_JS}"></script>\n<script>{(SITE / "pwa" / "boot.js").read_text(encoding="utf-8")}</script>'
    html = head + html.replace("/*@CSS@*/", css).replace("<script>/*@JS@*/</script>", gate + boot) + "\n</html>\n"
    html = html.replace("<header class=\"bar\">", "</head><body>\n<header class=\"bar\">", 1) if "<body" not in html else html
    (OUT / "index.html").write_text(html, encoding="utf-8")

    (OUT / "manifest.webmanifest").write_text(json.dumps({
        "name": "攻略・受験編", "short_name": "攻略", "start_url": "./", "scope": "./", "display": "standalone",
        "background_color": "#f5f6f8", "theme_color": "#f5f6f8", "lang": "ja",
        "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "sw.js").write_text((SITE / "pwa" / "sw.js").read_text(encoding="utf-8").replace("@VER@", ver), encoding="utf-8")
    (OUT / ".nojekyll").write_text("")
    (OUT / "supabase.js").write_bytes((SITE / "pwa" / "vendor" / "supabase-2.49.4.js").read_bytes())
    icons()
    size = sum(p.stat().st_size for p in OUT.iterdir() if p.is_file())
    print(f"{OUT}  {size / 1024:.0f} KB  data.enc={(OUT / 'data.enc').stat().st_size / 1024:.0f} KB  migrate={len(bundle.get('MIGRATE', {}))}")
    print("鍵（Supabase の kouryaku_secret に入れる）:", kstr)


if __name__ == "__main__":
    main()
