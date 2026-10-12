#!/usr/bin/env python3
"""描いてもらったボスの絵から、モデルの面に貼るテクスチャを切り出す。
絵の中の面の四隅（左上・右上・右下・左下）を指定して、ゆがみを直した長方形にする。
元の絵は private/art/（公開しない）。切り出した面は tools/art_faces/ に保存して、boss_models.py が使う。
使い方: python3 tools/art_faces.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "private" / "art", Path(__file__).resolve().parent / "art_faces"

# 名前: (絵, 左上, 右上, 右下, 左下, 白い背景を透明にするか)
FACES = {
    # 獄王ヴォカブ（1枚目の右の看守）
    "jailer_helm_n": ("1.jpg", (1377, 257), (1588, 258), (1588, 393), (1383, 380), False),
    "jailer_helm_e": ("1.jpg", (1588, 258), (1657, 245), (1657, 350), (1588, 393), False),
    "jailer_hat_n": ("1.jpg", (1362, 142), (1585, 154), (1585, 220), (1365, 207), False),
    "jailer_hat_e": ("1.jpg", (1585, 154), (1657, 107), (1657, 170), (1585, 220), False),
    "jailer_hat_up": ("1.jpg", (1452, 97), (1655, 105), (1585, 154), (1362, 142), False),
    "jailer_torso_n": ("1.jpg", (1340, 393), (1615, 397), (1615, 660), (1340, 655), False),
    "jailer_grate": ("1.jpg", (1410, 430), (1557, 440), (1563, 573), (1417, 563), False),
    "jailer_knot": ("1.jpg", (1428, 588), (1502, 590), (1502, 642), (1428, 640), False),
    "jailer_belt_n": ("1.jpg", (1335, 655), (1640, 662), (1640, 735), (1335, 728), False),
    "jailer_buckle": ("1.jpg", (1437, 660), (1530, 665), (1530, 757), (1437, 752), False),
    "jailer_skirt_n": ("1.jpg", (1335, 728), (1640, 735), (1640, 890), (1335, 885), True),
    "jailer_pad_n": ("1.jpg", (1612, 382), (1755, 362), (1805, 497), (1665, 535), False),
    "jailer_pad_e": ("1.jpg", (1755, 362), (1825, 285), (1880, 440), (1805, 497), False),
    "jailer_pad_up": ("1.jpg", (1715, 297), (1825, 285), (1755, 362), (1612, 382), False),
    # 苔の巨像レキシス（2枚目のカエル。左下が正面）
    "toad_head_n": ("2.jpg", (410, 612), (765, 790), (765, 843), (410, 665), False),
    "toad_jaw_n": ("2.jpg", (412, 700), (745, 865), (745, 1000), (412, 835), True),
    "toad_body_e": ("2.jpg", (965, 520), (1140, 430), (1140, 800), (965, 890), False),
    "toad_head_top": ("2.jpg", (420, 590), (560, 530), (900, 690), (765, 760), False),
}

def extract(name, size=None, scale=4):
    src, tl, tr, br, bl, white = FACES[name]
    im = Image.open(SRC / src).convert("RGBA")
    w = int(max(abs(tr[0] - tl[0]), abs(br[0] - bl[0])) or 64); h = int(max(abs(bl[1] - tl[1]), abs(br[1] - tr[1])) or 64)
    big = im.transform((w * scale // 2, h * scale // 2), Image.QUAD, data=(*tl, *bl, *br, *tr), resample=Image.BICUBIC)
    if white:
        px = big.load()
        for y in range(big.height):
            for x in range(big.width):
                r, g, b, a = px[x, y]
                if r > 215 and g > 215 and b > 215: px[x, y] = (r, g, b, 0)
    return big

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for n in FACES:
        extract(n).save(OUT / f"{n}.png")
    print("ok", len(FACES), "faces")
