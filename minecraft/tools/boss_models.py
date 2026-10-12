#!/usr/bin/env python3
"""レイドボス5体のモデル（ジオメトリ・テクスチャ・アニメ・エンティティ定義）を作る。
GPTが描いたボスの絵をもとに、箱の組み合わせと手描き風の模様で再現する。
使い方: python3 tools/boss_models.py [プレビュー画像の出力先フォルダ]
"""
import json, math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RP, BP = ROOT / "kouryaku_rp", ROOT / "kouryaku_dungeon"

# ---------------- 塗り（面ごとの模様） ----------------
def hexc(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
def jitter(c, amt, rnd):
    d = rnd.randint(-amt, amt); return tuple(max(0, min(255, v + d)) for v in c[:3]) + (c[3],)

def P_noise(base, amt=14, specks=None, rate=0.0):
    """ベース色＋ゆらぎ。specks=[色...] を rate の割合で散らす"""
    def paint(img, w, h, rnd):
        b = hexc(base)
        for y in range(h):
            for x in range(w):
                c = jitter(b, amt, rnd)
                if specks and rnd.random() < rate: c = jitter(hexc(rnd.choice(specks)), 8, rnd)
                img.putpixel((x, y), c)
    return paint
def P_grid(fg, bg, cell=4, alpha_bg=False):
    """檻・格子。alpha_bg=True なら穴が透ける"""
    def paint(img, w, h, rnd):
        f, b = hexc(fg), (hexc(bg, 0) if alpha_bg else hexc(bg))
        for y in range(h):
            for x in range(w):
                edge = x % cell == 0 or y % cell == 0 or x == w - 1 or y == h - 1
                img.putpixel((x, y), jitter(f, 10, rnd) if edge else b)
    return paint
def P_stack(*layers):
    def paint(img, w, h, rnd):
        for L in layers: L(img, w, h, rnd)
    return paint
def L_rect(x0, y0, x1, y1, color, rel=True):
    """面の中の長方形（rel=True なら 0〜1 の割合で指定）"""
    def paint(img, w, h, rnd):
        a = (int(x0 * w), int(y0 * h), max(int(x0 * w) + 1, int(x1 * w)), max(int(y0 * h) + 1, int(y1 * h))) if rel else (x0, y0, x1, y1)
        c = hexc(color)
        for y in range(a[1], min(h, a[3])):
            for x in range(a[0], min(w, a[2])):
                img.putpixel((x, y), jitter(c, 6, rnd))
    return paint
def L_eyes(y, color, gap=0.18, size=0.14, hgt=0.12):
    return P_stack(L_rect(0.5 - gap - size, y, 0.5 - gap, y + hgt, color), L_rect(0.5 + gap, y, 0.5 + gap + size, y + hgt, color))
def L_cracks(color, n=6):
    def paint(img, w, h, rnd):
        c = hexc(color)
        for _ in range(n):
            x, y = rnd.randrange(w), rnd.randrange(h)
            for _ in range(rnd.randint(3, 8)):
                if 0 <= x < w and 0 <= y < h: img.putpixel((x, y), jitter(c, 20, rnd))
                x += rnd.choice((-1, 0, 1)); y += rnd.choice((0, 1))
    return paint
def L_border(color, t=1):
    def paint(img, w, h, rnd):
        c = hexc(color)
        for y in range(h):
            for x in range(w):
                if x < t or y < t or x >= w - t or y >= h - t: img.putpixel((x, y), jitter(c, 8, rnd))
    return paint

# ---------------- モデルを組む ----------------
class Model:
    def __init__(self, ident, name, atlas=256):
        self.ident, self.name, self.bones, self.faces, self.atlas = ident, name, [], [], atlas
        self.glow = False  # True なら「glow」で始まるボーンを光る素材で描く
    def bone(self, name, pivot, parent=None, rotation=None):
        b = {"name": name, "pivot": pivot, "cubes": []}
        if parent: b["parent"] = parent
        if rotation: b["rotation"] = rotation
        self.bones.append(b); return name
    def cube(self, bone, origin, size, paint, faces=None, rotation=None, pivot=None, inflate=0, density=1):
        """paint: 全面の塗り。faces: {"north": 塗り, ...} で面ごとに上書き。density: 1マス(1px)あたりのテクスチャの細かさ"""
        b = next(x for x in self.bones if x["name"] == bone)
        c = {"origin": origin, "size": size, "uv": {}}
        if rotation: c["rotation"], c["pivot"] = rotation, pivot or origin
        if inflate: c["inflate"] = inflate
        sx, sy, sz = [max(1, int(round(v * density))) for v in size]
        dims = {"north": (sx, sy), "south": (sx, sy), "east": (sz, sy), "west": (sz, sy), "up": (sx, sz), "down": (sx, sz)}
        for f, (w, h) in dims.items():
            self.faces.append((c, f, w, h, (faces or {}).get(f, paint)))
        b["cubes"].append(c)

    def build(self, seed=1):
        # 面を棚詰めでテクスチャに並べる
        rnd = random.Random(seed)
        W = self.atlas
        x = y = rowh = 0
        place = []
        for (c, f, w, h, p) in sorted(self.faces, key=lambda t: -t[3]):
            if x + w > W: x, y, rowh = 0, y + rowh, 0
            place.append((c, f, w, h, p, x, y)); x += w; rowh = max(rowh, h)
        H = 1
        while H < y + rowh: H *= 2
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for (c, f, w, h, p, px, py) in place:
            sub = Image.new("RGBA", (w, h), (0, 0, 0, 0)); p(sub, w, h, rnd); img.paste(sub, (px, py))
            c["uv"][f] = {"uv": [px, py], "uv_size": [w, h]}
        geo = {"format_version": "1.12.0", "minecraft:geometry": [{
            "description": {"identifier": "geometry." + self.ident, "texture_width": W, "texture_height": H,
                            "visible_bounds_width": 8, "visible_bounds_height": 8, "visible_bounds_offset": [0, 3, 0]},
            "bones": self.bones}]}
        return geo, img

# ---------------- 手描き風の塗り（細かいテクスチャ用） ----------------
OL = "#0b0e14"  # 輪郭線
def S_surface(base, hi=None, lo=None, ol=OL, noise=4, blots=None, blot_rate=0.0, edge_hi=1, edge_lo=1):
    """ベース色＋かすかなゆらぎ＋まだら模様、上と左に明るい縁、下と右に暗い縁、外周に輪郭線"""
    def paint(img, w, h, rnd):
        b = hexc(base)
        for y in range(h):
            for x in range(w):
                img.putpixel((x, y), jitter(b, noise, rnd))
        if blots:
            for _ in range(int(w * h * blot_rate / 4) + (1 if blot_rate else 0)):
                c = hexc(rnd.choice(blots)); bx, by = rnd.randrange(w), rnd.randrange(h)
                for dx in range(rnd.randint(1, 3)):
                    for dy in range(rnd.randint(1, 2)):
                        if bx + dx < w and by + dy < h: img.putpixel((bx + dx, by + dy), jitter(c, 4, rnd))
        if hi:
            for t in range(edge_hi):
                for x in range(w): img.putpixel((x, t), jitter(hexc(hi), 3, rnd))
                for y in range(h): img.putpixel((t, y), jitter(hexc(hi), 3, rnd))
        if lo:
            for t in range(edge_lo):
                for x in range(w): img.putpixel((x, h - 1 - t), jitter(hexc(lo), 3, rnd))
                for y in range(h): img.putpixel((w - 1 - t, y), jitter(hexc(lo), 3, rnd))
        if ol:
            d = ImageDraw.Draw(img); d.rectangle([0, 0, w - 1, h - 1], outline=hexc(ol))
    return paint
def _r(v, n): return int(round(v * n))
def L_box(x0, y0, x1, y1, color, alpha=255):
    """割合で指定した長方形を塗る（alpha=0 で穴）"""
    def paint(img, w, h, rnd):
        X0, Y0, X1, Y1 = _r(x0, w), _r(y0, h), max(_r(x0, w) + 1, _r(x1, w)) - 1, max(_r(y0, h) + 1, _r(y1, h)) - 1
        ImageDraw.Draw(img).rectangle([X0, Y0, X1, Y1], fill=hexc(color, alpha))
    return paint
def L_frame(x0, y0, x1, y1, color, t=1):
    def paint(img, w, h, rnd):
        X0, Y0, X1, Y1 = _r(x0, w), _r(y0, h), _r(x1, w) - 1, _r(y1, h) - 1
        d = ImageDraw.Draw(img)
        for k in range(t): d.rectangle([X0 + k, Y0 + k, X1 - k, Y1 - k], outline=hexc(color))
    return paint
def L_poly(pts, color, alpha=255):
    def paint(img, w, h, rnd):
        ImageDraw.Draw(img).polygon([(x * w, y * h) for x, y in pts], fill=hexc(color, alpha))
    return paint
def L_line(pts, color, width=1):
    def paint(img, w, h, rnd):
        ImageDraw.Draw(img).line([(x * (w - 1), y * (h - 1)) for x, y in pts], fill=hexc(color), width=width)
    return paint
def L_holes(x0, y0, x1, y1, cols, rows, bar, rim=None, shade=None):
    """格子の穴（透明）。bar は桟の太さ（テクスチャのピクセル）。rim: 穴の上と左に付ける影の色"""
    def paint(img, w, h, rnd):
        X0, Y0, X1, Y1 = _r(x0, w), _r(y0, h), _r(x1, w), _r(y1, h)
        cw, ch = (X1 - X0 - bar * (cols - 1)) / cols, (Y1 - Y0 - bar * (rows - 1)) / rows
        d = ImageDraw.Draw(img)
        for i in range(cols):
            for j in range(rows):
                a, b = int(X0 + i * (cw + bar)), int(Y0 + j * (ch + bar))
                c, e = int(X0 + i * (cw + bar) + cw) - 1, int(Y0 + j * (ch + bar) + ch) - 1
                if rim: d.rectangle([a - 1, b - 1, c + 1, e + 1], outline=hexc(rim))
                if shade: d.line([(a - 1, e + 1), (c + 1, e + 1)], fill=hexc(shade)); d.line([(c + 1, b - 1), (c + 1, e + 1)], fill=hexc(shade))
                d.rectangle([a, b, c, e], fill=(0, 0, 0, 0))
    return paint
def L_ragged(color_alpha0=True, depth=0.18, seed=0):
    """下の縁をぎざぎざに切る（ぼろ布）"""
    def paint(img, w, h, rnd):
        r = random.Random(seed + w * 7 + h)
        d = ImageDraw.Draw(img); x = 0
        while x < w:
            cw = r.randint(2, 4); cut = r.choice((0, 1, 2, 3)) * max(1, int(h * depth / 3))
            if cut: d.rectangle([x, h - cut, x + cw - 1, h - 1], fill=(0, 0, 0, 0))
            d.line([(x, h - cut - 1), (x + cw - 1, h - cut - 1)], fill=hexc(OL)); x += cw
    return paint
def L_pixels(pts, color):
    """割合で指定した点に1ドットずつ"""
    def paint(img, w, h, rnd):
        for x, y in pts:
            X, Y = min(w - 1, _r(x, w)), min(h - 1, _r(y, h)); img.putpixel((X, Y), hexc(color))
    return paint
def L_glow2(core, mid, edge, alpha=40, cx=(0.27, 0.73)):
    """左右2つの目の光"""
    def paint(img, w, h, rnd):
        for y in range(h):
            for x in range(w):
                t = min(max(abs(x / w - c) / 0.17, abs(y - (h - 1) / 2) / (h / 2 + 0.5)) for c in cx)
                col = hexc(core if t < 0.45 else mid if t < 0.85 else edge)
                img.putpixel((x, y), (col[0], col[1], col[2], alpha))
    return paint
def L_glow(core, mid, edge, alpha=40):
    """光る素材用：中心ほど明るい色。アルファが低いほど強く光る"""
    def paint(img, w, h, rnd):
        cx, cy = (w - 1) / 2, (h - 1) / 2
        for y in range(h):
            for x in range(w):
                t = max(abs(x - cx) / max(1, cx + 0.5), abs(y - cy) / max(1, cy + 0.5))
                c = hexc(core if t < 0.4 else mid if t < 0.8 else edge)
                img.putpixel((x, y), (c[0], c[1], c[2], alpha))
    return paint

# ---------------- 5体 ----------------
# ---------------- 絵から切り出した面を貼る ----------------
ART = Path(__file__).resolve().parent / "art_faces"
def P_img(name, flip=False, mirror_half=False, crop=None, alpha=None, white_to=None):
    """tools/art_faces/<name>.png を面に貼る。flip: 左右反転。mirror_half: 左半分を右へ写す（邪魔な物を消す）。
    crop: (x0,y0,x1,y1) 割合で一部だけ使う。alpha: 全体のアルファ（光る素材用）"""
    def paint(img, w, h, rnd):
        src = Image.open(ART / f"{name}.png").convert("RGBA")
        if crop: src = src.crop((int(crop[0] * src.width), int(crop[1] * src.height), int(crop[2] * src.width), int(crop[3] * src.height)))
        if mirror_half:
            half = src.crop((0, 0, src.width // 2, src.height))
            src.paste(half.transpose(Image.FLIP_LEFT_RIGHT), (src.width - half.width, 0))
        if flip: src = src.transpose(Image.FLIP_LEFT_RIGHT)
        t = src.resize((w, h), Image.LANCZOS)
        if alpha is not None or white_to:
            px = t.load()
            for y in range(h):
                for x in range(w):
                    r, g, b, a = px[x, y]
                    if white_to and a < 128: r, g, b, a = hexc(white_to)
                    if alpha is not None: a = alpha
                    px[x, y] = (r, g, b, a)
        else:
            px = t.load()  # アルファは0か255に（ふちのにじみを消す）
            for y in range(h):
                for x in range(w):
                    r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255 if a >= 128 else 0)
        img.paste(t, (0, 0))
    return paint

# ---------------- 第1大陸 獄王ヴォカブ（1枚目の右の看守。正面の面は絵から切り出して貼る） ----------------
def jailer():
    m = Model("kr_boss_jailer", "獄王ヴォカブ", atlas=1024)
    m.glow = True
    D, A = 2, 3  # 手描きの面の細かさ、絵を貼る面の細かさ
    NAVY, NAVY_HI, NAVY_LO = "#2a3a52", "#3c5272", "#1a2434"
    LEA, LEA_HI, LEA_LO, LEA_DK = "#6a4428", "#865a36", "#4a2e1a", "#2e1c12"
    MET, MET_HI, MET_LO, MET_DK = "#9aa2aa", "#c8ced4", "#646c74", "#2b3036"
    RUST = ["#6a3f22", "#7a4a28"]
    navy = S_surface(NAVY, NAVY_HI, NAVY_LO, blots=RUST + [NAVY_LO, NAVY_HI], blot_rate=0.04)
    navy_plain = S_surface(NAVY, NAVY_HI, NAVY_LO, blots=[NAVY_LO, NAVY_HI], blot_rate=0.05)
    leather = S_surface(LEA, LEA_HI, LEA_LO, blots=[LEA_DK, LEA_HI], blot_rate=0.2)
    metal = S_surface(MET, MET_HI, MET_LO, noise=3)
    dark = S_surface("#121418", None, None, ol=None, noise=2)

    m.bone("root", [0, 0, 0])
    m.bone("body", [0, 20, 0], "root")
    m.bone("head", [0, 45, 0], "body")
    m.bone("arm_r", [-16, 41, 0], "body")
    m.bone("arm_l", [16, 41, 0], "body")
    m.bone("leg_r", [-5, 14, 0], "root")
    m.bone("leg_l", [5, 14, 0], "root")

    # 脚：短い紺のズボン＋大きな茶色のブーツ
    boot = S_surface("#5e3822", "#7a4a2c", "#3a2214", blots=["#4a2a18", "#6a4026"], blot_rate=0.12)
    for bn, x0 in (("leg_r", -9.5), ("leg_l", 0.5)):
        m.cube(bn, [x0, 8, -4], [9, 6.5, 8], navy_plain, density=D)
        m.cube(bn, [x0 - 0.5, 0, -6.5], [10, 7.5, 11.5], P_stack(boot, L_box(0, 0.82, 1, 1, "#24150d")), faces={"up": boot}, density=D)
        m.cube(bn, [x0 - 1, 7, -5.2], [11, 3, 10], S_surface("#6e432a", "#8c5838", "#3e2516"), density=D)

    # すそ（前は絵。ランタンの棒が写っているので左半分を右へ写す）＋ベルト＋胴
    skirt_side = P_stack(navy, L_box(0.15, 0.2, 0.4, 0.6, "#4a2c18"), L_ragged(seed=3))
    m.cube("body", [-11.5, 9.5, -7.5], [23, 11, 15], skirt_side, faces={"north": P_img("jailer_skirt_n", mirror_half=True), "up": navy_plain, "down": dark}, density=A)
    m.cube("body", [-11, 20, -7], [22, 6, 14], navy_plain, density=D)
    belt_side = P_stack(S_surface("#4e2e1a", "#6e4428", "#2e1b10"), L_pixels([(x / 10, 0.5) for x in range(1, 10, 2)], "#8a6a4a"))
    m.cube("body", [-11.8, 20, -7.8], [23.6, 5.5, 15.6], belt_side, faces={"north": P_img("jailer_belt_n", mirror_half=True)}, density=A)
    m.cube("body", [-3.7, 18.6, -8.9], [7.4, 7, 1.1], metal, faces={"north": P_img("jailer_buckle")}, density=A)
    torso_side = P_stack(navy, L_box(0, 0, 0.35, 0.75, LEA), L_box(0.65, 0, 1, 0.75, LEA))
    m.cube("body", [-11, 25.5, -7], [22, 19.5, 14], torso_side, faces={"north": P_img("jailer_torso_n"), "south": P_stack(navy, L_box(0.12, 0, 0.88, 0.8, LEA), L_ragged(seed=9, depth=0.1))}, density=A)
    m.cube("body", [-5.6, 31.9, -8.2], [12.2, 10.4, 1.2], metal, faces={"north": P_img("jailer_grate")}, density=A)
    m.cube("body", [-3.2, 26.9, -8.6], [5.2, 3.6, 1.6], S_surface("#c9a466", "#e2c48a", "#8c6a3c", ol="#5a4020"), faces={"north": P_img("jailer_knot")}, density=A)

    # 頭：檻のかぶと（正面と横は絵）。中は暗い
    m.cube("head", [-7.6, 45.5, -6.6], [15.2, 10.5, 13.2], dark, density=D)
    m.cube("head", [-9, 45, -8], [18, 11.5, 16], metal, faces={"north": P_img("jailer_helm_n"), "east": P_img("jailer_helm_e"), "west": P_img("jailer_helm_e", flip=True),
                                                             "south": P_img("jailer_helm_e"), "up": metal, "down": P_stack(metal, L_holes(0.2, 0.2, 0.8, 0.8, 1, 1, 0))}, density=A)
    # 目の窓だけ光る素材で重ねる（絵の赤い目がそのまま光る）
    m.bone("glow_eyes", [0, 50, 0], "head")
    m.cube("glow_eyes", [-9 + 18 * 0.07, 56.5 - 11.5 * 0.52, -8.06], [18 * 0.42, 11.5 * 0.5, 0.05], P_img("jailer_helm_n", crop=(0.07, 0.02, 0.49, 0.52), alpha=50), density=A)
    m.cube("glow_eyes", [-9 + 18 * 0.51, 56.5 - 11.5 * 0.52, -8.06], [18 * 0.44, 11.5 * 0.5, 0.05], P_img("jailer_helm_n", crop=(0.51, 0.02, 0.95, 0.52), alpha=50), density=A)
    # 帽子：つば（手描き）＋山（絵）
    hat = S_surface("#26354e", "#3a4f70", "#141c2a", blots=["#1e2b40"], blot_rate=0.04)
    m.cube("head", [-13, 56.5, -12.5], [26, 2, 25], hat, faces={"up": P_stack(hat, L_frame(0, 0, 1, 1, "#4a6288", 1), L_frame(0, 0, 1, 1, OL))}, density=D)
    m.cube("head", [-9, 58.5, -8.5], [18, 5.5, 17], hat, faces={"north": P_img("jailer_hat_n"), "east": P_img("jailer_hat_e"), "west": P_img("jailer_hat_e", flip=True),
                                                               "south": P_img("jailer_hat_e"), "up": P_img("jailer_hat_up")}, density=A)

    # 肩当て（正面と外側は絵。左右で反転）＋腕
    pad_top = P_stack(navy, L_box(0, 0.85, 1, 1, MET), L_frame(0, 0, 1, 1, OL))
    for bn, x0, outer, inner, fl in (("arm_r", -23.5, "west", "east", True), ("arm_l", 9.5, "east", "west", False)):
        m.cube(bn, [x0, 34, -9.5], [14, 13, 19], navy, faces={"north": P_img("jailer_pad_n", flip=fl), outer: P_img("jailer_pad_e", flip=fl), "up": pad_top,
                                                             "south": P_img("jailer_pad_n", flip=not fl), "down": dark}, density=A)
        xa = x0 + 2.5
        m.cube(bn, [xa, 24, -4.5], [9, 11, 9], P_stack(navy_plain, L_box(0, 0.55, 1, 0.68, LEA)), density=D)
        m.cube(bn, [xa - 0.4, 21.5, -4.9], [9.8, 3, 9.8], S_surface(LEA, LEA_HI, LEA_LO), density=D)
        m.cube(bn, [xa - 0.2, 13.5, -4.7], [9.4, 8.5, 9.4], P_stack(S_surface("#7a828b", "#9aa2aa", "#4e555d", noise=3), L_box(0, 0.75, 1, 1, "#4e555d"), L_frame(0, 0, 1, 1, OL)), density=D)

    # 右手：トゲ付きこん棒（前下へ）
    m.bone("club", [-16.5, 16, -3], "arm_r", rotation=[30, -18, 0])
    wood = S_surface("#5a3a22", "#7a5232", "#3a2414", blots=["#4a2e1a", "#6a4428"], blot_rate=0.3)
    m.cube("club", [-18, 14.5, -14], [3, 3, 12], P_stack(wood, L_box(0, 0, 1, 1, "#3a2414")), faces={"north": wood}, density=D)
    m.cube("club", [-19.5, 13, -33], [6, 6, 19.5], wood, density=D)
    spike = S_surface("#b8bec4", "#e2e6ea", "#6a7178", ol="#2a2e33")
    for z in (-31, -26.5, -22, -17.5):
        for (x, y, off) in ((-19.6, 16, 0), (-13.4, 16, 0), (-16.5, 19.1, 2.2), (-16.5, 12.9, 2.2)):
            zz = z + off
            m.cube("club", [x - 1.2, y - 1.2, zz - 1.2], [2.4, 2.4, 2.4], spike, rotation=[0, 0, 45], pivot=[x, y, zz], density=D)
    m.cube("club", [-17.5, 15, -34.4], [2, 2, 2], spike, rotation=[0, 0, 45], pivot=[-16.5, 16, -33.4], density=D)
    m.cube("club", [-19.8, 12.7, -33.6], [6.6, 6.6, 1.2], S_surface("#4a2e1a", "#6a4428", "#2e1c10"), density=D)

    # 左手：鉄格子の盾（3列×5段）＋ランタン
    m.bone("shield", [19, 24, -12], "arm_l", rotation=[0, 22, 0])
    rivets = [(x, y) for x in (0.05, 0.95) for y in (0.03, 0.27, 0.5, 0.73, 0.97)]
    sh = P_stack(S_surface("#6e757d", MET_HI, MET_DK, noise=3), L_holes(0.14, 0.06, 0.86, 0.94, 3, 5, 4, rim=MET_DK, shade=MET_HI),
                 L_pixels(rivets, "#d8dce0"), L_frame(0, 0, 1, 1, OL), L_frame(0.005, 0.005, 0.995, 0.995, OL))
    m.cube("shield", [17, 7, -15], [20, 32, 1.8], S_surface("#6e757d", MET_HI, MET_DK), faces={"north": sh, "south": sh}, density=D)
    m.bone("lantern", [19.5, 13.5, -8], "arm_l")
    iron = S_surface("#2c2f35", "#4a4f57", "#16181c", ol=OL, noise=2)
    win = P_stack(iron, L_box(0.2, 0.12, 0.8, 0.88, "#000000", alpha=0))
    m.cube("lantern", [19.1, 6.5, -8.4], [0.8, 7, 0.8], iron, density=D)
    m.cube("lantern", [16.5, 5, -11], [6, 1.6, 6], iron, density=D)
    m.cube("lantern", [16.2, -1.5, -11.3], [6.6, 6.5, 6.6], win, faces={"up": iron, "down": iron}, density=D)
    m.cube("lantern", [16.2, -2.6, -11.3], [6.6, 1.1, 6.6], iron, density=D)
    m.bone("glow_lantern", [19.5, 2, -8], "lantern")
    lamp = P_stack(L_glow("#fff6c0", "#ffc040", "#ff8a10", alpha=20), L_box(0.47, 0, 0.53, 1, "#b05a10", alpha=20), L_box(0, 0.47, 1, 0.53, "#b05a10", alpha=20))
    m.cube("glow_lantern", [17, -1.2, -10.5], [5, 5.8, 5], lamp, density=D)
    return m

def P_cells(palette, cell=2, seed_shift=0):
    """マイクラ風のまだら：cell×cell のマスごとに palette [(色, 重み)...] から選ぶ"""
    cols = [hexc(c) for c, _ in palette]; wts = [w for _, w in palette]
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img)
        for y in range(0, h, cell):
            for x in range(0, w, cell):
                c = rnd.choices(cols, wts)[0]
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=jitter(c, 3, rnd))
    return paint
