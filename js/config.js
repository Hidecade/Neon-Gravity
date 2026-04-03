// =========================================================
// Game Configuration & Constants
// =========================================================

window.GAME_VERSION = "0.9.02"; // ゲームのバージョン（更新のたびにここを変更）


const DEBUG = {
    enabled: true,
    showOverlay: false,
    showHitboxes: false,
    showEnemyTargetLines: false,
    showSpawnPoints: false
};

// --- システム設定 ---
const G_SCALE = 0.7;            // 全体の描画スケール（標準の70%）
const SPEED_SCALE = 0.25;       // ゲーム全体の速度倍率（全ての移動に適用）
const WALL_MARGIN = 5;          // 画面端の見えない壁の余白
let GRID_SPACING = 32;          // 背景グリッド線の間隔

const CAMERA_Y_OFFSET = 0.60;   // 自機の画面内Y座標位置（0.5が中央、大きいほど下）

const REFERENCE_SIZE = 1080;    // 画面スケーリングの基準サイズ

const HOWTO_WAIT_TIME = 600;    // HOWTO画面の放置でタイトルに戻る時間

const PI2 = Math.PI * 2;        // 定数化して計算を省く

// --- iOS判定 ---
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ==========================================
// グラフィック設定のプリセット
// ==========================================
const GRAPHICS_SETTINGS = {
       ULTRA: {
        gridSpacing: 32,       
        explosionMag: 3.0,     
        starCount: 300,        
        nebulaeCount: 20,      
        get resScale() {
            const shortSide = Math.min(window.innerWidth, window.innerHeight);
            const longSide = Math.max(window.innerWidth, window.innerHeight);
            
            // iPad / PC などの大画面判定 (短辺768px以上)
            if (shortSide >= 768) {
                // 基本値を 2.0 に設定
                let baseScale = 2.0;
                
                // 負荷軽減：解像度が非常に高い場合（例：Retina Pro等）
                // 長辺が 2560px (1280 * 2) を超える場合は、描画負荷を抑えるため制限をかける
                if (longSide > 1280) {
                    return (1280 * 2.0) / longSide; 
                }
                return baseScale; 
            } else {
                // スマホ等の場合はRetinaの綺麗さを活かす
                return Math.min(window.devicePixelRatio || 2.0, 2.5);
            }
        }
    },
    HIGH: {
        gridSpacing: 32,      
        explosionMag: 3.0,    
        starCount: 300,       
        nebulaeCount: 20,     
        get resScale() {
            const shortSide = Math.min(window.innerWidth, window.innerHeight);
            const longSide = Math.max(window.innerWidth, window.innerHeight);
            
            if (shortSide >= 768) {
                // HIGH設定でもiPadなら 1.5 を適用
                if (longSide > 1280) {
                    return (1280 * 1.5) / longSide;
                }
                return 1.5; 
            } else {
                return Math.min(window.devicePixelRatio || 1.5, 1.5);
            }
        }
    },
    MEDIUM: {
        gridSpacing: 32,
        explosionMag: 1.5,
        starCount: 250,
        nebulaeCount: 20,
        resScale: 1.0
    },
    LOW: {
        gridSpacing: 48,
        explosionMag: 1.0,
        starCount: 200,
        nebulaeCount: 5,
        resScale: 0.75
    }
};
let currentGraphicsQuality = 'ULTRA'; // 現在の品質
let currentLanguage = localStorage.getItem('neonGravity_language') || (window.navigator.language.startsWith('ja') ? 'ja' : 'en');

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
    200, // Stage 6
    250, // Stage 7
    360  // Stage 8 (Final)
];

// 画面内に同時に存在できる敵の最大数
const STAGE_MAX_ON_SCREEN = [
    20, 25, 30, 35, 40, 45, 50, 60
];

// 難易度上昇パラメータ
const DIFFICULTY_CONFIG = {
    SPEED_INC: 0.08,       // 1ステージごとの敵速度上昇率 (8%)
    HP_INC: 0.5,           // 1ステージごとの敵HP上昇補正
    SPAWN_INC: 15,         // 1ステージごとに増える敵の数
    BULLET_SPEED_INC: 0.06 // 1ステージごとの敵弾速上昇率 (6%)
};

// --- プレイヤー設定 ---
const PLAYER_BASE_SPEED = 12;       // 自機の基本移動速度
const PLAYER_BASE_SHIELD = 100;     // シールド最大値
const MAX_WEAPON_LEVEL = 7;         // ショット最大レベル
const DEFAULT_WEAPON_LEVEL = 1;     // 初期レベル
const MAX_SATELLITES = 12;          // サテライトの最大保有数
const SHIELD_HEAL_AMOUNT = 2;       // シールド回復量

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
    SWEEPER: 10.0,
    LIGHTCYCLE: 15,
    BOSS_MISSILE: 10.0 // ボスミサイル用
};


// 敵キャラクターのHP設定 (ソースコード準拠)
const ENEMY_HP = {
    tadpole: 1,
    triangle: 1,       // リーダー・フォロワー共通の基本値
    cube: 2,
    sweeper: 2,
    jellyfish: 2,      // 通常クラゲ
    spark_jelly: 4,    // 帯電クラゲ（variant: spark）
    hunter: 3,
    lightcycle: 3,
    sentinel: 3,
    fighter: 3,        // Battleshipから射出される機体
    phantom: 4,
    asteroid: 4,       // サイズ大(size: 1)の時の基本値
    bubble: 4,         // サイズ大(size: 1)の時の基本値
    dragon: 8,
    eclipse: 24,
};

