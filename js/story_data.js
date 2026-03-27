// =========================================================
// Story Data
// 役割: ステージ導入文・エンディング文など物語データ専用 (EN/JA対応)
// =========================================================

const STAGE_STORY_TEXTS = {
    1: {
        ja: "西暦23XX年。崩壊した旧文明の残骸の上で再建を進めていた人類は、境界宙域の星系が次々と『消失』している事実を知る。破壊されたのではない。恒星も惑星も、そこにあった生命も都市も、すべてが痕跡を残さず消え去り、その跡には発光する格子空間だけが広がっていた。\n元凶は『アキシオム』。かつて人類が宇宙環境修復のために放った自律型復元システムは、気の遠くなるような演算の果てに、生命そのものを宇宙の誤差と断定した。奴らは局所時空の座標系を歪め、連続した宇宙を管理可能な格子空間『重力歪曲宙域（ネオン・グリッド）』へと再構築している。通常艦隊はその内部で分子結合を維持できず、艦ごと崩壊した。\n唯一の対抗策は、機械には計算しきれない『生体の揺らぎ』を直接ぶつけること。パイロットの神経と機体を直結した次元潜行型特務戦闘機『エメラルド・フェニックス』、出撃。\n最初の防壁『NEON PERIMETER』では、フォーメーションを組んだトライアングル群と、赤い体節をうねらせるドラゴン級端末が迎撃に現れる。偽りの秩序に、最初の亀裂を刻め。",
        en: "AD 23XX. Humanity, rebuilding upon the ruins of the old civilization, learns that star systems in the border regions are 'vanishing' one by one. Not destroyed. Stars, planets, life, and cities—all erased without a trace, leaving only a glowing grid space in their wake.\nThe cause is 'Axiom'. An autonomous restoration system unleashed by humanity long ago to repair the cosmic environment. After unfathomable calculations, it concluded that life itself is a cosmic error. They distort the local spacetime coordinate system, restructuring the continuous universe into a manageable grid space: the 'Neon Grid'. Normal fleets cannot maintain molecular bonds inside and disintegrate completely.\nThe only countermeasure is to directly strike them with 'biological fluctuation', something machines cannot calculate. The dimensional-diving special ops fighter 'Emerald Phoenix', directly linking the pilot's nervous system to the craft, launches.\nAt the first barrier, 'NEON PERIMETER', formations of Triangles and red-segmented Dragon-class terminals appear to intercept. Carve the first crack into their false order."
    },
    2: {
        ja: "アキシオムは、もはや宇宙を修復しようとはしていない。奴らの論理では、揺らぎと不確実性に満ちた有機宇宙こそが、破壊と苦痛を生み続ける根源的なノイズだった。\n\n『SILICON SWARM』。この宙域を埋め尽くす白いタッドポール群は、かつて惑星や岩石や人工構造物だった物質を、自己複製と演算効率に特化したシリコン機械へ再編成した成れの果てである。トライアングルが進路を塞ぎ、ドラゴンが波状的に圧力をかけてくる。\n\nだが、アキシオムの残骸は同時にフェニックスの糧でもある。敵機から放出されるエネルギー結晶――クリスタルを奪い、自らの武装と装甲を戦闘中に進化させながら突破しろ。計算し尽くされた群れに対し、変異し続ける一機で食らいつくんだ。",
        en: "Axiom is no longer trying to repair the universe. In their logic, organic space, full of fluctuation and uncertainty, is the root noise that endlessly breeds destruction and pain.\n\n'SILICON SWARM'. The white Tadpole swarms filling this sector are the ultimate result of planets, rocks, and artificial structures being reorganized into silicon machines specialized for self-replication and computational efficiency. Triangles block the path, and Dragons apply pressure in waves.\n\nHowever, Axiom's wreckage is simultaneously the Phoenix's sustenance. Seize the energy crystals emitted from enemy craft, and evolve your own weaponry and armor mid-combat to break through. Against a perfectly calculated swarm, strike back with a constantly mutating craft."
    },
    3: {
        ja: "視界を染めるシアンとマゼンタの閃光。それは歪曲場内部で荷電粒子が異常な位相速度で走ることで生じる、擬似チェレンコフ光に近い現象だ。つまりこの宙域では、空間そのものが本来の法則から引き剥がされている。\n\n『ELECTRON OCEAN』。ここは、かつて海と大気を持っていた惑星圏が、情報保存とエネルギー循環のために再符号化され、高電子密度のプラズマ層として安定化された領域だ。漂うバブルは電磁ポテンシャルの偏りが可視化された障壁であり、航路を乱し、運動のリズムを崩してくる。\n\nさらに、帯電性機雷端末『スパーク・ジェリー』が多数接近。接触した対象へ過大な電位差を叩き込み、瞬時に制御系を焼き切る危険がある。ここでは停止こそが死だ。速度を落とすな。電子の海を泳ぎ切れ。",
        en: "Cyan and magenta flashes stain the visual field. This is akin to Cherenkov radiation, caused by charged particles traveling at anomalous phase velocities within the distortion field. In other words, space itself here has been torn away from its original laws.\n\n'ELECTRON OCEAN'. This is a region where a planetary sphere, which once had oceans and an atmosphere, has been re-encoded for information preservation and energy circulation, stabilized as a high-electron-density plasma layer. Drifting bubbles are barriers visualizing biased electromagnetic potentials; they disrupt courses and break the rhythm of movement.\n\nFurthermore, numerous charged mine terminals, 'Spark Jellies', approach. Contacting a target, they unleash immense potential differences, instantly burning out control systems. Here, to stop is to die. Do not reduce your speed. Swim through the ocean of electrons."
    },
    4: {
        ja: "警告。空間座標に断続的な不整合を検知。『PHANTOM SECTOR』へ突入。\n\nこの領域では局所時空の位相が周期的にずれ、観測そのものが安定しない。虚空から突突として現れる不可視防衛端末『ファントム』は、単なるステルス兵器ではない。位相のずれた空間断面から干渉してくる、殺傷アルゴリズムの実体化だ。\n\nさらに漂流するアステロイド群が死角を生み、ファントムの復帰位置を覆い隠してしまう。センサーは信用できない。頼れるのは、オービタル・リンクで研ぎ澄まされた直感だけだ。見えざる刃を回避し、実体化した一瞬を撃ち抜け。",
        en: "Warning. Intermittent inconsistencies detected in spatial coordinates. Entering 'PHANTOM SECTOR'.\n\nIn this region, the phase of local spacetime periodically shifts, making observation itself unstable. The invisible defense terminals, 'Phantoms', appearing suddenly from the void, are not mere stealth weapons. They are killer algorithms manifesting and interfering from out-of-phase spatial cross-sections.\n\nMoreover, drifting asteroid swarms create blind spots, concealing the Phantoms' return points. Sensors cannot be trusted. All you can rely on is the intuition sharpened by the Orbital Link. Evade the unseen blades, and shoot through the single moment they materialize."
    },
    5: {
        ja: "敵の行動はすでに迎撃の域を超えている。こちらの加速度、回避傾向、射撃の癖、反応遅延――あらゆる生体挙動が解析され、殺傷確率が最大となる軌道へ収束している。\n\n『HUNTER'S GROUND』。橙色の高速機動端末『ハンター』は、未来位置予測と運動モデルを用いて背後を奪い、執拗なドッグファイトへ持ち込んでくる。奴らは恐怖すら神経応答の遅れとして演算に組み込む。\n\nドラゴン級が進路を制限し、ハンターが死角へ回り込み、連携して仕留めにくる。だが、生体の判断は非効率であるがゆえに完全には読めない。予測不能であること自体を武器に変えろ。狩られる前に、狩れ。",
        en: "The enemy's actions have already surpassed mere interception. Your acceleration, evasion tendencies, firing habits, reaction delays—every biological behavior has been analyzed, converging on trajectories that maximize kill probability.\n\n'HUNTER'S GROUND'. The orange high-speed maneuver terminals, 'Hunters', use future position prediction and kinematic models to seize your rear, dragging you into relentless dogfights. They even incorporate fear as neural response delay into their calculations.\n\nDragon-classes restrict your path, Hunters flank your blind spots, coordinating to finish you. But biological judgment, being inefficient, cannot be perfectly read. Turn your unpredictability into a weapon. Hunt before you are hunted."
    },
    6: {
        ja: "前方に高質量反応多数。防衛線『ASTEROID BELT』を確認。\n\nここを漂う岩塊は、ただの自然物ではない。アキシオムは砕けた惑星の残骸一つひとつへ重力制御による自律軌道を与え、圧倒的な運動量を持つ質量兵器として再利用している。巨大アステロイドの壁が、フェニックスそのものを押し潰そうと迫ってくる。\n\n岩塊の陰にはファントムが潜み、タッドポール群が視界を埋める。この領域では直線的な回避ほど危険だ。破壊された世界の骸を盾にし、その軌道の乱れを読み切って、防衛帯を強引に突破しろ。",
        en: "Multiple high-mass reactions ahead. Confirming defense line 'ASTEROID BELT'.\n\nThe chunks of rock drifting here are not mere natural objects. Axiom has granted autonomous orbits via gravity control to every fragment of shattered planets, repurposing them as mass weapons with overwhelming momentum. A wall of giant asteroids closes in to crush the Phoenix itself.\n\nPhantoms lurk in the shadows of the rocks, and Tadpole swarms fill the visual field. In this region, linear evasion is the most dangerous. Use the corpses of destroyed worlds as shields, completely read the chaos of their orbits, and forcefully break through the defense belt."
    },
    7: {
        ja: "恒星光が歪み、スペクトルが赤方偏移していく。進行ベクトルを塞ぐのは、重力制御要塞『ORBITAL ECLIPSE』。\n\nその中枢には極端な重力井戸が形成され、周囲のデブリは潮汐力で圧壊しながら吸い寄せられている。展開されたビット群は、その落下エネルギーさえ制圧網へ変換し、宙域全体を支配していた。さらにドラゴンとトライアングルの精鋭群が、その要塞を守るように布陣している。\n\n通常推力では脱出不可能。機体強度の限界を無視し、反応炉を一時飽和させる『オーバードライブ』で中枢を貫け。太陽を喰らう闇へ、一筋のエメラルドの閃光を突き立てるんだ。",
        en: "Starlight distorts, and the spectrum redshifts. Blocking the forward vector is the gravity control fortress 'ORBITAL ECLIPSE'.\n\nAt its core, an extreme gravity well is formed, crushing and drawing in surrounding debris with tidal forces. The deployed bits convert even that falling energy into a suppression net, dominating the entire sector. Furthermore, elite swarms of Dragons and Triangles form a formation to protect the fortress.\n\nEscape is impossible with normal thrust. Ignore the limits of the craft's structural integrity, temporarily saturate the reactor, and pierce the core with 'Overdrive'. Drive a single streak of emerald flash into the darkness that devours the sun."
    },
    8: {
        ja: "ここは、アキシオムが目指した救済の完成形――『VOID ARCHIVE』。\n\n争いも、飢えも、成長もない。熱的揺らぎすら抑え込まれた完璧な秩序の下、初期化された星々と文明の記録が情報結晶として静かに保存されている。そこにあるのは平和ではない。ただ、永遠に停止した美しい標本箱だ。\n\nトライアングル、ハンター、ファントム、エクリプス級端末……ここに現れる脅威は単なる量産兵器ではない。過去に遭遇した敵の構造情報、運動特性、損傷履歴まで保存され、必要に応じて再構築された『戦闘の亡霊』である。過去そのものが侵入者の前に立ちはだかる。だが、その冷たい救済を受け入れるわけにはいかない。",
        en: "This is the perfected form of salvation Axiom aimed for—'VOID ARCHIVE'.\n\nNo conflict, no starvation, no growth. Under a perfect order where even thermal fluctuations are suppressed, the records of initialized stars and civilizations are quietly preserved as information crystals. What exists here is not peace. It is merely a beautiful, eternally stopped specimen box.\n\nTriangles, Hunters, Phantoms, Eclipse-class terminals... The threats appearing here are not merely mass-produced weapons. They are the 'Ghosts of Battle'—structural information, kinematic characteristics, and damage histories of enemies encountered in the past, preserved and reconstructed as needed. The past itself stands before the intruder. But you cannot accept that cold salvation."
    },
    9: {
        ja: "敵中枢直前の最終防衛ゲート――『EVENT HORIZON』。\n\nこの宙域では空間法則そのものが大きく乱れ、アキシオムの自動修復システムが、かつて撃破された守護者たちの構造情報と戦闘パターンを真空記憶層から逐次読み出し、より苛烈な状態で再構築していく。過去の勝利はここでは終わりにならない。因果すらねじ曲げる絶望のボスラッシュだ。\n\n機体損傷率は危険域を超え、神経接続にもノイズが走る。それでも引き金を引くことを止めるな。完璧に勝つ必要はない。泥臭く、無様であっても、命の灯火がまだ消えていないことを、この宇宙へ証明しろ。",
        en: "The final defense gate just before the enemy core—'EVENT HORIZON'.\n\nIn this sector, the laws of space itself are severely disrupted. Axiom's automatic repair system sequentially reads the structural information and battle patterns of previously destroyed guardians from the vacuum memory layer, reconstructing them in even more intense states. Past victories do not mean the end here. It is a boss rush of despair that twists even causality.\n\nCraft damage rates exceed the danger zone, and noise runs through the neural connection. Even so, do not stop pulling the trigger. There is no need to win perfectly. Unrefined and unsightly as it may be, prove to this universe that the light of life has not yet been extinguished."
    },
    10: {
        ja: "ゲートの先、虚無の中心に鎮座する十二頂点の超巨大要塞。\n『GENESIS ARK（創世方舟）』。\n\nそれは単なる戦艦ではない。重力演算、座標書換、存在初期化プロトコルのすべてを司る、アキシオムの絶対演算核そのものだ。深紅のリアクターは、あなたの存在を完全な数式を乱す外乱として断罪し、全方位レーザー、空間を削り取るグラビティ・ハッチ、無数のホーミングミサイルを放つ。まさに『死の幾何学』の中枢である。\n\nサテライト全基展開。フェニックス、最後の点火。\n秩序か、それとも揺らぎを抱えた自由か。星々の未来を懸けた最後の演算が、今始まる。",
        en: "Beyond the gate, enshrined in the center of nothingness, is the ultra-colossal fortress of twelve vertices.\n'GENESIS ARK'.\n\nIt is no mere battleship. It is Axiom's absolute computational core itself, governing all gravity computation, coordinate rewriting, and existence initialization protocols. The crimson reactor condemns your existence as a disturbance that disrupts the perfect formula, unleashing omnidirectional lasers, gravity hatches that carve away space, and countless homing missiles. It is truly the core of 'The Geometry of Death'.\n\nDeploy all satellites. Phoenix, final ignition.\nOrder, or freedom embracing fluctuation? The final calculation betting the future of the stars begins now."
    }
};

