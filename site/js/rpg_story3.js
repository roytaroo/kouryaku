/* ===== 『Echoes of Aster』書き足し（序章〜第6章） =====
   1) 章の途中に場面を足す（rpgAddAfter：書き出しの英文の直後に入れる）
   2) 宿屋に泊まったときの仲間の会話（GINNTALK）
   3) 町の人の長い会話（GLINES を上書き）と、新しい町の人（GMAPS の npcs に足す） */
Object.assign(RPG_CAST, {
  passenger: { name: "Old Woman", ja: "老婦人" },
  mom: { name: "Mother", ja: "母" },
  haru: { name: "Haru", ja: "ハル" },
  boatman: { name: "Boatman", ja: "渡し守" },
  smuggler: { name: "Smuggler", ja: "密輸人" },
  priest: { name: "Lantern Keeper", ja: "灯守り" }
});
Object.assign(GEXTRA_CAST, { scholar: { name: "Scholar", ja: "学者" }, merchant: { name: "Merchant", ja: "商人" }, soldier: { name: "Soldier", ja: "兵士" }, widow: { name: "Widow", ja: "未亡人" } });

function rpgAddBefore(chId, start, nodes) {
  const ch = RPG_CHAPTERS.find(c => c.id === chId); const i = ch ? ch.nodes.findIndex(n => n.en && n.en.startsWith(start)) : -1;
  if (i < 0) { console.warn("rpgAddBefore: not found", chId, start); return; } ch.nodes.splice(i, 0, ...nodes);
}
function rpgAddAfter(chId, start, nodes) {
  const ch = RPG_CHAPTERS.find(c => c.id === chId); if (!ch) return;
  const i = ch.nodes.findIndex(n => n.en && n.en.startsWith(start));
  if (i < 0) { console.warn("rpgAddAfter: not found", chId, start); return; }
  ch.nodes.splice(i + 1, 0, ...nodes);
}

/* ───────── 序章 ───────── */
rpgAddAfter("p0", "Her room was now used for storage.", [
  { who: null, en: "He still remembered the last morning clearly. Mio had been standing at the door with her bag, staring at her shoes.", ja: "最後の朝のことは、今でもはっきり覚えている。ミオはかばんを持って玄関に立ち、自分の靴をじっと見つめていた。" },
  { who: "mio", face: "neutral", en: "\"Hey, Ren. If I disappeared one day, would you be sad?\"", ja: "「ねえ、お兄ちゃん。もしわたしがある日いなくなったら、悲しい？」" },
  { who: "ren", en: "\"What kind of question is that? Hurry up, or you'll be late.\"", ja: "「なんだよその質問。早くしないと遅刻するぞ。」" },
  { who: "mio", face: "smile", en: "\"...Yeah. You're right. See you later.\"", ja: "「……そうだね。じゃあ、行ってきます。」" },
  { who: null, en: "She smiled, but it was a thin, tired smile. He had not even looked up from his phone. That was the last thing she ever said to him.", ja: "彼女はほほえんだ。でもそれは、うすくて疲れた笑顔だった。彼は携帯から顔を上げさえしなかった。それが、妹が彼に言った最後の言葉になった。" },
  { who: "ren", face: "sad", en: "\"If I had answered properly... if I had just said yes...\"", ja: "「あのとき、ちゃんと答えていれば……『悲しいに決まってる』って、ひとこと言っていれば……」" },
  { who: null, en: "For a year, that question had followed him everywhere: to school, to bed, into every dream.", ja: "この1年、あの問いはどこへでもついてきた。学校へも、ベッドへも、すべての夢の中へも。" }
]);
rpgAddAfter("p0", "Outside the window, the town melted into gold,", [
  { who: null, en: "The carriage was almost empty. Only an old woman sat near the back, holding an envelope that had never been opened.", ja: "車内はほとんど空っぽだった。うしろのほうに老婦人がひとり座っているだけで、一度も開けられたことのない封筒を手にしていた。" },
  { who: "passenger", en: "\"Are you going to Aster too, young man? I'm going to deliver this letter. I wrote it fifty years ago, but I was too proud to send it.\"", ja: "「あなたもアスターへ行くの？わたしはこの手紙を届けに行くのよ。50年前に書いたのに、意地を張って出せなかったの。」" },
  { who: "ren", en: "\"Who is it for?\"", ja: "「だれに宛てたものなんですか？」" },
  { who: "passenger", en: "\"My older sister. We had a terrible argument, and we never spoke again. When she died, everyone slowly forgot her. Even I began to forget her voice.\"", ja: "「姉よ。ひどいけんかをして、それきり口をきかなかった。姉が亡くなると、みんな少しずつ姉のことを忘れていった。わたしでさえ、姉の声を忘れかけたの。」" },
  { who: "passenger", en: "\"But one night I found this letter in a drawer, and I remembered everything. So I'm taking it to the place where forgotten people go.\"", ja: "「でもある晩、引き出しでこの手紙を見つけて、全部思い出したの。だから、忘れられた人が行く場所へ持っていくのよ。」" },
  { who: "ren", face: "sad", en: "\"...I hope she reads it.\"", ja: "「……お姉さんが、読んでくれるといいですね。」" },
  { who: "passenger", en: "\"So do I. You're looking for someone too, aren't you? Don't wait fifty years, dear. Some words lose their meaning if you keep them too long.\"", ja: "「わたしもそう願ってる。あなたもだれかを探しているんでしょう？50年も待っちゃだめよ。言葉の中には、長くしまっておくと意味をなくしてしまうものもあるの。」" },
  { who: null, en: "When Ren looked back a moment later, the seat was empty. Only the scent of old paper remained.", ja: "少しして振り返ると、その席は空っぽだった。古い紙のにおいだけが残っていた。" }
]);

