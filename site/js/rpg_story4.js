/* ===== 『Aster Ⅰ』書き足し その2（序章〜第6章） ===== */
/* ───────── 序章：車掌との会話 ───────── */
rpgAddBefore("p0", "\"Before we arrive, I must check your ticket.", [
  { who: "conductor", en: "\"You seem troubled, young man. Most passengers on this train are.\"", ja: "「お悩みのようですね、お若い方。この列車のお客さまは、たいていそうです。」" },
  { who: "ren", en: "\"How long have you been doing this job?\"", ja: "「この仕事、どれくらいやってるんですか？」" },
  { who: "conductor", en: "\"Since the first person in history was forgotten. I've carried kings and beggars, lovers and enemies. In the end, they all look the same: tired, and a little afraid.\"", ja: "「歴史上はじめて、だれかが忘れられたときからです。王も物乞いも、恋人も敵も乗せてきました。最後には、みんな同じ顔をしています。疲れていて、少しおびえている。」" },
  { who: "ren", en: "\"Do any of them ever go back?\"", ja: "「だれか、戻った人はいるんですか？」" },
  { who: "conductor", en: "\"A few. The ones who were remembered by someone stubborn enough to come and get them.\"", ja: "「ほんのわずかに。迎えに来るほど頑固なだれかに、覚えていてもらえた人たちだけです。」" },
  { who: "ren", face: "smile", en: "\"Then I'll be stubborn.\"", ja: "「なら、頑固になりますよ。」" },
  { who: "conductor", en: "\"Good. Stubbornness is underrated. It has saved more people than courage ever has.\"", ja: "「けっこう。頑固さは過小評価されています。勇気よりも多くの人を救ってきたのですよ。」" }
]);

/* ───────── 第1章：村の散歩 ───────── */
rpgAddBefore("c1", "The elder's house had a cellar lit by a single torch.", [
  { who: null, en: "On the way to the elder's house, they passed a small school. Inside, a teacher was writing the same sentence on the blackboard again and again.", ja: "長老の家へ向かう途中、小さな学校の前を通った。中では先生が、黒板に同じ文を何度も何度も書いていた。" },
  { who: null, en: "\"My name is Clara. I teach here. My students are...\" Each time, she stopped at the same place and erased everything.", ja: "「わたしの名前はクララ。ここで教えています。わたしの生徒は……」。毎回、同じところで手が止まり、全部消してしまう。" },
  { who: "ren", en: "\"The classroom is empty. Where are the students?\"", ja: "「教室は空っぽだ。生徒はどこにいるんだ？」" },
  { who: "lina", face: "sad", en: "\"The children forgot that they go to school. And she forgot their names. So every day she comes here and waits, without knowing who she's waiting for.\"", ja: "「子どもたちは、学校に通っていることを忘れてしまったの。先生は子どもたちの名前を忘れた。だから毎日ここへ来て、だれを待っているのかもわからないまま待っているの。」" },
  { who: "ren", en: "\"...Can we do anything for her?\"", ja: "「……何かしてあげられないのか？」" },
  { who: "lina", en: "\"Not yet. But if we stop the Fading, the children will remember the way here. I believe that.\"", ja: "「今はまだ。でも色あせを止めれば、子どもたちはここへの道を思い出す。わたしはそう信じてる。」" },
  { who: null, en: "Ren picked up a piece of chalk and wrote at the bottom of the board: \"Your students will come back. —A traveler.\"", ja: "レンはチョークを拾い、黒板のいちばん下に書いた。「生徒は戻ってきます。――旅人より」。" }
]);
rpgAddAfter("c1", "\"The Fading started at the old shrine", [
  { who: "elder", en: "\"Take this, young man. It is a map of the forest that Tobin drew for me. The lines are crooked, but they have never led me astray.\"", ja: "「これを持っていけ、若いの。トビンがわしに描いてくれた森の地図じゃ。線はゆがんでおるが、一度もわしを迷わせたことはない。」" },
  { who: "ren", en: "\"Are you sure? It's precious to you.\"", ja: "「いいんですか？大切なものでしょう。」" },
  { who: "elder", en: "\"That is exactly why I give it to you. A precious thing kept in a box is only half alive. Let it be useful again.\"", ja: "「だからこそ渡すのじゃ。大切なものは、箱にしまっておくと半分しか生きておらん。また役に立たせてやってくれ。」" }
]);

