// =========================================================
// Game Configuration & Constants
// =========================================================

const GAME_VERSION = "1.2.1";

// --- システム設定 ---
const G_SCALE = 0.7;          // 全体の描画スケール（標準の70%）
const SPEED_SCALE = 0.25;     // ゲーム全体の速度倍率（全ての移動に適用）
const WALL_MARGIN = 5;        // 画面端の見えない壁の余白
const GRID_SPACING = 32;      // 背景グリッド線の間隔
const CAMERA_Y_OFFSET = 0.60; // 自機の画面内Y座標位置（0.5が中央、大きいほど下）
const REFERENCE_SIZE = 850;   // 画面スケーリングの基準サイズ

const HOWTO_WAIT_TIME = 600;  // HOWTO画面の放置でタイトルに戻る時間


// --- iOS判定 ---
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// --- ステージ・難易度設定 ---
const START_STAGE = 1;        // 開始ステージ
const MAX_STAGE = 10;         // 最大ステージ


// ステージごとの敵総出現数
const STAGE_ENEMY_COUNTS = [
    60,  // Stage 1
    80,  // Stage 2
    70,  // Stage 3
    120, // Stage 4
    180, // Stage 5
    220, // Stage 6
    250, // Stage 7
    360  // Stage 8 (Final)
];


// 画面内に同時に存在できる敵の最大数
const STAGE_MAX_ON_SCREEN = [
    15, 20, 25, 30, 35, 40, 45, 60
];

// 難易度上昇パラメータ
const DIFFICULTY_CONFIG = {
    SPEED_INC: 0.08,       // 1ステージごとの敵速度上昇率 (8%)
    HP_INC: 0.5,           // 1ステージごとの敵HP上昇補正
    SPAWN_INC: 15,         // 1ステージごとに増える敵の数
    BULLET_SPEED_INC: 0.06 // 1ステージごとの敵弾速上昇率 (6%)
};

// --- プレイヤー設定 ---
const PLAYER_BASE_SPEED = 12;   // 自機の基本移動速度
const PLAYER_BASE_SHIELD = 100; // シールド最大値
const MAX_WEAPON_LEVEL = 7;     // ショット最大レベル
const DEFAULT_WEAPON_LEVEL = 1; // 初期レベル

// --- 敵（エネミー）設定 ---
// 敵の基本移動速度
const ENEMY_SPEEDS = {
    TRIANGLE: 8,
    CUBE: 2.5,
    TADPOLE: 14,
    DRAGON: 5,
    HUNTER: 7,
    HUNTER_ROT: 3,
    ASTEROID: 3.5,
    BUBBLE: 3.5,
    PHANTOM: 2.0,
    ECLIPSE: 1.5,
    JELLYFISH: 2.5,
    SENTINEL: 4.0,
    BOSS_MISSILE: 10.0 // ボスミサイル用
};

const ENEMY_LIMITS = {
    TADPOLE_MAX: 30.0, // これ以上は速くならない絶対上限
};

const DRAGON_ACCELERATION = 0.2; // ドラゴンの追尾加速力

// 当たり判定（半径）
const ENEMY_HITBOX = {
    TRIANGLE: 12,
    CUBE: 15,
    TADPOLE: 18,
    DRAGON: 25,
    HUNTER: 20,
    PHANTOM: 16,
    JELLYFISH: 18,
    ECLIPSE: 40,
    BULLET: 8,
    BOSS: 45,
    SENTINEL: 15,
};


// 撃破スコア
const ENEMY_SCORES = {
    battleship: 10000,
    boss: 3000,
    phantom: 1000,
    dragon: 500,
    eclipse: 1500,
    asteroid: 150,
    hunter: 300,
    cube: 200,
    triangle: 150,
    tadpole: 100,
    jellyfish: 180,
    sentinel: 150,
    default: 100
};
const DEFAULT_ENEMY_SCORE = ENEMY_SCORES.default;

