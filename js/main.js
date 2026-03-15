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
let debugLastFpsTime = performance.now();

let width, height;              // 現在のキャンバスサイズ
let worldSize = 1500;           // ワールドサイズ

// --- ゲーム状態管理 ---
var gameState = 'TITLE';        // 現在の状態 ('TITLE', 'PLAYING', 'PAUSED' 等)
let previousGameState = '';     // ポーズ前の状態保存用
let stageClearTimer = 0;        // ステージクリア後の待機タイマー

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

let enemies = [];         // 敵キャラクター
let enemyBullets = [];    // 敵の弾
let bullets = [];         // プレイヤーの弾
let lasers = [];          // プレイヤーのレーザー
let missiles = [];        // プレイヤーのミサイル
let particles = [];       // パーティクル（爆発等）
let crystals = [];        // スコアアイテム
let powerups = [];        // パワーアップアイテム
let wormholes = [];       // 敵出現ワームホール
let scorePopups = [];     // スコア上昇UI
let rings = [];           // 衝撃波リング
let gridPoints = [];      // 背景グリッド
let stars = [];           // 背景の星
let nebulae = [];         // 星雲
let starClusters = [];    // 星団

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
const ctx = canvas.getContext('2d');
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

    // 最初に解像度設定
    resize();

    if (typeof AudioSys !== 'undefined') {
        AudioSys.init();
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

let currentResolution = {
    key: "FHD",
    width: 1920,
    height: 1080,
    uiScale: 1.0
};

function detectResolution(screenW, screenH) {
    const ratio = screenW / screenH;
    const isPortrait = screenH > screenW;

    // FHD以上の横長画面は最大FHDで打ち止め
    if (!isPortrait && screenW >= 1600 && ratio > 1.6 && ratio < 1.95) {
        return {
            key: "FHD",
            width: 1920,
            height: 1080,
            uiScale: 1.0
        };
    }

    // VGA横固定
    if (!isPortrait && ratio >= 1.2 && ratio <= 1.5 && screenW < 900) {
        return {
            key: "VGA_L",
            width: 640,
            height: 480,
            uiScale: 0.6
        };
    }

    // VGA縦固定
    if (isPortrait && ratio >= 0.7 && ratio <= 0.8 && screenW <= 600) {
        return {
            key: "VGA_P",
            width: 480,
            height: 640,
            uiScale: 0.6
        };
    }

    // それ以外は実解像度
    return {
        key: isPortrait ? "MOBILE_P" : "MOBILE_L",
        width: screenW,
        height: screenH,
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

    // 内部解像度を設定
    width = canvas.width = currentResolution.width;
    height = canvas.height = currentResolution.height;

    // 画面に収まるように表示サイズだけ縮放
    const scale = Math.min(vw / width, vh / height);
    const displayW = Math.round(width * scale);
    const displayH = Math.round(height * scale);

    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    canvas.style.position = 'absolute';
    canvas.style.left = `${Math.floor((vw - displayW) / 2)}px`;
    canvas.style.top = `${Math.floor((vh - displayH) / 2)}px`;

    // アプリ全体スケール
    const maxDim = Math.max(width, height);
    baseAppScale = maxDim / REFERENCE_SIZE;

    if (width > height) {
        baseAppScale /= 1.1;
    }

    // UIスケール
    globalUiScale = currentResolution.uiScale;
    document.documentElement.style.setProperty('--ui-scale', globalUiScale);

    // HUD専用スケール
    let hudScale = 1;

    if (currentResolution.key === "FHD") {
        hudScale = 1.7;
    } else if (
        currentResolution.key === "VGA_L" ||
        currentResolution.key === "VGA_P"
    ) {
        hudScale = 0.9;
    } else {
        // スマホ / タブレット系
        hudScale = 1.0;
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

    } else if (gameState === 'TITLE' || gameState === 'OST' || gameState === 'HOWTO' || gameState === 'RANKING') {
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
        'STORY'].includes(gameState)) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over'; // 加算合成をリセット

        let fade = 0.0;

        if (gameState === 'DYING') {
            fade = Math.max(0, (60 - dyingTimer) / 60);
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
}

/**
 * ゲームロジック全体の更新
 */
function update() {
    if (gameState === 'PAUSED') return;

    if (spawnWaitTimer > 0) {
        spawnWaitTimer--;
    }

    // ステージクリア後の待機シーケンス
    if (isStageClear && !isWarpingOut) {
        stageClearTimer++;
        const waitTime = (stage === MAX_STAGE) ? 900 : 180;

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

    updateEntities();
    if (typeof updateGrid === 'function') updateGrid();
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
    if (typeof updateMissiles === 'function') updateMissiles();
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

    const enemyCount = Array.isArray(enemies) ? enemies.length : 0;
    const bulletCount = Array.isArray(bullets) ? bullets.length : 0;
    const enemyBulletCount = Array.isArray(enemyBullets) ? enemyBullets.length : 0;
    const particleCount = Array.isArray(particles) ? particles.length : 0;
    const crystalCount = Array.isArray(crystals) ? crystals.length : 0;
    const powerupCount = Array.isArray(powerups) ? powerups.length : 0;
    const missileCount = Array.isArray(missiles) ? missiles.length : 0;

    const totalObjects =
        enemyCount +
        bulletCount +
        enemyBulletCount +
        particleCount +
        crystalCount +
        powerupCount +
        missileCount;

    const px = player ? Math.round(player.x) : 0;
    const py = player ? Math.round(player.y) : 0;
    const pinv = player?.invuln ?? 0;
    const pweapon = player?.weaponLevel ?? "-";
    const pshield = player?.shield ?? "-";

    const cx = camera ? Math.round(camera.x) : 0;
    const cy = camera ? Math.round(camera.y) : 0;

    el.textContent =
        `[DEBUG] ${GAME_VERSION}
FPS: ${debugFps}
SCENE: ${gameState}
STAGE: ${stage} / CURRENT: ${currentStage}
SCORE: ${score}
FRAME: ${frame}

PLAYER
X: ${px} Y: ${py}
INVULN: ${pinv}
WEAPON: ${pweapon}
SHIELD: ${pshield}

CAMERA
X: ${cx} Y: ${cy}

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
    if (typeof drawItems === 'function') drawItems();
    if (typeof drawVisualEffects === 'function') drawVisualEffects();


    if (typeof drawDebugWorldOverlay === 'function') drawDebugWorldOverlay();

    // UI要素描画
    if ((gameState === 'PLAYING' || gameState === 'DYING') && frame % 3 === 0) {
        if (typeof drawMiniMap === 'function') drawMiniMap();
    }
    if (typeof drawScorePopups === 'function') drawScorePopups();

    ctx.restore();

    if (typeof drawDebugOverlay === 'function') drawDebugOverlay();
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
window.refreshMenuButtons();
loop();