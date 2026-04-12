// =========================================================
// Main Game Engine (main.js)
// 役割: システム変数の定義、メインループ、画面リサイズ管理
// =========================================================

// =========================================================
// 1. システム・グローバル変数
// =========================================================

// --- 基本システム ---
let baseAppScale = 1.0;         // 画面サイズによる基本拡大率
let globalUiScale = 1.0;        // UI全体のスケール
let gameSpeed = 1.0;            // ゲーム全体の速度係数（スロー演出等）
let cameraScale = 1.0;          // カメラのズーム倍率（1.0=通常、0.75=縮小）
let frame = 0;                  // 経過フレームカウント

let debugFps = 0;
let debugFrameCounter = 0;
let debugLastFpsTime = performance.now();   // ロジック処理にかかった時間（ミリ秒）を保存する変数
let debugLogicTime = 0;         // ロジック時間
let debugDrawTime = 0;          // 描画にかかった時間
let debugTotalTime = 0;


let width, height;              // 現在のキャンバスサイズ
let worldSize = 1500;           // ワールドサイズ

let globalSpawnEnemyId = 0;     // 生成されるたびに増やす
let globalEnemySpawnCounter = 0;

// --- ゲーム状態管理 ---
let gameState = 'TITLE';        // 現在の状態 ('TITLE', 'PLAYING', 'PAUSED' 等)
let previousGameState = '';     // ポーズ前の状態保存用
let stageClearTimer = 0;        // ステージクリア後の待機タイマー

let currentGameMode = GAME_MODES.NORMAL;
let queuedGameMode = GAME_MODES.NORMAL;
let extremeTimeAttackState = {
    active: false,
    cleared: false,
    targetFrames: 0,
    survivalFrames: 0,
    gaugeFrames: 0,
    maxGaugeFrames: 0,
    warningShown: false,
    timeoutTriggered: false,
    timeoutMessageShown: false
};

// --- 演出・モード制御フラグ ---
let isTrainingMode = false;     // トレーニングモード判定
let titleIdleTimer = 0;         // タイトル画面の放置タイマー
let isFadingOut = false;        // 画面フェードアウト中フラグ
let fadeAlpha = 0.0;            // フェードアウトの透明度
let msgHideTimeout = null;      // UIメッセージ消去用タイマー
let typingTimer = null;         // テキストタイピング演出用タイマー

// --- イントロ・ワープ演出 ---
let introPhase = 0;             // イントロの進行フェーズ
let introTimer = 0;             // イントロ用タイマー
let introAlpha = 0.0;           // イントロ用フェード値
let introBgScroll = 0;          // 背景の累計スクロール距離
let introBgSpeed = 0;           // 背景のスクロール速度
let isWarpingOut = false;       // クリア後の脱出ワープ演出中フラグ

// スキップ判定用グローバルフラグ
let isSkippingStory = false;
let isSkipComplete = false;

let bgFadeAlpha = 1.0;          // エンディング背景(星など)の透明度制御用

function queueGameModeStart(mode) {
    queuedGameMode = mode || GAME_MODES.NORMAL;
}

function setCurrentGameMode(mode) {
    currentGameMode = mode || GAME_MODES.NORMAL;
}

function getCurrentGameMode() {
    return currentGameMode;
}

function isExtremeTimeAttackMode() {
    return currentGameMode === GAME_MODES.EXTREME_TIME_ATTACK;
}

function resetExtremeTimeAttackState() {
    extremeTimeAttackState = {
        active: false,
        cleared: false,
        targetFrames: Math.floor(EXTREME_TIME_ATTACK_CONFIG.TARGET_TIME_SECONDS * 60),
        survivalFrames: 0,
        gaugeFrames: 0,
        maxGaugeFrames: Math.floor(EXTREME_TIME_ATTACK_CONFIG.INITIAL_GAUGE_SECONDS * 60),
        warningShown: false,
        timeoutTriggered: false,
        timeoutMessageShown: false
    };
}

function initExtremeTimeAttackState() {
    resetExtremeTimeAttackState();
    extremeTimeAttackState.active = true;
    extremeTimeAttackState.gaugeFrames = extremeTimeAttackState.maxGaugeFrames;
}

function getExtremeTimeAttackState() {
    return extremeTimeAttackState;
}

function addExtremeTimeAttackGaugeSeconds(seconds) {
    if (!isExtremeTimeAttackMode() || !extremeTimeAttackState.active) return;
    const frames = Math.floor(Math.max(0, seconds) * 60);
    extremeTimeAttackState.gaugeFrames = Math.min(
        extremeTimeAttackState.maxGaugeFrames,
        extremeTimeAttackState.gaugeFrames + frames
    );
}

function applyExtremeTimeAttackHitPenalty(seconds) {
    if (!isExtremeTimeAttackMode() || !extremeTimeAttackState.active) return;
    const frames = Math.floor(Math.max(0, seconds) * 60);
    extremeTimeAttackState.gaugeFrames = Math.max(0, extremeTimeAttackState.gaugeFrames - frames);
}

function updateExtremeTimeAttack() {
    if (!isExtremeTimeAttackMode() || !extremeTimeAttackState.active || gameState !== 'PLAYING') return;

    extremeTimeAttackState.survivalFrames++;

    const warningFrames = Math.floor((EXTREME_TIME_ATTACK_CONFIG.WARNING_TIME_SECONDS || 10) * 60);
    const remainFrames = Math.max(0, extremeTimeAttackState.targetFrames - extremeTimeAttackState.survivalFrames);
    const timeoutPreviewFrames = 60;

    if (!extremeTimeAttackState.warningShown && remainFrames > 0 && remainFrames <= warningFrames) {
        extremeTimeAttackState.warningShown = true;
        showGameMessage({
            kicker: 'WARNING',
            main: '6 SECONDS LEFT',
            sub: 'TIME LIMIT APPROACHING',
            type: 'warning',
            duration: 2000
        });
        if (typeof AudioSys !== 'undefined') AudioSys.playSE('warning');
    }

    if (!extremeTimeAttackState.timeoutMessageShown && remainFrames > 0 && remainFrames <= timeoutPreviewFrames) {
        extremeTimeAttackState.timeoutMessageShown = true;
        showGameMessage({
            kicker: 'WARNING',
            main: 'TIME OUT',
            sub: 'MISSION TERMINATED',
            type: 'warning',
            duration: 2400
        });
    }

    if (!extremeTimeAttackState.timeoutTriggered && extremeTimeAttackState.survivalFrames >= extremeTimeAttackState.targetFrames) {
        extremeTimeAttackState.timeoutTriggered = true;
        extremeTimeAttackState.active = false;
        player.invuln = Math.max(player.invuln || 0, 9999);
        if (typeof enemyBulletPool !== 'undefined' && enemyBulletPool && typeof enemyBulletPool.clearAll === 'function') {
            enemyBulletPool.clearAll();
        }
        if (!extremeTimeAttackState.timeoutMessageShown) {
            showGameMessage({
                kicker: 'WARNING',
                main: 'TIME OUT',
                sub: 'MISSION TERMINATED',
                type: 'warning',
                duration: 2400
            });
            extremeTimeAttackState.timeoutMessageShown = true;
        }
        if (typeof isWarpingOut !== 'undefined') {
            setTimeout(() => {
                if (gameState !== 'PLAYING') return;
                isWarpingOut = true;
                player.warpTimer = 0;
                player.warpSoundPlayed = false;
                player.hasExitedScreen = false;
                player.exitTimer = 0;
            }, 1800);
        }
        return;
    }

    const graceFrames = Math.floor(EXTREME_TIME_ATTACK_CONFIG.START_GRACE_SECONDS * 60);
    if (extremeTimeAttackState.survivalFrames <= graceFrames) return;

    let decay = EXTREME_TIME_ATTACK_CONFIG.GAUGE_DECAY_PER_SECOND;
    if (extremeTimeAttackState.survivalFrames >= 120 * 60) {
        decay *= EXTREME_TIME_ATTACK_CONFIG.DECAY_MULT_120S;
    } else if (extremeTimeAttackState.survivalFrames >= 60 * 60) {
        decay *= EXTREME_TIME_ATTACK_CONFIG.DECAY_MULT_60S;
    }

    extremeTimeAttackState.gaugeFrames -= decay;
    if (extremeTimeAttackState.gaugeFrames <= 0) {
        extremeTimeAttackState.gaugeFrames = 0;
        if (gameState === 'PLAYING') {
            player.shield = 0;
            if (typeof damage === 'function') damage(0);
        }
    }
}