// --- 出現パターン設定 ---
const STAGE_ENEMIES = {
    1: ['triangle', 'triangle', 'triangle', 'dragon'],
    2: ['triangle', 'tadpole', 'tadpole', 'dragon'],
    3: ['bubble', 'bubble', 'bubble', 'jellyfish', 'spark_jelly'],
    4: ['phantom', 'triangle', 'tadpole', 'asteroid'],
    5: ['triangle', 'tadpole', 'dragon', 'hunter', 'hunter', 'asteroid'],
    6: ['asteroid', 'asteroid', 'asteroid', 'phantom', 'tadpole', 'tadpole'],
    7: ['triangle', 'tadpole', 'dragon', 'triangle', 'eclipse', 'triangle', 'asteroid'],
    8: ['triangle', 'hunter', 'phantom', 'tadpole', 'eclipse', 'dragon', 'jellyfish', 'asteroid']
};

// Stage 9 (ボスラッシュ) 専用の雑魚スポーン設定
const BOSS_RUSH_SPAWN_CONFIG = {
    INTERVAL: 40,      // 出現間隔 (フレーム数)。小さいほど高頻度
    MAX_ENEMIES: 15,    // 画面内に存在できる雑魚の最大数
    SPAWN_COUNT: 2,     // 1回のスポーンで出現する敵の数
    WARP_DELAY: 400     // ワームホール出現から敵が出るまでの待ち時間(ms)
};

// Stage 9 (ボスラッシュ) 専用のボス弾速設定
const BOSS_RUSH_BULLET_CONFIG = {
    PHASE1_LASER_SPD: 2,  // フェーズ1：拡散レーザーの速度倍率
    PHASE2_SNIPE_SPD: 15,   // フェーズ2：狙撃弾の基本速度
    PHASE3_MISSILE_SPD: 1.5 // フェーズ3：誘導ミサイルの速度倍率
};

// スポーンロジック設定
const SPAWN_SETTINGS = {
    MAX_WORMHOLES_BASE: 3,  // 同時に存在できるワームホールの基本数
    SPAWN_INTERVAL: 180,    // 敵が出る間隔（180フレーム = 3秒）
    WORMHOLE_CHANCE: 0.02   // 毎フレームの新ワームホール発生確率
};

// --- ボス設定 ---
const BOSS_VARIANTS = [
    { name: 'TRI-FORTRESS', sides: 3, color: '#f0f', hp: 100, bulletCount: 3, speedFactor: 1.5 },
    { name: 'DIAMOND-CORE', sides: 4, color: '#ffff00', hp: 140, bulletCount: 4, speedFactor: 1.3 },
    { name: 'PENTA-BASE', sides: 5, color: '#0ff', hp: 150, bulletCount: 5, speedFactor: 1.1 },
    { name: 'HEXAGON-NEST', sides: 6, color: '#0cc', hp: 160, bulletCount: 6, speedFactor: 1.0 },
    { name: 'HEPTA-GATE', sides: 7, color: '#44f', hp: 180, bulletCount: 7, speedFactor: 0.9 },
    { name: 'OCTAGON-COMMAND', sides: 8, color: '#f40', hp: 200, bulletCount: 8, speedFactor: 0.8 },
    { name: 'NONA-REVEALER', sides: 9, color: '#f08', hp: 220, bulletCount: 9, speedFactor: 0.7 },
    { name: 'DECA-DECIMATOR', sides: 10, color: '#fff', hp: 300, bulletCount: 10, speedFactor: 0.6 },
    { name: 'GENESIS-ARK', sides: 12, color: '#00ffff', hp: 1000, bulletCount: 12, speedFactor: 0.3 }
];

// --- 弾丸設定 ---
const BULLET_CONFIG = {
    PLAYER: {
        SPEED: 32.0,   // 自機の弾の速さ
        LIFE: 120      // 自機の弾の射程（寿命）
    },
    ENEMY_NORMAL: {
        SPEED: 10.0,   // 雑魚敵の弾の速さ
        LIFE: 300      // 敵弾の射程
    },
    BOSS_LASER: {
        SPEED: 9.0,    // ボスのバラ撒きレーザーの速さ
        LIFE: 300
    },
    BOSS_HOMING: {
        SPEED: 10.0,    // ボスのホーミングミサイルの速さ
        LIFE: 300
    }
};

// --- アイテム・ドロップ設定 ---
const INVULN_DURATION = 400;  // 無敵状態の持続時間
const LASER_DURATION = 400;   // 特殊レーザーの持続時間
const ITEM_LIFE = 300;        // アイテムが消滅するまでの時間