/* ───────── 第1章 ───────── */
rpgAddAfter("c1", "\"Then perhaps the two are connected.", [
  { who: "ren", en: "\"Wait. Before we go, tell me more about this place. What exactly is Aster?\"", ja: "「待ってくれ。行く前に、もう少しここのことを教えてくれ。アスターって、いったい何なんだ？」" },
  { who: "lina", en: "\"Think of it as the back side of your world. When something is completely forgotten there, it doesn't simply vanish. It falls through, like a coin through a hole in a pocket, and lands here.\"", ja: "「あなたの世界の裏側だと思って。向こうで何かが完全に忘れられると、それはただ消えるんじゃない。ポケットの穴から硬貨が落ちるみたいにこぼれ落ちて、ここにたどり着くの。」" },
  { who: "lina", en: "\"Old toys, songs nobody sings anymore, the names of streets that were rebuilt. And sometimes people. Everything that once mattered to someone.\"", ja: "「古いおもちゃ、もうだれも歌わない歌、作り直された通りの名前。それに、ときには人も。かつてだれかにとって大切だったもの、全部。」" },
  { who: "ren", en: "\"So this village...\"", ja: "「じゃあ、この村も……」" },
  { who: "lina", face: "sad", en: "\"Hollowbrook was a real village once, in your world. A dam was built, and it was flooded. The people moved away, and after a few generations, nobody remembered it at all.\"", ja: "「ホロウブルックは、昔はあなたの世界の本当の村だったの。ダムができて、水の底に沈んだ。人々は引っ越して、何世代かたつと、もうだれも覚えていなかった。」" },
  { who: "lina", en: "\"Here, it gets a second life. Or at least, it used to. Since the Fading began, even forgotten things are being forgotten again.\"", ja: "「ここでは、二度目の命をもらえる。少なくとも、前はそうだった。色あせが始まってから、忘れられたものが、もう一度忘れられていくの。」" },
  { who: "ren", en: "\"Forgotten twice... Then they really disappear?\"", ja: "「二度忘れられたら……本当に消えてしまうのか？」" },
  { who: "lina", face: "sad", en: "\"Yes. There is nowhere further to fall.\"", ja: "「ええ。その先に、落ちていく場所はないから。」" }
]);
rpgAddAfter("c1", "\"These belonged to my grandson...", [
  { who: "elder", en: "\"His name was Tobin. He loved to collect smooth stones from the river and line them up on my windowsill.\"", ja: "「名前はトビンじゃった。川からすべすべの石を拾ってきては、わしの窓辺に並べるのが好きでな。」" },
  { who: "elder", en: "\"When he was seven, he caught a fever. I sat by his bed for three nights. On the fourth morning, he smiled at me and closed his eyes.\"", ja: "「7つのとき、熱を出した。わしは三晩、あの子のそばに座っておった。四日目の朝、あの子はわしにほほえんで、目を閉じた。」" },
  { who: "elder", en: "\"The pain was so heavy that I could not breathe. So when the gray dust came, part of me was glad. I let it take him from my mind.\"", ja: "「あまりに痛みが重くて、息ができんかった。だから灰色の粉が来たとき、わしの一部は喜んだのじゃ。あの子を心から持っていかせてしまった。」" },
  { who: "ren", face: "sad", en: "\"...I understand. More than you think.\"", ja: "「……わかります。思っている以上に。」" },
  { who: "elder", en: "\"But a man who forgets his grandson is no longer a grandfather. He is just an old man sitting in the dark, holding a box he cannot open.\"", ja: "「じゃが、孫を忘れた男は、もう祖父ではない。開けられん箱を抱えて、暗がりに座っておるただの老人じゃ。」" }
]);
rpgAddBefore("c1", "Lina's lantern flickered for a moment", [
  { who: "ren", en: "\"...Mio was the kind of person who apologized when other people bumped into her.\"", ja: "「……ミオは、人がぶつかってきても自分が謝るようなやつだった。」" },
  { who: "ren", en: "\"She was terrible at math but amazing at drawing. She could draw a cat in ten seconds that looked more alive than a real one.\"", ja: "「数学は全然だめなのに、絵はすごくうまかった。10秒で描いたネコが、本物より生きてるみたいに見えるんだ。」" },
  { who: "ren", face: "smile", en: "\"When I was in middle school and got into a fight, she put a bandage on my face with a cat drawn on it. I had to wear it to school for a week.\"", ja: "「俺が中学でけんかしたとき、あいつがネコの絵を描いたばんそうこうを顔に貼ってきてさ。一週間、それで学校に行くはめになった。」" },
  { who: "lina", face: "smile", en: "\"She sounds wonderful.\"", ja: "「すてきな妹さんね。」" },
  { who: "ren", face: "sad", en: "\"She was. She is. ...See? I'm already using the past tense. That's what scares me most.\"", ja: "「すてきだった。……すてきなんだ。ほら、もう過去形で話してる。それがいちばん怖いんだ。」" }
]);