def L_drips(color, rate=0.25, maxlen=0.5, cell=2, top=0.0):
    """上から垂れる苔"""
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img)
        for x in range(0, w, cell):
            if rnd.random() < rate:
                ln = int(h * maxlen * rnd.random()) + cell
                y0 = int(top * h)
                d.rectangle([x, y0, x + cell - 1, min(h - 1, y0 + ln)], fill=jitter(hexc(color), 6, rnd))
    return paint
def L_streaks(color, n=3, cell=2):
    """縦の光の筋（流れる水）"""
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img)
        for _ in range(n):
            x = rnd.randrange(0, max(1, w - cell)); y = rnd.randrange(0, h); ln = rnd.randint(h // 4 + 1, h // 2 + 2)
            d.rectangle([x, y, x + cell - 1, min(h - 1, y + ln)], fill=hexc(color))
    return paint
def L_gem(cx, cy, r, c1, c2, c3):
    """宝石のかたまり（ひし形）"""
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img); X, Y, R = cx * w, cy * h, r * min(w, h)
        d.polygon([(X, Y - R), (X + R, Y), (X, Y + R), (X - R, Y)], fill=hexc(c1))
        d.polygon([(X, Y - R * 0.55), (X + R * 0.55, Y), (X, Y + R * 0.55), (X - R * 0.55, Y)], fill=hexc(c2))
        d.rectangle([X - R * 0.3, Y - R * 0.45, X - R * 0.05, Y - R * 0.15], fill=hexc(c3))
    return paint
