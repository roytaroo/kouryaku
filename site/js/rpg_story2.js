/* ===== 『Aster Ⅰ』第3章〜第12章と終章（オリジナル） =====
   章の中は { label: "cN_xxx" } で場面に区切ってある（game_data.js の GSCENES が切り出して流す）。
   ミオが消えた理由：親友のハルを事故で亡くし、「自分のせいだ」と思いつめた。だれも自分のことで悲しまないように、
   世界から自分を消してほしいと願った。その願いがアスターに届き、彼女は「忘却の女王」になった。彼女の悲しみが「色あせ」を広げている。
   リナの秘密：リナ自身も、ずっと昔に元の世界から忘れられた人。ランタンは自分の記憶を燃やして光っている。最後に、その光で皆の記憶を取り戻す。 */
Object.assign(RPG_CAST, {
  garo: { name: "Garo", ja: "ガロ", face: "garo" },
  ella: { name: "Ella", ja: "エラ", face: "ella" },
  king: { name: "King Aldric", ja: "アルドリック王", face: "king" },
  captain: { name: "Captain Varos", ja: "ヴァロス隊長" },
  herald: { name: "The Gray Herald", ja: "灰色の使者" },
  sailor: { name: "Old Sailor", ja: "老水夫" },
  queen: { name: "Queen of Oblivion", ja: "忘却の女王", face: "queen" }
});