/* ───────── 第2章：森の夜の野営 ───────── */
rpgAddBefore("c2", "At the center of the ruins was a dark archway.", [
  { who: null, en: "Night fell before they reached the ruins. They made a small fire beneath an old tree, and Lina's lantern hung from a branch above them.", ja: "遺跡に着く前に夜になった。古い木の下で小さな火をおこし、リナのランタンを頭上の枝につるした。" },
  { who: "ren", en: "\"Lina, you said the library is where you grew up. What's it like?\"", ja: "「リナ、図書館で育ったって言ってたよな。どんなところなんだ？」" },
  { who: "lina", face: "smile", en: "\"It's enormous. The shelves are so high that the librarians use ladders with wheels to reach the top. When I was small, I used to ride them like a train.\"", ja: "「すごく大きいの。本棚が高すぎて、司書たちは車輪のついたはしごで上まで行くのよ。小さいころ、それに乗って電車ごっこをしてたの。」" },
  { who: "lina", en: "\"My favorite place was the Room of Unfinished Stories. It's full of books whose authors died before they could write the ending.\"", ja: "「いちばん好きだったのは『未完の物語の部屋』。作者が結末を書く前に亡くなってしまった本ばかりが置いてあるの。」" },
  { who: "ren", en: "\"That sounds kind of sad.\"", ja: "「なんだか、さびしい場所だな。」" },
  { who: "lina", face: "smile", en: "\"I didn't think so. I used to make up endings for them. Happy ones, mostly. I thought maybe the authors would like that.\"", ja: "「わたしはそう思わなかった。よく、結末を自分で考えてたの。だいたいはハッピーエンド。作者もそのほうが喜ぶかなって。」" },
  { who: "ren", en: "\"What about your own story? How does that one end?\"", ja: "「きみ自身の物語は？それはどう終わるんだ？」" },
  { who: "lina", face: "sad", en: "\"...I haven't decided yet. Maybe you can help me write it.\"", ja: "「……まだ決めてないの。もしかしたら、あなたがいっしょに書いてくれるかも。」" },
  { who: null, en: "The fire crackled. Above them, the lantern's light trembled, as if it were listening.", ja: "火がぱちぱちと鳴った。頭上で、ランタンの光が、まるで耳を傾けているかのようにふるえていた。" }
]);

/* ───────── 第3章：鉱夫の歌 ───────── */
rpgAddBefore("c3", "At the bottom of the cave stood a giant crystal", [
  { who: null, en: "As they descended, Garo began to hum a low, rough song. The echo filled the tunnel, and the crystals seemed to glow a little brighter.", ja: "下っていくにつれて、ガロが低く、しわがれた歌を口ずさみ始めた。こだまがトンネルを満たし、水晶が少し明るく光った気がした。" },
  { who: "ren", en: "\"What's that song?\"", ja: "「それ、なんの歌だ？」" },
  { who: "garo", en: "\"A miner's song. We sing it so the mountain knows we're friends, not thieves. My father taught it to me, and his father taught it to him.\"", ja: "「鉱夫の歌じゃ。わしらが泥棒じゃなく、友だちだと山にわかってもらうために歌う。親父に教わって、親父はそのまた親父に教わった。」" },
  { who: "garo", en: "\"\"Dig with care and dig with heart, the mountain gives to those who ask. Take a little, leave the rest, and come home safely to your bed.\"\"", ja: "「『心をこめて、ていねいに掘れ。山は、たずねる者に恵みをくれる。少しだけもらい、残りは置いて、無事に自分の寝床へ帰れ』」" },
  { who: "lina", face: "smile", en: "\"That's beautiful.\"", ja: "「すてきな歌。」" },
  { who: "garo", en: "\"There was a fourth line. Something about a child waiting at home. I've forgotten it.\"", ja: "「4行目があったんじゃ。家で待っとる子どものことを歌った行が。忘れてしもうた。」" },
  { who: "ren", en: "\"Maybe you'll remember it when we find Ella.\"", ja: "「エラを見つけたら、思い出せるかもな。」" },
  { who: "garo", en: "\"Hmph. Maybe.\"", ja: "「ふん。かもしれんな。」" }
]);
rpgAddAfter("c3", "\"...Ella. My daughter, Ella. How could I have forgotten you?\"", [
  { who: "garo", en: "\"\"...and a little one waits at home with a candle in the window.\" That's the fourth line. That's the line I sang for her every night.\"", ja: "「『……そして小さな子が、窓にろうそくをともして家で待っている』。それが4行目じゃ。毎晩、あの子に歌ってやった行じゃ。」" },
  { who: null, en: "Garo sang the whole song from beginning to end. His voice cracked on the last line, but he did not stop.", ja: "ガロは歌を最初から最後まで歌った。最後の行で声がかすれたが、彼は歌うのをやめなかった。" }
]);