def L_vine(alpha_bg=True):
    """垂れるつる（縦の細い板用）。すき間は透明"""
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, w - 1, h - 1], fill=(0, 0, 0, 0))
        x = w // 2
        for y in range(h):
            c = rnd.choice(("#2f5a1e", "#3e6e26", "#24481a"))
            d.rectangle([max(0, x - 1), y, min(w - 1, x), y], fill=hexc(c))
            if rnd.random() < 0.15: d.point((min(w - 1, x + 1), y), fill=hexc("#5a8a32"))
            if rnd.random() < 0.12: x = max(1, min(w - 1, x + rnd.choice((-1, 1))))
    return paint
def L_grass():
    """草の房（板用）。すき間は透明"""
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, w - 1, h - 1], fill=(0, 0, 0, 0))
        for x in range(0, w, 2):
            if rnd.random() < 0.6:
                top = rnd.randint(0, h // 2)
                d.rectangle([x, top, x, h - 1], fill=hexc(rnd.choice(("#5a8a30", "#6f9e3c", "#47722a", "#88b04a"))))
    return paint

# ---------------- まだら模様（なめらかなノイズを色の段に分ける。マイクラの苔ブロック風） ----------------
def _vnoise(gw, gh, scale, rnd):
    """粗い格子の乱数をなめらかにつないだノイズ（0〜1）。gw×gh マス"""
    cw, ch = gw // scale + 2, gh // scale + 2
    g = [[rnd.random() for _ in range(cw)] for _ in range(ch)]
    out = []
    for y in range(gh):
        row = []
        fy = y / scale; y0 = int(fy); ty = fy - y0; ty = ty * ty * (3 - 2 * ty)
        for x in range(gw):
            fx = x / scale; x0 = int(fx); tx = fx - x0; tx = tx * tx * (3 - 2 * tx)
            a = g[y0][x0] * (1 - tx) + g[y0][x0 + 1] * tx
            b = g[y0 + 1][x0] * (1 - tx) + g[y0 + 1][x0 + 1] * tx
            row.append(a * (1 - ty) + b * ty)
        out.append(row)
    return out
def P_patch(colors, scale=3, fine=0.22, grad=0.18, px=2, edge=True):
    """colors: 暗→明。scale: まだらの大きさ（モデルのマス）。grad: 上ほど明るく。px: 1マスのテクスチャ画素数"""
    def paint(img, w, h, rnd):
        gw, gh = max(1, w // px), max(1, h // px)
        n = _vnoise(gw, gh, scale, rnd)
        d = ImageDraw.Draw(img); k = len(colors)
        for y in range(gh):
            for x in range(gw):
                v = n[y][x] * (1 - fine) + rnd.random() * fine + grad * (0.5 - y / max(1, gh - 1))
                if edge and y == 0: v += 0.18
                if edge and y == gh - 1: v -= 0.22
                c = hexc(colors[max(0, min(k - 1, int(v * k)))])
                d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=jitter(c, 2, rnd))
    return paint
def L_mosscap(colors, depth=0.35, var=0.3, px=2):
    """面の上から苔がかぶさって、下へ不ぞろいに垂れる"""
    def paint(img, w, h, rnd):
        gw, gh = max(1, w // px), max(1, h // px)
        d = ImageDraw.Draw(img); k = len(colors)
        dep = [depth + (rnd.random() - 0.5) * var for _ in range(gw)]
        for x in range(1, gw - 1): dep[x] = (dep[x - 1] + dep[x] * 2 + dep[x + 1]) / 4
        for x in range(gw):
            if rnd.random() < 0.15: dep[x] += rnd.random() * 0.35  # 長い垂れ
            L = int(dep[x] * gh)
            for y in range(min(gh, L)):
                t = y / max(1, L)
                c = hexc(colors[max(0, min(k - 1, int((1 - t) * (k - 1) + rnd.random() * 1.2 - 0.6)))])
                d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=jitter(c, 3, rnd))
    return paint
def L_gem_px(cx, cy, cols, size=2, px=2):
    """宝石（ドット絵のひし形）。cols: 暗→明の4色。size: 半径（マス）"""
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img); gx, gy = int(cx * w / px), int(cy * h / px)
        for dy in range(-size, size + 1):
            for dx in range(-size, size + 1):
                r = abs(dx) + abs(dy)
                if r > size: continue
                c = cols[0] if r == size else cols[1] if (dx + dy) > 0 else cols[2]
                if dx == -1 + (size > 2) * 0 and dy == -1: c = cols[3]
                if (dx, dy) == (0, -size + 1) or (dx, dy) == (-1, 0): c = cols[3]
                x, y = (gx + dx) * px, (gy + dy) * px
                if 0 <= x < w and 0 <= y < h: d.rectangle([x, y, x + px - 1, y + px - 1], fill=hexc(c))
    return paint