const ENEMY_LIMITS = {
    TADPOLE_MAX: 30.0,              // これ以上は速くならない絶対上限
    LIGHTCYCLE_MAX: 30.0,           // ライトサイクルの最高速度の絶対上限
    LIGHTCYCLE_TAIL_LENGTH: 150,    // ライトサイクルの光の壁（尾）の最大長
    LIGHTCYCLE_FADE_LENGTH: 10,     // 尾がパーティクル化して消えゆく部分の長さ
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
    SWEEPER: 15,
    LIGHTCYCLE: 18
};


// 撃破スコア
const ENEMY_SCORES = {
    battleship: 100000, // ★ 10000 から 100000 に変更（ラスボス）
    boss: 30000,        // ★ 3000 から 30000 に変更（通常ボス）
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
    sweeper: 150,
    lightcycle: 300,
    coin: 100,
    default: 100
};

const DEFAULT_ENEMY_SCORE = ENEMY_SCORES.default;

const EXPLOSION_PARTICLE_COUNT = {
    default: 40,
    boss: 120,
    asteroid: 10,
    phantom: 10,
    triangle: 10,
    jellyfish: 5,
    bubble: 5
};

// --- 出現パターン設定 ---
const STAGE_ENEMIES = {
    1: ['triangle', 'triangle', 'tadpole', 'dragon'],
    2: ['lightcycle', 'triangle', 'tadpole', 'lightcycle'],
    3: ['bubble', 'bubble', 'bubble', 'jellyfish', 'spark_jelly'],
    4: ['phantom', 'phantom', 'tadpole', 'tadpole', 'tadpole', 'tadpole', 'asteroid'],
    5: ['triangle', 'tadpole', 'dragon', 'hunter', 'hunter', 'sweeper'],
    6: ['asteroid', 'asteroid', 'asteroid', 'phantom', 'tadpole', 'tadpole'],
    7: ['triangle', 'tadpole', 'dragon', 'triangle', 'eclipse', 'triangle', 'asteroid'],
    8: ['triangle', 'hunter', 'phantom', 'tadpole', 'eclipse', 'dragon', 'jellyfish', 'asteroid', 'sweeper', 'lightcycle']
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
    { name: 'HEPTA-GATE', sides: 7, color: '#44f', hp: 108, bulletCount: 7, speedFactor: 0.9 },
    { name: 'OCTAGON-COMMAND', sides: 8, color: '#f40', hp: 200, bulletCount: 8, speedFactor: 0.8 },
    { name: 'NONA-REVEALER', sides: 9, color: '#f08', hp: 220, bulletCount: 9, speedFactor: 0.7 },
    { name: 'DECA-DECIMATOR', sides: 10, color: '#fff', hp: 300, bulletCount: 10, speedFactor: 0.6 },
    { name: 'GENESIS-ARK', sides: 12, color: '#00ffff', hp: 1000, bulletCount: 12, speedFactor: 0.3 }
];

// --- 弾丸設定 ---
const BULLET_CONFIG = {
    PLAYER: {
        SPEED: 32.0,        // 自機の弾の速さ
        LIFE: 60,           // 自機の弾の現在の射程（寿命）
        BASE_LIFE: 60,      // ゲームパッド/マウス操作時の基本寿命
        TOUCH_LIFE: 90,     // タッチ操作時の強化寿命
        POWER: 1.5,         // 自機の弾の基本威力
        BASE_POWER: 1.5,    // ゲームパッド/マウス操作時の基本威力
        TOUCH_POWER: 2.0    // タッチ操作（パッドなし）時の強化威力
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
const OVERDRIVE_DURATION = 400;
const LASER_DURATION = 400;   // 特殊レーザーの持続時間
const ITEM_LIFE = 300;        // アイテムが消滅するまでの時間

// アイテムドロップ率設定
const DROP_RATES = {
    LEVEL: 0.03,       // レベルアップ (3%)
    LASER: 0.10,       // レーザー (10%)
    INVINCIBLE: 0.05,  // 無敵 (5%)
    SHIELD_LOW: 0.20,  // ピンチ時シールド回復 (20%)
    SHIELD_NORM: 0.05  // 通常時シールド回復 (5%)
};

// --- 演出設定 ---
const EXPLOSION_SPEED_MAG = 2.0; // 撃破火花の散る速さ
let EXPLOSION_COUNT_MAG = 3.0; // 撃破火花の量

// --- ステージテキスト・色 ---
const STAGE_TITLES = {
    1:  { en: "NEON PERIMETER",  ja: "ネオン外周宙域" },
    2:  { en: "SILICON SWARM",   ja: "シリコンの群れ" },
    3:  { en: "ELECTRON OCEAN",  ja: "電子の海原" },
    4:  { en: "PHANTOM SECTOR",  ja: "亡霊の監視区域" },
    5:  { en: "HUNTER'S GROUND", ja: "狩人の狩猟場" },
    6:  { en: "ASTEROID BELT",   ja: "小惑星帯" },
    7:  { en: "ORBITAL ECLIPSE", ja: "軌道上の蝕" },
    8:  { en: "VOID ARCHIVE",    ja: "虚無の記録庫" },
    9:  { en: "EVENT HORIZON",   ja: "事象の地平線" },
    10: { en: "GENESIS ARK",     ja: "創世方舟" }
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