window.queueGameModeStart = queueGameModeStart;
window.getCurrentGameMode = getCurrentGameMode;
window.isExtremeTimeAttackMode = isExtremeTimeAttackMode;
window.getExtremeTimeAttackState = getExtremeTimeAttackState;
window.addExtremeTimeAttackGaugeSeconds = addExtremeTimeAttackGaugeSeconds;
window.applyExtremeTimeAttackHitPenalty = applyExtremeTimeAttackHitPenalty;

// =========================================================
// 2. ステージ・進行管理変数
// =========================================================

let currentStage = 1;           // 実際の進行ステージ番号
let stage = 1;                  // 表示上のステージ番号
let score = 0;                  // 現在のスコア

let spawnedCount = 0;           // 生成済みの敵数
let enemiesToSpawn = 0;         // ステージの総出現ノルマ
let enemiesKilled = 0;          // 撃破した敵数
let isStageClear = false;       // ステージクリア判定
let dyingTimer = 0;             // プレイヤー死亡演出タイマー
let spawnWaitTimer = 0;         // 敵出現までの待機タイマー

// --- ボスラッシュ(Stage 9)・ラスボス(Stage 10)専用 ---
let rushBossIndex = 0;          // 現在のボス番号 (0~7)
let rushIntervalTimer = 0;      // インターバルタイマー
let stage10Timer = 0;           // 経過時間
let stage10BeatCount = 0;       // ビート演出カウント
let stage10SpawnTimer = 0;      // ラスボス出現専用タイマー

// ★追加：プレイ成績の記録用オブジェクト
let playStats = {
    startTime: 0,
    endTime: 0,
    enemiesSpawned: 0,
    enemiesKilled: 0,
    itemsSpawned: 0,
    itemsCollected: 0
};

// =========================================================
// 3. プレイヤー（自機）＆ 入力データ
// =========================================================

const player = {
    x: 0, y: 0, vx: 0, vy: 0, angle: 0,
    satellites: [],             // 取得したサテライト（オプション）
    shield: PLAYER_BASE_SHIELD, // 現在のシールド値
    weaponLevel: 1,             // 武器レベル
    invuln: 0,                  // 無敵時間タイマー
    laserTimer: 0,              // 特殊レーザー残り時間
    overdriveTimer: 0,          // オーバードライブ残り時間
    history: [],                // 軌跡（トレイル）用履歴
    visualScale: 1.0            // 描画スケール
};

const input = {
    move: { x: 0, y: 0, active: false }, // 左スティック
    aim: { x: 0, y: 0, active: false },  // 右スティック
    keys: {},                            // キーボード入力状態
    padAPressed: false,                  // ゲームパッド状態
    padBombPressed: false,
    padDirPressed: false,
    padStartPressed: false
};

let camera = { x: 0, y: 0 };

// =========================================================
// 4. エンティティ配列 (オブジェクトプール)
// =========================================================

let lasers = [];          // プレイヤーのレーザー
let homingLasers = [];        // プレイヤーのホーミングミサイル
let crystals = [];        // スコアアイテム
let powerups = [];        // パワーアップアイテム
let wormholes = [];       // 敵出現ワームホール

let gridPoints = [];      // 背景グリッド
let stars = [];           // 背景の星
let nebulae = [];         // 星雲
let starClusters = [];    // 星団

const createEnemy = () => ({
    active: false,

    spawnId: -1,        // このオブジェクト自身の現在のID
    leaderSpawnId: -1,  // 追従しているリーダーのID

    // 基本パラメータ
    x: 0, y: 0, vx: 0, vy: 0,
    hp: 0, maxHp: 0,
    speed: 0,
    color: '#fff',
    type: '',
    variant: null,
    size: 1,      // ★追加: asteroid/bubbleの大中小
    angle: 0,
    scale: 1,
    drop: 'none',

    // 状態フラグ
    isDead: false,
    isDying: false,
    dyingTimer: 0,
    inActiveRange: false,
    isLeader: false,  // ★追加: 編隊のリーダー判定
    noDrop: false,    // ★追加: アイテムドロップ禁止フラグ
    noSplit: false,   // ★追加: 分裂禁止フラグ

    // スポーン・ワープ関連
    isWarping: false,
    warpPercent: 0,
    isSpawning: false,
    spawnTimer: 0,
    spawnMax: 0,
    spawnX: 0,
    spawnY: 0,

    // タイマー・カウンター
    fireTimer: 0,
    flashTimer: 0,
    actionTimer: 0,
    timer: 0,
    aliveTimer: 0,
    burstCount: 0,

    // 回転・描画
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    rotSpeed: 0,
    rotSpd: 0,
    drawAngle: 0,

    // 演出・AI
    alpha: 1,
    opacity: 1,
    bend: 0,
    aimRate: 0,
    chargeLevel: 0,
    canFire: true,
    state: '',
    orbitDist: 0,
    orbitDir: 1,
    trackingStart: 0,
    isTracking: false,
    hasEntered: false,
    target: null,      // ★追加: ロックオン対象の保持

    cameraLerpTimer: 0,

    // ==========================================
    // ★追加: Hidden Class最適化のための事前定義プロパティ
    // ==========================================
    gridLifeSpawnId: -1,
    gridLife: 0,
    isWarpingOut: false,
    warpOutTimer: 0,
    warpOutDuration: 0,
    prevHp: 0,
    aimProgress: 0,
    rotAngle: 0,
    prevAngle: 0,
    originalScale: 1.0,
    
    // 編隊・親子関係
    leader: null,
    followers: [],
    formOffset: { x: 0, y: 0 },
    formationType: null, // ★追加

    // 特殊な描画用配列
    segments: [],
    history: [],
    trail: []
});

const createParticle = () => ({
    x: 0, y: 0, vx: 0, vy: 0, 
    color: '#fff', life: 0, size: 1, 
    isShard: false, shardType: null, angle: 0, rotV: 0,
    isBubble: false, wobbleOffset: 0,
    segIndex: 0, vertices: null, // ★この2つを追加！
    active: false
});

const createRing = () => ({
    x: 0, y: 0, r: 0, targetR: 0, vr: 8, decay: 0.08, 
    color: '#0ff', life: 0, isBomb: false, followPlayer: false,
    lineWidth: undefined, fill: false, isIntroRing: false, // ★この3つを追加！
    active: false
});

const createEnemyBullet = () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#f00',
    isMissile: false, isLaserMissile: false, isShockwave: false,
    isFading: false, baseAlpha: 1, alpha: 1, // フェード演出用
    homingTimer: 0, trail: null,             // ミサイル用
    baseScale: 1, scaleSpeed: 0.02,          // 衝撃波用
    active: false
});

const createPlayerBullet = () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0,
    active: false
});

