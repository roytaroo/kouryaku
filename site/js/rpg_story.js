/* ===== 英語RPG『Echoes of Aster（アスターの残響）』（オリジナル） =====
   全12章＋序章の長編。英文はターゲット1900（Part1〜2）の単語を中心に書く。
   画面では、文の中のターゲット単語を自動で見つけて下線を引き、「訳」で意味を出す（rpg.js）。

   節の書き方
   { bg, who, en, ja }                      せりふ・地の文（who が null なら地の文。bg で背景を切りかえ）
   { choice: {en, ja}, opts: [{ en, ja, go, flag }] }
   { battle: { name, ja, bg }, vocab: 2, qs: [{ en, ja, opts: [[英, 日]...], a, tip }] }
       vocab：その章で出てきたターゲット単語から、意味を答える問題を何問足すか
   { label } { go } { if: flag, go } { end: true }

   レン：赤髪・緑の目・アップバング（だいきの好み）。髪は妹が消えたあとに染めた（昔の写真では黒髪）。
   ミオは「赤が似合う」と言っていた → 再会の場面で回収する。

   全体の流れ（予定）
   序章 番号のない列車（駅）／1 忘れていく村（村・地下室）／2 ささやきの森の遺跡（遺跡）
   3 水晶の洞窟（洞窟）：鉱夫ガロと、彼が忘れた娘／4 王都の地下水路（地下水路）
   5 白い城（城）：忘却こそ救いだと説く王の布告／6 灯の回廊（城の広間・夜の広間）
   7 大図書館（図書館）：「忘却」が始まった本当の理由／8 港の倉庫と浜辺（港・浜辺）
   9 沈んだ書庫（海の底）／10 嵐の空（嵐）／11 炎の門（地下の門）
   12 忘却の女王（玉座の間）／終章 ふたたび夕暮れの駅で */

const RPG_CAST = {
  ren: { name: "Ren", ja: "レン", face: "ren" },
  lina: { name: "Lina", ja: "リナ", face: "lina" },
  conductor: { name: "Conductor", ja: "車掌", face: "conductor" },
  elder: { name: "Elder Bram", ja: "ブラム長老", face: "elder" },
  knight: { name: "The Hollow Knight", ja: "空ろの騎士" },
  child: { name: "Little Boy", ja: "小さな男の子" },
  baker: { name: "Baker", ja: "パン屋" },
  mio: { name: "Mio", ja: "ミオ", face: "mio" },
  voice: { name: "???", ja: "？？？" }
};