/* ───────── 第2章 ───────── */
rpgAddAfter("c2", "As they walked, the leaves seemed to whisper", [
  { who: "voice", en: "\"...don't forget to buy milk... I'm sorry I yelled... happy birthday, Grandpa... where did I leave my keys...\"", ja: "「……牛乳買うの忘れないでね……どなってごめん……おじいちゃん、誕生日おめでとう……鍵どこに置いたっけ……」" },
  { who: "ren", en: "\"These are all... ordinary things people said.\"", ja: "「これ全部……人が言った、ふつうの言葉だ。」" },
  { who: "lina", en: "\"Ordinary things are the first to be forgotten. Nobody keeps a record of what they said at breakfast. But to someone, those words were the whole world.\"", ja: "「ふつうのことほど、最初に忘れられるの。朝ごはんのときに何を言ったかなんて、だれも記録しない。でも、だれかにとっては、その言葉が世界のすべてだった。」" },
  { who: "lina", en: "\"When I was little, my teacher at the library told me that a person is made of small words more than big events. I didn't understand it then.\"", ja: "「小さいころ、図書館の先生が言ってたの。人は大きな出来事よりも、小さな言葉でできているんだって。そのときは意味がわからなかった。」" },
  { who: "ren", en: "\"And now?\"", ja: "「今は？」" },
  { who: "lina", face: "smile", en: "\"Now I think she was right. When you talked about Mio's cat bandage last night, I felt like I knew her a little.\"", ja: "「今は、先生は正しかったと思う。ゆうべ、あなたがミオのネコのばんそうこうの話をしたとき、わたし、少しだけ彼女を知っている気がしたもの。」" }
]);
rpgAddAfter("c2", "\"Now I remember. I served a young girl", [
  { who: "knight", en: "\"Before that, I was a knight of the old kingdom. My name was Sir Aldous. I swore to protect the princess, but on the night of the fire, I was not there.\"", ja: "「それより前、わたしは古い王国の騎士だった。名はアルダス。王女を守ると誓ったが、火事の夜、わたしはその場にいなかった。」" },
  { who: "knight", en: "\"I was drinking in a tavern, laughing with friends. By the time I ran back, the tower had already fallen. Nobody blamed me. That was the worst part.\"", ja: "「酒場で、友と笑いながら飲んでいたのだ。走って戻ったときには、塔はもう崩れていた。だれもわたしを責めなかった。それがいちばんつらかった。」" },
  { who: "knight", en: "\"I asked to be forgotten, so that no one would remember my failure. And the world granted my wish.\"", ja: "「わたしは、自分の失敗をだれも覚えていないように、忘れられることを願った。そして世界はその願いをかなえた。」" },
  { who: "lina", face: "sad", en: "\"...Just like her.\"", ja: "「……彼女と同じね。」" }
]);

