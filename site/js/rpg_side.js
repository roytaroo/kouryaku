/* ===== 寄り道：ダンジョンに落ちている日記・手紙（GNOTES）と、サブクエスト ===== */
const gN = (id, en, ja) => ({ id, nodes: [{ who: null, en, ja }] });
const GNOTES = {
  forest: [
    { id: "stone1", kind: "stone", x: 5, y: 14, tile: T(8, 0), nodes: [{ who: null, en: "A smooth gray stone sits on the moss. Someone has painted a tiny smiling face on it.", ja: "苔の上に、すべすべした灰色の石がある。だれかが小さな笑顔を描いている。" }], done: "sq_stone" },
    { id: "stone2", kind: "stone", x: 13, y: 14, tile: T(8, 0), nodes: [{ who: null, en: "Another painted stone. This one has a drawing of an old man with a long beard.", ja: "また絵の描かれた石だ。こちらには、長いひげのおじいさんが描かれている。" }], done: "sq_stone" },
    { id: "stone3", kind: "stone", x: 10, y: 24, tile: T(8, 0), nodes: [{ who: null, en: "The last painted stone. On the back, in a child's handwriting: \"For Grandpa. Love, Tobin.\"", ja: "最後の石だ。裏に、子どもの字でこう書いてある。「おじいちゃんへ。だいすき。トビン」" }], done: "sq_stone" },
    { x: 3, y: 13, ...gN("f_note", "A torn page stuck to a tree: \"If you find this, please tell my wife I didn't run away. I got lost, and then I forgot the way home. —Henry\"", "木に貼りついた破れたページ。「これを見つけたら、妻に伝えてください。逃げたんじゃない。迷って、それから帰り道を忘れてしまったんだ。――ヘンリー」") }
  ],
  ruins: [
    { x: 3, y: 10, ...gN("r_note1", "Carved into a pillar: \"Sir Aldous was here. Again. Still waiting for orders that never come.\"", "柱に刻まれた文字。「アルダス参上。またしても。来ることのない命令を、まだ待っている」") },
    { x: 12, y: 8, ...gN("r_note2", "A faded banner. Under the dust, you can read: \"Long live Princess Amaryllis.\" Nobody remembers who she was.", "色あせた旗。ほこりの下に読める文字がある。「アマリリス王女、万歳」。それがだれだったのか、覚えている者はいない。") }
  ],
  cave: [
    gN("cv_n1", "A miner's logbook: \"Day 4,018. Found a crystal shaped like a little girl's hand. I don't know why, but I couldn't stop crying.\"", "鉱夫の作業日誌。「4018日目。小さな女の子の手の形をした水晶を見つけた。なぜだかわからないが、涙が止まらなかった」"),
    gN("cv_n2", "Scratched on the wall: \"Every crystal here was once somebody's favorite day. Be gentle when you dig.\"", "壁に刻まれた文字。「ここの水晶はどれも、かつてだれかのいちばん好きな一日だった。掘るときはやさしく」"),
    gN("cv_n3", "A child's drawing pinned under a rock: a dwarf with a huge beard holding hands with a small girl. It is signed \"Ella, age 6.\"", "石の下にはさまっていた子どもの絵。大きなひげのドワーフが、小さな女の子と手をつないでいる。「エラ、6さい」と署名がある。")
  ],
  canal: [
    gN("cn_n1", "A smuggler's price list: \"First kiss — 500 gold. Graduation day — 300. Mother's lullaby — not for sale. (Boss says no.)\"", "密輸人の値段表。「初めてのキス――500ゴールド。卒業式の日――300。母の子守歌――売り物ではない（親分がだめだと言った）」"),
    gN("cn_n2", "A wet letter: \"Dear Mom, the city is big and scary. I miss your soup. I'll come home when I've saved enough. —Pip\"", "ぬれた手紙。「お母さんへ。都会は大きくてこわいです。お母さんのスープが恋しい。お金がたまったら帰ります。――ピップ」"),
    gN("cn_n3", "Charcoal drawings on the wall, made by a child: a mother, a father, a baby, and a girl. The girl's face has been drawn again and again.", "壁に子どもが描いた炭の絵。母、父、赤ちゃん、そして女の子。女の子の顔だけが、何度も何度も描き直されている。")
  ],
  castle: [
    gN("cs_n1", "A guard's diary: \"Today the King smiled at a parade. Last year he would have cried. I'm not sure which is worse.\"", "衛兵の日記。「今日、陛下がパレードでほほえまれた。去年なら泣いておられただろう。どちらがより悪いのか、わからない」"),
    gN("cs_n2", "A gardener's note: \"The Queen asked for roses by the east wall. Nobody remembers why now. I'll plant them anyway.\"", "庭師のメモ。「王妃さまは東の壁ぞいにバラをとおっしゃった。今ではだれも理由を覚えていない。それでも植えておこう」")
  ],
  hall: [
    gN("hl_n1", "Written on a lantern's paper shade: \"My father's laugh. Please keep it warm until he wants it back.\"", "ランタンの紙のかさに書かれた文字。「父の笑い声。取り戻したくなるまで、温かくしておいてください」"),
    gN("hl_n2", "A Lantern Keeper's record: \"Flames given up this year: 41,206. Flames taken back: 3. The three were the brightest I have ever seen.\"", "灯守りの記録。「今年手放された炎：41,206。取り戻された炎：3。その3つは、わたしが見た中でいちばん明るかった」"),
    gN("hl_n3", "A child's note tied to a candle: \"I gave away the day my dog died. But now I can't remember his name. Can I have just the name back?\"", "ろうそくに結ばれた子どものメモ。「犬が死んだ日を手放しました。でも、名前が思い出せなくなりました。名前だけ返してもらえますか？」")
  ],
  library: [
    gN("lb_n1", "A note in the margin of a book, in neat handwriting: \"This story ends badly. I wrote a better one on the back page. —L.\"", "本の余白に、きれいな字で書かれたメモ。「この物語は悲しい結末。裏のページに、もっといい結末を書いておきました。――L」"),
    gN("lb_n2", "A librarian's rule, framed on the wall: \"No book is ever truly finished. It only waits for its next reader.\"", "壁に額に入れて飾られた司書の心得。「本当に終わる本などない。次の読者を待っているだけだ」"),
    gN("lb_n3", "A return slip: \"Borrowed: 'How to Say Sorry.' Due: 50 years ago. Not returned.\"", "返却票。「貸出：『ごめんなさいの言い方』。返却期限：50年前。未返却」")
  ],
  sea: [
    gN("se_n1", "A message in a bottle: \"If anyone finds this, I loved her. I never told her. Her name was Rosa.\"", "びんの中の手紙。「これをだれかが見つけたら。ぼくは彼女を愛していた。一度も言えなかった。名前はローザ」"),
    gN("se_n2", "Carved on a coral pillar: \"The sea remembers everything that falls into it. That is why it is so heavy.\"", "さんごの柱に刻まれた文字。「海は、落ちてきたものをすべて覚えている。だから、あんなに重いのだ」"),
    gN("se_n3", "A soaked page from a diary: \"Helena came to the library every day after her daughter died. She read the same picture book out loud, to no one.\"", "水にぬれた日記のページ。「ヘレナは娘を亡くしたあと、毎日図書館へ来た。同じ絵本を、だれもいない場所に向かって読み聞かせていた」")
  ],
  storm: [
    gN("st_n1", "A birthday card caught on a rock: \"Happy 80th, Grandma! We'll visit next year, promise!\" It is dated twenty years ago.", "岩に引っかかった誕生日カード。「おばあちゃん、80歳おめでとう！来年は会いに行くね、約束！」。日付は20年前だ。"),
    gN("st_n2", "A torn page from a school notebook: \"Things I want to do with Haru: 1. Art museum. 2. Beach. 3. Write a book together. 4. ...\" The rest is blank.", "学校のノートの破れたページ。「ハルとやりたいこと：1. 美術館　2. 海　3. いっしょに本を書く　4. ……」。そこから先は白紙だ。"),
    gN("st_n3", "A soldier's letter: \"If I don't come home, don't be sad for too long. But please don't forget me completely either.\"", "兵士の手紙。「もし帰れなかったら、あまり長く悲しまないでくれ。でも、完全に忘れてもしまわないでくれ」")
  ],
  gate: [
    gN("gt_n1", "A half-burned photograph: a family at a festival, all wearing paper crowns. Only the smallest child's face survived the fire.", "半分焼けた写真。お祭りで、紙の王冠をかぶった家族。いちばん小さな子の顔だけが、火の中で燃え残っている。"),
    gN("gt_n2", "Scratched into the floor: \"I came here to burn my memories. I changed my mind. I'm taking them home. —A coward who became brave\"", "床に刻まれた文字。「記憶を燃やしにここへ来た。気が変わった。家に持って帰る。――勇気を出した臆病者より」")
  ],
  throne: [
    gN("th_n1", "A sketch on a loose page: Ren as a child, asleep on the sofa with a manga on his face. Signed in tiny letters: \"Big brother, age 12. Lol.\"", "一枚の紙に描かれたスケッチ。子どものころのレンが、顔に漫画をのせてソファで寝ている。小さな字で署名がある。「お兄ちゃん、12歳。笑」"),
    gN("th_n2", "A note on the Queen's desk: \"Today I took away 3,000 sad memories. Nobody thanked me. Nobody even knows my name. That's how it should be.\"", "女王の机の上のメモ。「今日、3000の悲しい記憶を引き取った。だれもお礼を言わなかった。だれもわたしの名前を知らない。それでいいの」")
  ],
  stacks: [
    gN("us_n1", "An empty book with a single line on the first page: \"Once upon a time...\" Nothing else. It has waited for its writer for a thousand years.", "一行だけ書かれた空の本。最初のページに「むかしむかし……」。それだけ。千年、書き手を待っている。"),
    gN("us_n2", "A letter that was never sent: \"Dear Dad, I'm sorry I said I hated you. I didn't mean it. I meant—\" The writing stops.", "出されなかった手紙。「お父さんへ。大きらいって言ってごめんなさい。本気じゃなかった。本当は――」。そこで字が止まっている。"),
    gN("us_n3", "A note in Lina's handwriting, very old: \"Ending #4,117 for 'The Lonely Lighthouse': the keeper's son comes home, and they fix the light together.\"", "とても古い、リナの字のメモ。「『さびしい灯台』の結末その4117：灯台守の息子が帰ってきて、ふたりで明かりを直す」")
  ]
};