const RPG_CHAPTERS = [
/* ───────────────────────── 序章 ───────────────────────── */
{ id: "p0", title: "Prologue: The Train with No Number", ja: "序章　番号のない列車", nodes: [
  { bg: "station", who: null, en: "The sun was going down, and the platform was almost empty.", ja: "日が沈みかけていて、ホームにはほとんど人がいなかった。" },
  { bg: "cg_photo", who: null, en: "Ren sat on a bench, holding an old photograph. In it, he was smiling next to a girl whose face had completely disappeared.", ja: "レンは古い写真を手に、ベンチに座っていた。写真の中の彼は笑っていて、その隣には顔がすっかり消えてしまった少女がいた。" },
  { face: "sad", who: "ren", en: "\"Mio...\"", ja: "「ミオ……」" },
  { who: null, en: "In the photo, his hair was still black. A few months after she disappeared, he had dyed it bright red.", ja: "写真の中の彼の髪は、まだ黒かった。妹がいなくなって数か月後、彼は髪を鮮やかな赤に染めたのだ。" },
  { face: "sad", who: "ren", en: "\"You always said red would suit me, like the hero in your favorite game. Well, I finally did it... So come back and laugh at me.\"", ja: "「おまえ、ずっと言ってたよな。好きなゲームの主人公みたいに、赤が似合うって。……やっと染めたぞ。だから帰ってきて、笑えよ。」" },
  { who: null, en: "A year ago, his younger sister had vanished. What was worse, everyone else had forgotten that she had ever existed.", ja: "1年前、妹が姿を消した。さらに悪いことに、ほかのだれもが、彼女がこの世にいたことさえ忘れてしまった。" },
  { who: null, en: "Her room was now used for storage. Her name was no longer on the class list. Even his parents looked confused whenever he mentioned her.", ja: "彼女の部屋は今では物置になっている。クラス名簿にも名前はない。両親でさえ、彼が妹の話をするたびに戸惑った顔をした。" },
  { bg: "station", face: "sad", who: "ren", en: "\"Am I the only person in the world who still remembers you?\"", ja: "「おまえを覚えているのは、世界で俺だけなのか？」" },
  { who: null, en: "Just then, a bell rang. It was a sound that did not appear on any timetable.", ja: "ちょうどそのとき、ベルが鳴った。どの時刻表にも載っていない音だった。" },
  { bg: "cg_train", who: null, en: "A silver train with no number on its side slowly approached the station and stopped in front of him.", ja: "車体に番号のない銀色の列車が、ゆっくりと駅に近づき、彼の目の前で止まった。" },
  { who: "conductor", en: "\"If you still remember her, get on board. This train does not wait for those who hesitate.\"", ja: "「まだ彼女を覚えているなら、お乗りなさい。この列車は、ためらう者を待ちません。」" },
  { choice: { en: "What will Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Get on without saying a word.", ja: "何も言わずに乗る。", go: "board" },
    { en: "\"Wait. Where does this train go?\"", ja: "「待ってくれ。この列車はどこへ行くんだ？」", go: "ask" }
  ] },
  { label: "ask" },
  { who: "conductor", en: "\"To the place where forgotten things end up. Whether you can return depends entirely on you.\"", ja: "「忘れられたものが行き着く場所へ。戻ってこられるかどうかは、すべてあなたしだいです。」" },
  { label: "board" },
  { bg: "train", who: null, en: "Ren took a deep breath and stepped inside. The doors closed behind him without a sound.", ja: "レンは深く息を吸って、中へ足を踏み入れた。扉は音もなく閉まった。" },
  { who: null, en: "Outside the window, the town melted into gold, then into darkness, and finally into a sky full of unfamiliar stars.", ja: "窓の外で、町は金色に溶け、やがて暗闇になり、最後には見たことのない星でいっぱいの空に変わった。" },
  { who: "conductor", en: "\"Before we arrive, I must check your ticket. Here, a ticket is a memory. Show me that yours is real.\"", ja: "「到着の前に、切符を拝見します。ここでは、切符とは記憶のこと。あなたの記憶が本物だと示してください。」" },
  { battle: { name: "Ticket Check", ja: "検札" }, vocab: 1, qs: [
    { en: "Why was Ren holding the photograph?", ja: "レンはなぜ写真を持っていた？", opts: [["He wanted to sell it.", "売りたかったから。"], ["It was the only proof of his sister.", "妹がいた唯一の証だったから。"], ["He found it on the bench.", "ベンチで拾ったから。"], ["The conductor gave it to him.", "車掌にもらったから。"]], a: 1, tip: "ほかの人はみんな妹を忘れている。写真は、妹がいたことを示す数少ないもの。" },
    { en: "What happened to Mio's room?", ja: "ミオの部屋はどうなった？", opts: [["It became a storage room.", "物置になった。"], ["It was locked.", "鍵がかけられた。"], ["Ren moved into it.", "レンが使うようになった。"], ["It was destroyed.", "壊された。"]], a: 0, tip: "\"Her room was now used for storage.\" storage＝保管、物置。" }
  ] },
  { who: "conductor", en: "\"Very well. Your memory is clear and strong. Welcome to Aster, the land of forgotten things.\"", ja: "「けっこう。あなたの記憶ははっきりしていて、強い。ようこそアスターへ。忘れられたものたちの国へ。」" },
  { end: true }
] },

