/* ===== キャラ名簿 =====
   build.py が minecraft/private/chars/chars.json と絵（chars/<id>.png など）から CHARS を作って埋め込む。
   1体の形：{ id, name, kana, rarity(1並 2珍 3幻), line(進化の系統), stage(0,1,2), voice, desc, starter(最初の相棒なら true) } */
const ROSTER_VER = "chars-1"; // 名簿を総入れ替えしたら変える（仲間・相棒を一度まっさらにする）
const YOKAI = (typeof CHARS !== "undefined" ? CHARS : []).map(c => ({ kana: "", desc: "", voice: "cool", rarity: 1, stage: 0, line: c.id, ...c }));
const YK = Object.fromEntries(YOKAI.map(y => [y.id, y]));
const RARITY = { 1: { name: "並", cls: "r1" }, 2: { name: "珍", cls: "r2" }, 3: { name: "幻", cls: "r3" } };
/** 次の進化（同じ系統の次の段階） */
const nextForm = id => { const y = YK[id]; return y ? YOKAI.find(z => z.line === y.line && z.stage === y.stage + 1) || null : null; };
const lineSize = line => YOKAI.filter(z => z.line === line).length;
const EVOLVE_EXP = { 0: 600, 1: 2400 }; // 相棒にしてからの勉強時間（分）：10時間で2段階目、40時間で3段階目
/** 最初の相棒：starter が付いた子、なければ並の1段階目の先頭 */
const starterId = () => (YOKAI.find(y => y.starter) || YOKAI.find(y => y.stage === 0 && y.rarity === 1) || YOKAI[0] || {}).id || null;