def L_vines(cols, rate=0.45, px=2, minlen=0.3):
    """つるの束（板用）。すき間は透明"""
    def paint(img, w, h, rnd):
        d = ImageDraw.Draw(img); d.rectangle([0, 0, w - 1, h - 1], fill=(0, 0, 0, 0))
        gw, gh = max(1, w // px), max(1, h // px)
        for x in range(gw):
            if rnd.random() > rate: continue
            L = int(gh * (minlen + rnd.random() * (1 - minlen)))
            for y in range(L):
                c = hexc(rnd.choice(cols))
                d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=c)
    return paint
def L_eye(px=2):
    """カエルの目：赤茶のふち、オレンジ、黄色の芯、縦長の黒い瞳（光る素材用にアルファを下げる）"""
    def paint(img, w, h, rnd):
        gw, gh = w // px, h // px; d = ImageDraw.Draw(img)
        for y in range(gh):
            for x in range(gw):
                ex, ey = abs(x - (gw - 1) / 2) / (gw / 2), abs(y - (gh - 1) / 2) / (gh / 2)
                r = max(ex, ey)
                c = "#5a1606" if r > 0.86 else "#d4520c" if r > 0.7 else "#ff9a1c" if r > 0.45 else "#ffd23c"
                if abs(x - (gw - 1) / 2) < 0.5 and ey < 0.62: c = "#2a0a02"
                if (x, y) in ((1, 1), (2, 1), (1, 2)): c = "#fff2b0"
                col = hexc(c); d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=(col[0], col[1], col[2], 40))
    return paint