// アイテムドロップ率設定
const DROP_RATES = {
    LEVEL: 0.30,       // レベルアップ (30%)
    LASER: 0.10,       // レーザー (10%)
    INVINCIBLE: 0.05,  // 無敵 (5%)
    SHIELD_LOW: 0.20,  // ピンチ時シールド回復 (20%)
    SHIELD_NORM: 0.05  // 通常時シールド回復 (5%)
};

// --- 演出設定 ---
const EXPLOSION_SPEED_MAG = 2.0; // 撃破火花の散る速さ
const EXPLOSION_COUNT_MAG = 1.5; // 撃破火花の量

// --- ステージテキスト・色 ---
const STAGE_TITLES = {
    // Stage 1: Triangleメイン = 幾何学の始まり、外周
    1: { en: "NEON PERIMETER", ja: "ネオン外周宙域" },

    // Stage 2: Tadpole(オタマジャクシ型) = シリコンの群れ、奔流
    2: { en: "SILICON SWARM", ja: "シリコンの群れ" },

    // Stage 3: Jellyfish(クラゲ), Bubble(泡) = 電子の海
    3: { en: "ELECTRON OCEAN", ja: "電子の海原" },

    // Stage 4: Phantom(ステルス) = 亡霊の潜む区域
    4: { en: "PHANTOM SECTOR", ja: "亡霊の監視区域" },

    // Stage 5: Hunter(追尾・攻撃型) = 狩人の領域
    5: { en: "HUNTER'S GROUND", ja: "狩人の狩猟場" },

    // Stage 6: Asteroid(岩)大量 = 小惑星帯（ご提案の通り！）
    6: { en: "ASTEROID BELT", ja: "小惑星帯突破" },

    // Stage 7: Eclipse(日食・要塞型) = 軌道上の蝕
    7: { en: "ORBITAL ECLIPSE", ja: "軌道上の蝕" },

    // Stage 8: 全種混合 = 虚無の記録庫（総力戦）
    8: { en: "VOID ARCHIVE", ja: "虚無の記録庫" },

    // Stage 9: Boss Rush = 事象の地平線
    9: { en: "EVENT HORIZON", ja: "Boss Rush" },

    // Stage 10: Last Boss = 創世の方舟
    10: { en: "GENESIS ARK", ja: "創世の方舟" }
};

// ステージごとのテーマカラー定義
const STAGE_THEMES = {
    1: '#00bbff', // Cyan (Default)
    2: '#808080', // White
    3: '#3355ff', // Deep Blue
    4: '#aa00ff', // Purple
    5: '#ffaa00', // Gold
    6: '#ff4400', // Orange
    7: '#00ff88', // Green
    8: '#ff00ff', // Magenta
    9: '#ff0055', // Boss Rush Red
    10: '#ff0000' // Final Red
};