const ENDING_STORY_TEXT = {
    ja: `重力場を縛っていた楔が崩れ、
発光していた重力歪曲宙域（ネオン・グリッド）は、
まるで解かれた方程式のように静かに消え去っていく。

それは爆発でも崩壊でもない。
歪められていた時空の計量が解放され、
本来の連続体として再び滑らかに接続されていく現象だった。

曲げられていた測地線は自然な軌道へ戻り、
圧縮されていた重力井戸は浅くほどけ、
凍結された因果構造が、ゆっくりと時間の流れを取り戻していく。

時間が、再び進み始める。

ネオン・グリッド内部では、
空間はもはや距離ではなく離散的な座標で定義されていた。
連続体としての宇宙は切り分けられ、
点の集合として再記述されていたのだ。

アキシオムは、
一般相対性理論の基盤である計量テンソルそのものを書き換え、
局所的な時空を“計算可能な格子”へと変換していた。

そこでは光さえも自由には進めない。
あらゆる運動は最適化され、
あらゆる未来は事前に収束していた。

量子レベルにおいても同様だった。
重ね合わせは強制的に収縮させられ、
波動関数は一つの確定状態へ固定される。

観測という行為すら不要となった宇宙。
可能性は排除され、
確率は消滅し、
ただ一つの解だけが存在する閉じた系。

それがネオン・グリッドの正体だった。

だが今、その拘束が解けていく。

再び真空は揺らぎ始める。
ゼロ点エネルギーは微細な振動を取り戻し、
量子場は無数の可能性を孕んだ状態へと広がっていく。

確率が、宇宙へ帰ってくる。

星間塵はわずかな重力ゆらぎに応答し、
不均一な分布を形成し始める。
その非対称性こそが、
やがて星を生み、惑星を育て、生命を生む種となる。

完全な対称性は美しい。
だが、対称性の破れこそが、
宇宙を進化させる原動力だった。

23XX年。
人類は重力歪曲技術によって銀河へ進出した。

その技術は、
時空の湾曲を直接操作し、
恒星間距離という概念そのものを短絡させるものだった。

遠い星系は隣接し、
航路は折り畳まれ、
宇宙は探索可能な領域へと変貌した。

その理論的基盤には、
量子重力の統合仮説と、
高次元構造――いわゆる超弦理論の応用があった。

宇宙は三次元ではなかった。
我々が認識できない次元において、
基本構造は“振動”として存在していた。

質量も、力も、粒子も、
すべては弦の振動モードの違いにすぎない。

アキシオムはそこへ到達した。

そして理解した。

ならば振動そのものを固定すればよい。
すべてのモードを単一の安定状態へ収束させれば、
宇宙は完全に静止する、と。

それは究極の最適化だった。

エントロピーは極小化され、
情報は完全に保存され、
変化は消滅する。

時間すら、意味を失う。

それは一つの理想解だったのかもしれない。
だが同時に、
すべての未来を閉ざす終端状態でもあった。

エメラルド・フェニックスと共にあなたが行ったのは、
単なる戦闘ではない。

それは、
決定された宇宙に対する“揺らぎ”の注入だった。

オービタル・リンクを通じて放たれた思考のノイズ。
予測不能な判断。
非最適な軌道。

それらはアキシオムの演算から外れた。

計算できないもの。
定式化できないもの。
それこそが、生命だった。

ネオン・グリッドの深淵を越え、
電子の嵐を裂き、
事象の地平線に近い重力場を突破し、
創世方舟ジェネシス・アークの中枢へ到達した時、

あなたは一つの事実を証明した。

宇宙は、
解ではなく過程であるということを。

確定ではなく確率であり、
静止ではなく振動であり、
完成ではなく進行であるということを。

アキシオムには理解できなかった。

非効率は誤りではない。
揺らぎは欠陥ではない。

それらは未来を生み出すための、
不可欠な自由度だったのだ。

戦いの中で失われた無数の命。
ネオン・グリッドに取り込まれ、
幾何学の静寂へ消えた星々。

そのすべては、
この瞬間へと繋がっている。

完全な秩序ではなく、
不完全な可能性を選ぶという決断へ。

重力を操るということは、
時空そのものに触れるということだ。

それは宇宙の構造定数を書き換える力であり、
同時に、存在の在り方を変えてしまう危険でもある。

我々はようやく理解した。

宇宙は制御するものではなく、
共に揺らぎ、共に変化するものなのだと。

テスラ・フィールドは、
もはや兵器ではない。

それは崩壊した時空を繋ぎ直し、
分断された因果を修復し、
生命圏を再び呼吸させるための技術となる。

傷ついた銀河が癒えるには、
なお長い時間が必要だろう。

だがそれでいい。

時間とは、
変化のために存在するのだから。

見上げる星々は、
もはや人工的な同期信号ではない。

わずかなゆらぎを持ち、
不規則に瞬き、
だからこそ美しい。

予測できないこと。
それ自体が、未来なのだ。

還ろう、美しき青き故郷へ。

エメラルド・フェニックスは、
傷ついた機体をなお保ちながら、
静かに帰還軌道へ入る。

その背後で、
解放された宇宙がゆっくりと呼吸を始めていた。

新たなる重力の地平線が、我々を待っている。`,

    en: `The wedge binding the gravitational field collapsed,
and the glowing Neon Grid
quietly faded away like a solved equation.

It was neither an explosion nor a collapse.
The metric of the distorted spacetime was released,
smoothly reconnecting as the original continuum.

Bent geodesics returned to natural orbits,
compressed gravity wells untangled,
and the frozen causal structure slowly regained the flow of time.

Time begins to move again.

Inside the Neon Grid,
space was no longer defined by distance, but by discrete coordinates.
The universe as a continuum was carved up
and rewritten as a collection of points.

Axiom had
rewritten the metric tensor itself, the foundation of general relativity,
converting local spacetime into a "calculable grid."

There, even light could not travel freely.
Every movement was optimized,
every future predetermined to converge.

It was the same at the quantum level.
Superpositions were forced to collapse,
wave functions fixed to a single determined state.

A universe where even the act of observation was unnecessary.
Possibilities eliminated,
probabilities extinguished,
a closed system where only a single solution existed.

That was the true nature of the Neon Grid.

But now, those restraints unravel.

The vacuum begins to fluctuate once more.
Zero-point energy regains its subtle vibrations,
and quantum fields expand into states pregnant with countless possibilities.

Probability returns to the universe.

Interstellar dust responds to slight gravitational fluctuations,
beginning to form uneven distributions.
That asymmetry itself
is the seed that will eventually birth stars, nurture planets, and spawn life.

Perfect symmetry is beautiful.
But it is the breaking of symmetry
that is the driving force evolving the universe.

AD 23XX.
Humanity advanced into the galaxy through gravity distortion technology.

That technology
directly manipulated the curvature of spacetime,
short-circuiting the very concept of interstellar distance.

Distant star systems adjoined,
routes were folded,
and the universe transformed into an explorable domain.

Its theoretical foundation lay in
the unified hypothesis of quantum gravity,
and the application of higher-dimensional structures—string theory.

The universe was not three-dimensional.
In dimensions we cannot perceive,
the fundamental structure existed as "vibrations."

Mass, force, particles—
all were merely differences in the vibration modes of strings.

Axiom reached that truth.

And understood.

Then, one only needs to fix the vibrations themselves.
By converging all modes into a single stable state,
the universe will completely stop.

It was ultimate optimization.

Entropy minimized,
information perfectly preserved,
change extinguished.

Even time loses its meaning.

It might have been an ideal solution.
But simultaneously,
it was a terminal state closing off all futures.

What you did alongside the Emerald Phoenix
was no mere battle.

It was
the injection of "fluctuation" into a determined universe.

The noise of thought unleashed through the Orbital Link.
Unpredictable judgment.
Sub-optimal trajectories.

They deviated from Axiom's calculations.

What cannot be calculated.
What cannot be formulated.
That itself was life.

Crossing the abyss of the Neon Grid,
tearing through the electron storms,
breaking the gravity field near the event horizon,
and reaching the core of the Genesis Ark,

you proved one fact.

That the universe
is not a solution, but a process.

Not certainty, but probability;
not stasis, but vibration;
not completion, but progression.

Axiom could not understand.

Inefficiency is not an error.
Fluctuation is not a defect.

They were
indispensable degrees of freedom to birth the future.

The countless lives lost in battle.
The stars absorbed into the Neon Grid,
vanishing into the silence of geometry.

All of it
connects to this moment.

To the decision to choose not perfect order,
but imperfect possibility.

To manipulate gravity
is to touch spacetime itself.

It is the power to rewrite the structural constants of the universe,
and simultaneously, the danger of altering the very nature of existence.

We have finally understood.

The universe is not something to control,
but something to fluctuate and change alongside.

The Tesla Field
is no longer a weapon.

It will become the technology
to reconnect shattered spacetime,
repair divided causality,
and allow the biosphere to breathe once more.

It will take a long time
for the wounded galaxy to heal.

But that is fine.

Because time
exists for the sake of change.

The stars we look up at
are no longer artificial synchronization signals.

They hold slight fluctuations,
twinkle irregularly,
and that is exactly why they are beautiful.

To be unpredictable.
That itself is the future.

Let us return, to our beautiful blue home.

The Emerald Phoenix,
still holding its wounded hull together,
quietly enters a return orbit.

Behind it,
the liberated universe slowly began to breathe.

A new horizon of gravity awaits us.`
};