/* ───────────────────────── 第1章 ───────────────────────── */
{ id: "c1", title: "Chapter 1: The Village That Forgets", ja: "第1章　忘れていく村", nodes: [
  { bg: "village", who: null, en: "When Ren woke up, he was lying on a stone road in the middle of a quiet village.", ja: "目を覚ますと、レンは静かな村の真ん中で、石畳の道に横たわっていた。" },
  { who: null, en: "The sky was clear and the trees were green, but something about the place felt wrong.", ja: "空は晴れ、木々は緑だった。でも、この場所の何かがおかしい気がした。" },
  { who: "baker", en: "\"Good morning! Would you like some bread? It costs... it costs... I'm sorry, I can't seem to remember.\"", ja: "「おはよう！パンはいかが？お値段は……ええと……ごめんなさい、どうしても思い出せなくて。」" },
  { who: null, en: "Nearby, two children were playing together. Suddenly, one of them stopped and stared at the other.", ja: "近くで、二人の子どもがいっしょに遊んでいた。突然、ひとりが手を止めて、もうひとりをじっと見つめた。" },
  { who: "child", en: "\"Excuse me... who are you? Why am I holding your hand?\"", ja: "「ねえ……きみ、だれ？なんでぼく、きみと手をつないでるの？」" },
  { who: "voice", en: "\"Don't be scared. It happens every day now. People lose a little more of themselves each morning.\"", ja: "「こわがらないで。今では毎日起きていることなの。人は毎朝、自分を少しずつ失っていくの。」" },
  { who: null, en: "A girl about Ren's age was standing behind him. She was holding a small lantern shaped like an open book.", ja: "レンと同じくらいの年の少女が、うしろに立っていた。開いた本の形をした小さなランタンを持っている。" },
  { face: "smile", who: "lina", en: "\"I'm Lina, an apprentice at the Great Library of Aster. And you... you're not from here, are you?\"", ja: "「わたしはリナ。アスター大図書館の見習いよ。それにあなた……ここの人じゃないでしょう？」" },
  { face: "surprised", who: "ren", en: "\"How did you know?\"", ja: "「どうしてわかった？」" },
  { face: "smile", who: "lina", en: "\"Your memory is shining. I can see it in my lantern. People here have lost that kind of light.\"", ja: "「あなたの記憶が光ってるの。わたしのランタンに映って見える。ここの人たちは、もうそういう光をなくしてしまったから。」" },
  { who: null, en: "Ren showed her the photograph and explained everything: his sister, the faceless picture, and the train with no number.", ja: "レンは写真を見せて、すべてを説明した。妹のこと、顔の消えた写真のこと、そして番号のない列車のこと。" },
  { who: "lina", en: "\"Then she might be in Aster. Everything the world forgets eventually comes here, whether it is an object, a place, or a person.\"", ja: "「それなら、彼女はアスターにいるかもしれない。世界が忘れたものは、物でも場所でも人でも、いずれはここにたどり着くの。」" },
  { face: "sad", who: "lina", en: "\"But Aster is in danger, too. A year ago, something we call the Fading began. Memories turn into gray dust and simply blow away.\"", ja: "「でも、アスターも危ないの。1年前、わたしたちが『色あせ』と呼んでいるものが始まった。記憶が灰色の粉になって、そのまま吹き飛んでしまうの。」" },
  { face: "surprised", who: "ren", en: "\"A year ago... That's exactly when Mio disappeared.\"", ja: "「1年前……ちょうどミオが消えたときだ。」" },
  { who: "lina", en: "\"Then perhaps the two are connected. Come with me. Elder Bram knows more about the Fading than anyone.\"", ja: "「なら、その二つはつながっているのかもしれない。いっしょに来て。ブラム長老なら、色あせについてだれよりもくわしいわ。」" },
  { bg: "cellar", who: null, en: "The elder's house had a cellar lit by a single torch. An old man was sitting in the corner, holding a wooden box tightly.", ja: "長老の家には、たいまつ一本で照らされた地下室があった。老人が隅に座って、木の箱をしっかりと抱えていた。" },
  { who: "elder", en: "\"Lina? Is that you? I put something precious in this box, but I can't recall what it was.\"", ja: "「リナか？わしはこの箱に大切なものを入れたのじゃが、それが何だったか思い出せんのだ。」" },
  { who: "lina", en: "\"Elder, please try. We need to know where the Fading started.\"", ja: "「長老、思い出してみて。色あせがどこで始まったのか、知る必要があるの。」" },
  { who: null, en: "Before the old man could answer, the torch flickered. The shadows on the wall began to move by themselves.", ja: "老人が答える前に、たいまつの火がゆらいだ。壁の影が、ひとりでに動き始めた。" },
  { face: "surprised", who: "lina", en: "\"A Hollow! It's a monster made from abandoned memories. Ren, stay behind me!\"", ja: "「ホロウよ！捨てられた記憶から生まれた化け物。レン、わたしのうしろに！」" },
  { who: "ren", en: "\"No way. I'm not going to stand behind anyone while you fight alone.\"", ja: "「冗談じゃない。きみがひとりで戦ってるのに、だれかのうしろに隠れてなんかいられるか。」" },
  { who: "lina", en: "\"Then listen. Hollows are weak against true words. Answer what they ask with the right meaning, and they will lose their shape.\"", ja: "「じゃあ聞いて。ホロウは本当の言葉に弱いの。問いかけに正しい意味で答えれば、形を保てなくなる。」" },
  { battle: { name: "Cellar Hollow", ja: "地下室のホロウ", mon: 14, drop: 1 }, vocab: 2, qs: [
    { en: "Why couldn't the baker tell Ren the price of the bread?", ja: "パン屋はなぜパンの値段を言えなかった？", opts: [["She did not want to sell it.", "売りたくなかったから。"], ["She had forgotten it.", "忘れてしまったから。"], ["The bread was free.", "パンは無料だったから。"], ["Ren had no money.", "レンがお金を持っていなかったから。"]], a: 1, tip: "\"I can't seem to remember.\" can't seem to ～＝どうしても～できないようだ。" },
    { en: "According to Lina, what happens to everything the world forgets?", ja: "リナによると、世界が忘れたものはどうなる？", opts: [["It disappears forever.", "永遠に消える。"], ["It eventually comes to Aster.", "いずれアスターにやって来る。"], ["It turns into a train.", "列車に変わる。"], ["It goes back to its owner.", "持ち主のもとに戻る。"]], a: 1, tip: "eventually＝最終的に、いずれは。" }
  ] },
  { who: null, en: "The shadow let out a long sigh and broke into gray dust. For a moment, the cellar was silent.", ja: "影は長いため息をつき、灰色の粉になって崩れた。しばらくのあいだ、地下室は静まり返っていた。" },
  { who: null, en: "Then the elder slowly opened the wooden box. Inside was a tiny pair of children's shoes.", ja: "やがて長老は、ゆっくりと木の箱を開けた。中には小さな子ども用の靴が入っていた。" },
  { who: "elder", en: "\"These belonged to my grandson... I remember now. He used to run to me every evening, laughing.\"", ja: "「これは孫の靴じゃ……今、思い出した。あの子は毎晩、笑いながらわしのところへ駆けてきたものじゃ。」" },
  { who: "elder", en: "\"I would rather feel this pain than lose him again. Thank you, young man.\"", ja: "「もう一度あの子を失うくらいなら、この痛みを感じているほうがいい。ありがとう、若いの。」" },
  { who: "elder", en: "\"The Fading started at the old shrine in the Whispering Forest. A knight guards it now, but he no longer remembers whom he serves.\"", ja: "「色あせは、ささやきの森の古いほこらで始まった。今は騎士がそこを守っておるが、自分がだれに仕えておるのか、もう覚えてはおらん。」" },
  { bg: "cg_fountain", who: null, en: "That night, Ren and Lina sat by the fountain in the empty square.", ja: "その夜、レンとリナは、だれもいない広場の噴水のそばに座っていた。" },
  { face: "sad", who: "lina", en: "\"Can I ask you something? Remembering your sister must hurt. Why don't you just let her go?\"", ja: "「ひとつ聞いてもいい？妹さんを覚えているのは、つらいはずよね。どうして手放してしまわないの？」" },
  { choice: { en: "How does Ren answer?", ja: "レンはどう答える？" }, opts: [
    { en: "\"Because if I forget her too, she will really be gone.\"", ja: "「俺まで忘れたら、あいつは本当にいなくなってしまうから。」", go: "c1a", flag: "promise" },
    { en: "\"I tried. But my heart refused to let her go.\"", ja: "「やってみたさ。でも、心がどうしても手放そうとしなかった。」", go: "c1b" }
  ] },
  { label: "c1a" },
  { face: "smile", who: "lina", en: "\"...Then I'll help you keep her. That's a promise.\"", ja: "「……なら、わたしが手伝う。彼女を失わないように。約束する。」" },
  { go: "c1end" },
  { label: "c1b" },
  { face: "smile", who: "lina", en: "\"Hearts are stubborn like that. I think yours is right.\"", ja: "「心って、そういうところが頑固なのよね。でも、あなたの心は正しいと思う。」" },
  { label: "c1end" },
  { bg: "village_night", who: null, en: "Lina's lantern flickered for a moment, as if it were tired. She quickly covered it with her sleeve.", ja: "リナのランタンが、疲れたように一瞬ゆらいだ。彼女はすぐに袖でそれを隠した。" },
  { end: true }
] },