/* ───────── 第3章 ───────── */
rpgAddAfter("c3", "\"Yes. Somewhere in here, there may even be", [
  { who: null, en: "As they walked deeper, the crystals began to show faint images: a child learning to ride a bicycle, a couple dancing in a kitchen, a dog waiting at a train station.", ja: "奥へ進むにつれて、水晶にかすかな映像が浮かび始めた。自転車の練習をする子ども、台所で踊る夫婦、駅で待ち続ける犬。" },
  { who: "ren", en: "\"That dog... it's been waiting a long time, hasn't it?\"", ja: "「あの犬……ずっと待ってるんだよな。」" },
  { who: "lina", face: "sad", en: "\"Its owner moved to another city and never came back. The dog waited every day until it was old. Then everyone forgot both of them.\"", ja: "「飼い主は別の町へ引っ越して、二度と戻らなかった。犬は年をとるまで毎日待っていた。そのあと、みんながふたりとも忘れてしまったの。」" },
  { who: "ren", en: "\"That's cruel.\"", ja: "「ひどい話だな。」" },
  { who: "lina", en: "\"Is it? The dog never stopped believing. I think it was happy, in its own way. Waiting for someone you love is a kind of love too.\"", ja: "「そうかしら。犬は最後まで信じるのをやめなかった。あの子なりに幸せだったと思う。好きな人を待つことも、ひとつの愛だから。」" }
]);
rpgAddAfter("c3", "Garo picked up his axe and the unfinished coat.", [
  { who: "garo", en: "\"I've been digging in this mountain for thirty years. Do you know why I never left?\"", ja: "「わしはこの山を30年掘り続けてきた。なぜ出ていかんかったか、わかるか？」" },
  { who: "ren", en: "\"Because of the crystals?\"", ja: "「水晶のためか？」" },
  { who: "garo", en: "\"Because every morning, I felt I was waiting for someone. I didn't know who. I'd look at the tunnel entrance as if a person might walk in, carrying good news.\"", ja: "「毎朝、だれかを待っておる気がしたからじゃ。だれかはわからん。だれかが朗報を持って入ってきそうな気がして、トンネルの入口を見ておった。」" },
  { who: "garo", en: "\"And every night, I worked on this coat. My hands knew how to sew it, even when my head had forgotten why.\"", ja: "「そして毎晩、この上着を縫っておった。頭がなぜかを忘れても、手は縫い方を覚えておったんじゃ。」" },
  { who: "lina", face: "smile", en: "\"Hands remember things that hearts are afraid to.\"", ja: "「心がこわがって思い出せないことを、手は覚えているものよ。」" },
  { who: "garo", en: "\"Hmph. Library girls and their pretty sayings. ...But maybe you're right.\"", ja: "「ふん。図書館の娘は、気のきいたことを言いおる。……じゃが、そうかもしれんな。」" }
]);

/* ───────── 第4章 ───────── */
rpgAddAfter("c4", "The waterway was dark and cold.", [
  { who: null, en: "Halfway through, they found a small boat tied to a post. An old boatman sat in it, fishing in the black water with no bait on his hook.", ja: "途中で、杭につながれた小舟を見つけた。年老いた渡し守が乗っていて、えさもつけずに黒い水に釣り糸をたらしていた。" },
  { who: "boatman", en: "\"Don't mind me. I'm not trying to catch anything. I'm just waiting until I remember why I came down here.\"", ja: "「気にせんでくれ。何か釣ろうとしとるわけじゃない。なんでここへ下りてきたのか、思い出すのを待っとるだけじゃ。」" },
  { who: "ren", en: "\"How long have you been waiting?\"", ja: "「どれくらい待ってるんですか？」" },
  { who: "boatman", en: "\"Long enough that I've forgotten that too. Ha! But I'll tell you something useful. The guards above take memories at the gate. The sadder the memory, the more they want it.\"", ja: "「それも忘れてしまうくらい長くじゃよ。はっは！だが、役に立つことを教えてやろう。上の衛兵は門で記憶を取り上げる。悲しい記憶ほど、欲しがるのさ。」" },
  { who: "garo", en: "\"Why would anyone want sad memories?\"", ja: "「なんでまた、悲しい記憶なんぞ欲しがるんじゃ？」" },
  { who: "boatman", en: "\"Because sad memories are the heaviest. And the Queen in the sky collects heavy things to keep her castle floating. That's what the smugglers say, anyway.\"", ja: "「悲しい記憶がいちばん重いからさ。空の女王は、城を浮かべておくために重いものを集めとる。少なくとも、密輸人どもはそう言っとる。」" },
  { who: "lina", face: "surprised", en: "\"A Queen in the sky...?\"", ja: "「空の女王……？」" }
]);
rpgAddAfter("c4", "\"Thank you. I'll tell you everything someday.", [
  { who: null, en: "Further on, they heard voices. Two men in dark cloaks were loading glowing jars onto a cart.", ja: "さらに進むと、声が聞こえた。黒いマントの男がふたり、光るびんを荷車に積んでいた。" },
  { who: "smuggler", en: "\"Careful with that one. It's a first kiss. Very rare, very expensive. The rich folks in the capital will pay a fortune for it.\"", ja: "「そいつは慎重に扱え。初めてのキスだ。めったにない、高く売れる。王都の金持ちどもが大金を払うぞ。」" },
  { who: "ren", en: "\"You're selling people's memories?\"", ja: "「人の記憶を売ってるのか？」" },
  { who: "smuggler", en: "\"Selling? We're saving them! The castle burns whatever people give up. We pick up what we can before it reaches the fire. Somebody might as well enjoy them.\"", ja: "「売ってる？救ってるんだよ！城は人が手放したものを全部燃やす。火に届く前に、拾えるだけ拾ってるのさ。だれかが楽しんだっていいだろう。」" },
  { who: "lina", en: "\"Memories belong to the people who made them.\"", ja: "「記憶は、それをつくった人のものよ。」" },
  { who: "smuggler", en: "\"Then tell those people to stop throwing them away, miss.\"", ja: "「なら、その人たちに捨てるのをやめろって言ってくれよ、お嬢さん。」" },
  { who: null, en: "Nobody could answer him. The smugglers pushed their cart into the dark and were gone.", ja: "だれも言い返せなかった。密輸人たちは荷車を押して、暗闇の中へ消えていった。" }
]);