# ---------------- 第2大陸 苔の巨像レキシス（背中に滝の大ガエル） ----------------
def toad():
    m = Model("kr_boss_toad", "苔の巨像レキシス", atlas=1024)
    m.glow = True
    D = 2
    # 色はすべて絵から取った
    MOSS = ["#24281a", "#2d3d1e", "#394627", "#3e4c2a", "#4f5e34", "#66744a"]
    MOSS_TOP = ["#283616", "#384a19", "#475e34", "#546a28", "#6d823f"]
    SAGE = ["#58663f", "#6f8250", "#798d54", "#90a965", "#98b26b", "#a6bf78"]
    KHAKI = ["#5c6338", "#84825c", "#959369", "#a9a676", "#bebc86"]
    STONE = ["#3d4729", "#4d4c3f", "#5b564e", "#6e685e", "#8a897f"]
    WOOD = ["#2f2a1c", "#423b28", "#5a5037", "#6c6246", "#7c7258"]
    TWIG = ["#423d2e", "#545134", "#706150", "#797556", "#9a9580"]
    WATER = ["#2a4f9a", "#3463b8", "#4a7cd0", "#6a98e0", "#9cc0f4"]
    LIMB = ["#3a4226", "#4c5638", "#5a6a40", "#6f8250", "#7f9358"]
    EMER = ["#0c4a26", "#178a48", "#2cc070", "#b4ffd8"]
    AQUA = ["#14467a", "#2378c0", "#48c4f4", "#dcfaff"]
    VINE = ["#1e3414", "#28441a", "#335620", "#3e6a26"]

    moss, moss_top, sage, khaki, wood, twig, limb = (P_patch(x) for x in (MOSS, MOSS_TOP, SAGE, KHAKI, WOOD, TWIG, LIMB))
    sage_top = P_patch(SAGE, grad=0, edge=False)
    grass_top = P_patch(MOSS_TOP, scale=2, grad=0, edge=False)
    rock = P_stack(P_patch(STONE, scale=2, fine=0.3), L_mosscap(MOSS, 0.4, 0.5))
    water = P_stack(P_patch(WATER, scale=2, grad=0, fine=0.35, edge=False), L_streaks("#a8c8ff", 4), L_streaks("#e2eeff", 2))
    water_fall = P_stack(P_patch(WATER, scale=2, grad=-0.1, fine=0.4, edge=False), L_streaks("#a8c8ff", 6), L_streaks("#e8f2ff", 3))

    m.bone("root", [0, 0, 0])
    m.bone("body", [0, 6, 2], "root")
    m.bone("back", [0, 28, 4], "body")
    m.bone("head", [0, 19, -18], "body")
    m.bone("jaw", [0, 17, -18], "body")
    m.bone("arm_r", [-23, 16, -24], "root")
    m.bone("arm_l", [23, 16, -24], "root")
    m.bone("leg_r", [-26, 16, 12], "root")
    m.bone("leg_l", [26, 16, 12], "root")

    # 胴：暗い苔の塊（下は少しカーキ）
    body_side = P_stack(moss, L_box(0, 0.86, 1, 1, "#4a5a30"))
    m.cube("body", [-19, 6, -18], [38, 22, 40], body_side, faces={"up": grass_top, "down": P_patch(KHAKI)}, density=D)
    # 背中の岩：ずれて積まれた段。上の段は2つの岩の間に水路
    m.cube("back", [-17, 28, -13], [34, 7.5, 32], rock, faces={"up": grass_top}, density=D)
    m.cube("back", [-15, 35.5, -9], [16, 8, 23], rock, faces={"up": grass_top}, density=D)
    m.cube("back", [7, 35.5, -3], [10, 6.5, 18], rock, faces={"up": grass_top}, density=D)
    m.cube("back", [-18.5, 28, 8], [9, 4, 9], rock, faces={"up": grass_top}, density=D)
    m.cube("back", [-12, 43.5, -4], [8, 3, 8], rock, faces={"up": grass_top}, density=D)
    # 水路の水 → 後ろへ落ちる滝、前の方から右の脇へあふれる滝
    m.cube("back", [1, 35.5, -9], [6, 4, 23], water, density=D)
    m.cube("back", [0, 28.5, 14], [8, 11, 1.6], water_fall, density=D)
    m.cube("back", [0, 6, 19.4], [8, 23, 3.2], water_fall, density=D)
    m.cube("back", [7, 35.3, -13], [10.5, 0.6, 11], water, density=D)
    m.cube("back", [17, 26, -13], [2.4, 10, 11], water_fall, density=D)
    m.cube("back", [18.8, 3, -13], [1.6, 24, 11], water_fall, density=D)
    m.cube("root", [14, 0, -16], [12, 0.6, 14], water, density=D)  # 足元の水たまり
    m.cube("root", [-2, 0, 20], [10, 0.6, 8], water, density=D)
    # 草の房
    rnd = random.Random(21)
    for (x, y, z) in ((-12, 43.5, -7), (-3, 43.5, 4), (12, 42, 10), (-14, 35.5, 14), (14, 35.5, -8), (-17, 35.5, -11), (-8, 46.5, 0), (-16, 32, 12), (10, 42, -1)):
        hgt = rnd.uniform(3, 6)
        for rot in (45, -45):
            m.cube("back", [x - 2.5, y, z], [5, hgt, 0], P_stack(L_grass()), rotation=[0, rot, 0], pivot=[x, y, z], density=D)

    # 頭：体の前に大きく突き出す平たいくさび。上あご（明るいセージ）＋後ろの盛り上がった額
    m.cube("head", [-19, 20, -42], [38, 7, 28], sage, faces={"north": P_img("toad_head_n"), "east": P_img("toad_head_n", crop=(0, 0, 0.6, 1)), "west": P_img("toad_head_n", crop=(0.4, 0, 1, 1)),
                                                         "up": P_stack(sage_top, L_box(0.08, 0.1, 0.4, 0.35, "#a6bf78"), L_box(0.55, 0.15, 0.85, 0.4, "#98b26b"), L_box(0.3, 0.45, 0.7, 0.6, "#90a965"))}, density=D)
    m.cube("head", [-15, 27, -31], [30, 4, 17], P_stack(P_patch(SAGE[:4]), L_mosscap(MOSS, 0.6, 0.4)), faces={"up": P_patch(MOSS + TWIG[:2], grad=0, edge=False)}, density=D)
    # 下あご：頭とほぼ同じ幅の大きなカーキの箱。上あごが前に2マス張り出す
    jaw_tex = P_stack(khaki, L_mosscap(MOSS, 0.15, 0.4))
    MOUTH = P_patch(["#3a0e0c", "#521614", "#6a201c"], grad=0, edge=False)
    m.cube("jaw", [-18, 6, -40], [36, 14, 24], jaw_tex, faces={"north": P_img("toad_jaw_n"), "east": P_img("toad_jaw_n", crop=(0, 0, 0.6, 1)), "west": P_img("toad_jaw_n", crop=(0.4, 0, 1, 1)),
                                                             "down": khaki, "up": MOUTH}, density=3)
    m.cube("jaw", [-18.6, 17.4, -41.2], [37.2, 2.6, 25.2], P_patch(["#2e0c0a", "#4a1412", "#621c18"], grad=0, edge=False), density=D)  # 口の線
    m.cube("head", [-17, 19.6, -40], [34, 0.4, 22], MOUTH, density=D)  # 口の中（上）
    m.cube("head", [-16, 20, -18], [32, 6, 2], MOUTH, density=D)  # のどの奥
    m.bone("tongue", [0, 20.3, -24], "jaw")
    PINK = P_patch(["#a8404c", "#c2566a", "#d86e80", "#ea8c9a"], scale=2, grad=0.2)
    m.cube("tongue", [-3, 20.1, -32], [6, 1.6, 8], PINK, density=D)
    m.bone("tongue_tip", [0, 20.3, -33], "jaw")
    m.cube("tongue_tip", [-4, 19.8, -35.5], [8, 2.6, 4.5], PINK, density=D)
    # あごの下に垂れるつる
    m.cube("jaw", [-17, -1, -40.4], [34, 8, 0], P_stack(L_vines(VINE, 0.35)), density=D)
    m.cube("jaw", [-18.4, -1, -39], [0, 8, 22], P_stack(L_vines(VINE, 0.3)), density=D)
    m.cube("jaw", [18.4, -1, -39], [0, 8, 22], P_stack(L_vines(VINE, 0.3)), density=D)
    # 目：額の両はしに半分埋まった大きな目。上に暗い眉
    eye_shell = P_stack(P_patch(SAGE[:4]), L_mosscap(MOSS, 0.3, 0.4))
    for sx in (-1, 1):
        x0 = -21 if sx < 0 else 11
        m.cube("head", [x0, 25, -33], [10, 10, 10], eye_shell, density=D)
        m.cube("head", [x0 - 0.5, 34, -34], [11, 2.5, 4], P_patch(MOSS[:4], grad=0), density=D)
        g = m.bone(f"glow_eye{'r' if sx < 0 else 'l'}", [x0 + 5, 29.5, -33], "head")
        m.cube(g, [x0 + 1.5, 26.5, -33.3], [7, 7, 0.4], L_eye(), density=D)
    # 枯れ枝の冠（額の上）
    for (x, z, h, br) in ((-7, -27, 6, 1), (-4.5, -21, 10, -1), (-1.5, -26, 7, 1), (2, -20, 9, 0), (5, -26, 6, -1), (8, -21, 5, 1), (-1, -17.5, 5, 0), (3.5, -29.5, 4, 0), (-6, -30, 3, 0)):
        m.cube("head", [x - 1, 31, z - 1], [2, h, 2], twig, density=D)
        if br:
            m.cube("head", [x - 0.75 + br * 1.6, 31 + h * 0.6, z - 0.75], [1.5, 3.5, 1.5], twig, rotation=[0, 0, -br * 35], pivot=[x, 31 + h * 0.6, z], density=D)

    # 前足：長い腕（宝石入り）＋木の根のような手（3本指と親指）
    for bn, sx in (("arm_r", -1), ("arm_l", 1)):
        ax = -27 if sx < 0 else 19
        outer = "west" if sx < 0 else "east"
        up_out = P_stack(limb, L_mosscap(MOSS, 0.3, 0.4))
        m.cube(bn, [ax + sx * 1, 9, -27], [8, 13, 9], P_stack(limb, L_mosscap(MOSS, 0.3, 0.4)), faces={outer: up_out}, density=D)
        m.cube(bn, [ax, 2, -35], [8, 11, 9], P_stack(limb, L_mosscap(MOSS, 0.2, 0.3)), density=D)
        hx = ax - 3
        m.cube(bn, [hx, 0, -40], [14, 3.5, 10], P_stack(wood, L_mosscap(MOSS, 0.25, 0.4)), faces={"up": P_stack(wood, L_box(0.2, 0.3, 0.6, 0.7, "#4a6a2c"))}, density=D)
        for k in range(3):
            m.cube(bn, [hx + 0.5 + k * 4.7, 0, -49], [3.8, 3, 9.5], P_stack(wood, L_box(0, 0, 0.5, 0.25, "#4a6a2c")), density=D)
        tx = hx - 5 if sx < 0 else hx + 14
        m.cube(bn, [tx, 0, -38], [5, 2.6, 3.6], wood, density=D)

    # 後ろ足：太いもも（宝石）＋3本指の足
    for bn, sx in (("leg_r", -1), ("leg_l", 1)):
        lx = -33 if sx < 0 else 20
        outer = "west" if sx < 0 else "east"
        thigh_out = P_stack(limb, L_mosscap(MOSS, 0.25, 0.4), L_box(0, 0.8, 1, 0.92, "#2e2218"))
        thigh_front = P_stack(limb, L_mosscap(MOSS, 0.25, 0.4), L_box(0, 0.8, 1, 0.92, "#2e2218"))
        m.cube(bn, [lx, 4, 3], [13, 21, 18], limb, faces={outer: thigh_out, "north": thigh_front, "up": P_stack(limb, L_mosscap(MOSS, 0.5, 0.5))}, density=D)
        m.cube(bn, [lx - 0.5, 0, -5], [14, 4.5, 13], P_stack(limb, L_mosscap(MOSS, 0.3, 0.4)), density=D)
        for k in range(3):
            m.cube(bn, [lx + 0.2 + k * 4.7, 0, -12], [3.8, 3, 7.5], limb, density=D)
        m.cube(bn, [lx + (13 if sx > 0 else 0), 6, 4], [0, 14, 16], P_stack(L_vines(VINE, 0.25)), density=D)
    return m