/* ───────────────────────── 第2章 ───────────────────────── */
{ id: "c2", title: "Chapter 2: Ruins of the Whispering Forest", ja: "第2章　ささやきの森の遺跡", nodes: [
  { bg: "ruins", who: null, en: "Deep in the forest stood the remains of an ancient shrine, covered with moss and climbing plants.", ja: "森の奥深くに、苔とつる草におおわれた古いほこらの跡が立っていた。" },
  { who: null, en: "As they walked, the leaves seemed to whisper words in a language Ren almost understood.", ja: "歩いていると、木の葉がささやいているように聞こえた。レンにはほとんどわかりそうな言葉で。" },
  { who: "lina", en: "\"The trees are repeating memories that people have abandoned. Try not to listen too closely, or you might get lost in them.\"", ja: "「木々は、人々が捨てた記憶をくり返しているの。あまり聞き入らないで。迷いこんでしまうかもしれないから。」" },
  { face: "sad", who: "voice", en: "\"Ren... Don't look for me... It's better this way...\"", ja: "「レン……わたしを探さないで……このほうがいいの……」" },
  { face: "surprised", who: "ren", en: "\"Mio? Mio! Was that you?\"", ja: "「ミオ？ミオ！今のはおまえか？」" },
  { face: "surprised", who: "lina", en: "\"Ren, wait! The forest imitates voices to confuse travelers!\"", ja: "「レン、待って！森は旅人をまどわすために声をまねるのよ！」" },
  { choice: { en: "What does Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Run toward the voice.", ja: "声のほうへ走る。", go: "run" },
    { en: "Stop and trust Lina.", ja: "立ち止まって、リナを信じる。", go: "trust", flag: "trust" }
  ] },
  { label: "run" },
  { who: null, en: "Ren ran between the trees until his breath ran out. There was no one there, only an old ribbon caught on a branch.", ja: "レンは息が切れるまで木々のあいだを走った。だれもいなかった。枝に古いリボンが引っかかっているだけだった。" },
  { who: null, en: "He recognized it at once. It was the blue ribbon he had given Mio on her tenth birthday.", ja: "彼にはすぐにわかった。ミオの10歳の誕生日に、彼が贈った青いリボンだった。", flag: "ribbon" },
  { face: "sad", who: "lina", en: "\"Ren! Don't ever run off like that again... But that ribbon proves she really came this way.\"", ja: "「レン！二度とあんなふうに走っていかないで……でも、そのリボンは、彼女が本当にこの道を通った証拠ね。」" },
  { go: "gate" },
  { label: "trust" },
  { who: null, en: "Ren clenched his fists and stayed where he was. Slowly, the voice faded into the wind.", ja: "レンはこぶしを握りしめ、その場にとどまった。声はゆっくりと風の中に消えていった。" },
  { face: "smile", who: "lina", en: "\"Thank you for trusting me. I know how much you wanted to follow it.\"", ja: "「信じてくれてありがとう。あの声を追いかけたかった気持ち、よくわかる。」" },
  { label: "gate" },
  { who: null, en: "At the center of the ruins was a dark archway. In front of it stood a knight in rusted armor, holding a broken sword.", ja: "遺跡の中心に、暗いアーチがあった。その前に、さびた鎧の騎士が折れた剣を持って立っていた。" },
  { who: "knight", en: "\"Stop. I was ordered to protect this place. No one may pass.\"", ja: "「止まれ。わたしはこの場所を守るよう命じられた。だれも通さぬ。」" },
  { who: "lina", en: "\"Who gave you that order, Sir Knight?\"", ja: "「騎士さま、その命令はだれから受けたのですか？」" },
  { who: "knight", en: "\"Who...? I... I do not know. I only know that I must not fail again.\"", ja: "「だれ……？わたしは……わからぬ。ただ、二度と失敗してはならぬ、それだけはわかる。」" },
  { who: "ren", en: "\"Again? Then you failed someone before. Who was it?\"", ja: "「二度と？じゃあ、前にだれかを守れなかったんだな。それはだれだ？」" },
  { who: null, en: "The knight's helmet shook violently. Gray dust poured out of the gaps in his armor.", ja: "騎士のかぶとが激しく揺れた。鎧のすき間から、灰色の粉があふれ出した。" },
  { who: "knight", en: "\"Do not ask me that! Leave, or I will make you forget your own name!\"", ja: "「それを聞くな！立ち去れ。さもなくば、おまえ自身の名前を忘れさせてやる！」" },
  { battle: { name: "The Hollow Knight", ja: "空ろの騎士", boss: true, mon: 99, drop: 13 }, vocab: 3, qs: [
    { en: "Why did Lina tell Ren not to listen to the trees too closely?", ja: "リナはなぜ、木々の声に聞き入らないように言った？", opts: [["The trees were dangerous animals.", "木々が危険な動物だったから。"], ["He might get lost in abandoned memories.", "捨てられた記憶の中で迷うかもしれないから。"], ["The trees were telling lies about Mio.", "木々がミオについてうそをついていたから。"], ["They had no time to rest.", "休む時間がなかったから。"]], a: 1, tip: "\"or you might get lost in them\" ＝ さもないと、その中で迷うかもしれない。命令文＋or は「さもないと」。" },
    { en: "What does the knight know for certain?", ja: "騎士がはっきりわかっていることは？", opts: [["The name of his king.", "王の名前。"], ["Where the Fading began.", "色あせが始まった場所。"], ["That he must not fail again.", "二度と失敗してはならないこと。"], ["Who Ren is.", "レンがだれか。"]], a: 2, tip: "\"I only know that I must not fail again.\" only know ＝それしかわからない。" },
    { en: "In \"Gray dust poured out of the gaps,\" the word \"poured\" is closest to ___.", ja: "\"poured\" にいちばん近い意味は？", opts: [["flowed out", "流れ出た"], ["froze", "凍った"], ["rose slowly", "ゆっくり上がった"], ["disappeared", "消えた"]], a: 0, tip: "pour＝注ぐ、どっと流れ出る。" }
  ] },
  { who: null, en: "The broken sword fell from the knight's hand. He dropped to one knee, and his voice became calm and human.", ja: "折れた剣が騎士の手から落ちた。彼は片ひざをつき、その声は落ち着いた、人間らしいものになった。" },
  { who: "knight", en: "\"Now I remember. I served a young girl who came here a year ago. She was crying, and she asked me to guard the door so that no one would follow her.\"", ja: "「今、思い出した。わたしは1年前ここに来た少女に仕えていた。彼女は泣いていて、だれも追ってこないよう、扉を守ってほしいとわたしに頼んだのだ。」" },
  { who: "ren", en: "\"A girl... about this tall? With a quiet voice?\"", ja: "「少女……このくらいの背の？静かな声の？」" },
  { if: "ribbon", go: "kribbon" },
  { who: "knight", en: "\"Yes. She said her brother was the only one who would keep searching for her, and that she could not bear to be found.\"", ja: "「そうだ。彼女は言った。自分を探し続けるのは兄だけだろう、そして、見つけられることには耐えられない、と。」" },
  { go: "kend" },
  { label: "kribbon" },
  { who: "knight", en: "\"Yes... she wore a blue ribbon like the one in your hand. She said her brother gave it to her, and that she could not bear to be found by him.\"", ja: "「ああ……きみが持っているような青いリボンをつけていた。兄にもらったのだと言っていた。そして、その兄に見つけられることには耐えられない、と。」" },
  { label: "kend" },
  { face: "sad", who: "ren", en: "\"Why? Why would she run away from me?\"", ja: "「なぜだ？なぜ俺から逃げなきゃいけないんだ？」" },
  { who: "knight", en: "\"That, I cannot answer. But she went toward the Crystal Caves, and then to the capital. Please... protect her better than I did.\"", ja: "「それには答えられぬ。だが彼女は水晶の洞窟へ、そして王都へ向かった。どうか……わたしよりも、うまく彼女を守ってやってくれ。」" },
  { bg: "cg_knight", who: null, en: "The knight smiled for the first time, and his armor turned into soft light that rose slowly into the trees.", ja: "騎士は初めてほほえんだ。そして彼の鎧は、やわらかな光になって、ゆっくりと木々のあいだへ昇っていった。" },
  { who: null, en: "Where he had been kneeling, a small crystal was left on the ground. Inside it, a faint image of a girl was walking away.", ja: "彼がひざをついていた場所に、小さな水晶が残されていた。その中では、少女のかすかな姿が、遠ざかるように歩いていた。" },
  { face: "sad", who: "lina", en: "\"A Memory Shard. It holds a piece of someone's past. Ren... I think it's hers.\"", ja: "「記憶のかけらよ。だれかの過去のひとかけらが入ってる。レン……これ、彼女のものだと思う。」" },
  { if: "trust", go: "c2trust" },
  { go: "c2fin" },
  { label: "c2trust" },
  { face: "smile", who: "lina", en: "\"And Ren... back in the forest, you chose to trust me. I won't forget that.\"", ja: "「それとね、レン……森で、あなたはわたしを信じてくれた。そのこと、忘れないから。」" },
  { label: "c2fin" },
  { who: "ren", en: "\"She didn't vanish by accident. She left on purpose... and I'm going to find out why.\"", ja: "「あいつは偶然消えたんじゃない。自分の意志で去ったんだ……その理由を、俺は必ず突き止める。」" },
  { end: true }
] }
];