/* ───────── 第4章：水路の子ども ───────── */
rpgAddBefore("c4", "Near the exit, the water began to swirl.", [
  { who: null, en: "In a dry corner of the waterway, they found a little girl sitting alone, drawing pictures on the wall with a piece of charcoal.", ja: "水路の乾いた片すみで、女の子がひとり座りこみ、炭のかけらで壁に絵を描いていた。" },
  { who: "child", en: "\"Shh. I'm hiding. My parents went to the white tent, and when they came back, they didn't know me.\"", ja: "「しーっ。隠れてるの。お父さんとお母さんが白いテントに行って、帰ってきたら、わたしのことがわからなくなってたの。」" },
  { who: "child", en: "\"They gave away the memory of the day my little brother got sick. But I was in that memory too. So they lost me with it.\"", ja: "「弟が病気になった日の記憶を差し出したんだって。でも、その記憶にはわたしもいたの。だから、いっしょにわたしもなくしちゃった。」" },
  { who: "ren", face: "sad", en: "\"...That's what happens. You can't cut out just the painful part.\"", ja: "「……そういうことなんだな。つらいところだけを切り取ることはできないんだ。」" },
  { who: "garo", en: "\"Come, little one. When we're done, we'll take you home, and we'll make your parents remember. I swear it on my beard.\"", ja: "「おいで、ちびすけ。用がすんだら家まで送って、親御さんに思い出させてやる。このひげにかけて誓う。」" },
  { who: "child", en: "\"...Your beard is very big. So it must be a big promise.\"", ja: "「……おじさんのひげ、すごく大きいね。じゃあ、大きな約束なんだね。」" },
  { who: "garo", en: "\"The biggest.\"", ja: "「いちばん大きな約束じゃ。」" }
]);

/* ───────── 第5章：テントの中 ───────── */
rpgAddBefore("c5", "In the great hall of the White Castle,", [
  { who: null, en: "Ren slipped into the white tent. Inside, it was quiet and warm. A woman in a gray robe sat at a table covered with empty glass jars.", ja: "レンは白いテントに忍びこんだ。中は静かで、あたたかかった。灰色のローブの女性が、空のガラスびんでいっぱいのテーブルの前に座っていた。" },
  { who: "voice", en: "\"Welcome. Please sit down. Which memory would you like to leave with us today?\"", ja: "「いらっしゃいませ。どうぞおかけください。今日はどの記憶を置いていかれますか？」" },
  { who: "ren", en: "\"I'm not here to leave anything. Where do these memories go?\"", ja: "「何も置いていくつもりはない。ここの記憶は、どこへ行くんだ？」" },
  { who: "voice", en: "\"Up. To the one who carries everyone's sorrow so that we don't have to. She is very kind. She never says no.\"", ja: "「上へ。わたしたちの代わりに、みんなの悲しみを背負ってくださる方のもとへ。とてもおやさしい方です。決して断ることがありません。」" },
  { who: "ren", en: "\"She...?\"", ja: "「その方……？」" },
  { who: "voice", en: "\"We call her the Queen. Nobody has seen her face. But they say she wears a blue ribbon.\"", ja: "「わたしたちは女王とお呼びしています。お顔を見た者はいません。でも、青いリボンをつけていらっしゃるそうですよ。」" },
  { who: null, en: "Ren's heart stopped for a moment. He walked out of the tent without another word.", ja: "レンの心臓が一瞬止まった。彼はそれ以上何も言わずに、テントを出た。" },
  { who: "lina", face: "surprised", en: "\"Ren? What happened? You look pale.\"", ja: "「レン？どうしたの？顔が真っ青よ。」" },
  { who: "ren", en: "\"...Nothing. Let's go to the castle. I need answers.\"", ja: "「……なんでもない。城へ行こう。答えが必要なんだ。」" }
]);