def chef():
    m = Model("kr_boss_chef", "炎帝グロッサ")
    SKIN, SKIN2, APRON, NETH, LAVA, HAT, BONE = "#a8604c", "#8a4a3a", "#4a2a1e", "#3a3036", "#ff6a10", "#6a1e1e", "#e8e0c0"
    m.bone("root", [0, 0, 0])
    m.bone("body", [0, 20, 0], "root")
    m.bone("head", [0, 46, 0], "body")
    m.bone("arm_r", [-18, 42, 0], "body")
    m.bone("arm_l", [18, 42, 0], "body")
    for sx in (-1, 1):
        x0 = -11 if sx < 0 else 1
        m.cube("root", [x0, 0, -5], [10, 20, 10], P_noise(SKIN2, 12, ["#3a2a22"], 0.15))
    apron = P_stack(P_noise(SKIN, 10), L_rect(0.15, 0.0, 0.85, 1, APRON), L_cracks(LAVA, 5), L_rect(0, 0.1, 1, 0.2, "#5a5458"))
    m.cube("body", [-15, 20, -8], [30, 28, 16], P_noise(SKIN, 10), faces={"north": apron})
    m.cube("body", [6, 18, -12], [8, 7, 8], P_stack(P_noise(NETH, 8), L_rect(0.1, 0, 0.9, 0.3, LAVA)))  # 腰の鍋
    face = P_stack(P_noise(SKIN, 10), L_rect(0.2, 0.32, 0.38, 0.42, "#ffb020"), L_rect(0.62, 0.32, 0.8, 0.42, "#ffb020"))
    m.cube("head", [-10, 48, -9], [20, 18, 18], P_noise(SKIN, 10), faces={"north": face})
    m.cube("head", [-5, 51, -12], [10, 6, 3], P_stack(P_noise("#c87a64", 8), L_rect(0.2, 0.3, 0.4, 0.7, "#5a2a20"), L_rect(0.6, 0.3, 0.8, 0.7, "#5a2a20")))
    for sx in (-1, 1):
        m.cube("head", [sx * 5 - 1, 48, -12], [2, 4, 2], P_noise(BONE, 6))
    m.cube("head", [-11, 66, -10], [22, 6, 20], P_noise(HAT, 14, [NETH, LAVA], 0.2))
    m.cube("head", [-9, 72, -8], [18, 6, 16], P_noise(HAT, 14, [NETH, LAVA], 0.25))
    pad = P_stack(P_noise(NETH, 8), L_cracks(LAVA, 4))
    m.cube("arm_r", [-30, 38, -10], [15, 12, 20], pad)
    m.cube("arm_l", [15, 38, -10], [15, 12, 20], pad)
    arm = P_stack(P_noise(SKIN, 10), L_rect(0, 0.7, 1, 0.95, NETH))
    m.cube("arm_r", [-27, 14, -5], [10, 26, 10], arm)
    m.cube("arm_l", [17, 14, -5], [10, 26, 10], arm)
    # 燃える包丁（右手で振り上げる）
    blade = P_stack(P_noise("#c8401a", 18, [LAVA, "#ffd060"], 0.3), L_border("#3a2a28"))
    m.cube("arm_r", [-24, 14, -26], [3, 6, 22], P_noise("#5a3a24", 8), rotation=[30, 0, 0], pivot=[-22, 16, -2])
    m.cube("arm_r", [-25, 18, -34], [5, 18, 12], blade, rotation=[30, 0, 0], pivot=[-22, 16, -2])
    return m

def kraken():
    m = Model("kr_boss_kraken", "深淵の主ディクシオ")
    TEAL, TEAL2, PURP, MOSS, CRY = "#1e5a6a", "#163e52", "#4a2e7a", "#3e6a3a", "#7a7aff"
    m.bone("root", [0, 0, 0])
    m.bone("head", [0, 18, 0], "root")
    face = P_stack(P_noise(TEAL2, 12, [PURP, TEAL], 0.2), L_eyes(0.38, "#5ad0ff", 0.12, 0.16, 0.1), L_rect(0.35, 0.62, 0.65, 0.95, "#0a0a14"))
    m.cube("head", [-16, 14, -16], [32, 30, 32], P_noise(TEAL2, 12, [PURP, TEAL, MOSS], 0.18), faces={"north": face})
    m.cube("head", [-12, 44, -12], [24, 4, 24], P_noise("#2a2a3a", 8))
    rnd = random.Random(7)
    for k in range(9):  # 頭の結晶
        x, z, h = rnd.randint(-10, 8), rnd.randint(-10, 8), rnd.randint(5, 11)
        m.cube("head", [x, 48, z], [2, h, 2], P_noise(CRY, 18, ["#c8c8ff"], 0.25))
    for k in range(8):  # 8本の足（それぞれ3節）
        ang = k * 45 + 22.5
        name = m.bone(f"t{k}", [0, 14, 0], "root", rotation=[0, ang, 0])
        seg = P_noise(TEAL, 12, [PURP, MOSS, TEAL2], 0.2)
        for j in range(3):
            m.cube(name, [-4 + j, 4 + (0, 4, 10)[j], 14 + j * 13], [8 - 2 * j, 8 - 2 * j, 15], seg, faces={"down": P_noise(PURP, 10)})  # 先ほど高く
    return m

