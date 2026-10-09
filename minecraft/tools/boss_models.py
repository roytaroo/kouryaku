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
    def __init__(self, ident, name):
        self.ident, self.name, self.bones, self.faces = ident, name, [], []
    def bone(self, name, pivot, parent=None, rotation=None):
        b = {"name": name, "pivot": pivot, "cubes": []}
        if parent: b["parent"] = parent
        if rotation: b["rotation"] = rotation
        self.bones.append(b); return name
    def cube(self, bone, origin, size, paint, faces=None, rotation=None, pivot=None, inflate=0):
        """paint: 全面の塗り。faces: {"north": 塗り, ...} で面ごとに上書き"""
        b = next(x for x in self.bones if x["name"] == bone)
        c = {"origin": origin, "size": size, "uv": {}}
        if rotation: c["rotation"], c["pivot"] = rotation, pivot or origin
        if inflate: c["inflate"] = inflate
        sx, sy, sz = [max(1, int(round(v))) for v in size]
        dims = {"north": (sx, sy), "south": (sx, sy), "east": (sz, sy), "west": (sz, sy), "up": (sx, sz), "down": (sx, sz)}
        for f, (w, h) in dims.items():
            self.faces.append((c, f, w, h, (faces or {}).get(f, paint)))
        b["cubes"].append(c)

    def build(self, seed=1):
        # 面を棚詰めでテクスチャに並べる
        rnd = random.Random(seed)
        W = 256
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

# ---------------- 5体 ----------------
def jailer():
    m = Model("kr_boss_jailer", "獄王ヴォカブ")
    NAVY, NAVY2, BROWN, LEATHER, GREY, DARK = "#27364a", "#1d2a3a", "#4a3020", "#6b4a2e", "#8c9096", "#141414"
    m.bone("root", [0, 0, 0])
    m.bone("body", [0, 18, 0], "root")
    m.bone("head", [0, 40, 0], "body")
    m.bone("arm_r", [-16, 36, 0], "body")
    m.bone("arm_l", [16, 36, 0], "body")
    for sx in (-1, 1):  # 脚とブーツ
        x0 = -10 if sx < 0 else 1
        m.cube("root", [x0, 0, -4], [9, 18, 9], P_noise(NAVY, 10), faces={"north": P_stack(P_noise(NAVY, 10), L_rect(0, 0.65, 1, 1, BROWN)), "south": P_stack(P_noise(NAVY, 10), L_rect(0, 0.65, 1, 1, BROWN)),
                                                                   "east": P_stack(P_noise(NAVY, 10), L_rect(0, 0.65, 1, 1, BROWN)), "west": P_stack(P_noise(NAVY, 10), L_rect(0, 0.65, 1, 1, BROWN))})
    torso_front = P_stack(P_noise(NAVY, 10), L_rect(0.05, 0.0, 0.95, 0.55, LEATHER), L_rect(0.3, 0.12, 0.7, 0.45, GREY), L_rect(0.35, 0.18, 0.4, 0.4, DARK), L_rect(0.47, 0.18, 0.53, 0.4, DARK), L_rect(0.6, 0.18, 0.65, 0.4, DARK),
                          L_rect(0, 0.78, 1, 0.9, BROWN), L_rect(0.42, 0.76, 0.58, 0.92, GREY), L_rect(0.2, 0.9, 0.8, 1, LEATHER))
    m.cube("body", [-13, 18, -7], [26, 24, 14], P_noise(NAVY, 10, ["#3a4d63"], 0.05), faces={"north": torso_front, "south": P_stack(P_noise(NAVY, 10), L_rect(0, 0.78, 1, 0.9, BROWN))})
    for sx in (-1, 1):  # 腰の鎖
        m.cube("body", [sx * 9 - 1, 10, -8], [2, 10, 1], P_noise(GREY, 18, [DARK], 0.25))
    shoulder = P_stack(P_noise(NAVY2, 8, [LEATHER], 0.08), L_border("#9aa0a8"))
    m.cube("arm_r", [-26, 32, -8], [13, 11, 16], shoulder)
    m.cube("arm_l", [13, 32, -8], [13, 11, 16], shoulder)
    arm = P_stack(P_noise(NAVY, 10), L_rect(0, 0.45, 1, 0.55, BROWN), L_rect(0, 0.82, 1, 1, "#9a9ea4"))
    m.cube("arm_r", [-23, 12, -4], [8, 22, 8], arm)
    m.cube("arm_l", [15, 12, -4], [8, 22, 8], arm)
    # 頭：檻のかぶと＋赤い目、帽子
    helm_front = P_stack(P_grid("#9aa0a6", DARK, 4), L_eyes(0.42, "#ff2a1a", 0.12, 0.2, 0.14))
    m.cube("head", [-8, 42, -8], [16, 15, 16], P_grid("#9aa0a6", DARK, 4), faces={"north": helm_front})
    m.cube("head", [-14, 57, -14], [28, 2, 28], P_noise(NAVY2, 8))
    m.cube("head", [-9, 59, -9], [18, 8, 18], P_noise(NAVY, 8), faces={"north": P_stack(P_noise(NAVY, 8), L_rect(0.4, 0.3, 0.6, 0.8, "#b8bcc2"), L_rect(0.45, 0.45, 0.55, 0.65, "#5a4030"))})
    # こん棒（右手）と檻の盾（左手）、ランタン
    m.cube("arm_r", [-21, 0, -16], [4, 22, 4], P_noise(LEATHER, 10, ["#b0b0b0"], 0.12), rotation=[-35, 0, 0], pivot=[-19, 14, -2])
    m.cube("arm_l", [24, 6, -12], [2, 26, 22], P_grid("#8a8e94", DARK, 5, alpha_bg=True))
    m.cube("arm_l", [16, 2, -10], [5, 6, 5], P_stack(P_noise("#3a3a3a", 6), L_rect(0.2, 0.2, 0.8, 0.8, "#ffb030")))
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
    a("kr_boss_jailer", {"root": {"position": [0, "math.sin(query.anim_time*120)*0.6", 0]},
                         "arm_r": {"rotation": ["math.sin(query.anim_time*90)*12", 0, 0]},
                         "head": {"rotation": [0, "math.sin(query.anim_time*40)*10", 0]}})
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
            "identifier": ident, "materials": {"default": "entity_alphatest"},
            "textures": {"default": f"textures/entity/kr_bosses/{m.ident}"}, "geometry": {"default": f"geometry.{m.ident}"},
            "animations": {"idle": f"animation.{m.ident}.idle"}, "scripts": {"animate": ["idle"]},
            "render_controllers": ["controller.render.kr_pet"]}}}, ensure_ascii=False, indent=2))
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
    (RP / "animations/kr_bosses.animation.json").write_text(json.dumps(animations(), ensure_ascii=False, indent=2))
    print("ok", len(BOSSES), "bosses")

