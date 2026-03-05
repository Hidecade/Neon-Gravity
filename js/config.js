// =========================================================
// Game Configuration & Constants
// =========================================================

const GAME_VERSION = "1.0.10";

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
    ISLAND: 40, // 基準サイズ。描画時はこれに e.scale が掛かります
    TURRET: 15,
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
    { name: 'PENTA-BASE', sides: 5, color: '#0ff', hp: 140, bulletCount: 5, speedFactor: 1.1 },
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
    2: '#f8f8ff', // White
    3: '#3355ff', // Deep Blue
    4: '#aa00ff', // Purple
    5: '#ffaa00', // Gold
    6: '#ff4400', // Orange
    7: '#00ff88', // Green
    8: '#ff00ff', // Magenta
    9: '#ff0055', // Boss Rush Red
    10: '#ff0000' // Final Red
};
