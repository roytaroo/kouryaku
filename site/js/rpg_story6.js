/* ===== クリア後のエクストラ章『書かれなかった者』（裏ボス） =====
   流れ：エンディング後、王都でオーウィン先生に話す → 3つの「失われた結末」を集める（村の学校・王都の庭・港）
   → 大図書館の奥（北の出口）から『書かれなかった書庫』へ → 裏ボス「The Unwritten」→ 真のエンディング。 */
Object.assign(RPG_CAST, { unwritten: { name: "The Unwritten", ja: "書かれなかった者" } });
Object.assign(GEXTRA_CAST, { teacher: { name: "Clara", ja: "クララ先生" } });

RPG_CHAPTERS.push({ id: "ex", title: "Extra Chapter: The Unwritten", ja: "エクストラ章　書かれなかった者", nodes: [
  { label: "ex_start" },
  { bg: "library", who: null, en: "A week after returning home, Ren dreamed of the silver train again. When he opened his eyes, he was standing in the square of the capital, holding Lina's bookmark.", ja: "家に帰って一週間後、レンはまた銀色の列車の夢を見た。目を開けると、王都の広場に立っていて、手にはリナのしおりを握っていた。" },
  { who: null, en: "The bookmark was glowing. Faintly, like a candle behind a curtain.", ja: "しおりが光っていた。カーテンの向こうのろうそくのように、かすかに。" },
  { who: "lina", face: "surprised", en: "\"...Ren? Is that really you? I thought I'd become a story with an ending.\"", ja: "「……レン？本当にあなたなの？わたし、結末のついた物語になったと思ってた。」" },
  { who: null, en: "Lina stood in front of him, but he could see the fountain through her body. She was there, and not quite there.", ja: "リナが目の前に立っていた。でも、その体を通して噴水が見えた。そこにいるのに、完全にはいない。" },
  { who: "scholar", en: "\"Lina! And the red-haired boy! Thank goodness. Come quickly. Something terrible is happening in the library.\"", ja: "「リナ！それに赤い髪の少年！よかった。早く来てくれ。図書館でとんでもないことが起きている。」" },
  { who: "scholar", en: "\"Below the Room of Unfinished Stories, there is a door that has been locked for a thousand years. Last night, it opened by itself.\"", ja: "「『未完の物語の部屋』の下に、千年閉ざされていた扉がある。ゆうべ、それがひとりでに開いたのだ。」" },
  { who: "scholar", en: "\"Behind it sleeps the Unwritten. It is the spirit of every story that was never finished. It believes an unfinished story is a wound, and that the kindest thing is to close every wound by erasing it.\"", ja: "「その奥には『書かれなかった者』が眠っている。最後まで書かれなかったすべての物語の霊だ。あれは、未完の物語を傷だと考えている。そしていちばんのやさしさは、すべての傷を消して閉じることだと。」" },
  { who: "lina", face: "sad", en: "\"...And I am the most unfinished story in Aster right now. That's why I'm still here, half faded.\"", ja: "「……そして今のアスターで、いちばん未完の物語はわたし。だからわたしは、半分消えかけたまま、まだここにいるのね。」" },
  { who: "scholar", en: "\"The door is sealed by three lost endings. Find them, bring them back, and the way down will open. Without them, even you could not reach it.\"", ja: "「扉は、三つの『失われた結末』で封じられている。それを見つけて取り戻せば、下への道が開く。それなしでは、きみたちでもたどり着けん。」" },
  { who: "ren", en: "\"Where do we look?\"", ja: "「どこを探せばいい？」" },
  { who: "scholar", en: "\"Where people stopped in the middle of something important. A teacher who never finished a lesson. A gardener who never finished a garden. A sailor who never finished a voyage.\"", ja: "「人々が、大切な何かの途中で立ち止まった場所だ。授業を終えられなかった先生。庭を完成させられなかった庭師。航海を終えられなかった船乗り。」" },
  { who: "garo", en: "\"Hmph. Easy. We know all three of those places. Let's go, library girl. Try not to fade away before we're done.\"", ja: "「ふん。簡単じゃ。三つとも知っとる場所じゃろう。行くぞ、図書館の娘。終わる前に消えたりするなよ。」" },
  { who: "lina", face: "smile", en: "\"I'll do my best, Garo.\"", ja: "「がんばるわ、ガロ。」" },

  { label: "ex_school" },
  { bg: "village", who: null, en: "In Hollowbrook, the little school was full of noise. Children ran between the desks, and Clara the teacher was laughing.", ja: "ホロウブルックの小さな学校は、にぎやかな声でいっぱいだった。子どもたちが机のあいだを走り回り、クララ先生が笑っていた。" },
  { who: "teacher", en: "\"You're the traveler who wrote on my blackboard! \"Your students will come back.\" You were right. They came back the day the Fading ended.\"", ja: "「黒板に書いてくれた旅の方ね！『生徒は戻ってきます』。本当だった。色あせが終わった日に、みんな戻ってきたの。」" },
  { who: "teacher", en: "\"But there's one lesson I never finished. On the day the Fading began, I was teaching the children a poem. I stopped at the last line, and I've never been able to remember it.\"", ja: "「でも、ひとつだけ終えられなかった授業があるの。色あせが始まった日、子どもたちに詩を教えていた。最後の一行で止まって、それっきり思い出せないの。」" },
  { who: "teacher", en: "\"\"The river forgets the mountain, the sea forgets the rain, the night forgets the morning...\" And then?\"", ja: "「『川は山を忘れ、海は雨を忘れ、夜は朝を忘れる……』。そのあとは？」" },
  { who: null, en: "The children looked at each other. Then the smallest girl raised her hand.", ja: "子どもたちは顔を見合わせた。それから、いちばん小さな女の子が手を挙げた。" },
  { who: "child", en: "\"\"...but the morning always comes again.\" My mom sang it to me. I wrote it in my diary so I wouldn't forget.\"", ja: "「『……でも、朝はいつだってまたやってくる』。お母さんが歌ってくれたの。忘れないように日記に書いておいたんだ。」" },
  { who: "teacher", en: "\"...Yes. That's it. That's the last line.\"", ja: "「……そう。それよ。それが最後の一行。」" },
  { who: null, en: "As Clara wrote the line on the blackboard, a small light rose from the chalk and floated into Ren's hand. The first lost ending.", ja: "クララ先生がその一行を黒板に書くと、チョークから小さな光が立ちのぼり、レンの手の中に浮かんできた。一つ目の、失われた結末だった。" },

  { label: "ex_garden" },
  { bg: "castle", who: null, en: "In the castle garden, King Aldric knelt in the dirt in his royal robe, planting roses with his bare hands.", ja: "城の庭で、アルドリック王が王の衣のまま土にひざをつき、素手でバラを植えていた。" },
  { who: "king", en: "\"Ah, the boy who scolded a king. Look. I've torn down the white tent. Its poles are now holding up these rose vines.\"", ja: "「ああ、王を叱った少年か。見ろ。白いテントは取り壊した。その柱が、今はこのバラのつるを支えている。」" },
  { who: "king", en: "\"Seraphine designed this garden, but she died before it was finished. She left a drawing of how it should look. I lost it long ago.\"", ja: "「この庭はセラフィーヌが設計したのだが、完成する前に亡くなった。どんな庭にするか描いた図を残してくれたのだが、ずっと前になくしてしまった。」" },
  { who: "garo", en: "\"Your Majesty. Those vines are planted too close together. They'll choke each other. Move every third one to the left.\"", ja: "「陛下。そのつるは近すぎますぞ。たがいに首をしめ合ってしまう。三本ごとに一本、左へ植え替えなされ。」" },
  { who: "king", en: "\"...Seraphine used to say the exact same thing. \"Every third one to the left, Aldric.\" How did you know?\"", ja: "「……セラフィーヌも、まったく同じことを言っていた。『三本ごとに左へよ、アルドリック』と。なぜわかった？」" },
  { who: "garo", en: "\"I'm a miner. I know how roots grow. People are the same. Give them room, and they'll bloom.\"", ja: "「わしは鉱夫ですからな。根がどう伸びるかは知っとります。人も同じじゃ。すき間をやれば、花を咲かせる。」" },
  { who: null, en: "When the last rose was moved, the whole garden matched the shape of a heart. A light rose from the center and drifted into Ren's hand. The second lost ending.", ja: "最後のバラを植え替えると、庭全体がハートの形になった。真ん中から光が立ちのぼり、レンの手の中へ流れてきた。二つ目の、失われた結末だった。" },
  { who: "king", en: "\"She drew it as a heart. Of course she did. ...Thank you.\"", ja: "「ハートの形に描いていたのか。そうだろうとも。……ありがとう。」" },

  { label: "ex_harbor" },
  { bg: "harbor", who: null, en: "At the harbor, the old sailor was staring at the horizon, holding the compass he had given Ren.", ja: "港では、老水夫が、レンにあげたのと同じ羅針盤を手に、水平線を見つめていた。" },
  { who: "sailor", en: "\"My last voyage. We set out to find the island at the edge of the map. A storm turned us back. I've always wondered what was there.\"", ja: "「わしの最後の航海はな、地図の端にある島を探しに出たんじゃ。嵐で引き返した。あそこに何があったのか、ずっと気になっとる。」" },
  { who: "ren", en: "\"Then let's finish it. The storm is gone now.\"", ja: "「なら、終わらせよう。嵐はもうないんだから。」" },
  { who: null, en: "They borrowed a small boat. Ella steered, the sailor gave orders, and Garo complained about being seasick the entire time.", ja: "小舟を借りた。エラが舵をとり、老水夫が指図をし、ガロはずっと船酔いの文句を言っていた。" },
  { who: null, en: "At sunset, they reached a tiny island with a single tree. Under it was a wooden box. Inside were twelve names carved into twelve pieces of driftwood.", ja: "夕暮れに、木が一本だけ立つ小さな島に着いた。その木の下に木箱があった。中には、12本の流木に、12人の名前が刻まれていた。" },
  { who: "sailor", en: "\"My crew. Tom, Alfie, Big Sam, Little Sam... We made a promise to leave our names here, so the sea would remember us. I remember them now. Every face.\"", ja: "「わしの乗組員じゃ。トム、アルフィー、大サム、小サム……ここに名前を残せば、海がわしらを覚えていてくれると約束したんじゃ。今は思い出せる。全員の顔を。」" },
  { who: null, en: "The old man carved a thirteenth name and placed it in the box. A light rose from the island and floated into Ren's hand. The third lost ending.", ja: "老人は13本目の流木に自分の名前を刻み、箱に入れた。島から光が立ちのぼり、レンの手の中へ浮かんできた。三つ目の、失われた結末だった。" },

  { label: "ex_enter" },
  { bg: "library", who: null, en: "Below the Room of Unfinished Stories, the locked door stood open. A staircase spiraled down into darkness, lined with books that had no words in them.", ja: "未完の物語の部屋の下で、閉ざされていた扉が開いていた。らせん階段が暗闇へと下っていて、壁には一文字も書かれていない本が並んでいた。" },
  { who: "lina", face: "sad", en: "\"These are stories that people meant to write, but never started. Letters never sent. Apologies never made. Songs that stayed in someone's head.\"", ja: "「これは、人が書こうと思って、書き始めなかった物語。出さなかった手紙。言わなかったごめんなさい。だれかの頭の中にだけあった歌。」" },
  { who: "garo", en: "\"So many. Makes my own regrets feel small.\"", ja: "「こんなにあるのか。わしの後悔なんぞ、小さく思えるわい。」" },

  { label: "ex_mid" },
  { who: null, en: "Halfway down, a page drifted out of the darkness and landed at Ren's feet. On it was a drawing: a girl with a lantern, sitting alone in a library, reading.", ja: "階段の途中で、暗闇から一枚のページが舞い降りて、レンの足元に落ちた。そこには絵が描かれていた。図書館でひとり座って本を読む、ランタンを持った女の子。" },
  { who: "lina", face: "surprised", en: "\"That's the beginning of my story. A girl alone in a library... For a hundred years, that's all my story was.\"", ja: "「それ、わたしの物語の始まり。図書館にひとりきりの女の子……100年のあいだ、わたしの物語はそれだけだった。」" },
  { who: "ren", en: "\"Not anymore. Now there's a train, and a village, and a grumpy dwarf, and a girl with a blue ribbon. And me.\"", ja: "「今はちがう。今は列車があって、村があって、気むずかしいドワーフがいて、青いリボンの女の子がいる。それに、俺も。」" },
  { who: "garo", en: "\"Who are you calling grumpy?\"", ja: "「だれが気むずかしいじゃと？」" },
  { who: "lina", face: "smile", en: "\"...You're right, Ren. My story got much longer than I ever expected.\"", ja: "「……そうね、レン。わたしの物語は、思っていたよりずっと長くなった。」" },

  { label: "ex_boss" },
  { bg: "throne", who: null, en: "At the bottom, in a hall of floating shelves, something enormous unfolded itself. It was made of torn pages and pale cloth, with an open book where its heart should be.", ja: "いちばん下の、本棚が宙に浮かぶ広間で、何か巨大なものがその身を広げた。破れたページと青白い布でできていて、心臓のあるべき場所には開いた本があった。" },
  { who: "unwritten", en: "\"Little Lantern. You have come home. Your story has a beautiful ending already. Why do you keep turning the pages?\"", ja: "「小さな灯よ。帰ってきたのだな。おまえの物語には、もう美しい結末がある。なぜまだページをめくり続ける？」" },
  { who: "unwritten", en: "\"Every unfinished story hurts. I have listened to their pain for a thousand years. Let me close them all. Let me close you, too. Then nothing will ever hurt again.\"", ja: "「未完の物語は、どれも痛む。わたしは千年、その痛みを聞いてきた。すべて閉じさせておくれ。おまえも閉じさせておくれ。そうすれば、もう何も痛むことはない。」" },
  { who: "lina", en: "\"You're wrong. An unfinished story isn't a wound. It's a door that's still open.\"", ja: "「まちがってる。未完の物語は傷じゃない。まだ開いている扉なの。」" },
  { who: "ren", en: "\"You want to give everyone a quiet ending. But the best endings are the ones people choose for themselves. Even if they hurt.\"", ja: "「あんたは、みんなに静かな結末をあげたいんだろ。でも、いちばんいい結末は、自分で選んだ結末なんだ。たとえ痛くても。」" },
  { who: "unwritten", en: "\"Then show me. Show me that a story can survive without an ending.\"", ja: "「ならば見せてみよ。結末がなくても、物語が生きのびられることを。」" },
  { battle: { name: "The Unwritten", ja: "書かれなかった者", boss: true }, vocab: 4, qs: [] },
  { who: null, en: "The Unwritten's pages fluttered slowly to the ground like snow. The book in its chest closed gently.", ja: "書かれなかった者のページが、雪のようにゆっくりと床へ舞い落ちた。胸の本が、そっと閉じた。" },
  { who: "unwritten", en: "\"...I see. You are not afraid of open doors. Then I will not close them. I will guard them instead.\"", ja: "「……そうか。おまえたちは、開いた扉をおそれないのだな。ならば、わたしはもう扉を閉じまい。代わりに、守ろう。」" },
  { who: "unwritten", en: "\"Little Lantern. Your story is not finished. It never was. Go and write the next chapter.\"", ja: "「小さな灯よ。おまえの物語は終わっていない。最初から、終わってなどいなかった。行って、次の章を書くがよい。」" },
  { who: null, en: "The three lost endings rose from Ren's hand and flew into Lina. Her body filled with color, from her shoes to the tips of her hair.", ja: "三つの失われた結末がレンの手から舞い上がり、リナの中へ飛びこんだ。靴の先から髪の先まで、彼女の体に色が満ちていった。" },
  { who: "lina", face: "surprised", en: "\"Ren... I can feel my heartbeat. I haven't felt that in a hundred and twelve years.\"", ja: "「レン……心臓の音がする。112年ぶりに、感じる。」" },

  { label: "ex_true" },
  { bg: "cg_train", who: null, en: "Spring came to Ren's town. On the first day of the new school year, Mio's class was buzzing with rumors about a transfer student.", ja: "レンの町に春が来た。新学期の初日、ミオのクラスは転校生のうわさでもちきりだった。" },
  { who: null, en: "The door opened. A girl with long chestnut hair walked in. On her bag hung a small keychain shaped like an open book.", ja: "扉が開いた。長い栗色の髪の女の子が入ってきた。かばんには、開いた本の形をした小さなキーホルダーがゆれていた。" },
  { who: "lina", face: "smile", en: "\"Nice to meet you. My name is Lina. I just moved here from a town by the sea. I... really like books.\"", ja: "「はじめまして。リナです。海辺の町から引っ越してきました。わたし……本が大好きです。」" },
  { who: null, en: "She did not seem to remember Aster. But when her eyes met Mio's, she smiled as if she had found someone she had been looking for.", ja: "彼女はアスターのことを覚えていないようだった。でも、ミオと目が合ったとき、ずっと探していた人を見つけたように、ほほえんだ。" },
  { who: "mio", face: "smile", en: "\"...Hey. Do you want to eat lunch together? My brother makes terrible jokes, but he's not a bad guy.\"", ja: "「……ねえ。お昼、いっしょに食べない？うちのお兄ちゃん、冗談はひどいけど、悪いやつじゃないんだ。」" },
  { who: null, en: "That afternoon, at the station, Ren saw three people waiting on the bench: his sister, a girl with chestnut hair, and an empty space between them that seemed saved just for him.", ja: "その日の午後、駅で、レンはベンチで待つ三人を見た。妹と、栗色の髪の女の子と、そのあいだに、まるで自分のためにとっておいたような空いた席。" },
  { who: "lina", face: "smile", en: "\"Have we met before? I feel like I've been waiting for you for a very long time.\"", ja: "「前に、会ったことありますか？ずっと長いあいだ、あなたを待っていた気がするんです。」" },
  { who: "ren", face: "smile", en: "\"...Yeah. I think we have. Want to hear a long story? It's got a train, a village, a grumpy dwarf...\"", ja: "「……ああ。会ったことあると思う。長い話、聞きたいか？列車と、村と、気むずかしいドワーフが出てくるんだ……」" },
  { who: null, en: "TRUE END — Every story deserves a next chapter.", ja: "トゥルーエンド ―― すべての物語に、次の章を。" },
  { end: true }
] });