/* ===== サブクエスト ===== */
Object.assign(GEXTRA_CAST, { parent: { name: "Mother", ja: "母親" }, sister: { name: "Old Woman", ja: "老婦人" } });
const GSIDE = {
  sq_tobin: [
    { bg: "cellar", who: "ren", en: "\"Elder Bram, we found these in the forest. Three painted stones.\"", ja: "「ブラム長老、森でこれを見つけました。絵の描かれた石が三つ。」" },
    { who: "elder", en: "\"...These are Tobin's. He painted faces on the stones he found. A smile for the river, me for the mountain, and...\"", ja: "「……これはトビンのものじゃ。拾った石に顔を描いておった。川には笑顔を、山にはわしを、そして……」" },
    { who: "elder", en: "\"\"For Grandpa.\" He must have hidden them for me to find. A treasure hunt. He loved treasure hunts.\"", ja: "「『おじいちゃんへ』。わしに見つけさせようと隠しておったんじゃな。宝探しじゃ。あの子は宝探しが大好きじゃった。」" },
    { who: "elder", en: "\"I never went to look. I was too sad to walk in the forest. He waited all this time for me to find them.\"", ja: "「わしは探しに行かなんだ。悲しくて、森を歩く気になれんかった。あの子はずっと、わしが見つけるのを待っておったのに。」" },
    { who: null, en: "The old man placed the three stones on his windowsill, in a neat line, exactly where they used to be.", ja: "老人は三つの石を、昔あった場所に、きちんと一列に並べて窓辺に置いた。" },
    { who: "elder", en: "\"Thank you. Take this. It's an old charm from my own grandfather. It has protected our family for generations.\"", ja: "「ありがとう。これを持っていけ。わしの祖父から伝わる古いお守りじゃ。何代も、わしらの家を守ってきた。」" }
  ],
  sq_child: [
    { bg: "castle", who: null, en: "In front of a small house in the capital, a couple stood holding a baby. A little girl was hiding behind Garo's legs.", ja: "王都の小さな家の前に、赤ん坊を抱いた夫婦が立っていた。小さな女の子が、ガロの足のうしろに隠れていた。" },
    { who: "parent", en: "\"Can I help you? ...Oh, what a cute little girl. Is she yours?\"", ja: "「何かご用ですか？……まあ、かわいい女の子。あなたがたのお子さん？」" },
    { who: "garo", en: "\"No, ma'am. She's yours. You gave away the day your son got sick. But she was in that day too, holding his hand the whole night.\"", ja: "「いいえ、奥さん。あなたの子じゃ。息子さんが病気になった日を手放したじゃろう。だが、あの日にはこの子もいた。ひと晩じゅう、弟の手を握っておった。」" },
    { who: null, en: "The girl stepped forward and held out a charcoal drawing: a mother, a father, a baby, and a girl, all holding hands.", ja: "女の子が一歩前に出て、炭で描いた絵を差し出した。母、父、赤ちゃん、そして女の子が、みんなで手をつないでいる。" },
    { who: "parent", en: "\"...Nina? Nina! Oh, my baby. How could I— how could we ever—\"", ja: "「……ニーナ？ニーナ！ああ、わたしの子。どうしてわたしたち、どうして――」" },
    { who: "child", en: "\"It's okay, Mama. The man with the big beard promised. And his beard is very big.\"", ja: "「だいじょうぶだよ、ママ。ひげの大きいおじさんが約束してくれたの。すごく大きいひげなんだよ。」" },
    { who: "garo", en: "\"Biggest promise I've got.\"", ja: "「わしの、いちばん大きな約束じゃからな。」" }
  ],
  sq_smuggler: [
    { bg: "harbor", who: "smuggler", en: "\"Hey, you're those travelers from the waterway. Don't worry, I'm out of the business. After the castle stopped burning memories, nobody wanted to buy them anymore.\"", ja: "「おい、水路で会った旅人だな。心配すんな、もう足を洗ったよ。城が記憶を燃やさなくなってから、だれも買わなくなったんでな。」" },
    { who: "smuggler", en: "\"I've still got a cart full of jars, though. First kisses, graduations, a dog's birthday party... I don't know who they belong to.\"", ja: "「ただ、びんが荷車いっぱい残っちまってる。初めてのキス、卒業式、犬の誕生日会……だれのものかわからねえ。」" },
    { who: "lina", en: "\"Bring them to the Lantern Keeper in the castle. She can find their owners. Every memory knows its way home if someone gives it a chance.\"", ja: "「城の灯守りのところへ持っていって。持ち主を見つけてくれるわ。記憶はだれかが機会をあげれば、ちゃんと家への帰り道を知っているの。」" },
    { who: "smuggler", en: "\"...Fine. But only because you asked nicely. And here, take this. I found it in a jar nobody would buy. It's a song. Seems to be about a little boat.\"", ja: "「……わかったよ。あんたが優しく頼むからだぞ。それと、これをやる。だれも買わなかったびんに入ってたんだ。歌だよ。小さな舟の歌らしい。」" },
    { who: "ren", face: "smile", en: "\"I know someone who'll want this.\"", ja: "「これを欲しがってるやつを知ってるよ。」" }
  ],
  sq_letter: [
    { bg: "village_night", who: null, en: "Behind the inn, two old women sat side by side on a bench, reading a letter together. One of them was the passenger from the train.", ja: "宿屋の裏で、ふたりの老婦人がベンチに並んで座り、いっしょに手紙を読んでいた。ひとりは、列車で出会ったあの老婦人だった。" },
    { who: "passenger", en: "\"Young man! You made it here too. Look, I found her. My sister was living in this village all along.\"", ja: "「まあ、あなた！あなたもここへたどり着いたのね。見て、見つけたの。姉はずっとこの村に住んでいたのよ。」" },
    { who: "sister", en: "\"Fifty years, and she still writes like a child. \"I'm sorry I took your red shoes.\" That's what we fought about. A pair of red shoes.\"", ja: "「50年たっても、この子の字は子どもみたい。『赤い靴を勝手に持っていってごめんなさい』。わたしたちがけんかした理由は、それよ。赤い靴一足。」" },
    { who: "passenger", en: "\"They were very nice shoes.\"", ja: "「とってもすてきな靴だったんだもの。」" },
    { who: null, en: "The two sisters laughed until they had to wipe their eyes. Then they sat quietly, holding hands, watching the stars over Hollowbrook.", ja: "姉妹は涙をふかなければならないほど笑った。それから静かに手をつないで、ホロウブルックの星をながめていた。" },
    { who: "passenger", en: "\"Don't wait fifty years, dear. I told you that, didn't I?\"", ja: "「50年も待っちゃだめよ。前にも言ったでしょう？」" },
    { who: "ren", face: "smile", en: "\"You did. I'm not waiting.\"", ja: "「言われました。俺は待ちません。」" }
  ]
};
Object.assign(GSCENES, { sq_tobin: () => GSIDE.sq_tobin, sq_child: () => GSIDE.sq_child, sq_smuggler: () => GSIDE.sq_smuggler, sq_letter: () => GSIDE.sq_letter });
Object.assign(GITEMS, { charm: { name: "Bram's Charm", ja: "ブラムのお守り", price: 0, heal: 999, icon: 13, desc: "HPを全回復" } });
const gStonesAll = f => ["stone1", "stone2", "stone3"].every(k => f["note_" + k]);
Object.assign(GDONE2, {
  sq_stone: { after: f => gStonesAll(f) ? ["All three painted stones found.", "絵の描かれた石を3つ全部見つけた！　長老の地下室へ持っていこう。"] : ["A painted stone was found.", "絵の描かれた石を見つけた（" + ["stone1", "stone2", "stone3"].filter(k => f["note_" + k]).length + "/3）。"] },
  sq_tobin: { flag: "sq_tobin_done", after: () => { G.st.bag.charm = (G.st.bag.charm || 0) + 3; G.st.bag.feather = (G.st.bag.feather || 0) + 2; return ["Sub-quest complete!", "サブクエスト「トビンの宝探し」クリア！　ブラムのお守り×3と不死鳥の羽×2をもらった。"]; } },
  sq_child: { flag: "sq_child_done", after: () => { G.st.gold += 500; G.st.bag.hiherb = (G.st.bag.hiherb || 0) + 3; return ["Sub-quest complete!", "サブクエスト「炭で描いた家族」クリア！　500ゴールドと上薬草×3をもらった。"]; } },
  sq_smuggler: { flag: "sq_smuggler_done", after: () => { G.st.bag.hiwater = (G.st.bag.hiwater || 0) + 3; return ["Sub-quest complete!", "サブクエスト「売られなかった歌」クリア！　聖なる水×3をもらった。"]; } },
  sq_letter: { flag: "sq_letter_done", after: () => { G.st.gold += 300; return ["Sub-quest complete!", "サブクエスト「赤い靴の手紙」クリア！　300ゴールドをもらった。"]; } }
});
/* サブクエストの人 */
GMAPS.cellar.npcs[0].quests = [{ need: ["note_stone1", "note_stone2", "note_stone3"], scene: "sq_tobin" }];
GMAPS.capital.npcs.push({ id: "nina_parents", sprite: "woman", x: 8, y: 9, dir: 0, lines: "nina_after", quests: [{ need: ["c4_done"], scene: "sq_child" }] });
GMAPS.harbor.npcs.push({ id: "smuggler", sprite: "man", x: 4, y: 12, dir: 0, lines: "smuggler_after", quests: [{ need: ["c8_done"], scene: "sq_smuggler" }] });
GMAPS.village.npcs.push({ id: "sisters", sprite: "oldwoman", x: 22, y: 15, dir: 2, lines: "sisters_after", showIf: "c2_done", quests: [{ need: ["c2_done"], scene: "sq_letter" }] });
Object.assign(GLINES, {
  nina_after: [{ who: "parent", en: "\"Nina drew another picture today. This time, the man with the big beard is in it too.\"", ja: "「ニーナが今日も絵を描いたの。今度は、ひげの大きいおじさんもいっしょよ。」" }],
  smuggler_after: [{ who: "smuggler", en: "\"Honest work is boring. But I sleep better.\"", ja: "「まっとうな仕事は退屈だ。でも、よく眠れるよ。」" }],
  sisters_after: [{ who: "passenger", en: "\"We're going to buy matching red shoes tomorrow.\"", ja: "「あした、おそろいの赤い靴を買いに行くのよ。」" }]
});
// 長老には、石を見つける前にヒントを
GLINES.elder_after = [{ who: "elder", en: "\"The shrine lies beyond the forest to the north. Be careful, young man.\"", ja: "「ほこらは北の森の先じゃ。気をつけてな、若いの。」" },
  { who: "elder", en: "\"...Tobin used to hide painted stones in the forest for me to find. I never went to look. If you see any, would you bring them to me?\"", ja: "「……トビンはよく、森に絵を描いた石を隠して、わしに探させようとしておった。わしは探しに行かなんだ。もし見かけたら、持ってきてくれんか？」" }];
