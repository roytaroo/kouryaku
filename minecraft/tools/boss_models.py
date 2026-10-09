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
# ---------------- 第1大陸 獄王ヴォカブ（絵の右の看守） ----------------
def jailer():
    m = Model("kr_boss_jailer", "獄王ヴォカブ", atlas=512)
    m.glow = True
    D = 2  # テクスチャの細かさ
    NAVY, NAVY_HI, NAVY_LO, NAVY_DK = "#26344c", "#3a4f70", "#18212f", "#121925"
    LEA, LEA_HI, LEA_LO, LEA_DK = "#5f3c24", "#7d5434", "#43291a", "#2e1c12"
    MET, MET_HI, MET_LO, MET_DK = "#8f979f", "#c4cad0", "#5e656d", "#2b3036"
    ROPE, ROPE_LO = "#c9a466", "#8c6a3c"
    RUST = ["#6a3f22", "#7a4a28", "#4a2c18"]
    navy = S_surface(NAVY, NAVY_HI, NAVY_LO, blots=RUST + [NAVY_LO, NAVY_HI], blot_rate=0.05)
    navy_plain = S_surface(NAVY, NAVY_HI, NAVY_LO, blots=[NAVY_LO, NAVY_HI], blot_rate=0.06)
    leather = S_surface(LEA, LEA_HI, LEA_LO, blots=[LEA_DK, LEA_HI, "#6e4a2c"], blot_rate=0.25)
    metal = S_surface(MET, MET_HI, MET_LO, noise=3, blots=[MET_LO, "#a7aeb5"], blot_rate=0.04)
    dark = S_surface("#14161b", None, None, ol=None, noise=2)

    m.bone("root", [0, 0, 0])
    m.bone("body", [0, 20, 0], "root")
    m.bone("head", [0, 45, 0], "body")
    m.bone("arm_r", [-17, 41, 0], "body")
    m.bone("arm_l", [17, 41, 0], "body")
    m.bone("leg_r", [-5.5, 19, 0], "root")
    m.bone("leg_l", [5.5, 19, 0], "root")

    # 脚：紺のズボン＋茶色のブーツ（折り返し付き）
    boot = S_surface("#5a3520", "#76482c", "#3a2214", blots=["#4a2a18", "#6a4026"], blot_rate=0.15)
    sole = P_stack(boot, L_box(0, 0.8, 1, 1, "#24150d"))
    for bn, x0 in (("leg_r", -10), ("leg_l", 1)):
        m.cube(bn, [x0, 8, -4.5], [9, 12, 9], P_stack(navy_plain, L_box(0, 0, 1, 0.12, NAVY_LO)), density=D)
        m.cube(bn, [x0 - 0.5, 0, -6], [10, 7, 11], sole, faces={"up": boot}, density=D)
        m.cube(bn, [x0 - 1, 7, -5.5], [11, 3.5, 10.5], S_surface("#6a4028", "#8a5636", "#3e2516", blots=["#5a3420"], blot_rate=0.2), density=D)

    # 胴：紺のコート、すそはぼろぼろ
    m.cube("body", [-13, 20, -7], [26, 25, 14], navy, density=D)
    skirt = P_stack(navy, L_box(0.1, 0.2, 0.3, 0.6, "#4a2c18"), L_box(0.72, 0.3, 0.86, 0.7, "#5a3620"), L_ragged(seed=3))
    m.cube("body", [-13.5, 11, -7.5], [27, 10, 15], skirt, faces={"up": navy_plain, "down": dark}, density=D)
    # 革の胸当て（下がぎざぎざ）＋縄の結び目
    plate = P_stack(leather, L_line([(0.12, 0.05), (0.5, 0.92)], ROPE_LO, 3), L_line([(0.88, 0.05), (0.5, 0.92)], ROPE_LO, 3),
                    L_line([(0.12, 0.04), (0.5, 0.9)], ROPE, 2), L_line([(0.88, 0.04), (0.5, 0.9)], ROPE, 2),
                    L_pixels([(0.06, 0.15), (0.94, 0.15), (0.06, 0.55), (0.94, 0.55)], MET_HI), L_ragged(seed=5, depth=0.12))
    m.cube("body", [-11.5, 28, -8.3], [23, 17, 1.3], plate, faces={"up": leather, "down": leather}, density=D)
    m.cube("body", [-11.5, 30, 7], [23, 15, 1.3], P_stack(leather, L_ragged(seed=9, depth=0.12)), density=D)
    for sx in (-1, 1):  # 肩ひも
        m.cube("body", [sx * 7.5 - 2, 44.5, -8.3], [4, 1, 16.6], leather, density=D)
    # 胸の鉄格子のプレート
    grate = P_stack(metal, L_holes(0.14, 0.14, 0.86, 0.86, 4, 3, 2, rim=MET_DK, shade=MET_HI), L_frame(0, 0, 1, 1, OL))
    m.cube("body", [-5.5, 33, -9.4], [11, 9, 1.1], metal, faces={"north": grate}, density=D)
    m.cube("body", [-5, 33.5, -8.9], [10, 8, 0.5], dark, density=D)  # 格子の奥
    # 縄の結び目と垂れた先
    knot = S_surface(ROPE, "#e2c48a", ROPE_LO, ol="#5a4020")
    m.cube("body", [-1.8, 28.6, -9.8], [3.6, 3, 1.6], knot, density=D)
    m.cube("body", [-2.4, 26.6, -9.6], [1.2, 2.4, 1.2], knot, density=D)
    m.cube("body", [1.2, 26.9, -9.6], [1.2, 2.1, 1.2], knot, density=D)
    # ベルトと大きなバックル
    belt = P_stack(S_surface("#4a2c1a", "#6a4228", "#2e1b10", blots=["#3a2214"], blot_rate=0.2),
                   L_pixels([(x / 14, 0.5) for x in range(1, 14, 2)], "#8a6a4a"))
    m.cube("body", [-14, 21.5, -8], [28, 4, 16], belt, density=D)
    buckle = P_stack(metal, L_box(0.3, 0.3, 0.7, 0.72, LEA_DK), L_frame(0.28, 0.28, 0.72, 0.74, MET_DK), L_frame(0, 0, 1, 1, OL))
    m.cube("body", [-3.2, 20.5, -9.2], [6.4, 6, 1.4], metal, faces={"north": buckle}, density=D)
    # 前垂れ（革、ぼろぼろ）
    m.cube("body", [-5.5, 10, -8.8], [11, 11.5, 1], P_stack(leather, L_frame(0.08, 0, 0.92, 0.9, LEA_DK), L_ragged(seed=7, depth=0.2)), density=D)
    # 腰の鎖（左右で輪になって垂れる）
    link_f = P_stack(S_surface(MET, MET_HI, MET_DK, noise=3), L_box(0.3, 0.22, 0.7, 0.78, MET, alpha=0), L_frame(0, 0, 1, 1, OL))
    link_s = P_stack(S_surface(MET_LO, MET, MET_DK, noise=3), L_box(0.32, 0.25, 0.68, 0.75, MET, alpha=0))
    for sx in (-1, 1):
        xa, xb = sx * 13, sx * 5
        n = 11
        for k in range(n):
            t = k / (n - 1)
            x = xa + (xb - xa) * t; y = 22 - 11 * 4 * t * (1 - t)
            if k % 2 == 0:
                m.cube("body", [x - 1.6, y - 2.2, -9.9], [3.2, 4.4, 0.8], link_f, faces={"east": link_s, "west": link_s}, density=D)
            else:
                m.cube("body", [x - 0.4, y - 2.2, -11.1], [0.8, 4.4, 3.2], link_s, faces={"east": link_f, "west": link_f}, density=D)

    # 頭：檻のかぶと（中は暗く、光る赤い目）
    m.cube("head", [-6.6, 45.5, -6.6], [13.2, 13.5, 13.2], dark, density=D)
    eyes_cut = P_stack(L_poly([(0.12, 0.29), (0.42, 0.41), (0.42, 0.52), (0.12, 0.52)], MET, alpha=0),
                       L_poly([(0.88, 0.29), (0.58, 0.41), (0.58, 0.52), (0.88, 0.52)], MET, alpha=0))
    helm_front = P_stack(metal, L_box(0.08, 0.27, 0.92, 0.54, MET_DK), L_frame(0.08, 0.27, 0.92, 0.54, OL), eyes_cut,
                         L_holes(0.1, 0.62, 0.9, 0.92, 4, 2, 2, rim=MET_DK, shade=MET_HI),
                         L_pixels([(0.06, 0.07), (0.94, 0.07), (0.06, 0.93), (0.94, 0.93), (0.5, 0.08)], MET_HI), L_frame(0, 0, 1, 1, OL))
    helm_side = P_stack(metal, L_holes(0.12, 0.12, 0.88, 0.9, 3, 3, 2, rim=MET_DK, shade=MET_HI), L_frame(0, 0, 1, 1, OL))
    m.cube("head", [-8, 45, -8], [16, 15, 16], helm_side, faces={"north": helm_front, "up": metal, "down": P_stack(metal, L_holes(0.2, 0.2, 0.8, 0.8, 1, 1, 0))}, density=D)
    m.bone("glow_eyes", [0, 50, 0], "head")
    m.cube("glow_eyes", [-6.5, 52, -7.8], [13, 3.4, 0.6], L_glow2("#fff0c8", "#ff4a1a", "#c01008", alpha=30), density=D)
    # 帽子：つば＋山＋帯＋正面の留め金
    hat = S_surface("#223049", "#34476a", "#141c2a", blots=["#1a2538", "#2c3d5a"], blot_rate=0.05)
    m.cube("head", [-12.5, 60, -12.5], [25, 1.6, 25], hat, density=D)
    m.cube("head", [-8.5, 61.6, -8.5], [17, 8, 17], hat, density=D)
    m.cube("head", [-8.8, 61.6, -8.8], [17.6, 2.2, 17.6], S_surface("#141b28", "#222e44", "#0c111a"), density=D)
    badge = P_stack(S_surface("#a8afb6", "#d6dade", "#5e656d"), L_box(0.3, 0.3, 0.7, 0.7, LEA), L_frame(0, 0, 1, 1, OL))
    m.cube("head", [-2.2, 63.3, -9.3], [4.4, 4.4, 0.8], badge, density=D)

    # 肩当て：紺の大きな箱に鉄のふち、外側に紋章
    def glyph(mirror):
        pts = [(0.25, 0.2), (0.75, 0.2), (0.75, 0.45), (0.45, 0.45), (0.45, 0.7), (0.75, 0.7), (0.75, 0.82)]
        if mirror: pts = [(1 - x, y) for x, y in pts]
        return P_stack(L_line(pts, "#536680", 2), L_line([(0.25, 0.2), (0.25, 0.82), (0.55, 0.82)] if not mirror else [(0.75, 0.2), (0.75, 0.82), (0.45, 0.82)], "#536680", 2))
    for bn, x0, outer in (("arm_r", -25.5, "west"), ("arm_l", 11.5, "east")):
        pad = P_stack(navy, L_box(0, 0.78, 1, 1, MET), L_box(0, 0.78, 1, 0.82, MET_HI), L_frame(0, 0, 1, 1, OL))
        m.cube(bn, [x0, 35, -9.5], [14, 12.5, 19], pad, faces={outer: P_stack(pad, glyph(outer == "east")), "up": P_stack(navy, L_frame(0, 0, 1, 1, MET, 2), L_frame(0, 0, 1, 1, OL)), "down": dark}, density=D)
        # 腕：紺の袖、茶色の帯、鉄の小手
        xa = x0 + 2.5
        m.cube(bn, [xa, 25, -4.5], [9, 11, 9], navy_plain, density=D)
        m.cube(bn, [xa - 0.4, 22, -4.9], [9.8, 3.2, 9.8], S_surface(LEA, LEA_HI, LEA_LO), density=D)
        gaunt = P_stack(metal, L_box(0, 0.75, 1, 1, MET_LO), L_pixels([(0.25, 0.85), (0.5, 0.85), (0.75, 0.85)], MET_HI))
        m.cube(bn, [xa - 0.2, 13.5, -4.7], [9.4, 8.5, 9.4], gaunt, density=D)

    # 右手：トゲ付きこん棒（前下に向ける）
    m.bone("club", [-16.5, 16, -3], "arm_r", rotation=[-30, 18, 0])
    wood = S_surface("#5a3a22", "#7a5232", "#3a2414", blots=["#4a2e1a", "#6a4428"], blot_rate=0.3)
    m.cube("club", [-18, 14.5, -14], [3, 3, 12], P_stack(wood, L_box(0, 0, 1, 1, "#3a2414")), faces={"north": wood}, density=D)
    m.cube("club", [-19.5, 13, -33], [6, 6, 19.5], wood, density=D)
    spike = S_surface("#b8bec4", "#e2e6ea", "#6a7178", ol="#2a2e33")
    for z in (-31, -26.5, -22, -17.5):
        for (x, y, off) in ((-19.6, 16, 0), (-13.4, 16, 0), (-16.5, 19.1, 2.2), (-16.5, 12.9, 2.2)):
            zz = z + off
            m.cube("club", [x - 1.2, y - 1.2, zz - 1.2], [2.4, 2.4, 2.4], spike, rotation=[0, 0, 45], pivot=[x, y, zz], density=D)
    m.cube("club", [-17.5, 15, -34.4], [2, 2, 2], spike, rotation=[0, 0, 45], pivot=[-16.5, 16, -33.4], density=D)
    m.cube("club", [-19.8, 12.7, -33.6], [6.6, 6.6, 1.2], S_surface("#4a2e1a", "#6a4428", "#2e1c10"), density=D)  # 先の木口

    # 左手：鉄格子の盾＋ランタン
    m.bone("shield", [19, 24, -12], "arm_l", rotation=[0, -22, 0])
    rivets = [(x, y) for x in (0.05, 0.95) for y in (0.03, 0.27, 0.5, 0.73, 0.97)] + [(0.5, 0.03), (0.5, 0.97)]
    sh = P_stack(S_surface("#6e757d", MET_HI, MET_DK, noise=3), L_holes(0.13, 0.07, 0.87, 0.93, 3, 4, 3, rim=MET_DK, shade=MET_HI),
                 L_pixels(rivets, "#d8dce0"), L_frame(0, 0, 1, 1, OL))
    m.cube("shield", [17, 9, -15], [19, 29, 1.6], P_stack(S_surface("#6e757d", MET_HI, MET_DK)), faces={"north": sh, "south": sh}, density=D)
    m.bone("lantern", [19.5, 13.5, -8], "arm_l")
    iron = S_surface("#2c2f35", "#4a4f57", "#16181c", ol=OL, noise=2)
    win = P_stack(iron, L_box(0.22, 0.15, 0.78, 0.85, "#000000", alpha=0))
    m.cube("lantern", [19.1, 6.5, -8.4], [0.8, 7, 0.8], P_stack(iron), density=D)  # つるす鎖
    m.cube("lantern", [16.5, 5, -11], [6, 1.6, 6], iron, density=D)
    m.cube("lantern", [16.2, -1.5, -11.3], [6.6, 6.5, 6.6], win, faces={"up": iron, "down": iron}, density=D)
    m.cube("lantern", [16.2, -2.6, -11.3], [6.6, 1.1, 6.6], iron, density=D)
    m.bone("glow_lantern", [19.5, 2, -8], "lantern")
    m.cube("glow_lantern", [17, -1.2, -10.5], [5, 5.8, 5], L_glow("#fff6c0", "#ffc040", "#ff8a10", alpha=20), density=D)
    return m