/* ---- 戦闘の強さ・装備 ---- */
GAREA2.stacks = { t: 14, mons: [105, 102, 108, 61, 74, 93] };
GAREAS.stacks = [];
GAREA2.stacks.mons.forEach((mon, i) => { const key = "stacks_" + mon; GFOES[key] = gTierFoe(mon, 14, false); GAREAS.stacks.push([key]); if (i % 2 === 0) GAREAS.stacks.push([key, key]); });
GAREAS.stacks.push(["stacks_105", "stacks_102", "stacks_108"]);
GFOES.unwritten = gTierFoe(61, 17, true, "The Unwritten", "書かれなかった者", { foe: "unwritten" });
GFOES.unwritten.hp = Math.round(GFOES.unwritten.hp * 0.85);
GBOSS_OF["The Unwritten"] = "unwritten";
GBOSSLINES.unwritten = ["The Unwritten unfolds its thousand pages. The air fills with the whispers of stories that never ended.", "書かれなかった者が千のページを広げた。終わらなかった物語のささやきが、あたりを満たしていく。", "The pages settled like snow, and the open book closed gently.", "ページは雪のように降り積もり、開いていた本がそっと閉じた。"];
Object.assign(GEQUIP, {
  dawnblade: { name: "Dawn Blade", ja: "夜明けの剣", slot: "w", who: "ren", atk: 58, price: 0 },
  helenarod: { name: "Helena's Quill", ja: "ヘレナの羽ペン", slot: "w", who: "lina", atk: 14, mag: 34, price: 0 },
  crewaxe: { name: "Crewman's Axe", ja: "船乗りの大斧", slot: "w", who: "garo", atk: 55, price: 0 },
  rosemail: { name: "Rose Armor", ja: "バラの鎧", slot: "a", who: "ren", def: 50, price: 0 },
  poemcloak: { name: "Poem Cloak", ja: "詩のマント", slot: "a", who: "lina", def: 40, mag: 15, price: 0 },
  minerplate: { name: "Ella's Plate", ja: "エラの胸当て", slot: "a", who: "garo", def: 48, price: 0 }
});