# ---------------- 確認用のプレビュー（正面図と斜め図。ボーン・キューブの回転も反映、面は平均色） ----------------
def _rot(p, r, piv):
    x, y, z = (p[k] - piv[k] for k in range(3))
    ax, ay, az = (math.radians(v) for v in r)
    x, y = x * math.cos(az) - y * math.sin(az), x * math.sin(az) + y * math.cos(az)
    x, z = x * math.cos(ay) + z * math.sin(ay), -x * math.sin(ay) + z * math.cos(ay)
    y, z = y * math.cos(ax) - z * math.sin(ax), y * math.sin(ax) + z * math.cos(ax)
    return (x + piv[0], y + piv[1], z + piv[2])

def preview(m, geo, img, path):
    bones = {b["name"]: b for b in geo["minecraft:geometry"][0]["bones"]}
    def chain(b):
        out = []
        while b:
            if b.get("rotation"): out.append((b["rotation"], b["pivot"]))
            b = bones.get(b.get("parent"))
        return out
    quads = []
    for b in bones.values():
        for c in b["cubes"]:
            x0, y0, z0 = c["origin"]; x1, y1, z1 = x0 + c["size"][0], y0 + c["size"][1], z0 + c["size"][2]
            F = {"north": [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], "south": [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
                 "east": [(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)], "west": [(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)],
                 "up": [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], "down": [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)]}
            tr = ([(c["rotation"], c["pivot"])] if c.get("rotation") else []) + chain(b)
            for f, pts in F.items():
                for (r, pv) in tr: pts = [_rot(q, r, pv) for q in pts]
                u, v = c["uv"][f]["uv"]; w, h = c["uv"][f]["uv_size"]
                col = img.crop((u, v, u + w, v + h)).convert("RGBA").resize((1, 1), Image.BILINEAR).getpixel((0, 0))
                if col[3] >= 40: quads.append((f, pts, col))
    S = 5
    allp = [q for (_, pts, _) in quads for q in pts]
    def view(proj, depth, shade):
        P = [proj(q) for q in allp]; mnx, mxx = min(p[0] for p in P), max(p[0] for p in P); mny, mxy = min(p[1] for p in P), max(p[1] for p in P)
        W, H = int((mxx - mnx) * S) + 20, int((mxy - mny) * S) + 20
        im = Image.new("RGBA", (W, H), (240, 240, 240, 255)); d = ImageDraw.Draw(im)
        for (f, pts, col) in sorted(quads, key=lambda t: -sum(depth(q) for q in t[1]) / 4):
            k = shade.get(f, 0.6); cc = tuple(min(255, int(v * k)) for v in col[:3]) + (255,)
            d.polygon([((proj(q)[0] - mnx) * S + 10, (mxy - proj(q)[1]) * S + 10) for q in pts], fill=cc, outline=(0, 0, 0, 60))
        return im
    # 正面：-Z 側から見る（＋Xが画面の右）。斜め：右前上から
    a = view(lambda q: (q[0], q[1]), lambda q: q[2], {"north": 1.0, "east": 0.8, "west": 0.8, "up": 1.1, "down": 0.5, "south": 0.6})
    def iso(q): return (q[0] * 0.8 + q[2] * 0.6, q[1] * 0.9 - q[2] * 0.3 - q[0] * 0.15)
    b = view(iso, lambda q: q[2] * 0.6 - q[0] * 0.8 - q[1] * 0.3, {"north": 1.0, "east": 0.75, "west": 0.75, "up": 1.15, "down": 0.5, "south": 0.6})
    can = Image.new("RGBA", (a.width + b.width + 10, max(a.height, b.height)), (240, 240, 240, 255))
    can.paste(a, (0, 0)); can.paste(b, (a.width + 10, 0)); can.save(path)

if __name__ == "__main__":
    write()