/* ===== モンスターとアイテム（絵はモケモさんの素材。minecraft/private/rpg_mon・rpg_item、公開しない） ===== */
const RPG_MON_NAMES = ["", "Drool Slime", "Shadow Bat", "Ash Wolf", "Skull Bull", "Chest Mimic", "Storm Wraith", "Iron Gargoyle", "Moss Imp", "Shell Goblin", "Spine Beetle",
  "Deep Kraken", "Gear Spider", "Frost Shark", "Void Jelly", "Jade Wyvern", "Crystal Fang", "Bubble Orb", "Ember Totem", "Gift Golem", "Frosted Wing",
  "Leaf Sprite", "Watcher Owl", "Vine Serpent", "Ruby Heart", "Fire Lizard", "Axe Boar", "Plume Griffin", "Stone Elephant", "Hat Mole", "Mint Ghost",
  "Rust Tank", "Cap Rabbit", "Thorn Hedgehog", "Wind Eel", "Cloud Toad", "Rock Owl", "Azure Drake", "Lava Toad", "Tide Jelly", "Magma Slime",
  "Root Witch", "Gator Frog", "Mushroom Sage", "Wave Spirit", "Bloom Turtle", "Stump Ent", "Petal Fairy", "Garden Ogre", "Violet Hydra", "Pig Brute",
  "Little Ghost", "Blue Raven", "Mud Dome", "Armor Crab", "Maw Plant", "Gulp Fish", "Moss Lizard", "Leaf Mantis", "Bandage Bunny", "Red Demon",
  "Phantom Weaver", "Thunder Moth", "Mushroom Mage", "Crow Knight", "Elder Treant", "Star Bear", "Gold Whale", "Glass Wolf", "Lantern Fish", "Clay Golem",
  "Cinder Cat", "Night Drake", "Drill Snail", "Bone Priestess", "Frost Wisp", "Shell Hermit", "Ember Worm", "Moss Caterpillar", "Neon Mantis", "Crimson Beast",
  "Pine Frog King", "Ice Serpent", "Rose Dryad", "Emerald Gargoyle", "Blade Lizard", "Moon Witch", "Flame Tail", "Blue Dragon", "Horn Beetle", "Vine Kraken",
  "Twin Toad", "Flame Bird", "Crystal Monolith", "Frost Golem", "Scale Beast", "Fox Kit", "Rock Slug", "Bell Camel", "Iron Knight", "Thunder Lion",
  "Glacier Titan", "Clockwork Mask", "Hammer Bear", "Scarecrow", "Puppet Doll", "War Drum", "Fluff Beast", "Signal Head", "Basket Cat", "Carrot Rabbit"];
const RPG_ITEMS = {
  1: { name: "Healing Herb", ja: "薬草", use: "戦いでハートを1つ回復できる" },
  13: { name: "Memory Shard", ja: "記憶のかけら", use: "だれかの過去が少しだけ見える" },
  25: { name: "White Feather", ja: "白い羽", use: "軽くて、ほんのり温かい" },
  41: { name: "Field Carrot", ja: "畑のにんじん", use: "甘い。村の子どもの好物" },
  60: { name: "Old Branch", ja: "古い枝", use: "ささやきの森の枝。かすかに声がする" },
  73: { name: "Beast Skull", ja: "獣の頭骨", use: "強い魔物を倒したあかし" }
};