/* ---- マップ ---- */
GMAPS.stacks = { name: "Unwritten Stacks", ja: "書かれなかった書庫", bg: "library", area: "stacks", enc: { rate: 14, area: "stacks" }, intro: "ex_enter",
  build: GD(167, 6, TILE.shelfBot, TILE.floorTile, [T(119, 0), T(119, 1)], [T(119, 3)]),
  npcs: [{ id: "unwritten", sprite: "herald", at: "boss", dir: 0, talk: "ex_boss", hideIf: "ex_done" }],
  chests: [{ id: "us1", at: 0, eq: "dawnblade" }, { id: "us2", at: 1, item: "hiwater", n: 3 }, { id: "us3", at: 2, eq: "rosemail" }, { id: "us4", at: 3, item: "feather", n: 3 }],
  events: [{ at: "mid", r: 2, scene: "ex_mid", once: "ex_mid_seen" }, { bottom: true, to: ["library", "exit", null, 0] }] };
GMAPS.library.events.push({ top: true, to: ["stacks", "entry", null, 3], need: "ex_ready", block: "ex_sealed" });
GMAPS.capital.npcs.push({ id: "orwin", sprite: "oldman", x: 16, y: 11, dir: 1, talk: "ex_start", lines: "orwin_after", showIf: "ending" });
GMAPS.village.npcs.push({ id: "clara", sprite: "woman", x: 3, y: 9, dir: 0, talk: "ex_school", lines: "clara_after", showIf: "ex_started" });
GMAPS.capital.npcs.push({ id: "king_garden", sprite: "king", x: 20, y: 13, dir: 0, talk: "ex_garden", lines: "king_after", showIf: "ex_started" });
GMAPS.harbor.npcs.push({ id: "sailor_ex", sprite: "oldman", x: 21, y: 13, dir: 0, talk: "ex_harbor", lines: "sailor_after", showIf: "ex_started" });

