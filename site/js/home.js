/* ===== ホーム ===== */
function nextExams() { const now = Date.now(); return parseExams(S.settings.exams).filter(e => e.at > now); }
function renderCountdown() {
  const ex = nextExams(), n = ex[0];
  if (!n) { $("cdName").textContent = "次の試験日が未設定"; $("cdD").textContent = "--"; $("cdHms").textContent = "--:--:--"; return; }
  let ms = n.at - Date.now(); const D = Math.floor(ms / 864e5); ms -= D * 864e5;
  const H = Math.floor(ms / 36e5); ms -= H * 36e5; const M = Math.floor(ms / 6e4); ms -= M * 6e4;
  $("cdName").textContent = n.label; $("cdD").textContent = D; $("cdHms").textContent = pad(H) + ":" + pad(M) + ":" + pad(Math.floor(ms / 1000));
  const avg = (6 * targetFor("normal") + targetFor("refresh")) / 7;
  $("cdSub").textContent = labelDay(n.key) + " " + n.at.getHours() + ":" + pad(n.at.getMinutes()) + " 開始。今の時間割なら、それまでに勉強できるのは約" + Math.round(avg * (n.at - Date.now()) / 864e5 / 60) + "時間。";
  const others = ex.slice(1, 4).map(e => `<span><b>D-${Math.ceil((e.at - Date.now()) / 864e5)}</b>${esc(e.label.replace(/（.*?）/g, ""))}</span>`).join("");
  if ($("cdOthers").dataset.v !== others) { $("cdOthers").innerHTML = others; $("cdOthers").dataset.v = others; }
}

/* 相棒のセリフ：頑張った日・点が伸びた日はやさしく、それ以外はスパルタ */
let lastLine = "";
function moodNow() {
  const k = dayKey(), tm = minOf(k), tg = targetFor(modeOf(k));
  const recentBest = (S.scores || []).some(s => s.best && daysBetween(s.date, k) <= 2);
  return tm >= tg || allClear(k) || recentBest ? "kind" : "spartan";
}
function pickLine(force) {
  const y = YK[S.game.partner] || { voice: "cool" }, v = VOICE[y.voice] || VOICE.cool;
  const k = dayKey(), tm = minOf(k), tg = targetFor(modeOf(k)), ex = nextExams()[0];
  const hour = new Date().getHours(), d = S.days[k] || {};
  let mood = moodNow(), pool = v[mood];
  if (!force && hour >= 5 && hour < 10 && tm < 30) { pool = v.morning; mood = "spartan"; }
  let line = pool[Math.floor(Math.random() * pool.length)], guard = 0;
  while (pool.length > 1 && line === lastLine && guard++ < 8) line = pool[Math.floor(Math.random() * pool.length)];
  lastLine = line;
  const txt = line.replace("{h}", hrs(tm)).replace("{left}", hrs(Math.max(0, tg - tm))).replace("{d}", ex ? Math.ceil((ex.at - Date.now()) / 864e5) : "?").replace("{goal}", trimH(tg)).replace("{n}", USER_NAME);
  $("bubble").textContent = txt; $("bubble").dataset.mood = mood;
}
let buddyKey = "";
function renderBuddy() {
  const id = S.game.partner, y = YK[id], img = $("buddyImg");
  $("buddyCanvas").hidden = true;
  if (!y) {
    $("bName").textContent = "相棒募集中"; $("bRar").hidden = true; $("bLv").textContent = ""; $("evolveBtn").hidden = true; img.hidden = true; $("buddyGear").innerHTML = "";
    $("bEvo").textContent = YOKAI.length ? "図鑑から相棒を選ぼう" : "新しいキャラを準備中"; $("bEvoBar").style.width = "0%";
    if (!$("bubble").textContent) pickLine(); return;
  }
  const outfit = (S.game.outfits && S.game.outfits.equipped) || {};
  $("bName").textContent = y.name; $("bRar").hidden = false; $("bRar").textContent = RARITY[y.rarity].name; $("bRar").className = "rar " + RARITY[y.rarity].cls;
  const ex = expOf(id), lv = lvOf(ex), nf = nextForm(id), ready = canEvolve(id);
  $("bLv").textContent = "Lv." + lv;
  if (nf) { const need = (evolveLv(id) - 1) * LV_MIN; $("bEvo").textContent = ready ? "進化できる！" : "進化 Lv." + evolveLv(id) + "まで あとポモドーロ " + Math.ceil(Math.max(0, need - ex) / LV_MIN) + "回"; $("bEvoBar").style.width = clamp(100 * ex / need, 0, 100) + "%"; }
  else { $("bEvo").textContent = "最終形態　次のLvまで " + Math.ceil(LV_MIN - ex % LV_MIN) + "分"; $("bEvoBar").style.width = (100 * (ex % LV_MIN) / LV_MIN) + "%"; }
  $("evolveBtn").hidden = !ready; $("evolveBtn").dataset.id = id;
  const key = id + JSON.stringify(outfit);
  if (key !== buddyKey) { buddyKey = key; img.hidden = false; img.src = thumb(id); $("buddyGear").innerHTML = gearHtml(outfit); }
  if (!$("bubble").textContent) pickLine();
}