const createScorePopup = () => ({
    x: 0, y: 0, vy: 0, text: '', life: 0, alpha: 1, 
    isBoss: false, active: false, color: '#ffffff' 
});

const enemyPool = new ObjectPool(createEnemy, 400, 520);
const particlePool = new ObjectPool(createParticle, 1500, 2400);
const ringPool = new ObjectPool(createRing, 100, 140);
const enemyBulletPool = new ObjectPool(createEnemyBullet, 500, 700);
const playerBulletPool = new ObjectPool(createPlayerBullet, 100, 140);
const scorePopupPool = new ObjectPool(createScorePopup, 50, 80);

// オブジェクトを受け取るヘルパー関数
function spawnParticleObj(options) {
    const p = particlePool.get();
    if (!p) return null;
    
    // 必須系の値（無い場合はデフォルト値を入れる安全設計）
    p.x = options.x || 0;
    p.y = options.y || 0;
    p.vx = options.vx || 0;
    p.vy = options.vy || 0;
    p.color = options.color || '#fff';
    p.life = options.life || 0.5;
    p.size = options.size || 1;

    // 特殊フラグ系（渡されていればその値、なければfalseや0でリセット）
    p.isShard = options.isShard || false;
    p.shardType = options.shardType || null;
    p.angle = options.angle || 0;
    p.rotV = options.rotV || 0;
    p.segIndex = options.segIndex || 0;
    p.isBubble = options.isBubble || false;
    p.wobbleOffset = options.wobbleOffset || 0;
    p.vertices = options.vertices || null;

    return p;
}

function spawnRingObj(options) {
    const r = ringPool.get();
    if (!r) return null;
    
    r.x = options.x || 0;
    r.y = options.y || 0;
    r.r = options.r || 0;
    r.color = options.color || '#0ff';
    r.life = options.life || 1.0;

    r.targetR = options.targetR || 0;
    r.vr = options.vr !== undefined ? options.vr : 8;       
    r.decay = options.decay !== undefined ? options.decay : 0.08;
    r.isBomb = options.isBomb || false;
    r.followPlayer = options.followPlayer || false;

    // ★以下を追加！渡されなかった場合はデフォルト値にリセット
    r.lineWidth = options.lineWidth !== undefined ? options.lineWidth : undefined;
    r.fill = options.fill || false;
    r.isIntroRing = options.isIntroRing || false;

    return r;
}

function spawnEnemyBulletObj(options) {
    const eb = enemyBulletPool.get();
    if (!eb) return null;
    
    // 基本パラメータ
    eb.x = options.x || 0;
    eb.y = options.y || 0;
    eb.vx = options.vx || 0;
    eb.vy = options.vy || 0;
    eb.life = options.life || 0;
    eb.color = options.color || '#f00';

    // 特殊フラグ（渡されていない場合は必ずデフォルトに戻す）
    eb.isMissile = options.isMissile || false;
    eb.isLaserMissile = options.isLaserMissile || false;
    eb.isShockwave = options.isShockwave || false;
    
    // 演出・状態用パラメータのリセット
    eb.isFading = false;
    eb.baseAlpha = 1.0;
    eb.alpha = 1.0;
    eb.homingTimer = options.homingTimer || 240;
    if (eb.isMissile) {
        if (!eb.trail) eb.trail = []; // 最初だけ作る
        eb.trail.length = 0;          // 中身だけリセットして再利用！
    } else {
        eb.trail = null;
    }
    eb.baseScale = options.baseScale || 1.0;
    eb.scaleSpeed = options.scaleSpeed || 0.02;

    return eb;
}

function spawnPlayerBulletObj(options) {
    const b = playerBulletPool.get();
    if (!b) return null;
    
    b.x = options.x || 0;
    b.y = options.y || 0;
    b.vx = options.vx || 0;
    b.vy = options.vy || 0;
    b.life = options.life || 0;

    return b;
}

function spawnScorePopupObj(options) {
    const s = scorePopupPool.get();
    if (!s) return null;

    s.x = options.x || 0;
    s.y = options.y || 0;
    s.vy = options.vy !== undefined ? options.vy : -1;
    s.text = options.text || '';
    s.life = options.life || 60;
    s.alpha = options.alpha !== undefined ? options.alpha : 1;
    s.isBoss = options.isBoss || false;
    
    // ★ 追加: オプションから色を受け取る（指定がなければ白）
    s.color = options.color || '#ffffff'; 
    
    return s;
}

function spawnEnemyObj(options) {
    const e = enemyPool.get();
    if (!e) return null; // プールが空の場合の安全策
    
    e.spawnId = globalEnemySpawnCounter++; 
    
    // --- リーダー情報の同期 ---
    e.leader = options.leader || null;
    // リーダーがいるなら、そのリーダーの「現在のID」をメモしておく
    e.leaderSpawnId = e.leader ? e.leader.spawnId : -1;

    // --- 1. 生存・状態フラグの完全リセット ---
    e.active = true;
    e.isDead = false;
    e.isDying = false;
    e.dyingTimer = 0;
    e.isWarping = options.isWarping !== undefined ? options.isWarping : false;
    e.warpPercent = 0;
    e.isSpawning = options.isSpawning !== undefined ? options.isSpawning : false;
    
    // --- 2. 特殊判定フラグのリセット（★重要） ---
    // 前回の敵がリーダーだったり、アイテムドロップ禁止だったりした情報を消去する
    e.isLeader = options.isLeader || false; 
    e.noDrop = options.noDrop || false;
    e.noSplit = options.noSplit || false;

    // --- 3. 基本パラメータ ---
    e.x = options.x || 0;
    e.y = options.y || 0;
    e.vx = options.vx || 0;
    e.vy = options.vy || 0;
    e.hp = options.hp || 1;
    e.maxHp = options.maxHp || e.hp;
    e.speed = options.speed || 0;
    e.color = options.color || '#fff';
    e.type = options.type || '';
    e.variant = options.variant || null;
    
    // ★サイズのリセット：指定がなければ 1 (大) をデフォルトにする
    e.size = options.size !== undefined ? options.size : 1; 
    
    e.angle = options.angle || 0;
    e.scale = options.scale !== undefined ? options.scale : 1;
    e.drop = options.drop || 'none';

    // --- 4. タイマー・ステート系 ---
    e.fireTimer = 0;
    e.flashTimer = 0;
    e.actionTimer = options.actionTimer || 0;
    e.timer = options.timer || 0;
    e.aliveTimer = 0;
    e.spawnTimer = options.spawnTimer || 0;
    e.spawnMax = options.spawnMax || 0;
    e.state = options.state || '';
    e.burstCount = options.burstCount || 0;
    e.aimRate = 0;
    e.chargeLevel = options.chargeLevel || 0;
    e.canFire = options.canFire !== undefined ? options.canFire : true;
    e.alpha = options.alpha !== undefined ? options.alpha : 1;
    e.opacity = 1;
    e.bend = options.bend || 0;
    
    // ボス用カメラタイマーもリセット
    e.cameraLerpTimer = 0;

    // --- 5. 演出・回転系 ---
    e.rotX = options.rotX || 0;
    e.rotY = options.rotY || 0;
    e.rotZ = options.rotZ || 0;
    e.rotSpeed = options.rotSpeed || 0;
    e.rotSpd = options.rotSpd || 0;

    // --- 6. AI・ターゲット系 ---
    e.orbitDist = options.orbitDist || 0;
    e.orbitDir = options.orbitDir || 1;
    e.trackingStart = options.trackingStart || 0;
    e.isTracking = options.isTracking || false;
    e.target = null; // ★前回のロックオン対象をリセット
    e.hasEntered = false;
    e.inActiveRange = false;
    
    // --- 7. 編隊用 ---
    e.leader = options.leader || null;
    e.followers = options.followers || [];
    e.formOffset = options.formOffset || { x: 0, y: 0 };
    e.formationType = options.formationType || null;

    // --- 8. 配列のリセット（メモリ節約のため長さを0にする） ---
    if (!e.segments) e.segments = [];
    e.segments.length = 0;
    if (!e.history) e.history = [];
    e.history.length = 0;
    if (!e.trail) e.trail = [];
    e.trail.length = 0;

    if (e && typeof window.playStats !== 'undefined') {
        window.playStats.enemiesSpawned++;
    }
    
    return e;
}