/* ───────── 第6章：記憶の炎の中のハル ───────── */
rpgAddBefore("c6", "At the end of the corridor, a pale figure appeared.", [
  { who: null, en: "Deeper in the hall, one flame burned much brighter than the others. Inside it, two girls in school uniforms were laughing under a cherry tree.", ja: "回廊のさらに奥で、ひとつの炎がほかよりずっと明るく燃えていた。その中で、制服の女の子がふたり、桜の木の下で笑っていた。" },
  { who: "haru", en: "\"Mio, you have to show your drawings to someone! They're too good to keep in a notebook!\"", ja: "「ミオ、絵をだれかに見せなきゃだめだよ！ノートにしまっておくなんて、もったいなさすぎる！」" },
  { who: "mio", face: "smile", en: "\"No way. They're embarrassing. You're the only one who's allowed to see them, Haru.\"", ja: "「むりむり。はずかしいもん。見ていいのはハルだけだよ。」" },
  { who: "haru", en: "\"Then promise me. When we're grown up, you'll draw the cover of my first book. I'm going to be a writer, you know.\"", ja: "「じゃあ約束して。大人になったら、わたしの最初の本の表紙を描いてよ。わたし、作家になるんだからね。」" },
  { who: "mio", face: "smile", en: "\"Okay. It's a promise.\"", ja: "「うん。約束。」" },
  { who: "ren", face: "sad", en: "\"Haru... I remember her. She came to our house all the time. She always ate the last cookie and blamed it on me.\"", ja: "「ハル……覚えてる。しょっちゅう家に来てた。いつも最後のクッキーを食べて、俺のせいにしてたっけ。」" },
  { who: "lina", face: "sad", en: "\"This is Mio's most precious memory. And she threw it away too.\"", ja: "「これは、ミオのいちばん大切な記憶ね。それなのに、これさえ手放してしまったのね。」" },
  { who: "ren", en: "\"No. She didn't throw it away. You don't burn something this bright unless it hurts to look at.\"", ja: "「ちがう。捨てたんじゃない。見るのがつらくなければ、こんなに明るいものを燃やしたりしない。」" }
]);

/* ===== 宿屋の会話（追加） ===== */
GINNTALK.push(
  { id: "inn5", need: "garo_joined", not: "c4_done", nodes: [
    { who: "garo", en: "\"Boy, why do you dye your hair that ridiculous color?\"", ja: "「坊主、なんでまた髪をそんなおかしな色に染めとるんじゃ？」" },
    { who: "ren", en: "\"Mio said it would suit me. She said I looked like the hero in her favorite game.\"", ja: "「ミオが、似合うって言ってたんだ。好きなゲームの主人公みたいだって。」" },
    { who: "garo", en: "\"And did you believe her?\"", ja: "「で、その言葉を信じたのか？」" },
    { who: "ren", face: "smile", en: "\"Not at all. I thought it would look terrible. But after she was gone, it was the only thing she'd asked me that I could still do.\"", ja: "「全然。絶対ひどいことになると思ってた。でも、あいつがいなくなってから、あいつに頼まれたことで、まだ俺にできるのはそれだけだったんだ。」" },
    { who: "garo", en: "\"...It doesn't look terrible. Don't tell anyone I said that.\"", ja: "「……ひどくはないぞ。わしがそう言ったことは、だれにも言うなよ。」" }
  ] },
  { id: "inn6", need: "c6_done", not: "c7_done", nodes: [
    { who: "lina", en: "\"Ren, are you awake? ...I keep thinking about the flame with Haru in it.\"", ja: "「レン、起きてる？……ハルが映っていた炎のことが、頭から離れないの。」" },
    { who: "ren", en: "\"Me too. I'm angry at Mio for not telling me. And I'm angry at myself for not asking.\"", ja: "「俺もだ。何も言わなかったミオに腹が立つ。それに、聞かなかった自分にも。」" },
    { who: "lina", en: "\"People who are hurting often think that silence protects others. But silence is heavy. It just moves the weight somewhere else.\"", ja: "「傷ついている人は、黙っていればまわりを守れると思いがちなの。でも沈黙は重い。重さをどこか別の場所へ移すだけ。」" },
    { who: "ren", en: "\"Is that why you don't tell me about your lantern?\"", ja: "「だから、きみはランタンのことを話さないのか？」" },
    { who: "lina", face: "sad", en: "\"...You're sharper than you look, Ren.\"", ja: "「……見た目より鋭いのね、レン。」" }
  ] }
);