function renderPhase() {
  const k = dayKey(), p = phaseOf(k), total = daysBetween(p.from, p.to) + 1, i = clamp(daysBetween(p.from, k) + 1, 1, total);
  $("phName").textContent = p.name; $("phTip").textContent = p.tip; $("phDays").textContent = i + " / " + total + "日目";
}
function renderTasks() {
  const k = dayKey(), list = tasksOf(k), ul = $("taskList");
  const html = list.map(t => {
    const done = t.count >= t.goal, pct = clamp(100 * t.count / t.goal, 0, 100);
    const ctl = t.auto ? `<button type="button" data-go="learn" data-tab="${t.auto === "words" ? "words" : t.auto}">始める</button>` :
      `<button type="button" data-t="${t.id}" data-d="-1">−1</button><button type="button" data-t="${t.id}" data-d="1">＋1</button>` +
      (t.goal >= 10 ? `<button type="button" data-t="${t.id}" data-d="10">＋10</button>` : "") + (t.custom ? `<button type="button" data-del="${t.id}">消す</button>` : "");
    return `<li class="task${done ? " done" : ""}" data-s="${t.subj || ""}"><span class="nm">${esc(t.name)}<small>${t.subj ? SUBJ[t.subj] : "自分で足したタスク"}${t.auto ? "・即答モードで自動で数える" : ""}</small></span>
      <span class="ct num">${t.count}<small>/${t.goal}${esc(t.unit)}</small></span><div class="bar-p"><i class="${done ? "ok" : ""}" style="width:${pct}%"></i></div><div class="ctl">${ctl}</div></li>`;
  }).join("");
  if (ul.dataset.v !== html) { ul.innerHTML = html; ul.dataset.v = html; }
  const ac = allClear(k);
  $("clearStamp").hidden = !ac;
  $("taskSum").textContent = list.filter(t => t.count >= t.goal).length + " / " + list.length + " 達成" + (ac ? "　全クリア！小判＋20・券＋15" : "");
  const tm = minOf(k), tg = targetFor(modeOf(k));
  $("homeTime").textContent = hrs(tm) + "h / " + trimH(tg) + "h"; $("homeTimeBar").style.width = clamp(100 * tm / tg, 0, 100) + "%"; $("homeTimeBar").className = tm >= tg ? "ok" : "";
  $("homeStreak").textContent = "連続 " + streakNow() + "日"; $("homeMode").textContent = modeOf(k) === "refresh" ? "リフレッシュ日" : "通常日";
}
function renderDayNotes() {
  const k = dayKey(), d = S.days[k] || {}, hour = new Date().getHours();
  const g = $("goalText"); if (document.activeElement !== g && g.value !== (d.goal || "")) g.value = d.goal || "";
  $("nightCard").hidden = !(hour >= 20 || hour < DAY_START_HOUR || d.review);
  const r = $("reviewText"); if (document.activeElement !== r && r.value !== (d.review || "")) r.value = d.review || "";
  for (const [id, key] of [["moodBtns", "mood"], ["energyBtns", "energy"]]) $(id).querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === d[key])));
  $("nightSum").textContent = "今日は " + hrs(minOf(k)) + "時間、ノルマ " + tasksOf(k).filter(t => t.count >= t.goal).length + "/" + tasksOf(k).length + "。";
}
/* 今やること：ノルマのうち、まだ終わっていない最初の1つと、そのやり方 */
const HOW = {
  words: "英単語の意味を思い出して答える。アプリの中でできて、数も自動で数える。",
  lecture: "スタディサプリで授業を見る。下のボタンでタイマーが動くから、見終わったらノルマで「＋1」。",
  gq: "文法の問題を解く。問題集でも、勉強タブの「文法」の確認問題でもいい。終わった数をノルマで足す。",
  reading: "英語長文を1題、時間を計って解く。下のボタンでタイマーが動く。",
  past: "過去問か本番形式の問題を、本番と同じ時間で解く。",
  kobun: "古文単語の意味を思い出して答える。アプリの中でできる。",
  seikei: "政経の一問一答。アプリの中でできる。"
};
function nextTask() { return tasksOf(dayKey()).find(t => t.count < t.goal) || null; }
function renderNext() {
  const k = dayKey(), list = tasksOf(k), t = nextTask(), done = list.filter(x => x.count >= x.goal).length;
  $("nextCount").textContent = done + " / " + list.length + " 終わった";
  $("nextGuide").hidden = econ().totalMin > 0;
  const running = S.timer && S.timer.running;
  if (!t) { $("nextName").textContent = "今日のノルマは全部終わった"; $("nextHow").textContent = "あとはタイマーで勉強時間を積むだけ。目標は " + trimH(targetFor(modeOf(k))) + "時間。"; $("nextBtn").textContent = running ? "タイマーを見る" : "タイマーを始める"; $("nextBtn").dataset.k = "timer"; $("nextBtn").dataset.s = "en"; return; }
  $("nextName").textContent = t.name + "（あと " + (t.goal - t.count) + t.unit + "）";
  $("nextHow").textContent = HOW[t.id] || "下のボタンでタイマーが動く。終わったらノルマで「＋1」。";
  if (t.auto) { $("nextBtn").textContent = { words: "英単語を始める", kobun: "古文単語を始める", seikei: "政経を始める" }[t.auto] || "始める"; $("nextBtn").dataset.k = "learn:" + t.auto; }
  else { $("nextBtn").textContent = running ? "タイマーを見る" : "タイマーを始める（" + (SUBJ[t.subj] || "英語") + "）"; $("nextBtn").dataset.k = "timer"; $("nextBtn").dataset.s = t.subj || "en"; }
}
function renderHome() { renderCountdown(); renderNext(); renderBuddy(); renderPassMini(); renderPhase(); renderTasks(); renderDayNotes(); renderActiveTicket("homeTicket"); }

