// ===== グリッドのメニュー(ICE BOW の端末やショップと同じ見た目) =====
// RP の ui/server_form.json が、タイトルに GRID_MARKER(見えない文字)が入ったフォームだけ
// 「アイコン+名前のタイルが3列に並ぶ」見た目に変える。本文(body)はタイルの上に出る。
// 使い方: gridForm("ショップ").body("コイン 100").button("ペンギン\n500コイン", "textures/items/fish_raw").show(p)
// ・タイルの1行目は白の太字、2行目以降は薄い灰色になる(§8 は背景に溶けるので §7 に置き換える)
// ・hiddenAt(i) で見えないマスを置ける(並びをそろえたい時)
import { ActionFormData } from "@minecraft/server-ui";

export const GRID_MARKER = "§g§r§i§r";
function gridLabel(text) {
  const [first, ...rest] = String(text).replace(/§8/g, "§7").split("\n");
  return ["§f§l" + first, ...rest.map(line => "§r§7" + line)].join("\n");
}
export function gridForm(title) {
  const form = new ActionFormData().title(GRID_MARKER + "§f§l" + title);
  let n = 0;
  const wrap = {
    body(text) { form.body(text); return wrap; },
    button(text, icon) { form.button(gridLabel(text), icon); n++; return wrap; },
    hiddenAt(index) { while (n <= index) { form.button("§h§d§n"); n++; } return wrap; },
    show(player) { return form.show(player); },
  };
  return wrap;
}