/* ───────── 第5章 ───────── */
rpgAddAfter("c5", "\"Mercy? A man who forgets his own daughter", [
  { who: null, en: "In the main square, a long line of people waited in front of a white tent. Above it hung a banner: \"Leave your burden. Walk away light.\"", ja: "中央広場では、白いテントの前に長い列ができていた。その上に旗がかかっていた。「重荷を置いていきなさい。軽くなって歩き出しなさい」。" },
  { who: null, en: "A young mother stood in line, holding a crying baby. A soldier with one arm. An old man whose wife had left him. A boy who had failed his exam.", ja: "泣いている赤ん坊を抱いた若い母親が並んでいた。片腕の兵士。妻に去られた老人。試験に落ちた少年。" },
  { who: "ren", en: "\"A boy who failed his exam...\"", ja: "「試験に落ちた少年……」" },
  { who: "garo", en: "\"Ha. Don't get any ideas, boy. Your exams are still waiting for you back home.\"", ja: "「はっ。妙な気を起こすなよ、坊主。おまえの試験は、元の世界でまだ待っとるんじゃろう。」" },
  { who: "ren", face: "smile", en: "\"Don't remind me.\"", ja: "「思い出させるなよ。」" },
  { who: "lina", face: "sad", en: "\"Look at their faces when they come out. They're smiling. But they don't look at anyone. It's as if they're walking alone in an empty world.\"", ja: "「出てくる人たちの顔を見て。笑ってる。でも、だれのことも見ていない。からっぽの世界を、ひとりで歩いているみたい。」" }
]);
rpgAddAfter("c5", "\"...Strange. When your sword hit my armor,", [
  { who: "captain", en: "\"My mother sang to me every night when I was small. A song about a little boat that always found its way home.\"", ja: "「小さいころ、母は毎晩歌ってくれた。いつでも家に帰る道を見つける、小さな舟の歌だ。」" },
  { who: "captain", en: "\"When she died, I gave her song to the tent. I thought being a good soldier meant feeling nothing. I was wrong.\"", ja: "「母が亡くなったとき、わたしはその歌をテントに差し出した。よい兵士とは何も感じないことだと思っていた。まちがいだった。」" },
  { who: "captain", en: "\"Go. I will tell the guards that I lost you in the corridors. It's the first order I've disobeyed in twenty years.\"", ja: "「行け。衛兵には、廊下でおまえたちを見失ったと言っておく。20年で初めて、命令に背くことになるな。」" }
]);

