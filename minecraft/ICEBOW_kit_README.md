# やり込みキット 組み込み手順（攻略ダンジョン v1.1.2 向け）

ICE BOW（`ICEBOW_yarikomi.md` に説明あり）の仕組みを、軽くして移植したもの。依存は @minecraft/server 2.0 と server-ui 2.0 だけで、今のダンジョンと同じ。

```
bp/scripts/yarikomi.js   ミッション・デイリー・バッジ・レベル・コイン・ログインボーナス・メニュー
bp/scripts/shop.js       コスメショップ(称号/名前の色/撃破エフェクト/足あと/ペット)+今日のおすすめ
bp/scripts/pets.js       装備したペットをついてこさせる
bp/scripts/ui.js         グリッドのメニュー(アイコンのタイルが3列に並ぶ。ICE BOW の端末/ショップと同じ見た目)
bp/entities/kr_pet_*.json  ペット6体(無敵・敵扱いされない)
rp/                      リソースパック丸ごと(manifest 付き)
  ui/server_form.json      グリッドのメニューの見た目(ICE BOW から移植)
  particles/ textures/particle/  足あと(肉球・くつあと・花・星・スライム)
  entity/ models/ animations/ render_controllers/ textures/entity/  ペット6体
```

## 1. ファイルを置く
- `bp/scripts/*.js` → ダンジョンBPの `scripts/`
- `bp/entities/*.json` → ダンジョンBPの `entities/`（フォルダがなければ作る）
- `rp/` → 新しいリソースパックとして追加する（mcaddon に入れるなら、BPと並べて同梱する）

## 2. BPの manifest.json に、RPへの依存を足す
```json
"dependencies": [
  { "module_name": "@minecraft/server", "version": "2.0.0" },
  { "module_name": "@minecraft/server-ui", "version": "2.0.0" },
  { "uuid": "983a6807-95d3-444b-a052-9836868acd25", "version": [1, 0, 0] }
]
```
BPのバージョンも1つ上げる。

## 3. main.js に足す
```js
import { addStat, addCoins, setBest, showYarikomiMenu } from "./yarikomi.js";
import { showShop } from "./shop.js";
import "./pets.js";

// 回答の判定のすぐ後(365行目あたり、s.stats.ok++ の近く)
if (ok) { addStat(p, "ok"); addCoins(p, 1); }
if (fast) { addStat(p, "fast"); addCoins(p, 2, "即答"); setBest(p, "combo", s.stats.combo); }
if (fast && (b ?? 0) < s.box[word]) { addStat(p, "learned"); addCoins(p, 3, "覚えた"); }   // 箱が上がった

// 部屋クリア(clearRoom の中、プレイヤーごとのループ内)
addStat(p, "clear"); addCoins(p, 10, "部屋クリア");

// ボス撃破(840行目あたり、stats.clears++ の近く)
addStat(p, "boss"); addCoins(p, 50, "ボス撃破");

// コンパスのメニュー(497行目あたり)
items.push(["やり込み", () => showYarikomiMenu(p)]);
items.push(["ショップ", () => showShop(p)]);
```
コインの量は目安。ショップの値段（50〜1500）と合わせて調整する。

## 中身
- **コイン：**
  - `addCoins(p, n, "理由")` で増やす。アクションバーに「+10コイン 部屋クリア」と出る。
  - `getCoins(p)` と `spendCoins(p, n)` もある。
  - ミッション報酬とログインボーナスでも増える。
- **ログインボーナス：** 現実の日付で判定する。連続1〜7日目で 20／20／30／30／40／40／100 コイン。1日空くと1日目に戻る。
- **ミッションとデイリー：** 進み具合のゲージを出す。50%以上は「★もうすぐ達成」で一番上、達成済みは一番下。
- **バッジ：** 名前の横に出る（最大3個）。
- **レベル：** 必要XPは `50 + Lv*15`。下がらない。
- **ショップ：**
  - カテゴリは5つ：称号、名前の色、撃破エフェクト、足あと、ペット。どの商品にもアイコンが付いてる。
  - レア度ごとに色が付く（レア／エピック／レジェンド／ミシック）。
  - 「今日のおすすめ」は日付から決まる3つで、25%引き。
  - 買ったらそのまま装備される。もう一回押すと外れる。
  - 名前の表示は `[称号] 色付きの名前 バッジ` になる。
- **足あと：** 肉球、くつあと、花、星、スライムは ICE BOW の足あと。0.8マス歩くごとに地面に左右交互に残る。桜吹雪は足元に粒が出る。
- **ペット：** テラい金魚、ペンギン、イルカ、カメ、テラいウサギ、桜ぎつね。
  - 近い時はそっと引き寄せるだけ。14マス以上はぐれたらワープ。
  - 飛ぶペットは頭の上に浮く。粒を出すペットもいる。
  - 無敵。monster ファミリーじゃないから、単語の問題も出ない。
- **グリッドのメニュー：**
  - `gridForm("タイトル")` で作ったメニューは、アイコンと名前のタイルが3列に並ぶ。ICE BOW の端末と同じ見た目。
  - やり込みメニューとショップはこれで出してる。
  - 本文（コイン数など）はタイルの上に出る。
  - 普通の `ActionFormData` は今まで通りの縦並び。タイトルに見えない目印を入れた時だけグリッドに切り替わる。
  - 注意：RP の `ui/server_form.json` はマイクラ本体のフォーム画面を上書きする。ほかのパックも server_form.json を持ってたら、後から読み込まれた方が勝つ。
- **保存：** プレイヤーごとにダイナミックプロパティ `yk:data` に入れてる。

## 増やし方
- **コスメを増やす：** `shop.js` の `SHOP` に1行足す。
  - 粒の名前は、バニラの `minecraft:〜` のどれか。
  - ペットは entities と rp に1体ぶん足す必要がある。
- **ミッション・デイリー・バッジを増やす：** `yarikomi.js` の `MISSIONS` / `DAILY` / `BADGES` に1行足す。
- **やり込みメニューにボタンを足す：** ほかのファイルから `addMenuButton(ラベル, アイコン, p => …)`。ショップのボタンはこれで足してある。

## 確認状況
- 偽のマイクラ環境で動かして、次の流れは全部動いた：買う → 装備 → 名前表示、ペットが出る／消える、撃破エフェクト、日替わり、ミッション達成。
- **実際のゲームではまだ（未確認）。**
- ペットのモデル、足あと、グリッドUIは ICE BOW で実際に使ってるものをそのまま持ってきた。
- 1つだけ足したものがある：グリッドの上に本文を出す部分。ICE BOW のグリッドは本文が出ない。ここだけ実機で見てない。