// =========================================================
// 5. ボス（BOSS）管理変数
// =========================================================

let isBossSpawned = false;           // 出現済みフラグ
let isBossWarning = false;           // 警告演出中フラグ
let warningTimer = 0;                // 警告演出タイマー
let stageMessageTimer = 0;           // ステージ開始メッセージ用
let nextBossSpawnX = 0;              // 出現予定座標X
let nextBossSpawnY = 0;              // 出現予定座標Y
let bossAngerMinionSpeedMag = 1.0;   // 怒り状態の敵速度補正
let isBossRageWarningVisible = false;

let levelItemsDroppedInStage = 0;    // ステージ内でのレベルアイテムドロップ数

// =========================================================
// 6. DOM要素・UI参照
// =========================================================

const canvas = document.getElementById('game');
// alpha: false (背景が透明でないことをブラウザに教え、合成コストを下げる)
// desynchronized: true (低遅延レンダリングを許可し、GPUパイプラインを最適化)
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const miniMapCanvas = document.getElementById('minimap-canvas');
const miniMapCtx = miniMapCanvas.getContext('2d');

const ui = {
    titleOverlay: document.getElementById('title-overlay'),
    gameoverOverlay: document.getElementById('gameover-overlay'),
    titleText: document.querySelector('#title-overlay h1'),
    pauseOverlay: document.getElementById('pause-overlay'),
    howtoOverlay: document.getElementById('howto-overlay'),

    ostOverlay: document.getElementById('ost-overlay'),
    nameInputArea: document.getElementById("name-input-area"),
    score: document.getElementById('score-display'),
    stage: document.getElementById('stage-num'),
    weaponDisplay: document.getElementById('weapon-display'),
    shieldBar: document.getElementById('shield-bar'),
    shieldVal: document.getElementById('shield-val'),
    enemyBar: document.getElementById('enemy-bar'),
    invulnWrapper: document.getElementById('invuln-wrapper'),
    invulnBar: document.getElementById('invuln-bar'),
    bossContainer: document.getElementById('boss-ui-container'),
    bossNameLabel: document.getElementById('boss-name-label'),
    bossBarFrame: document.getElementById('boss-bar-frame'),
    bossHpBarInline: document.getElementById('boss-hp-bar-inline'),
    controls: document.getElementById('controls'),
    pauseBtn: document.getElementById('pause-btn'),
    launchBtn: document.getElementById('launch-btn'),
    knobL: document.getElementById('knob-left'),
    knobR: document.getElementById('knob-right'),
    stickL: document.getElementById('stick-left'),
    stickR: document.getElementById('stick-right'),
    btnStart: document.getElementById('btn-start'),
    btnExtremeTa: document.getElementById('btn-extreme-ta'),
    btnTitle: document.getElementById('btn-title'),
    btnBackTitle: document.getElementById('btn-back-to-title'),
    btnNextResult: document.getElementById('btn-next-result'),
    submitBtn: document.getElementById("submit-score-btn"),
    skipScoreBtn: document.getElementById("skip-score-btn"),
    nameInput: document.getElementById("player-name-input"),

    btnOst: document.getElementById('btn-ost'),
    btnHowto: document.getElementById('btn-howto'),
    btnStory: document.getElementById('btn-story'),
    btnRanking: document.getElementById('btn-ranking'),
    btnSettings: document.getElementById('btn-settings'),
};

let currentMenuButtons = [];
let selectedMenuIndex = 0;

// =========================================================
// 7. UI選択状態管理 (Gamepad / Keyboard Menu Control)
// =========================================================

/**
 * 現在の画面状態に合わせてアクティブなメニューボタンを取得する
 */
window.refreshMenuButtons = function (resetIndex = true) {
    currentMenuButtons = [];
    if (resetIndex) selectedMenuIndex = 0;

    const rOverlay = document.getElementById("ranking-overlay");
    const cBtn = document.getElementById("close-ranking-btn");

    if (rOverlay && rOverlay.style.display === 'flex') {
        currentMenuButtons = [cBtn];
    } else if (gameState === 'PAUSED') {
        document.querySelectorAll('#pause-overlay .menu-btn').forEach(btn => currentMenuButtons.push(btn));
    } else if (ui.nameInputArea.style.display === 'flex') {
        document.querySelectorAll('#name-input-area .menu-btn').forEach(btn => {
            if (window.getComputedStyle(btn).display !== 'none') currentMenuButtons.push(btn);
        });
    } else if (gameState === 'TITLE' || gameState === 'GAMEOVER_UI') {
        document.querySelectorAll('#title-overlay .menu-btn').forEach(btn => {
            if (window.getComputedStyle(btn).display !== 'none') currentMenuButtons.push(btn);
        });
    } else if (gameState === 'OST') {
        document.querySelectorAll('#ost-overlay .track-item, #ost-overlay .menu-btn').forEach(btn => currentMenuButtons.push(btn));
    } else if (gameState === 'STORY') {
        const backBtn = document.getElementById('btn-story-back');
        if (backBtn) currentMenuButtons.push(backBtn);
    } else if (gameState === 'HOWTO') {
        document.querySelectorAll('#howto-overlay .menu-btn').forEach(btn => currentMenuButtons.push(btn));
    } else if (gameState === 'SETTINGS') {
        document.querySelectorAll('#settings-overlay .menu-btn').forEach(btn => currentMenuButtons.push(btn));
    } else if (gameState === 'ENDING') {
        document.querySelectorAll('#ending-msg .menu-btn').forEach(btn => currentMenuButtons.push(btn));
    }

    window.updateMenuSelectionUI();
};

/**
 * 取得したメニューボタンのUI上のフォーカス状態を描画・スクロールする
 */