/* ───────── 第6章 ───────── */
rpgAddAfter("c6", "\"So many... Is Ella's memory of me burning here too?\"", [
  { who: "priest", en: "\"Welcome, travelers. I am the Lantern Keeper. I tend these flames until they go out.\"", ja: "「ようこそ、旅の方。わたしは灯守り。この炎たちが消えるまで、世話をしているのです。」" },
  { who: "ren", en: "\"Can you put them back? Into the people they came from?\"", ja: "「元の人に戻せないのか？」" },
  { who: "priest", en: "\"Only if the person truly wants them back. A memory cannot be forced on someone. It must be welcomed home.\"", ja: "「その人が本当に取り戻したいと願った場合だけです。記憶は押しつけることはできない。おかえりと迎えてもらわなければならないのです。」" },
  { who: null, en: "Ren walked slowly along the wall of flames. Suddenly he stopped. One small flame showed a kitchen he knew well: his mother, laughing, holding a birthday cake with fifteen candles.", ja: "レンはゆっくりと炎の壁に沿って歩いた。突然、足が止まった。小さな炎のひとつに、よく知っている台所が映っていた。母が笑いながら、15本のろうそくが立ったケーキを持っている。" },
  { who: "ren", face: "surprised", en: "\"That's Mio's fifteenth birthday... This is Mom's memory. She gave it up?\"", ja: "「ミオの15歳の誕生日だ……これ、母さんの記憶だ。母さん、手放したのか？」" },
  { who: "lina", face: "sad", en: "\"Not by choice, Ren. When Mio wished to be forgotten, every memory of her in your world fell here. Your mother didn't give it up. It was taken.\"", ja: "「自分で選んだんじゃないわ、レン。ミオが忘れられたいと願ったとき、あなたの世界にあった彼女の記憶が全部ここに落ちてきたの。お母さんは手放したんじゃない。奪われたのよ。」" },
  { who: "ren", en: "\"Then I'll bring them all back. Every single one.\"", ja: "「なら、全部取り戻す。ひとつ残らず。」" },
  { who: "priest", en: "\"Then you must reach the one who made the wish. Only she can undo it.\"", ja: "「では、願いをかけた本人のもとへ行かねばなりません。それを解けるのは、彼女だけです。」" }
]);

/* ===== 宿屋で泊まったときの仲間の会話（条件に合う、まだ見ていないものを1つ） ===== */
const GINNTALK = [
  { id: "inn1", need: "lina_joined", not: "c1_done", nodes: [
    { who: null, en: "That night, Ren couldn't sleep. He went downstairs and found Lina reading by the fire.", ja: "その夜、レンは眠れなかった。階下へ下りると、リナが暖炉のそばで本を読んでいた。" },
    { who: "lina", en: "\"Can't sleep? Me neither. I always read when my head is too full.\"", ja: "「眠れないの？わたしも。頭がいっぱいのときは、いつも本を読むの。」" },
    { who: "ren", en: "\"What are you reading?\"", ja: "「何を読んでるんだ？」" },
    { who: "lina", face: "smile", en: "\"A cookbook from your world. Nobody has cooked these recipes in a hundred years. Listen: \"Grandmother's Sunday Stew. Add love generously.\"\"", ja: "「あなたの世界の料理の本。このレシピ、100年だれも作ってないの。聞いて。『おばあちゃんの日曜シチュー。愛情をたっぷり入れること』。」" },
    { who: "ren", face: "smile", en: "\"That's not a real measurement.\"", ja: "「それ、分量じゃないだろ。」" },
    { who: "lina", face: "smile", en: "\"It's the most important one, though.\"", ja: "「でも、いちばん大事な分量よ。」" }
  ] },
  { id: "inn2", need: "c1_done", not: "c2_done", nodes: [
    { who: "ren", en: "\"Lina, how long have you lived in the library?\"", ja: "「リナ、図書館にはどれくらい住んでるんだ？」" },
    { who: "lina", en: "\"Longer than I can count. The days in Aster are strange. They don't add up the way they do in your world.\"", ja: "「数えきれないくらい。アスターの日々はふしぎなの。あなたの世界みたいに、足し算にならない。」" },
    { who: "ren", en: "\"Do you have a family?\"", ja: "「家族はいるのか？」" },
    { who: "lina", face: "sad", en: "\"I... I think I had a mother who braided my hair every morning. I remember the feeling of her fingers. But not her face.\"", ja: "「わたし……毎朝、髪を編んでくれるお母さんがいた気がする。指の感触は覚えてる。でも、顔は思い出せない。」" },
    { who: "ren", en: "\"...Sorry. I shouldn't have asked.\"", ja: "「……ごめん。聞くべきじゃなかった。」" },
    { who: "lina", face: "smile", en: "\"No, I'm glad you did. Nobody has asked me that in a very long time.\"", ja: "「ううん、聞いてくれてうれしい。そんなこと聞かれたの、ずいぶん久しぶりだから。」" }
  ] },
  { id: "inn3", need: "c4_done", not: "c5_done", nodes: [
    { who: null, en: "In the capital inn, Garo was snoring loudly. Ren and Lina sat by the window, looking at the white castle under the moon.", ja: "王都の宿屋で、ガロは大いびきをかいていた。レンとリナは窓辺に座り、月の下の白い城をながめていた。" },
    { who: "ren", en: "\"Garo snores like a broken engine.\"", ja: "「ガロのいびき、壊れたエンジンみたいだな。」" },
    { who: "lina", face: "smile", en: "\"I think it's comforting. It means someone is here, alive and safe.\"", ja: "「わたしは、ほっとする音だと思う。だれかがここにいて、生きていて、無事だっていう音だから。」" },
    { who: "ren", en: "\"Back home, I used to complain about Mio's alarm clock. It rang five times every morning, and she never woke up until the last one.\"", ja: "「元の世界じゃ、ミオの目覚まし時計に文句ばっかり言ってた。毎朝5回鳴って、最後の1回まで絶対に起きないんだ。」" },
    { who: "ren", face: "sad", en: "\"This past year, the house has been so quiet. I'd give anything to hear that stupid alarm again.\"", ja: "「この1年、家がすごく静かなんだ。あのうるさい目覚ましがまた聞けるなら、なんだってする。」" },
    { who: "lina", en: "\"Then let's make sure you do.\"", ja: "「なら、絶対に聞けるようにしましょう。」" }
  ] },
  { id: "inn4", need: "c5_done", not: "c7_done", nodes: [
    { who: "garo", en: "\"Boy. Can I ask you something? What will you say to your sister when you find her?\"", ja: "「坊主。ひとつ聞いてもいいか？妹を見つけたら、なんと言うつもりじゃ？」" },
    { who: "ren", en: "\"...I've thought about it every day. \"Come home.\" \"I missed you.\" \"I'm sorry.\" But none of them feel right.\"", ja: "「……毎日考えてる。『帰ろう』『会いたかった』『ごめん』。でも、どれもしっくりこないんだ。」" },
    { who: "garo", en: "\"When Ella left for the capital, I said, \"Don't forget to eat.\" That was all. I regretted it for years.\"", ja: "「エラが王都へ発つとき、わしは『ちゃんと食えよ』とだけ言った。それだけじゃ。何年も後悔した。」" },
    { who: "garo", en: "\"But now I think it was fine. She knew what I meant. Sometimes the simplest words carry the most.\"", ja: "「じゃが今は、あれでよかったと思う。あの子はわしの言いたいことをわかっとった。いちばん単純な言葉が、いちばん多くを運ぶこともある。」" },
    { who: "ren", face: "smile", en: "\"...Thanks, Garo.\"", ja: "「……ありがとな、ガロ。」" }
  ] }
];