def toad():
    m = Model("kr_boss_toad", "苔の巨像レキシス")
    MOSS, MOSS2, BELLY, ROCK, WATER, WOOD = "#4e7a2c", "#3b5e22", "#a8a878", "#7a7268", "#3a6fd0", "#5a4632"
    m.bone("root", [0, 0, 0])
    m.bone("body", [0, 8, 6], "root")
    m.bone("head", [0, 18, -14], "body")
    moss = P_noise(MOSS, 14, [MOSS2, "#6f9a3a", ROCK], 0.12)
    back = P_stack(moss, L_rect(0.45, 0, 0.58, 1, WATER))
    m.cube("body", [-21, 8, -14], [42, 24, 42], moss, faces={"up": back, "south": back, "north": P_stack(P_noise(BELLY, 10), L_rect(0, 0, 1, 0.25, MOSS))})
    for (x, z, s) in ((-14, 0, 14), (2, 10, 16), (-6, 18, 12)):  # 背中の岩と苔
        m.cube("body", [x, 32, z], [s, 8, s], P_noise(ROCK, 12, [MOSS, MOSS2], 0.35), faces={"up": P_noise(MOSS2, 14, ["#7aa040"], 0.2)})
    m.cube("body", [-2, 20, 28], [6, 20, 2], P_noise(WATER, 16, ["#8ab8ff"], 0.2))  # 背中の滝
    head_front = P_stack(P_noise(MOSS, 12, [MOSS2], 0.1), L_rect(0, 0.55, 1, 0.66, "#6a1e1e"), L_rect(0, 0.66, 1, 1, BELLY))
    m.cube("head", [-19, 12, -32], [38, 16, 18], P_noise(MOSS, 12, [MOSS2], 0.1), faces={"north": head_front})
    for sx in (-1, 1):  # 目
        x0 = -17 if sx < 0 else 9
        m.cube("head", [x0, 26, -30], [8, 8, 8], P_noise(MOSS2, 8), faces={"north": P_stack(P_noise(MOSS2, 6), L_rect(0.15, 0.15, 0.85, 0.85, "#ffb020"), L_rect(0.4, 0.3, 0.6, 0.8, "#5a1a00"))})
    for (x, h) in ((-8, 6), (-3, 8), (2, 5), (6, 7)):  # 頭の木の冠
        m.cube("head", [x, 28, -24], [2, h, 2], P_noise(WOOD, 10))
    for sx in (-1, 1):  # 前足・後ろ足
        xf = -24 if sx < 0 else 12
        m.cube("root", [xf, 0, -38], [12, 6, 14], P_noise(WOOD, 12, [MOSS2], 0.25))
        xb = -30 if sx < 0 else 16
        m.cube("root", [xb, 0, 8], [14, 18, 18], moss, faces={"north": P_stack(moss, L_rect(0.3, 0.3, 0.7, 0.6, "#2fb060"))})
    for x in (-15, -9, 9, 15):  # 垂れる苔
        m.cube("head", [x, 4, -33], [1, 10, 1], P_noise(MOSS2, 10))
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
    a("kr_boss_toad", {"body": {"scale": [1, "1+math.sin(query.anim_time*150)*0.03", 1]},
                       "head": {"rotation": ["math.sin(query.anim_time*60)*3", 0, 0]}})
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
            "animations": {"idle": f"animation.{m.ident}.idle"}, "scripts": {"animate": ["idle"]},
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
    ax, ay, az = (math.radians(v) for v in r)
    x, y = x * math.cos(az) - y * math.sin(az), x * math.sin(az) + y * math.cos(az)
    x, z = x * math.cos(ay) + z * math.sin(ay), -x * math.sin(ay) + z * math.cos(ay)
    y, z = y * math.cos(ax) - z * math.sin(ax), y * math.sin(ax) + z * math.cos(ax)
    return (x + piv[0], y + piv[1], z + piv[2])