def lich():
    m = Model("kr_boss_lich", "言霊の魔王ロゴス")
    DARK, DARK2, PURP, RED, BONE, STONE = "#2a2230", "#1a1520", "#a040ff", "#e02020", "#e0dcd0", "#5a5660"
    m.bone("root", [0, 0, 0])
    m.bone("body", [0, 22, 0], "root")
    m.bone("head", [0, 46, 0], "body")
    m.bone("arm_r", [-18, 42, 0], "body")
    m.bone("arm_l", [18, 42, 0], "body")
    robe = P_stack(P_noise(DARK2, 10, ["#3a2e44"], 0.1), L_rect(0, 0.85, 1, 1, "#4a4450"))
    m.cube("root", [-14, 0, -8], [28, 22, 16], robe)
    chest = P_stack(P_noise(DARK, 10, [STONE], 0.08), L_cracks(RED, 6), L_rect(0.42, 0.3, 0.58, 0.6, PURP))
    m.cube("body", [-15, 22, -8], [30, 26, 16], P_stack(P_noise(DARK, 10), L_cracks(RED, 4)), faces={"north": chest})
    skull = P_stack(P_noise(BONE, 8), L_rect(0.2, 0.35, 0.4, 0.5, RED), L_rect(0.6, 0.35, 0.8, 0.5, PURP), L_rect(0.45, 0.55, 0.55, 0.65, "#202020"), L_rect(0.25, 0.75, 0.75, 0.8, "#303030"))
    m.cube("head", [-8, 48, -8], [16, 16, 16], P_noise(BONE, 8), faces={"north": skull})
    m.cube("head", [-10, 62, -10], [20, 5, 20], P_stack(P_noise("#3a2a50", 8), L_rect(0.45, 0.2, 0.55, 0.8, RED)))
    for (x, z) in ((-10, -10), (8, -10), (-10, 8), (8, 8), (-1, -10), (-1, 8)):  # 冠のとげ
        m.cube("head", [x, 67, z], [2, 5, 2], P_noise("#3a2a50", 8))
    pad = P_stack(P_noise(STONE, 10, [DARK], 0.2), L_cracks(RED, 6))
    m.cube("arm_r", [-31, 38, -10], [16, 14, 20], pad)
    m.cube("arm_l", [15, 38, -10], [16, 14, 20], pad)
    m.cube("arm_r", [-28, 14, -6], [11, 26, 12], P_noise(STONE, 10, [DARK], 0.15))
    m.cube("arm_l", [17, 16, -5], [9, 24, 10], P_noise(DARK, 10, [PURP], 0.05))
    # 大鎌（左手）：まっすぐ立てた柄の上に、外へ反った刃
    m.cube("arm_l", [26, 0, -6], [3, 62, 3], P_noise("#3a2a3a", 8, [PURP], 0.06))
    blade = P_noise("#7a1a5a", 18, [PURP, "#ff3a8a"], 0.3)
    m.cube("arm_l", [29, 55, -6], [16, 5, 3], blade)
    m.cube("arm_l", [41, 47, -6], [5, 8, 3], blade)
    m.cube("arm_l", [44, 42, -6], [3, 6, 3], blade)
    m.cube("arm_l", [25, 54, -7], [5, 7, 5], P_stack(P_noise(STONE, 8), L_rect(0.3, 0.3, 0.7, 0.7, RED)))
    return m

BOSSES = [jailer, toad, chef, kraken, lich]

# ---------------- アニメーション（ゆっくり息をする・武器を揺らす） ----------------
def animations():
    anims = {}
    def a(ident, bones):
        anims[f"animation.{ident}.idle"] = {"loop": True, "bones": bones}
    a("kr_boss_jailer", {"body": {"position": [0, "math.sin(query.anim_time*120)*0.4", 0]},
                         "arm_r": {"rotation": ["-8+math.sin(query.anim_time*90)*10", 0, 0]},
                         "arm_l": {"rotation": ["math.sin(query.anim_time*90+60)*4", 0, 0]},
                         "lantern": {"rotation": ["math.sin(query.anim_time*140)*8", 0, "math.sin(query.anim_time*110)*6"]},
                         "head": {"rotation": ["math.sin(query.anim_time*55)*3", "math.sin(query.anim_time*40)*12", 0]}})
    a("kr_boss_toad", {"body": {"scale": [1, "1+math.sin(query.anim_time*150)*0.02", 1]},
                       "jaw": {"scale": ["1+math.max(0,math.sin(query.anim_time*200))*0.05", 1, "1+math.max(0,math.sin(query.anim_time*200))*0.05"]},
                       "head": {"rotation": ["math.sin(query.anim_time*60)*1.5", 0, 0]}})
    # 跳ねる：かがむ→体が伸びて後ろ足で蹴る→着地でつぶれる（移動はスクリプトが受け持つ）
    anims["animation.kr_boss_toad.jump"] = {"animation_length": 1.0, "bones": {
        "body": {"scale": {"0.0": [1, 1, 1], "0.2": [1.08, 0.84, 1.08], "0.35": [0.94, 1.12, 0.94], "0.8": [1, 1, 1], "0.88": [1.1, 0.86, 1.1], "1.0": [1, 1, 1]}},
        "leg_r": {"rotation": {"0.0": [0, 0, 0], "0.2": [-10, 0, 0], "0.35": [55, 0, 0], "0.75": [40, 0, 0], "0.9": [0, 0, 0]}},
        "leg_l": {"rotation": {"0.0": [0, 0, 0], "0.2": [-10, 0, 0], "0.35": [55, 0, 0], "0.75": [40, 0, 0], "0.9": [0, 0, 0]}},
        "arm_r": {"rotation": {"0.0": [0, 0, 0], "0.35": [-35, 0, 0], "0.75": [-20, 0, 0], "0.9": [0, 0, 0]}},
        "arm_l": {"rotation": {"0.0": [0, 0, 0], "0.35": [-35, 0, 0], "0.75": [-20, 0, 0], "0.9": [0, 0, 0]}}}}
    # ベロ攻撃：上あごを持ち上げて口を開け、ベロを前へ伸ばして戻す
    anims["animation.kr_boss_toad.tongue"] = {"animation_length": 1.2, "bones": {
        "head": {"rotation": {"0.0": [0, 0, 0], "0.15": [-28, 0, 0], "0.85": [-28, 0, 0], "1.1": [0, 0, 0]}},
        "jaw": {"rotation": {"0.0": [0, 0, 0], "0.15": [6, 0, 0], "0.85": [6, 0, 0], "1.1": [0, 0, 0]}},
        "tongue": {"scale": {"0.0": [1, 1, 1], "0.2": [1, 1, 1], "0.38": [1, 1, 8], "0.58": [1, 1, 8], "0.78": [1, 1, 1]}},
        "tongue_tip": {"position": {"0.0": [0, 0, 0], "0.2": [0, 0, 0], "0.38": [0, 0, -56], "0.58": [0, 0, -56], "0.78": [0, 0, 0]}}}}
    a("kr_boss_chef", {"root": {"position": [0, "math.sin(query.anim_time*110)*0.6", 0]},
                       "arm_r": {"rotation": ["-20+math.sin(query.anim_time*100)*25", 0, 0]}})
    a("kr_boss_kraken", dict({"head": {"position": [0, "math.sin(query.anim_time*80)*1.2", 0]}},
                             **{f"t{k}": {"rotation": [f"math.sin(query.anim_time*90+{k*45})*12", 0, 0]} for k in range(8)}))
    a("kr_boss_lich", {"root": {"position": [0, "1+math.sin(query.anim_time*70)*1", 0]},
                       "arm_l": {"rotation": [0, 0, "math.sin(query.anim_time*60)*10"]},
                       "head": {"rotation": [0, "math.sin(query.anim_time*30)*12", 0]}})
    return {"format_version": "1.10.0", "animations": anims}

