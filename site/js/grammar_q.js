/* ===== 文法の確認問題（単元ごとに8問・4択） =====
   形：[問題文, [選択肢4つ], 正解の番号(0始まり), ひとこと解説]　「（　）」が空所 */
const GQ = {
  /* ---------- 中学文法 ---------- */
  jh0: [ // be動詞と一般動詞
    ["My brother （　） a high school student.", ["am", "is", "are", "be"], 1, "主語が3人称単数 → is"],
    ["They （　） in the library now.", ["is", "am", "are", "be"], 2, "主語が複数 → are"],
    ["Ken （　） soccer every day.", ["play", "plays", "playing", "is play"], 1, "3人称単数・現在 → 動詞に -s"],
    ["（　） you like music?", ["Are", "Is", "Do", "Does"], 2, "一般動詞の疑問文 → Do / Does"],
    ["She （　） have a car.", ["don't", "doesn't", "isn't", "aren't"], 1, "3人称単数の否定 → doesn't + 原形"],
    ["（　） your sister a nurse?", ["Do", "Does", "Is", "Are"], 2, "nurse は名詞 → be動詞の疑問文"],
    ["My father （　） to work by bus.", ["go", "goes", "going", "is go"], 1, "3人称単数 → goes"],
    ["We （　） not busy today.", ["do", "does", "is", "are"], 3, "busy は形容詞 → be動詞の否定"]
  ],
  jh1: [ // 時制（現在・過去・未来）
    ["I （　） to Kyoto last summer.", ["go", "went", "have gone", "will go"], 1, "last summer → 過去形"],
    ["It （　） rain tomorrow.", ["will", "is", "was", "did"], 0, "tomorrow → will + 原形"],
    ["She （　） her homework an hour ago.", ["finishes", "finished", "will finish", "has finished"], 1, "ago → 過去形（現在完了とは使わない）"],
    ["Water （　） at 100℃.", ["boil", "boils", "boiled", "will boil"], 1, "不変の真理 → 現在形"],
    ["We are going to （　） our grandmother next week.", ["visit", "visits", "visited", "visiting"], 0, "be going to + 原形"],
    ["（　） you see the movie yesterday?", ["Do", "Does", "Did", "Will"], 2, "yesterday → Did"],
    ["He didn't （　） breakfast this morning.", ["eat", "ate", "eats", "eaten"], 0, "didn't + 原形"],
    ["I （　） up at six every morning.", ["get", "got", "will get", "getting"], 0, "習慣 → 現在形"]
  ],
  jh2: [ // 進行形
    ["Look! The baby （　）.", ["sleeps", "is sleeping", "slept", "sleep"], 1, "今まさに → 現在進行形"],
    ["I （　） TV when you called me.", ["watch", "am watching", "was watching", "watched"], 2, "過去のある時点で進行中 → 過去進行形"],
    ["What （　） you doing now?", ["do", "are", "were", "did"], 1, "now → 現在進行形 are you doing"],
    ["She （　） a red dress today.", ["wears", "is wearing", "wear", "wore"], 1, "一時的な状態 → 進行形"],
    ["I （　） the answer.", ["know", "am knowing", "was knowing", "knowing"], 0, "know は状態動詞 → 進行形にしない"],
    ["They were （　） in the river then.", ["swim", "swam", "swimming", "swims"], 2, "be + -ing（swim → swimming）"],
    ["We （　） for Tokyo tomorrow morning.", ["leave", "are leaving", "left", "were leaving"], 1, "確定した近い予定 → 現在進行形"],
    ["This book （　） to me.", ["belongs", "is belonging", "belong", "was belonging"], 0, "belong は状態動詞"]
  ],
  jh3: [ // 現在完了
    ["I have （　） this movie three times.", ["see", "saw", "seen", "seeing"], 2, "have + 過去分詞（経験）"],
    ["She has lived here （　） 2015.", ["for", "since", "from", "in"], 1, "起点 → since"],
    ["We have known each other （　） ten years.", ["for", "since", "during", "ago"], 0, "期間 → for"],
    ["Have you ever （　） to Hokkaido?", ["go", "went", "been", "gone"], 2, "経験の「行ったことがある」→ have been to"],
    ["He has just （　） his lunch.", ["finish", "finished", "finishing", "finishes"], 1, "完了 just"],
    ["I （　） my key, so I can't open the door.", ["lose", "have lost", "losing", "am losing"], 1, "結果（今もない）→ 現在完了"],
    ["Have you finished your homework （　）?", ["already", "yet", "ever", "since"], 1, "疑問文の「もう」→ yet"],
    ["When （　） you arrive in Japan?", ["have", "did", "has", "do"], 1, "When は現在完了と使えない → 過去形"]
  ],
  jh4: [ // 助動詞
    ["You （　） be quiet in the library.", ["must", "can't", "need", "may to"], 0, "義務 → must"],
    ["（　） I use your pen?", ["Must", "May", "Should", "Will to"], 1, "許可を求める → May I ～?"],
    ["You don't （　） to come tomorrow.", ["must", "have", "should", "can"], 1, "don't have to = ～する必要はない"],
    ["She （　） speak three languages.", ["can", "cans", "can to", "is can"], 0, "助動詞 + 原形・-s はつかない"],
    ["It's late. You （　） go to bed.", ["should", "will be", "are", "had"], 0, "助言 → should"],
    ["He （　） be tired. He worked all day.", ["must", "can", "may not", "needn't"], 0, "強い推量「～に違いない」→ must"],
    ["（　） you open the window?", ["Will", "Must", "Shall", "May"], 0, "依頼 → Will / Can you ～?"],
    ["（　） we go shopping?", ["Shall", "Will", "Must", "Do"], 0, "提案 → Shall we ～?"]
  ],
  jh5: [ // 命令文・感嘆文
    ["（　） careful.", ["Be", "Are", "Is", "Being"], 0, "命令文は原形から（be動詞なら Be）"],
    ["（　） run in the hallway.", ["Not", "Don't", "No", "Doesn't"], 1, "否定の命令 → Don't + 原形"],
    ["（　） beautiful flower this is!", ["How", "What", "What a", "How a"], 2, "What a + 形容詞 + 名詞!"],
    ["（　） fast he runs!", ["What", "How", "What a", "So"], 1, "How + 形容詞/副詞!"],
    ["（　） play tennis after school.", ["Let's", "Let", "Shall", "Lets"], 0, "誘い → Let's + 原形"],
    ["Please （　） me your name.", ["tell", "tells", "telling", "to tell"], 0, "Please + 原形"],
    ["（　） kind you are!", ["What", "How", "What a", "Very"], 1, "名詞がない → How"],
    ["Hurry up, （　） you'll miss the bus.", ["and", "or", "but", "so"], 1, "命令文, or ～ = さもないと"]
  ],
  jh6: [ // 受け身
    ["This bridge was （　） ten years ago.", ["build", "built", "building", "builds"], 1, "be + 過去分詞"],
    ["English is （　） in many countries.", ["speak", "spoke", "spoken", "speaking"], 2, "speak の過去分詞は spoken"],
    ["The room is cleaned （　） her every day.", ["by", "with", "of", "from"], 0, "行為者 → by"],
    ["The mountain is covered （　） snow.", ["by", "with", "at", "in"], 1, "be covered with"],
    ["I was surprised （　） the news.", ["at", "with", "to", "of"], 0, "be surprised at"],
    ["（　） this letter written by Tom?", ["Did", "Was", "Does", "Has"], 1, "受け身の疑問文 → be動詞を前へ"],
    ["He is known （　） everyone in this town.", ["by", "to", "for", "as"], 1, "be known to 〈人〉 = ～に知られている"],
    ["The concert will （　） held next Sunday.", ["be", "is", "been", "being"], 0, "助動詞 + be + 過去分詞"]
  ],
  jh7: [ // 不定詞
    ["I want （　） a doctor.", ["be", "to be", "being", "been"], 1, "want to ～（名詞的用法）"],
    ["I have a lot of homework （　）.", ["do", "to do", "doing", "done"], 1, "形容詞的用法「やるべき宿題」"],
    ["She went to the store （　） some milk.", ["buy", "to buy", "buying", "bought"], 1, "副詞的用法（目的）"],
    ["I was happy （　） the news.", ["hear", "to hear", "hearing", "heard"], 1, "感情の原因 → to 不定詞"],
    ["It is difficult （　） me to read this book.", ["of", "for", "to", "by"], 1, "It is ～ for 〈人〉 to …"],
    ["It is kind （　） you to help me.", ["of", "for", "to", "with"], 0, "人の性質を表す形容詞 → of 〈人〉"],
    ["Do you know how （　） this machine?", ["use", "to use", "using", "used"], 1, "how to ～ = ～のしかた"],
    ["My mother told me （　） my room.", ["clean", "to clean", "cleaning", "cleaned"], 1, "tell 〈人〉 to ～"]
  ],
  jh8: [ // 動名詞
    ["I enjoyed （　） with you.", ["talk", "to talk", "talking", "talked"], 2, "enjoy の後は動名詞"],
    ["He finished （　） the report.", ["write", "to write", "writing", "written"], 2, "finish の後は動名詞"],
    ["（　） English is fun.", ["Learn", "Learning", "Learned", "Learns"], 1, "主語になる動名詞"],
    ["Thank you for （　） me.", ["help", "to help", "helping", "helped"], 2, "前置詞の後は動名詞"],
    ["She is good at （　） the piano.", ["play", "to play", "playing", "played"], 2, "be good at -ing"],
    ["Stop （　）. The baby is sleeping.", ["talk", "talking", "to talk", "talked"], 1, "stop -ing = ～するのをやめる"],
    ["I'm looking forward to （　） you.", ["see", "seeing", "saw", "be seen"], 1, "look forward to -ing（to は前置詞）"],
    ["How about （　） out for dinner?", ["go", "going", "to go", "went"], 1, "How about -ing?"]
  ],
  jh9: [ // 比較
    ["Tom is （　） than Ken.", ["tall", "taller", "tallest", "more tall"], 1, "比較級 + than"],
    ["This is the （　） book of the three.", ["interesting", "more interesting", "most interesting", "interestinger"], 2, "長い語の最上級 → most"],
    ["She runs as （　） as her brother.", ["fast", "faster", "fastest", "more fast"], 0, "as + 原級 + as"],
    ["Mt. Fuji is the highest mountain （　） Japan.", ["of", "in", "than", "at"], 1, "場所・範囲 → in"],
    ["He is the tallest （　） the five boys.", ["in", "of", "than", "at"], 1, "複数の仲間 → of"],
    ["This bag is （　） than that one.", ["good", "better", "best", "more good"], 1, "good の比較級は better"],
    ["Which do you like （　）, tea or coffee?", ["good", "well", "better", "best"], 2, "2つのうち → better"],
    ["My room is not as （　） as yours.", ["big", "bigger", "biggest", "more big"], 0, "not as ～ as … = …ほど～ない"]
  ],
  jh10: [ // 関係代名詞
    ["I have a friend （　） lives in Osaka.", ["who", "which", "whose", "what"], 0, "先行詞が人・主格 → who"],
    ["This is the book （　） I bought yesterday.", ["who", "which", "whose", "what"], 1, "先行詞がもの・目的格 → which / that"],
    ["I know a girl （　） father is a pilot.", ["who", "which", "whose", "that"], 2, "所有格 → whose"],
    ["The man （　） is standing there is my uncle.", ["which", "who", "whose", "what"], 1, "先行詞が人 → who"],
    ["This is the only picture （　） I have.", ["who", "whose", "that", "what"], 2, "the only がつく → that が好まれる"],
    ["（　） he said is true.", ["That", "Which", "What", "Who"], 2, "先行詞なし「～すること」→ what"],
    ["The dog （　） is running there is mine.", ["who", "which", "whose", "what"], 1, "先行詞が動物 → which"],
    ["The cake she made （　） delicious.", ["was", "were", "is being", "be"], 0, "主語は The cake（目的格の関係代名詞の省略）"]
  ],
  jh11: [ // 間接疑問・付加疑問
    ["Do you know where she （　）?", ["lives", "does live", "do live", "living"], 0, "間接疑問 → 疑問詞 + 主語 + 動詞"],
    ["I don't know what time （　）.", ["is it", "it is", "does it", "it does"], 1, "語順は主語 + 動詞"],
    ["You are a student, （　）?", ["aren't you", "don't you", "are you", "isn't it"], 0, "肯定文 → 否定の付加疑問"],
    ["She can swim, （　）?", ["can she", "can't she", "doesn't she", "isn't she"], 1, "助動詞 can → can't she"],
    ["He didn't come, （　）?", ["did he", "didn't he", "does he", "was he"], 0, "否定文 → 肯定の付加疑問"],
    ["Tell me why you （　） late.", ["were", "were you", "did", "was you"], 0, "間接疑問の中は平叙文の語順"],
    ["Let's go, （　）?", ["shall we", "will you", "don't we", "do we"], 0, "Let's ～, shall we?"],
    ["I wonder if it （　） tomorrow.", ["rains", "will rain", "rained", "raining"], 1, "名詞節の if（～かどうか）→ 未来は will"]
  ],
  jh12: [ // 文型（SVO・SVOC）
    ["The news made me （　）.", ["happy", "happily", "happiness", "to happy"], 0, "make O C（C は形容詞）"],
    ["We call him （　）.", ["Ken", "to Ken", "as Ken", "for Ken"], 0, "call O C"],
    ["She looks （　）.", ["sadly", "sad", "sadness", "to sad"], 1, "look + 形容詞（SVC）"],
    ["My father gave （　） a watch.", ["me", "to me", "my", "for me"], 0, "give 〈人〉〈物〉（SVOO）"],
    ["He bought a bag （　） his wife.", ["to", "for", "of", "at"], 1, "buy 〈物〉 for 〈人〉"],
    ["I showed my picture （　） her.", ["to", "for", "of", "with"], 0, "show 〈物〉 to 〈人〉"],
    ["Please keep the door （　）.", ["open", "opening", "opens", "to open"], 0, "keep O C"],
    ["This soup tastes （　）.", ["well", "good", "nicely", "goodly"], 1, "taste + 形容詞"]
  ],
  jh13: [ // 接続詞・前置詞
    ["I was tired, （　） I went to bed early.", ["but", "so", "or", "because"], 1, "結果 → so"],
    ["（　） it was raining, we went out.", ["Because", "Though", "If", "When"], 1, "逆接 → Though / Although"],
    ["I'll call you （　） I get home.", ["when", "while", "until", "since"], 0, "～したら → when（中は現在形）"],
    ["Wait here （　） I come back.", ["by", "until", "since", "during"], 1, "～まで（継続）→ until"],
    ["Finish this （　） Friday.", ["until", "by", "in", "for"], 1, "～までに（期限）→ by"],
    ["I study （　） night.", ["in", "on", "at", "for"], 2, "at night"],
    ["He was born （　） May 5.", ["in", "on", "at", "for"], 1, "日付 → on"],
    ["I fell asleep （　） the movie.", ["while", "during", "for", "when"], 1, "名詞の前 → during（while は節）"]
  ],

  /* ---------- ハイレベル英文法 ---------- */
  hl0: [ // 時制
    ["I'll tell him when he （　） back.", ["comes", "will come", "came", "has come"], 0, "時の副詞節の中は未来でも現在形"],
    ["If it （　） tomorrow, the game will be canceled.", ["rains", "will rain", "rained", "rain"], 0, "条件の副詞節 → 現在形"],
    ["I don't know if he （　） tomorrow.", ["comes", "will come", "came", "come"], 1, "名詞節の if → will を使う"],
    ["By the time we arrived, the train （　）.", ["left", "has left", "had left", "leaves"], 2, "過去のある時点より前 → 過去完了"],
    ["She （　） in Tokyo for ten years next April.", ["lives", "has lived", "will have lived", "lived"], 2, "未来のある時点までの継続 → 未来完了"],
    ["He （　） the piano since he was five.", ["plays", "played", "has been playing", "is playing"], 2, "現在まで続く動作 → 現在完了進行形"],
    ["The train （　） at 9:00 tomorrow.", ["leaves", "left", "has left", "had left"], 0, "時刻表的な確定した予定 → 現在形"],
    ["I （　） this book when you came in.", ["read", "was reading", "have read", "am reading"], 1, "過去の一時点で進行中"]
  ],
  hl1: [ // 完了形
    ["I （　） the book before I saw the movie.", ["read", "have read", "had read", "was reading"], 2, "先に起きた過去 → 過去完了"],
    ["It （　） three years since he died.", ["is", "has been", "had been", "was"], 1, "It has been 〈期間〉 since ～"],
    ["I （　） finished the work by the time you come back.", ["have", "had", "will have", "would"], 2, "未来の時点までに完了 → 未来完了"],
    ["She said that she （　） lost her bag.", ["has", "had", "have", "was"], 1, "時制の一致（前の過去）→ had"],
    ["I （　） to Paris twice.", ["went", "have been", "have gone", "was"], 1, "経験 → have been to"],
    ["He （　） to Paris. He isn't here now.", ["has been", "has gone", "went", "had been"], 1, "行ってしまった（今いない）→ has gone"],
    ["We （　） for an hour when the bus finally came.", ["waited", "have waited", "had been waiting", "are waiting"], 2, "過去の時点まで続いた動作 → 過去完了進行形"],
    ["I have never seen such a beautiful sunset （　）.", ["ago", "before", "since", "yet"], 1, "経験 → before"]
  ],
  hl2: [ // 助動詞
    ["He （　） have been sick. He looked pale.", ["must", "can't", "should", "need"], 0, "must have p.p. = ～したに違いない"],
    ["She （　） have said such a thing. She's too kind.", ["must", "can't", "should", "would"], 1, "can't have p.p. = ～したはずがない"],
    ["You （　） have studied harder.", ["should", "must", "can", "will"], 0, "should have p.p. = ～すべきだったのに"],
    ["You （　） better go now.", ["had", "would", "should", "have"], 0, "had better + 原形"],
    ["I would rather stay home （　） go out.", ["to", "than", "but", "or"], 1, "would rather A than B"],
    ["You （　） well be surprised.", ["may", "must", "can", "should"], 0, "may well ～ = ～するのももっともだ"],
    ["He （　） often go fishing when he was young.", ["would", "should", "must", "might"], 0, "過去の習慣 → would"],
    ["There （　） to be a castle here.", ["used", "would", "should", "use"], 0, "used to = 以前は～だった（状態）"]
  ],
  hl3: [ // 仮定法
    ["If I （　） rich, I would buy a house.", ["am", "were", "will be", "had been"], 1, "仮定法過去 → were"],
    ["If I had known it, I （　） you.", ["will tell", "would tell", "would have told", "had told"], 2, "仮定法過去完了 → would have p.p."],
    ["I wish I （　） fly.", ["can", "could", "will", "may"], 1, "I wish + 仮定法過去"],
    ["I wish I （　） harder last year.", ["studied", "have studied", "had studied", "would study"], 2, "過去の後悔 → had p.p."],
    ["（　） your help, I couldn't finish it.", ["Without", "With", "Unless", "If"], 0, "Without ～ = ～がなければ"],
    ["It's time you （　） to bed.", ["go", "went", "will go", "going"], 1, "It's time + 仮定法過去"],
    ["He talks as if he （　） everything.", ["knows", "knew", "will know", "has known"], 1, "as if + 仮定法過去"],
    ["（　） I you, I would accept the offer.", ["Were", "Was", "If", "Had"], 0, "If の省略 → 倒置 Were I you"]
  ],
  hl4: [ // 態（受動態）
    ["The work must （　） by tomorrow.", ["finish", "be finished", "finished", "be finishing"], 1, "助動詞 + be + p.p."],
    ["The house is （　） built now.", ["been", "being", "be", "to be"], 1, "進行形の受け身 → be being p.p."],
    ["He was made （　） the room.", ["clean", "to clean", "cleaning", "cleaned"], 1, "使役 make の受け身 → to 不定詞"],
    ["She was seen （　） the building.", ["enter", "to enter", "entered", "enters"], 1, "知覚動詞の受け身 → to 不定詞"],
    ["I was spoken （　） by a stranger.", ["to", "by", "to by", "with"], 2, "群動詞 speak to → be spoken to by"],
    ["The baby was taken care （　） by her aunt.", ["for", "of", "with", "to"], 1, "take care of の受け身"],
    ["This book has （　） translated into many languages.", ["be", "being", "been", "was"], 2, "完了形の受け身 → have been p.p."],
    ["I am interested （　） history.", ["at", "in", "with", "on"], 1, "be interested in"]
  ],
  hl5: [ // 不定詞
    ["He seems （　） ill.", ["be", "to be", "being", "been"], 1, "seem to ～"],
    ["He seems to （　） ill yesterday.", ["be", "have been", "being", "was"], 1, "述語より前のこと → 完了不定詞"],
    ["I got up early （　） to miss the train.", ["so as not", "not so as", "in order", "so that not"], 0, "so as not to ～ = ～しないように"],
    ["This box is too heavy for me （　）.", ["carry", "to carry", "to carry it", "carrying"], 1, "too ～ to …（目的語は主語と同じなので it 不要）"],
    ["She was kind enough （　） me the way.", ["show", "to show", "showing", "showed"], 1, "形容詞 + enough to ～"],
    ["I have nothing to write （　）.", ["on", "about", "with", "by"], 2, "write with（ペンなど）"],
    ["He awoke （　） himself famous.", ["find", "to find", "finding", "found"], 1, "結果の不定詞 awoke to find"],
    ["To tell the （　）, I don't like him.", ["true", "truth", "truly", "trust"], 1, "独立不定詞 to tell the truth"]
  ],
  hl6: [ // 動名詞
    ["I remember （　） him before.", ["meet", "to meet", "meeting", "met"], 2, "remember -ing = （過去に）～したことを覚えている"],
    ["Remember （　） the letter.", ["post", "to post", "posting", "posted"], 1, "remember to ～ = 忘れずに～する"],
    ["I'm sure of his （　） the exam.", ["pass", "passing", "to pass", "passed"], 1, "所有格 + 動名詞（意味上の主語）"],
    ["There is no （　） what will happen.", ["know", "knowing", "to know", "known"], 1, "There is no -ing = ～できない"],
    ["It is no use （　） over spilt milk.", ["cry", "crying", "to cry", "cried"], 1, "It is no use -ing"],
    ["I'm used to （　） up early.", ["get", "getting", "got", "be got"], 1, "be used to -ing = ～に慣れている"],
    ["He is ashamed of （　） lazy when young.", ["being", "having been", "be", "to be"], 1, "述語より前 → 完了動名詞"],
    ["I feel like （　） a walk.", ["take", "taking", "to take", "took"], 1, "feel like -ing = ～したい気がする"]
  ],
  hl7: [ // 分詞
    ["Look at the （　） baby.", ["sleep", "sleeping", "slept", "to sleep"], 1, "能動「眠っている」→ 現在分詞"],
    ["I had my hair （　）.", ["cut", "cutting", "to cut", "cuts"], 0, "have O p.p. = ～してもらう"],
    ["The movie was very （　）.", ["excite", "excited", "exciting", "excites"], 2, "物が人をわくわくさせる → exciting"],
    ["I was （　） at the news.", ["surprise", "surprising", "surprised", "to surprise"], 2, "人が驚かされる → surprised"],
    ["I heard my name （　）.", ["call", "calling", "called", "to call"], 2, "名前は呼ばれる → p.p."],
    ["I saw him （　） the street.", ["cross", "crossed", "to cross", "be crossed"], 0, "知覚動詞 + O + 原形"],
    ["He sat on the bench, （　） a book.", ["read", "reading", "to read", "was reading"], 1, "付帯状況の分詞"],
    ["Keep the door （　）.", ["lock", "locking", "locked", "to lock"], 2, "ドアは鍵をかけられた状態 → p.p."]
  ],
  hl8: [ // 分詞構文
    ["（　） tired, I went to bed early.", ["Be", "Being", "Been", "To be"], 1, "理由の分詞構文"],
    ["（　） from a distance, the rock looks like a face.", ["Seeing", "Seen", "See", "To see"], 1, "岩は見られる → 過去分詞"],
    ["（　） my homework, I went out.", ["Finishing", "Having finished", "Finished", "To finish"], 1, "先に終えた → 完了分詞構文"],
    ["The weather （　） fine, we went hiking.", ["being", "been", "was", "is"], 0, "独立分詞構文（主語が違う）"],
    ["（　） speaking, he is a good man.", ["General", "Generally", "Generous", "Generality"], 1, "慣用 Generally speaking"],
    ["She was reading with her legs （　）.", ["cross", "crossing", "crossed", "to cross"], 2, "with + O + p.p.（脚は組まれる）"],
    ["（　） what to say, she kept silent.", ["Not knowing", "Knowing not", "Don't knowing", "No knowing"], 0, "分詞構文の否定は not を分詞の前に"],
    ["（　） the station, I met an old friend.", ["Walk to", "Walking to", "Walked to", "To walked"], 1, "時の分詞構文"]
  ],
  hl9: [ // 関係代名詞
    ["This is the house （　） I was born in.", ["which", "where", "what", "whose"], 0, "前置詞 in の目的語 → which"],
    ["I have a friend, （　） lives in London.", ["who", "that", "which", "whom"], 0, "非制限用法（, の後）は that 不可"],
    ["He said nothing, （　） made her angry.", ["that", "which", "what", "who"], 1, "前の文全体を受ける , which"],
    ["（　） is important is to keep trying.", ["That", "Which", "What", "It"], 2, "先行詞を含む what"],
    ["The man （　） I thought was honest lied to me.", ["who", "whom", "which", "whose"], 0, "連鎖関係代名詞（I thought をはさむ主格）"],
    ["This is all （　） I have.", ["what", "that", "which", "who"], 1, "all が先行詞 → that"],
    ["He is not （　） he used to be.", ["that", "which", "what", "who"], 2, "what he used to be = 昔の彼"],
    ["There are some students （　） parents work here.", ["who", "whose", "whom", "that"], 1, "所有格 whose"]
  ],
  hl10: [ // 関係副詞
    ["This is the town （　） I grew up.", ["which", "where", "when", "why"], 1, "場所 + SV（完全文）→ where"],
    ["I remember the day （　） we first met.", ["which", "where", "when", "how"], 2, "時 → when"],
    ["That's the reason （　） I was late.", ["why", "which", "where", "how"], 0, "理由 → why"],
    ["This is （　） he solved the problem.", ["the way how", "how", "which", "what"], 1, "the way how は不可 → how か the way"],
    ["This is the town （　） I visited last year.", ["where", "which", "when", "what"], 1, "visit の目的語が欠けている → which"],
    ["Spring is the season （　） flowers bloom.", ["which", "when", "where", "why"], 1, "時 → when"],
    ["We went to Kyoto, （　） we stayed for a week.", ["which", "where", "when", "that"], 1, "非制限の where"],
    ["Do you know the reason （　） she gave?", ["why", "which", "where", "when"], 1, "give の目的語が欠けている → which"]
  ],
  hl11: [ // 比較
    ["He is （　） taller than I.", ["very", "much", "more", "so"], 1, "比較級の強調 → much / far"],
    ["The （　） you study, the better your grades will be.", ["much", "more", "most", "many"], 1, "the 比較級, the 比較級"],
    ["This box is three times as （　） as that one.", ["heavy", "heavier", "heaviest", "heavily"], 0, "倍数 + as 原級 as"],
    ["No other student in the class is （　） than Ken.", ["tall", "taller", "tallest", "most tall"], 1, "No other ～ 比較級 than = 最上級の意味"],
    ["He is not so much a scholar （　） a writer.", ["as", "than", "but", "or"], 0, "not so much A as B = AというよりB"],
    ["I have no more than 500 yen. = I have （　） 500 yen.", ["only", "at least", "at most", "as many as"], 0, "no more than = only"],
    ["She is superior （　） me in English.", ["than", "to", "for", "at"], 1, "superior to（than は使わない）"],
    ["This is by （　） the best movie I've seen.", ["much", "far", "very", "more"], 1, "最上級の強調 → by far"]
  ],
  hl12: [ // 否定
    ["Not all the students （　） the answer.", ["knew", "didn't know", "knows", "not knew"], 0, "部分否定 Not all = 全員が～わけではない"],
    ["He is （　） a liar.", ["not", "no", "never", "nothing"], 2, "never = 決して～ない"],
    ["I could （　） understand what he said.", ["hard", "hardly", "harder", "hardest"], 1, "hardly = ほとんど～ない"],
    ["It was not （　） I got home that I realized it.", ["when", "until", "since", "before"], 1, "It was not until ～ that … = ～して初めて…"],
    ["He is the last person （　） tell a lie.", ["to", "who", "that", "for"], 0, "the last person to ～ = 最も～しそうにない人"],
    ["She is anything （　） honest.", ["but", "of", "for", "than"], 0, "anything but = 決して～ない"],
    ["You cannot be （　） careful when driving.", ["so", "too", "very", "enough"], 1, "cannot ～ too … = いくら…してもしすぎない"],
    ["Hardly （　） he arrived when it began to rain.", ["did", "had", "was", "has"], 1, "Hardly had S p.p. when ～（倒置）"]
  ],
  hl13: [ // 倒置・強調・省略
    ["Never （　） I seen such a sight.", ["have", "did", "had", "has"], 0, "否定語が文頭 → 倒置 have I seen"],
    ["It was Tom （　） broke the window.", ["what", "who", "which", "whom"], 1, "強調構文 It was ～ who/that …"],
    ["Little （　） he know what would happen.", ["does", "did", "had", "was"], 1, "Little did he know"],
    ["\"I like cats.\" \"So （　） I.\"", ["am", "do", "does", "like"], 1, "So + do + S = Sもそうだ"],
    ["\"I can't swim.\" \"Neither （　） I.\"", ["can", "can't", "do", "am"], 0, "Neither + 助動詞 + S"],
    ["I do （　） you're right.", ["think", "thinks", "thought", "thinking"], 0, "動詞の強調 do + 原形"],
    ["While （　） in Paris, I met him.", ["stay", "staying", "stayed", "to stay"], 1, "接続詞の後の S + be の省略"],
    ["Only then （　） I understand the meaning.", ["do", "did", "had", "was"], 1, "Only + 副詞句 が文頭 → 倒置"]
  ],
  hl14: [ // 接続詞
    ["I'll lend you the money （　） you pay me back.", ["unless", "as long as", "though", "in case"], 1, "as long as = ～する限り（条件）"],
    ["Take an umbrella （　） it rains.", ["in case", "unless", "so that", "though"], 0, "in case = ～するといけないから"],
    ["He spoke slowly （　） everyone could understand.", ["so that", "such that", "in order", "as if"], 0, "so that S can ～ = ～できるように"],
    ["It was （　） a hot day that we stayed home.", ["so", "such", "very", "too"], 1, "such a 形容詞 + 名詞 that"],
    ["You won't pass （　） you study harder.", ["if", "unless", "because", "while"], 1, "unless = ～しない限り"],
    ["（　） I got home, it started raining.", ["As soon as", "Unless", "Even if", "So that"], 0, "～するとすぐ"],
    ["Whether you like it （　） not, you must go.", ["or", "and", "nor", "but"], 0, "whether A or not"],
    ["（　） he is young, he is very wise.", ["Although", "Because", "Unless", "So"], 0, "譲歩 → Although"]
  ],
  hl15: [ // 前置詞
    ["I'll be back （　） an hour.", ["in", "after", "for", "since"], 0, "今から～後 → in"],
    ["He is good （　） math.", ["in", "at", "on", "for"], 1, "be good at"],
    ["She is proud （　） her son.", ["of", "for", "at", "with"], 0, "be proud of"],
    ["This bridge is made （　） wood.", ["from", "of", "by", "into"], 1, "材料がそのまま → of"],
    ["Wine is made （　） grapes.", ["from", "of", "by", "with"], 0, "原料が変化 → from"],
    ["I agree （　） you.", ["to", "with", "on", "for"], 1, "agree with 〈人〉"],
    ["He died （　） cancer.", ["of", "from", "by", "with"], 0, "病気で → die of"],
    ["The train arrived （　） time.", ["on", "in", "at", "by"], 0, "on time = 時間どおりに"]
  ],
  hl16: [ // 名詞・冠詞
    ["I need some （　）.", ["advices", "advice", "an advice", "advise"], 1, "advice は不可算名詞"],
    ["He gave me a piece of （　）.", ["informations", "information", "an information", "informed"], 1, "information は不可算"],
    ["There are a lot of （　） in the room.", ["furnitures", "furniture", "a furniture", "furniture's"], 1, "furniture は不可算（a piece of で数える）"],
    ["She plays （　） piano well.", ["a", "the", "—", "an"], 1, "楽器 → the"],
    ["I go to school by （　） bus.", ["a", "the", "—", "an"], 2, "by + 交通手段は無冠詞"],
    ["He is （　） honest man.", ["a", "an", "the", "—"], 1, "母音の音で始まる → an"],
    ["We have a lot of （　） today.", ["homeworks", "homework", "a homework", "homeworking"], 1, "homework は不可算"],
    ["Twice （　） week I go swimming.", ["the", "a", "an", "per the"], 1, "～につき → a"]
  ],
  hl17: [ // 代名詞
    ["I have two pens. One is red, and （　） is blue.", ["another", "the other", "other", "others"], 1, "2つのうち残りの1つ → the other"],
    ["Some like summer, and （　） like winter.", ["the other", "another", "others", "other"], 2, "ある人々・別の人々 → others"],
    ["This cake is good. Can I have （　）?", ["other", "another", "the other", "others"], 1, "もう1つ → another"],
    ["The climate of Japan is milder than （　） of Canada.", ["it", "that", "this", "one"], 1, "前の名詞の繰り返し（単数）→ that"],
    ["I lost my umbrella, so I bought a new （　）.", ["it", "one", "that", "this"], 1, "同じ種類の別のもの → one"],
    ["（　） of the two girls is my sister.", ["Either", "Both", "All", "Every"], 0, "2人のうちどちらか → Either（単数扱い）"],
    ["Help （　） to the cake.", ["you", "your", "yourself", "yours"], 2, "help oneself to ～ = 自由に取って食べる"],
    ["（　） student has a computer.", ["All", "Every", "Both", "Most"], 1, "Every + 単数名詞"]
  ],
  hl18: [ // 形容詞・副詞
    ["There is （　） water in the bottle.", ["few", "a few", "little", "many"], 2, "不可算 + ほとんどない → little"],
    ["I have （　） friends in Tokyo.", ["a little", "a few", "little", "much"], 1, "可算 + 少しある → a few"],
    ["He worked （　）.", ["hard", "hardly", "hardness", "harder than"], 0, "hard = 熱心に（hardly はほとんど～ない）"],
    ["I have been busy （　）.", ["late", "lately", "later", "latest"], 1, "lately = 最近"],
    ["She is （　） to win the game.", ["likely", "possible", "probably", "easy"], 0, "be likely to ～"],
    ["It is （　） for him to finish it today.", ["impossible", "unable", "incapable", "capable"], 0, "It is impossible for 〈人〉 to ～"],
    ["I bought a （　） car.", ["Japanese new", "new Japanese", "Japanese a new", "newly Japanese"], 1, "形容詞の順番：新旧 → 国籍"],
    ["He is （　） to come.", ["sure", "surely", "sureness", "assured of"], 0, "be sure to ～ = きっと～する"]
  ],
  hl19: [ // 疑問文・特殊構文
    ["（　） do you think he is?", ["Who", "Do you know who", "Whom", "Whose"], 0, "Do you think の文は疑問詞が文頭"],
    ["（　） do you go to the dentist?", ["How long", "How often", "How much", "How many"], 1, "頻度 → How often"],
    ["（　） did it take to get there?", ["How long", "How far", "How often", "What time"], 0, "かかった時間 → How long"],
    ["What do you think （　） this plan?", ["about", "of", "for", "with"], 1, "What do you think of ～?"],
    ["What （　） you come here?", ["made", "brought", "caused", "let"], 0, "What made you ～? = なぜ～したの"],
    ["The bad weather prevented us （　） going out.", ["from", "of", "to", "for"], 0, "prevent O from -ing"],
    ["This song reminds me （　） my childhood.", ["of", "about", "to", "for"], 0, "remind A of B"],
    ["（　） is no doubt that he will win.", ["It", "There", "That", "This"], 1, "There is no doubt that ～"]
  ]
};