Object.assign(GLINES, {
  orwin_after: [{ who: "scholar", en: "\"Bring back the three lost endings: the teacher in Hollowbrook, the King's garden here in the capital, and the old sailor at the harbor.\"", ja: "「三つの失われた結末を取り戻してくるのだ。ホロウブルックの先生、この王都の王の庭、そして港の老水夫だ。」" }],
  clara_after: [{ who: "teacher", en: "\"\"...but the morning always comes again.\" I'll never forget that line now.\"", ja: "「『……でも、朝はいつだってまたやってくる』。もう二度と、この一行は忘れないわ。」" }],
  king_after: [{ who: "king", en: "\"Every third one to the left. I'll remember, Seraphine.\"", ja: "「三本ごとに左へ、だな。覚えておくよ、セラフィーヌ。」" }],
  sailor_after: [{ who: "sailor", en: "\"Thirteen names on the island now. The sea will remember all of us.\"", ja: "「島には今、13人の名前がある。海は、わしら全員を覚えていてくれるじゃろう。」" }],
  ex_sealed: [{ who: "lina", en: "\"The door below is sealed. We need all three lost endings first.\"", ja: "「下の扉は封じられてる。先に、三つの失われた結末を全部集めないと。」" }]
});

Object.assign(GSCENES, {
  ex_start: gLab("ex", "ex_start", "ex_school"), ex_school: gLab("ex", "ex_school", "ex_garden"), ex_garden: gLab("ex", "ex_garden", "ex_harbor"),
  ex_harbor: gLab("ex", "ex_harbor", "ex_enter"), ex_enter: gLab("ex", "ex_enter", "ex_mid"), ex_mid: gLab("ex", "ex_mid", "ex_boss"), ex_boss: gLab("ex", "ex_boss", "ex_true"), ex_true: gLab("ex", "ex_true")
});
const gExCount = f => ["exA", "exB", "exC"].filter(k => f[k]).length;
const gExAfter = f => { if (gExCount(f) === 3) { f.ex_ready = 1; return ["The seal below the library is broken.", "三つの失われた結末がそろった！　王都の大図書館の奥（北の出口）から、書かれなかった書庫へ行ける。"]; } return ["A lost ending has been found.", "失われた結末を取り戻した（" + gExCount(f) + "/3）。"]; };
Object.assign(GDONE2, {
  ex_start: { flag: "ex_started", msg: ["Find the three lost endings.", "エクストラ章　開始！　村の学校の先生、王都の城の庭（王都の右下）、港の老水夫をたずねよう。敵は強いので、レベルは50前後が目安。"] },
  ex_school: { flag: "exA", give: ["poemcloak"], after: gExAfter },
  ex_garden: { flag: "exB", give: ["helenarod"], after: gExAfter },
  ex_harbor: { flag: "exC", give: ["crewaxe", "minerplate"], after: gExAfter },
  ex_boss: { flag: "ex_done", after: () => null },
  ex_true: { flag: "true_end", clear: "ex", after: () => { for (const h of G.st.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; } G.pendingTalk = [{ who: null, en: "Thank you for playing to the very end.", ja: "トゥルーエンド！　最後まで遊んでくれてありがとう。このあとも王都から各地を歩ける。" }]; gWarp("capital", 12, 15, 0); return null; } }
});
// 裏ボスのあとは、そのまま真のエンディングへ
GDONE2.ex_boss.after = () => { G.pendingScene = "ex_true"; gWarp("station", 7, 5, 0); return null; };