# ---------------- 出力 ----------------
def write():
    out_preview = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    for d in ("models/entity", "textures/entity/kr_bosses", "entity", "animations"):
        (RP / d).mkdir(parents=True, exist_ok=True)
    (BP / "entities").mkdir(exist_ok=True)
    for i, fn in enumerate(BOSSES):
        m = fn()
        geo, img = m.build(seed=i + 3)
        (RP / f"models/entity/{m.ident}.geo.json").write_text(json.dumps(geo, ensure_ascii=False))
        img.save(RP / f"textures/entity/kr_bosses/{m.ident}.png")
        ident = "kr:" + m.ident.replace("kr_", "")
        (RP / f"entity/{m.ident}.entity.json").write_text(json.dumps({"format_version": "1.10.0", "minecraft:client_entity": {"description": {
            "identifier": ident, "materials": dict({"default": "entity_alphatest"}, **({"glow": "entity_emissive_alpha"} if m.glow else {})),
            "textures": {"default": f"textures/entity/kr_bosses/{m.ident}"}, "geometry": {"default": f"geometry.{m.ident}"},
            "animations": dict({"idle": f"animation.{m.ident}.idle"}, **({"jump": "animation.kr_boss_toad.jump", "tongue": "animation.kr_boss_toad.tongue"} if m.ident == "kr_boss_toad" else {})),
            "scripts": {"animate": ["idle"]},
            "render_controllers": ["controller.render.kr_boss_glow" if m.glow else "controller.render.kr_pet"]}}}, ensure_ascii=False, indent=2))
        (BP / f"entities/{m.ident}.json").write_text(json.dumps({"format_version": "1.16.0", "minecraft:entity": {
            "description": {"identifier": ident, "is_spawnable": False, "is_summonable": True, "is_experimental": False},
            "components": {"minecraft:type_family": {"family": ["kr_raidboss"]},
                           "minecraft:collision_box": {"width": 2.5, "height": 3.5},
                           "minecraft:health": {"value": 1000, "max": 1000},
                           "minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": False}]},
                           "minecraft:physics": {}, "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                           "minecraft:knockback_resistance": {"value": 1}, "minecraft:persistent": {},
                           "minecraft:nameable": {"always_show": True}}}}, ensure_ascii=False, indent=2))
        if out_preview: preview(m, geo, img, out_preview / f"{m.ident}.png")
    # 「glow」で始まるボーン（目・ランタン）だけ光る素材で描く
    (RP / "render_controllers").mkdir(exist_ok=True)
    (RP / "render_controllers/kr_bosses.render_controllers.json").write_text(json.dumps({"format_version": "1.8.0", "render_controllers": {
        "controller.render.kr_boss_glow": {"geometry": "Geometry.default", "textures": ["Texture.default"],
                                           "materials": [{"*": "Material.default"}, {"glow*": "Material.glow"}]}}}, indent=2))
    (RP / "animations/kr_bosses.animation.json").write_text(json.dumps(animations(), ensure_ascii=False, indent=2))
    print("ok", len(BOSSES), "bosses")

# ---------------- 確認用のプレビュー（テクスチャ付き。正面と斜めから。回転も反映） ----------------
def _rot(p, r, piv):
    x, y, z = (p[k] - piv[k] for k in range(3))
    ax, ay, az = math.radians(-r[0]), math.radians(-r[1]), math.radians(r[2])  # マイクラ統合版はXとYが逆回り
    x, y = x * math.cos(az) - y * math.sin(az), x * math.sin(az) + y * math.cos(az)
    x, z = x * math.cos(ay) + z * math.sin(ay), -x * math.sin(ay) + z * math.cos(ay)
    y, z = y * math.cos(ax) - z * math.sin(ax), y * math.sin(ax) + z * math.cos(ax)
    return (x + piv[0], y + piv[1], z + piv[2])

def _faces(geo, img, pose=None):
    """面ごとに (テクスチャ, 左上, 右上, 左下 の3D座標) を返す。外から見てテクスチャが正しい向きになる並び。
    pose: {ボーン名: {"rotation": [...], "position": [...], "scale": [...]}} でアニメの1コマを再現"""
    bones = {b["name"]: b for b in geo["minecraft:geometry"][0]["bones"]}
    pose = pose or {}
    def chain(b):
        out = []
        while b:
            pv, ps = b["pivot"], pose.get(b["name"], {})
            if ps.get("scale"): out.append(("s", ps["scale"], pv))
            r = [a + c for a, c in zip(b.get("rotation", [0, 0, 0]), ps.get("rotation", [0, 0, 0]))]
            if any(r): out.append(("r", r, pv))
            if ps.get("position"): out.append(("t", [-ps["position"][0], ps["position"][1], ps["position"][2]], pv))
            b = bones.get(b.get("parent"))
        return out
    def apply(q, op):
        k, v, pv = op
        if k == "r": return _rot(q, v, pv)
        if k == "s": return tuple(pv[i] + (q[i] - pv[i]) * v[i] for i in range(3))
        return tuple(q[i] + v[i] for i in range(3))
    out = []
    for b in bones.values():
        for c in b["cubes"]:
            x0, y0, z0 = c["origin"]; x1, y1, z1 = x0 + c["size"][0], y0 + c["size"][1], z0 + c["size"][2]
            F = {"north": ((x0, y1, z0), (x1, y1, z0), (x0, y0, z0)), "south": ((x1, y1, z1), (x0, y1, z1), (x1, y0, z1)),
                 "east": ((x1, y1, z0), (x1, y1, z1), (x1, y0, z0)), "west": ((x0, y1, z1), (x0, y1, z0), (x0, y0, z1)),
                 "up": ((x0, y1, z1), (x1, y1, z1), (x0, y1, z0)), "down": ((x0, y0, z0), (x1, y0, z0), (x0, y0, z1))}
            tr = ([("r", c["rotation"], c["pivot"])] if c.get("rotation") else []) + chain(b)
            for f, pts in F.items():
                for op in tr: pts = tuple(apply(q, op) for q in pts)
                u, v = c["uv"][f]["uv"]; w, h = c["uv"][f]["uv_size"]
                out.append((img.crop((u, v, u + w, v + h)), pts, b["name"].startswith("glow")))
    return out

def _render(faces, yaw, pitch, S, bg=(54, 58, 66)):
    import numpy as np  # プレビューだけで使う
    cy, sy, cp, sp = math.cos(math.radians(yaw)), math.sin(math.radians(yaw)), math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    def view(q):  # 体の正面（-Z）がこちらを向く。yaw で回り込み、pitch で上から見下ろす
        x, y, z = q
        x, z = x * cy - z * sy, x * sy + z * cy
        y, z = y * cp + z * sp, -y * sp + z * cp
        return (x, y, z)
    L = np.array([-0.45, 0.75, -0.5]); L /= np.linalg.norm(L)
    items = []
    for (tex, pts, glow) in faces:
        P = np.array([view(q) for q in pts])
        n = np.cross(P[1] - P[0], P[2] - P[0]); nl = np.linalg.norm(n)
        if nl < 1e-9: continue
        n /= nl
        if n[2] > -1e-6: continue  # 裏向きの面は描かない
        lit = 1.0 if glow else 0.5 + 0.6 * max(0.0, float(n @ L))
        items.append((tex, P, lit, glow))
    allp = np.array([q for it in items for q in list(it[1]) + [it[1][1] + it[1][2] - it[1][0]]])
    mnx, mny = allp[:, 0].min(), allp[:, 1].min(); mxx, mxy = allp[:, 0].max(), allp[:, 1].max()
    W, H = int((mxx - mnx) * S) + 30, int((mxy - mny) * S) + 30
    col = np.zeros((H, W, 3)); col[:] = bg
    zb = np.full((H, W), np.inf)
    for (tex, P, lit, glow) in items:
        sc = np.stack([(P[:, 0] - mnx) * S + 15, (mxy - P[:, 1]) * S + 15], 1)
        p0, a, b = sc[0], sc[1] - sc[0], sc[2] - sc[0]
        det = a[0] * b[1] - a[1] * b[0]
        if abs(det) < 1e-9: continue
        corners = np.array([p0, p0 + a, p0 + b, p0 + a + b])
        x0, y0 = np.floor(corners.min(0)).astype(int); x1, y1 = np.ceil(corners.max(0)).astype(int)
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1 + 1), min(H, y1 + 1)
        if x1 <= x0 or y1 <= y0: continue
        X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
        dx, dy = X - p0[0], Y - p0[1]
        u = (dx * b[1] - dy * b[0]) / det; v = (dy * a[0] - dx * a[1]) / det
        inside = (u >= 0) & (u < 1) & (v >= 0) & (v < 1)
        t = np.asarray(tex.convert("RGBA"), dtype=float); th, tw = t.shape[:2]
        ui = np.clip((u * tw).astype(int), 0, tw - 1); vi = np.clip((v * th).astype(int), 0, th - 1)
        smp = t[vi, ui]
        ok = inside & ((smp[..., 3] >= 128) | glow)
        dep = P[0, 2] + (P[1, 2] - P[0, 2]) * u + (P[2, 2] - P[0, 2]) * v
        sub = zb[y0:y1, x0:x1]
        win = ok & (dep < sub)
        sub[win] = dep[win]
        col[y0:y1, x0:x1][win] = np.minimum(255, smp[..., :3][win] * lit)
    return Image.fromarray(col.astype("uint8"), "RGB").convert("RGBA")

def preview(m, geo, img, path, S=6):
    faces = _faces(geo, img)
    views = [_render(faces, 0, 0, S), _render(faces, 35, 18, S), _render(faces, -40, 12, S)]
    W = sum(v.width for v in views) + 10 * (len(views) - 1); H = max(v.height for v in views)
    can = Image.new("RGBA", (W, H), (54, 58, 66, 255)); x = 0
    for v in views: can.paste(v, (x, 0)); x += v.width + 10
    can.save(path)

if __name__ == "__main__":
    write()