/* ===== 町の人の長い会話 ===== */
Object.assign(GLINES, {
  baker: [
    { who: "baker", en: "\"Fresh bread! The price? Hmm... I wrote it on a card, but I can't read my own handwriting anymore.\"", ja: "「焼きたてのパンだよ！お値段？うーん……札に書いたんだけど、もう自分の字が読めなくて。」" },
    { who: "baker", en: "\"You know, I've baked the same bread every morning for twenty years. My hands know the recipe, but I've forgotten who taught it to me.\"", ja: "「ねえ、わたし20年、毎朝同じパンを焼いてるの。手はレシピを覚えてる。でも、だれに教わったのかは忘れちゃった。」" },
    { who: "baker", en: "\"Sometimes, when the dough rises just right, I feel like someone is standing behind me, smiling. Isn't that strange?\"", ja: "「ときどき、生地がちょうどよくふくらむと、だれかがうしろでほほえんでいる気がするの。ふしぎでしょう？」" }
  ],
  boy: [
    { who: "child", en: "\"That girl over there is my best friend. I think. She told me so this morning.\"", ja: "「あそこの子、ぼくの親友なんだ。たぶん。今朝、本人がそう言ってた。」" },
    { who: "child", en: "\"Every morning we introduce ourselves again. It's kind of fun, actually. We become best friends every single day.\"", ja: "「毎朝、自己紹介しなおすんだ。じつはけっこう楽しいよ。毎日、親友になれるんだもん。」" },
    { who: "child", en: "\"But yesterday she cried and said she was scared that one day she wouldn't want to be my friend. I didn't know what to say.\"", ja: "「でも、きのうあの子が泣いて言ったんだ。いつか、ぼくと友だちになりたいと思わなくなる日が来るのがこわいって。なんて言えばいいかわからなかった。」" }
  ],
  man: [
    { who: "villager", en: "\"I've lived here for forty years, but every morning the streets look a little less familiar.\"", ja: "「この村に40年住んでるが、毎朝、通りが少しずつ見慣れないものになっていくんだ。」" },
    { who: "villager", en: "\"Yesterday I walked into the wrong house and sat down for dinner. The family was very kind about it. They gave me soup.\"", ja: "「きのうは、まちがえてよその家に入って、夕食の席についてしまった。その家族はとても親切でね。スープを出してくれたよ。」" },
    { who: "villager", en: "\"Maybe that's what will save us in the end. Even if we forget each other, we can still be kind to strangers.\"", ja: "「最後にわたしたちを救うのは、そういうことなのかもしれん。たとえおたがいを忘れても、知らない人にやさしくすることはできる。」" }
  ],
  capital_man: [
    { who: "villager", en: "\"I gave away the memory of my first love. Now I can't remember why I feel lonely at night.\"", ja: "「初恋の記憶を差し出したんだ。今は、なぜ夜になるとさびしいのか思い出せない。」" },
    { who: "villager", en: "\"The tent said I'd feel lighter. And I do. But lighter isn't the same as happier, is it?\"", ja: "「テントの人は、軽くなるって言った。たしかに軽い。でも、軽いってことは、幸せってことと同じじゃないよな。」" }
  ],
  capital_scholar: [
    { who: "scholar", en: "\"Are you travelers? Then let me tell you the history of this city, before I forget it too.\"", ja: "「旅の方ですか？では、この街の歴史をお話ししましょう。わたしまで忘れてしまう前に。」" },
    { who: "scholar", en: "\"Aster's capital was built by people who refused to let anything be lost. The Great Library was its heart. Every citizen once donated one book a year.\"", ja: "「アスターの王都は、何ひとつ失わせまいとした人々が築いた街です。大図書館はその心臓でした。市民はかつて、毎年1冊ずつ本を寄贈していたのです。」" },
    { who: "scholar", en: "\"Now the library is sealed, and people line up to give away their memories instead. I wonder what the founders would say.\"", ja: "「今では図書館は封印され、人々は本の代わりに記憶を差し出す列に並んでいる。建国者たちが見たら、なんと言うでしょうね。」" }
  ],
  capital_widow: [
    { who: "widow", en: "\"My husband died last spring. Everyone tells me to visit the white tent. They say I'll stop hurting.\"", ja: "「夫は去年の春に亡くなりました。みんな、白いテントに行けと言います。痛みが消えるから、と。」" },
    { who: "widow", en: "\"But if I stop hurting, I'll stop remembering how he hummed while he shaved. How he burned the toast every morning.\"", ja: "「でも、痛みが消えたら、ひげをそりながら鼻歌を歌っていたことも、毎朝トーストを焦がしていたことも、思い出せなくなる。」" },
    { who: "widow", en: "\"So I keep the pain. It's the last thing he gave me.\"", ja: "「だから、痛みは持っておくの。それが、あの人がくれた最後のものだから。」" }
  ],
  capital_soldier: [
    { who: "soldier", en: "\"Captain Varos? He used to be the kindest officer in the castle. He'd sing to the new recruits when they were homesick.\"", ja: "「ヴァロス隊長？昔は城でいちばんやさしい士官だったよ。新兵がホームシックになると、歌を歌ってやってたんだ。」" },
    { who: "soldier", en: "\"Then his mother died, and he went to the white tent. He hasn't sung since. Now he just follows orders.\"", ja: "「でもお母さんが亡くなって、白いテントへ行った。それ以来、一度も歌ってない。今は命令に従うだけさ。」" }
  ],
  village_kid2: [
    { who: "child", en: "\"Do you want to see my diary? I write down everyone's name every night, so I won't forget them.\"", ja: "「ぼくの日記、見る？忘れないように、毎晩みんなの名前を書いてるんだ。」" },
    { who: "child", en: "\"Look, here's you. \"The red-haired boy who looked sad.\" I don't know your name yet, so I wrote that.\"", ja: "「ほら、ここにお兄さんのことも書いた。『悲しそうな顔をした赤い髪の人』。名前はまだ知らないから、そう書いたんだ。」" },
    { who: "ren", face: "smile", en: "\"It's Ren. You can write that instead.\"", ja: "「レンだよ。そう書いといてくれ。」" }
  ]
});
// 新しい町の人
GMAPS.village.npcs.push({ id: "kid2", sprite: "boy", x: 21, y: 12, dir: 3, lines: "village_kid2" });
GMAPS.capital.npcs.push(
  { id: "c_scholar", sprite: "oldman", x: 4, y: 11, dir: 2, lines: "capital_scholar" },
  { id: "c_widow", sprite: "oldwoman", x: 20, y: 11, dir: 1, lines: "capital_widow" },
  { id: "c_soldier", sprite: "soldier", x: 13, y: 15, dir: 0, lines: "capital_soldier" }
);