def _faces(geo, img):
    """面ごとに (テクスチャ, 左上, 右上, 左下 の3D座標) を返す。外から見てテクスチャが正しい向きになる並び"""
    bones = {b["name"]: b for b in geo["minecraft:geometry"][0]["bones"]}
    def chain(b):
        out = []
        while b:
            if b.get("rotation"): out.append((b["rotation"], b["pivot"]))
            b = bones.get(b.get("parent"))
        return out
    out = []
    for b in bones.values():
        for c in b["cubes"]:
            x0, y0, z0 = c["origin"]; x1, y1, z1 = x0 + c["size"][0], y0 + c["size"][1], z0 + c["size"][2]
            F = {"north": ((x0, y1, z0), (x1, y1, z0), (x0, y0, z0)), "south": ((x1, y1, z1), (x0, y1, z1), (x1, y0, z1)),
                 "east": ((x1, y1, z0), (x1, y1, z1), (x1, y0, z0)), "west": ((x0, y1, z1), (x0, y1, z0), (x0, y0, z1)),
                 "up": ((x0, y1, z1), (x1, y1, z1), (x0, y1, z0)), "down": ((x0, y0, z0), (x1, y0, z0), (x0, y0, z1))}
            tr = ([(c["rotation"], c["pivot"])] if c.get("rotation") else []) + chain(b)
            for f, pts in F.items():
                for (r, pv) in tr: pts = tuple(_rot(q, r, pv) for q in pts)
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
