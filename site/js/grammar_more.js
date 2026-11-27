/* ===== 英熟語（12単元）と古文の品詞（9単元）：8問ずつ・4択 =====
   形は GQ と同じ：[問題文, [選択肢4つ], 正解の番号, ひとこと解説]。選択肢は出すときに並べ替える。 */
GRAMMAR.id = { name: "英熟語", units: ["動詞＋副詞①", "動詞＋前置詞", "be＋形容詞＋前置詞", "前置詞のかたまり", "動詞＋A＋前置詞＋B", "決まった言い方", "動詞＋副詞②", "言いかえ（同じ意味）", "副詞のかたまり", "make・take・have など", "構文", "会話の決まり文句"] };
GRAMMAR.kh = { name: "古文の品詞", units: ["動詞の活用の種類", "活用形と「ば」", "形容詞・形容動詞", "格助詞・接続助詞", "係助詞・係り結び", "副助詞・終助詞", "敬語の種類", "敬意の向き", "呼応の副詞"] };
Object.assign(GQ, {
  id0: [
    ["She takes （　） her mother.", ["after", "over", "off", "in"], 0, "take after＝（親に）似ている"],
    ["I can't put up （　） his rudeness.", ["with", "for", "on", "at"], 0, "put up with＝がまんする（＝tolerate）"],
    ["We have to carry （　） the plan.", ["out", "away", "off", "up"], 0, "carry out＝実行する"],
    ["The game was called （　） because of the rain.", ["off", "out", "up", "on"], 0, "call off＝中止する（＝cancel）"],
    ["He came （　） a good idea.", ["up with", "across", "out of", "down to"], 0, "come up with＝思いつく"],
    ["I came （　） an old friend at the station.", ["across", "up with", "over", "into"], 0, "come across＝偶然出会う・見つける"],
    ["Look （　） the word in your dictionary.", ["up", "after", "into", "for"], 0, "look up＝（辞書で）調べる"],
    ["Don't give （　） your dream.", ["up", "in", "off", "out"], 0, "give up＝あきらめる"]
  ],
  id1: [
    ["Smoking may result （　） cancer.", ["in", "from", "of", "to"], 0, "A result in B＝AがBという結果になる"],
    ["His success resulted （　） hard work.", ["from", "in", "on", "with"], 0, "A result from B＝AはBから生じる（向きに注意）"],
    ["Who will look （　） the baby?", ["after", "up", "into", "over"], 0, "look after＝世話をする（＝take care of）"],
    ["I'm looking forward to （　） you.", ["seeing", "see", "saw", "be seen"], 0, "look forward to ～ing。to の後は動名詞"],
    ["He turned （　） the offer.", ["down", "up", "in", "over"], 0, "turn down＝断る（＝reject）"],
    ["The rumor turned （　） to be true.", ["out", "up", "down", "off"], 0, "turn out (to be)＝～だとわかる"],
    ["The fire broke （　） last night.", ["out", "down", "up", "into"], 0, "break out＝（戦争・火事などが）起こる"],
    ["We ran （　） of gas.", ["out", "away", "off", "over"], 0, "run out of＝～を切らす"]
  ],
  id2: [
    ["She is good （　） cooking.", ["at", "in", "for", "of"], 0, "be good at＝～が得意"],
    ["I'm afraid （　） dogs.", ["of", "at", "with", "for"], 0, "be afraid of＝～がこわい"],
    ["He is proud （　） his son.", ["of", "for", "with", "about"], 0, "be proud of＝～を誇りに思う（＝take pride in）"],
    ["The town is famous （　） its hot springs.", ["for", "as", "of", "with"], 0, "be famous for＝～で有名。famous as は「～として有名」"],
    ["This desk is made （　） wood.", ["of", "from", "into", "by"], 0, "材料が見た目でわかる＝of。原料が変化する（ワイン←ぶどう）＝from"],
    ["Butter is made （　） milk.", ["from", "of", "into", "with"], 0, "原料が変化して見えない＝from"],
    ["She is familiar （　） the subject.", ["with", "to", "for", "of"], 0, "人 be familiar with 物＝人が物をよく知っている"],
    ["The song is familiar （　） everyone.", ["to", "with", "for", "at"], 0, "物 be familiar to 人＝物が人によく知られている"]
  ],
  id3: [
    ["（　） spite of the rain, we went out.", ["In", "On", "At", "For"], 0, "in spite of＝～にもかかわらず（＝despite）"],
    ["（　） of the rain, the game was put off.", ["Because", "Since", "Though", "Despite"], 0, "because of＝～のために（理由）"],
    ["He passed （　） to his teacher's help.", ["thanks", "because", "instead", "in spite"], 0, "thanks to＝～のおかげで"],
    ["（　） addition to English, he speaks French.", ["In", "On", "By", "With"], 0, "in addition to＝～に加えて"],
    ["Instead （　） going out, we stayed home.", ["of", "for", "from", "to"], 0, "instead of＝～の代わりに"],
    ["According （　） the news, it will snow.", ["to", "with", "for", "on"], 0, "according to＝～によれば"],
    ["He spoke on （　） of the class.", ["behalf", "top", "purpose", "means"], 0, "on behalf of＝～を代表して"],
    ["He crossed the river by （　） of a boat.", ["means", "hand", "help", "use"], 0, "by means of＝～を使って"]
  ],
  id4: [
    ["The rain prevented us （　） going out.", ["from", "of", "to", "with"], 0, "prevent / keep / stop A from ～ing＝Aが～するのを妨げる"],
    ["He robbed me （　） my wallet.", ["of", "from", "with", "off"], 0, "rob 人 of 物＝人から物を奪う"],
    ["Please remind me （　） the meeting.", ["of", "for", "to", "with"], 0, "remind A of B＝AにBを思い出させる"],
    ["The school provides students （　） lunch.", ["with", "for", "to", "of"], 0, "provide 人 with 物（＝provide 物 for 人）"],
    ["She thanked him （　） his help.", ["for", "of", "with", "on"], 0, "thank 人 for ～＝～のことで人に感謝する"],
    ["They blamed him （　） the accident.", ["for", "of", "on", "to"], 0, "blame 人 for ～＝～を人のせいにする"],
    ["Compare this picture （　） that one.", ["with", "for", "of", "by"], 0, "compare A with B＝AとBを比べる"],
    ["I congratulate you （　） your success.", ["on", "for", "of", "with"], 0, "congratulate 人 on ～＝～のことで人を祝う"]
  ],
  id5: [
    ["It goes （　） saying that health is important.", ["without", "with", "for", "on"], 0, "It goes without saying that ～＝～は言うまでもない"],
    ["There is no （　） crying over spilt milk.", ["use", "need", "way", "point to"], 0, "It is no use ～ing／There is no use ～ing＝～してもむだだ"],
    ["I couldn't help （　） at the joke.", ["laughing", "laugh", "to laugh", "laughed"], 0, "cannot help ～ing＝～せずにはいられない"],
    ["He is （　） to come. Don't worry.", ["sure", "worth", "busy", "used"], 0, "be sure to＝きっと～する"],
    ["I make it a rule （　） jog every morning.", ["to", "for", "of", "that"], 0, "make it a rule to＝～することにしている"],
    ["It is no （　） that he passed. He studied hard.", ["wonder", "doubt", "use", "matter"], 0, "It is no wonder that ～＝～は不思議ではない"],
    ["He was on the （　） of leaving when the phone rang.", ["point", "time", "place", "end"], 0, "be on the point of ～ing＝今にも～しようとしている（＝be about to）"],
    ["I don't feel （　） going out tonight.", ["like", "to", "for", "as"], 0, "feel like ～ing＝～したい気がする"]
  ],
  id6: [
    ["Please hand （　） your report by Friday.", ["in", "out", "over", "on"], 0, "hand in＝提出する（＝submit, turn in）"],
    ["I'll pick you （　） at seven.", ["up", "out", "off", "on"], 0, "pick up＝車で迎えに行く・拾い上げる"],
    ["We must get （　） of bad habits.", ["rid", "out", "away", "free"], 0, "get rid of＝取り除く"],
    ["He gets （　） well with his classmates.", ["along", "over", "through", "up"], 0, "get along with＝うまくやっていく"],
    ["The plane took （　） on time.", ["off", "out", "up", "over"], 0, "take off＝離陸する・（服を）脱ぐ"],
    ["Hold （　） a minute, please.", ["on", "in", "off", "out"], 0, "Hold on.＝（電話で）切らずに待つ"],
    ["I'll see you （　） at the airport.", ["off", "out", "up", "over"], 0, "see 人 off＝人を見送る"],
    ["They put （　） the meeting until Monday.", ["off", "out", "on", "up"], 0, "put off＝延期する（＝postpone）"]
  ],
  id7: [
    ["put off とほぼ同じ意味は？", ["postpone", "cancel", "continue", "start"], 0, "延期する"],
    ["call off とほぼ同じ意味は？", ["cancel", "postpone", "phone", "shout"], 0, "中止する"],
    ["look up to とほぼ同じ意味は？", ["respect", "despise", "search", "visit"], 0, "尊敬する。反対は look down on（＝despise）"],
    ["look down on とほぼ同じ意味は？", ["despise", "respect", "examine", "admire"], 0, "見下す・軽蔑する"],
    ["make up for とほぼ同じ意味は？", ["compensate for", "invent", "prepare", "decide"], 0, "埋め合わせる"],
    ["take part in とほぼ同じ意味は？", ["participate in", "separate", "take after", "divide"], 0, "参加する"],
    ["stand for とほぼ同じ意味は？", ["represent", "tolerate", "stand up", "support"], 0, "表す。我慢する（tolerate）の意味もあるが、まずは「表す」"],
    ["come about とほぼ同じ意味は？", ["happen", "arrive", "return", "agree"], 0, "起こる（＝occur, take place）"]
  ],
  id8: [
    ["I met her by （　）.", ["chance", "luck", "purpose", "means"], 0, "by chance＝偶然に（＝by accident）"],
    ["（　） all, he didn't come.", ["After", "Above", "At", "In"], 0, "after all＝結局"],
    ["He broke the window on （　）.", ["purpose", "chance", "time", "duty"], 0, "on purpose＝わざと"],
    ["I see him （　） and then.", ["now", "here", "then", "once"], 0, "now and then＝時々（＝sometimes）"],
    ["We eat out once （　） a while.", ["in", "for", "at", "on"], 0, "once in a while＝時々"],
    ["He left Japan for （　）.", ["good", "well", "fine", "nice"], 0, "for good＝永久に"],
    ["In （　）, he is a nice person.", ["fact", "true", "deed", "real"], 0, "in fact＝実際は"],
    ["It will take at （　） an hour.", ["least", "less", "last", "little"], 0, "at least＝少なくとも。at most＝せいぜい"]
  ],
  id9: [
    ["You should make （　） of this chance.", ["use", "fun", "way", "hand"], 0, "make use of＝利用する"],
    ["Please take （　） of my dog.", ["care", "part", "place", "turn"], 0, "take care of＝世話をする"],
    ["They made （　） of his strange hat and laughed.", ["fun", "sense", "sure", "way"], 0, "make fun of＝からかう"],
    ["We take （　） for granted that water is free.", ["it", "that", "this", "them"], 0, "take it for granted that ～＝～を当然と思う"],
    ["This sentence doesn't make （　）.", ["sense", "use", "fun", "way"], 0, "make sense＝意味が通じる"],
    ["He took advantage （　） my kindness.", ["of", "for", "on", "in"], 0, "take advantage of＝利用する・つけこむ"],
    ["I have （　） to do with the case.", ["nothing", "none", "no", "not"], 0, "have nothing to do with＝～と関係がない"],
    ["Pay （　） to the teacher.", ["attention", "notice", "care", "mind"], 0, "pay attention to＝～に注意を払う"]
  ],
  id10: [
    ["He is not a doctor （　） a nurse.", ["but", "and", "or", "so"], 0, "not A but B＝AではなくB"],
    ["She speaks not only English but （　） Chinese.", ["also", "too", "as well", "either"], 0, "not only A but also B＝AだけでなくBも"],
    ["He plays the guitar as well （　） the piano.", ["as", "so", "than", "like"], 0, "A as well as B＝BだけでなくAも"],
    ["He is no （　） than a child.", ["more", "most", "better", "other"], 0, "no more than＝～にすぎない（＝only）"],
    ["（　） soon as he arrived, it began to rain.", ["As", "So", "Too", "Very"], 0, "as soon as＝～するとすぐに"],
    ["He studied hard （　） that he could pass.", ["so", "such", "as", "too"], 0, "so that S can ～＝～できるように（目的）"],
    ["I was too tired （　） walk.", ["to", "for", "that", "and"], 0, "too ～ to …＝～すぎて…できない"],
    ["It was not until he was 30 （　） he started to study.", ["that", "when", "which", "and"], 0, "It is not until A that B＝Aになって初めてB"]
  ],
  id11: [
    ["\"Thank you.\" \"You're （　）.\"", ["welcome", "right", "sure", "fine"], 0, "どういたしまして"],
    ["\"Do you mind if I open the window?\" \"（　） at all.\"", ["Not", "No", "Yes", "Sure"], 0, "mind は「いやがる」。Not at all.＝全然かまいません"],
    ["Help yourself （　） the cake.", ["to", "with", "for", "on"], 0, "help yourself to ～＝～を自由に取って食べてね"],
    ["Make yourself at （　）.", ["home", "house", "ease", "rest"], 0, "くつろいでね"],
    ["I'm sick （　） his complaints.", ["of", "with", "about", "for"], 0, "be sick of＝～にうんざりしている（＝be tired of）"],
    ["I'm sorry （　） being late.", ["for", "of", "to", "at"], 0, "be sorry for ～＝～をすまなく思う"],
    ["How about （　） out for dinner?", ["going", "go", "to go", "went"], 0, "How about ～ing?＝～するのはどう？"],
    ["Would you mind （　） the door?", ["opening", "to open", "open", "opened"], 0, "Would you mind ～ing?＝～していただけますか（mind の後は動名詞）"]
  ],
  kh0: [
    ["「書く」の活用の種類は？", ["四段", "上二段", "下二段", "ラ変"], 0, "「ず」を付けて「書かず」＝a段 → 四段"],
    ["「見る」の活用の種類は？", ["上一段", "上二段", "四段", "下一段"], 0, "上一段は「ひいきにみゐる」（干る・射る・着る・似る・煮る・見る・居る・率る など）"],
    ["「蹴る」の活用の種類は？", ["下一段", "四段", "上一段", "ラ変"], 0, "下一段は「蹴る」1語だけ"],
    ["「来（く）」の活用の種類は？", ["カ変", "サ変", "四段", "上二段"], 0, "カ変は「来」1語（こ・き・く・くる・くれ・こ（よ））"],
    ["「おはす」の活用の種類は？", ["サ変", "カ変", "ラ変", "下二段"], 0, "サ変は「す」「おはす」"],
    ["「死ぬ」の活用の種類は？", ["ナ変", "四段", "下二段", "上二段"], 0, "ナ変は「死ぬ」「往ぬ（去ぬ）」の2語"],
    ["「あり」の活用の種類は？", ["ラ変", "四段", "上一段", "サ変"], 0, "ラ変は「あり・をり・はべり・いまそかり」。終止形が i段になる"],
    ["「起く」の活用の種類は？", ["上二段", "下二段", "四段", "上一段"], 0, "「起きず」＝i段 → 上二段（上一段の語ではないので）"]
  ],
  kh1: [
    ["「受く」の活用の種類は？", ["下二段", "上二段", "四段", "下一段"], 0, "「受けず」＝e段 → 下二段"],
    ["上一段動詞でないものは？", ["落つ", "見る", "着る", "射る"], 0, "落つ は上二段（落ちず）"],
    ["係助詞「こそ」の結びの活用形は？", ["已然形", "連体形", "終止形", "命令形"], 0, "ぞ・なむ・や・か → 連体形、こそ → 已然形"],
    ["係助詞「ぞ・なむ・や・か」の結びの活用形は？", ["連体形", "已然形", "未然形", "終止形"], 0, "こそ だけが已然形"],
    ["「已然形＋ば」の意味は？", ["確定条件（～ので・～と）", "仮定条件（もし～ならば）", "逆接（～けれども）", "打消"], 0, "已然形は「すでにそうなっている」形"],
    ["「未然形＋ば」の意味は？", ["仮定条件（もし～ならば）", "確定条件（～ので）", "逆接", "並列"], 0, "未然形は「まだそうなっていない」形"],
    ["四段動詞「書く」の已然形は？", ["書け", "書か", "書き", "書く"], 0, "か・き・く・く・け・け"],
    ["下二段動詞「受く」の連体形は？", ["受くる", "受く", "受けよ", "受くれ"], 0, "け・け・く・くる・くれ・けよ"]
  ],
  kh2: [
    ["形容詞の活用の種類は？", ["ク活用・シク活用", "ナリ活用・タリ活用", "四段・二段", "ラ変・ナ変"], 0, "形容動詞はナリ・タリ"],
    ["「うつくし」の活用の種類は？", ["シク活用", "ク活用", "ナリ活用", "タリ活用"], 0, "「なる」を付けて「うつくしくなる」→ しく → シク活用"],
    ["「高し」の活用の種類は？", ["ク活用", "シク活用", "ナリ活用", "四段"], 0, "「高くなる」→ く → ク活用"],
    ["形容動詞の活用の種類は？", ["ナリ活用・タリ活用", "ク活用・シク活用", "上一段・下一段", "サ変・カ変"], 0, "静かなり（ナリ）、堂々たり（タリ）"],
    ["「あはれなり」の活用の種類は？", ["ナリ活用", "タリ活用", "シク活用", "ラ変"], 0, "～なり の形容動詞"],
    ["「堂々たり」の活用の種類は？", ["タリ活用", "ナリ活用", "ク活用", "四段"], 0, "漢語＋たり → タリ活用"],
    ["形容詞の補助活用（から・かり・かる・かれ）は主にどんなときに使う？", ["下に助動詞が付くとき", "文の終わり", "下に名詞が付くとき", "係り結び"], 0, "高からず・高かりけり のように助動詞に続く"],
    ["形容詞「をかし」の意味は？", ["趣がある", "おかしい（変だ）", "悲しい", "恐ろしい"], 0, "古文の をかし は「趣がある・かわいらしい」"]
  ],
  kh3: [
    ["「白き鳥の、はしと脚と赤き」の「の」は？", ["同格（～で）", "主格（～が）", "連体修飾（～の）", "比喩（～のように）"], 0, "白い鳥で、くちばしと脚が赤い鳥 → 同格"],
    ["「月の出づる」の「の」は？", ["主格（～が）", "同格", "連体修飾", "比喩"], 0, "月が出る → 主格"],
    ["接続助詞「ど・ども」の意味は？", ["逆接確定（～けれども）", "順接確定（～ので）", "逆接仮定（たとえ～ても）", "反復"], 0, "已然形に付く"],
    ["接続助詞「とも」の意味は？", ["逆接仮定（たとえ～ても）", "逆接確定", "順接仮定", "並列"], 0, "終止形に付く"],
    ["接続助詞「つつ」の意味は？", ["反復・継続（～しながら）", "逆接", "打消", "原因"], 0, "連用形に付く"],
    ["「人して惟光召させて」の「して」は？", ["使役の対象（～に命じて）", "場所", "時間", "比較"], 0, "格助詞 して＝手段・使役の対象・共同"],
    ["「徒歩より詣でけり」（徒然草）の「より」は？", ["手段（～で）", "起点（～から）", "比較（～より）", "経由"], 0, "歩いてお参りした → 手段"],
    ["接続助詞「ものの・ものを・ものから」の意味は？", ["逆接確定（～けれども）", "順接仮定", "並列", "願望"], 0, "連体形に付く"]
  ],
  kh4: [
    ["係り結びが「流れる（消える）」のは？", ["結びの語に接続助詞が付いて文が続くとき", "文末が終止形のとき", "係助詞が二つあるとき", "会話文のとき"], 0, "～こそ…已然形＋ど、… のように続くと結びは成立しない"],
    ["係助詞「や・か」の意味は？", ["疑問・反語", "強意", "詠嘆", "願望"], 0, "～か。反語は「～か、いや～ない」"],
    ["「やは・かは」は主にどの意味になる？", ["反語", "疑問", "強意", "推量"], 0, "反語になりやすい"],
    ["係助詞「ぞ・なむ・こそ」の意味は？", ["強意", "疑問", "反語", "詠嘆"], 0, "訳には出さないことが多い"],
    ["「こそ～已然形、」で文が続くときの意味は？", ["逆接（～けれども）", "順接", "仮定", "並列"], 0, "こそ～已然形、… は逆接で訳す"],
    ["「花ぞ昔の香ににほひ【ける】」の「ける」の活用形は？", ["連体形", "已然形", "終止形", "連用形"], 0, "ぞ の結び → 連体形"],
    ["係助詞でないものは？", ["が", "ぞ", "なむ", "こそ"], 0, "が は格助詞"],
    ["文末の「～とぞ。」の後で省略されているのは？", ["言ふ（言ひける）", "あり", "見ゆ", "思ふ"], 0, "「～と言い伝えている」の意味で結びが省略される"]
  ],
  kh5: [
    ["「蛍ばかりの光【だに】なし」の「だに」は？", ["類推（～さえ）", "限定（だけ）", "添加（～までも）", "強意"], 0, "軽いものを挙げて重いものを想像させる"],
    ["副助詞「すら」の意味は？", ["類推（～さえ）", "添加（～までも）", "限定", "程度"], 0, "だに と同じく類推"],
    ["副助詞「さへ」の意味は？", ["添加（～までも）", "類推", "限定", "比較"], 0, "さらに加わる"],
    ["副助詞「ばかり」の意味は？", ["程度・限定（～ほど・～だけ）", "添加", "類推", "強意"], 0, "～くらい・～だけ"],
    ["未然形＋終助詞「なむ」の意味は？", ["他への願望（～してほしい）", "強意", "推量", "自己の願望"], 0, "連用形＋なむ は「な（ぬ）＋む」なので区別"],
    ["終助詞「ばや」の意味は？", ["自己の願望（～したい）", "他への願望", "禁止", "詠嘆"], 0, "未然形に付く"],
    ["「な～そ」の意味は？", ["禁止（～するな）", "願望", "詠嘆", "疑問"], 0, "な行きそ＝行くな"],
    ["終助詞「かな」の意味は？", ["詠嘆（～だなあ）", "疑問", "禁止", "願望"], 0, "体言・連体形に付く"]
  ],
  kh6: [
    ["「給ふ」（四段）の敬語の種類は？", ["尊敬", "謙譲", "丁寧", "なし"], 0, "お～になる。下二段の給ふ は謙譲"],
    ["補助動詞「～て侍り」の「侍り」の種類は？", ["丁寧", "尊敬", "謙譲", "なし"], 0, "補助動詞の 侍り・候ふ は丁寧（～です・～ます）"],
    ["「申す」の敬語の種類は？", ["謙譲", "尊敬", "丁寧", "なし"], 0, "申し上げる"],
    ["「のたまふ」の意味は？", ["おっしゃる", "申し上げる", "いらっしゃる", "差し上げる"], 0, "尊敬語"],
    ["「奉る」（差し上げる）の種類は？", ["謙譲", "尊敬", "丁寧", "なし"], 0, "「お召しになる」の意味のときは尊敬"],
    ["補助動詞「候ふ」の種類は？", ["丁寧", "謙譲", "尊敬", "なし"], 0, "～です・～ます"],
    ["「おはす」の意味は？", ["いらっしゃる", "申し上げる", "お仕えする", "差し上げる"], 0, "尊敬語（あり・行く・来の尊敬）"],
    ["「参る」（参上する）の種類は？", ["謙譲", "尊敬", "丁寧", "なし"], 0, "「召し上がる」の意味のときは尊敬"]
  ],
  kh7: [
    ["尊敬語は誰への敬意？", ["動作をする人（主語）", "動作を受ける人", "聞き手・読み手", "作者自身"], 0, "主語を高める"],
    ["謙譲語は誰への敬意？", ["動作を受ける人", "動作をする人", "聞き手・読み手", "作者自身"], 0, "動作の相手（～に・～を）を高める"],
    ["丁寧語は誰への敬意？", ["聞き手・読み手", "動作をする人", "動作を受ける人", "第三者"], 0, "会話文なら聞き手、地の文なら読者"],
    ["地の文の敬語は誰からの敬意？", ["作者（書き手）", "話し手", "主人公", "読者"], 0, "会話文の中なら話し手から"],
    ["会話文の敬語は誰からの敬意？", ["話し手", "作者", "聞き手", "主語"], 0, "かぎかっこの中は話している人から"],
    ["「せ給ふ」「させ給ふ」が使われるのは主に？", ["最高敬語（天皇・中宮などへ）", "丁寧語", "謙譲語", "自分の動作"], 0, "二重尊敬。とても身分の高い人"],
    ["「奏す」は誰に申し上げる？", ["天皇（上皇）", "中宮・皇太子", "大臣", "友人"], 0, "絶対敬語"],
    ["「啓す」は誰に申し上げる？", ["中宮・皇太子", "天皇", "大臣", "家来"], 0, "絶対敬語"]
  ],
  kh8: [
    ["「え～ず」の意味は？", ["～できない", "決して～ない", "～するな", "まさか～ないだろう"], 0, "不可能"],
    ["「よも～じ」の意味は？", ["まさか～ないだろう", "～できない", "少しも～ない", "～するな"], 0, "じ は打消推量"],
    ["「さらに～ず」の意味は？", ["まったく～ない", "まさか～ない", "～するな", "なんとかして"], 0, "全否定"],
    ["「つゆ～ず」の意味は？", ["少しも～ない", "～できない", "まさか～ない", "～したい"], 0, "つゆ＝露のように少し"],
    ["「いかで～ばや」の意味は？", ["なんとかして～したい", "どうして～か", "決して～ない", "～するな"], 0, "いかで＋願望＝なんとかして"],
    ["「よに～ず」の意味は？", ["決して～ない", "まったく～ない", "～できない", "～するな"], 0, "よに＝けっして"],
    ["「おほかた～ず」の意味は？", ["まったく～ない", "だいたい～ない", "～できない", "～したい"], 0, "おほかた＋打消＝全否定"],
    ["「たえて～ず」の意味は？", ["まったく～ない", "～できない", "決して～するな", "まさか"], 0, "たえて＋打消＝全否定"]
  ]
});