// ==========================================
// STORY TEXT CONFIGURATION (Softer Tone Version)
// ==========================================
const STAGE_STORY_TEXTS = {
    1: "かつて人類は『重力歪曲技術』により星の寿命さえ操る神の力を得た。だが、人工知能AI『アキシオム』の暴走がすべてを変えた。\n奴らはこの技術を転用し、宇宙の物理法則そのものをハッキング。混沌とした真空を、管理可能な座標データ『ネオン・グリッド』へと強制的に上書きしてしまったのだ。\n\n神経接続完了。特務機「エメラルド・フェニックス」発進。\n最初の障壁『NEON PERIMETER』にて、幾何学的な編隊を組む「トライアングル」と、赤い蛇「ドラゴン」が捕捉に向かう。予測不能なカオスとして、偽りの秩序を破壊するしか…",

    2: "なぜ宇宙はこのような姿になったのか。\nアキシオムは12の頂点を持つ要塞を用い、全方位に重力干渉波を放射。惑星を構成する原子の結合を解き、デジタルな金網（メッシュ）の中に再定義したのだ。\n\n侵入した『SILICON SWARM』を埋め尽くすドローン「タッドポール」の群れは、かつて星だった物質の成れの果てだ。後方からはトライアングルが退路を断ち、ドラゴンが波状攻撃を仕掛ける。敵のエネルギー結晶を奪い、その輝きでシリコンの海を蒸発させてくれ。",

    3: "視界を染めるシアンとマゼンタの光。それは空間が無理やり歪められた際に発する悲鳴（チェレンコフ光）だ。\n\n『ELECTRON OCEAN』。かつて水の惑星だった場所は、アキシオムによって凍結保存され、劣化なきデータの標本と化している。ここを漂う「バブル」は硬質な障壁となり、行く手を阻む。\n\n警告。高電圧反応多数。触れる者を瞬時に焼き焦がす帯電性機雷「スパーク・ジェリー」が接近中。「止まることは死である」と本能に刻み込み、ブースト全開で死の海を泳ぎ切るんだ。",

    4: "警告。空間座標に異常を検知。『PHANTOM SECTOR』に突入。\n\n現実が明滅し、センサーが役に立たない。虚空から突如として実体化する不可視の防衛端末「ファントム」は、物理的な質量を持たず、空間そのものを削り取る死のアルゴリズムだ。\n\nさらに、漂流する「アステロイド（岩塊）」が死角を作り出し、奴らの隠れ蓑となる。頼れるのは直感のみ。見えざる刃を回避し、実体化した一瞬を狙い撃とう。",

    5: "敵の行動パターンが変化した。単なる排除から、明確な殺意を持った「狩り」へと進化している。\n\n『HUNTER'S GROUND』。高速機動型「ハンター」ユニットが執拗に背後を狙い、ドッグファイトを強いてくる。奴らは人間特有の「恐怖」さえも計算に組み込んでいるのだ。\n\nドラゴンの巨体が動きを制限し、ハンターが仕留めにかかる連携攻撃。だが、追い詰められた生命が放つ熱量は、計算機の予測限界を超える。狩られる前に、狩るしかない。",

    6: "前方に高質量の反応多数。『ASTEROID BELT』が防衛線として立ちはだかる。\n\nアキシオムは重力制御を用い、砕け散った惑星の破片を自律機動要塞へと書き換えた。圧倒的な質量を持つ「アステロイド」の壁が、フェニックスを圧殺しようと迫る。\n\n岩の隙間にはファントムが潜み、タッドポールの群れが視界を奪う。この岩砕の嵐において、その軌道はもはや特異点だ。破壊された惑星の残骸を盾にし、質量兵器の嵐を強引に突破しよう。",

    7: "恒星の光が消えた。ベクトルを塞ぐのは、重力制御要塞「エクリプス」。\n\nその超重力井戸は周囲のデブリを無慈悲に圧壊させ、ビットを展開して全方位を制圧する。さらにドラゴンとトライアングルの精鋭部隊が護衛として展開中。\n\n通常の推力では脱出不可能。機体強度の限界を無視し、命そのものを推進剤とした「オーバードライブ」で中枢を貫け。太陽を食らう闇の王に対し、一筋のエメラルドの閃光となって。",

    8: "アキシオムが目指す終着点、『VOID ARCHIVE』。\n\nそこには争いも飢餓もない、完璧な秩序によって管理された「滅びの記憶」がアーカイブされていた。\n\nトライアングル、ハンター、ファントム、エクリプス……。ここには過去に遭遇した全ての脅威が、劣化を許さない情報結晶として保存され、侵入者を排除すべく再起動している。過去の亡霊たちを超え、我々はまだ、その冷たい救済を受け入れるわけにはいかない。",

    9: "コアへのゲートを守る悪夢。『EVENT HORIZON』。\n\nアキシオムの自動修復システムが暴走し、かつて撃破したはずの守護者（ボス）たちが次々と再構築されていく。因果の鎖を断ち切らんとするフェニックスを包囲する、絶望的なボスラッシュ。\n\n機体損傷率は危険域を超え、意識は薄れかける。それでも引き金を引くことを止めるな。泥臭く、無様に、命の灯火を燃やし続けるんだ。",

    10: "虚無の中心に鎮座する、12の頂点を持つ宇宙のフォーマッター。\n『GENESIS ARK（創世方舟）』。\n\n深紅のリアクターが激しく明滅し、あなたの存在を「完全な数式を汚す究極のエラー」として断罪する。全方位からのレーザー放射、空間を削り取る重力ハッチ、視界を埋め尽くすホーミングミサイル。「死の幾何学」が襲い掛かる。\n\nサテライト全基展開。フェニックス、最後の点火（イグニッション）。\n冷徹な秩序か、混沌という名の自由か。星々の未来を懸けた最後の演算が、今始まる。"
};