function bindHome() {
  $("taskList").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.go) { if (b.dataset.tab) learnTab = b.dataset.tab; return go(b.dataset.go); }
    if (!ready()) return;
    const k = dayKey();
    if (b.dataset.del) return patchDay(k, d => { d.custom = (d.custom || []).filter(c => c.id !== b.dataset.del); });
    const id = b.dataset.t, dlt = Number(b.dataset.d), before = allClear(k);
    patchDay(k, d => { d.tasks = d.tasks || {}; d.tasks[id] = Math.max(0, (d.tasks[id] || 0) + dlt); }).then(() => {
      if (!before && allClear(k)) { sfx("done"); confetti(); toast("今日のノルマ全クリア！小判＋20・券＋15"); pickLine(true); } else sfx("tap");
    });
  });
  $("addTask").addEventListener("submit", e => {
    e.preventDefault(); if (!ready()) return;
    const name = $("atName").value.trim(), goal = Math.max(1, parseInt($("atGoal").value, 10) || 1); if (!name) return;
    patchDay(dayKey(), d => { d.custom = [...(d.custom || []), { id: "c" + Date.now().toString(36), name, goal, unit: $("atUnit").value.trim() }]; });
    $("atName").value = ""; $("atUnit").value = ""; toast("タスクを足した。");
  });
  let gT = 0;
  $("goalText").addEventListener("input", () => { clearTimeout(gT); gT = setTimeout(() => { if (ready()) patchDay(dayKey(), d => { d.goal = $("goalText").value.trim(); }); }, 700); });
  let rT = 0;
  $("reviewText").addEventListener("input", () => { clearTimeout(rT); rT = setTimeout(() => { if (ready()) patchDay(dayKey(), d => { d.review = $("reviewText").value.trim(); }); }, 700); });
  for (const [id, key] of [["moodBtns", "mood"], ["energyBtns", "energy"]]) $(id).addEventListener("click", e => { const b = e.target.closest("button"); if (!b || !ready()) return; patchDay(dayKey(), d => { d[key] = Number(b.dataset.v); }); sfx("tap"); });
  $("nextBtn").onclick = e => {
    const b = e.currentTarget, kind = b.dataset.k || "";
    if (kind.startsWith("learn:")) { learnTab = kind.slice(6); return go("learn"); }
    go("timer");
    if (!(S.timer && S.timer.running)) { tSubj = b.dataset.s || "en"; timerStart(); }
  };
  $("talkBtn").onclick = () => { pickLine(true); sfx("tap"); };
  $("evolveBtn").onclick = e => evolve(e.currentTarget.dataset.id);
  $("bubble").onclick = () => pickLine(true);
}
function confetti() {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("div"); c.className = "confetti";
  const cols = ["#e8892c", "#f6b25a", "#d6402c", "#1d8a5a", "#4a7fd0", "#b8860b"];
  for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = cols[i % cols.length]; s.style.animationDelay = Math.random() * 0.5 + "s"; s.style.animationDuration = 1.2 + Math.random() * 1 + "s"; c.append(s); }
  document.body.append(c); setTimeout(() => c.remove(), 2800);
}