window.updateMenuSelectionUI = function () {
    document.querySelectorAll('.menu-btn.selected, .track-item.selected').forEach(el => el.classList.remove('selected'));

    if (currentMenuButtons.length > 0) {
        selectedMenuIndex = Math.max(0, Math.min(selectedMenuIndex, currentMenuButtons.length - 1));
        const activeBtn = currentMenuButtons[selectedMenuIndex];
        if (activeBtn) {
            activeBtn.classList.add('selected');
            activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
};

// =========================================================
// 8. 初期化・システム制御 (Initialization & System)
// =========================================================

/**
 * アプリケーションの初期化
 */
function init() {

    resetExtremeTimeAttackState();


    // 1. 【最優先】最初に解像度・画面サイズを設定する！
    //resize();

    // 2. その後で、保存された画質設定を読み込んで星などを生成する
    const savedQuality = localStorage.getItem('neonGravity_graphics') || 'ULTRA';
    applyGraphicsQuality(savedQuality);

    applyLanguage(currentLanguage);

    if (typeof AudioSys !== 'undefined') {
        // ページ読み込み時の自動初期化をやめ、ユーザーの初回操作時に初期化・ロック解除を行う
        const initAudioOnFirstInteract = () => {
            if (!AudioSys.ctx) {
                AudioSys.init();
                // 非同期関数を避け、同期的にAudioContextのロック解除を強制実行
                if (AudioSys.ctx && AudioSys.ctx.state !== "running") {
                    AudioSys.ctx.resume().catch(() => {});
                }
                AudioSys._unlockAudio();
            }
            // 一度実行されたらイベントリスナーを削除（メモリ節約）
            window.removeEventListener('mousedown', initAudioOnFirstInteract);
            window.removeEventListener('touchstart', initAudioOnFirstInteract);
            window.removeEventListener('keydown', initAudioOnFirstInteract);
        };

        window.addEventListener('mousedown', initAudioOnFirstInteract, { once: true, passive: true });
        window.addEventListener('touchstart', initAudioOnFirstInteract, { once: true, passive: true });
        window.addEventListener('keydown', initAudioOnFirstInteract, { once: true, passive: true });
    }

    // PCリサイズ
    window.addEventListener('resize', resize);

    // スマホ回転対応
    window.addEventListener('orientationchange', resize);

    if (typeof initInputHandlers === 'function') {
        initInputHandlers();
    }

    const verEl = document.getElementById('version-num');
    if (verEl) {
        verEl.innerText = "Version " + GAME_VERSION;
    }
}

/**
 * グラフィック品質を適用し、保存する
 */
function applyGraphicsQuality(quality) {
    if (!GRAPHICS_SETTINGS[quality]) return;

    currentGraphicsQuality = quality;
    const config = GRAPHICS_SETTINGS[quality];

    // 変数への適用
    GRID_SPACING = config.gridSpacing;
    EXPLOSION_COUNT_MAG = config.explosionMag;

    // グローバルに星の数と星雲の数を保存（effect_system.js 用）
    window.currentStarCount = config.starCount;
    window.currentNebulaeCount = config.nebulaeCount;

    resize();

    // 背景システムの再初期化（画面サイズ変更時と同じ処理）
    if (typeof initGrid === 'function') initGrid();
    if (typeof initStars === 'function') initStars();
    if (typeof initNebulae === 'function') initNebulae();

    // ローカルストレージに保存
    localStorage.setItem('neonGravity_graphics', quality);

    // UIの表示状態を更新
    setQuality(quality);

    // 画質変更時はアイテム系の見た目が変わるため、関連テクスチャを再生成しておく
    // 起動直後の初回適用だけは、重いアステロイド群も含めて先に温める
    if (typeof prewarmTextureCaches === 'function') {
        const isFirstPrewarm = !window._didInitialTexturePrewarm;
        prewarmTextureCaches({ includeAsteroids: isFirstPrewarm });
        if (isFirstPrewarm) window._didInitialTexturePrewarm = true;
    }
}

// 言語品質設定の適用と保存
window.applyLanguage = function(lang) {
    currentLanguage = lang;
    localStorage.setItem('neonGravity_language', lang);
    
    // UIの表示状態を更新
    const btnEn = document.getElementById('btn-lang-en');
    const btnJa = document.getElementById('btn-lang-ja');

    if(btnEn) btnEn.classList.remove('active-setting');
    if(btnJa) btnJa.classList.remove('active-setting');

    if(lang === 'en' && btnEn) btnEn.classList.add('active-setting');
    if(lang === 'ja' && btnJa) btnJa.classList.add('active-setting');

};

function setQuality(quality) {
    currentGraphicsQuality = quality; // config.js の変数を更新
    
    // UIの表示状態を更新
    // ★追加：ULTRAボタンの取得
    const btnUltra = document.getElementById('btn-gfx-ultra'); 
    const btnHigh = document.getElementById('btn-gfx-high');
    const btnMed = document.getElementById('btn-gfx-medium');
    const btnLow = document.getElementById('btn-gfx-low');

    // 一度すべてのボタンからクラスを外す
    // ★追加：ULTRAボタンのクラス解除
    if(btnUltra) btnUltra.classList.remove('active-setting'); 
    if(btnHigh) btnHigh.classList.remove('active-setting');
    if(btnMed)  btnMed.classList.remove('active-setting');
    if(btnLow)  btnLow.classList.remove('active-setting');

    // 選ばれているものだけにクラスを付与する
    // ★追加：ULTRAが選ばれた時の処理
    if(quality === 'ULTRA' && btnUltra) btnUltra.classList.add('active-setting'); 
    if(quality === 'HIGH' && btnHigh) btnHigh.classList.add('active-setting');
    if(quality === 'MEDIUM' && btnMed) btnMed.classList.add('active-setting');
    if(quality === 'LOW' && btnLow) btnLow.classList.add('active-setting');
}

// グラフィックス品質を順番に切り替える関数
function toggleGraphicsQuality() {
    const qualities = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW'];
    let currentIndex = qualities.indexOf(currentGraphicsQuality);
    
    // 現在の品質が配列に見つからない場合（異常値の場合）はULTRAを基準にする
    if (currentIndex === -1) currentIndex = 0;
    
    let nextIndex = (currentIndex + 1) % qualities.length;
    const nextQuality = qualities[nextIndex];
    
    // ★修正：変数を直接いじらず、applyGraphicsQuality を呼び出す！
    // これにより resize() や initGrid()、保存処理などが全て完璧に実行されます。
    if (typeof applyGraphicsQuality === 'function') {
        applyGraphicsQuality(nextQuality);
    }
    
    // UIメッセージを表示してプレイヤーに知らせる
    if (typeof showGameMessage === 'function') {
        showGameMessage({
            main: `QUALITY: ${nextQuality}`,
            type: 'compact',
            duration: 1000
        });
    }
    
    console.log(`Graphics quality changed to: ${nextQuality}`);
}

let currentResolution = {
    key: "PC_L",
    width: 1920,
    height: 1080,
    uiScale: 1.0
};

function detectResolution(screenW, screenH) {
    const ratio = screenW / screenH;
    const isPortrait = screenH > screenW;

    const longSide = Math.max(screenW, screenH);
    const shortSide = Math.min(screenW, screenH);

    // ----------------------------------------------------
    // 1. PC / iPad / 大画面モニター (短辺が十分大きい)
    // ----------------------------------------------------
    if (shortSide >= 768) {
        // 短辺に応じてUIスケールを動的に計算 (1.0〜最大1.6)
        let calculatedUiScale = (shortSide / 768) * 1.3; 
        calculatedUiScale = Math.min(calculatedUiScale, 1.6);

        // 横画面 (Landscape) の場合
        if (!isPortrait) {
            // 超大画面の制限
            if (longSide > 1920) {
                return {
                    key: "FHD_CAPPED",
                    width: 1920,
                    height: Math.floor(1920 / ratio),
                    uiScale: 1.0 
                };
            }
            return {
                key: "PC_L",
                width: screenW,
                height: screenH,
                uiScale: calculatedUiScale 
            };
        } 
        // 縦画面 (Portrait) の場合 (PC_P を追加)
        else {
            // 縦長の場合も、長辺が大きすぎる場合の制限を設ける（必要に応じて）
            if (longSide > 1920) {
                return {
                    key: "FHD_CAPPED_P", // 縦用のキャップキー
                    width: Math.floor(1920 * ratio),
                    height: 1920,
                    uiScale: 1.0
                };
            }
            return {
                key: "PC_P",
                width: screenW,
                height: screenH,
                uiScale: calculatedUiScale
            };
        }
    }

    // ----------------------------------------------------
    // 2. 超小型画面 (VGA相当のウィンドウや古いスマホ)
    // ----------------------------------------------------
    if (longSide <= 800) {
        return {
            key: isPortrait ? "VGA_P" : "VGA_L",
            width: screenW,
            height: screenH,
            uiScale: 0.6 
        };
    }

    // ----------------------------------------------------
    // 3. 一般的なスマホ / タブレット
    // ----------------------------------------------------
    const MAX_MOBILE_LONG_SIDE = 1200;
    let scale = 1.0;
    
    if (longSide > MAX_MOBILE_LONG_SIDE) {
        scale = MAX_MOBILE_LONG_SIDE / longSide;
    }

    return {
        key: isPortrait ? "MOBILE_P" : "MOBILE_L",
        width: Math.floor(screenW * scale),
        height: Math.floor(screenH * scale),
        uiScale: isPortrait ? 0.82 : 0.78
    };
}

/**
 * 画面リサイズ時のキャンバスサイズ計算とUIスケール調整
 */
function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    currentResolution = detectResolution(vw, vh);

    const qualityScale = GRAPHICS_SETTINGS[currentGraphicsQuality]?.resScale || 1.0;

    width = canvas.width = Math.floor(currentResolution.width * qualityScale);
    height = canvas.height = Math.floor(currentResolution.height * qualityScale);

    const scale = Math.min(vw / currentResolution.width, vh / currentResolution.height);
    const displayW = Math.round(currentResolution.width * scale);
    const displayH = Math.round(currentResolution.height * scale);

    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    canvas.style.position = 'absolute';
    canvas.style.left = `${Math.floor((vw - displayW) / 2)}px`;
    canvas.style.top = `${Math.floor((vh - displayH) / 2)}px`;

    // ==========================================
    // アプリ全体スケール (baseAppScale)
    // ==========================================
    const maxDim = Math.max(width, height);
    baseAppScale = maxDim / REFERENCE_SIZE;

    const isPortrait = vh > vw;
    
    // プレイ画面のズームサイズ調整
    if (isPortrait) {
        baseAppScale *= 1.3;
    } else {
        // ★修正: 大画面(FHD_CAPPED, PC_L)とスマホ(MOBILE_L等)でズーム倍率を分ける
        if (currentResolution.key === "FHD_CAPPED") {
            baseAppScale *= 0.75; 
        } else if (currentResolution.key === "PC_L") {
            baseAppScale *= 1.2; 
        } else {
            // スマホの横画面などは迫力を出すために1.2倍のまま
            baseAppScale *= 1.2;
        }
    }

    // ==========================================
    // UIスケールとHUDスケール
    // ==========================================
    globalUiScale = currentResolution.uiScale;
    document.documentElement.style.setProperty('--ui-scale', globalUiScale);

    let hudScale = 1.0;

    // ★修正: 指定された6つのキーに基づいてHUDスケールを割り当て
    if (currentResolution.key === "VGA_L" || currentResolution.key === "VGA_P") {
        // VGAサイズ（超小型）の場合はHUDを少し小さくする
        hudScale = 0.9;
    } else if (currentResolution.key === "MOBILE_P") {
        // 縦持ちスマホ
        hudScale = 0.9;
    } else {
        // 横画面系（FHD_CAPPED, PC_L, MOBILE_L）はUIスケールに連動させる
        hudScale = globalUiScale; 
    }

    document.documentElement.style.setProperty('--hud-scale', hudScale);

    // stage / warning メッセージだけ必要ならスケール
    const scaleElements = [
        document.getElementById('stage-msg'),
        document.getElementById('warning-msg')
    ];

    scaleElements.forEach(el => {
        if (!el) return;
        el.style.transformOrigin = 'center center';
        el.style.transform = `scale(${globalUiScale})`;
    });

    // 必要なら再初期化
    if (typeof initGrid === 'function') initGrid();
    if (typeof initStars === 'function') initStars();

    if (typeof initNebulae === 'function') {
        if (gameState === 'ENDING' || gameState === 'ENDING_STORY') {
            initNebulae('#00ccff');
        } else if (['TITLE', 'HOWTO', 'RANKING', 'OST', 'STORY', 'GAMEOVER_UI'].includes(gameState)) {
            initNebulae('#00bbff');
        } else {
            initNebulae();
        }
    }
}

// =========================================================
// 9. メインループ・ロジック更新 (Game Loop)
// =========================================================

/**
 * メインフレームループ
 */
function loop() {

    const loopStartTime = performance.now();
    
    requestAnimationFrame(loop);

    if (typeof handleGamepadInput === 'function') handleGamepadInput();

    if (gameState === 'PAUSED') return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    if (gameState === 'PLAYING') {
        update();
        draw();
    } else if (gameState === 'STAGE_INTRO') {
        if (typeof updateIntro === 'function') updateIntro();
        if (introPhase < 3) {
            if (typeof updateParticlesAndRings === 'function') updateParticlesAndRings();
            if (typeof updateGrid === 'function') updateGrid();
        } else {
            update();
        }
        if (typeof drawIntro === 'function') drawIntro();
    } else if (gameState === 'DYING') {
        if (typeof updateDying === 'function') updateDying();
        draw();

    } else if (gameState === 'TITLE' || 
        gameState === 'OST' || 
        gameState === 'HOWTO' || 
        gameState === 'RANKING'|| 
        gameState === 'STORY' || 
        gameState === 'SETTINGS') {
        introBgSpeed = 2;
        introBgScroll += introBgSpeed * gameSpeed;

        drawTitleBackground();

        if (typeof updateParticlesAndRings === 'function') {
            updateParticlesAndRings();
        }

        return;
    } else if (['GAMEOVER_UI', 'ENDING', 'ENDING_STORY'].includes(gameState)) {
        introBgSpeed = 2;
        introBgScroll += introBgSpeed * gameSpeed;

        if (gameState === 'ENDING' || gameState === 'ENDING_STORY') {
            introTimer++;
        }

        if (typeof updateParticlesAndRings === 'function') updateParticlesAndRings();
        if (typeof updateScorePopups === 'function') updateScorePopups();
        if (typeof drawEndingBackground === 'function') drawEndingBackground();
    } else {
        draw();
    }

    // =========================================================
    // フェードアウトのタイミングを「ワープアウト中」に変更！
    // ==========================================
    // 'PLAYING' も条件に追加し、ワープ中に黒い幕を描けるようにします
    if (['PLAYING', 
        'DYING', 
        'ENDING', 
        'ENDING_STORY', 
        'GAMEOVER_UI', 
        'TITLE', 
        'HOWTO', 
        'RANKING',
        'STORY',
        'SETTINGS'].includes(gameState)) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over'; // 加算合成をリセット

        let fade = 0.0;

        if (gameState === 'DYING') {
            fade = Math.max(0, (60 - dyingTimer) / 60);
            fade = Math.min(0.7, fade);
        }
        // ★ここが超重要！ワープ演出の後半(90フレーム目)から、1秒(60フレーム)かけて真っ黒にする
        else if (gameState === 'PLAYING' && isWarpingOut && player.warpTimer > 90) {
            fade = Math.min(1.0, (player.warpTimer - 90) / 60);
        }
        else if (gameState === 'ENDING') {
            // ワープが終わってENDINGに入った瞬間から「1.5秒の真っ暗な静寂」
            fade = 1.0;
        }
        else if (gameState === 'ENDING_STORY') {
            // 真っ黒(1.0)から、星がうっすら見える(0.7)まで2秒かけてフェードイン
            const fadeProgress = Math.min(1.0, introTimer / 120);
            fade = 1.0 - (fadeProgress * 1);
        }
        else if (gameState === 'GAMEOVER_UI') {
            fade = 0.7;
        }

        if (fade > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    if (typeof drawBossWarningEffect === 'function') drawBossWarningEffect();

    debugTotalTime = performance.now() - loopStartTime;
}

/**
 * ゲームロジック全体の更新
 */
function update() {
    if (gameState === 'PAUSED') return;

    if (typeof updateExtremeTimeAttack === 'function') {
        updateExtremeTimeAttack();
    }

    if (spawnWaitTimer > 0) {
        spawnWaitTimer--;
    }

    // ステージクリア後の待機シーケンス
    if (isStageClear && !isWarpingOut) {
        stageClearTimer++;

        // 1. 通常ステージ：約2.5秒（150フレーム）経過で成績ボード表示
        if (stage !== MAX_STAGE && stageClearTimer === 150) {
            if (typeof window.showStageResultBoard === 'function') window.showStageResultBoard();
        }

        // 2. 全クリア（最終ステージ）：約3.5秒（210フレーム）経過で総合成績ボード表示
        if (stage === MAX_STAGE && stageClearTimer === 210) {
            if (typeof window.showFinalResultBoard === 'function') {
                window.showFinalResultBoard();
            } else if (typeof showStageResultBoard === 'function') {
                showStageResultBoard();
            }
        }
        
        // 3. 全クリア（最終ステージ）：約8秒（480フレーム）経過でスコアテキスト表示
        if (stage === MAX_STAGE && stageClearTimer === 480) {
            const scoreSpan = document.getElementById("clear-score-text");
            if (scoreSpan) {
                scoreSpan.style.transition = "opacity 3s ease-in";
                scoreSpan.style.opacity = "1";
            }
        }

        // ワープアウト開始までの待ち時間（通常400フレーム=約6.7秒、全クリア900フレーム=約15秒）
        const waitTime = (stage === MAX_STAGE) ? 900 : 400; 

        if (stageClearTimer === waitTime) {
            hideGameMessage();   // メッセージフェードアウト

            isWarpingOut = true;
            player.warpSoundPlayed = false;
            player.warpTimer = 0;

            if (stage === MAX_STAGE) window.isFireworksActive = false;
        }
    }   

    // 脱出ワープ演出中 (排他制御)
    if (isWarpingOut) {
        if (typeof updateWarpProcess === 'function') updateWarpProcess();
        return;
    }

    // 通常ロジックの更新
    if (isTrainingMode && typeof updateTraining === 'function') updateTraining();
    if (typeof updateMessageAndBossWarning === 'function') updateMessageAndBossWarning();
    if (typeof handleGlobalStateUpdates === 'function') handleGlobalStateUpdates();
    if (typeof updatePlayerMovement === 'function') updatePlayerMovement();
    if (typeof updateSpawnLogic === 'function') updateSpawnLogic();
    if (typeof updateWormholes === 'function') updateWormholes();

    // ==========================================
    // ★時間の計測スタート
    // ==========================================
    const startTime = performance.now();

    updateEntities(); // 敵や弾の移動、当たり判定など（一番重い処理）
    
    if (typeof updateGrid === 'function') updateGrid();
    if (typeof checkStageClear === 'function') checkStageClear();

    // ★計測終了し、かかった時間(ミリ秒)を記録
    debugLogicTime = performance.now() - startTime;
    // ==========================================

    if (typeof updateScorePopups === 'function') updateScorePopups();
    if (typeof checkStageClear === 'function') checkStageClear();
    if (typeof updateCamera === 'function') updateCamera();
    if (typeof updateUI === 'function') updateUI();

    updateDebugStats();

    updateDebugOverlay();
}

/**
 * 各種エンティティの更新呼び出し
 */
function updateEntities() {
    if (typeof updatePlayerBullets === 'function') updatePlayerBullets();
    if (typeof updateLasers === 'function') updateLasers();
    if (typeof updateEnemies === 'function') updateEnemies();
    if (typeof updateEnemyBullets === 'function') updateEnemyBullets();
    if (typeof updateCrystals === 'function') updateCrystals();
    if (typeof updatePowerups === 'function') updatePowerups();
    if (typeof updateHomingLasers === 'function') updateHomingLasers();
    if (typeof updateParticlesAndRings === 'function') updateParticlesAndRings();
    if (typeof updatePlayerStatus === 'function') updatePlayerStatus();
}

function updateDebugStats() {
    if (!DEBUG.enabled) return;

    debugFrameCounter++;
    const now = performance.now();
    const elapsed = now - debugLastFpsTime;

    if (elapsed >= 1000) {
        debugFps = Math.round((debugFrameCounter * 1000) / elapsed);
        debugFrameCounter = 0;
        debugLastFpsTime = now;
        
        const fpsEl = document.getElementById('simple-fps-text');
        if (fpsEl && fpsEl.style.opacity === '1') {
            
            // 各ステータスの取得
            const resKey = typeof currentResolution !== 'undefined' ? currentResolution.key : "UNKNOWN";
            const resScaleVal = (typeof currentGraphicsQuality !== 'undefined' && typeof GRAPHICS_SETTINGS !== 'undefined' && GRAPHICS_SETTINGS[currentGraphicsQuality]) 
                              ? GRAPHICS_SETTINGS[currentGraphicsQuality].resScale 
                              : 1.0;
            const appScaleVal = typeof baseAppScale !== 'undefined' ? baseAppScale : 1.0;
            
            // HUDスケールの取得
            let hudScaleStr = document.documentElement.style.getPropertyValue('--hud-scale');
            if (!hudScaleStr) hudScaleStr = "1.0"; 
            else hudScaleStr = parseFloat(hudScaleStr).toFixed(2); 
            
            // ==========================================
            // ★変更：loop()全体の時間からCPU使用率を計算
            // ==========================================
            const totalTime = typeof debugTotalTime !== 'undefined' ? debugTotalTime : 0;
            // 60FPS(16.666ms)に対する使用率
            const cpuUsage = Math.round((totalTime / 16.666) * 100);
            
            fpsEl.innerText = `FPS: ${debugFps} (CPU: ${cpuUsage}%)\nKEY: ${resKey}\nHUD: ${hudScaleStr} RES: ${typeof resScaleVal === 'number' ? resScaleVal.toFixed(2) : resScaleVal} APP: ${typeof appScaleVal === 'number' ? appScaleVal.toFixed(2) : appScaleVal}`;
        }
    }
}

function updateDebugOverlay() {
    const el = document.getElementById("debugOverlay");

    if (!el) return;

    // タイトルでは表示しない
    if (gameState === 'TITLE') {
        el.style.display = "none";
        return;
    }
    
    if (!DEBUG.enabled || !DEBUG.showOverlay) {
        el.style.display = "none";
        return;
    }

    el.style.display = "block";

    const enemyCount = enemyPool.getActiveCount();
    const bulletCount = playerBulletPool.getActiveCount();
    const enemyBulletCount = enemyBulletPool.getActiveCount();
    const crystalCount = Array.isArray(crystals) ? crystals.length : 0;
    const powerupCount = Array.isArray(powerups) ? powerups.length : 0;
    const missileCount = Array.isArray(homingLasers) ? homingLasers.length : 0;

    const particleCount = typeof particlePool !== 'undefined' ? particlePool.getActiveCount() : 0;
    const ringCount = typeof ringPool !== 'undefined' ? ringPool.getActiveCount() : 0;
    
    const wormholeCount = Array.isArray(wormholes) ? wormholes.length : 0;

    const totalObjects =
        enemyCount +
        bulletCount +
        enemyBulletCount +
        particleCount +
        crystalCount +
        powerupCount +
        missileCount +
        ringCount + 
        wormholeCount;

    const px = player ? Math.round(player.x) : 0;
    const py = player ? Math.round(player.y) : 0;
    const pinv = player?.invuln ?? 0;
    const pweapon = player?.weaponLevel ?? "-";
    const pshield = player?.shield ?? "-";

    const cx = camera ? Math.round(camera.x) : 0;
    const cy = camera ? Math.round(camera.y) : 0;

    // currentResolution が未定義の時のエラーを防ぐための安全策
    const resKey = typeof currentResolution !== 'undefined' ? currentResolution.key : "UNKNOWN";

    // ★追加: 現在の画質設定と resScale を安全に取得
    const qualityStr = typeof currentGraphicsQuality !== 'undefined' ? currentGraphicsQuality : "UNKNOWN";
    const resScaleVal = (typeof currentGraphicsQuality !== 'undefined' && typeof GRAPHICS_SETTINGS !== 'undefined' && GRAPHICS_SETTINGS[currentGraphicsQuality]) 
                      ? GRAPHICS_SETTINGS[currentGraphicsQuality].resScale 
                      : 1.0;

    // ★修正: テンプレートリテラル内に QUALITY と RES SCALE を追加
    el.textContent =
        `[DEBUG] ${GAME_VERSION}
FPS: ${debugFps}
SCENE: ${gameState}
FRAME: ${frame}
QUALITY: ${qualityStr}
RESOLUTION: ${resKey}
RES SCALE: ${typeof resScaleVal === 'number' ? resScaleVal.toFixed(2) : resScaleVal}
LOGIC TIME: ${typeof debugLogicTime !== 'undefined' ? debugLogicTime.toFixed(2) : "0.00"} ms
DRAW TIME: ${typeof debugDrawTime !== 'undefined' ? debugDrawTime.toFixed(2) : "0.00"} ms
PLAYER X: ${px} Y: ${py}
INVULN: ${pinv}
WEAPON: ${pweapon}
WEAPON POWER: ${typeof BULLET_CONFIG !== 'undefined' ? BULLET_CONFIG.PLAYER.POWER.toFixed(1) : "---"}
SHIELD: ${pshield}
CAMERA X: ${cx} Y: ${cy}
OBJECTS
ENEMIES: ${enemyCount}
PLAYER BULLETS: ${bulletCount}
ENEMY BULLETS: ${enemyBulletCount}
PARTICLES: ${particleCount}
CRYSTALS: ${crystalCount}
POWERUPS: ${powerupCount}
MISSILES: ${missileCount}
TOTAL: ${totalObjects}
FLAGS
F3 HUD: ${DEBUG.showOverlay ? "ON" : "OFF"}
F4 HITBOX: ${DEBUG.showHitboxes ? "ON" : "OFF"}
F5 TARGET: ${DEBUG.showEnemyTargetLines ? "ON" : "OFF"}
F6 SPAWN: ${DEBUG.showSpawnPoints ? "ON" : "OFF"}`;
}

// =========================================================
// 10. 描画システム (Rendering Systems)
// =========================================================

/**
 * 画面全体の描画処理
 */
function draw() {
    // ==========================================
    // ★追加：ここから描画時間の計測スタート
    // ==========================================
    const startTime = performance.now();

    ctx.save();
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-camera.x, -camera.y);

    if (typeof drawBackground === 'function') drawBackground();
    if (typeof drawWorldBounds === 'function') drawWorldBounds();
    if (typeof drawWormholes === 'function') drawWormholes();
    if (typeof drawEnemies === 'function') drawEnemies();
    if (typeof drawEnemyProjectiles === 'function') drawEnemyProjectiles();

    if (gameState === 'PLAYING') {
        if (typeof drawPlayerSystems === 'function') drawPlayerSystems();
    }

    if (typeof drawLasers === 'function') drawLasers();
    if (typeof drawPlayerBullets === 'function') drawPlayerBullets();
    if (typeof drawHomingLasers === 'function') drawHomingLasers();
    if (typeof drawItems === 'function') drawItems();
    if (typeof drawVisualEffects === 'function') drawVisualEffects();

    if (typeof drawDebugWorldOverlay === 'function') drawDebugWorldOverlay();

    // UI要素描画
    if ((gameState === 'PLAYING' || gameState === 'DYING' || gameState === 'STAGE_INTRO') && frame % 3 === 0) {
        if (typeof drawMiniMap === 'function') drawMiniMap();
    }
    if (typeof drawScorePopups === 'function') drawScorePopups();
    
    ctx.restore();

    // ==========================================
    // ★追加：計測終了し、かかった時間(ミリ秒)を記録
    // ==========================================
    debugDrawTime = performance.now() - startTime;
}

// =========================================================
// 11. iOS用インストールプロンプト制御
// =========================================================

function checkIOSInstallPrompt() {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true;
    const hasClosed = localStorage.getItem('neonGravity_install_closed');

    if (!isIOS || isStandalone || hasClosed) return;

    const isInApp = /twitter|fbav|line|instagram/.test(ua);
    const prompt = document.getElementById('ios-install-prompt');
    if (!prompt) return;

    const textDiv = prompt.querySelector('.install-text');
    const arrow = prompt.querySelector('.arrow-down');

    const lang = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language || window.navigator.userLanguage || window.navigator.browserLanguage;
    const isJa = lang && lang.startsWith('ja');

    if (isInApp) {
        if (isJa) {
            textDiv.innerHTML = `
                <span style="color:#f05; font-weight:bold;">快適にプレイするには</span><br>
                ブラウザで開いてください<br>
                <span style="font-size:12px; color:#aaa;">
                    メニューの <span class="share-icon"></span> や <span style="font-size:16px; line-height:1;">⋮</span> を押し<br>
                    <span style="color:#0ff; font-weight:bold;">「ブラウザで開く」</span>を選択してください
                </span>
            `;
        } else {
            textDiv.innerHTML = `
                <span style="color:#f05; font-weight:bold;">Best Experience</span><br>
                Please open in Safari/Chrome.<br>
                <span style="font-size:12px; color:#aaa;">
                    Tap menu and select "Open in Browser"
                </span>
            `;
        }
        if (arrow) arrow.style.display = 'none';
        prompt.style.display = 'flex';

    } else {
        const isChrome = /crios/.test(ua);

        if (isJa) {
            textDiv.innerHTML = `
                <span style="color:#0ff; font-weight:bold;">快適にプレイするには</span><br>
                <span style="font-size:12px; color:#ddd;">
                    特に横画面で遊ぶには<br>
                    <span style="color:#f05;">ホーム画面への追加</span>が必要です
                </span><br>
                <span style="font-size:11px; color:#aaa;">
                    (${isChrome ? "右上の" : "画面下の"} <span class="share-icon"></span> から追加できます)
                </span>
            `;
        } else {
            textDiv.innerHTML = `
                <span style="color:#0ff; font-weight:bold;">Fullscreen Mode</span><br>
                <span style="font-size:12px; color:#ddd;">
                    Add to Home Screen to play in<br>
                    Landscape Mode.
                </span><br>
                <span style="font-size:11px; color:#aaa;">
                    (Tap ${isChrome ? "top-right" : "bottom"} <span class="share-icon"></span> to add)
                </span>
            `;
        }

        if (isChrome && arrow) {
            arrow.innerHTML = "▲";
            arrow.style.position = "absolute";
            arrow.style.top = "-25px";
            arrow.style.bottom = "auto";
        } else if (arrow) {
            arrow.style.display = 'block';
        }
        prompt.style.display = 'flex';

        setTimeout(() => {
            if (prompt && prompt.style.display !== 'none') {
                prompt.style.display = 'none';
                localStorage.setItem('neonGravity_install_closed', 'true');
            }
        }, 5000);
    }
}

window.closeInstallPrompt = function () {
    const prompt = document.getElementById('ios-install-prompt');
    if (prompt) {
        prompt.style.display = 'none';
        localStorage.setItem('neonGravity_install_closed', 'true');
    }
};

// =========================================================
// 12. アプリケーション起動
// =========================================================

checkIOSInstallPrompt();
init();
returnToTitle();
window.refreshMenuButtons();
loop();