RPG_CHAPTERS.push(
/* ───────────────────────── 第3章 ───────────────────────── */
{ id: "c3", title: "Chapter 3: The Crystal Caves", ja: "第3章　水晶の洞窟", nodes: [
  { label: "c3_enter" },
  { bg: "cave", who: null, en: "Behind the ruined gate, a tunnel led deep into the mountain. The walls were covered with crystals that glowed a pale blue.", ja: "崩れた門の奥には、山の深くへ続くトンネルがあった。壁は青白く光る水晶でおおわれていた。" },
  { who: "lina", face: "surprised", en: "\"These are memory crystals. When people forget something, the memory sinks into the earth and slowly turns to stone.\"", ja: "「これは記憶の水晶よ。人が何かを忘れると、その記憶は地面にしみこんで、ゆっくり石になるの。」" },
  { who: "ren", en: "\"So this whole cave is made of things people have forgotten?\"", ja: "「じゃあ、この洞窟全部が、人が忘れたものでできてるのか？」" },
  { who: "lina", face: "sad", en: "\"Yes. Somewhere in here, there may even be a memory of your sister.\"", ja: "「そう。このどこかに、妹さんの記憶だってあるかもしれない。」" },
  { label: "c3_camp" },
  { who: null, en: "In a wide chamber, an old dwarf was swinging a pickaxe at the wall. Next to him lay a pile of crystals and a half-finished traveling coat.", ja: "広い空洞で、年老いたドワーフが壁にツルハシを振るっていた。そばには水晶の山と、作りかけの旅の上着が置いてあった。" },
  { who: "garo", en: "\"Visitors? Hmph. If you've come to steal crystals, you'll have to get past my axe first.\"", ja: "「客か？ふん。水晶を盗みに来たのなら、まずはわしの斧を越えてもらおうか。」" },
  { who: "lina", en: "\"We're not thieves. We're looking for a girl who passed through here a year ago.\"", ja: "「わたしたちは泥棒じゃありません。1年前にここを通った女の子を探しているんです。」" },
  { who: "garo", en: "\"A girl...? There was one. She cried in front of the deepest crystal for a whole night. I couldn't stand it, so I gave her my lamp.\"", ja: "「女の子……？いたな。いちばん奥の水晶の前で、ひと晩じゅう泣いておった。見ていられなくて、わしのランプを貸してやったんじゃ。」" },
  { who: "ren", face: "surprised", en: "\"That has to be Mio! Where did she go?\"", ja: "「それ、ミオにちがいない！どこへ行ったんだ？」" },
  { who: "garo", en: "\"Deeper. Toward the Heart Crystal, where the oldest memories sleep. But a guardian lives there now, and it attacks anyone who comes near.\"", ja: "「もっと奥じゃ。いちばん古い記憶が眠る『心臓の水晶』のほうへな。だが今はそこに番人がいて、近づく者をだれでも襲う。」" },
  { who: "ren", en: "\"Then I'll go anyway.\"", ja: "「それでも行く。」" },
  { who: "garo", en: "\"...You remind me of someone. I can't remember who. Bah. Fine, I'll come with you. Somebody has to keep you two alive.\"", ja: "「……おまえを見ていると、だれかを思い出す。だれだったかは思い出せんが。ちっ。いいだろう、ついていってやる。だれかがおまえたちを死なせんようにせねばな。」" },
  { who: null, en: "Garo picked up his axe and the unfinished coat. He folded the coat carefully, as if it were precious, and put it in his bag.", ja: "ガロは斧と、作りかけの上着を手に取った。上着を大切なもののようにていねいにたたんで、袋にしまった。", flag: "garo_joined" },
  { label: "c3_boss" },
  { who: null, en: "At the bottom of the cave stood a giant crystal shaped like a beating heart. In front of it, the ice began to move and rise.", ja: "洞窟の底には、脈打つ心臓のような形の巨大な水晶があった。その前で、氷が動き、立ち上がり始めた。" },
  { who: "garo", en: "\"The guardian! Stay sharp, both of you!\"", ja: "「番人だ！ふたりとも、気を抜くな！」" },
  { battle: { name: "Glacier Titan", ja: "氷河の巨人", mon: 101, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The titan cracked and collapsed. In the falling ice, Ren's school uniform had been torn to pieces.", ja: "巨人はひび割れ、崩れ落ちた。降りそそぐ氷の中で、レンの学生服はぼろぼろに裂けていた。" },
  { who: "garo", en: "\"Your clothes are ruined. Here... take this coat. I was making it for someone, but I can't remember who it was for.\"", ja: "「服がだめになったな。ほれ……この上着を着ろ。だれかのために作っていたんじゃが、それがだれだったか思い出せんのじゃ。」" },
  { who: null, en: "When Ren put on the coat, the Heart Crystal shone. Inside it, images floated: a small girl laughing on Garo's shoulders.", ja: "レンが上着をはおると、心臓の水晶が輝いた。その中に映像が浮かんだ。ガロの肩車で笑う、小さな女の子の姿だった。", flag: "ren_coat" },
  { who: "garo", en: "\"...Ella. My daughter, Ella. How could I have forgotten you?\"", ja: "「……エラ。わしの娘、エラじゃ。どうして、おまえを忘れておったんじゃ。」" },
  { who: "garo", en: "\"She left for the capital years ago to work at the Great Library. I promised I'd finish this coat before she came home.\"", ja: "「何年も前に、大図書館で働くために王都へ行ったんじゃ。あの子が帰ってくるまでに、この上着を仕上げると約束したのに。」" },
  { who: "lina", face: "sad", en: "\"Then let's go to the capital together. Your daughter and Ren's sister may both be there.\"", ja: "「なら、いっしょに王都へ行きましょう。娘さんも、レンの妹さんも、きっとそこにいるわ。」" },
  { who: null, en: "Lina smiled, but her lantern flickered again. This time, for a moment, it went completely dark.", ja: "リナはほほえんだ。でもランタンがまたゆらいだ。今度は一瞬、完全に消えてしまった。" },
  { end: true }
] },

/* ───────────────────────── 第4章 ───────────────────────── */
{ id: "c4", title: "Chapter 4: Under the Capital", ja: "第4章　王都の地下水路", nodes: [
  { label: "c4_enter" },
  { bg: "canal", who: null, en: "The gates of the capital were shut. Guards turned away everyone except people who came to give up their memories.", ja: "王都の門は閉ざされていた。衛兵たちは、記憶を差し出しに来た人以外は、だれも中へ入れなかった。" },
  { who: "garo", en: "\"There's an old waterway under the walls. Miners like me used it to carry crystals into the city.\"", ja: "「城壁の下に古い水路がある。わしら鉱夫が、水晶を街へ運ぶのに使っておった道じゃ。」" },
  { who: null, en: "The waterway was dark and cold. Water dripped from the ceiling, and the sound echoed endlessly.", ja: "水路は暗く、冷たかった。天井から水がしたたり、その音がいつまでも響いていた。" },
  { label: "c4_mid" },
  { who: "ren", en: "\"Lina, your lantern went out back in the cave. What's happening to it?\"", ja: "「リナ、洞窟でランタンが消えたよな。あれ、どうなってるんだ？」" },
  { who: "lina", face: "sad", en: "\"...It's fine. It just gets tired sometimes, like people do.\"", ja: "「……大丈夫。ときどき疲れるだけ。人と同じよ。」" },
  { choice: { en: "What does Ren say?", ja: "レンはどう言う？" }, opts: [
    { en: "\"You're lying. Tell me the truth.\"", ja: "「うそだな。本当のことを言ってくれ。」", go: "c4_truth", flag: "pressed" },
    { en: "\"Okay. But don't push yourself.\"", ja: "「わかった。でも、無理はするなよ。」", go: "c4_soft" }
  ] },
  { label: "c4_truth" },
  { who: "lina", face: "sad", en: "\"...The lantern burns my own memories to make light. Every time I use it, I lose a little of who I am.\"", ja: "「……このランタンは、わたし自身の記憶を燃やして光るの。使うたびに、わたしは自分を少しずつ失っていく。」" },
  { who: "ren", face: "surprised", en: "\"Then stop using it! I don't want you to disappear for my sake!\"", ja: "「じゃあ使うのをやめろ！俺のために、きみが消えるなんて嫌だ！」" },
  { who: "lina", face: "smile", en: "\"I chose this myself, Ren. Please let me keep my promise.\"", ja: "「これは自分で選んだことなの、レン。お願い、約束を守らせて。」" },
  { go: "c4_on" },
  { label: "c4_soft" },
  { who: "lina", face: "smile", en: "\"Thank you. I'll tell you everything someday. Just not yet.\"", ja: "「ありがとう。いつか全部話すね。でも、今はまだ。」" },
  { label: "c4_on" },
  { label: "c4_boss" },
  { who: null, en: "Near the exit, the water began to swirl. Long arms rose from the dark water and blocked the way.", ja: "出口の近くで、水が渦を巻き始めた。暗い水の中から長い腕が伸びて、行く手をふさいだ。" },
  { who: "garo", en: "\"The beast of the waterway! It swallows anything that falls into the canal!\"", ja: "「水路の怪物じゃ！水路に落ちたものは、なんでも飲みこんでしまう！」" },
  { battle: { name: "Canal Kraken", ja: "水路のクラーケン", mon: 11, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The kraken sank back into the water. A ladder led up to a grate, and through it they could see the white towers of the capital.", ja: "クラーケンは水の中へ沈んでいった。はしごが格子へと続いていて、そのすき間から王都の白い塔が見えた。" },
  { end: true }
] },

/* ───────────────────────── 第5章 ───────────────────────── */
{ id: "c5", title: "Chapter 5: The White Castle", ja: "第5章　白い城", nodes: [
  { label: "c5_enter" },
  { bg: "castle", who: null, en: "The capital was beautiful and silent. People walked slowly, smiling, with empty eyes.", ja: "王都は美しく、静まり返っていた。人々はゆっくりと歩き、ほほえんでいたが、その目はうつろだった。" },
  { who: "ren", en: "\"Why does everyone look so happy?\"", ja: "「なんでみんな、あんなに幸せそうなんだ？」" },
  { who: "lina", face: "sad", en: "\"Because they gave away their painful memories. The King's decree says that forgetting is mercy.\"", ja: "「つらい記憶を差し出したからよ。王の布告では、忘れることこそ慈悲なんですって。」" },
  { who: "garo", en: "\"Mercy? A man who forgets his own daughter isn't saved. He's just empty.\"", ja: "「慈悲じゃと？自分の娘を忘れた男は、救われてなどおらん。ただ、からっぽなだけじゃ。」" },
  { who: "lina", en: "\"Let's get ready before we go to the castle. There are good shops in this city.\"", ja: "「城へ行く前に、準備をしましょう。この街にはいいお店があるわ。」" },
  { label: "c5_boss" },
  { bg: "hall", who: null, en: "In the great hall of the White Castle, King Aldric sat on his throne. His face was calm, like a lake with no wind.", ja: "白い城の大広間で、アルドリック王は玉座に座っていた。その顔は、風のない湖のように静かだった。" },
  { who: "king", en: "\"Travelers. I heard you are searching for a girl. Why carry such a heavy memory? Let it go, and you will finally be at peace.\"", ja: "「旅の者たちよ。少女を探しているそうだな。なぜそのように重い記憶を背負う？手放せば、ようやく安らぎが得られるのだ。」" },
  { who: "ren", en: "\"You're the one who ordered people to forget!\"", ja: "「人に忘れろと命じたのは、あんただろ！」" },
  { who: "king", en: "\"I lost my queen many years ago. For years, every morning hurt. Then a girl in white offered to take my grief away. I accepted.\"", ja: "「わたしは何年も前に王妃を亡くした。何年も、毎朝がつらかった。そこへ白い服の少女が、悲しみを持っていってあげると申し出た。わたしは受け入れた。」" },
  { who: "king", en: "\"Now I can't even remember her face. And I feel... nothing at all. Isn't that wonderful?\"", ja: "「今では王妃の顔さえ思い出せぬ。そして、何も……何も感じない。すばらしいことではないか？」" },
  { choice: { en: "How does Ren answer the King?", ja: "レンは王にどう答える？" }, opts: [
    { en: "\"That isn't peace. You just gave up loving her.\"", ja: "「それは安らぎじゃない。あんたは、彼女を愛するのをやめただけだ。」", go: "c5_fight", flag: "told_king" },
    { en: "\"Where is the girl in white?\"", ja: "「白い服の少女はどこにいる？」", go: "c5_fight" }
  ] },
  { label: "c5_fight" },
  { who: "king", en: "\"...Captain Varos. These travelers are disturbing the peace. Take their memories.\"", ja: "「……ヴァロス隊長。この旅人たちは安らぎを乱している。記憶を奪え。」" },
  { who: "captain", en: "\"Yes, Your Majesty. Forgive me, travelers. Orders are orders.\"", ja: "「はっ、陛下。許せ、旅人よ。命令は命令だ。」" },
  { battle: { name: "Captain Varos", ja: "ヴァロス隊長", mon: 64, boss: true }, vocab: 2, qs: [] },
  { who: "captain", en: "\"...Strange. When your sword hit my armor, I remembered my mother's voice. I had forgotten it.\"", ja: "「……ふしぎだ。おまえの剣がわたしの鎧に当たったとき、母の声を思い出した。忘れていたのに。」" },
  { if: "told_king", go: "c5_king" },
  { who: "king", en: "\"Enough. Leave my castle. ...Go, before I change my mind.\"", ja: "「もうよい。城から去れ。……行け。わたしの気が変わらぬうちに。」" },
  { go: "c5_out" },
  { label: "c5_king" },
  { who: "king", en: "\"\"You just gave up loving her\"... Those words hurt. Why do they hurt, if I feel nothing?\"", ja: "「『彼女を愛するのをやめただけだ』……その言葉が痛む。何も感じぬはずなのに、なぜ痛むのだ。」" },
  { label: "c5_out" },
  { who: "lina", en: "\"The girl in white went to the Hall of Lanterns, deep inside the castle. I'm sure of it.\"", ja: "「白い服の少女は、城の奥の『灯の回廊』へ行ったはずよ。まちがいない。」" },
  { end: true }
] },

/* ───────────────────────── 第6章 ───────────────────────── */
{ id: "c6", title: "Chapter 6: The Hall of Lanterns", ja: "第6章　灯の回廊", nodes: [
  { label: "c6_enter" },
  { bg: "night_hall", who: null, en: "The Hall of Lanterns was a long corridor lit by thousands of tiny flames. Each flame was a memory someone had given up.", ja: "灯の回廊は、何千もの小さな炎に照らされた長い廊下だった。炎のひとつひとつが、だれかが手放した記憶だった。" },
  { who: "garo", en: "\"So many... Is Ella's memory of me burning here too?\"", ja: "「こんなに……。エラがわしを覚えていた記憶も、ここで燃えておるのか。」" },
  { label: "c6_mid" },
  { who: null, en: "At the end of the corridor, a pale figure appeared. It was a girl with a blue ribbon, but she was transparent, like a reflection on glass.", ja: "廊下の奥に、白っぽい人影が現れた。青いリボンの少女だった。でもその姿は、ガラスに映った影のように透き通っていた。" },
  { who: "mio", face: "sad", en: "\"Ren. Please go home. You're the only one who still remembers me, and that's why you're the only one who still hurts.\"", ja: "「レン。お願い、帰って。わたしを覚えているのはもうお兄ちゃんだけ。だから、まだ苦しんでいるのもお兄ちゃんだけなの。」" },
  { who: "ren", face: "surprised", en: "\"Mio! What are you saying? Come home with me!\"", ja: "「ミオ！何言ってるんだ？いっしょに帰るぞ！」" },
  { who: "mio", face: "sad", en: "\"I can't. I did something unforgivable. If everyone forgets me, nobody will ever have to be sad because of me again.\"", ja: "「無理だよ。わたし、許されないことをしたの。みんながわたしを忘れれば、もうだれも、わたしのせいで悲しまなくてすむ。」" },
  { who: null, en: "The image of Mio faded. In her place, a figure in a gray cloak rose from the shadows.", ja: "ミオの姿は消えた。その代わりに、影の中から灰色のマントの人影が立ち上がった。" },
  { label: "c6_boss" },
  { who: "herald", en: "\"The Queen has spoken. Turn back, brother of the Queen, or I will burn your memories with the rest.\"", ja: "「女王はおっしゃった。引き返せ、女王の兄よ。さもなくば、おまえの記憶もほかと共に燃やしてやろう。」" },
  { who: "ren", en: "\"Queen? ...Mio is the Queen?\"", ja: "「女王？……ミオが、女王だっていうのか？」" },
  { battle: { name: "The Gray Herald", ja: "灰色の使者", mon: 86, boss: true }, vocab: 2, qs: [] },
  { who: "herald", en: "\"...Then go. Go to the Great Library. Read what she wished for. And then decide whether you still want to drag her home.\"", ja: "「……ならば行け。大図書館へ行き、あの方が何を願ったのかを読むがいい。そのうえで、まだ連れ戻したいのか決めるのだな。」" },
  { who: null, en: "The herald dissolved into ash. The thousands of flames in the hall trembled, and a few of them drifted out of the window like fireflies.", ja: "使者は灰になって消えた。回廊の何千もの炎がふるえ、そのいくつかが、ほたるのように窓の外へ流れていった。" },
  { end: true }
] },

/* ───────────────────────── 第7章 ───────────────────────── */
{ id: "c7", title: "Chapter 7: The Great Library", ja: "第7章　大図書館", nodes: [
  { label: "c7_enter" },
  { bg: "library", who: null, en: "The Great Library was filled with golden light. Shelves rose higher than any tower, and the air smelled of old paper.", ja: "大図書館は金色の光に満ちていた。本棚はどんな塔よりも高くそびえ、空気は古い紙のにおいがした。" },
  { who: "lina", face: "smile", en: "\"This is where I grew up. Every forgotten story in Aster is kept here, so that someone, someday, can read it again.\"", ja: "「ここでわたしは育ったの。アスターで忘れられた物語は全部ここにしまってある。いつか、だれかがまた読めるように。」" },
  { label: "c7_mid" },
  { who: null, en: "In the deepest room, Lina took down a thin book. Its cover read: \"The Wish of Mio Amane.\"", ja: "いちばん奥の部屋で、リナは薄い本を取り出した。表紙にはこう書かれていた。「天音ミオの願い」。" },
  { who: "lina", face: "sad", en: "\"A year ago, Mio's best friend, Haru, was in an accident. Mio had asked her to come out that day. She believed it was her fault.\"", ja: "「1年前、ミオの親友のハルが事故にあったの。その日、ハルを呼び出したのはミオだった。ミオは、自分のせいだと思いこんだ。」" },
  { who: "lina", face: "sad", en: "\"She wished: \"Let everyone forget me, so that no one will ever be hurt by me again.\" The wish was so strong that it reached Aster.\"", ja: "「彼女は願った。『みんながわたしを忘れますように。もう二度と、だれもわたしのせいで傷つかないように』。その願いがあまりにも強くて、アスターまで届いたの。」" },
  { who: "ren", face: "sad", en: "\"...She never told me. I was right next to her, and I didn't notice anything.\"", ja: "「……何も言わなかったんだ。俺はすぐそばにいたのに、何も気づかなかった。」" },
  { who: "garo", en: "\"Children hide the heaviest things best. That's not your sin, boy.\"", ja: "「子どもは、いちばん重いものほど上手に隠すんじゃ。おまえの罪じゃないぞ、坊主。」" },
  { who: "lina", en: "\"There's one more page. Her sadness became the Fading. As long as she wants to forget, all of Aster will keep forgetting too.\"", ja: "「もう1ページあるの。彼女の悲しみが『色あせ』になった。彼女が忘れたいと願い続けるかぎり、アスター全体も忘れ続けるの。」" },
  { label: "c7_boss" },
  { who: null, en: "Suddenly, the ink on every page began to run. Letters crawled off the paper and gathered into a huge shape with too many arms.", ja: "突然、すべてのページのインクが流れ始めた。文字が紙からはい出し、腕の多すぎる巨大な形に集まった。" },
  { who: "lina", face: "surprised", en: "\"The Ink Weaver! It's trying to erase her book!\"", ja: "「インクの織り手よ！あの子の本を消そうとしてる！」" },
  { battle: { name: "Ink Weaver", ja: "インクの織り手", mon: 61, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "When the monster fell, the ink returned to the pages. Among the books, a librarian's card slipped out and landed at Ren's feet.", ja: "怪物が倒れると、インクはページに戻った。本のあいだから一枚の図書館の名札がすべり落ちて、レンの足元に落ちた。" },
  { who: null, en: "It said: \"Apprentice: Lina. Arrived in Aster: 112 years ago.\"", ja: "そこにはこう書かれていた。「見習い：リナ。アスター到着：112年前」。" },
  { who: "ren", face: "surprised", en: "\"Lina... a hundred and twelve years?\"", ja: "「リナ……112年って？」" },
  { who: "lina", face: "sad", en: "\"I was forgotten by my world too, long ago. That's why I wanted to help you. I didn't want anyone else to end up like me.\"", ja: "「わたしも、ずっと昔に自分の世界から忘れられたの。だからあなたを助けたかった。わたしみたいになる人を、もう出したくなかったから。」" },
  { who: "lina", en: "\"The Queen's castle floats above the Storm Sea. To reach it, we need the First Page from the Sunken Archive. Let's go to the harbor.\"", ja: "「女王の城は、嵐の海の上に浮かんでいる。そこへ行くには、沈んだ書庫にある『最初のページ』が必要なの。港へ行きましょう。」" },
  { end: true }
] },

/* ───────────────────────── 第8章 ───────────────────────── */
{ id: "c8", title: "Chapter 8: The Harbor Town", ja: "第8章　港町", nodes: [
  { label: "c8_enter" },
  { bg: "harbor", who: null, en: "The harbor town smelled of salt and tar. Ships with gray sails rocked quietly in the evening light.", ja: "港町は潮とタールのにおいがした。灰色の帆の船が、夕方の光の中で静かにゆれていた。" },
  { who: "sailor", en: "\"The Sunken Archive? Nobody sails there anymore. A giant whale guards the beach, and the sea beyond it is full of monsters.\"", ja: "「沈んだ書庫だと？もうだれもあそこへは船を出さん。浜辺を巨大なクジラが守っていて、その先の海は魔物だらけだ。」" },
  { label: "c8_mid" },
  { who: null, en: "In front of the warehouse, a young woman was counting boxes. When she looked up, Garo dropped his axe.", ja: "倉庫の前で、若い女性が木箱を数えていた。彼女が顔を上げたとき、ガロは斧を取り落とした。" },
  { who: "garo", en: "\"Ella...!\"", ja: "「エラ……！」" },
  { who: "ella", en: "\"I'm sorry, sir. Do I know you?\"", ja: "「すみません、どちらさまでしょう？」" },
  { who: null, en: "Garo's hands shook. Then he took out the Memory Shard from the cave and placed it gently in her palm.", ja: "ガロの手はふるえていた。それから彼は洞窟の記憶のかけらを取り出し、そっと彼女の手のひらにのせた。" },
  { who: null, en: "Light filled the shard. A small girl laughing on her father's shoulders. A promise about a coat. A mountain full of blue crystals.", ja: "かけらが光で満ちた。父親の肩車で笑う小さな女の子。上着についての約束。青い水晶でいっぱいの山。" },
  { who: "ella", en: "\"...Papa? Papa, it's you! I forgot you... I forgot you, and you never forgot me!\"", ja: "「……父さん？父さんなのね！わたし、父さんを忘れてた……忘れてたのに、父さんはわたしを忘れなかったのね！」" },
  { who: "garo", en: "\"I did forget, Ella. But a stubborn boy reminded me. I'm sorry the coat went to him.\"", ja: "「わしも忘れておったよ、エラ。じゃが、頑固な坊主が思い出させてくれた。上着はそいつにやってしまったがな、すまん。」" },
  { who: "ren", face: "smile", en: "\"I'll give it back when this is over. Promise.\"", ja: "「全部終わったら返すよ。約束する。」" },
  { label: "c8_boss" },
  { bg: "beach", who: null, en: "On the beach, the waves rose like a wall, and a golden whale burst out of the sea.", ja: "浜辺で波が壁のように立ち上がり、金色のクジラが海から飛び出した。" },
  { who: "lina", en: "\"It's guarding the path to the Archive! We have to get past it!\"", ja: "「書庫への道を守ってる！ここを突破しなきゃ！」" },
  { battle: { name: "Golden Whale", ja: "黄金のクジラ", mon: 67, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The whale sank slowly, and the sea split open, revealing a stone stairway leading down beneath the waves.", ja: "クジラはゆっくりと沈み、海が左右に割れた。波の下へと続く石の階段が現れた。" },
  { end: true }
] },

/* ───────────────────────── 第9章 ───────────────────────── */
{ id: "c9", title: "Chapter 9: The Sunken Archive", ja: "第9章　沈んだ書庫", nodes: [
  { label: "c9_enter" },
  { bg: "sea", who: null, en: "Under the sea, the ruins of an ancient library stood in silence. Fish swam between the pillars like readers who had lost their way.", ja: "海の底で、古代の図書館の跡が静まり返っていた。魚たちが、道に迷った読者のように柱のあいだを泳いでいた。" },
  { who: "lina", en: "\"My lantern keeps the water away from us. Stay close to me.\"", ja: "「わたしのランタンが、水をわたしたちから遠ざけてる。そばを離れないで。」" },
  { label: "c9_mid" },
  { who: "ren", en: "\"Lina, you're using the lantern constantly. How much of yourself is left?\"", ja: "「リナ、ずっとランタンを使ってるだろ。きみ自身は、あとどれくらい残ってるんだ？」" },
  { who: "lina", face: "sad", en: "\"I've already forgotten my mother's name. And the town where I was born. But I still remember you, Ren. That's enough.\"", ja: "「お母さんの名前は、もう忘れちゃった。生まれた町も。でも、あなたのことはまだ覚えてる、レン。それで十分よ。」" },
  { choice: { en: "What does Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Take her hand and say, \"Then I'll remember you, for both of us.\"", ja: "彼女の手を取って言う。「なら、ふたり分、俺がきみを覚えてる。」", go: "c9_hand", flag: "held_hand" },
    { en: "Stay silent, unable to find the words.", ja: "言葉が見つからず、黙ってしまう。", go: "c9_quiet" }
  ] },
  { label: "c9_hand" },
  { who: "lina", face: "smile", en: "\"...That's the nicest promise anyone has ever made me.\"", ja: "「……それ、今までだれかにもらった中で、いちばんすてきな約束。」" },
  { go: "c9_go" },
  { label: "c9_quiet" },
  { who: "lina", face: "smile", en: "\"It's okay. You don't have to say anything. Just keep walking with me.\"", ja: "「いいの。何も言わなくていい。ただ、いっしょに歩いて。」" },
  { label: "c9_go" },
  { label: "c9_boss" },
  { who: null, en: "In the central hall, the First Page floated inside a bubble of light. Around it coiled a dragon made of deep blue water.", ja: "中央の広間で、『最初のページ』が光の泡の中に浮かんでいた。そのまわりに、深い青の水でできた竜がとぐろを巻いていた。" },
  { battle: { name: "Abyss Wyrm", ja: "深淵の竜", mon: 88, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "When the wyrm fell, the bubble burst. The First Page drifted down into Ren's hands. On it was a child's drawing: two stick figures holding hands.", ja: "竜が倒れると、泡がはじけた。『最初のページ』がひらひらとレンの手に落ちてきた。そこには子どもの絵が描かれていた。手をつないだ、ふたりの棒人間。" },
  { who: "ren", face: "sad", en: "\"I remember this. Mio drew it when she was six. \"Me and big brother.\" She said I'd always find her when we played hide-and-seek.\"", ja: "「覚えてる。ミオが6歳のときに描いた絵だ。『わたしとお兄ちゃん』。かくれんぼのとき、お兄ちゃんはいつもわたしを見つけてくれるって言ってた。」" },
  { who: "ren", en: "\"I promised her I always would. I'm not breaking that promise now.\"", ja: "「いつでも見つけるって、俺は約束したんだ。今その約束を破るつもりはない。」" },
  { end: true }
] },

/* ───────────────────────── 第10章 ───────────────────────── */
{ id: "c10", title: "Chapter 10: The Storm Sky", ja: "第10章　嵐の空", nodes: [
  { label: "c10_enter" },
  { bg: "storm", who: null, en: "The First Page glowed, and a staircase of light rose into the storm clouds. Lightning tore across the sky.", ja: "『最初のページ』が光り、光の階段が嵐の雲の中へと伸びていった。稲妻が空を引き裂いた。" },
  { who: "garo", en: "\"So the Queen lives above the clouds. Well, I've climbed worse mountains.\"", ja: "「女王は雲の上に住んでおるのか。まあ、もっとひどい山も登ってきたわい。」" },
  { label: "c10_mid" },
  { who: null, en: "Halfway up, the stairs narrowed into a single bridge of light. Behind them, a swarm of storm monsters was coming fast.", ja: "途中で、階段は一本の光の橋へと細くなった。うしろから、嵐の魔物の群れが迫ってきていた。" },
  { who: "garo", en: "\"Go on ahead, you two. I'll hold the bridge.\"", ja: "「ふたりとも、先に行け。わしが橋を守る。」" },
  { who: "ren", face: "surprised", en: "\"Garo, no! There are too many of them!\"", ja: "「ガロ、だめだ！数が多すぎる！」" },
  { who: "garo", en: "\"I promised Ella I'd come home, and I'm a man who keeps his promises now. Go! Find your sister!\"", ja: "「エラに帰ると約束したんじゃ。わしはもう、約束を守る男なんじゃよ。行け！妹を見つけてこい！」" },
  { who: null, en: "Garo's axe flashed in the lightning. Ren and Lina ran up the bridge without looking back.", ja: "稲妻の中でガロの斧がひらめいた。レンとリナは、振り返らずに橋を駆け上がった。" },
  { label: "c10_boss" },
  { who: null, en: "At the top of the storm, a lion made of thunder blocked the gate to the floating castle.", ja: "嵐のいただきで、雷でできた獅子が、浮かぶ城の門の前に立ちはだかった。" },
  { battle: { name: "Thunder Lion", ja: "雷獅子", mon: 100, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "As the lion vanished, Garo came limping up the bridge, covered in scratches, but grinning.", ja: "獅子が消えると、ガロが傷だらけで、足を引きずりながら、それでもにやりと笑って橋を上がってきた。" },
  { who: "garo", en: "\"Told you. I keep my promises.\"", ja: "「言ったじゃろ。わしは約束を守るんじゃ。」" },
  { end: true }
] },

/* ───────────────────────── 第11章 ───────────────────────── */
{ id: "c11", title: "Chapter 11: The Gate of Flame", ja: "第11章　炎の門", nodes: [
  { label: "c11_enter" },
  { bg: "gate", who: null, en: "Inside the floating castle, the halls burned with fire that gave no heat. It was the fire of memories being destroyed.", ja: "浮かぶ城の中では、熱のない炎が広間を燃やしていた。記憶が壊されていく炎だった。" },
  { who: "lina", face: "sad", en: "\"Every memory in Aster is burning here. If we don't hurry, there'll be nothing left to save.\"", ja: "「アスター中の記憶が、ここで燃えてる。急がないと、救えるものが何も残らなくなる。」" },
  { label: "c11_mid" },
  { who: null, en: "Someone was standing in the flames, pouring water from a silver jug again and again. It was King Aldric.", ja: "炎の中にだれかが立っていて、銀の水差しで何度も何度も水をかけていた。アルドリック王だった。" },
  { who: "king", en: "\"Your words would not leave me, boy. So I came to take back my queen's memory. I found her face in these flames.\"", ja: "「おまえの言葉が頭から離れなかったのだ、少年。だから王妃の記憶を取り戻しに来た。この炎の中に、あの人の顔を見つけたのだ。」" },
  { who: "king", en: "\"It hurts. It hurts terribly. But I would rather hurt than forget her. Go. I will keep this gate open for you.\"", ja: "「痛む。ひどく痛む。だが、彼女を忘れるよりは、痛むほうがいい。行け。この門は、わたしが開けておこう。」" },
  { label: "c11_boss" },
  { who: null, en: "Before the last door stood a beast of ash and embers, its eyes burning with the anger of a thousand forgotten things.", ja: "最後の扉の前に、灰と燃えさしでできた獣が立っていた。その目は、忘れられた千のものの怒りで燃えていた。" },
  { battle: { name: "Gatekeeper of Ash", ja: "灰の門番", mon: 80, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The gatekeeper crumbled into ash. Beyond the door, a cold white light was waiting.", ja: "門番は灰になって崩れた。扉の向こうで、冷たく白い光が待っていた。" },
  { end: true }
] },

/* ───────────────────────── 第12章 ───────────────────────── */
{ id: "c12", title: "Chapter 12: The Queen of Oblivion", ja: "第12章　忘却の女王", nodes: [
  { label: "c12_enter" },
  { bg: "throne", who: null, en: "The throne room was white and empty. Gray snow fell from the ceiling, and every flake was a memory losing its color.", ja: "玉座の間は白く、がらんとしていた。天井から灰色の雪が降っていて、そのひとひらひとひらが、色を失っていく記憶だった。" },
  { label: "c12_boss" },
  { who: null, en: "On the throne sat a girl in a white and gray dress. Only the ribbon in her hair was still blue.", ja: "玉座には、白と灰色のドレスの少女が座っていた。髪のリボンだけが、まだ青かった。" },
  { who: "queen", face: "sad", en: "\"You came all this way. Even though I asked you not to.\"", ja: "「こんなところまで来たんだね。来ないでって、頼んだのに。」" },
  { who: "ren", en: "\"I found you, Mio. Just like I promised. Hide-and-seek is over. Let's go home.\"", ja: "「見つけたぞ、ミオ。約束どおりだ。かくれんぼは終わりだ。帰ろう。」" },
  { who: "queen", face: "sad", en: "\"I can't go home! Haru is gone because of me! If I go back, everyone will look at me and remember!\"", ja: "「帰れないよ！ハルはわたしのせいでいなくなったの！帰ったら、みんながわたしを見て、思い出すんだよ！」" },
  { who: null, en: "The gray snow became a blizzard. The Queen rose, and the storm of forgetting rushed toward them.", ja: "灰色の雪が吹雪になった。女王が立ち上がり、忘却の嵐がふたりに襲いかかった。" },
  { battle: { name: "Queen of Oblivion", ja: "忘却の女王", foe: "queen", mon: 74, boss: true, final: true }, vocab: 3, qs: [] },
  { who: null, en: "The blizzard stopped. Mio fell to her knees, crying like the little girl in the drawing.", ja: "吹雪がやんだ。ミオはひざから崩れ落ち、あの絵の中の小さな女の子のように泣いていた。" },
  { who: "ren", face: "sad", en: "\"It wasn't your fault, Mio. And even if it were, I'd still want you here. Being remembered means being loved, even when it hurts.\"", ja: "「おまえのせいじゃない、ミオ。もしそうだったとしても、俺はおまえにいてほしい。覚えていてもらえるってことは、愛されてるってことなんだ。たとえ痛くても。」" },
  { who: "lina", face: "smile", en: "\"Ren. Mio. It's time for me to keep my promise.\"", ja: "「レン。ミオ。わたしが約束を守る番ね。」" },
  { who: null, en: "Lina raised her lantern. It burned brighter than it ever had, and golden light poured out across the whole of Aster.", ja: "リナがランタンを高く掲げた。それは今までにないほど明るく燃え、金色の光がアスター全体へと流れ出した。" },
  { who: null, en: "In the capital, the King wept for his queen. In the harbor, Ella hugged her father. Everywhere, people remembered the names of the ones they loved.", ja: "王都では、王が王妃を思って涙を流した。港では、エラが父を抱きしめた。あらゆる場所で、人々は愛する人の名前を思い出した。" },
  { who: "ren", face: "surprised", en: "\"Lina, stop! You'll disappear!\"", ja: "「リナ、やめろ！きみが消えてしまう！」" },
  { who: "lina", face: "smile", en: "\"I won't disappear, Ren. You said you'd remember me for both of us. As long as you do, I'll still be here.\"", ja: "「消えないよ、レン。ふたり分覚えていてくれるって、言ってくれたでしょう。あなたが覚えているかぎり、わたしはここにいる。」" },
  { who: null, en: "The light faded. Where Lina had been standing, there was only a small bookmark with a lantern drawn on it.", ja: "光が消えた。リナが立っていた場所には、ランタンの絵が描かれた小さなしおりが一枚、残っているだけだった。" },
  { who: "queen", face: "sad", en: "\"...Brother. Let's go home. ...And by the way, red really does suit you.\"", ja: "「……お兄ちゃん。帰ろう。……それと、赤、ほんとに似合ってるよ。」" },
  { end: true }
] },

/* ───────────────────────── 終章 ───────────────────────── */
{ id: "ep", title: "Epilogue: The Sunset Station", ja: "終章　ふたたび夕暮れの駅で", nodes: [
  { label: "ep_all" },
  { bg: "cg_train", who: null, en: "The sun was going down, and the platform was almost empty. Two people sat together on the bench.", ja: "日が沈みかけていて、ホームにはほとんど人がいなかった。ベンチに、ふたりが並んで座っていた。" },
  { who: "mio", face: "smile", en: "\"Mom cried for an hour when she saw me. Then she was angry for two hours. Then she made curry.\"", ja: "「お母さん、わたしを見て1時間泣いたよ。そのあと2時間怒られた。それからカレー作ってくれた。」" },
  { who: "ren", face: "smile", en: "\"That sounds about right.\"", ja: "「だろうな。」" },
  { who: "mio", face: "sad", en: "\"I'm going to visit Haru's family tomorrow. I'm scared. But I want to say her name out loud, instead of running away.\"", ja: "「明日、ハルの家に行ってくる。こわいけど。逃げるんじゃなくて、ちゃんとハルの名前を口に出して言いたいの。」" },
  { who: "ren", en: "\"I'll come with you.\"", ja: "「俺もいっしょに行く。」" },
  { who: null, en: "Ren took the bookmark out of his pocket. The little lantern on it seemed, just for a second, to flicker.", ja: "レンはポケットからしおりを取り出した。そこに描かれた小さなランタンが、ほんの一瞬、ゆらいだように見えた。" },
  { who: null, en: "Just then, a bell rang that was not on any timetable. A silver train passed by without stopping, and in one window, a girl with a book-shaped lantern smiled and waved.", ja: "ちょうどそのとき、どの時刻表にもないベルが鳴った。銀色の列車が止まらずに通り過ぎていき、その窓のひとつで、本の形のランタンを持った少女が、ほほえんで手を振っていた。" },
  { who: "ren", face: "smile", en: "\"...See you, Lina. I'll remember. For both of us.\"", ja: "「……またな、リナ。覚えてるよ。ふたり分。」" },
  { who: null, en: "THE END — Thank you for playing Aster Ⅰ.", ja: "おわり ——『Aster Ⅰ』を遊んでくれて、ありがとう。" },
  { end: true }
] }
);
