/* ===== 英語RPG「提灯の道」の物語（オリジナル） =====
   1つの節は次のどれか：
   { who, en, ja, w }           せりふ・地の文（who が null なら地の文。w は大事な単語 [英, 日]）
   { choice: {en, ja}, opts: [{ en, ja, go, flag }] }   選択肢
   { battle: { name, ja, hp, art }, qs: [{ en, ja, opts: [[英, 日]...], a, why }] }   戦い
   { label }  { go }  { if: flag, go }  { end: 章の名前 } */
const RPG_CAST = {
  daiki: { name: "Daiki", ja: "だいき" },
  kogitsune: { name: "Kogitsune", ja: "子狐火", img: "kogitsune" },
  hitotsume: { name: "Hitotsume", ja: "一つ目小僧", img: "hitotsume" },
  moth: { name: "Ink Moth", ja: "墨蛾", mark: "墨" },
  voice: { name: "???", ja: "？？？" }
};

const RPG_CHAPTERS = [{
  id: "ch1", title: "Chapter 1: The Fox and the Lantern", ja: "第1章　狐と提灯",
  nodes: [
    { bg: "room", who: null, en: "It was two in the morning, the night before the exam. Daiki's pencil rolled off the desk, and the room went dark.", ja: "午前2時、試験の前の夜。だいきの鉛筆が机から転がり落ち、部屋が暗くなった。" },
    { bg: "road", who: null, en: "When he opened his eyes, he was standing on a narrow road lit by hundreds of paper lanterns.", ja: "目を開けると、彼は何百もの紙の提灯に照らされた細い道に立っていた。", w: [["narrow", "せまい"], ["lit", "light（照らす）の過去分詞"]] },
    { who: "voice", en: "\"Finally! A human who can still read!\"", ja: "「やっと来た！まだ字が読める人間だ！」" },
    { who: null, en: "A small white fox with a red flame on its tail jumped onto one of the lanterns.", ja: "尻尾に赤い炎をともした小さな白い狐が、提灯のひとつに飛び乗った。" },
    { who: "kogitsune", en: "\"I'm Kogitsune. Sorry to bother you, but our world is in serious trouble.\"", ja: "「ぼくは子狐火。じゃましてごめん、でもぼくらの世界は大変なことになってるんだ。」", w: [["bother", "じゃまをする、困らせる"], ["serious", "深刻な"]] },
    { who: "kogitsune", en: "\"Something called the Silence is eating our words. Once a word disappears, nobody can remember what it meant.\"", ja: "「『沈黙』っていうものが、ぼくらの言葉を食べているんだ。言葉がひとつ消えると、だれもその意味を思い出せなくなる。」", w: [["once", "いったん〜すると"], ["disappear", "消える"]] },
    { who: "daiki", en: "\"Why are you telling me? I'm just a student who can't even finish his English homework.\"", ja: "「なんで俺に言うんだよ。英語の宿題も終わらない、ただの受験生だぞ。」" },
    { who: "kogitsune", en: "\"Exactly. These days, students are the only ones who still collect words every single day.\"", ja: "「だからだよ。今では、毎日欠かさず言葉を集めているのは受験生くらいしかいないんだ。」", w: [["exactly", "まさにそのとおり"], ["collect", "集める"]] },
    { choice: { en: "How do you answer?", ja: "どう答える？" }, opts: [
      { en: "\"Fine. I'll help, but only if you show me the way home.\"", ja: "「わかった。手伝うよ。ただし、帰り道を教えてくれるならな。」", go: "deal" },
      { en: "\"Sounds dangerous. Can I think about it?\"", ja: "「危なそうだな。少し考えさせてくれる？」", go: "hesitate" }
    ] },
    { label: "deal" },
    { who: "kogitsune", en: "\"Deal! When this is over, I'll guide you to the Gate of Dawn.\"", ja: "「決まり！これが終わったら、夜明けの門まで案内するよ。」", w: [["guide", "案内する"], ["dawn", "夜明け"]] },
    { go: "blank" },
    { label: "hesitate" },
    { who: "kogitsune", en: "\"There's no time to hesitate. Look behind you!\"", ja: "「迷っている暇はないよ。うしろを見て！」", w: [["hesitate", "ためらう"]] },
    { label: "blank" },
    { who: null, en: "Behind them, the lanterns began to go out one by one.", ja: "二人のうしろで、提灯がひとつずつ消え始めた。", w: [["go out", "（火・明かりが）消える"]] },
    { foe: "blank", who: null, en: "Out of the darkness crawled a shadow shaped like a crumpled page.", ja: "暗闇の中から、くしゃくしゃになったページのような形の影がはい出てきた。", w: [["crawl", "はう"]] },
    { who: "kogitsune", en: "\"A Blank! It feeds on the words people have forgotten. Answer correctly, and the words will turn back into light!\"", ja: "「ブランクだ！人が忘れた言葉を食べる化け物だよ。正しく答えれば、言葉が光に戻る！」", w: [["feed on", "〜を食べて生きる"], ["turn into", "〜に変わる"]] },
    { battle: { name: "Blank", ja: "ブランク（白紙の影）", hp: 3, mark: "白", foe: "blank" }, qs: [
      { en: "Which word means \"to go out of sight suddenly\"?", ja: "「急に見えなくなる」という意味の単語はどれ？", opts: [["vanish", "消える"], ["appear", "現れる"], ["recover", "回復する"], ["require", "必要とする"]], a: 0, why: "vanish＝（急に）消える。disappear とほぼ同じ意味。" },
      { en: "Why did Kogitsune ask Daiki for help?", ja: "子狐火はなぜだいきに助けを求めた？", opts: [["Because Daiki is good at fighting.", "だいきは戦いが得意だから。"], ["Because students still collect words every day.", "受験生は今も毎日言葉を集めているから。"], ["Because Daiki is also a fox.", "だいきも狐だから。"], ["Because the lanterns told him to.", "提灯にそうしろと言われたから。"]], a: 1, why: "\"students are the only ones who still collect words every single day\" と言っていた。" },
      { en: "Kogitsune said, \"Sorry to bother you.\" The word \"bother\" is closest in meaning to ___.", ja: "「Sorry to bother you」の bother にいちばん近い意味は？", opts: [["trouble", "困らせる"], ["help", "助ける"], ["praise", "ほめる"], ["ignore", "無視する"]], a: 0, why: "bother＝じゃまをする、困らせる。trouble にも「迷惑をかける」の意味がある。" }
    ] },
    { who: null, en: "The Blank let out a scream and burst into a shower of tiny letters.", ja: "ブランクは叫び声をあげ、小さな文字の雨になってはじけた。", w: [["burst into", "〜になってはじける"]] },
    { who: "kogitsune", en: "\"You did it! See? Here, your words are your weapon.\"", ja: "「やった！ね？ここでは、きみの言葉がきみの武器なんだ。」", w: [["weapon", "武器"]] },
    { who: null, en: "Among the falling letters, Daiki noticed a small straw hat lying on the road.", ja: "降ってくる文字の中に、道に落ちている小さなわら笠があるのに、だいきは気づいた。", w: [["notice", "気づく"], ["lie（lying）", "横たわる、置いてある"]] },
    { who: "kogitsune", en: "\"That belongs to Hitotsume, the one-eyed boy. He was supposed to be guarding the bridge.\"", ja: "「それは一つ目小僧の笠だ。橋を守っているはずだったのに。」", w: [["belong to", "〜のものである"], ["be supposed to", "〜するはずだ"]] },
    { who: "kogitsune", en: "\"If the Silence has taken his name, he may not even remember who he is.\"", ja: "「もし沈黙に名前を取られていたら、自分がだれなのかさえ覚えていないかもしれない。」" },
    { choice: { en: "What do you do?", ja: "どうする？" }, opts: [
      { en: "\"Let's head to the bridge right away.\"", ja: "「すぐに橋へ向かおう。」", go: "bridge" },
      { en: "\"Wait. Let's look around for clues first.\"", ja: "「待って。先に手がかりを探そう。」", go: "clue" }
    ] },
    { label: "clue" },
    { who: null, en: "Under the hat, Daiki found a folded note. It said: \"If you ever forget me, call my name three times.\"", ja: "笠の下に、だいきは折りたたまれたメモを見つけた。こう書いてあった。「もしぼくを忘れたら、名前を3回呼んで。」", w: [["fold", "折りたたむ"]], flag: "note" },
    { who: "kogitsune", en: "\"Good thinking. That might come in handy later.\"", ja: "「いい考えだね。あとで役に立つかもしれない。」", w: [["come in handy", "役に立つ"]] },
    { label: "bridge" },
    { bg: "bridge", who: null, en: "The bridge was covered in fog so thick that Daiki could hardly see his own hands.", ja: "橋はとても濃い霧におおわれていて、だいきは自分の手さえほとんど見えなかった。", w: [["so 〜 that ...", "とても〜なので…"], ["hardly", "ほとんど〜ない"]] },
    { who: null, en: "In the middle stood a child with one huge eye, staring at nothing.", ja: "真ん中には、大きな目がひとつある子どもが立っていて、何もないところをじっと見つめていた。", w: [["stare at", "〜をじっと見る"]] },
    { who: "hitotsume", en: "\"Who... am I? I was protecting something important. I just can't recall what it was.\"", ja: "「ぼくは…だれ？何か大事なものを守っていたんだ。それが何だったか、どうしても思い出せない。」", w: [["recall", "思い出す"]] },
    { who: "kogitsune", en: "\"It's worse than I expected. The Silence must be close.\"", ja: "「思っていたよりひどい。沈黙が近くにいるにちがいない。」", w: [["expect", "予想する"], ["must", "〜にちがいない"]] },
    { who: null, en: "Suddenly, the fog gathered into the shape of a giant moth whose wings were made of torn dictionaries.", ja: "突然、霧が集まり、破れた辞書でできた羽をもつ巨大な蛾の形になった。", w: [["gather", "集まる"], ["torn", "tear（破る）の過去分詞"]] },
    { foe: "moth", who: "moth", en: "\"Words are heavy. Meaning is a burden. Give them all to me, and you will never have to study again.\"", ja: "「言葉は重い。意味は重荷だ。全部わたしによこしなさい。そうすれば、もう二度と勉強しなくていい。」", w: [["burden", "重荷"]] },
    { who: "daiki", en: "\"...Never study again? Honestly, that sounds kind of nice.\"", ja: "「…二度と勉強しなくていい？正直、ちょっといいかも。」" },
    { who: "kogitsune", en: "\"Daiki! Don't listen to it! If you lose your words, you lose yourself!\"", ja: "「だいき！耳を貸しちゃだめ！言葉を失ったら、自分自身を失うんだよ！」" },
    { choice: { en: "How do you respond?", ja: "どう返す？" }, opts: [
      { en: "\"You're right. I'm not giving my words to anyone.\"", ja: "「そうだな。俺の言葉はだれにも渡さない。」", go: "boss" },
      { en: "\"I'll admit I was tempted... but no way.\"", ja: "「正直ちょっと揺れた…でも、お断りだ。」", go: "boss" }
    ] },
    { label: "boss" },
    { who: "moth", en: "\"Then I will simply take them by force!\"", ja: "「ならば、力ずくでいただくまでだ！」", w: [["by force", "力ずくで"]] },
    { battle: { name: "Ink Moth", ja: "墨蛾（沈黙の手下）", hp: 5, mark: "墨", boss: true, foe: "moth" }, qs: [
      { en: "The moth said that meaning is a \"burden.\" A burden is something that is ___.", ja: "蛾は「意味は burden だ」と言った。burden とは、どんなもの？", opts: [["heavy and hard to carry", "重くて運ぶのが大変なもの"], ["bright and beautiful", "明るくて美しいもの"], ["easy to forget", "忘れやすいもの"], ["fast and dangerous", "速くて危険なもの"]], a: 0, why: "burden＝重荷。「重くて運ぶのが大変なもの」。" },
      { en: "Why could Daiki hardly see his own hands on the bridge?", ja: "橋の上で、だいきが自分の手もほとんど見えなかったのはなぜ？", opts: [["Because it was too dark.", "暗すぎたから。"], ["Because the fog was very thick.", "霧がとても濃かったから。"], ["Because he closed his eyes.", "目を閉じていたから。"], ["Because the moth covered them.", "蛾がおおっていたから。"]], a: 1, why: "\"fog so thick that Daiki could hardly see\"＝霧がとても濃くてほとんど見えなかった。" },
      { en: "Which word means \"to bring something back into your mind\"?", ja: "「何かを心に呼び戻す」＝思い出す、という意味の単語は？", opts: [["recall", "思い出す"], ["refuse", "断る"], ["reduce", "減らす"], ["reveal", "明らかにする"]], a: 0, why: "recall＝思い出す。remember とほぼ同じ。" },
      { en: "What was Hitotsume supposed to be doing?", ja: "一つ目小僧は何をしているはずだった？", opts: [["guarding the bridge", "橋を守ること"], ["cooking dinner", "夕食を作ること"], ["studying English", "英語を勉強すること"], ["chasing the moth", "蛾を追いかけること"]], a: 0, why: "\"He was supposed to be guarding the bridge.\" とあった。be supposed to＝〜するはずだ。" },
      { en: "In \"Daiki could hardly see his own hands,\" the word \"hardly\" means ___.", ja: "「could hardly see」の hardly の意味は？", opts: [["easily", "簡単に"], ["almost not", "ほとんど〜ない"], ["completely", "完全に"], ["carefully", "注意深く"]], a: 1, why: "hardly＝ほとんど〜ない。hard（かたい、熱心に）とはちがう意味なので注意。" }
    ] },
    { who: null, en: "With a cry like ripping paper, the Ink Moth broke apart and melted into the fog.", ja: "紙を引き裂くような叫び声とともに、墨蛾はばらばらになり、霧の中に溶けていった。", w: [["rip", "引き裂く"], ["melt", "溶ける"]] },
    { if: "note", go: "shout" },
    { who: "kogitsune", en: "\"Daiki, call his name! Names bring memories back!\"", ja: "「だいき、彼の名前を呼んで！名前は記憶を連れ戻すんだ！」" },
    { label: "shout" },
    { who: "daiki", en: "\"Hitotsume! Hitotsume! Hitotsume!\"", ja: "「一つ目小僧！一つ目小僧！一つ目小僧！」" },
    { who: "hitotsume", en: "\"...That's me! I'm Hitotsume, guardian of the Lantern Bridge!\"", ja: "「…それ、ぼくだ！ぼくは一つ目小僧、提灯橋の番人だ！」", w: [["guardian", "守る人、番人"]] },
    { who: "hitotsume", en: "\"Thank you. Without your voice, I would have faded away completely.\"", ja: "「ありがとう。きみの声がなかったら、ぼくは完全に消えてしまっていた。」", w: [["without 〜, would have ...", "〜がなかったら…していただろう（仮定法）"], ["fade away", "消えていく"]] },
    { who: "kogitsune", en: "\"This is only the beginning. The Silence has five more generals, and each one is stronger than the last.\"", ja: "「これはまだ始まりにすぎない。沈黙にはあと5人の将軍がいて、あとになるほど強いんだ。」", w: [["general", "将軍"]] },
    { bg: "mountain", who: null, en: "Far away, at the top of a dark mountain, something with enormous wings slowly opened its eyes.", ja: "遠く、暗い山のいただきで、巨大な翼をもつ何かが、ゆっくりと目を開いた。", w: [["enormous", "巨大な"]] },
    { end: "第1章 クリア" }
  ]
}];