/* ===== 町の人の会話（追加） ===== */
Object.assign(GLINES, {
  girl: [
    { who: "child", en: "\"I keep a diary so I don't forget. But some pages are turning gray.\"", ja: "「忘れないように日記をつけてるの。でも、ページがところどころ灰色になってきてる。」" },
    { who: "child", en: "\"This page says, \"Today Tom gave me a flower.\" But I don't remember who Tom is. Is it the boy over there?\"", ja: "「このページには『今日、トムがお花をくれた』って書いてある。でもトムがだれか覚えてないの。あそこの男の子かな？」" },
    { who: "child", en: "\"I'll ask him tomorrow. And I'll write down his answer, so I can ask him again the day after.\"", ja: "「あした聞いてみる。それで、答えを日記に書いておくの。そうしたら、あさってもまた聞けるでしょ。」" }
  ],
  oldwoman: [
    { who: "villager", en: "\"Elder Bram lives in the house with the blue roof. He has been sitting in his cellar for days.\"", ja: "「ブラム長老は青い屋根の家に住んでいるよ。もう何日も地下室にこもっているんだ。」" },
    { who: "villager", en: "\"He used to tell the best stories at the harvest festival. The children would sit around him for hours.\"", ja: "「収穫祭では、いちばんおもしろい話をしてくれる人だったんだよ。子どもたちは何時間もまわりに座って聞いていたもんさ。」" },
    { who: "villager", en: "\"Last year, he couldn't remember the ending of any of them. He just stopped in the middle and stared at the sky.\"", ja: "「去年は、どの話も結末が思い出せなくてね。途中で止まって、空を見つめていたよ。」" }
  ],
  guard: [
    { who: "guard", en: "\"The road north leads to the Whispering Forest. Monsters appear there, so prepare well before you go.\"", ja: "「北の道はささやきの森へ続いている。魔物が出るから、しっかり準備してから行くんだ。」" },
    { who: "guard", en: "\"I've been guarding this gate for ten years. I used to know why. Now I just know that if I leave, something bad might come in.\"", ja: "「この門を10年守ってきた。昔は理由を知っていた。今はただ、ここを離れたら何か悪いものが入ってくるかもしれない、ということだけわかっている。」" },
    { who: "guard", en: "\"Maybe that's enough of a reason. Good luck, travelers.\"", ja: "「理由としては、それで十分なのかもしれんな。気をつけてな、旅の人。」" }
  ],
  capital_woman: [
    { who: "villager", en: "\"The library is beside the item shop, but it's sealed. They say only someone with a true memory can open it.\"", ja: "「図書館は道具屋のとなりよ。でも封印されているの。本当の記憶を持つ人しか開けられないんですって。」" },
    { who: "villager", en: "\"When I was a girl, I borrowed a book of poems there. I never returned it. I still have it, but I've forgotten how to read the language it's written in.\"", ja: "「娘だったころ、そこで詩集を借りたの。結局返さなかった。今も持っているけど、書かれている言葉の読み方を忘れてしまったわ。」" }
  ],
  capital_guard: [
    { who: "guard", en: "\"The castle is to the north. His Majesty sees no one... but the doors are strangely open today.\"", ja: "「城は北だ。陛下はだれにもお会いにならない……だが、今日はなぜか扉が開いている。」" },
    { who: "guard", en: "\"They say the King used to walk in the gardens with the Queen every evening. Now the gardens are full of weeds, and nobody remembers why they were planted.\"", ja: "「王は昔、毎晩王妃と庭を散歩されていたそうだ。今、庭は雑草だらけで、なぜ花が植えられたのかだれも覚えていない。」" }
  ]
});
