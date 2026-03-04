// =========================================================
// Main Game Logic (main.js)
// =========================================================

// ---------------------------------------------------------
// 1. システム・グローバル変数 (設定値は config.js へ移動済み)
// ---------------------------------------------------------
let baseAppScale = 1.0;         // 画面サイズによる基本拡大率
let globalUiScale = 1.0;        // UI全体のスケール

let gameSpeed = 1.0;            // ゲーム全体の速度係数（スロー演出用）
let cameraScale = 1.0;          // カメラのズーム倍率（1.0=通常、0.75=縮小）
let frame = 0;                  // 経過フレームカウント
let width, height;              // 画面サイズ（resize関数で設定）
let worldSize = 1500;           // ワールドサイズ（resize関数で設定）

// ゲームステート管理
var gameState = 'TITLE';        // 'TITLE', 'PLAYING', 'PAUSED', 'DYING', 'GAMEOVER_UI', 'ENDING', 'OST'
let previousGameState = '';     // ポーズ前の状態保存用

// モード・演出フラグ
let isTrainingMode = false;     // トレーニングモードかどうか
let titleIdleTimer = 0;         // タイトル放置タイマー
let isFadingOut = false;        // 画面フェードアウト中フラグ
let fadeAlpha = 0.0;            // フェードアウトの透明度
let msgHideTimeout = null;      // メッセージ消去用のタイマーID

// ---------------------------------------------------------
// 2. ステージ・進行管理変数
// ---------------------------------------------------------
let currentStage = 1;           // 現在のステージ番号
let stage = 1;                  // 表示上のステージ番号
let score = 0;                  // 現在のスコア

let spawnedCount = 0;           // 現在のステージで生成済みの敵数
let enemiesToSpawn = 0;         // 現在のステージの総出現ノルマ
let enemiesKilled = 0;          // 現在のステージで倒した敵数
let isStageClear = false;       // ステージクリアフラグ
let dyingTimer = 0;             // プレイヤー死亡演出用タイマー

// ボスラッシュ(Stage 9)・ラスボス(Stage 10)用
let rushBossIndex = 0;          // ボスラッシュ: 現在のボス番号 (0~7)
let rushIntervalTimer = 0;      // ボスラッシュ: インターバルタイマー
let stage10Timer = 0;           // Stage 10: 経過時間
let stage10BeatCount = 0;       // Stage 10: ビート演出カウント

// ---------------------------------------------------------
// 3. プレイヤー（自機）データ
// ---------------------------------------------------------
const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    satellites: [],             // 取得したサテライト（クリスタル）
    shield: PLAYER_BASE_SHIELD, // 現在のシールド値
    weaponLevel: 1,             // 武器レベル
    invuln: 0,                  // 無敵時間タイマー
    laserTimer: 0,              // 特殊レーザー残り時間
    history: []                 // 軌跡（トレイル）用履歴
};

// 入力状態管理
const input = {
    move: { x: 0, y: 0, active: false }, // 左スティック
    aim: { x: 0, y: 0, active: false },  // 右スティック
    keys: {},                            // キーボード入力状態
    padAPressed: false,                  // ゲームパッド Aボタン
    padBombPressed: false,               // ゲームパッド ボムボタン
    padDirPressed: false,                // ゲームパッド 十字キー
    padStartPressed: false               // ゲームパッド STARTボタン
};

// カメラ座標
let camera = { x: 0, y: 0 };

// ---------------------------------------------------------
// 4. エンティティ配列 (敵・弾・エフェクト等)
// ---------------------------------------------------------
let enemies = [];       // 敵キャラクター
let enemyBullets = [];  // 敵の弾
let bullets = [];       // プレイヤーの弾
let lasers = [];        // プレイヤーのレーザー
let missiles = [];      // プレイヤーのホーミングミサイル

let particles = [];     // パーティクル（爆発エフェクトなど）
let crystals = [];      // スコアアイテム（クリスタル）
let powerups = [];      // パワーアップアイテム
let wormholes = [];     // 敵出現ワームホール
let scorePopups = [];   // スコア上昇ポップアップ
let rings = [];         // 衝撃波リングエフェクト
let gridPoints = [];    // 背景グリッド点
let stars = [];         // 背景の星
let nebulae = []; // 星雲の配列

// ---------------------------------------------------------
// 5. ボス（BOSS）管理変数
// ---------------------------------------------------------
let isBossSpawned = false;      // ボス出現済みフラグ
let isBossWarning = false;      // 警告演出中フラグ
let warningTimer = 0;           // 警告演出用タイマー
let stageMessageTimer = 0;      // ステージ開始メッセージ用タイマー
let nextBossSpawnX = 0;         // ボス出現予定座標X
let nextBossSpawnY = 0;         // ボス出現予定座標Y

// ---------------------------------------------------------
// 6. その他
// ---------------------------------------------------------
let levelItemsDroppedInStage = 0; // ステージ内でドロップしたレベルアップアイテム数

// 入力状態のリセット関数
function clearInputState() {
    input.move.x = 0; input.move.y = 0; input.move.active = false;
    input.aim.x = 0; input.aim.y = 0; input.aim.active = false;
    input.keys = {};

    input.padAPressed = false;
    input.padBombPressed = false;
    input.padDirPressed = false;
    input.padStartPressed = false;

    if (ui.knobL) ui.knobL.style.transform = 'translate(0,0)';
    if (ui.knobR) ui.knobR.style.transform = 'translate(0,0)';
}


// ---------------------------------------------------------
// 7. UI要素・DOM参照 & ユーティリティ
// ---------------------------------------------------------

// Canvas & Context
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const miniMapCanvas = document.getElementById('minimap-canvas');
const miniMapCtx = miniMapCanvas.getContext('2d');

// UI Elements Collection
const ui = {
    // Overlays
    overlay: document.getElementById('overlay'),
    pauseOverlay: document.getElementById('pause-overlay'),
    ost: document.getElementById('ost-ui'),
    endingHud: document.getElementById('ending-msg'),
    nameInputArea: document.getElementById("name-input-area"),

    // HUD (Heads-Up Display)
    score: document.getElementById('score-display'),
    stage: document.getElementById('stage-num'),
    weaponDisplay: document.getElementById('weapon-display'),
    shieldBar: document.getElementById('shield-bar'),
    shieldVal: document.getElementById('shield-val'),
    enemyBar: document.getElementById('enemy-bar'),
    invulnWrapper: document.getElementById('invuln-wrapper'),
    invulnBar: document.getElementById('invuln-bar'),
    msg: document.getElementById('stage-msg'),
    warn: document.getElementById('warning-msg'),

    // Boss UI
    bossContainer: document.getElementById('boss-ui-container'),
    bossNameLabel: document.getElementById('boss-name-label'),
    bossBarFrame: document.getElementById('boss-bar-frame'),
    bossHpBarInline: document.getElementById('boss-hp-bar-inline'),

    // Controls (Touch/Mouse)
    controls: document.getElementById('controls'),
    pauseBtn: document.getElementById('pause-btn'),
    launchBtn: document.getElementById('launch-btn'),
    knobL: document.getElementById('knob-left'),
    knobR: document.getElementById('knob-right'),
    stickL: document.getElementById('stick-left'),
    stickR: document.getElementById('stick-right'),

    // Menu Buttons
    btnStart: document.getElementById('btn-start'),
    btnOst: document.getElementById('btn-ost'),
    btnTitle: document.getElementById('btn-title'),
    titleText: document.querySelector('#overlay h1'),
    btnBackTitle: document.getElementById('btn-back-to-title'),
    btnNextResult: document.getElementById('btn-next-result'),

    // Result & Ranking
    finalScore: document.getElementById('final-score-val'),
    submitBtn: document.getElementById("submit-score-btn"),
    skipScoreBtn: document.getElementById("skip-score-btn"),
    nameInput: document.getElementById("player-name-input")
};

// ゲームパッド操作用メニュー管理
let currentMenuButtons = [];
let selectedMenuIndex = 0;

/**
 * 画面中央にメッセージを表示する関数
 * @param {string} textHTML 表示するテキスト（HTML可）
 * @param {string} colorType 色タイプ ('red', 'gold', 'default')
 */
function showMessage(textHTML, colorType = 'default') {
    // 既存の消去タイマーがあればキャンセル（連続表示対応）
    if (msgHideTimeout) {
        clearTimeout(msgHideTimeout);
        msgHideTimeout = null;
    }

    ui.msg.innerHTML = textHTML;

    // 1. まずアニメーションなしで「透明」かつ「表示」状態にする
    ui.msg.style.display = 'block';
    ui.msg.style.transition = 'none';
    ui.msg.style.opacity = '0';

    // デザインとスケール調整
    ui.msg.style.transform = `scale(${globalUiScale})`;
    ui.msg.style.fontSize = "calc(28px * var(--ui-scale, 1))";

    // 色設定
    if (colorType === 'red') {
        ui.msg.style.color = "#f00";
        ui.msg.style.textShadow = "0 0 15px #f00, 0 0 30px #f00";
    } else if (colorType === 'gold') {
        ui.msg.style.color = "#ffd700";
        ui.msg.style.textShadow = "0 0 20px #ffd700, 0 0 40px #ffaa00";
    } else {
        ui.msg.style.color = "#fff";
        ui.msg.style.textShadow = "0 0 15px #0ff, 0 0 30px #0ff, 0 0 60px #0ff";
    }

    // 2. わずかな遅延を入れてフェードインを開始
    // ブラウザがdisplay:blockを認識してからopacityを変えることでアニメーションさせる
    setTimeout(() => {
        ui.msg.style.transition = "opacity 0.2s ease-out";
        ui.msg.style.opacity = "1";
    }, 50);
}




// =========================================================
// 2. オーディオシステム (Audio System)
// =========================================================
// --- Menu & OST Logic ---
let ostTracks = [];
let currentOstIndex = -1;
let ostUpdateInterval = null;

// OST画面を開く関数（曲リストの生成）
function openOST() {
    if (typeof AudioSys !== 'undefined') AudioSys.resume();
    ui.overlay.style.display = 'none';

    gameState = 'OST'; // ★ここで状態をOSTにする
    ui.ost.style.display = 'flex';

    const list = document.getElementById('track-list');
    list.innerHTML = '';

    // 曲リストの定義
    ostTracks = [
        { n: 'Title Theme', k: 'title' }
    ];
    // ステージ曲
    // config.js の STAGE_TITLES や BGM_FILES.stages を使ってリスト化
    // (ここでは簡易的にBGM_FILESを参照している想定)
    if (typeof BGM_FILES !== 'undefined' && BGM_FILES.stages) {
        BGM_FILES.stages.forEach((path, index) => {
            ostTracks.push({ n: `Stage ${index + 1} BGM`, k: 'stage', i: index });
        });
    }
    // その他の曲
    ostTracks.push(
        { n: 'Boss Encounter', k: 'boss' },
        { n: 'The Final Ark', k: 'last' },
        { n: 'Mission Complete', k: 'clear' },
        { n: 'All Mission Complete', k: 'all_clear' },
        { n: 'Name Entry', k: 'name' }
    );

    // リスト描画
    ostTracks.forEach((t, idx) => {
        const d = document.createElement('div');
        d.className = 'track-item';
        d.innerText = t.n;
        d.onclick = () => playOSTTrack(idx);
        list.appendChild(d);
    });

    // UI初期化
    const ostControls = document.getElementById('ost-controls');
    if (ostControls) ostControls.style.display = 'flex';

    // プログレスバーの更新開始（定義されていれば）
    if (typeof startOstProgressUpdate === 'function') startOstProgressUpdate();
    if (window.refreshMenuButtons) window.refreshMenuButtons();
}

// 指定したインデックスのOSTを再生する関数
function playOSTTrack(idx) {
    if (idx < 0 || idx >= ostTracks.length) return;

    currentOstIndex = idx; // 現在の曲番号を更新
    const t = ostTracks[idx];

    // BGM再生（audio_manager.js の playBGM が呼ばれ、loopがfalseになる）
    if (typeof AudioSys !== 'undefined') {
        AudioSys.playBGM(t.k, t.i);
    }

    // リストの見た目を更新（再生中の曲を光らせる）
    const items = document.querySelectorAll('#track-list .track-item');
    items.forEach((e, i) => {
        if (i === idx) {
            e.classList.add('playing');
            // リスト内でスクロールして表示
            e.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            e.classList.remove('playing');
        }
    });

    const nowPlayingText = document.getElementById('ost-now-playing');
    if (nowPlayingText) {
        nowPlayingText.innerText = "NOW PLAYING: " + t.n;
    }
}

// 次の曲へ進む（AudioSysのendedイベントから呼ばれる）
window.playNextOST = function () {
    if (currentOstIndex >= 0 && ostTracks.length > 0) {
        let nextIndex = currentOstIndex + 1;

        // 最後の曲まで行ったら最初に戻る
        if (nextIndex >= ostTracks.length) {
            nextIndex = 0;
        }

        playOSTTrack(nextIndex);
    }
};

// 秒数を 0:00 形式に変換
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 再生バーの定期更新
function startOstProgressUpdate() {
    if (ostUpdateInterval) clearInterval(ostUpdateInterval);
    ostUpdateInterval = setInterval(() => {
        if (gameState !== 'OST' || !AudioSys.bgmEl) return;

        const bgm = AudioSys.bgmEl;
        const cur = bgm.currentTime || 0;
        const tot = bgm.duration || 0;

        document.getElementById('ost-time-current').innerText = formatTime(cur);
        document.getElementById('ost-time-total').innerText = formatTime(tot);

        let pct = 0;
        if (tot > 0) pct = (cur / tot) * 100;
        document.getElementById('ost-progress-fill').style.width = `${pct}%`;
    }, 200);
}

// OSTを閉じる処理
function closeOST() {
    if (ostUpdateInterval) clearInterval(ostUpdateInterval);

    // ★変更：即座に止める処理を削除（returnToTitle側でフェードアウトさせるため）

    if (AudioSys.bgmEl) AudioSys.bgmEl.loop = true; // ゲーム用にループを戻す
    returnToTitle();
}

// シークバー（再生バー）のクリック・タップ操作
const ostProgressBar = document.getElementById('ost-progress-bar');

const seekOst = (e) => {
    if (gameState !== 'OST' || !AudioSys.bgmEl || !AudioSys.bgmEl.duration) return;
    const rect = ostProgressBar.getBoundingClientRect();
    // タッチかマウスかを判定してX座標を取得
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width)); // 0.0 ~ 1.0の範囲に収める

    AudioSys.bgmEl.currentTime = AudioSys.bgmEl.duration * pct;
};

ostProgressBar.addEventListener('mousedown', seekOst);
ostProgressBar.addEventListener('touchstart', (e) => { e.preventDefault(); seekOst(e); }, { passive: false });

// 既存のイベント割り当て部分を少し整理
document.getElementById('btn-start').onclick = startGame;
document.getElementById('btn-ost').onclick = openOST;
document.getElementById('btn-back').onclick = closeOST;

// ==========================================
// ★追加：STORY（アーカイブ）画面のロジック
// ==========================================
function openStory() {
    // HOWTOのタイマーが進まないようにリセット
    if (typeof resetTitleIdle === 'function') resetTitleIdle();

    gameState = 'STORY';
    ui.overlay.style.display = 'none';
    const storyOverlay = document.getElementById('story-overlay');
    storyOverlay.style.display = 'flex';

    // --- ★追加：言語判定とクラス付与 ---
    const container = document.getElementById('story-scroll-container');
    // まず既存のクラスをリセット
    container.classList.remove('lang-ja', 'lang-en');

    // ブラウザの言語設定を取得
    const lang = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language;
    const isJa = lang && lang.startsWith('ja');

    if (isJa) {
        container.classList.add('lang-ja'); // 日本語なら英語(.en-text)を隠すクラスを付与
    } else {
        container.classList.add('lang-en'); // それ以外なら日本語(.ja-text)を隠すクラスを付与
    }
    // --------------------------------

    // スクロール位置を一番上に戻す
    container.scrollTop = 0;

    // BGMとして 'title' を再生
    AudioSys.playBGM('title');

    window.refreshMenuButtons();
}

function closeStory() {
    document.getElementById('story-overlay').style.display = 'none';
    returnToTitle(); // 閉じた後はタイトルに戻る
}

// イベントの割り当て
const btnStoryMenu = document.getElementById('btn-story');
const btnStoryBackMenu = document.getElementById('btn-story-back');
if (btnStoryMenu) btnStoryMenu.onclick = openStory;
if (btnStoryBackMenu) btnStoryBackMenu.onclick = closeStory;


// =========================================================
// 3. 初期化・システム制御 (Core Logic)
// =========================================================
window.refreshMenuButtons = function (resetIndex = true) {
    currentMenuButtons = [];
    if (resetIndex) {
        selectedMenuIndex = 0;
    }

    const rOverlay = document.getElementById("ranking-overlay");
    const cBtn = document.getElementById("close-ranking-btn");
    const howtoOverlay = document.getElementById('howto-overlay'); // 追加

    if (rOverlay && rOverlay.style.display === 'flex') {
        currentMenuButtons = [cBtn];
    } else if (gameState === 'PAUSED') {
        const pauseBtns = document.querySelectorAll('#pause-overlay .menu-btn');
        pauseBtns.forEach(btn => currentMenuButtons.push(btn));
    } else if (ui.nameInputArea.style.display === 'flex') {
        const inputBtns = document.querySelectorAll('#name-input-area .menu-btn');
        inputBtns.forEach(btn => {
            if (window.getComputedStyle(btn).display !== 'none') currentMenuButtons.push(btn);
        });
    } else if (gameState === 'TITLE' || gameState === 'GAMEOVER_UI') {
        const overlayBtns = document.querySelectorAll('#overlay .menu-btn');
        overlayBtns.forEach(btn => {
            if (window.getComputedStyle(btn).display !== 'none') currentMenuButtons.push(btn);
        });
    } else if (gameState === 'OST') {
        const ostBtns = document.querySelectorAll('#ost-ui .track-item, #ost-ui .menu-btn');
        ostBtns.forEach(btn => currentMenuButtons.push(btn));
    } else if (gameState === 'STORY') {
        const backBtn = document.getElementById('btn-story-back');
        if (backBtn) currentMenuButtons.push(backBtn);
    }
    else if (gameState === 'HOWTO') {
        const howtoBtns = document.querySelectorAll('#howto-overlay .menu-btn');
        howtoBtns.forEach(btn => currentMenuButtons.push(btn));
    }
    else if (gameState === 'ENDING') {
        const endBtns = document.querySelectorAll('#ending-msg .menu-btn');
        endBtns.forEach(btn => currentMenuButtons.push(btn));
    }

    window.updateMenuSelectionUI();
};

window.updateMenuSelectionUI = function () {
    document.querySelectorAll('.menu-btn.selected, .track-item.selected').forEach(el => {
        el.classList.remove('selected');
    });

    if (currentMenuButtons.length > 0) {
        selectedMenuIndex = Math.max(0, Math.min(selectedMenuIndex, currentMenuButtons.length - 1));
        const activeBtn = currentMenuButtons[selectedMenuIndex];
        if (activeBtn) {
            activeBtn.classList.add('selected');
            // 画面外にある場合はスクロールして表示
            activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
};

function init() {
    resize();
    AudioSys.init();

    // ★追加：バージョン表示の更新
    const verEl = document.getElementById('version-num');
    if (verEl) {
        // config.jsで定義した定数を使う
        verEl.innerText = "Version " + GAME_VERSION;
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    const maxDim = Math.max(width, height);
    baseAppScale = maxDim / REFERENCE_SIZE;

    if (width > height) {
        baseAppScale /= 1.1;
    }

    // ==========================================
    // ★画面サイズに合わせたHUD(UI)とメッセージのスケール調整
    // ==========================================
    const screenBaseSize = Math.max(width, height);
    globalUiScale = screenBaseSize / 800;

    globalUiScale = Math.max(0.8, Math.min(globalUiScale, 2.0));

    const maxAllowedScale = width / Math.min(width, 800);
    globalUiScale = Math.min(globalUiScale, maxAllowedScale);

    // スコアやゲージの拡大
    const hudRow = document.querySelector('.hud-row');
    if (hudRow) {
        hudRow.style.transformOrigin = 'top center';
        hudRow.style.transform = `scale(${globalUiScale})`;
    }

    // ★追加：STAGE CLEAR や GAME OVER のテキスト拡大
    const stageMsg = document.getElementById('stage-msg');
    if (stageMsg) {
        stageMsg.style.transformOrigin = 'center center';
        stageMsg.style.transform = `scale(${globalUiScale})`;
    }

    // ★追加：SHIELD LOW 等の警告テキスト拡大
    const warningMsg = document.getElementById('warning-msg');
    if (warningMsg) {
        warningMsg.style.transformOrigin = 'center center';
        warningMsg.style.transform = `scale(${globalUiScale})`;
    }

    document.documentElement.style.setProperty('--ui-scale', globalUiScale);

    initGrid();
    initStars();
    initNebulae();
}

function initGrid() {
    const cols = Math.ceil(worldSize / GRID_SPACING) + 2;
    const rows = Math.ceil(worldSize / GRID_SPACING) + 2;
    gridPoints = [];
    for (let x = 0; x <= cols; x++) {
        gridPoints[x] = [];
        for (let y = 0; y <= rows; y++) gridPoints[x][y] = { x: x * GRID_SPACING, y: y * GRID_SPACING, ox: x * GRID_SPACING, oy: y * GRID_SPACING, vx: 0, vy: 0 };
    }
}

function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({ x: Math.random() * worldSize, y: Math.random() * worldSize, size: Math.random() * 2, brightness: Math.random(), parallax: 0.2 + Math.random() * 0.3 });
    }
}

function initNebulae() {
    nebulae = [];
    const themeHex = STAGE_THEMES[stage] || '#00bbff';
    const base = hexToRgb(themeHex);
    const spaceDeep = { r: 20, g: 0, b: 60 };

    for (let i = 0; i < 6; i++) {
        const radius = 120 + Math.random() * 300;
        const alpha = 0.05 + Math.random() * 0.07;

        // --- 色の決定（既存ロジック維持） ---
        let r, g, b;
        const variant = Math.random();
        if (variant < 0.6) {
            const variance = (Math.random() - 0.5) * 60;
            r = base.r + variance; g = base.g + variance; b = base.b + variance;
        } else if (variant < 0.8) {
            r = (base.r + spaceDeep.r) / 2; g = (base.g + spaceDeep.g) / 2; b = (base.b + spaceDeep.b) / 2;
        } else {
            r = Math.min(255, base.r + 100); g = Math.min(255, base.g + 100); b = Math.min(255, base.b + 100);
        }
        const color = {
            r: Math.floor(Math.max(0, Math.min(255, r))),
            g: Math.floor(Math.max(0, Math.min(255, g))),
            b: Math.floor(Math.max(0, Math.min(255, b)))
        };

        const cacheCanvas = document.createElement('canvas');
        const size = Math.ceil(radius * 2);
        cacheCanvas.width = size; cacheCanvas.height = size;
        const cacheCtx = cacheCanvas.getContext('2d');
        const grad = cacheCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        cacheCtx.fillStyle = grad;
        cacheCtx.fillRect(0, 0, size, size);

        nebulae.push({
            x: Math.random() * width, // 画面内を基準に初期配置
            y: Math.random() * height,
            radius: radius,
            image: cacheCanvas,
            // ★ここを変更：0.05〜0.1 だったのを 0.3〜0.6 程度に引き上げ
            // 数値が大きいほど自機の動きに対して大きく逆方向に動きます
            parallax: 0.3 + Math.random() * 0.3
        });
    }
}
// 16進数カラー(#rrggbb)をRGBオブジェクト({r,g,b})に変換する関数
function hexToRgb(hex) {
    // カラーコードが未定義の場合のガード
    if (!hex) return { r: 0, g: 255, b: 255 };

    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function setPaused(paused) {
    if (paused) {
        if (gameState === 'PLAYING') {

            // ★追加：ポーズ時に入力状態をリセット（バックグラウンド移行時の押しっぱなし防止）
            clearInputState();

            if (isTrainingMode) {
                returnToTitleFromTraining();
                return;
            }

            previousGameState = gameState;
            gameState = 'PAUSED';
            ui.pauseOverlay.style.display = 'flex';
            window.refreshMenuButtons();
        }
        AudioSys.pauseBGM();
    } else {
        if (gameState === 'PAUSED') {
            // ここはそのまま
        } else {
            AudioSys.resumeBGM();
        }
    }
}

function requestFullScreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
        el.requestFullscreen().catch(e => console.log("Fullscreen blocked", e));
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    } else if (isIOS) {
        window.scrollTo(0, 0);
    }
}


// =========================================================
// 4. シーン・ステージ管理 (Scene & Stage Management)
// =========================================================
function startGame() {
    // ★変更：いきなり消さず、まずは透明にして当たり判定だけ消す（フォーカス維持のため）
    ui.overlay.style.transition = 'opacity 0.2s';
    ui.overlay.style.opacity = '0';
    ui.overlay.style.pointerEvents = 'none'; // クリックだけできないようにする

    // 即座にキャンバスにフォーカス
    canvas.focus();

    // 念のため少し遅らせてから完全に消す（これでフォーカス迷子を防ぐ）
    setTimeout(() => {
        ui.overlay.style.display = 'none';
        // 次回表示時のためにスタイルをリセットしておく（display:noneの状態で行うので見えない）
        ui.overlay.style.transition = '';
        ui.overlay.style.opacity = '1';
        ui.overlay.style.pointerEvents = 'auto';
    }, 500);

    ui.ost.style.display = 'none';

    score = 0;
    stage = START_STAGE;
    frame = 0;
    currentStage = START_STAGE;

    player.x = worldSize / 2;
    player.y = worldSize / 2;
    player.vx = 0;
    player.vy = 0;
    player.shield = PLAYER_BASE_SHIELD;
    player.weaponLevel = DEFAULT_WEAPON_LEVEL;
    player.satellites = [];
    player.invuln = 0;
    player.laserTimer = 0;
    player.history = [];

    // 入力リセット
    input.move.active = false;
    input.aim.active = false;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const isConnected = Array.from(gamepads).some(gp => gp !== null);
    ui.controls.style.display = isConnected ? 'none' : 'block';

    cameraScale = 1.0;
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    camera.x = player.x - viewW / 2;
    camera.y = player.y - viewH * CAMERA_Y_OFFSET;
    updateCamera();

    ui.score.innerText = "000000";
    ui.stage.innerText = stage;
    ui.shieldBar.style.width = "100%";
    ui.shieldBar.classList.remove('shield-critical');
    ui.shieldBar.style.backgroundColor = '#0ff';
    ui.enemyBar.style.width = "100%";
    ui.warn.style.display = 'none';
    ui.msg.style.display = 'none';
    ui.pauseBtn.style.display = 'flex';

    gameState = 'PLAYING';

    initNebulae();

    startStage();
}

function startStage() {
    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'flex';

    spawnedCount = 0;
    enemiesKilled = 0;
    isStageClear = false;
    isBossSpawned = false;
    isBossWarning = false;
    warningTimer = 0;
    levelItemsDroppedInStage = 0;

    // ★リセット: 新しいステージ開始時はタイマーをリセット
    stageMessageTimer = 0;

    ui.msg.style.display = 'none';
    ui.warn.style.display = 'none';
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';

    bullets = []; lasers = []; enemies = []; enemyBullets = [];
    missiles = []; wormholes = [];
    scorePopups = []; rings = [];

    // ▼▼▼ メッセージ表示ロジックの共通化 ▼▼▼
    if (!isTrainingMode) {
        let msgContent = "";
        let msgColor = "default";
        let displayTime = 180; // デフォルト3.5秒 (60fps * 3.5)

        if (stage === 10) {
            // --- Stage 10 (Final) ---
            stage10Timer = 0;
            stage10BeatCount = 0;
            msgContent = `<span style="font-size: 1.2em; letter-spacing: 8px; margin-right: -8px;">WARNING</span><br><span style="display: inline-block; margin-top: 15px; font-size: 0.7em; letter-spacing: 4px; margin-right: -4px;">GENESIS-ARK APPROACHING</span>`;
            msgColor = "red";
            displayTime = 240; // 4秒
            AudioSys.playBGM('last');

            // 雑魚無限湧き設定
            enemiesToSpawn = 9999;
            gameSpeed = 1.0;

        } else if (stage === 9) {
            // --- Stage 9 (Boss Rush) ---
            rushBossIndex = 0;
            rushIntervalTimer = 0;
            msgContent = "FINAL MISSION\nBOSS RUSH";
            msgColor = "red";
            displayTime = 240; // 4秒
            AudioSys.playBGM('boss');
            enemiesToSpawn = 9999;
            gameSpeed = 1.0;

        } else {
            // --- 通常ステージ (1-8) ---
            const data = STAGE_TITLES[stage] || { en: "UNKNOWN SECTOR", ja: "未知の宙域" };
            const lang = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language;
            const isJa = lang && lang.startsWith('ja');

            msgContent = `<span style="font-size: 0.7em; letter-spacing: 4px; opacity: 0.8; display:block; margin-bottom:10px;">- STAGE ${stage} -</span>`;
            msgContent += `<span style="display:block;">${data.en}</span>`;
            if (isJa) {
                msgContent += `<span style="font-size: 0.6em; font-family: sans-serif; letter-spacing: 2px; color: rgba(255,255,255,0.6); display:block; margin-top:10px;">${data.ja}</span>`;
            }

            // BGM再生
            const bgmIndex = (stage - 1) % BGM_FILES.stages.length;
            AudioSys.playBGM('stage', bgmIndex);

            // 敵出現設定
            if (stage <= STAGE_ENEMY_COUNTS.length) enemiesToSpawn = STAGE_ENEMY_COUNTS[stage - 1];
            else enemiesToSpawn = STAGE_ENEMY_COUNTS[STAGE_ENEMY_COUNTS.length - 1] + 50;

            const whCount = Math.max(1, Math.floor((stage + 1) / 2));
            for (let i = 0; i < whCount; i++) spawnWormhole();
            gameSpeed = 1.0;
        }

        // メッセージ表示実行（共通）
        showMessage(msgContent, msgColor);
        stageMessageTimer = displayTime;
    }
    // ▲▲▲ ここまで ▲▲▲

    distortGrid(worldSize / 2, worldSize / 2, -200, worldSize);

    const isConnected = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(gp => gp !== null);
    ui.controls.style.display = isConnected ? 'none' : 'block';
    ui.pauseBtn.style.display = isConnected ? 'none' : 'flex';
}

function resetGame() {
    // 変数リセット
    score = 0;
    stage = currentStage;
    frame = 0;
    spawnedCount = 0;
    enemiesKilled = 0;
    isStageClear = false;
    isBossSpawned = false;
    isBossWarning = false;
    warningTimer = 0;
    levelItemsDroppedInStage = 0;

    bullets = []; lasers = []; enemies = []; enemyBullets = [];
    particles = []; crystals = []; missiles = []; powerups = [];
    wormholes = []; scorePopups = []; rings = [];

    player.x = worldSize / 2; player.y = worldSize / 2;
    player.vx = 0; player.vy = 0;
    player.shield = PLAYER_BASE_SHIELD;
    player.weaponLevel = 1;
    player.invuln = 0; player.laserTimer = 0;
    player.satellites = [];
    player.history = [];

    clearInputState();

    cameraScale = 1.0;
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    camera.x = player.x - viewW / 2;
    camera.y = player.y - viewH * CAMERA_Y_OFFSET;
    updateCamera();

    ui.score.innerText = "000000"; ui.stage.innerText = stage;
    ui.shieldBar.style.width = "100%"; ui.shieldBar.classList.remove('shield-critical');
    ui.shieldBar.style.backgroundColor = '#0ff';
    ui.enemyBar.style.width = "100%";
    ui.warn.style.display = 'none'; ui.msg.style.display = 'none';
    ui.pauseBtn.style.display = 'flex';
    ui.bossContainer.style.display = 'none';

    // ★変更：ここも「ゴースト化」処理に変更
    ui.overlay.style.transition = 'opacity 0.2s';
    ui.overlay.style.opacity = '0';
    ui.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
        ui.overlay.style.display = 'none';
        ui.overlay.style.transition = '';
        ui.overlay.style.opacity = '1';
        ui.overlay.style.pointerEvents = 'auto';
    }, 500);

    ui.controls.style.display = 'block';

    const bgmIndex = Math.floor((stage - 1) / 2) % BGM_FILES.stages.length;
    AudioSys.playBGM('stage', bgmIndex);
    gameState = 'PLAYING';
    startStage();

    const isConnected = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(gp => gp !== null);
    ui.controls.style.display = isConnected ? 'none' : 'block';
    ui.pauseBtn.style.display = isConnected ? 'none' : 'flex';
}

function checkStageClear() {
    let isClearCondition = false;

    if (stage === 9) {
        if (rushBossIndex >= 8) isClearCondition = true;
    } else if (stage === 10) {
        if (enemies.length === 0 && isBossSpawned) isClearCondition = true;
    } else {
        const noEnemies = enemies.length === 0;
        const noWormholes = wormholes.filter(w => w.active).length === 0;
        if (noEnemies && noWormholes && isBossSpawned) isClearCondition = true;
    }

    if (!isStageClear && isClearCondition) {
        isStageClear = true;

        if (stage === MAX_STAGE) {
            // --- 全クリア時の演出（変更なし） ---
            gameSpeed = 0.25;
            distortGrid(worldSize / 2, worldSize / 2, 1000, worldSize);
            player.invuln = 1200;

            if (AudioSys.bgmEl) AudioSys.bgmEl.pause();
            AudioSys.playBGM('all_clear');

            const clearText = `ALL MISSION CLEAR<br><span id="clear-score-text" style="opacity: 0; display: inline-block; margin-top: 20px; font-size: 0.6em; color: #fff; text-shadow: 0 0 10px #fff, 0 0 20px #0ff; letter-spacing: 4px; margin-right: -4px;">TOTAL SCORE: ${score.toLocaleString()}</span>`;
            showMessage(clearText, 'gold');

            ui.msg.style.transition = "none";
            ui.msg.style.opacity = "0";
            ui.msg.style.transform = `translateY(100px) scale(${globalUiScale})`;

            // ...（以下、花火演出などの長いコードはそのまま）...
            // ※ここはそのままでOKなので省略しませんが、修正が必要なのは下のelseブロックです

            let fireworksActive = true;
            const startTime = Date.now();
            const duration = 18000;

            function triggerRandomFirework() {
                if (gameState !== 'PLAYING' || !fireworksActive) return;
                // ... (花火の処理は長いので省略、元のコードのまま動作します) ...
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1.0, elapsed / duration);
                const baseDelay = 50 + progress * 750;
                const randomDelay = 150 + progress * 1500;
                const nextDelay = baseDelay + Math.random() * randomDelay;
                const viewW = width / cameraScale;
                const viewH = height / cameraScale;
                const pad = 100;
                const fx = camera.x + pad + Math.random() * (viewW - pad * 2);
                const fy = camera.y + pad + Math.random() * (viewH - pad * 2);

                if (progress < 0.4) {
                    createExplosion(fx, fy, '#ffffff', 80 + Math.random() * 40);
                    createExplosion(fx, fy, '#00ffff', 40);
                    rings.push({ x: fx, y: fy, r: 10, color: '#ffffff', life: 1.0 });
                    rings.push({ x: fx, y: fy, r: 60, color: '#00ffff', life: 0.8 });
                    distortGrid(fx, fy, 200, 400);
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_large');
                } else if (progress < 0.7) {
                    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#ffffff'];
                    const c = colors[Math.floor(Math.random() * colors.length)];
                    createExplosion(fx, fy, '#ffffff', 30);
                    createExplosion(fx, fy, c, 30);
                    rings.push({ x: fx, y: fy, r: 10, color: c, life: 0.6 });
                    distortGrid(fx, fy, 100, 200);
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_medium');
                } else {
                    const colors = ['#0088ff', '#ff00ff', '#ffffff'];
                    const c = colors[Math.floor(Math.random() * colors.length)];
                    createExplosion(fx, fy, c, 15);
                    distortGrid(fx, fy, 40, 100);
                    if (typeof AudioSys !== 'undefined' && Math.random() > progress) {
                        AudioSys.playSE('explode_small');
                    }
                }

                if (elapsed < duration) {
                    setTimeout(triggerRandomFirework, nextDelay);
                }
            }
            triggerRandomFirework();

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    ui.msg.style.transition = "opacity 6s ease-out, transform 6s ease-out";
                    ui.msg.style.opacity = "1";
                    ui.msg.style.transform = `translateY(0px) scale(${globalUiScale})`;
                });
            });

            setTimeout(() => {
                const scoreSpan = document.getElementById("clear-score-text");
                if (scoreSpan) {
                    scoreSpan.style.transition = "opacity 3s ease-in";
                    scoreSpan.style.opacity = "1";
                }
            }, 8000);

            setTimeout(() => {
                ui.msg.style.transition = "opacity 2s ease-in";
                ui.msg.style.opacity = "0";
            }, 16000);

            setTimeout(() => {
                fireworksActive = false;
                ui.msg.style.display = 'none';
                showGameOver();
            }, 18000);

            return;

        } else {
            // ==========================================
            // ★ここを修正：通常ステージクリア時のフェードアウト
            // ==========================================
            gameSpeed = 0.25;
            distortGrid(worldSize / 2, worldSize / 2, 1000, worldSize);
            AudioSys.playBGM('clear');

            // 1. フェードインして表示
            showMessage("STAGE " + stage + " CLEAR", 'default');

            // 2. ★追加：3.5秒後にフェードアウトを開始
            setTimeout(() => {
                ui.msg.style.transition = "opacity 0.5s ease-in";
                ui.msg.style.opacity = "0";
            }, 3500);

            // 3. 4.0秒後に完全に消して次へ
            setTimeout(() => {
                ui.msg.style.display = 'none';
                stage++;
                ui.stage.innerText = stage;
                startStage();

                initNebulae();

            }, 4000);
        }
    }
}

async function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebaseOps && window.firebaseOps.isReady) return resolve();
        const timer = setInterval(() => {
            if (window.firebaseOps && window.firebaseOps.isReady) {
                clearInterval(timer);
                resolve();
            }
        }, 100);
    });
}

async function showGameOver() {
    // すでにゲームオーバー処理中なら何もしない
    if (gameState === 'GAMEOVER_UI') return;

    // ★最重要：即座にステートを変更し、draw関数で黒塗りさせる
    gameState = 'GAMEOVER_UI';

    // 音の停止
    AudioSys.stopBGM();
    AudioSys.stopSE('warning');
    AudioSys.stopSE('boss_engine'); // ボス音なども念のため停止

    // ==========================================
    // ★追加：名前入力画面（ネームエントリー）のBGMを再生
    // ==========================================
    AudioSys.playBGM('name');

    ui.controls.style.display = 'none';

    // --- 画面上のあらゆる浮遊テキスト・UIを確実に消す ---
    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'none';

    ui.endingHud.style.display = 'none'; // MISSION COMPLETE画面
    ui.overlay.style.display = 'none';   // タイトル画面

    // これらも消さないと黒画面の上に残ることがある
    ui.msg.style.display = 'none';       // "ALL MISSION CLEAR" 等のメッセージ
    ui.warn.style.display = 'none';      // "WARNING" 等の警告
    if (ui.bossContainer) ui.bossContainer.style.display = 'none'; // ボスHPバー
    ui.pauseBtn.style.display = 'none';

    // スコア表示の更新（まだ画面には出さない）
    document.getElementById('result-score-display').innerText = `SCORE: ${score.toLocaleString()}`;

    try {
        // 通信待機（この間、画面は真っ黒になります）
        await waitForFirebase();

        // 10位以内かチェック
        let canRegister = false;
        try {
            canRegister = await window.firebaseOps.checkRankIn(score);
        } catch (e) {
            console.error("Rank check failed:", e);
            canRegister = true;
        }

        // --- 通信が終わったら名前入力画面を出す ---
        // 背景が黒(#000)であることをCSSで確認済み
        ui.nameInputArea.style.display = 'flex';

        const msgPara = document.querySelector("#name-input-area p");
        const nameInp = document.getElementById("player-name-input");
        msgPara.style.textAlign = "center";

        if (canRegister) {
            msgPara.innerText = "NEW RECORD! REGISTER TO WORLD RANKING?";
            msgPara.style.color = "#0ff";

            nameInp.style.display = "block";
            ui.submitBtn.style.display = "block";
            ui.submitBtn.innerText = "SUBMIT";
            ui.submitBtn.style.pointerEvents = "auto";

            ui.skipScoreBtn.innerText = "SKIP";
            nameInp.focus();
        } else {
            msgPara.innerText = "RANKING OUT (TOP 10 ONLY)";
            msgPara.style.color = "#f44";

            nameInp.style.display = "none";
            ui.submitBtn.style.display = "none";

            ui.skipScoreBtn.innerText = "NEXT";
        }

        window.refreshMenuButtons();

        // --- ボタン処理 ---
        // 二重送信を完全に防ぐためのフラグ
        let isSubmitting = false;

        ui.submitBtn.onclick = async () => {
            // すでに送信処理中なら、その後のクリックは全て無視する
            if (isSubmitting) return;
            isSubmitting = true;

            ui.submitBtn.style.pointerEvents = "none";
            ui.submitBtn.innerText = "SENDING...";
            const name = nameInp.value.trim() || "PILOT";

            // stage変数が10で、かつisStageClearがtrueならクリア扱い
            let displayStage = stage;
            if (stage === 10 && isStageClear) {
                displayStage = "CLEAR"; // 文字列として送信（Firebaseは動的型なので通ります）
            }

            try {
                await window.firebaseOps.submitAndCleanup(score, displayStage, name);
                localStorage.setItem("neonGravity_last_name", name);
                ui.nameInputArea.style.display = "none";

                // ==========================================
                // ★追加：送信成功後にBGMをリセット（次のタイトルBGMへ繋ぐため）
                // ==========================================
                AudioSys.currentSrc = null;

                if (window.showRanking) {
                    window.showRanking(() => {
                        proceedToNextMenu();
                    });
                } else {
                    proceedToNextMenu();
                }
            } catch (e) {
                console.error(e);
                alert("Connection error. Please try again.");
                ui.submitBtn.style.pointerEvents = "auto";
                ui.submitBtn.innerText = "SUBMIT";

                // エラーが起きて再試行させるときだけフラグを解除する
                isSubmitting = false;
            }
        };

        ui.skipScoreBtn.onclick = (e) => {
            e.preventDefault();
            // ==========================================
            // ★追加：スキップ時もBGMをリセット
            // ==========================================
            AudioSys.currentSrc = null;
            proceedToNextMenu();
        };

    } catch (e) {
        console.error("Critical error in showGameOver:", e);
        // ==========================================
        // ★追加：エラーで抜ける時もBGMをリセット
        // ==========================================
        AudioSys.currentSrc = null;
        proceedToNextMenu();
    }
}

function proceedToNextMenu() {
    ui.nameInputArea.style.display = 'none';
    ui.overlay.style.display = 'flex';

    let titleHTML = `GAME OVER`;
    let titleColor = '#f00';

    if (isStageClear) {
        // クリア時はスコアを表示する
        titleHTML = `MISSION COMPLETE<br><span style="font-size:20px;color:#0ff;">SCORE: ${score.toLocaleString()}</span>`;
        titleColor = '#0ff';
    }

    ui.titleText.innerHTML = titleHTML;
    ui.titleText.style.color = titleColor;
    ui.titleText.style.textShadow = `0 0 20px ${titleColor}`;

    // ボタン設定
    ui.btnStart.innerText = 'RETRY';
    ui.btnStart.style.display = 'block';
    ui.btnStart.style.borderColor = titleColor;
    ui.btnStart.style.color = titleColor;

    // ★削除：ここの onclick 行を削除しました（下のイベントリスナーに任せるため）
    // ui.btnStart.onclick = () => resetGame();

    ui.btnTitle.style.display = 'block';
    ui.btnTitle.onclick = () => returnToTitle();

    ui.pauseBtn.style.display = 'none';

    const btnHowto = document.getElementById('btn-howto');
    if (btnHowto) btnHowto.style.display = 'none';

    const btnRanking = document.getElementById('btn-ranking');
    if (btnRanking) btnRanking.style.display = 'none';
    if (ui.btnOst) ui.btnOst.style.display = 'none';

    const btnStory = document.getElementById('btn-story');
    if (btnStory) btnStory.style.display = 'none';

    window.refreshMenuButtons();
}

function returnToTitle() {

    gameState = 'TITLE';

    AudioSys.fadeOutBGM().then(() => {
        AudioSys.currentSrc = null;
    });

    ui.ost.style.display = 'none';
    ui.overlay.style.display = 'flex';
    ui.controls.style.display = 'none';
    ui.msg.style.display = 'none';

    document.getElementById('training-guide').style.display = 'none';

    // ==========================================
    // ★追加：タイトル画面ではスコアやポーズボタンを完全に隠す
    // ==========================================
    ui.pauseBtn.style.display = 'none';
    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'none';

    ui.titleText.innerHTML = `NEON GRAVITY<br><span style="font-size:20px;color:#fff;">ORBITAL</span>`;
    ui.titleText.style.color = '#0ff';
    ui.titleText.style.textShadow = '0 0 20px #0ff';

    ui.btnStart.innerText = 'START GAME';
    ui.btnStart.style.display = 'block';
    ui.btnStart.style.borderColor = '#0ff';
    ui.btnStart.style.color = '#0ff';

    // ★削除：ここの onclick 行を削除しました
    // ui.btnStart.onclick = startGame;

    ui.btnOst.style.display = 'block';
    ui.btnTitle.style.display = 'none';

    const btnHowto = document.getElementById('btn-howto');
    if (btnHowto) {
        btnHowto.style.display = 'block';
        btnHowto.style.borderColor = '#0ff';
        btnHowto.style.color = '#0ff';
    }

    const btnStory = document.getElementById('btn-story');
    if (btnStory) {
        btnStory.style.display = 'block';
        btnStory.style.borderColor = '#0ff';
        btnStory.style.color = '#0ff';
    }

    const btnRanking = document.getElementById('btn-ranking');
    if (btnRanking) {
        btnRanking.style.display = 'block';
        btnRanking.style.borderColor = '#0ff';
        btnRanking.style.color = '#0ff';
        btnRanking.onclick = () => window.showRanking(null);
    }
    window.refreshMenuButtons();
}

function showEnding() {
    gameState = 'ENDING';
    //AudioSys.stopBGM();
    //AudioSys.playBGM('clear');

    bullets = []; enemyBullets = []; enemies = [];
    createExplosion(player.x, player.y, '#fff', 200);

    ui.controls.style.display = 'none';

    // ★追加：ここでもHUDを隠す
    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'none';

    ui.pauseBtn.style.display = 'none';

    // エンディング画面を表示
    ui.endingHud.style.display = 'flex';

    // HTMLの id="final-score-val" に合わせる
    const finalScoreElement = document.getElementById('final-score-val');
    if (finalScoreElement) {
        finalScoreElement.innerText = "TOTAL SCORE: " + score.toLocaleString();
    }

    // NEXTボタンのクリックイベント
    if (ui.btnNextResult) {
        ui.btnNextResult.onclick = () => {
            // ★ポイント1: 先に名前入力を「準備」してからエンディング画面を消す
            // これにより、画面が切り替わる瞬間にゲーム画面が露出するのを防ぎます
            showGameOver();
            ui.endingHud.style.display = 'none';
        };
    }

    window.refreshMenuButtons();
}

function triggerBossEncounter() {
    if (isBossWarning) return; // 二重発動防止

    isBossWarning = true;
    AudioSys.playSE('warning');

    // エリア中央へのベクトルを使って出現位置を決める（NaN防止）
    const centerX = worldSize / 2;
    const centerY = worldSize / 2;
    const dx = centerX - player.x;
    const dy = centerY - player.y;
    const distToCenter = Math.hypot(dx, dy) || 1;

    // プレイヤーから300px中央に寄った位置
    const spawnDist = 300;
    let tx = player.x + (dx / distToCenter) * spawnDist;
    let ty = player.y + (dy / distToCenter) * spawnDist;

    // 厳格なクランプ（マージンを多めにとる）
    const margin = 300;
    nextBossSpawnX = Math.max(margin, Math.min(worldSize - margin, tx));
    nextBossSpawnY = Math.max(margin, Math.min(worldSize - margin, ty));

    gameSpeed = 1;
    warningTimer = 180;
}


// =========================================================
// 5. メインループ (Main Loop)
// =========================================================
function loop() {

    requestAnimationFrame(loop);

    handleGamepadInput();

    if (gameState === 'PAUSED') return;
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, width, height);

    if (gameState === 'PLAYING') {
        update();
    } else if (gameState === 'DYING') {
        updateDying();

    } else if (gameState === 'GAMEOVER_UI' || gameState === 'ENDING') {
        updateParticlesAndRings(); // 爆発やリング
        updateGrid();              // グリッドのゆらぎ
        updateCrystals();           // スコアククリスタルの動き
        updateScorePopups();       // "+100" などの数字
    }

    draw();
}

function showHowTo() {
    gameState = 'HOWTO';
    titleIdleTimer = 0;
    ui.overlay.style.display = 'none';

    const howtoUI = document.getElementById('howto-overlay');
    howtoUI.style.display = 'flex';

    // ★追加：コントローラーがHOW TO画面のボタンを認識できるように更新
    if (window.refreshMenuButtons) {
        window.refreshMenuButtons(true);
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            howtoUI.style.opacity = '1';
        });
    });
}

function hideHowTo() {
    gameState = 'HOWTO_CLOSING'; // ★変更：フェードアウト中は「閉じている最中」という特別な状態にする
    titleIdleTimer = 0;

    const howtoUI = document.getElementById('howto-overlay');
    howtoUI.style.opacity = '0';

    setTimeout(() => {
        howtoUI.style.display = 'none';
        ui.overlay.style.display = 'flex';
        gameState = 'TITLE'; // ★変更：完全に画面が消えてからTITLE状態に戻す
        window.refreshMenuButtons();
    }, 500);
}

function resetTitleIdle() {
    if (gameState === 'TITLE') {
        return false;
    } else if (gameState === 'HOWTO') {
        return true;
    }
    return false;
}

// 各種イベントに入力監視をフックする
document.addEventListener('mousedown', resetTitleIdle);
document.addEventListener('touchstart', resetTitleIdle, { passive: true });



// HOWTO画面内の「ANY BUTTON TO RETURN」を実現するために、オーバーレイ自体をクリックしても閉じるように設定
document.getElementById('howto-overlay').onclick = hideHowTo;

function update() {


    // トレーニングモード用の制限と補充ロジック ▼▼▼
    if (isTrainingMode) {
        spawnedCount = 9999;
        enemiesToSpawn = 0;
        isBossWarning = false;
        warningTimer = 0;
        wormholes = [];

        // BOMB（サテライト）が減っていたら自動補充する
        if (player.satellites.length < 12) {
            player.satellites.push({
                x: player.x,
                y: player.y,
                angle: Math.random() * Math.PI * 2
            });
        }
    }

    // メッセージ フェードアウト処理 ▼▼▼
    if (stageMessageTimer > 0) {
        stageMessageTimer--;

        // タイマーが0になったらフェードアウト開始
        if (stageMessageTimer === 0) {
            if (!isBossWarning) {
                // フェードアウト用のトランジションを設定
                ui.msg.style.transition = "opacity 0.3s ease-in";

                // 次のフレームで透明度を0にする（確実にアニメーションさせるため）
                requestAnimationFrame(() => {
                    ui.msg.style.opacity = "0";
                });

                if (msgHideTimeout) clearTimeout(msgHideTimeout);

                msgHideTimeout = setTimeout(() => {
                    // まだ次のメッセージが出ていない（タイマーが0のまま）なら隠す
                    if (stageMessageTimer === 0 && !isBossWarning) {
                        ui.msg.style.display = 'none';
                    }
                    msgHideTimeout = null;
                }, 300);
            }
        }
    }


    // --- 警告演出の管理 ---
    if (isBossWarning) {
        warningTimer--;
        if (warningTimer <= 0) {
            isBossWarning = false;
            gameSpeed = 1.0;

            // 通常ステージのボス出現処理（Stage 9, 10以外）
            // ★修正: stage !== 10 を追加
            if (stage !== 9 && stage !== 20) {
                wormholes.unshift({ x: nextBossSpawnX, y: nextBossSpawnY, life: 300, maxLife: 300, active: true });
                spawnEnemy(nextBossSpawnX, nextBossSpawnY, 'boss');
                distortGrid(nextBossSpawnX, nextBossSpawnY, 250, 400);
            }
        }
    }

    // ==========================================
    // ★追加：スローモーションからの滑らかな復帰
    // ==========================================
    if (gameState === 'PLAYING' && !isBossWarning) {
        // ラスボス(Stage 10)撃破時のみ、劇的な超スローを維持してエンディングへ
        if (!(isStageClear && stage === MAX_STAGE)) {
            if (gameSpeed < 1.0) {
                gameSpeed += 0.005; // 毎フレーム少しずつ元の速度へ回復
                if (gameSpeed > 1.0) gameSpeed = 1.0;
            }
        }
    }

    frame++;

    // --- 追加: Stage 10 ボス出現管理 ---
    if (stage === 10 && !isBossSpawned) {
        // stage10Timer は startStage でリセットされ、毎フレーム加算されています
        // 4秒経過 (240フレーム) したら出現させる
        if (stage10Timer === 240) {
            spawnEnemy(worldSize / 2, worldSize / 2, 'battleship');
            isBossSpawned = true;
        }
    }


    // ==========================================
    // ★変更：Stage 10 BGMのバスドラム連動グリッド歪み
    // ==========================================
    if (stage === 10 && gameState === 'PLAYING') {
        stage10Timer++; // ★BGM再生開始からの時間をカウント

        let isBeat = false;
        const PSEUDO_BEAT_INTERVAL = 110;

        // ★変更：frame の代わりに stage10Timer を使い、4回未満の時だけ反応させる
        if (stage10BeatCount < 5 && stage10Timer % PSEUDO_BEAT_INTERVAL === 20) {
            isBeat = true;
            stage10BeatCount++; // 歪んだ回数をカウントアップ
        }

        if (isBeat) {
            // ラスボスが存在すればボスを中心に、いなければ画面中央を中心に歪ませる
            const boss = enemies.find(e => e.type === 'battleship');
            const targetX = boss ? boss.x : worldSize / 2;
            const targetY = boss ? boss.y : worldSize / 2;

            // ボスの鼓動のように空間を大きく歪ませる
            distortGrid(targetX, targetY, 250, 500);
        }
    }

    // --- プレイヤー座標の安全装置 ---
    if (!Number.isFinite(player.x)) { player.x = worldSize / 2; player.y = worldSize / 2; player.vx = 0; player.vy = 0; }

    // --- コントロール入力と移動 ---
    // ★ WASDキーに対応 (W=上, A=左, S=下, D=右)
    let mx = input.keys['KeyA'] ? -1 : input.keys['KeyD'] ? 1 : input.move.x;
    let my = input.keys['KeyW'] ? -1 : input.keys['KeyS'] ? 1 : input.move.y;

    const mag = Math.hypot(mx, my); if (mag > 1) { mx /= mag; my /= mag; }
    player.vx = mx * PLAYER_BASE_SPEED * SPEED_SCALE * gameSpeed;
    player.vy = my * PLAYER_BASE_SPEED * SPEED_SCALE * gameSpeed;
    player.x += player.vx;
    player.y += player.vy;

    // 履歴（飛行機雲用）の更新：位置と「その時の角度」を保存
    player.history.unshift({
        x: player.x,
        y: player.y,
        angle: player.angle
    });
    if (player.history.length > 10) player.history.pop();

    // 壁の衝突判定（自機）
    if (player.x < WALL_MARGIN) player.x = WALL_MARGIN; if (player.x > worldSize - WALL_MARGIN) player.x = worldSize - WALL_MARGIN;
    if (player.y < WALL_MARGIN) player.y = WALL_MARGIN; if (player.y > worldSize - WALL_MARGIN) player.y = worldSize - WALL_MARGIN;

    // --- 向きと射撃のロジック修正 ---
    // ★ 矢印キー（エイム）の入力取得
    let aimX = input.keys['ArrowLeft'] ? -1 : input.keys['ArrowRight'] ? 1 : 0;
    let aimY = input.keys['ArrowUp'] ? -1 : input.keys['ArrowDown'] ? 1 : 0;
    let isArrowAiming = (aimX !== 0 || aimY !== 0);

    // 1. 右スティック（エイム）が動いている場合はそちらを優先
    if (input.aim.active) {
        player.angle = Math.atan2(input.aim.y, input.aim.x);
    }
    // 2. ★ 矢印キーで狙っている場合、その方向を向く
    else if (isArrowAiming) {
        player.angle = Math.atan2(aimY, aimX);
    }
    // 3. 移動している場合は、移動方向を向く
    else if (Math.hypot(mx, my) > 0.1) {
        player.angle = Math.atan2(my, mx);
    }

    // ショット間隔（レーザー時は高速）
    const fireInterval = player.laserTimer > 0 ? 4 : 6;

    // ★ 矢印キー(Arrows) または 右スティック または Space/Z/Aボタン で射撃
    let isFiring = input.aim.active || isArrowAiming || input.keys['Space'] || input.keys['KeyZ'] || input.padAPressed;

    if (isFiring && frame % fireInterval === 0) {
        fire();
    }


    // =========================================================
    // ★変更: スポーン制御ロジック
    // =========================================================
    if (stage === 9) {
        // --- BOSS RUSH LOGIC ---
        const bossExists = enemies.some(e => e.type === 'boss');

        // 1. ボス出現管理
        if (!bossExists && rushBossIndex < 8) {
            rushIntervalTimer++;
            // 3秒(180F)待って次ボス出現
            if (rushIntervalTimer > 180) {
                rushIntervalTimer = 0;
                const cx = worldSize / 2;
                const cy = worldSize / 2;

                // ワームホール演出
                wormholes.push({ x: cx, y: cy, life: 300, maxLife: 300, active: true });
                distortGrid(cx, cy, 300, 500);

                // ボス生成
                spawnEnemy(cx, cy, 'boss');
                const newBoss = enemies[enemies.length - 1];
                if (newBoss && newBoss.type === 'boss') {
                    const variant = BOSS_VARIANTS[rushBossIndex];
                    newBoss.variant = variant;
                    newBoss.color = variant.color;
                    newBoss.hp = variant.hp * 1.5; // ラッシュ用にHP強化
                    newBoss.maxHp = newBoss.hp;
                    newBoss.scale = 1.5 + (variant.sides * 0.1);
                    newBoss.spawnMax = 150;
                    newBoss.isSpawning = true;
                }

                isBossSpawned = true;
                AudioSys.playSE('warning');
            }
        }

        // 2. 援護雑魚のスポーン（定数を使用して制御）
        if (bossExists &&
            enemies.length < BOSS_RUSH_SPAWN_CONFIG.MAX_ENEMIES &&
            frame % BOSS_RUSH_SPAWN_CONFIG.INTERVAL === 0) {

            const currentPool = STAGE_ENEMIES[rushBossIndex + 1] || STAGE_ENEMIES[1];
            const randomType = currentPool[Math.floor(Math.random() * currentPool.length)];

            const angle = Math.random() * Math.PI * 2;
            const dist = 600;
            const sx = Math.max(100, Math.min(worldSize - 100, player.x + Math.cos(angle) * dist));
            const sy = Math.max(100, Math.min(worldSize - 100, player.y + Math.sin(angle) * dist));

            // ワームホール生成
            wormholes.push({ x: sx, y: sy, life: 100, maxLife: 100, active: true });

            // 指定した数だけ敵を生成
            setTimeout(() => {
                if (gameState === 'PLAYING' && stage === 9) {
                    for (let i = 0; i < BOSS_RUSH_SPAWN_CONFIG.SPAWN_COUNT; i++) {
                        // 少し位置をずらして生成
                        const ox = (Math.random() - 0.5) * 20;
                        const oy = (Math.random() - 0.5) * 20;
                        spawnEnemy(sx + ox, sy + oy, randomType);
                    }
                }
            }, BOSS_RUSH_SPAWN_CONFIG.WARP_DELAY);
        }

    } else if (stage === 10) {
        // ★追加: Stage 10 はランダムスポーンを一切行わない
        // (ボスはstartStageで生成済み、雑魚召喚はupdateEternityCoreAIで行う)

    } else {
        // --- 通常ステージ (1-8) のスポーンロジック ---
        const maxWormholes = SPAWN_SETTINGS.MAX_WORMHOLES_BASE + stage * 1.5;
        const activeWormholes = wormholes.filter(w => w.active).length;
        const currentMaxOnScreen = STAGE_MAX_ON_SCREEN[stage - 1] || 40;

        // ★修正1: ボス戦闘中(ボスが存在している間)は、ノルマを無視してワームホールを生成する
        const bossExists = enemies.some(e => e.type === 'boss' || e.type === 'battleship');
        const canSpawnWormhole = (spawnedCount < enemiesToSpawn) || (isBossSpawned && bossExists);

        let shouldSpawnWormhole = !isBossWarning && canSpawnWormhole && activeWormholes < maxWormholes && enemies.length < currentMaxOnScreen && Math.random() < SPAWN_SETTINGS.WORMHOLE_CHANCE;
        if (enemies.length === 0 && activeWormholes === 0 && canSpawnWormhole) shouldSpawnWormhole = true;
        if (shouldSpawnWormhole) spawnWormhole();
    }

    // --- ワームホールの更新 ---
    wormholes.forEach((w) => {
        w.life--;
        if (w.active) {
            if (stage !== 9 && stage !== 10 && w.life > 60 && w.life % SPAWN_SETTINGS.SPAWN_INTERVAL === 0) {
                const remaining = enemiesToSpawn - spawnedCount;
                const threshold = enemiesToSpawn * 0.2;

                // ボス出現判定
                if (!isBossSpawned) {
                    if (remaining <= threshold || spawnedCount >= enemiesToSpawn) {
                        triggerBossEncounter();
                        isBossSpawned = true;
                        return;
                    }
                }

                // ボス戦闘中も雑魚を出し続ける
                const bossExists = enemies.some(e => e.type === 'boss');
                if (spawnedCount < enemiesToSpawn || bossExists) {
                    if (Math.random() < 0.15) {
                        spawnEnemy(w.x, w.y, 'cube');
                    } else {
                        const currentPool = STAGE_ENEMIES[stage] || STAGE_ENEMIES[7];
                        const randomType = currentPool[Math.floor(Math.random() * currentPool.length)];
                        spawnEnemy(w.x, w.y, randomType);
                    }
                }
            }
            if (w.life <= 0) w.active = false;

            // プレイヤーの吸い込み効果
            const dx = player.x - w.x; const dy = player.y - w.y;
            const d = Math.hypot(dx, dy) || 0.01;
            if (d < 180) {
                const f = 500 / (d + 1);
                player.x += (dx / d) * f * 0.01 * SPEED_SCALE * gameSpeed;
                player.y += (dy / d) * f * 0.01 * SPEED_SCALE * gameSpeed;
            }

            // ==========================================
            // ★追加：ワームホールによる背景グリッドの持続的な歪み（重力場）
            // ==========================================
            // 毎フレームやると重い＆歪みすぎるので2フレームに1回実行
            if (frame % 2 === 0 && typeof distortGrid === 'function') {

                // マイナスの力を与えることで、内側に吸い込む「引力」を作る
                // 少しSin波を混ぜて、穴が脈動している（ウネウネしている）ように見せる
                // 振幅が5（強め）、速度が0.1（早め）
                //let pullForce = -15 + Math.sin(frame * 0.1) * 5;
                let pullForce = -15 + Math.sin(frame * 0.07) * 2;

                // 消滅間近（残り60フレーム以下）は徐々に引力を弱めて空間を元に戻す
                if (w.life < 60) {
                    pullForce *= (Math.max(0, w.life) / 60);
                }

                // 半径250pxのグリッドを中心へ引き寄せる
                distortGrid(w.x, w.y, pullForce, 250);
            }
        }
    });
    wormholes = wormholes.filter(w => w.life > -60);

    // --- サテライトの更新 ---
    player.satellites.forEach((s, i) => {
        s.angle = (s.angle || 0) + 0.15;
        const rad = 45 * G_SCALE;
        const off = (Math.PI * 2 / player.satellites.length) * i;
        s.x = player.x + Math.cos(s.angle + off) * rad; s.y = player.y + Math.sin(s.angle + off) * rad;
    });

    // --- 各種エンティティ・システムの更新 ---
    updateEntities();
    updateGrid();
    updateScorePopups();
    checkStageClear();

    // カメラ更新
    updateCamera();

    updateUI();
}

function updateCamera() {
    let targetScale = 1.0;
    let focusX = player.x;
    let focusY = player.y;

    // 通常のボス、またはラスボスを探す
    const boss = enemies.find(e => e.type === 'boss' || e.type === 'battleship');

    if (boss && Number.isFinite(boss.x) && Number.isFinite(boss.y)) {
        // 1. タイマーの進行（出現に合わせて滑らかにズームするため）
        const smoothMax = (boss.spawnMax || 100) + 20;
        if (boss.cameraLerpTimer === undefined) boss.cameraLerpTimer = 0;

        if (boss.cameraLerpTimer < smoothMax) {
            boss.cameraLerpTimer++;
        }

        const t = boss.cameraLerpTimer / smoothMax;
        const camT = 1 - Math.pow(1 - t, 4); // 滑らかなイージング

        const dist = Math.hypot(player.x - boss.x, player.y - boss.y) || 0.1;
        const maxDist = 1500;
        const ratio = Math.min(dist / maxDist, 1.0);

        // 2. ズーム目標値の計算
        // 引きすぎると操作しづらいため、最大でも0.65倍程度のマイルドなズームアウトに留める
        targetScale = 1.0 - (ratio * 0.35 * camT);

        // 3. フォーカス位置のブレンド
        // プレイヤーとボスの中間地点を少しだけ注視する
        // biasを0.25と控えめにすることで、自機中心の操作感を崩さずにボスを視界に入れる
        const bias = ratio * 0.25 * camT;
        focusX = player.x + (boss.x - player.x) * bias;
        focusY = player.y + (boss.y - player.y) * bias;
    }

    const finalTargetScale = targetScale * baseAppScale;

    // 4. スケールのスムージング
    cameraScale += (finalTargetScale - cameraScale) * 0.05 * gameSpeed;

    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    // 5. 最終目標座標の算出（自機が画面の中央・やや下に来るように）
    let tx = focusX - viewW / 2;
    let ty = focusY - viewH * CAMERA_Y_OFFSET;

    // ==========================================
    // 6. 境界クランプ処理（画面端でカメラを止める、ワープ防止）
    // ==========================================
    let padX = 150 / baseAppScale;
    let padY = 125 / baseAppScale;
    if (height > width) { padX = 0; } else { padY = 0; }

    const limitMinX = -padX;
    const limitMaxX = worldSize - viewW + padX;

    // X軸の境界計算
    if (limitMinX <= limitMaxX) {
        tx = Math.max(limitMinX, Math.min(limitMaxX, tx));
    } else {
        tx = (worldSize - viewW) / 2;
    }

    const limitMinY = -padY;
    const limitMaxY = worldSize - viewH + padY;

    // Y軸の境界計算
    if (limitMinY <= limitMaxY) {
        ty = Math.max(limitMinY, Math.min(limitMaxY, ty));
    } else {
        ty = (worldSize - viewH) / 2;
    }

    // 7. カメラ座標のスムージング（追従スピード）
    camera.x += (tx - camera.x) * 0.1 * gameSpeed;
    camera.y += (ty - camera.y) * 0.1 * gameSpeed;
}

function updateDying() {
    dyingTimer--;

    if (dyingTimer === 135) {
        ui.msg.style.opacity = "0";
    }
    if (dyingTimer === 120) {
        // ★共通関数を使用し、ゲームオーバーだけ文字を少し大きく
        showMessage("GAME OVER", 'red');
        ui.msg.style.fontSize = "calc(32px * var(--ui-scale, 1))";
    }

    if (dyingTimer === 20) {
        ui.msg.style.opacity = "0";
    }

    if (gameSpeed < 1.0) {
        gameSpeed += 0.005;
    }

    camera.x += (Math.random() - 0.5) * 10 * gameSpeed;
    camera.y += (Math.random() - 0.5) * 10 * gameSpeed;

    updateGrid();
    updateParticlesAndRings();
    updateEnemyBullets();
    updateEnemiesForDying();
    updateScorePopups();
    updateCrystals();

    if (dyingTimer <= 0) {
        gameSpeed = 1.0;
        ui.msg.style.display = 'none';
        showGameOver();
    }
}

function updateEnemiesForDying() {
    enemies.forEach(e => {
        // 自機から敵機へのベクトル（逃げる方向）
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const d = Math.hypot(dx, dy) || 0.001;

        // 離脱ベクトルを計算（徐々に加速して去っていく）
        const escapeSpeed = e.speed * 1.5; // 離脱なので少し速めに
        e.vx += (dx / d) * 0.1;
        e.vy += (dy / d) * 0.1;

        // 速度制限をかけつつ更新
        const cv = Math.hypot(e.vx, e.vy);
        if (cv > escapeSpeed) {
            e.vx = (e.vx / cv) * escapeSpeed;
            e.vy = (e.vy / cv) * escapeSpeed;
        }

        e.x += e.vx;
        e.y += e.vy;

        // 進行方向を向かせる
        e.angle = Math.atan2(e.vy, e.vx);

        // 各種演出の更新（しっぽやパーツ回転）
        if (e.type === 'dragon') {
            let lx = e.x, ly = e.y;
            e.segments.forEach(s => {
                const dd = Math.hypot(lx - s.x, ly - s.y);
                if (dd > 10) { s.x += (lx - s.x) * 0.3; s.y += (ly - s.y) * 0.3; }
                lx = s.x; ly = s.y;
            });
        }
        if (e.type === 'tadpole') {
            e.history.unshift({ x: e.x, y: e.y });
            if (e.history.length > 60) e.history.pop();
        }
        if (e.type === 'triangle' || e.type === 'cube') {
            e.rotX += 0.1; e.rotY += 0.1;
        }
    });
}

// =========================================================
// 6. プレイヤー・武器制御 (Player & Weapon Systems)
// =========================================================
function fire() {
    if (player.laserTimer > 0) {
        lasers.push({ x: player.x, y: player.y, angle: player.angle, life: 5, width: 40 });
        AudioSys.playSE('laser'); distortGrid(player.x, player.y, 20, 60); return;
    }

    const s = BULLET_CONFIG.PLAYER.SPEED * SPEED_SCALE;
    // レベルごとの発射角度オフセット設定（0 = 前方、Math.PI = 後方）
    const shotPatterns = {
        1: [0.08, -0.08], // 2way
        2: [0.15, 0, -0.15], // 3way(前のみ)
        3: [0.15, 0, -0.15, Math.PI], // 4way(前3 後1)
        4: [0.15, 0, -0.15, Math.PI - 0.15, Math.PI + 0.15], // 5way(前3 後2)
        5: [0.2, 0.07, -0.07, -0.2, Math.PI - 0.15, Math.PI + 0.15], // 6way(前4 後2)
        6: [0.2, 0.07, -0.07, -0.2, Math.PI - 0.15, Math.PI + 0.15, Math.PI / 2, -Math.PI / 2], // 7way(前4 後2 左右1ずつ)
        7: [0.25, 0.12, 0, -0.12, -0.25, Math.PI - 0.15, Math.PI + 0.15, Math.PI / 2, -Math.PI / 2] // 8way(前5後2 左右1ずつ)
    };

    // 現在のレベルのパターンを取得（最大レベルを超えないように制限）
    const currentPattern = shotPatterns[player.weaponLevel] || shotPatterns[1];

    currentPattern.forEach(offset => {
        const a = player.angle + offset;
        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: BULLET_CONFIG.PLAYER.LIFE
        });
    });

    AudioSys.playSE('shoot'); distortGrid(player.x, player.y, 10, 40);
}

function launchSatellites() {
    // サテライト（回収したクリスタル）がなければ発動しない
    if (!player.satellites || player.satellites.length === 0) return;

    // ==========================================
    // 1. 攻撃範囲（半径）の計算（見えている範囲に制限）
    // ==========================================
    const crystalCount = player.satellites.length;

    // 現在のカメラで見えている画面の幅と高さを取得
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    // 画面の「長辺の半分強」（＝画面の四隅ギリギリに届くくらいの半径）を最大値とする
    const maxRadius = Math.max(viewW, viewH) * 0.5;

    const baseRadius = 50; // 基本の攻撃半径（初期は自機の周辺のみ）

    // クリスタル最大数(12個)の時に、ちょうど maxRadius になるように1個あたりの増加量を自動計算
    const bonusPerCrystal = (maxRadius - baseRadius) / 12;

    const bombRadius = baseRadius + (crystalCount * bonusPerCrystal);

    AudioSys.playSE('explode_large'); // 爆発音

    // ==========================================
    // 2. 敵を一掃する
    // ==========================================
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        // 出現中のボス・戦艦はすり抜ける（無敵）
        if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) continue;

        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist <= bombRadius) {
            if (e.type === 'boss' || e.type === 'battleship' || e.type === 'dragon') {
                // ボス級にはクリスタル数に応じたダメージ（少しマイルドに調整）
                e.hp -= crystalCount * 2;
                e.flashTimer = 10;
                createExplosion(e.x, e.y, '#ff0', 8);
            } else {
                // 雑魚敵は即死
                e.hp = 0;
                e.noDrop = true; // ボムで倒した時はアイテムを出さない
                createExplosion(e.x, e.y, e.color, 10);
            }
        }
    }

    // ==========================================
    // 3. 敵の弾も範囲内なら消し去る
    // ==========================================
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        const dist = Math.hypot(eb.x - player.x, eb.y - player.y);
        if (dist <= bombRadius) {
            createExplosion(eb.x, eb.y, eb.color || '#fff', 2);
            enemyBullets.splice(i, 1);
        }
    }

    // ==========================================
    // 4. 巨大な波紋エフェクトを登録する
    // ==========================================
    rings.push({
        x: player.x,
        y: player.y,
        r: 10,                 // 初期半径
        targetR: bombRadius,   // 目標半径
        color: '#0ff',         // ネオンシアン
        life: 1.0,             // 寿命 (1.0 = 100%)
        isBomb: true           // ボム用フラグ
    });

    // 空間を大きく歪ませる演出
    if (typeof distortGrid === 'function') {
        distortGrid(player.x, player.y, bombRadius * 0.5, bombRadius);
    }

    // ==========================================
    // 5. サテライト（クリスタル）を全て消費する
    // ==========================================
    player.satellites = [];
}

function damage(v) {
    player.shield -= v;
    player.invuln = 60;

    const shieldPercent = Math.max(0, (player.shield / PLAYER_BASE_SHIELD) * 100);
    ui.shieldBar.style.width = shieldPercent + "%";

    AudioSys.playSE('damage');
    distortGrid(player.x, player.y, 50, 100);

    if (player.shield <= 0) {
        gameState = 'DYING';
        AudioSys.stopSE('warning');

        // ★共通関数を使用（これだけ少し光を弱くする）
        showMessage("SHIELD LOST", 'red');
        ui.msg.style.opacity = "0";
        ui.msg.style.textShadow = "0 0 5px #f00";
        setTimeout(() => { ui.msg.style.opacity = "1"; }, 10);

        player.invuln = 0;
        player.laserTimer = 0;
        gameSpeed = 0.1;
        dyingTimer = 300;

        bullets = []; lasers = []; missiles = [];
        createExplosion(player.x, player.y, '#0f8', 200);

        AudioSys.playSE('explode_large');
        distortGrid(player.x, player.y, 300, 500);
    }
}

function updatePlayerStatus() { if (player.invuln > 0) player.invuln--; }


// =========================================================
// 7. 敵機生成と共通AI (Enemy Spawning & Common AI)
// =========================================================
function spawnWormhole() {

    if (isStageClear) return;
    if (stage === 9 && rushBossIndex >= 8) return;
    if (stage !== 9 && isBossSpawned && !enemies.some(e => e.type === 'boss' || e.type === 'battleship')) return;

    wormholes.push({
        x: WALL_MARGIN + 100 + Math.random() * (worldSize - WALL_MARGIN * 2 - 200),
        y: WALL_MARGIN + 100 + Math.random() * (worldSize - WALL_MARGIN * 2 - 200),
        life: 400, maxLife: 400, active: true
    });
    distortGrid(wormholes[wormholes.length - 1].x, wormholes[wormholes.length - 1].y, 50, 150);
}

function spawnEnemy(x, y, type, size = 1, overrideColor = null) {

    if (isStageClear) return;
    if (stage === 9 && rushBossIndex >= 8) return;
    if (stage !== 9 && isBossSpawned && type !== 'boss' && type !== 'battleship') {
        const bossExists = enemies.some(e => e.type === 'boss' || e.type === 'battleship');
        if (!bossExists) return; // ボスが既に死んでいるなら雑魚は出さない
    }

    const spd = SPEED_SCALE;
    const stageMag = 1.0 + (stage - 1) * DIFFICULTY_CONFIG.SPEED_INC;
    const hpMag = (stage - 1) * DIFFICULTY_CONFIG.HP_INC;

    const angle = Math.random() * Math.PI * 2;
    const bSpd = 5.0 * spd;
    const vx = Math.cos(angle) * bSpd;
    const vy = Math.sin(angle) * bSpd;

    // -----------------------------------------------------
    // ★修正：アイテムドロップ決定ロジック (整理版)
    // -----------------------------------------------------
    let dropType = 'crystal'; // デフォルト
    const rnd = Math.random();

    // 1. 【最優先】レベルアップアイテム (条件付き)
    if (levelItemsDroppedInStage < 2 && player.weaponLevel < MAX_WEAPON_LEVEL && rnd < DROP_RATES.LEVEL) {
        dropType = 'level';
        levelItemsDroppedInStage++; // ★出現したらカウントを増やす
    }
    // 2. その他のアイテム抽選 (レベルアップが出なかった場合)
    else {
        const subRnd = Math.random();
        // ピンチかどうかで回復率を変える
        const shieldChance = (player.shield < 30) ? DROP_RATES.SHIELD_LOW : DROP_RATES.SHIELD_NORM;

        // 確率の積み上げ判定
        if (subRnd < DROP_RATES.LASER) {
            dropType = 'laser';
        }
        else if (subRnd < DROP_RATES.LASER + DROP_RATES.INVINCIBLE) {
            dropType = 'invincible';
        }
        else if (subRnd < DROP_RATES.LASER + DROP_RATES.INVINCIBLE + shieldChance) {
            dropType = 'shield';
        }
        // それ以外は 'crystal' のまま
    }

    if (type === 'dragon') {
        enemies.push({
            x: x, y: y, vx: vx, vy: vy,
            hp: 8 + hpMag * 2,
            speed: ENEMY_SPEEDS.DRAGON * spd * stageMag,
            color: '#c00', type: 'dragon',
            angle: Math.atan2(vy, vx), // 初速に合わせた角度を設定
            segments: [],
            drop: 'none',
            scale: 0.9, fireTimer: 0
        });

        const segmentCount = 8;
        const initialAngle = Math.atan2(vy, vx);
        for (let i = 0; i < segmentCount; i++) {
            // 全ての節に初期座標と進行方向の角度をセット
            enemies[enemies.length - 1].segments.push({
                x: x,
                y: y,
                angle: initialAngle
            });
        }
        spawnedCount++;
    } else if (type === 'cube') {
        // アイテムキャリア（Cube）はドロップ確定
        enemies.push({
            x, y, vx, vy,
            hp: 2 + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.CUBE * spd * stageMag,
            color: '#0f0', type: 'cube', angle: 0,
            drop: dropType, // ここで決定したドロップを適用
            scale: 0.8, rotX: 0, rotY: 0
        });
        spawnedCount++;
    } else if (type === 'tadpole') {
        enemies.push({
            x: x, y: y, vx: vx, vy: vy,
            hp: 1,
            speed: ENEMY_SPEEDS.TADPOLE * spd * stageMag,
            color: '#0ff',
            type: 'tadpole', angle: 0,
            drop: 'none',
            scale: 0.6, history: []
        });
        spawnedCount++;
    } else if (type === 'triangle') {
        // フォーメーションパターンの定義
        const patterns = ['V', 'W', 'H'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const initialAngle = Math.atan2(vy, vx);

        // ==========================================
        // ★ 修正：色指定の確実な継承
        // 引数 overrideColor が指定されている場合はそれを使用し、
        // なければランダムに選ぶ
        // ==========================================
        let selectedColor;
        let selectedFormationType = 'custom'; // デフォルトはカスタム扱い

        if (overrideColor) {
            selectedColor = overrideColor;
        } else {
            const formationTypes = ['blue', 'purple', 'yellow'];
            selectedFormationType = formationTypes[Math.floor(Math.random() * formationTypes.length)];
            const colorMap = {
                blue: '#00f0ff',
                purple: '#bf00ff',
                yellow: '#ffdf00'
            };
            selectedColor = colorMap[selectedFormationType];
        }
        // ==========================================

        // --- 1. リーダー（中心機）の生成 ---
        const leader = {
            x: x, y: y, vx: vx, vy: vy,
            hp: 1 + Math.floor(hpMag * 0.5),
            speed: ENEMY_SPEEDS.TRIANGLE * spd * stageMag,
            color: selectedColor, // ★ リーダーの色をセット
            type: 'triangle',
            formationType: selectedFormationType,
            angle: initialAngle,
            drop: dropType,
            scale: 0.1,
            isLeader: true,
            followers: [],
            isWarping: true,
            warpPercent: 0,
            rotX: Math.random() * Math.PI,
            rotY: Math.random() * Math.PI,
            rotZ: Math.random() * Math.PI
        };
        enemies.push(leader);
        spawnedCount += 0.2;

        // --- 2. 取り巻き（フォロワー）の生成 ---
        // リーダーを中心に左右2台ずつ、計4台を配置
        for (let i = 0; i < 4; i++) {
            if (spawnedCount >= enemiesToSpawn) break;

            let offX = 0, offY = 0;
            const side = (i % 2 === 0) ? 1 : -1; // 左右交互 (1 or -1)
            const step = Math.floor(i / 2) + 1; // 1段目 or 2段目

            if (pattern === 'V') {
                // V型: 後方に広がる (リーダーが先端)
                offX = -step * 25;
                offY = side * step * 25;
            }
            else if (pattern === 'W') {
                // W型: リーダーを中心にジグザグ配置
                offX = (step === 1) ? -25 : 0; // 1段目は後ろ、2段目は真横
                offY = side * step * 25;
            }
            else if (pattern === 'H') {
                // H型: 縦に並ぶ二列の中央にリーダー
                offX = (step === 1) ? 25 : -25; // 前後に配置
                offY = side * 25; // 左右幅は固定
            }

            enemies.push({
                x: x, y: y, vx: vx, vy: vy,
                hp: 1,
                speed: ENEMY_SPEEDS.TRIANGLE * spd * stageMag,
                color: selectedColor, // ★ フォロワーにも「同じ色」をセット
                type: 'triangle',
                formationType: selectedFormationType,
                angle: initialAngle,
                drop: 'none',
                scale: 0.1,
                leader: leader,
                formOffset: { x: offX, y: offY },
                isWarping: true,
                warpPercent: 0,
                rotX: Math.random() * Math.PI,
                rotY: Math.random() * Math.PI,
                rotZ: Math.random() * Math.PI
            });
            leader.followers.push(enemies[enemies.length - 1]);
            spawnedCount += 0.2;
        }

    } else if (type === 'boss') {
        const variantIndex = (stage - 1) % BOSS_VARIANTS.length;
        const variant = BOSS_VARIANTS[variantIndex];
        const bossHp = variant.hp + (stage - 1) * 10;

        const sX = Number(x);
        const sY = Number(y);

        enemies.push({
            x: sX, y: sY,
            spawnX: sX, spawnY: sY,
            vx: 0, vy: 0,
            hp: bossHp, maxHp: bossHp,
            speed: 1.2 * variant.speedFactor * SPEED_SCALE * (1.0 + (stage - 1) * 0.08),
            color: variant.color,
            type: 'boss', variant: variant,
            angle: 0,
            drop: 'shield',
            scale: 1.5 + (variant.sides * 0.1),
            fireTimer: 0, flashTimer: 0,
            spawnTimer: 0, spawnMax: 150,
            isSpawning: true,
            // ★追加：カメラ補間専用タイマー（isSpawningが消えても止まらない）
            cameraLerpTimer: 0
        });
        spawnedCount++;
        // bubble か asteroid (rock) の共通処理
    } else if (type === 'bubble' || type === 'asteroid') {
        const sizeFactor = 1.0 + (stage - 1) * 0.1;
        const hp = (size === 1 ? 4 : size === 2 ? 2 : 1) + Math.floor((stage - 1) * 0.5);
        const baseScale = size === 1 ? 1.8 : size === 2 ? 1.1 : 0.6;
        const finalScale = baseScale * sizeFactor;

        // スピード定数の選択 (typeによって切り替え)
        const baseSpdConst = (type === 'bubble') ? ENEMY_SPEEDS.BUBBLE : ENEMY_SPEEDS.ASTEROID;
        const moveSpeed = (baseSpdConst * 0.7) * (1 + size * 0.4) * spd * stageMag;
        const ang = Math.random() * Math.PI * 2;

        enemies.push({
            x: x, y: y,
            vx: Math.cos(ang) * moveSpeed,
            vy: Math.sin(ang) * moveSpeed,
            hp: hp,
            speed: moveSpeed,
            color: (type === 'bubble') ? '#0ff' : '#fff',
            type: type,      // 'bubble' か 'asteroid'
            variant: (type === 'bubble') ? 'bubble' : 'asteroid', // 見た目の指定
            size: size,
            angle: Math.random() * Math.PI * 2,
            rotSpd: (Math.random() - 0.5) * 0.1,
            scale: finalScale,
            drop: 'none',
            spawnTimer: 0,
            trackingStart: 300 + Math.random() * 200,
            isTracking: false
        });

    } else if (type === 'hunter') {
        enemies.push({
            x: x, y: y, vx: vx * 0.5, vy: vy * 0.5,
            hp: 3 + Math.floor(hpMag * 1.5),
            speed: ENEMY_SPEEDS.HUNTER * spd * stageMag,
            color: '#fa4',
            type: 'hunter',
            angle: 0,
            drop: dropType,
            scale: 1.2,
            actionTimer: 0,
            state: 'approach', // 初期状態を 'approach' (接近) に設定
            burstCount: 0      // ★追加：連射数カウント用
        });
        spawnedCount++;
        // spawnEnemy関数内の最後の方に追加
    } else if (type === 'battleship') {
        // BOSS_VARIANTS の一番最後の要素（GENESIS-ARK）を取得
        const variant = BOSS_VARIANTS[BOSS_VARIANTS.length - 1];

        enemies.push({
            x: x, y: y,
            spawnX: x, spawnY: y,
            vx: 0, vy: 0,
            hp: variant.hp,
            maxHp: variant.hp,
            // 定数の speedFactor を適用（超重厚な動き）
            speed: variant.speedFactor * SPEED_SCALE,
            color: variant.color,
            type: 'battleship',
            angle: 0,
            drop: 'none',
            scale: 1.0,

            fireTimer: 0,
            flashTimer: 0,
            spawnTimer: 0,
            spawnMax: 240,
            isSpawning: true,

            // variant 情報をそのまま持たせる
            variant: variant
        });
        spawnedCount++;

        if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_large');
    } else if (type === 'phantom') {
        enemies.push({
            x: x, y: y, vx: vx * 0.5, vy: vy * 0.5,
            hp: 4 + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.PHANTOM * spd * stageMag,
            color: '#0ff',
            type: 'phantom',
            angle: 0,
            drop: dropType,
            scale: 1.0,
            state: 'stealth', // 状態管理：stealth, appear, dash
            timer: 0,
            alpha: 0.1, // 初期はほぼ透明
            trail: []
        });
        spawnedCount++;
    } else if (type === 'eclipse') {
        // --- ★追加：出現制限ロジック ---
        const MIN_DISTANCE = 600; // Eclipse同士の最低間隔（ピクセル）

        // 既に存在している Eclipse との距離をチェック
        const tooClose = enemies.some(other => {
            if (other.type === 'eclipse') {
                const dist = Math.hypot(x - other.x, y - other.y);
                return dist < MIN_DISTANCE;
            }
            return false;
        });

        // 近すぎる場合は、今回の出現を中止する
        if (tooClose) return;

        // --- ここから通常の出現処理 ---
        enemies.push({
            x: x, y: y, vx: vx * 0.2, vy: vy * 0.2,
            hp: 24 + hpMag * 5,
            speed: ENEMY_SPEEDS.ECLIPSE * spd * stageMag,
            color: '#0ff',
            type: 'eclipse',
            angle: 0,
            rotSpeed: 0.02,
            drop: dropType,
            scale: 1.5,
            actionTimer: 0
        });
        spawnedCount++;
    } else if (type === 'jellyfish' || type === 'spark_jelly') {
        const isSpark = (type === 'spark_jelly');

        enemies.push({
            x: x, y: y, vx: vx * 0.1, vy: vy * 0.1,
            hp: (isSpark ? 4 : 2) + Math.floor(hpMag * 1.5),
            speed: ENEMY_SPEEDS.JELLYFISH * spd * stageMag * (isSpark ? 1.2 : 1.0),
            color: '#0ff', // ★変更: すべてシアン（#0ff）に統一
            type: 'jellyfish',
            variant: isSpark ? 'spark' : 'normal',
            angle: angle,
            prevAngle: angle,
            bend: 0,
            drop: dropType,
            scale: isSpark ? 1.4 : 1.2,
            timer: Math.random() * 100,
            canFire: true,
            chargeLevel: 0
        });
        spawnedCount++;
    } else if (type === 'sentinel') {
        enemies.push({
            x: x, y: y, vx: 0, vy: 0,
            hp: 3 + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.SENTINEL * spd * stageMag,
            color: '#ff3366', // 鮮やかなネオンピンク
            type: 'sentinel',
            angle: 0,
            drop: dropType,
            scale: 1.1,
            timer: Math.random() * 100, // 個体ごとにタイミングをずらす
            orbitDist: 200 + Math.random() * 100, // プレイヤーとの距離
            orbitDir: Math.random() > 0.5 ? 1 : -1, // 右回りか左回りか
            state: 'orbit' // orbit: 周回, scan: 照準, fire: 発射
        });
        spawnedCount++;
    } else if (type === 'island') {
        const islandId = Date.now() + Math.random(); // 親子関係紐付け用ID
        const islandScale = 2.0 + Math.random() * 1.0;

        // 1. 大陸本体（動かない障害物）
        enemies.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            hp: 50 + (hpMag * 5),
            speed: 0,
            color: '#444', // 岩のようなダークグレー
            type: 'island',
            islandId: islandId,
            scale: islandScale,
            angle: Math.random() * Math.PI * 2, // 固定角度
            drop: 'crystal',
            rotSpeed: 0 // 回転しない
        });
        spawnedCount++;

        // 2. その上の砲台（3〜5個程度ランダムに配置）
        const turretCount = 3 + Math.floor(Math.random() * 3);
        // 大陸の半径（概算）
        const islandRadius = 40 * islandScale;

        for (let i = 0; i < turretCount; i++) {
            // 大陸の上にランダム配置（中心から少し離す）
            const offsetAng = (Math.PI * 2 / turretCount) * i + (Math.random() * 0.5);
            const dist = islandRadius * (0.4 + Math.random() * 0.4);

            enemies.push({
                x: x + Math.cos(offsetAng) * dist,
                y: y + Math.sin(offsetAng) * dist,
                vx: 0,
                vy: 0,
                hp: 5 + hpMag,
                speed: 0,
                color: '#f00',
                type: 'turret',
                parentIslandId: islandId, // 親の大陸が消えたら自分も消える用
                angle: 0, // 砲身の向き
                fireTimer: Math.random() * 120,
                scale: 0.8,
                drop: 'none'
            });
        }
    }
    // --- (追加ここまで) ---
}



function updateEnemies() {
    // 現在の表示範囲（カメラ位置＋画面サイズ）
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    // 攻撃や当たり判定を許可するマージン（画面外200pxまで）
    const ACTIVE_MARGIN = 200;

    // ========================================================
    // ★本来の撃破処理をまとめた関数
    // ========================================================
    const executeRealDeath = (e) => {
        // ラスボス撃破演出
        if (e.type === 'battleship') {
            gameSpeed = 0.05; // 完全撃破時にさらに超スローにする
            bullets = [];
            enemyBullets = [];
            createExplosion(e.x, e.y, '#fff', 200);

            // ==========================================
            // ★変更：大爆発で大量の装甲破片を画面の端まで吹き飛ばす
            // ==========================================
            // 数を60個に増量
            for (let i = 0; i < 60; i++) {
                const shardAngle = Math.random() * Math.PI * 2;
                // スローモーションに負けないよう、初速を以前の約2.5倍に強化
                const shardSpeed = (30 + Math.random() * 50) * SPEED_SCALE;

                // 中心の一点からではなく、少し広い範囲から発生させて広がり感を出す
                const offsetDist = Math.random() * 120;
                const startX = e.x + Math.cos(shardAngle) * offsetDist;
                const startY = e.y + Math.sin(shardAngle) * offsetDist;

                particles.push({
                    x: startX,
                    y: startY,
                    vx: Math.cos(shardAngle) * shardSpeed,
                    vy: Math.sin(shardAngle) * shardSpeed,
                    color: Math.random() > 0.5 ? '#fff' : '#0ff',
                    life: 1.5 + Math.random(), // 寿命を長くして画面外まで飛ばす
                    size: 0.5 + Math.random(), // 少し大きめの破片も混ぜる
                    isShard: true,
                    shardType: 'tri',
                    angle: shardAngle,
                    rotV: (Math.random() - 0.5) * 1.2 // 回転も少し激しく
                });
            }

            if (typeof AudioSys !== 'undefined') {
                AudioSys.playSE('explode_large');
                if (AudioSys.bgmEl) {
                    AudioSys.bgmEl.pause();
                }
                AudioSys.playBGM('clear');
            }
        }

        // --- 分裂処理の修正 ---
        if ((e.type === 'asteroid' || e.type === 'bubble') && e.size < 3 && !e.noSplit) {
            for (let i = 0; i < 2; i++) {
                spawnEnemy(e.x, e.y, e.type, e.size + 1, e.variant);
            }
        }

        destroyEnemy(e);
    };

    enemies.forEach(e => {
        // --- 画面内（＋マージン）にいるかどうかの判定 ---
        const inActiveRange = (
            e.x > camera.x - ACTIVE_MARGIN &&
            e.x < camera.x + viewW + ACTIVE_MARGIN &&
            e.y > camera.y - ACTIVE_MARGIN &&
            e.y < camera.y + viewH + ACTIVE_MARGIN
        );

        // 敵のプロパティとしてフラグを保存（プレイヤーの弾との判定に使うため）
        e.inActiveRange = inActiveRange;

        // ========================================================
        // ★修正：ボスの死亡アニメーション（フェードアウト＆誘爆）
        // ========================================================
        if (e.isDying) {
            e.dyingTimer -= 1;
            e.scale *= 0.98
            // 小さくなるエフェクト(e.scale *= 0.98)を削除し、透明度を初期化/減少させる
            if (e.opacity === undefined) e.opacity = 1.0;
            // 60フレーム（dyingTimerの初期値）かけて 1.0 から 0 へ
            e.opacity = Math.max(0, e.dyingTimer / 60);

            // 回転は重厚感を出すために極低速に設定
            e.angle += 0.01;

            // 激震（ガタガタ震える演出）
            e.x += (Math.random() - 0.5) * 8;
            e.y += (Math.random() - 0.5) * 8;

            // 誘爆エフェクト（確率は0.4のまま）
            if (Math.random() < 0.4) {
                const ox = (Math.random() - 0.5) * 180 * e.scale;
                const oy = (Math.random() - 0.5) * 180 * e.scale;
                const sparkColor = Math.random() > 0.5 ? '#fff' : (e.color || '#f00');
                const expSize = 5 + Math.random() * 8;

                createExplosion(e.x + ox, e.y + oy, sparkColor, expSize);
                rings.push({ x: e.x + ox, y: e.y + oy, r: expSize, color: sparkColor, life: 0.5 });

                // 三角の破片（デブリ）
                if (Math.random() < 0.3) {
                    const shardAngle = Math.random() * Math.PI * 2;
                    const shardSpeed = 2 + Math.random() * 4;
                    particles.push({
                        x: e.x + ox, y: e.y + oy,
                        vx: Math.cos(shardAngle) * shardSpeed,
                        vy: Math.sin(shardAngle) * shardSpeed,
                        color: sparkColor,
                        life: 1.0 + Math.random() * 0.5,
                        size: 0.5 + Math.random(),
                        isShard: true,
                        shardType: 'tri',
                        angle: shardAngle,
                        rotV: (Math.random() - 0.5) * 0.4
                    });
                }
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');
            }

            if (e.dyingTimer <= 0) {
                e.isDying = false;
                e.isDead = true;
                executeRealDeath(e);
            }
            return;
        }

        const isTriangle = (e.type === 'triangle');

        if (!isTriangle && e.leader && e.leader.hp > 0) {
            updateFormationMovement(e);
            if (e.type === 'cube') { e.rotX += 0.03; e.rotY += 0.04; }
        } else {
            // AI実行前の敵弾の数を記録
            const bulletCountBefore = enemyBullets.length;

            // AI（移動と射撃）の実行
            switch (e.type) {
                case 'dragon': updateDragonAI(e); break;
                case 'tadpole': updateTadpoleAI(e); break;
                case 'triangle': updateTriangleAI(e); break;
                case 'cube': updateCubeAI(e); break;
                case 'asteroid': updateAsteroidAI(e); break;
                case 'bubble': updateAsteroidAI(e); break;
                case 'hunter': updateHunterAI(e); break;
                case 'phantom': updatePhantomAI(e); break;
                case 'eclipse': updateEclipseAI(e); break;
                case 'jellyfish': updateJellyfishAI(e); break;
                case 'sentinel': updateSentinelAI(e); break;

                case 'island': break;
                case 'turret': updateTurretAI(e); break;

                case 'fighter': updateFighterJetAI(e); break;
                case 'boss':
                    if (stage === 9) updateBossSpecialAI(e);
                    else updateBossAI(e);
                    break;
                case 'battleship': updateBattleshipAI(e); break;

            }

            // 画面外の敵が弾を撃った場合、無効化する
            if (!inActiveRange && enemyBullets.length > bulletCountBefore) {
                enemyBullets.length = bulletCountBefore;
            }
        }

        // ボスや巨大戦艦は質量が大きいため、雑魚敵との重なり反発処理を受けないように除外する
        if (e.type !== 'boss' && e.type !== 'battleship') {
            applySeparation(e);
        }

        // bubble または asteroid の場合に衝突ロジックを適用
        if (e.type === 'asteroid' || e.type === 'bubble') {
            applyAsteroidCollisions(e);
        }

        applyWorldBoundary(e);

        // プレイヤーとの体当たり判定などは「画面付近」のみ
        if (inActiveRange) {
            checkPlayerCollision(e);
            checkSatelliteCollision(e);
        }

        // ========================================================
        // ★変更：撃破判定のトリガー
        // ========================================================
        if (e.hp <= 0 && !e.isDying && !e.isDead) {
            if (e.type === 'boss' || e.type === 'battleship') {
                // ボス級は即死させず、死亡演出ステートへ
                e.isDying = true;
                e.dyingTimer = 60; // 約1.5秒（90フレーム）かけて断末魔
                e.hp = 1;          // 削除されないようにHPを維持

                // ★追加：爆発開始の瞬間から全体をスローモーションにする
                if (stage != 9) {
                    gameSpeed = 0.25;
                }

                // ボスが死にかけたら、安全のために敵弾をすべて消す
                enemyBullets = [];

                // 演出開始時の音と画面揺れ
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_medium');
                distortGrid(e.x, e.y, 100, 200);
            } else {
                // 雑魚敵は今まで通り即時撃破
                e.isDead = true;
                executeRealDeath(e);
            }
        }
    });

    // isDeadフラグが立ったものだけを配列から削除
    enemies = enemies.filter(e => !e.isDead);
}

function updateFormationMovement(e) {
    if (!e.leader || e.leader.hp <= 0) return;
    const la = e.leader.angle;
    const rotatedOffX = e.formOffset.x * Math.cos(la) - e.formOffset.y * Math.sin(la);
    const rotatedOffY = e.formOffset.x * Math.sin(la) + e.formOffset.y * Math.cos(la);
    const targetX = e.leader.x + rotatedOffX; const targetY = e.leader.y + rotatedOffY;
    e.x += (targetX - e.x) * 0.3 * gameSpeed;
    e.y += (targetY - e.y) * 0.3 * gameSpeed;
    e.vx = e.leader.vx; e.vy = e.leader.vy; e.angle = la;
}

function applySeparation(e) {
    enemies.forEach(other => {
        if (e === other) return;
        const odx = e.x - other.x, ody = e.y - other.y; const od = Math.hypot(odx, ody);
        if (od < 30) { const push = (30 - od) * 0.05; e.x += (odx / od) * push; e.y += (ody / od) * push; }
    });
}

function applyAsteroidCollisions(e) {
    if (e.type !== 'asteroid' && e.type !== 'bubble') return;

    enemies.forEach(other => {
        if (e === other || other.hp <= 0 || (other.type !== 'asteroid' && other.type !== 'bubble')) return;

        const dx = other.x - e.x;
        const dy = other.y - e.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        const hitRadius = 22 * 0.85;
        const r1 = hitRadius * e.scale * G_SCALE;
        const r2 = hitRadius * other.scale * G_SCALE;
        const minDist = r1 + r2;

        if (dist < minDist) {
            // --- 1. 重なり解消（少し強めに押し出す） ---
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            const totalScale = e.scale + other.scale;
            const ratioE = other.scale / totalScale;
            const ratioOther = e.scale / totalScale;

            // overlap に 1.05 程度を掛けて「重なりをわずかに超えて」引き離す
            const separation = overlap * 1.05;
            e.x -= nx * separation * ratioE;
            e.y -= ny * separation * ratioE;
            other.x += nx * separation * ratioOther;
            other.y += ny * separation * ratioOther;

            // --- 2. 反射処理 ---
            const rvx = other.vx - e.vx;
            const rvy = other.vy - e.vy;
            const velAlongNormal = rvx * nx + rvy * ny;

            if (velAlongNormal > 0) return;

            const isAnyBubble = (e.type === 'bubble' || other.type === 'bubble');
            // 反発係数を上げる。泡なら1.0（エネルギー減衰なし）
            const restitution = isAnyBubble ? 1.0 : 0.8;

            // ★最低反発速度を保証する（ゆっくり近づいた時も確実に弾き飛ばす）
            const minBounceVelocity = -1.5;
            const effectiveVel = Math.min(velAlongNormal, minBounceVelocity);

            const j = -(1 + restitution) * effectiveVel;

            e.vx -= j * nx * ratioE;
            e.vy -= j * ny * ratioE;
            other.vx += j * nx * ratioOther;
            other.vy += j * ny * ratioOther;

            // --- 3. 演出 ---
            if (Math.abs(effectiveVel) > 0.5) {
                const midX = (e.x + other.x) / 2;
                const midY = (e.y + other.y) / 2;
                if (isAnyBubble) {
                    if (frame % 3 === 0) createExplosion(midX, midY, '#0ff', 1);
                    if (e.type === 'bubble') e.bend = 15; // 衝撃の見た目も強く
                    if (other.type === 'bubble') other.bend = 15;
                }
            }
        }
    });
}

// クラゲとアステロイドの衝突（ぼよーんと跳ね返る）
function applyJellyfishAsteroidCollisions(e) {
    // クラゲ以外はこの処理を行わない
    if (e.type !== 'jellyfish') return;

    enemies.forEach(other => {
        // 死んでいる敵や、アステロイド以外の敵は無視
        if (other.hp <= 0 || other.type !== 'asteroid') return;

        const dx = e.x - other.x; // 岩からクラゲへのベクトル
        const dy = e.y - other.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        // --- 判定半径 ---
        // クラゲの見た目のサイズに合わせて半径を調整
        const r1 = 20 * e.scale * G_SCALE;     // クラゲの半径（少し大きめに）
        const r2 = 20 * other.scale * G_SCALE; // アステロイドの半径
        const minDist = r1 + r2;

        if (dist < minDist) {
            // --- 1. 重なりの解消（位置を押し戻す） ---
            const overlap = minDist - dist;
            const nx = dx / dist; // 法線ベクトルX（岩→クラゲ）
            const ny = dy / dist; // 法線ベクトルY

            e.x += nx * overlap;
            e.y += ny * overlap;

            // --- 2. 速度ベクトルの反射計算 ---
            // 現在の速度と法線の内積を計算（接近しているか判定）
            const dot = e.vx * nx + e.vy * ny;

            // 岩に向かって進んでいる場合のみ反射させる
            if (dot < 0) {
                // ★変更：弾力係数を 1.6 → 0.8 に下げ、過剰な加速を防ぐ
                const bounceFactor = 0.8;

                // 反射ベクトル計算
                const impulse = (1 + bounceFactor) * dot;
                e.vx -= impulse * nx;
                e.vy -= impulse * ny;

                // ★追加：跳ね返り速度の安全装置（リミッター）
                // どんなに強く当たっても、基本速度の1.5倍以上にはならないようにする
                const maxBounceSpeed = e.speed * 1.5;
                const currentV = Math.hypot(e.vx, e.vy);
                if (currentV > maxBounceSpeed) {
                    e.vx = (e.vx / currentV) * maxBounceSpeed;
                    e.vy = (e.vy / currentV) * maxBounceSpeed;
                }

                // --- 3. 「ぼよーん」感の演出 ---
                // 反射後の速度から、新しい進行角度をセット
                e.angle = Math.atan2(e.vy, e.vx);

                // 強制的に「縮んだ」状態にするタイマー値にセット
                // 次の瞬間に反動で大きくカサが開く
                e.timer = (Math.PI * 1.5) / 0.08;

                // 少し回転を加える（衝撃でよろめく感じ）
                e.angle += (Math.random() - 0.5) * 0.5;
            }
        }
    });
}

function applyWorldBoundary(e) {
    if (e.x < WALL_MARGIN || e.x > worldSize - WALL_MARGIN) e.vx *= -1.2;
    if (e.y < WALL_MARGIN || e.y > worldSize - WALL_MARGIN) e.vy *= -1.2;
    e.x = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, e.x));
    e.y = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, e.y));
}

function checkPlayerCollision(e) {
    if (gameState === 'DYING' || gameState === 'GAMEOVER') return;

    const dist = Math.hypot(player.x - e.x, player.y - e.y);

    // --- 当たり判定半径の決定 ---
    let radius = 15 * G_SCALE;
    if (e.type === 'asteroid') {
        radius = 20 * e.scale * G_SCALE;
    } else if (e.type === 'triangle') {
        radius = ENEMY_HITBOX.TRIANGLE * G_SCALE;
    } else if (e.type === 'cube') {
        radius = ENEMY_HITBOX.CUBE * G_SCALE;
    } else if (e.type === 'tadpole') {
        radius = ENEMY_HITBOX.TADPOLE * G_SCALE;
    } else if (e.type === 'dragon') {
        radius = ENEMY_HITBOX.DRAGON * G_SCALE;
    } else if (e.type === 'hunter') {
        radius = ENEMY_HITBOX.HUNTER * G_SCALE;
    } else if (e.type === 'island') {
        radius = ENEMY_HITBOX.ISLAND * e.scale * G_SCALE;   // 大陸はスケールが大きいので scale を掛ける
    } else if (e.type === 'turret') {
        radius = ENEMY_HITBOX.TURRET * G_SCALE;
    } else if (e.type === 'boss') {
        radius = 45 * G_SCALE; // 通常ボス
    } else if (e.type === 'battleship') {
        // ★追加: 巨大戦艦は判定を大きくする
        radius = 80 * G_SCALE;
    }

    // 衝突境界距離の計算
    const collisionDist = radius * (e.type === 'asteroid' ? 1 : (e.scale / 0.7)) + (player.invuln > 0 ? 20 : 0);

    if (dist < collisionDist) {
        // ★修正: 通常ボスまたは戦艦が出現中の場合は接触判定なし
        if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) return;

        // checkPlayerCollision(e) 内の無敵処理部分
        if (player.invuln > 0) {
            if (e.type === 'boss' || e.type === 'battleship' || e.type === 'dragon' || e.type === 'asteroid') {

                // ★修正1：ダメージを大幅に下げる (0.8 -> 0.15)
                e.hp -= 0.15;

                // ★修正2：ボス級に張り付いている間は無敵時間を早く消費する (特攻ペナルティ)
                if (e.type === 'boss' || e.type === 'battleship') {
                    player.invuln -= 1; // 通常の1F減少に加え、さらに減る（実質2倍の速さで切れる）

                    // ★修正3：めり込みすぎないよう、プレイヤーをボスの外側へ少し反発させる
                    const pushAngle = Math.atan2(player.y - e.y, player.x - e.x);
                    player.x += Math.cos(pushAngle) * 3;
                    player.y += Math.sin(pushAngle) * 3;
                }

                // ヒットバック演出
                if (e.type === 'boss' || e.type === 'battleship') e.flashTimer = 5;

                // 火花演出は少し間引いて描画負荷を下げる
                if (frame % 4 === 0) {
                    createExplosion(e.x, e.y, '#ff0', 2);
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('boss_hit');
                }
            } else {
                // 雑魚は即死
                e.hp = 0;
                score += 100;
                createExplosion(e.x, e.y, e.color, 15);
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');
            }
            return; // プレイヤーのダメージ処理をスキップ
        }

        // --- 通常時のダメージ処理 ---
        player.shield -= 0.5;
        if (player.invuln <= 0) {
            player.shield -= 10;
            player.invuln = 10;
            createExplosion(player.x, player.y, '#f00', 5);
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('damage');
        }
        ui.shieldBar.style.width = Math.max(0, player.shield) + "%";
        if (player.shield <= 0) damage(0);
    }
}

function checkSatelliteCollision(e) {
    // 出現中のボスは当たり判定なし（すり抜ける）
    if (e.type === 'boss' && e.isSpawning) return;

    for (let i = player.satellites.length - 1; i >= 0; i--) {
        const s = player.satellites[i];

        // 当たり判定距離
        if (Math.hypot(s.x - e.x, s.y - e.y) < 25) {

            // ★修正箇所：ボスや中ボス(Dragon)の場合は即死させず、ダメージを与える処理に変更
            if (e.type === 'boss' || e.type === 'dragon') {
                // 衛星特攻ダメージ（値はバランスに合わせて調整してください）
                e.hp -= 20;

                if (e.type === 'boss') e.flashTimer = 5; // 点滅演出
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('boss_hit'); // ヒット音

                // ヒットエフェクト
                if (typeof createExplosion === 'function') {
                    createExplosion(s.x, s.y, '#0f0', 5);
                }
            } else {
                // 通常の雑魚敵は即死させる（既存の処理）
                e.hp = 0;
                e.noDrop = true;

                if (typeof createExplosion === 'function') {
                    createExplosion(s.x, s.y, e.color, 10);
                }
            }

            // 衛星（サテライト）を消滅させる
            player.satellites.splice(i, 1);

            // 1つの衛星は1回ヒットしたら消えるのでループを抜ける
            break;
        }
    }
}

function destroyEnemy(e) {

    // --- ボス撃破時の処理 ---
    if (e.type === 'boss') {
        let shouldClearMinions = false;

        if (stage === 9) {
            rushBossIndex++; // 現在のボス撃破数をカウントアップ
            rushIntervalTimer = 0;

            // Stage 9の場合：8体目のボス（Indexが8に到達した時）を倒した時だけ一掃
            if (rushBossIndex >= 8) {
                shouldClearMinions = true;
            }
        } else {
            // Stage 1-8の場合：ボスを倒せば常に一掃
            shouldClearMinions = true;
        }

        // --- 雑魚一掃ロジックの実行 ---
        if (shouldClearMinions) {
            enemies.forEach(other => {
                if (other !== e && other.hp > 0) {
                    other.hp = 0;
                    other.noSplit = true; // ★アステロイドが分裂しないようにする
                    other.noDrop = true;  // 画面がアイテムで埋まるのを防ぐ
                }
            });
            // 進行中のワームホールもすべて閉じる
            wormholes.forEach(w => w.life = 0);

            // ★追加：残っている敵弾をすべて小さな爆発エフェクトにしてから消去
            enemyBullets.forEach(eb => {
                createExplosion(eb.x, eb.y, eb.color || '#fff', 3);
            });
            enemyBullets = [];

            // 派手なグリッドの歪み
            distortGrid(e.x, e.y, 200, 500);
        }

        // ボス撃破の報酬（シールド回復）を確定ドロップ
        powerups.push({ x: e.x, y: e.y, vx: 0, vy: 0, type: 'shield', life: 600 });
    }
    // --- ラスボス（Stage 10 / Battleship） ---
    else if (e.type === 'battleship') {
        // Battleship自体の撃破時は一掃ロジックを入れなくても
        // startStageのクリア判定で次の演出へ移行します
        gameSpeed = 0.05;
        bullets = [];
        enemyBullets = [];

        // ★追加：ラスボス撃破時も、アステロイドを含めた全ての敵を連鎖爆発させる
        enemies.forEach(other => {
            if (other !== e && other.hp > 0) {
                other.hp = 0;
                other.noSplit = true; // ★アステロイド分裂防止
                other.noDrop = true;  // アイテムドロップ防止
            }
        });
        wormholes.forEach(w => w.life = 0);


    }
    // --- 通常の敵の撃破 ---
    else {
        // asteroid または bubble 以外の場合に撃破数を加算する
        if (e.type !== 'asteroid' && e.type !== 'bubble') {
            if (e.type === 'triangle') {
                enemiesKilled += 0.2;
            } else {
                enemiesKilled += 1;
            }
        }
    }

    // --- 爆発エフェクトの生成 ---
    // 敵の種類に応じて基本の火花（パーティクル）の数を調整
    let particleCount = 40; // デフォルトの雑魚
    if (e.type === 'boss') {
        particleCount = 120;
    } else if (e.type === 'asteroid') {
        particleCount = 30;
    } else if (e.type === 'phantom' || e.type === 'triangle') {
        // ★ 破片演出がある敵は、細かい火花を極端に減らす（控えめにする）
        particleCount = 3;
    } else if (e.type === 'jellyfish' || e.type === 'bubble') {
        // ★追加: クラゲとバブルは通常の火花（線）をゼロにする
        particleCount = 2;
    }


    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 8 + 2) * EXPLOSION_SPEED_MAG;
        let color;
        if (e.type === 'asteroid') color = Math.random() < 0.85 ? '#ffffff' : '#ffaa00';
        else color = Math.random() < 0.85 ? e.color : '#ffff00';
        createExplosion(e.x, e.y, color, 1);
    }

    // --- Phantom専用の特殊撃破演出 ---
    if (e.type === 'phantom') {
        AudioSys.playSE('explode_medium'); // 中サイズの爆発音
        distortGrid(e.x, e.y, 60, 120);

        // 4つの三角錐パーツを独立した破片として放出
        for (let i = 0; i < 4; i++) {
            const orbitAngle = (e.rotAngle || 0) + (Math.PI / 2) * i;
            const orbitDist = 40;
            const partX = e.x + Math.cos(orbitAngle) * orbitDist;
            const partY = e.y + Math.sin(orbitAngle) * orbitDist;

            // 外側へ吹き飛ぶベクトル
            const pvx = Math.cos(orbitAngle) * (5 + Math.random() * 5);
            const pvy = Math.sin(orbitAngle) * (5 + Math.random() * 5);

            // 特殊パーティクルとして追加（isShardフラグで三角錐を描画させる）
            particles.push({
                x: partX, y: partY,
                vx: pvx, vy: pvy,
                color: e.color,
                life: 1.5, // 少し長めに残す
                size: 1.0,
                isShard: true, // ★破片フラグ
                angle: orbitAngle,
                rotV: (Math.random() - 0.5) * 0.2 // 回転速度
            });

            // 各パーツの根元でも小さな爆発
            createExplosion(partX, partY, e.color, 5);
        }

        // 中心コアの爆発
        createExplosion(e.x, e.y, '#fff', 20);
    }
    // --- ★追加：Eclipse専用の特殊撃破演出 ---
    else if (e.type === 'eclipse') {
        AudioSys.playSE('explode_medium');
        distortGrid(e.x, e.y, 100, 200);

        const bitCount = 6;
        const orbitDist = 50 + Math.sin(frame * 0.05) * 4;

        for (let i = 0; i < bitCount; i++) {
            // 現在の回転角からビットの正確な位置を算出
            const orbitAngle = (e.angle || 0) + (Math.PI * 2 / bitCount) * i;
            const partX = e.x + Math.cos(orbitAngle) * orbitDist;
            const partY = e.y + Math.sin(orbitAngle) * orbitDist;

            // 中心から外側へ向かうベクトル
            const pvx = Math.cos(orbitAngle) * (3 + Math.random() * 4);
            const pvy = Math.sin(orbitAngle) * (3 + Math.random() * 4);

            particles.push({
                x: partX, y: partY,
                vx: pvx, vy: pvy,
                color: e.color || '#f05',
                life: 1.5,           // 粘り強く残す
                size: e.scale || 1.0,
                isShard: true,
                shardType: 'eclipseBit', // ★Eclipse専用ビットフラグ
                angle: orbitAngle,
                rotV: (Math.random() - 0.5) * 0.4 // クルクル回る
            });

            // 各ビットの根元で小さな爆発
            createExplosion(partX, partY, e.color, 3);
        }

        // 中心（ブラックホール）の崩壊エフェクト
        createExplosion(e.x, e.y, '#fff', 30);
    }
    // --- Triangle専用の特殊撃破演出（サイズ微調整版） ---
    else if (e.type === 'triangle') {
        AudioSys.playSE('explode_small');

        const shardCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < shardCount; i++) {
            const angle = (Math.PI * 2 / shardCount) * i + e.angle + (Math.random() - 0.5);
            const speed = 4 + Math.random() * 4;

            const vertices = [];
            for (let v = 0; v < 3; v++) {
                const a = (Math.PI * 2 / 3) * v + (Math.random() - 0.5) * 1.0;
                // ★頂点の距離を少し抑える (10〜25 -> 7〜18)
                const r = 7 + Math.random() * 11;
                vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }

            particles.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: e.color || '#0f8',
                life: 1.2,
                // ★全体の描画スケールを適正サイズに (1.5 -> 1.1)
                size: e.scale ? e.scale * 1.1 : 1.1,
                isShard: true,
                shardType: 'tri',
                vertices: vertices,
                angle: angle,
                rotV: (Math.random() - 0.5) * 0.5
            });
        }
    }
    else if (e.type === 'dragon') {
        AudioSys.playSE('explode_medium');
        distortGrid(e.x, e.y, 80, 140);

        // 体節をバラバラに放出（頭 + セグメント）
        const allParts = [{ x: e.x, y: e.y, angle: e.angle }, ...e.segments];

        allParts.forEach((seg, i) => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3; // 速度を少し抑える

            particles.push({
                x: seg.x, y: seg.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: e.color || '#c00',
                life: 2,
                size: e.scale || 1.0,
                isShard: true,
                shardType: 'dragonSeg',
                angle: seg.angle,
                rotV: (Math.random() - 0.5) * 0.2,
                segIndex: i
            });
        });

        // ドラゴン撃破時は専用の「ごく少数」の火花だけ出す
        createExplosion(e.x, e.y, '#fff', 5);
    }
    // --- ★変更：JellyfishとBubble共通の特殊撃破演出 ---
    else if (e.type === 'jellyfish' || e.type === 'bubble') {
        AudioSys.playSE('explode_small'); // 少し高い音が水泡が弾ける音に似ます
        distortGrid(e.x, e.y, 50, 100);

        // ★追加：バブルの場合はサイズ(1が最大, 3が最小)に応じて泡の数を変える
        let bubbleCount = 20;
        if (e.type === 'bubble') {
            // size1(大)なら30個、size2(中)なら20個、size3(小)なら10個
            bubbleCount = (4 - (e.size || 2)) * 5;
        }

        for (let i = 0; i < bubbleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3; // ふんわり飛び散る速度
            particles.push({
                x: e.x + (Math.random() - 0.5) * 20,
                y: e.y + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#aff',
                life: 0.5 + Math.random(),   // 長めに残す
                size: 3 + Math.random() * 3, // 泡の大きさ（半径）
                isBubble: true,              // ★泡フラグ
                wobbleOffset: Math.random() * Math.PI * 2 // 揺らぎの初期位相
            });
        }
    }
    // --- その他の敵の処理 ---
    else if (e.type === 'boss' || e.type === 'battleship') {
        AudioSys.playSE('explode_large');
    }
    // --- アステロイドの判定 ---
    else if (e.type === 'asteroid') {
        // e.size === 1 が最大サイズです
        if (e.size === 1) {
            AudioSys.playSE('explode_medium');
        } else {
            AudioSys.playSE('explode_small');
        }
    }
    // --- 小型（小）：その他雑魚（triangleは上で処理済み）---
    else {
        AudioSys.playSE('explode_small');
    }

    // スコア加算（テーブルから取得、未定義ならデフォルト値）
    const pts = ENEMY_SCORES[e.type] || DEFAULT_ENEMY_SCORE;

    score += pts;
    ui.score.innerText = score.toString().padStart(6, '0');
    scorePopups.push({ x: e.x, y: e.y, text: pts, life: 40, alpha: 1, vy: -1 });

    // ドロップ処理
    if (e.noDrop || e.drop === 'none') return;
    const itemProps = { x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 };
    if (e.drop === 'level') powerups.push({ ...itemProps, type: 'level', life: 999999 });
    else if (e.drop === 'laser') powerups.push({ ...itemProps, type: 'laser', life: ITEM_LIFE });
    else if (e.drop === 'invincible') powerups.push({ ...itemProps, type: 'invincible', life: ITEM_LIFE });
    else if (e.drop === 'crystal') crystals.push({ ...itemProps, life: ITEM_LIFE });
    else if (e.drop === 'shield') powerups.push({ ...itemProps, type: 'shield', life: ITEM_LIFE });
}


// =========================================================
// 8. 個別敵機AI (Specific Enemy AIs)
// =========================================================
function updateTriangleAI(e) {
    // --- 1. 出現・展開アニメーション (全員共通) ---
    if (e.isWarping) {
        e.warpPercent = (e.warpPercent || 0) + 0.015;
        if (e.warpPercent >= 1) {
            e.warpPercent = 1;
            e.isWarping = false;
            e.scale = 0.7;
        } else {
            e.scale = 0.1 + 0.6 * e.warpPercent;
        }
    }

    // --- 2. 座標と移動の計算 ---
    if (!e.isLeader && e.leader && e.leader.hp > 0) {
        // 【副機】
        // リーダーの角度がNaNなら0扱いにする（安全対策）
        const angle = Number.isFinite(e.leader.angle) ? e.leader.angle : 0;

        const targetRx = e.formOffset.x * Math.cos(angle) - e.formOffset.y * Math.sin(angle);
        const targetRy = e.formOffset.x * Math.sin(angle) + e.formOffset.y * Math.cos(angle);

        const ratio = e.isWarping ? e.warpPercent : 1.0;

        e.x = e.leader.x + targetRx * ratio;
        e.y = e.leader.y + targetRy * ratio;
        e.angle = angle;
        e.vx = e.leader.vx || 0;
        e.vy = e.leader.vy || 0;

    } else {
        // 【リーダー機】
        const dx = player.x - e.x;
        const dy = player.y - e.y;

        if (e.isWarping) {
            // --- 出現中の挙動 ---

            // 1. 移動にはブレーキをかけ、穴の中心付近に留める
            e.vx *= 0.5;
            e.vy *= 0.5;

            // 2. ★追加：その場でプレイヤーの方へ旋回（ロックオン）する
            const targetAngle = Math.atan2(dy, dx);

            // 現在の角度との差分を計算してスムーズに回す
            let diff = targetAngle - e.angle;
            // -PI ~ PI の範囲に正規化（最短距離で回るため）
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            e.angle += diff * 0.1; // 0.1 は旋回速度（お好みで調整）

        } else {
            // --- 通常時の挙動 ---
            const d = Math.hypot(dx, dy) || 0.001;

            // プレイヤーへ向かって加速
            e.vx += (dx / d) * 0.2 * SPEED_SCALE * gameSpeed;
            e.vy += (dy / d) * 0.2 * SPEED_SCALE * gameSpeed;

            // 速度制限
            const cv = Math.hypot(e.vx, e.vy);
            if (cv > 0.0001 && cv > e.speed) {
                e.vx = (e.vx / cv) * e.speed;
                e.vy = (e.vy / cv) * e.speed;
            }

            // 通常時は「進行方向」を向く
            e.angle = Math.atan2(e.vy, e.vx);
        }

        // 座標更新
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;
    }

    // --- 3. 演出更新 ---
    e.rotX += 0.08;
    e.rotY += 0.12;
    e.rotZ += 0.05;
}

function updateTadpoleAI(e) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.001;

    // --- 1. 超高速・高慣性移動ロジック ---
    // 加速度をさらに強化。これで自機に向かって「突き刺さる」ような動きになります。
    const accel = 0.6 * SPEED_SCALE * gameSpeed;
    e.vx += (dx / d) * accel;
    e.vy += (dy / d) * accel;

    // 摩擦をほぼ撤廃 (0.999)。
    // これにより、避けたあとに「勢い余って遠くへ滑っていく」慣性が強く出ます。
    e.vx *= 0.998;
    e.vy *= 0.998;

    const currentV = Math.hypot(e.vx, e.vy);
    // 最高速度制限を少し高めに設定（逃げ切るのが難しい速さ）
    const maxSpd = e.speed * 1.2;

    if (currentV > maxSpd) {
        e.vx = (e.vx / currentV) * maxSpd;
        e.vy = (e.vy / currentV) * maxSpd;
    }

    // 座標更新
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // 進行方向を向く（慣性で滑っている間も「向いている方向」と「進む方向」を一致させます）
    e.angle = Math.atan2(e.vy, e.vx);

    // --- 2. 攻撃ロジックは削除（ご要望通り中止） ---

    // --- 3. 軌跡の更新 ---
    e.history.unshift({ x: e.x, y: e.y });
    // 軌跡（しっぽ）を長めにすると、高速移動の残像がより美しく見えます
    if (e.history.length > 80) e.history.pop();
}

function updateDragonAI(e) {
    // NaN防止のための初期ガード
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const spd = SPEED_SCALE;

    // 1. 頭部の移動
    e.vx += (dx / d) * DRAGON_ACCELERATION * spd;
    e.vy += (dy / d) * DRAGON_ACCELERATION * spd;
    e.vx *= 0.98; e.vy *= 0.98;

    const stageMag = 1.0 + (stage - 1) * DIFFICULTY_CONFIG.SPEED_INC;
    const lim = ENEMY_SPEEDS.DRAGON * spd * stageMag;

    const currentV = Math.hypot(e.vx, e.vy) || 0.001;
    if (currentV > lim) {
        e.vx = (e.vx / currentV) * lim;
        e.vy = (e.vy / currentV) * lim;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    e.angle = Math.atan2(e.vy, e.vx);

    // 2. ★体節の滑らかな連結追従ロジック（NaNガード強化版）
    let leaderX = e.x;
    let leaderY = e.y;
    const spacing = 18;

    e.segments.forEach((s, i) => {
        const sDx = leaderX - s.x;
        const sDy = leaderY - s.y;
        const distance = Math.hypot(sDx, sDy) || 0.001; // 0除算防止
        const targetAngle = Math.atan2(sDy, sDx);

        s.angle = targetAngle;

        if (distance > spacing) {
            const moveDist = distance - spacing;
            // 算出した座標が正常な数値(Finite)である場合のみ更新
            const tx = s.x + Math.cos(targetAngle) * moveDist;
            const ty = s.y + Math.sin(targetAngle) * moveDist;

            if (Number.isFinite(tx) && Number.isFinite(ty)) {
                s.x = tx;
                s.y = ty;
            }
        }

        leaderX = s.x;
        leaderY = s.y;
    });

    // 3. 弾速の変更（エラー修正：変数 a を e.angle に修正）
    e.fireTimer++;
    if (e.fireTimer > 100) {
        e.fireTimer = 0;

        const currentEnemyBulletSpd = BULLET_CONFIG.ENEMY_NORMAL.SPEED * SPEED_SCALE * (1 + (stage - 1) * DIFFICULTY_CONFIG.BULLET_SPEED_INC);

        // ★修正箇所: Math.cos(a) の 'a' が未定義だったので 'e.angle' に変更
        const shootAngle = e.angle;

        enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(shootAngle) * currentEnemyBulletSpd,
            vy: Math.sin(shootAngle) * currentEnemyBulletSpd,
            life: BULLET_CONFIG.ENEMY_NORMAL.LIFE,
            color: '#c00' // ドラゴンの弾色を指定
        });
        AudioSys.playSE('shoot');
    }
}

function updateCubeAI(e) {
    const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 0.001;
    e.vx += (dx / d) * 0.2 * SPEED_SCALE * gameSpeed;
    e.vy += (dy / d) * 0.2 * SPEED_SCALE * gameSpeed;
    const cv = Math.hypot(e.vx, e.vy); if (cv > e.speed) { e.vx = (e.vx / cv) * e.speed; e.vy = (e.vy / cv) * e.speed; }
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    e.rotX += 0.03;
    e.rotY += 0.04;
}

function updateHunterAI(e) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    // 定数から基本スピードを取得（SPEED_SCALEは既に掛かっている前提か、ここで掛けるか）
    // 今回は e.speed (生成時に計算済み) をベースにします
    const baseSpd = e.speed;

    e.actionTimer++;

    // --- 状態1: 高速接近 (APPROACH) ---
    if (e.state === 'approach') {
        // 定数 HUNTER_ROT があれば使用、なければ直書き
        e.angle += ENEMY_SPEEDS.HUNTER_ROT;

        // プレイヤーに向かって加速
        // 加速度も baseSpd に比例させることで、ステージが進んで速くなっても挙動が安定します
        const acc = baseSpd * 0.1;
        e.vx += (dx / dist) * acc;
        e.vy += (dy / dist) * acc;

        if (dist < 180) {
            e.state = 'attack';
            e.actionTimer = 0;
            e.burstCount = 0;
        }
    }
    // --- 状態2: 攻撃 (ATTACK) ---
    else if (e.state === 'attack') {
        e.vx *= 0.85;
        e.vy *= 0.85;

        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.angle += diff * 0.2;

        if (e.actionTimer > 20 && e.actionTimer % 10 === 0 && e.burstCount < 3) {
            // 弾速も定数の影響を受ける
            const bulletSpd = BULLET_CONFIG.ENEMY_NORMAL.SPEED * 1.3 * SPEED_SCALE;

            enemyBullets.push({
                x: e.x, y: e.y,
                vx: Math.cos(e.angle) * bulletSpd,
                vy: Math.sin(e.angle) * bulletSpd,
                life: BULLET_CONFIG.ENEMY_NORMAL.LIFE,
                color: '#f80'
            });

            // 反動
            e.vx -= Math.cos(e.angle) * (baseSpd * 0.5);
            e.vy -= Math.sin(e.angle) * (baseSpd * 0.5);

            AudioSys.playSE('shoot');
            e.burstCount++;
        }

        if (e.burstCount >= 3 && e.actionTimer > 60) {
            e.state = 'retreat';
            e.actionTimer = 0;
        }
    }
    // --- 状態3: 離脱 (RETREAT) ---
    else if (e.state === 'retreat') {
        e.angle -= 0.2;

        const escapeAcc = baseSpd * 0.08;
        e.vx -= (dx / dist) * escapeAcc;
        e.vy -= (dy / dist) * escapeAcc;

        if (dist > 450 || e.actionTimer > 120) {
            e.state = 'approach';
            e.actionTimer = 0;
        }
    }

    // --- 速度制限（ここが定数活用のキモ） ---
    const currentSpeed = Math.hypot(e.vx, e.vy);
    // 状態に合わせて制限速度を可変にする（接近時は基本の1.5倍まで許容）
    let maxLimit = baseSpd;
    if (e.state === 'approach') maxLimit = baseSpd * 1.5;
    if (e.state === 'retreat') maxLimit = baseSpd * 1.2;

    if (currentSpeed > maxLimit) {
        e.vx = (e.vx / currentSpeed) * maxLimit;
        e.vy = (e.vy / currentSpeed) * maxLimit;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
}

function updateAsteroidAI(e) {
    // 時間経過のカウント
    e.spawnTimer = (e.spawnTimer || 0) + 1;

    if (!e.isTracking && e.spawnTimer > e.trackingStart) {
        e.isTracking = true;
        e.vx = (e.vx * e.speed) * 0.2;
        e.vy = (e.vy * e.speed) * 0.2;
        e.speed = 1;
        e.rotSpd *= 3;
    }

    if (e.isTracking) {
        // --- 追跡モード ---
        if (e.type === 'asteroid') {

            const gb = Math.floor(215 + 40 * Math.sin(frame * 0.1));
            e.color = `rgb(255, ${gb}, ${gb})`;

        }

        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const accel = (0.6 / e.size) * SPEED_SCALE;

        e.vx += (dx / dist) * accel * gameSpeed;
        e.vy += (dy / dist) * accel * gameSpeed;

        const maxSpeed = 7.0 * SPEED_SCALE;
        e.vx *= 0.99; e.vy *= 0.99;
        const currentSpeed = Math.hypot(e.vx, e.vy);
        if (currentSpeed > maxSpeed) {
            e.vx = (e.vx / currentSpeed) * maxSpeed;
            e.vy = (e.vy / currentSpeed) * maxSpeed;
        }
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;

    } else {
        // --- 通常モード（漂流） ---
        if (e.type === 'asteroid') {
            e.color = '#ffffff';
        }

        e.x += e.vx * e.speed * gameSpeed;
        e.y += e.vy * e.speed * gameSpeed;

        if (e.x < 0 || e.x > worldSize) e.vx *= -1;
        if (e.y < 0 || e.y > worldSize) e.vy *= -1;
    }

    // 自転
    e.angle += e.rotSpd;
}

function updatePhantomAI(e) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.state === 'stealth') {
        // --- 1. 隠密モード ---
        // その場で減速しながら完全に光学迷彩（透明）になる
        e.vx *= 0.85;
        e.vy *= 0.85;
        e.alpha += (0.0 - e.alpha) * 0.1; // 目標アルファ値を 0 にする

        e.timer += gameSpeed;

        // 完全に消えて少し経過したら、自機の周囲へ瞬間移動（ワープ）する
        if (e.alpha < 0.05 && e.timer > 40) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 300 + Math.random() * 150; // 自機から300〜450pxの距離

            // 新しい出現位置を設定（壁の外に出ないように制限）
            e.x = Math.max(100, Math.min(worldSize - 100, player.x + Math.cos(spawnAngle) * spawnDist));
            e.y = Math.max(100, Math.min(worldSize - 100, player.y + Math.sin(spawnAngle) * spawnDist));

            e.state = 'approach';
            e.timer = 0;

            // 出現時の初速を自機に向ける
            const aimAngle = Math.atan2(player.y - e.y, player.x - e.x);
            e.vx = Math.cos(aimAngle) * 2;
            e.vy = Math.sin(aimAngle) * 2;
            e.angle = aimAngle;
        }
    }
    else if (e.state === 'approach') {
        // --- 2. 奇襲モード ---
        const approachSpd = 12 * SPEED_SCALE;
        e.vx += (dx / dist) * 0.8 * gameSpeed;
        e.vy += (dy / dist) * 0.8 * gameSpeed;

        const currentV = Math.hypot(e.vx, e.vy);
        if (currentV > approachSpd) {
            e.vx = (e.vx / currentV) * approachSpd;
            e.vy = (e.vy / currentV) * approachSpd;
        }

        e.angle = Math.atan2(e.vy, e.vx);

        // ワープ先から急速に実体化する
        e.alpha += (1.0 - e.alpha) * 0.1;
        e.timer += gameSpeed;

        // 姿がはっきり見え、かつ接近した場合に攻撃へ
        if (dist < 250 && e.alpha > 0.8) {
            e.state = 'attack';
            e.timer = 0;
        }
    }
    else if (e.state === 'attack') {
        // --- 3. 攻撃モード ---
        e.vx *= 0.8; e.vy *= 0.8; // ブレーキをかける

        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.angle += diff * 0.1;

        e.timer += gameSpeed;
        e.aimRate = Math.min(1.0, e.timer / 30);
        e.isAiming = (e.timer < 30);

        if (e.timer >= 30 && e.timer < 30 + gameSpeed) {
            e.isAiming = false;
            for (let i = 0; i < 4; i++) {
                const orbitAngle = e.rotAngle + (Math.PI / 2) * i;
                const orbitDist = 38;
                const shootX = e.x + Math.cos(orbitAngle) * orbitDist;
                const shootY = e.y + Math.sin(orbitAngle) * orbitDist;

                const bulletSpd = 20 * SPEED_SCALE;
                const aim = Math.atan2(player.y - shootY, player.x - shootX);

                enemyBullets.push({
                    x: shootX,
                    y: shootY,
                    vx: Math.cos(aim) * bulletSpd,
                    vy: Math.sin(aim) * bulletSpd,
                    life: 200,
                    color: e.color,
                    isLaserMissile: true
                });
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 40, 100);
        }

        // 撃ったらすぐ離脱へ
        if (e.timer > 60) {
            e.state = 'retreat';
            e.timer = 0;
            e.aimRate = 0;
        }
    }
    else if (e.state === 'retreat') {
        // --- 4. 離脱モード ---
        const retreatSpd = 10 * SPEED_SCALE;
        e.vx -= (dx / dist) * 0.6 * gameSpeed; // 自機から素早く遠ざかる
        e.vy -= (dy / dist) * 0.6 * gameSpeed;

        const currentV = Math.hypot(e.vx, e.vy);
        if (currentV > retreatSpd) {
            e.vx = (e.vx / currentV) * retreatSpd;
            e.vy = (e.vy / currentV) * retreatSpd;
        }

        e.angle = Math.atan2(e.vy, e.vx);

        // 逃げながら素早く透明になる
        e.alpha += (0.0 - e.alpha) * 0.1;
        e.timer += gameSpeed;

        // ほぼ見えなくなるか、一定時間経ったら再びワープ準備へ
        if (e.alpha < 0.05 || e.timer > 60) {
            e.state = 'stealth';
            e.timer = 0;
        }
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    e.x = Math.max(100, Math.min(worldSize - 100, e.x));
    e.y = Math.max(100, Math.min(worldSize - 100, e.y));
}

function updateEclipseAI(e) {
    // NaNやInfinityの混入を初期段階で防ぐ
    if (!Number.isFinite(e.x)) e.x = worldSize / 2;
    if (!Number.isFinite(e.y)) e.y = worldSize / 2;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    e.vx += (dx / dist) * 0.02 * SPEED_SCALE * gameSpeed;
    e.vy += (dy / dist) * 0.02 * SPEED_SCALE * gameSpeed;

    const spdLimit = e.speed || 1;
    const cv = Math.hypot(e.vx, e.vy);
    if (cv > spdLimit) {
        e.vx = (e.vx / cv) * spdLimit;
        e.vy = (e.vy / cv) * spdLimit;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    if (e.rotSpeed === undefined) e.rotSpeed = 0.02;
    e.angle += e.rotSpeed * gameSpeed;

    // ★タイマーは絶対に整数で管理する（小数点のズレによる不発・バグを防ぐ）
    if (e.actionTimer === undefined) e.actionTimer = 0;
    e.actionTimer++;

    const cycle = e.actionTimer % 350;

    // ★ 出現直後（最初の60フレーム）の後はすぐに攻撃を許可する
    if (e.actionTimer > 60) {
        // 攻撃1：全方位ばらまき弾
        if (cycle === 120) {
            const ways = 16;
            const bSpd = 16 * SPEED_SCALE;
            for (let i = 0; i < ways; i++) {
                const a = (Math.PI * 2 / ways) * i + e.angle;
                enemyBullets.push({
                    x: e.x, y: e.y,
                    vx: Math.cos(a) * bSpd, vy: Math.sin(a) * bSpd,
                    life: 300, color: e.color
                });
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
            distortGrid(e.x, e.y, 80, 150);
        }
        // 攻撃2：超高速レーザー
        else if (cycle === 250 || cycle === 270 || cycle === 290) {
            const bladeCount = 6;
            const currentOrbitDist = 50 + Math.sin(frame * 0.05) * 4;
            const bSpd = 24 * SPEED_SCALE;

            for (let i = 0; i < bladeCount; i++) {
                const orbitAngle = e.angle + (Math.PI * 2 / bladeCount) * i;
                const shootX = e.x + Math.cos(orbitAngle) * currentOrbitDist;
                const shootY = e.y + Math.sin(orbitAngle) * currentOrbitDist;

                const aim = Math.atan2(player.y - shootY, player.x - shootX);

                enemyBullets.push({
                    x: shootX, y: shootY,
                    vx: Math.cos(aim) * bSpd, vy: Math.sin(aim) * bSpd,
                    life: 200, color: '#fff', isLaserMissile: true
                });
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            distortGrid(e.x, e.y, 40, 100);
        }
    }
}

function updateJellyfishAI(e) {
    e.timer += gameSpeed;

    if (e.chargeLevel === undefined) e.chargeLevel = 0;
    // 自機への角度を計算
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const distToPlayer = Math.hypot(dx, dy) || 1;
    const targetAngle = Math.atan2(dy, dx);

    // ゆっくり自機の方へ旋回
    let diff = targetAngle - e.angle;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    // 帯電クラゲの方が旋回性能が高い
    const turnSpd = (e.variant === 'spark') ? 0.05 : 0.03;
    e.angle += diff * turnSpd * gameSpeed;

    // --- 脈動（パルス）と慣性ロジック ---
    // サイン波を使って収縮・膨張のリズムを作る
    const pulse = Math.sin(e.timer * 0.08);

    // 1. 水の抵抗（摩擦）による自然な減速
    // ここで毎フレーム速度を落とすことで、滑るような「慣性」が生まれる
    e.vx *= 0.95;
    e.vy *= 0.95;

    // 2. 脈動による加速（水を蹴る）
    if (pulse > 0) {
        // サイン波がプラスの時（カサをすぼめる時）に前方に加速力を足し込む
        const accel = pulse * e.speed * 0.4;
        e.vx += Math.cos(e.angle) * accel;
        e.vy += Math.sin(e.angle) * accel;
    } else {
        // 脈動が止まっている（カサが開いている）間も、わずかな推進力を与えてフワフワ漂わせる
        const drift = e.speed * 0.03;
        e.vx += Math.cos(e.angle) * drift;
        e.vy += Math.sin(e.angle) * drift;
    }

    // 最終的な速度を座標に適用
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // ==========================================
    // ★攻撃ロジックの分岐
    // ==========================================
    if (e.variant === 'spark') {
        // --- 帯電クラゲ（放電攻撃） ---
        if (pulse > 0) {
            // 収縮時にチャージを溜める
            e.chargeLevel += 0.05 * gameSpeed;

            // チャージエフェクト（ビリビリ：赤橙色に）
            if (Math.random() < e.chargeLevel && frame % 3 === 0) {
                const r = 20 * e.scale;
                const a = Math.random() * Math.PI * 2;
                particles.push({
                    x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r,
                    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
                    color: '#ff4400', life: 0.2, size: 2 // ★変更: 白から赤橙に
                });
            }
        }

        // 収縮のピークで一気に放電！
        if (pulse > 0.95 && e.canFire && e.chargeLevel > 1.0) {
            e.canFire = false;
            e.chargeLevel = 0;

            // 自身を中心とした放電エフェクト（そのまま残す）
            //rings.push({ x: e.x, y: e.y, r: 10, color: '#ff0000', life: 1.5 });
            //rings.push({ x: e.x, y: e.y, r: 40, color: '#ff8800', life: 1.0 });

            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            distortGrid(e.x, e.y, 80, 150);

            // ★ 変更：自機に向かって飛んでいく衝撃波を生成
            const bSpd = 12 * SPEED_SCALE; // 弾の速度
            enemyBullets.push({
                x: e.x + Math.cos(e.angle) * 20,
                y: e.y + Math.sin(e.angle) * 20,
                vx: Math.cos(targetAngle) * bSpd,
                vy: Math.sin(targetAngle) * bSpd,
                life: 200,
                color: '#ff4400', // 危険な赤橙色
                isShockwave: true, // ★衝撃波フラグ
                baseScale: 1.0     // 拡大用の初期スケール
            });
        } else if (pulse < 0) {
            e.canFire = true;
            e.chargeLevel = Math.max(0, e.chargeLevel - 0.02 * gameSpeed);
        }

    } else {
        // --- 通常クラゲ（小さな衝撃波の発射） ---
        if (pulse > 0.95 && e.canFire) {
            e.canFire = false;
            if (Math.random() < 0.3) {
                const bSpd = 8 * SPEED_SCALE;
                enemyBullets.push({
                    x: e.x + Math.cos(e.angle) * 10,
                    y: e.y + Math.sin(e.angle) * 10,
                    vx: Math.cos(targetAngle) * bSpd,
                    vy: Math.sin(targetAngle) * bSpd,
                    life: 120,                // 帯電クラゲより寿命を短く
                    color: e.color || '#0ff', // クラゲと同じシアン色
                    isShockwave: true,        // ★衝撃波フラグ
                    baseScale: 0.5,           // ★初期サイズを小さく (帯電クラゲは1.0)
                    scaleSpeed: 0.01          // ★拡大速度も遅く (帯電クラゲは0.02)
                });

                // 衝撃波なので「ピシュッ」という単発音より、レーザー系の音を流用
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
                // 撃った瞬間に少しだけ空間を歪ませる
                if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 30, 80);
            }
        } else if (pulse < 0) {
            e.canFire = true;
        }
    }
}

function updateSentinelAI(e) {
    e.timer += gameSpeed;
    const cycleTime = e.timer % 240;

    let targetAngle = e.angle; // 旋回する目標の角度

    if (cycleTime < 150) {
        // --- 周回モード (Orbit) ---
        e.state = 'orbit';
        const currentAngle = Math.atan2(e.y - player.y, e.x - player.x);
        const nextAngle = currentAngle + (0.02 * e.orbitDir * gameSpeed);

        const tx = player.x + Math.cos(nextAngle) * e.orbitDist;
        const ty = player.y + Math.sin(nextAngle) * e.orbitDist;

        // ★修正：0.9 だとワープするので、0.05 に下げて滑らかに追従させる
        e.vx = (tx - e.x) * 0.1;
        e.vy = (ty - e.y) * 0.1;

        // 目標角度：進行方向を向く
        targetAngle = Math.atan2(e.vy, e.vx);

    } else if (cycleTime < 210) {
        // --- スキャンモード (Scan) ---
        e.state = 'scan';
        e.vx *= 0.9; // その場で停止して狙う
        e.vy *= 0.9;

        // 目標角度：プレイヤー（自機）の方を向く
        targetAngle = Math.atan2(player.y - e.y, player.x - e.x);

    } else if (cycleTime >= 210 && cycleTime < 220) {
        // --- 発射 (Fire) ---
        // 目標角度：発射中もプレイヤーの方を向いたまま
        targetAngle = Math.atan2(player.y - e.y, player.x - e.x);

        if (e.state !== 'fire') {
            e.state = 'fire';
            // 高速弾を発射
            const bSpd = 22 * SPEED_SCALE;
            enemyBullets.push({
                x: e.x, y: e.y,
                vx: Math.cos(e.angle) * bSpd, // 現在向いている方向に撃つ
                vy: Math.sin(e.angle) * bSpd,
                life: 180, color: e.color, isLaserMissile: true
            });
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 30, 80);
        }
    }

    // --- 向きの滑らかな旋回処理 ---
    let diff = targetAngle - e.angle;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    // スキャン時は素早く自機を向き、移動中は自然な速度で向く
    const turnSpeed = (e.state === 'scan' || e.state === 'fire') ? 0.15 : 0.08;
    e.angle += diff * turnSpeed * gameSpeed;

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
}

function updateTurretAI(e) {
    // 1. 親大陸が生きているかチェック
    const parent = enemies.find(other => other.islandId === e.parentIslandId && other.hp > 0);

    // 親がいなくなったら（破壊されたら）、砲台も連鎖爆発して消滅
    if (!parent) {
        e.hp = 0;
        e.isDead = true; // 即死フラグ
        // 誘爆エフェクト（スコアなしで消す場合はここでエフェクトだけ出す）
        if (typeof createExplosion === 'function') {
            createExplosion(e.x, e.y, '#f00', 5);
        }
        return;
    }

    // 2. 自機を狙う（旋回）
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    // 距離チェック（画面外なら何もしない）
    const dist = Math.hypot(dx, dy);
    if (dist > 800) return;

    const targetAngle = Math.atan2(dy, dx);

    // ゆっくり砲身を向ける
    let diff = targetAngle - e.angle;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    e.angle += diff * 0.1 * gameSpeed;

    // 3. 射撃
    e.fireTimer += gameSpeed;
    // 画面内にいるときだけ撃つ
    if (e.fireTimer > 120 && dist < 500) {
        e.fireTimer = 0;
        // 弾速
        const bSpd = 6 * SPEED_SCALE;

        // 敵弾発射
        enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(e.angle) * bSpd,
            vy: Math.sin(e.angle) * bSpd,
            life: 180,
            color: '#f80' // オレンジ色の弾
        });

        if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
    }
}

// ==========================================
// BOSS
// ==========================================
function updateFighterJetAI(eb) {
    eb.timer += gameSpeed;

    // ==========================================
    // ★ 修正：自機の前に「真の円弧」状に並べる計算
    // ==========================================
    // eb.baseAngle は「自機からボスへ向かう角度」
    // eb.orbitAngleOffset は「-2, -1, 0, 1, 2」の並び位置インデックス

    // ビットとビットの間の広がり角度（0.25ラジアン ≒ 約14度）
    // この数値を大きくすると円弧が広く開き、小さくすると密集します。
    const spreadAngle = 0.15;

    // このビットが配置されるべき正確な角度
    const currentOrbitAngle = eb.baseAngle + (eb.orbitAngleOffset * spreadAngle);

    // 自機(player)を中心点として、指定した半径(targetRadius)の円周上に配置
    const finalTargetX = player.x + Math.cos(currentOrbitAngle) * eb.targetRadius;
    const finalTargetY = player.y + Math.sin(currentOrbitAngle) * eb.targetRadius;
    // ==========================================

    if (eb.state === 'deploy') {
        const dx = finalTargetX - eb.x;
        const dy = finalTargetY - eb.y;
        const spring = 0.003 * gameSpeed;
        eb.vx += dx * spring;
        eb.vy += dy * spring;
        eb.vx *= 0.94;
        eb.vy *= 0.94;

        if (eb.timer > 60) {
            eb.state = 'aim';
            eb.timer = 0;
        }
    } else if (eb.state === 'aim') {
        eb.vx = (finalTargetX - eb.x) * 0.02;
        eb.vy = (finalTargetY - eb.y) * 0.02;

        eb.aimProgress = eb.timer / 40;
        eb.distToPlayer = Math.hypot(player.x - eb.x, player.y - eb.y);

        // ==========================================
        // ★ 修正：照準中に「ピピピピ」と鳴らす
        // ==========================================
        // 10フレームに1回（約0.16秒おき）に音を鳴らす
        if (Math.floor(eb.timer) % 10 === 0) {
            if (typeof AudioSys !== 'undefined') {
                AudioSys.playSE('target_ping');
            }
        }
        // ==========================================

        if (eb.timer > 40) {
            eb.state = 'fire';
            eb.timer = 0;
        }
    } else if (eb.state === 'fire') {
        eb.vx *= 0.8;
        eb.vy *= 0.8;

        if (Math.floor(eb.timer) % 6 === 0 && eb.burstCount < 3) {
            const aimAngle = Math.atan2(player.y - eb.y, player.x - eb.x);
            enemyBullets.push({
                x: eb.x, y: eb.y,
                vx: Math.cos(aimAngle) * 32 * SPEED_SCALE,
                vy: Math.sin(aimAngle) * 32 * SPEED_SCALE,
                life: 250, color: '#f05', isLaserMissile: true
            });
            eb.burstCount++;
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            eb.vx -= Math.cos(aimAngle) * 2.5 * SPEED_SCALE;
            eb.vy -= Math.sin(aimAngle) * 2.5 * SPEED_SCALE;
        }

        if (eb.timer > 30) {
            eb.state = 'escape';
            eb.timer = 0;
        }
    } else if (eb.state === 'escape') {
        const escAngle = Math.atan2(eb.y - player.y, eb.x - player.x);
        eb.vx += Math.cos(escAngle) * 1.0 * SPEED_SCALE * gameSpeed;
        eb.vy += Math.sin(escAngle) * 1.0 * SPEED_SCALE * gameSpeed;
        if (eb.timer > 100) eb.hp = 0;
    }

    eb.x += eb.vx * gameSpeed;
    eb.y += eb.vy * gameSpeed;


    // 向きの更新
    let targetDrawAngle = Math.atan2(eb.vy, eb.vx);
    if (eb.state === 'aim' || eb.state === 'fire') {
        targetDrawAngle = Math.atan2(player.y - eb.y, player.x - eb.x);
    }
    if (eb.drawAngle === undefined) eb.drawAngle = targetDrawAngle;
    let angleDiff = targetDrawAngle - eb.drawAngle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    eb.drawAngle += angleDiff * 0.2 * gameSpeed;

    // パーティクル
    if (frame % 2 === 0 && (eb.state === 'deploy' || eb.state === 'escape')) {
        particles.push({
            x: eb.x - Math.cos(eb.drawAngle) * 15 * G_SCALE,
            y: eb.y - Math.sin(eb.drawAngle) * 15 * G_SCALE,
            vx: -eb.vx * 0.2,
            vy: -eb.vy * 0.2,
            color: '#0ff', life: 0.3, size: 1.5
        });
    }
}

function updateBossAI(e) {
    // --- 1. 出現演出中の処理 ---
    if (e.isSpawning) {
        e.spawnTimer++;
        // 出現中は物理演算を完全に止めて spawnX に固定する
        e.x = e.spawnX;
        e.y = e.spawnY;
        e.vx = 0;
        e.vy = 0;

        if (e.spawnTimer >= e.spawnMax) {
            e.isSpawning = false;
        }
        return; // 出現中はここで終了し、以下の移動処理を通さない
    }

    // --- 2. 移動ロジック ---
    if (!Number.isFinite(e.x)) e.x = e.spawnX || worldSize / 2;
    if (!Number.isFinite(e.y)) e.y = e.spawnY || worldSize / 2;

    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.1;

    e.vx += (dx / d) * 0.02 * SPEED_SCALE * gameSpeed;
    e.vy += (dy / d) * 0.02 * SPEED_SCALE * gameSpeed;

    const cv = Math.hypot(e.vx, e.vy);
    if (cv > e.speed) {
        e.vx = (e.vx / cv) * e.speed;
        e.vy = (e.vy / cv) * e.speed;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    const margin = 100;
    e.x = Math.max(margin, Math.min(worldSize - margin, e.x));
    e.y = Math.max(margin, Math.min(worldSize - margin, e.y));

    // --- 3. 高速回転・レーザーミサイルバラ撒き・射撃ロジック ---
    e.fireTimer++;

    const maxCycle = 280;
    const brakeStart = 160;
    const fireTime = 220;
    const restartTime = 250;

    let rotationSpeed = 0.12;

    if (e.fireTimer < brakeStart) {
        // 【通常回転フェーズ】
        // ★弱体化：発射密度をさらに下げ「20フレームごと」に（以前は12）
        if (e.fireTimer % 20 === 0) {
            const sides = e.variant.sides;
            // ★弱体化：弾速を 14 → 9 に低下させ、回避に猶予を持たせる
            const bulletSpd = 9 * SPEED_SCALE;

            for (let i = 0; i < sides; i++) {
                const a = e.angle + (Math.PI * 2 / sides) * i;
                enemyBullets.push({
                    x: e.x + Math.cos(a) * 45,
                    y: e.y + Math.sin(a) * 45,
                    vx: Math.cos(a) * (BULLET_CONFIG.BOSS_LASER.SPEED * SPEED_SCALE),
                    vy: Math.sin(a) * (BULLET_CONFIG.BOSS_LASER.SPEED * SPEED_SCALE),
                    life: BULLET_CONFIG.BOSS_LASER.LIFE,
                    isLaserMissile: true,
                    color: e.color
                });
            }
            if (e.fireTimer % 20 === 0) AudioSys.playSE('shoot');
        }
    }
    else if (e.fireTimer >= brakeStart && e.fireTimer < fireTime) {
        // 【減速フェーズ】
        const ratio = 1.0 - (e.fireTimer - brakeStart) / (fireTime - brakeStart);
        rotationSpeed = Math.pow(ratio, 1.5) * 0.12;

        if (frame % 3 === 0) {
            const ang = Math.random() * Math.PI * 2;
            particles.push({
                x: e.x + Math.cos(ang) * 80, y: e.y + Math.sin(ang) * 80,
                vx: -Math.cos(ang) * 4, vy: -Math.sin(ang) * 4,
                color: '#fff', life: 0.2, size: 1.5
            });
        }
    }
    else if (e.fireTimer >= fireTime && e.fireTimer < restartTime) {
        // 【発射＆硬直フェーズ】
        rotationSpeed = 0;

        if (e.fireTimer === fireTime) {
            const sides = e.variant.sides;
            const bulletSpd = ENEMY_SPEEDS.BOSS_MISSILE * SPEED_SCALE;

            for (let i = 0; i < sides; i++) {
                const a = e.angle + (Math.PI * 2 / sides) * i;
                enemyBullets.push({
                    x: e.x + Math.cos(a) * 60,
                    y: e.y + Math.sin(a) * 60,
                    vx: Math.cos(a) * (BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE),
                    vy: Math.sin(a) * (BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE),
                    life: BULLET_CONFIG.BOSS_HOMING.LIFE,
                    isMissile: true,
                    color: e.color,
                    trail: []
                });
            }
            AudioSys.playSE('launch');
            rings.push({ x: e.x, y: e.y, r: 20, color: '#fff', life: 1.0 });
            rings.push({ x: e.x, y: e.y, r: 100, color: e.color, life: 0.8 });
            distortGrid(e.x, e.y, 100, 200);
        }
    }
    else if (e.fireTimer >= restartTime) {
        // 【再始動フェーズ】
        const ratio = (e.fireTimer - restartTime) / (maxCycle - restartTime);
        rotationSpeed = Math.pow(ratio, 2) * 0.12;
    }

    e.angle += rotationSpeed;
    if (e.fireTimer >= maxCycle) e.fireTimer = 0;
}

function updateBossSpecialAI(e) {
    // --- 共通: 出現演出 ---
    if (e.isSpawning) {
        e.spawnTimer++;
        if (e.spawnTimer >= e.spawnMax) e.isSpawning = false;
        else {
            e.x = e.spawnX; e.y = e.spawnY; e.vx = 0; e.vy = 0;
            return;
        }
    }

    // --- 共通: 移動ロジック ---
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const distToPlayer = Math.hypot(dx, dy) || 1;

    // 通常より少し積極的に動く
    e.vx += (dx / distToPlayer) * 0.03 * SPEED_SCALE * gameSpeed;
    e.vy += (dy / distToPlayer) * 0.03 * SPEED_SCALE * gameSpeed;

    e.vx *= 0.96; e.vy *= 0.96;
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    const margin = 150;
    e.x = Math.max(margin, Math.min(worldSize - margin, e.x));
    e.y = Math.max(margin, Math.min(worldSize - margin, e.y));

    // --- 共通: カウンター攻撃判定（マイルド版） ---
    if (e.prevHp && e.hp < e.prevHp) {
        // 確率を15%に落とし、単発の自機狙いにする
        if (Math.random() < 0.15) {
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            const spd = 10 * SPEED_SCALE;
            enemyBullets.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                life: 180, color: '#fff'
            });
            // 反撃のサインとして小さな火花
            createExplosion(e.x, e.y, '#fff', 3);
            AudioSys.playSE('shoot');
        }
    }
    e.prevHp = e.hp;

    // --- フェーズ管理 ---
    e.fireTimer++;
    const cycle = 750;
    const phaseTime = e.fireTimer % cycle;

    if (phaseTime < 250) {
        // Phase 1: 拡散 (16F間隔のリズム)
        e.angle += 0.15;
        if (frame % 16 === 0) {
            const sides = e.variant.sides;
            // 定数による弾速調整
            const bulletSpd = BULLET_CONFIG.BOSS_LASER.SPEED * SPEED_SCALE * BOSS_RUSH_BULLET_CONFIG.PHASE1_LASER_SPD;
            for (let i = 0; i < sides; i++) {
                const a = e.angle + (Math.PI * 2 / sides) * i;
                enemyBullets.push({
                    x: e.x + Math.cos(a) * 45, y: e.y + Math.sin(a) * 45,
                    vx: Math.cos(a) * bulletSpd, vy: Math.sin(a) * bulletSpd,
                    life: BULLET_CONFIG.BOSS_LASER.LIFE, isLaserMissile: true, color: e.color
                });
            }
            AudioSys.playSE('shoot');
        }
    } else if (phaseTime < 450) {
        // Phase 2: 狙撃 (警告あり)
        const targetAngle = Math.atan2(player.y - e.y, player.x - e.x);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.angle += diff * 0.1;

        const sub = (phaseTime - 250) % 60;
        if (sub < 20) e.isWarningSnipe = true;
        else if (sub === 21) {
            e.isWarningSnipe = false;
            const lead = 15;
            const predX = player.x + player.vx * lead;
            const predY = player.y + player.vy * lead;
            const aim = Math.atan2(predY - e.y, predX - e.x);
            // 定数による弾速調整
            const spd = BOSS_RUSH_BULLET_CONFIG.PHASE2_SNIPE_SPD * SPEED_SCALE;
            for (let i = 0; i < 3; i++) {
                enemyBullets.push({
                    x: e.x, y: e.y,
                    vx: Math.cos(aim) * spd * (1 - i * 0.1),
                    vy: Math.sin(aim) * spd * (1 - i * 0.1),
                    life: 200, color: '#f00'
                });
            }
            AudioSys.playSE('launch');
            createExplosion(e.x, e.y, '#f00', 5);
        }
    } else {
        // Phase 3: 誘導
        e.angle += 0.03;
        const sub = phaseTime - 450;
        if (sub === 10 || sub === 120) {
            const sides = Math.min(e.variant.sides, 6);
            // 定数による弾速調整
            const speed = BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE * BOSS_RUSH_BULLET_CONFIG.PHASE3_MISSILE_SPD;
            for (let i = 0; i < sides; i++) {
                const a = e.angle + (Math.PI * 2 / sides) * i;
                enemyBullets.push({
                    x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60,
                    vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                    life: 300, isMissile: true, color: e.color,
                    trail: []
                });
            }
            AudioSys.playSE('launch');
            distortGrid(e.x, e.y, 100, 200);
        }
    }
}

function updateBattleshipAI(e) {
    // 1. 出現演出
    if (e.isSpawning) {
        e.spawnTimer++;
        if (e.spawnTimer >= e.spawnMax) {
            e.isSpawning = false;
            if (ui.bossContainer) ui.bossContainer.style.display = 'block';
            if (ui.bossNameLabel) {
                ui.bossNameLabel.innerText = "GENESIS-ARK";
                ui.bossNameLabel.style.color = "#0ff";
            }
            if (ui.bossHpBarInline) ui.bossHpBarInline.style.backgroundColor = "#0ff";
            if (ui.bossBarFrame) ui.bossBarFrame.style.borderColor = "#0ff";
        }
        return;
    }

    // --- ★HP割合の計算と発狂モード判定 ---
    const hpPct = e.hp / e.maxHp;
    const isDesperationMode = hpPct <= 0.50;

    e.fireTimer++;

    // 2. 基本移動（追尾）
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.1;

    if (isDesperationMode) {
        e.vx *= 0.95; e.vy *= 0.95;
    } else {
        const cycle = e.fireTimer % 1380;
        const isRushing = (cycle >= 900 && cycle < 1200);
        const moveSpeed = isRushing ? e.speed * 2.5 : e.speed;
        const accel = isRushing ? 0.05 : 0.01;
        e.vx += (dx / d) * accel * SPEED_SCALE;
        e.vy += (dy / d) * accel * SPEED_SCALE;
        const cv = Math.hypot(e.vx, e.vy);
        if (cv > moveSpeed) {
            e.vx = (e.vx / cv) * moveSpeed;
            e.vy = (e.vy / cv) * moveSpeed;
        }
    }
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // 3. 旋回・発光演出
    if (isDesperationMode) {
        e.angle += 0.25 * gameSpeed;
        if (ui.bossNameLabel) {
            ui.bossNameLabel.innerText = "CRITICAL: EVENT HORIZON";
            ui.bossNameLabel.style.color = "#f0f";
        }
        if (ui.bossHpBarInline) {
            ui.bossHpBarInline.style.backgroundColor = (frame % 4 < 2) ? "#fff" : "#f0f";
            ui.bossHpBarInline.style.boxShadow = "0 0 15px #f0f";
        }
        if (ui.bossBarFrame) ui.bossBarFrame.style.borderColor = "#f0f";


        // 30フレーム（約1秒）に1回、ワームホールから敵を召喚
        if (frame % 30 === 0) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 400;
            const sx = e.x + Math.cos(spawnAngle) * spawnDist;
            const sy = e.y + Math.sin(spawnAngle) * spawnDist;

            // 境界チェック（画面外すぎる場合はクランプ）
            const targetX = Math.max(100, Math.min(worldSize - 100, sx));
            const targetY = Math.max(100, Math.min(worldSize - 100, sy));

            // ワームホール生成演出
            wormholes.push({ x: targetX, y: targetY, life: 60, maxLife: 60, active: true });
            if (typeof distortGrid === 'function') distortGrid(targetX, targetY, 150, 300);

            // 0.5秒後に敵を出現させる
            setTimeout(() => {
                if (gameState === 'PLAYING' && isDesperationMode) {
                    const types = ['triangle', 'tadpole', 'dragon', 'asteroid'];
                    const randomType = types[Math.floor(Math.random() * types.length)];

                    // 1. 敵を生成（spawnEnemy内部でステージ10の速度補正 1.72倍 がすでにかかります）
                    spawnEnemy(targetX, targetY, randomType, 1, '#e00');

                    const newEnemy = enemies[enemies.length - 1];
                    if (newEnemy) {
                        // ==========================================
                        // ★ 修正：2倍補正を削除し、ステージ10の最高速度にリセット
                        // ==========================================
                        // newEnemy.speed はすでに計算済み（ベース速度 × 0.25 × 1.72）

                        // 登場時の勢い（vx, vy）を現在の進行方向に合わせる
                        const angle = Math.random() * Math.PI * 2;
                        newEnemy.vx = Math.cos(angle) * newEnemy.speed;
                        newEnemy.vy = Math.sin(angle) * newEnemy.speed;

                        newEnemy.color = '#e00'; // 発狂モードの敵として赤色に統一
                    }
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
                }
            }, 500);
        }

    } else {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const cycle = e.fireTimer % 1380;
        if (cycle >= 900 && cycle < 1200) e.angle += 0.15 * gameSpeed;
        else e.angle += diff * 0.01 * gameSpeed;

        // 150フレームに1回、30%の確率でアステロイドを召喚
        if (frame % 150 === 0 && Math.random() < 0.3) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const sx = e.x + Math.cos(spawnAngle) * 300;
            const sy = e.y + Math.sin(spawnAngle) * 300;

            wormholes.push({ x: sx, y: sy, life: 80, maxLife: 80, active: true });
            setTimeout(() => {
                if (gameState === 'PLAYING' && !isDesperationMode) {
                    spawnEnemy(sx, sy, 'asteroid');
                }
            }, 800);
        }
    }

    // 4. 攻撃ロジック

    const cycle = e.fireTimer % 1380;
    const sides = e.variant.sides || 12;

    if (cycle < 300) {
        if (cycle % 60 === 0) {
            for (let j = 0; j < sides; j++) {
                const baseA = e.angle + (Math.PI * 2 / sides) * j;
                const sx = e.x + Math.cos(baseA) * 100, sy = e.y + Math.sin(baseA) * 100;
                for (let i = -1; i <= 1; i++) {
                    const a = baseA + (i * 0.2);
                    enemyBullets.push({
                        x: sx, y: sy, vx: Math.cos(a) * 24 * SPEED_SCALE, vy: Math.sin(a) * 24 * SPEED_SCALE,
                        life: 200, color: '#0ff', isLaserMissile: true
                    });
                }
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
            // ==========================================
            // ★追加：全方位レーザー発射時の軽い歪み
            // ==========================================
            if (typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 100, 300);
            }

        }
    }
    // ==========================================
    // ★ 修正：パターン2 ファイター一斉展開＆包囲（ゆっくり）
    // ==========================================
    else if (cycle < 600) {
        if (cycle % 10 === 0 && typeof distortGrid === 'function') {
            distortGrid(e.x, e.y, 250, -15);
        }
        if (cycle === 320 || cycle === 460) {
            const fighterCount = 10;
            const pToBossAngle = Math.atan2(e.y - player.y, e.x - player.x);
            const bossToPlayerAngle = pToBossAngle + Math.PI;

            for (let i = 0; i < fighterCount; i++) {
                const posIdx = i - Math.floor(fighterCount / 2);
                const launchA = bossToPlayerAngle + posIdx * 0.4;

                enemies.push({
                    x: e.x,
                    y: e.y,
                    // ★修正: 初速を 2.5 -> 0.5 に下げて、フワッと射出させる
                    vx: Math.cos(launchA) * 0.25 * SPEED_SCALE,
                    vy: Math.sin(launchA) * 0.25 * SPEED_SCALE,
                    hp: 3, speed: 1.0, color: '#0ff', type: 'fighter', state: 'deploy',
                    timer: 0, burstCount: 0, baseAngle: pToBossAngle, orbitAngleOffset: posIdx,
                    targetRadius: 400, scale: 0.8, noDrop: true
                });
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');

            // ==========================================
            // ★追加：ファイター射出時の歪み（射出の反動を表現）
            // ==========================================
            if (typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 150, 400);
            }
        }
    }
    // ==========================================
    // ★ 修正：ミサイルから「ワームホール & Phantom召喚」へ変更
    // ==========================================
    else if (cycle < 900) {
        const sub = cycle % 100; // 召喚の間隔を少し調整（約2.5秒に1回）

        if (sub === 0) {
            // 1. ボスの斜め前方にワームホールを生成する座標を計算
            // ボスの向いている角度(e.angle)から少し横にずらす
            const spawnAngle = e.angle + (Math.random() > 0.5 ? 0.8 : -0.8);
            const spawnDist = 200;
            const sx = e.x + Math.cos(spawnAngle) * spawnDist;
            const sy = e.y + Math.sin(spawnAngle) * spawnDist;

            // 2. ワームホールを設置（life 100で消える設定）
            wormholes.push({
                x: sx,
                y: sy,
                life: 100,
                maxLife: 100,
                active: true
            });
            if (typeof distortGrid === 'function') distortGrid(sx, sy, 100, 200);

            // 3. 少し遅らせて（ワームホールが開ききった頃）Phantomを出現させる
            setTimeout(() => {
                // ゲームが進行中（タイトルに戻っていない）かチェック
                if (gameState === 'PLAYING') {
                    spawnEnemy(sx, sy, 'phantom');
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
                }
            }, 600); // 0.6秒後に実体化
        }
    }
    else if (cycle < 1200) {
        if (cycle % 10 === 0) {
            for (let i = 0; i < 8; i++) {
                const a = e.angle + (Math.PI * 2 / 8) * i;
                enemyBullets.push({
                    x: e.x + Math.cos(a) * 80, y: e.y + Math.sin(a) * 80,
                    vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
                    life: 200, color: '#0ff', isLaserMissile: true
                });
            }

            // ==========================================
            // ★追加：回転連射中の継続的な軽い歪み
            // ==========================================
            if (cycle === 900 && typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 140, 150);
            }
        }
        if (Math.random() < 0.3) createExplosion(e.x + (Math.random() - 0.5) * 150, e.y + (Math.random() - 0.5) * 150, '#0ff', 5);
    }

}


// =========================================================
// 9. エンティティ更新 (Entity Updates)
// =========================================================
function updateEntities() {
    updatePlayerBullets();
    updateLasers();
    updateEnemies();
    updateEnemyBullets();
    updateCrystals();
    updatePowerups();
    updateMissiles();
    updateParticlesAndRings();
    updatePlayerStatus();
}

function updatePlayerBullets() {
    // 現在のカメラの表示範囲を計算
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const margin = 50; // 画面外50pxまで飛んだら消す（自然なフェードアウト感のため）

    bullets.forEach(b => {
        b.x += b.vx * gameSpeed;
        b.y += b.vy * gameSpeed;
        b.life--;

        // --- ★追加：画面（カメラ）の範囲外に出たら弾を消滅させる ---
        if (b.x < camera.x - margin || b.x > camera.x + viewW + margin ||
            b.y < camera.y - margin || b.y > camera.y + viewH + margin) {
            b.life = 0;
            return; // 消滅したので以後の当たり判定をスキップ
        }

        // --- ワールド境界との衝突判定 ---
        if (b.x < WALL_MARGIN || b.x > worldSize - WALL_MARGIN ||
            b.y < WALL_MARGIN || b.y > worldSize - WALL_MARGIN) {

            const impactX = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, b.x));
            const impactY = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, b.y));

            createWallImpact(impactX, impactY, '#0f8');
            b.life = 0;
            return; // 消滅したので以後の判定をスキップ
        }

        // --- 敵との当たり判定 ---
        enemies.forEach(e => {
            // 弾が消えている、敵が死んでいる、または【敵が画面外の場合はスキップ】
            if (b.life <= 0 || e.hp <= 0 || !e.inActiveRange) return;

            // --- 出現演出中のボスはショットをすり抜ける ---
            if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) return;

            // 敵の種類ごとの判定半径
            let hitRadius = 30 * e.scale;
            if (e.type === 'asteroid' || e.type === 'bubble') hitRadius = 25 * e.scale; // ★bubbleも念のため追加
            else if (e.type === 'dragon') hitRadius = ENEMY_HITBOX.DRAGON;
            else if (e.type === 'triangle') hitRadius = ENEMY_HITBOX.TRIANGLE;
            else if (e.type === 'cube') hitRadius = ENEMY_HITBOX.CUBE;
            else if (e.type === 'tadpole') hitRadius = ENEMY_HITBOX.TADPOLE;
            else if (e.type === 'hunter') hitRadius = ENEMY_HITBOX.HUNTER;
            else if (e.type === 'boss') hitRadius = ENEMY_HITBOX.BOSS;

            // 距離チェック
            if (Math.hypot(b.x - e.x, b.y - e.y) < hitRadius) {

                b.life = 0; // 弾を消す
                e.hp--;     // ダメージを与える

                // 1. ボスの場合
                if (e.type === 'boss' || e.type === 'battleship') { // ★念のためbattleshipも追加
                    e.flashTimer = 5;
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('boss_hit');
                    for (let i = 0; i < 3; i++) {
                        particles.push({
                            x: b.x, y: b.y,
                            vx: (Math.random() - 0.5) * 20 * SPEED_SCALE,
                            vy: (Math.random() - 0.5) * 20 * SPEED_SCALE,
                            color: '#fff',
                            life: 0.2,
                            size: 2 * G_SCALE
                        });
                    }
                }
                // 2. ボス以外の敵
                else {
                    if (e.hp > 0) {
                        if (typeof AudioSys !== 'undefined') AudioSys.playSE('enemy_hit');
                        const sparkColor = e.color || '#fff';
                        for (let i = 0; i < 4; i++) {
                            particles.push({
                                x: b.x,
                                y: b.y,
                                vx: (Math.random() - 0.5) * 8,
                                vy: (Math.random() - 0.5) * 8,
                                color: sparkColor,
                                life: 0.8 + Math.random() * 0.4,
                                size: 2.0
                            });
                        }
                    }
                }
            }
        });
    });
    bullets = bullets.filter(b => b.life > 0);
}

function updateLasers() {
    // ★追加：現在のカメラの表示範囲に基づいて、レーザーの最大長を計算
    // （画面の幅・高さの大きい方 + 余白100px くらいで自然に見切れるようにする）
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const dynamicMaxLen = Math.max(viewW, viewH) + 100;

    lasers.forEach(l => {
        l.life--;

        // ★修正1：長さを固定の2000ではなく、画面サイズに合わせる
        let currentLen = dynamicMaxLen;

        const cos = Math.cos(l.angle);
        const sin = Math.sin(l.angle);

        // --- 壁との交差判定（壁で止める処理） ---
        const min = WALL_MARGIN;
        const max = worldSize - WALL_MARGIN;

        let distX = Infinity;
        if (cos !== 0) {
            distX = (cos > 0 ? max - l.x : min - l.x) / cos;
        }

        let distY = Infinity;
        if (sin !== 0) {
            distY = (sin > 0 ? max - l.y : min - l.y) / sin;
        }

        const distToWall = Math.min(distX, distY);

        if (distToWall < currentLen) {
            currentLen = distToWall;

            // 壁に当たった地点でエフェクト発生
            const hitX = l.x + cos * currentLen;
            const hitY = l.y + sin * currentLen;
            createWallImpact(hitX, hitY, '#0ff'); // シアン色の火花
        }

        const p1x = l.x;
        const p1y = l.y;

        // --- 敵との衝突判定 ---
        enemies.forEach(e => {
            // ★修正2：敵が死んでいる、または【画面外の場合はスキップ（オフスクリーンキル防止）】
            if (e.hp <= 0 || !e.inActiveRange) return;

            // ★修正3：出現中のボス・戦艦には当たらないようにする
            if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) return;

            const dx = e.x - p1x;
            const dy = e.y - p1y;
            const distToEnemy = Math.hypot(dx, dy);

            // 敵の方向とレーザーの方向が一致しているか
            const angleToEnemy = Math.atan2(dy, dx);
            let diff = Math.abs(l.angle - angleToEnemy);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            // 角度が近く、かつ現在の長さ（壁までの距離含む）より近い場合
            if (diff < 0.35 && distToEnemy < currentLen) {
                // ★修正4：巨大戦艦(battleship)の判定も追加
                const hitRadius = (e.type === 'boss' || e.type === 'battleship' ? 45 : 15) * e.scale;

                // ボスや戦艦の場合はレーザーを貫通させず、そこで止める
                if (e.type === 'boss' || e.type === 'battleship') {
                    currentLen = Math.min(currentLen, distToEnemy);
                    e.flashTimer = 5;
                }

                // ダメージ処理
                e.hp -= 0.5;
                if (frame % 2 === 0) {
                    createExplosion(e.x, e.y, e.color, 2);
                    // ヒット地点のエフェクト
                    const hitX = p1x + Math.cos(l.angle) * distToEnemy;
                    const hitY = p1y + Math.sin(l.angle) * distToEnemy;
                    particles.push({
                        x: hitX, y: hitY,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        color: '#fff', life: 0.2, size: 2
                    });
                }
            }
        });

        // 最終的な描画長さを保存
        l.renderLen = currentLen;

        // --- 敵弾の消去判定 ---
        enemyBullets.forEach(eb => {
            if (eb.life <= 0) return;

            const A = p1x - (p1x + cos * currentLen);
            const B = p1y - (p1y + sin * currentLen);
            const C = (p1x + cos * currentLen) * p1y - p1x * (p1y + sin * currentLen);
            const dist = Math.abs(A * eb.y - B * eb.x + C) / (Math.hypot(A, B) || 1);
            const dot = (eb.x - p1x) * cos + (eb.y - p1y) * sin;

            if (dist < ((l.width / 2 + 15) * G_SCALE) && dot > 0 && dot < currentLen) {
                eb.life = 0;
                score += 10;
            }
        });
    });
    lasers = lasers.filter(l => l.life > 0);
}

function updateEnemyBullets() {
    const bulletStageMag = 1.0 + (stage - 1) * DIFFICULTY_CONFIG.BULLET_SPEED_INC;

    enemyBullets.forEach(eb => {
        // --- 1. 座標更新（フェードアウト中も共通して動かす） ---
        eb.x += eb.vx * gameSpeed;
        eb.y += eb.vy * gameSpeed;

        // --- 2. ワールド境界との衝突判定（最優先で壁ブロック） ---
        const isHitWall = (eb.x < WALL_MARGIN || eb.x > worldSize - WALL_MARGIN || eb.y < WALL_MARGIN || eb.y > worldSize - WALL_MARGIN);

        if (isHitWall) {
            // 弾が壁の外に出てしまった場合、座標を壁のラインに強制固定する（貫通防止）
            const impactX = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, eb.x));
            const impactY = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, eb.y));

            // すでにフェードアウト中の弾は静かに消し、生きているレーザー・ミサイルのみ爆発させる
            if (!eb.isFading && (eb.isMissile || eb.isLaserMissile)) {
                createExplosion(impactX, impactY, eb.color, 10);
                AudioSys.playSE('enemy_hit');
                distortGrid(impactX, impactY, 15, 30);
            }

            eb.life = 0; // 壁に当たったら確実に削除
            return;
        }

        // --- 3. フェードアウト中の処理 ---
        if (eb.isFading) {
            eb.baseAlpha = (eb.baseAlpha === undefined ? 1.0 : eb.baseAlpha) - 0.03;
            const wave = (Math.sin(frame * 1.0) + 1) / 2;
            eb.alpha = eb.baseAlpha * wave;
            if (eb.baseAlpha <= 0) eb.life = 0;
            return; // フェードアウト中は以下の誘導や当たり判定を行わない
        }

        // --- 4. 寿命の消費と判定 ---
        eb.life--;
        if (eb.life <= 0) {
            if (eb.isMissile || eb.isLaserMissile) {
                eb.isFading = true;
                eb.fadeTimer = 15;
                eb.life = 1; // フェードアウト演出のために少し延命
                AudioSys.playSE('enemy_hit', 0.5);
            } else {
                eb.life = 0;
            }
            return;
        }

        // --- 5. アステロイドによる弾の吸収（盾機能） ---
        if (!eb.isShockwave) {
            for (const rock of enemies) {
                if (rock.type !== 'asteroid' || rock.hp <= 0) continue;
                const rockRadius = 25 * rock.scale * G_SCALE;
                if (Math.hypot(rock.x - eb.x, rock.y - eb.y) < rockRadius) {
                    eb.life = 0;
                    createExplosion(eb.x, eb.y, '#fff', 3);
                    break;
                }
            }
            if (eb.life === 0) return;
        }

        // --- 6. ミサイルの誘導 ---
        if (eb.isMissile) {
            if (eb.homingTimer === undefined) eb.homingTimer = 240;

            if (eb.trail) {
                eb.trail.unshift({ x: eb.x, y: eb.y });
                if (eb.trail.length > 10) eb.trail.pop();
            }

            if (eb.homingTimer > 0) {
                eb.homingTimer--;
                eb.vx *= 0.99; eb.vy *= 0.99;
                const dx = player.x - eb.x, dy = player.y - eb.y;
                const d = Math.hypot(dx, dy) || 0.001;
                const accel = 0.4 * SPEED_SCALE;
                eb.vx += (dx / d) * accel * gameSpeed;
                eb.vy += (dy / d) * accel * gameSpeed;
            }

            const v = Math.hypot(eb.vx, eb.vy);
            const cruiseSpeed = BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE * bulletStageMag;

            if (v > cruiseSpeed) {
                eb.vx = (eb.vx / v) * cruiseSpeed;
                eb.vy = (eb.vy / v) * cruiseSpeed;
            }

            // プレイヤーのショットで撃墜
            bullets.forEach(b => {
                const hitDist = 20 * G_SCALE;
                if (b.life > 0 && Math.hypot(b.x - eb.x, b.y - eb.y) < hitDist) {
                    createExplosion(eb.x, eb.y, eb.color, 8);
                    AudioSys.playSE('explode_small');
                    eb.life = 0; b.life = 0; score += 50;
                }
            });
            if (eb.life === 0) return;
        }

        // --- 7. プレイヤーとの判定 ---
        if (gameState !== 'DYING' && player.invuln <= 0) {
            const dist = Math.hypot(player.x - eb.x, player.y - eb.y);
            let collisionRadius = (eb.isMissile ? 12 : 8) * G_SCALE;

            if (eb.isShockwave) {
                const growSpd = (eb.scaleSpeed !== undefined) ? eb.scaleSpeed : 0.02;
                eb.baseScale = (eb.baseScale || 1.0) + growSpd * gameSpeed;
                collisionRadius = 18 * eb.baseScale * G_SCALE;
            }

            if (dist < collisionRadius) {
                eb.life = 0;
                createExplosion(player.x, player.y, eb.color || '#f00', 10);
                damage(15);
            }
        }
    });

    // 寿命が尽きた弾を一斉消去
    enemyBullets = enemyBullets.filter(eb => eb.life > 0);
}

function updateMissiles() {
    // missiles配列がない場合は何もしない
    if (typeof missiles === 'undefined') return;

    missiles.forEach(m => {
        // --- 1. ターゲット探索 ---
        if (!m.target || !enemies.includes(m.target)) {
            let min = 9999;
            enemies.forEach(e => {
                if (e.hp > 0) { // 生きている敵だけ対象
                    const d = Math.hypot(e.x - m.x, e.y - m.y);
                    if (d < min) { min = d; m.target = e; }
                }
            });
        }

        // --- 2. 誘導（ホーミング） ---
        const scale = (typeof SPEED_SCALE !== 'undefined') ? SPEED_SCALE : 0.25;

        if (m.target) {
            const ta = Math.atan2(m.target.y - m.y, m.target.x - m.x);
            // 旋回力にも SCALE を適用
            m.vx += Math.cos(ta) * 0.5 * scale;
            m.vy += Math.sin(ta) * 0.5 * scale;
        }

        // --- 3. 速度制限と更新 ---
        const s = Math.hypot(m.vx, m.vy);
        if (s > 0.001) {
            // m.speed は生成時に scale 済みなのでそのまま使う
            m.vx = (m.vx / s) * m.speed;
            m.vy = (m.vy / s) * m.speed;
        }

        // 移動
        m.x += m.vx * gameSpeed;
        m.y += m.vy * gameSpeed;
        m.life--;

        // --- 4. 壁衝突判定 ---
        if (m.x < WALL_MARGIN || m.x > worldSize - WALL_MARGIN ||
            m.y < WALL_MARGIN || m.y > worldSize - WALL_MARGIN) {

            // 壁に当たったら爆発
            if (typeof createExplosion === 'function') {
                const impactX = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, m.x));
                const impactY = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, m.y));
                createExplosion(impactX, impactY, '#fd0', 10);
            }
            if (AudioSys) AudioSys.playSE('explode_small');
            m.life = 0;
            return;
        }

        // --- 5. 敵との衝突判定 ---
        enemies.forEach(e => {
            if (e.hp <= 0) return;
            const hitRadius = (e.type === 'asteroid' ? 25 * e.scale : 30);

            if (Math.hypot(e.x - m.x, e.y - m.y) < hitRadius) {
                e.hp -= 15;
                m.life = 0;
                if (typeof createExplosion === 'function') createExplosion(m.x, m.y, '#fd0', 8);
                if (AudioSys) AudioSys.playSE('explode_small');
                if (typeof distortGrid === 'function') distortGrid(m.x, m.y, 20, 50);
            }
        });

        // --- 6. 軌跡パーティクル ---
        if (frame % 2 === 0 && typeof particles !== 'undefined') {
            particles.push({
                x: m.x, y: m.y,
                vx: (Math.random() - 0.5) * scale,
                vy: (Math.random() - 0.5) * scale,
                color: '#fd0', life: 0.3, size: 2 * G_SCALE
            });
        }
    });

    // 寿命切れを削除
    missiles = missiles.filter(m => m.life > 0);
}

function updateCrystals() {
    crystals.forEach(c => {
        c.life -= gameSpeed;

        // --- 1. 初速（飛び散り）の適用 ---
        // destroyEnemyで設定された vx, vy があれば使用します
        // 0.95 を掛けることで、飛び散った勢いが徐々に弱まる（摩擦）表現になります
        c.vx = (c.vx || 0) * 0.95;
        c.vy = (c.vy || 0) * 0.95;

        // 初速にも SPEED_SCALE を適用して移動させる
        c.x += c.vx * SPEED_SCALE * gameSpeed;
        c.y += c.vy * SPEED_SCALE * gameSpeed;

        // --- 2. 自機への吸い寄せ（マグネット） ---
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const dist = Math.hypot(dx, dy) || 0.0001;

        // 吸い寄せスピード計算に SPEED_SCALE を適用
        // ベース速度(10.0) + 距離による加速(0.08)
        // これにより、遠くにあるときは高速で、近くでも適度な速さで吸い寄せられます
        const pullSpeed = (10.0 + (dist * 0.08)) * SPEED_SCALE;

        const moveAmount = Math.min(dist, pullSpeed);

        c.x += (dx / dist) * moveAmount;
        c.y += (dy / dist) * moveAmount;

        // --- 3. 回収判定 ---
        if (dist < 30) { // 判定距離（少し広めに30px）
            c.life = 0;

            // 衛星（サテライト）追加ロジック
            if (player.satellites.length < 12) {
                // 初期座標と角度を持たせて push
                player.satellites.push({
                    x: player.x,
                    y: player.y,
                    angle: Math.random() * Math.PI * 2
                });
            }
        }
    });

    // 寿命切れを削除
    crystals = crystals.filter(c => c.life > 0);
}

function updatePowerups() {
    powerups.forEach(p => {
        // --- 1. 消失防止と寿命の更新 ---
        // レベルアップアイテム以外は寿命を減らす
        if (p.type !== 'level') {
            p.life -= gameSpeed;
        }

        // 自機との距離と方向ベクトルを計算
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        // --- 2. レベルアップアイテム専用：吸い寄せロジック ---
        if (p.type === 'level') {
            // 遠くても確実に自機へ向かう（距離に応じた加速）
            const pullSpeed = (2.0 + (dist * 0.04)) * SPEED_SCALE;
            const moveAmount = Math.min(dist, pullSpeed) * gameSpeed;

            p.x += (dx / dist) * moveAmount;
            p.y += (dy / dist) * moveAmount;

            // 飛んでいる間、キラキラしたパーティクルを出す演出
            if (frame % 3 === 0) {
                particles.push({
                    x: p.x, y: p.y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    color: '#0f8', life: 0.3, size: 1.5
                });
            }
        }

        // --- 3. 回収判定 ---
        if (dist < 30) {
            p.life = 0;
            AudioSys.playSE('powerup');

            if (p.type === 'laser') {
                player.laserTimer = LASER_DURATION;
                rings.push({ x: player.x, y: player.y, r: 10, color: '#0ff', life: 1 });
                rings.push({ x: player.x, y: player.y, r: 50, color: '#0ff', life: 1 });
            }
            else if (p.type === 'invincible') {
                player.invuln = INVULN_DURATION;
                AudioSys.playSE('invincible');

                // 取得時の演出：白い大きなリングを表示
                rings.push({ x: player.x, y: player.y, r: 10, color: '#fff', life: 1.0 });
                // グリッドを大きく歪ませる
                distortGrid(player.x, player.y, 150, 300);
            }
            else if (p.type === 'level') {
                player.weaponLevel = Math.min(MAX_WEAPON_LEVEL, player.weaponLevel + 1);
                // スコアポップアップと同じ仕組みで「LEVEL UP!」と表示
                scorePopups.push({
                    x: player.x,
                    y: player.y - 20,
                    text: "LEVEL UP!",
                    life: 60, alpha: 1, vy: -1.2
                });
            }
            else if (p.type === 'shield') {
                // 最大値(PLAYER_BASE_SHIELD)を超えないように回復
                player.shield = Math.min(PLAYER_BASE_SHIELD, player.shield + 10);

                // バーの表示更新
                ui.shieldBar.style.width = Math.max(0, player.shield) + "%";
                if (player.shield < 30) ui.shieldBar.classList.add('shield-critical');
                else ui.shieldBar.classList.remove('shield-critical');
                if (ui.shieldVal) ui.shieldVal.innerText = Math.floor(player.shield);

                // ポップアップ表示
                scorePopups.push({
                    x: player.x,
                    y: player.y - 20,
                    text: "SHIELD +10",
                    life: 60, alpha: 1, vy: -1.2
                });
            }
        }
    });
    // 取得済み(life=0)または時間切れのものを削除
    powerups = powerups.filter(p => p.life > 0);
}

function updateScorePopups() { scorePopups.forEach(s => { s.y += s.vy; s.life--; s.alpha = s.life / 30; }); scorePopups = scorePopups.filter(s => s.life > 0); }

function updateParticlesAndRings() {
    // 後ろからループすることで、削除してもインデックスがズレない
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * gameSpeed;
        p.y += p.vy * gameSpeed;
        p.vx *= Math.pow(0.92, gameSpeed);
        p.vy *= Math.pow(0.92, gameSpeed);

        if (p.isBubble) {
            p.vy -= 0.01 * gameSpeed;
            p.x += Math.sin(frame * 0.05 + p.wobbleOffset) * 0.5 * gameSpeed;
            p.life -= 0.015 * gameSpeed;
        } else {
            p.vy += 0.005 * gameSpeed;
            p.life -= 0.02 * gameSpeed;
        }

        if (p.rotV) p.angle += p.rotV * gameSpeed;

        // 寿命切れなら削除
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        if (r.isBomb) {
            r.r += (r.targetR - r.r) * 0.15 * gameSpeed;
            r.life -= 0.02 * gameSpeed;
        } else {
            r.r += 8 * SPEED_SCALE * gameSpeed;
            r.life -= 0.08 * SPEED_SCALE * gameSpeed;
        }

        if (r.life <= 0) {
            rings.splice(i, 1);
        }
    }
}

function updateGrid() {
    // スケールを考慮して、現在の表示範囲に必要なインデックス範囲を計算
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    const buffer = 15;
    const startX = Math.max(0, Math.floor(camera.x / GRID_SPACING) - buffer);
    const endX = Math.min(gridPoints.length - 1, Math.ceil((camera.x + viewW) / GRID_SPACING) + buffer);
    const startY = Math.max(0, Math.floor(camera.y / GRID_SPACING) - buffer);
    const endY = Math.min(gridPoints[0].length - 1, Math.ceil((camera.y + viewH) / GRID_SPACING) + buffer);

    // 右端と下端のインデックス最大値を取得
    const lastColIndex = gridPoints.length - 1;
    const lastRowIndex = gridPoints[0].length - 1;

    for (let i = startX; i <= endX; i++) {
        for (let j = startY; j <= endY; j++) {
            const p = gridPoints[i][j];
            if (!p) continue;

            // ==========================================
            // ★修正：外枠のアンカー留め（端の点は絶対に動かさない）
            // ==========================================
            // 上下左右のいずれかの端にある点かチェック
            const isEdge = (i === 0 || i === lastColIndex || j === 0 || j === lastRowIndex);

            if (isEdge) {
                // 強制的に初期位置に戻し、速度もゼロにする
                p.x = p.ox;
                p.y = p.oy;
                p.vx = 0;
                p.vy = 0;
                continue; // 物理演算をスキップ
            }

            // --- 以下、通常の物理演算 ---
            const dx = p.x - p.ox, dy = p.y - p.oy;
            const dist = Math.hypot(dx, dy);

            if (dist > 0.1) {
                const f = -0.12 * dist;
                const ang = Math.atan2(dy, dx);
                p.vx += Math.cos(ang) * f * gameSpeed;
                p.vy += Math.sin(ang) * f * gameSpeed;
            }

            p.vx *= 0.85;
            p.vy *= 0.85;

            if (Math.abs(p.vx) < 0.01 && Math.abs(p.vy) < 0.01 && dist < 0.1) {
                p.x = p.ox; p.y = p.oy;
                p.vx = 0; p.vy = 0;
            } else {
                p.x += p.vx * gameSpeed;
                p.y += p.vy * gameSpeed;
            }
        }
    }
}

function distortGrid(x, y, force, radius) {
    const cx = Math.floor(x / GRID_SPACING);
    const cy = Math.floor(y / GRID_SPACING);
    const r = Math.ceil(radius / GRID_SPACING);

    for (let i = Math.max(0, cx - r); i < Math.min(gridPoints.length, cx + r); i++) {
        for (let j = Math.max(0, cy - r); j < Math.min(gridPoints[0].length, cy + r); j++) {
            const p = gridPoints[i][j];
            const d = Math.hypot(p.x - x, p.y - y);

            if (d < radius) {
                const f = force * (1 - d / radius);
                const a = Math.atan2(p.y - y, p.x - x);

                // 力を加える
                p.vx += Math.cos(a) * f;
                p.vy += Math.sin(a) * f;

                // ==========================================
                // ★修正：反転（交差）防止のリミッター（改良版）
                // ==========================================
                // 吸い込み（force < 0）の時だけ発動
                if (force < 0) {
                    // 現在の速度
                    const speed = Math.hypot(p.vx, p.vy);

                    // 「今の距離(d)の半分」より速度が速い場合、
                    // そのままだと中心を突き抜けてしまう可能性が高いので、速度を強制的に落とす
                    // （ゼノのパラドックスのように、近づくほど遅くなり、決して中心には到達しない）
                    if (speed > d * 0.5) {
                        const brake = (d * 0.5) / speed;
                        p.vx *= brake;
                        p.vy *= brake;
                    }
                }
            }
        }
    }
}


// =========================================================
// 10. 描画システム (Rendering Systems)
// =========================================================

function draw() {
    ctx.save();
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-camera.x, -camera.y);

    drawBackground();          // 1. 背景
    drawWorldBounds();         // 2. 枠
    drawWormholes();           // 3. 穴
    drawEnemies();             // 4. 敵
    drawEnemyProjectiles();    // 5. 敵弾（透明度適用済み）

    if (gameState === 'PLAYING') {
        drawPlayerSystems();   // 6. 自機
    }

    drawLasers();              // 7. 自機レーザー
    drawPlayerBullets();       // 8. 自機ショット
    drawItems();               // 9. アイテム
    drawVisualEffects();       // 10. エフェクト


    // UI要素（ワールド座標系でないものも含むが、ここでは便宜上呼び出し）
    if (gameState === 'PLAYING' || gameState === 'DYING') {
        if (frame % 3 === 0) {
            drawMiniMap();
        }
    }
    drawScorePopups();

    ctx.restore();

    // 4. 死亡・エンディング・名前入力時のフェード演出
    if (gameState === 'DYING' ||
        gameState === 'ENDING' ||
        gameState === 'GAMEOVER_UI' ||
        gameState === 'TITLE' ||
        gameState === 'HOWTO' ||
        gameState === 'HOWTO_CLOSING' ||
        gameState === 'STORY') {
        // カメラの影響を受けないように座標系をリセット
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        let fade = 1.0;
        if (gameState === 'DYING') {
            // 死亡時は徐々に暗くする
            fade = Math.max(0, (60 - dyingTimer) / 60);
        } else {
            // ENDING, GAMEOVER_UI, TITLE, HOWTO の時は「強制的に真っ黒(1.0)」にする
            fade = 1.0;
        }

        ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
        // 画面全体を塗りつぶす
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 画面固定のUI演出
    drawBossWarningEffect();
}

// --- 以下、各描画サブ関数 ---

function isOnScreen(obj, margin = 50) {
    // 現在のカメラの表示範囲（スケール考慮）
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    return (
        obj.x > camera.x - margin &&
        obj.x < camera.x + viewW + margin &&
        obj.y > camera.y - margin &&
        obj.y < camera.y + viewH + margin
    );
}


function drawBackground() {
    // --- 1. 背景のベース色 ---
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // --- 2. 星雲の描画（drawBackground内） ---
    if (typeof nebulae !== 'undefined') {
        nebulae.forEach(n => {
            // ★ポイント：camera.x に parallax（移動倍率）を掛け、
            // その値をマイナスすることで自機の移動と「逆」に流れるようにします。
            // 画面サイズ(width)でループさせることで無限背景にします。

            const offset = 10000; // マイナス値防止用の大きな下地
            let nx = (n.x - camera.x * n.parallax + offset) % width;
            let ny = (n.y - camera.y * n.parallax + offset) % height;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // 星雲を描画
            ctx.drawImage(n.image, nx - n.radius, ny - n.radius);

            // 画面端の継ぎ目対策（上下左右に折り返し描画）
            if (nx < n.radius) ctx.drawImage(n.image, nx - n.radius + width, ny - n.radius);
            if (nx > width - n.radius) ctx.drawImage(n.image, nx - n.radius - width, ny - n.radius);
            if (ny < n.radius) ctx.drawImage(n.image, nx - n.radius, ny - n.radius + height);
            if (ny > height - n.radius) ctx.drawImage(n.image, nx - n.radius, ny - n.radius - height);

            ctx.restore();
        });
    }

    // --- 3. 遠景：巨大な背景グリッド ---
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const bigGridSize = 200;
    const parallaxGrid = 0.2;
    const offX = (camera.x * parallaxGrid) % bigGridSize;
    const offY = (camera.y * parallaxGrid) % bigGridSize;
    for (let x = -offX; x < width; x += bigGridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = -offY; y < height; y += bigGridSize) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    // --- 4. 遠景：星空（無限スクロール＆強い視差） ---
    stars.forEach(s => {
        const moveFactor = s.parallax * 0.4;
        const starX = (s.x - camera.x * moveFactor + worldSize * 10) % width;
        const starY = (s.y - camera.y * moveFactor + worldSize * 10) % height;

        const finalX = (starX < 0) ? starX + width : starX;
        const finalY = (starY < 0) ? starY + height : starY;

        ctx.fillStyle = '#fff';
        ctx.globalAlpha = s.brightness * 0.8;
        ctx.beginPath();
        const sizeBoost = s.parallax > 0.8 ? 1.2 : 1.0;
        ctx.arc(finalX, finalY, s.size * 0.8 * sizeBoost, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();

    // ==========================================
    // ここから下は「エリア内」の描画（メイングリッド）
    // ==========================================
    ctx.save();
    // ワールド境界でクリップ（境界の外には描画しない）
    ctx.beginPath();
    ctx.rect(WALL_MARGIN, WALL_MARGIN, worldSize - WALL_MARGIN * 2, worldSize - WALL_MARGIN * 2);
    ctx.clip();

    ctx.globalCompositeOperation = 'lighter';
    const baseColor = STAGE_THEMES[stage] || '#00f0ff';
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const buffer = 3;
    const startX = Math.max(0, Math.floor(camera.x / GRID_SPACING) - buffer);
    const endX = Math.min(gridPoints.length - 1, Math.ceil((camera.x + viewW) / GRID_SPACING) + buffer);
    const startY = Math.max(0, Math.floor(camera.y / GRID_SPACING) - buffer);
    const endY = Math.min(gridPoints[0].length - 1, Math.ceil((camera.y + viewH) / GRID_SPACING) + buffer);

    // --- グリッドを描画 ---
    for (let i = startX; i <= endX; i++) {
        for (let j = startY; j <= endY; j++) {
            const p = gridPoints[i][j];
            if (!p) continue;

            // ★追加：ひずみ（元の位置 ox, oy からの距離）を計算
            const distSq = (p.x - p.ox) ** 2 + (p.y - p.oy) ** 2;

            // ★透明度の動的な決定
            // 平常時は 0.05（うっすら）、ひずみが大きいほど 0.8（くっきり）に近づく
            // 閾値（300）は歪みの感度に合わせて調整してください
            const gridAlpha = 0.05 + Math.min(0.1, distSq / 300);

            ctx.globalAlpha = gridAlpha;

            if (i > startX && gridPoints[i - 1][j]) {
                ctx.beginPath();
                ctx.moveTo(gridPoints[i - 1][j].x, gridPoints[i - 1][j].y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
            if (j > startY && gridPoints[i][j - 1]) {
                ctx.beginPath();
                ctx.moveTo(gridPoints[i][j - 1].x, gridPoints[i][j - 1].y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        }
    }
    ctx.stroke();
    ctx.restore();
}

function drawWorldBounds() {
    // 現在のステージの色を取得（定義がなければデフォルトのシアン）
    const color = STAGE_THEMES[stage] || '#00f0ff';

    ctx.save();

    // ネオンのように光らせる設定
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;       // 強く光らせる
    ctx.shadowColor = color;   // 光の色も合わせる

    // 枠線を描画
    ctx.strokeRect(WALL_MARGIN, WALL_MARGIN, worldSize - WALL_MARGIN * 2, worldSize - WALL_MARGIN * 2);

    // さらに内側にもう一本、薄い線を引いて「二重結界」っぽくする（お好みで）
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(WALL_MARGIN + 5, WALL_MARGIN + 5, worldSize - WALL_MARGIN * 2 - 10, worldSize - WALL_MARGIN * 2 - 10);

    ctx.restore();
}

function drawWormholes() {
    wormholes.forEach(w => {
        if (w.active || w.life > -60) {
            let scale = 1;
            if (w.life > 300) scale = (400 - w.life) / 100;
            else if (w.life <= 0) scale = Math.max(0, (60 + w.life) / 60);
            ctx.save();
            ctx.translate(w.x, w.y);
            ctx.scale(scale, scale);
            ctx.shadowBlur = 30; ctx.shadowColor = '#20f';
            const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 25);
            grad.addColorStop(0, '#333'); grad.addColorStop(0.2, '#000'); grad.addColorStop(0.8, '#000'); grad.addColorStop(1, '#0ff');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(frame * 0.1) * 2, 0, Math.PI * 2); ctx.fill();

            // 外側の枠線を描画していた部分を削除

            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(5, 5); ctx.stroke();
            ctx.restore();
        }
    });
}

function drawEnemies() {
    enemies.forEach(e => {
        const margin = (e.type === 'boss' || e.type === 'dragon' || e.type === 'battleship') ? 350 : 100;
        if (!isOnScreen(e, margin)) return;

        ctx.save();
        ctx.globalAlpha = e.isWarping ? (e.warpPercent || 0) : 1.0;

        if (e.type === 'dragon') drawDragonEnemy(ctx, e);
        else if (e.type === 'triangle') drawTriangleEnemy(ctx, e);
        else if (e.type === 'cube') drawCubeEnemy(ctx, e);
        else if (e.type === 'tadpole') drawTadpoleEnemy(ctx, e);
        else if (e.type === 'asteroid' || e.type === 'bubble') drawAsteroidEnemy(ctx, e);
        else if (e.type === 'hunter') drawHunterEnemy(ctx, e);
        else if (e.type === 'phantom') drawPhantomEnemy(ctx, e);
        else if (e.type === 'eclipse') drawEclipseEnemy(ctx, e);
        else if (e.type === 'jellyfish') drawJellyfishEnemy(ctx, e);
        else if (e.type === 'sentinel') drawSentinelEnemy(ctx, e);

        else if (e.type === 'island') drawIslandEnemy(ctx, e);
        else if (e.type === 'turret') drawTurretEnemy(ctx, e);

        else if (e.type === 'fighter') drawFighterJet(ctx, e);

        else if (e.type === 'boss') drawBossEnemy(ctx, e);
        else if (e.type === 'battleship') drawBattleshipBoss(ctx, e);

        ctx.restore();
    });
}

function drawEnemyProjectiles() {
    ctx.globalCompositeOperation = 'lighter';
    enemyBullets.forEach(eb => {
        if (!isOnScreen(eb, 50)) return;
        ctx.save();
        ctx.translate(eb.x, eb.y);
        const currentAlpha = eb.isFading ? Math.max(0, eb.alpha) : 1.0;
        ctx.globalAlpha = currentAlpha;

        if (eb.isLaserMissile) {
            drawLaserMissile(ctx, eb);
        } else if (eb.isFighter) {
            drawFighterJet(ctx, eb);
        } else if (eb.isMissile) {
            drawHomingMissile(ctx, eb);
        } else if (eb.isShockwave) {
            drawShockwave(ctx, eb);
        } else {
            drawNormalBullet(ctx, eb);
        }
        ctx.restore();
    });
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

function drawShockwave(ctx, eb) {
    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);

    const currentScale = eb.baseScale || 1.0;
    const scale = currentScale * G_SCALE;
    ctx.scale(scale, scale);

    // --- ★修正ロジック：広がるほど薄くなるが、0.3以下にはならない ---
    // 減衰計算
    let scatterAlpha = 1.2 - (currentScale * 0.4);
    // ★ここがポイント：下限を0.3に設定（消える直前まで0.3の濃さを維持）
    scatterAlpha = Math.max(0.3, scatterAlpha);

    const lifeAlpha = Math.min(1.0, eb.life / 40);
    const finalAlpha = scatterAlpha * lifeAlpha;

    if (finalAlpha <= 0) return;

    ctx.globalCompositeOperation = 'lighter';

    // --- 1. 外側の淡いシアンの波紋 ---
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 4 + (currentScale);
    ctx.lineCap = 'round';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0ff';
    // 元の設計より少しだけ alpha を底上げ
    ctx.globalAlpha = finalAlpha * 0.8;

    ctx.beginPath();
    ctx.arc(-10, 0, 25, -Math.PI / 3, Math.PI / 3, false);
    ctx.stroke();



    // --- 3. 背後の余韻粒子（発生率を下限に合わせて維持） ---
    if (frame % 5 === 0 && Math.random() < Math.max(0.2, scatterAlpha)) {
        particles.push({
            x: eb.x, y: eb.y,
            vx: -eb.vx * 0.05, vy: -eb.vy * 0.05,
            color: '#00ffff',
            life: 0.3, size: 1.0 * scale,
            isBubble: true,
            wobbleOffset: Math.random() * Math.PI
        });
    }
}

function drawPlayerSystems() {
    if (gameState === 'DYING') return;

    const vx = player.vx;
    const vy = player.vy;
    const currentMoveMag = Math.hypot(vx, vy);

    let thrustFactor = 0;
    if (currentMoveMag > 0.1) {
        const dirX = Math.cos(player.angle);
        const dirY = Math.sin(player.angle);
        const moveX = vx / currentMoveMag;
        const moveY = vy / currentMoveMag;

        const dot = dirX * moveX + dirY * moveY;
        thrustFactor = Math.max(0.2, dot);
    }

    const speedFactor = Math.min(1.0, currentMoveMag / (PLAYER_BASE_SPEED * SPEED_SCALE * 0.8));
    const finalThrustScale = speedFactor * thrustFactor;

    if (finalThrustScale > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        let pColor = player.invuln > 0 ? '255, 230, 0' : (player.laserTimer > 0 ? '0, 255, 255' : '0, 255, 180');

        const offsetStart = 8 * G_SCALE;

        // ★粒の最大数を 20 → 30 に増やして長さを確保 (1.5倍)
        const particleCount = Math.floor(30 * finalThrustScale);

        for (let i = 0; i < particleCount; i++) {
            const ratio = (1 - i / particleCount);

            // ★粒の間隔係数を 4 → 6 に広げ、最大リーチを伸ばす
            const dist = offsetStart + (i * 6 * G_SCALE * finalThrustScale);

            const alpha = Math.pow(ratio, 1.2) * 0.35;
            // 後方に向けて徐々に細くなる計算
            const finalSize = (7 - i * 0.2) * G_SCALE;

            if (finalSize < 0.5) continue;

            ctx.save();
            const offsetX = -Math.cos(player.angle) * dist;
            const offsetY = -Math.sin(player.angle) * dist;

            ctx.translate(player.x + offsetX, player.y + offsetY);
            ctx.rotate(player.angle);

            ctx.beginPath();
            ctx.ellipse(0, 0, finalSize, finalSize * 0.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${pColor}, ${alpha})`;
            ctx.fill();

            // 芯の光（より長い噴射に合わせて、光る範囲を少し広げました）
            if (i < 12 && Math.random() > 0.3) {
                ctx.beginPath();
                ctx.arc(0, 0, finalSize * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
                ctx.fill();
            }
            ctx.restore();
        }
        ctx.restore();
    }

    // 残像
    player.history.forEach((pos, i) => {
        if (i === 0) return;
        ctx.save();
        ctx.translate(pos.x, pos.y); ctx.rotate(pos.angle); ctx.scale(G_SCALE, G_SCALE);
        ctx.globalAlpha = 0.4 * (1 - i / player.history.length);
        let trailColor = player.invuln > 0 ? '#ff0' : (player.laserTimer > 0 ? '#0ff' : '#0f8');
        ctx.strokeStyle = trailColor; ctx.lineWidth = 1.5; ctx.shadowBlur = 5; ctx.shadowColor = trailColor;
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10); ctx.closePath(); ctx.stroke();
        ctx.restore();
    });

    if (player.weaponLevel >= MAX_WEAPON_LEVEL - 1) drawEmeraldPhoenix(ctx, player);
    if (player.invuln > 0) drawInvulnBarrier(ctx, player);
    drawPlayer(ctx, player);
}

function drawPlayerBullets() {
    ctx.fillStyle = '#0f8';
    ctx.beginPath(); // ループの前にパスを開始

    bullets.forEach(b => {
        if (!isOnScreen(b, 50)) return;

        // 各弾丸の円形パスを繋げていく
        ctx.moveTo(b.x + 2, b.y);
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
    });

    ctx.fill(); // 最後に一括で塗りつぶす
}

function drawItems() {
    // --- 1. クリスタル（スコアアイテム） ---
    ctx.fillStyle = '#008000';
    crystals.forEach(c => {
        if (!isOnScreen(c, 50)) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(frame * 0.1);
        const scale = c.life > 60 ? 1 : c.life / 60;
        ctx.scale(scale, scale);

        // クリスタルも少し光らせる
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0f0';

        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0);
        ctx.fill();
        ctx.restore();
    });

    // --- 2. パワーアップアイテム ---
    powerups.forEach(p => {
        if (!isOnScreen(p, 50)) return;

        let char = '?';
        let color = '#fff';

        if (p.type === 'laser') { color = '#aff'; char = 'L'; }
        else if (p.type === 'level') { color = '#0f0'; char = 'W'; }
        else if (p.type === 'invincible') { color = '#ff0'; char = 'I'; }
        else if (p.type === 'shield') { color = '#0ff'; char = 'S'; }

        ctx.save();
        ctx.translate(p.x, p.y);
        const scale = p.life > 60 ? 1 : p.life / 60;
        ctx.scale(scale, scale);

        // ==========================================
        // ★修正：枠線の色と発光を明示的に指定
        // ==========================================
        ctx.strokeStyle = color;   // 枠線をアイテム色にする
        ctx.lineWidth = 2;

        ctx.shadowBlur = 10;       // ネオン発光
        ctx.shadowColor = color;

        ctx.strokeRect(-8, -8, 16, 16);

        // 文字の描画
        ctx.fillStyle = color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 0, 0);

        ctx.restore();
    });
}

function drawVisualEffects() {

    // 1. 特殊ミサイル（プレイヤー側など）
    ctx.fillStyle = '#fd0';
    missiles.forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 4 * G_SCALE, 0, Math.PI * 2);
        ctx.fill();
    });

    // --- パーティクルの描画（最適化） ---

    // 2. 複雑なパーティクル（破片・泡）
    // 回転やスケール変更が必要なため、個別に save/restore を行います
    particles.forEach(p => {
        if (!isOnScreen(p, 50)) return;

        // 通常の火花以外（ShardやBubble）のみここで描画
        if (p.isShard || p.isBubble) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, p.life);

            if (p.isShard) {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle || 0);

                // フェードアウトとズームアウトの計算
                const opacity = Math.min(1.0, p.life);
                const smoothAlpha = Math.pow(opacity, 0.7);
                const s = (p.size || 1.0) * G_SCALE * (0.6 + opacity * 0.4);
                ctx.scale(s, s);

                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.5;
                ctx.globalCompositeOperation = 'lighter';

                if (p.shardType === 'eclipseBit') {
                    // --- Eclipseの三角錐ビット ---
                    const pts = [{ x: 14, y: 0, z: 0 }, { x: -7, y: 7, z: 4 }, { x: -7, y: -7, z: 4 }, { x: -7, y: 0, z: -8 }];
                    const lines = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
                    const project = (pt) => {
                        const tilt = 0.4;
                        const finalY = pt.y * Math.cos(tilt) - pt.z * Math.sin(tilt);
                        return { x: pt.x, y: finalY };
                    };
                    const pProj = pts.map(pt => project(pt));

                    ctx.beginPath();
                    lines.forEach(l => {
                        ctx.moveTo(pProj[l[0]].x, pProj[l[0]].y);
                        ctx.lineTo(pProj[l[1]].x, pProj[l[1]].y);
                    });
                    ctx.globalAlpha = smoothAlpha;
                    ctx.stroke();

                    // 内部の薄い塗り
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = smoothAlpha * 0.2;
                    ctx.fill();

                    // 中央に白いハイライト（芯）
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 0.5;
                    ctx.globalAlpha = smoothAlpha * 0.5;
                    ctx.stroke();

                } else if (p.shardType === 'dragonSeg') {
                    const i = p.segIndex || 0;
                    const sizeMod = Math.max(0.6, 1 - (i * 0.08));
                    const w = 12 * sizeMod;
                    const h = 18 * sizeMod;
                    const opacity = Math.min(1.0, p.life);
                    const smoothAlpha = Math.pow(opacity, 0.7);
                    const s = (p.size || 1.0) * G_SCALE * (0.5 + opacity * 0.5);
                    // 上書きされたスケールを再適用
                    ctx.scale(s / ((p.size || 1.0) * G_SCALE * (0.6 + opacity * 0.4)), s / ((p.size || 1.0) * G_SCALE * (0.6 + opacity * 0.4)));

                    ctx.beginPath();
                    ctx.moveTo(w, -h / 2);
                    ctx.lineTo(w, h / 2);
                    ctx.lineTo(-w * 0.9, h * 0.35);
                    ctx.lineTo(-w * 0.9, -h * 0.35);
                    ctx.closePath();

                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = smoothAlpha * 0.3;
                    ctx.fill();

                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = smoothAlpha;
                    ctx.stroke();

                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 0.5;
                    ctx.globalAlpha = smoothAlpha * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(-w * 0.5, 0); ctx.lineTo(w, 0);
                    ctx.stroke();

                } else if (p.shardType === 'tri') {
                    ctx.lineWidth = 1.0 / s;
                    ctx.beginPath();
                    if (p.vertices && p.vertices.length === 3) {
                        ctx.moveTo(p.vertices[0].x, p.vertices[0].y);
                        ctx.lineTo(p.vertices[1].x, p.vertices[1].y);
                        ctx.lineTo(p.vertices[2].x, p.vertices[2].y);
                    } else {
                        ctx.moveTo(0, -10); ctx.lineTo(8, 8); ctx.lineTo(-8, 8);
                    }
                    ctx.closePath();
                    ctx.stroke();

                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.min(1, p.life) * 0.3;
                    ctx.fill();

                } else {
                    // Phantomなどの立体的な破片
                    ctx.beginPath();
                    ctx.moveTo(10, 0);
                    ctx.lineTo(-5, 5);
                    ctx.lineTo(-5, -5);
                    ctx.closePath();
                    ctx.stroke();

                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.min(1, p.life) * 0.4;
                    ctx.fill();
                }
            }
            else if (p.isBubble) {
                // --- 泡（バブル） ---
                ctx.translate(p.x, p.y);
                const baseOpacity = 0.6;
                const fade = Math.min(1.0, p.life) * baseOpacity;
                ctx.globalAlpha = fade;
                const r = p.size * G_SCALE;

                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
                ctx.fill();

                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
                ctx.beginPath();
                ctx.arc(-r * 0.4, -r * 0.4, r * 0.25, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    });

    // 3. 単純なパーティクル（通常の火花）
    // ★高速化: save/restore をループの外に出して一括処理
    ctx.save();
    ctx.lineCap = 'round';

    particles.forEach(p => {
        if (!isOnScreen(p, 50)) return;

        // 特殊パーティクルは既に描画済みなのでスキップ
        if (p.isShard || p.isBubble) return;

        // 共通設定を再利用しつつ描画
        ctx.beginPath();
        const length = 4.0;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * length, p.y - p.vy * length);

        ctx.lineWidth = p.size || 2;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.min(1, p.life);

        ctx.stroke();
    });
    ctx.restore();


    // 4. リングエフェクト
    ctx.globalAlpha = 1.0;

    rings.forEach(r => {
        if (!isOnScreen({ x: r.x, y: r.y }, r.r * G_SCALE + 50)) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (r.isBomb) {
            // BOMB専用
            ctx.fillStyle = r.color;
            ctx.globalAlpha = Math.max(0, r.life * 0.25);
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * G_SCALE, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = r.color;
            ctx.lineWidth = 20 * r.life * G_SCALE;
            ctx.globalAlpha = Math.max(0, r.life * 0.8);
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * G_SCALE, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4 * G_SCALE;
            ctx.globalAlpha = Math.max(0, r.life);
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * G_SCALE, 0, Math.PI * 2);
            ctx.stroke();

        } else {
            // 通常リング
            ctx.globalAlpha = r.life;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = 4 * G_SCALE;
            ctx.globalAlpha = r.life * 0.3;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * G_SCALE, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 * G_SCALE;
            ctx.globalAlpha = r.life;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * G_SCALE, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    });
}

// player
function drawPlayer(ctx, p) {
    // --- 1. 自機本体の描画 ---
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(G_SCALE, G_SCALE);

    // 状態に応じた機体色の決定
    let shipColor = '#0f8';
    if (p.invuln > 0) shipColor = '#ff0';
    else if (p.laserTimer > 0) shipColor = '#0ff';

    ctx.strokeStyle = shipColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = shipColor;

    // --- ベース機体（全レベル共通） ---
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.stroke();

    // --- 装飾・進化パーツの追加 ---

    // LV2以上: メインウィングの展開
    if (p.weaponLevel >= 1) {
        ctx.beginPath();
        ctx.moveTo(-5, 5); ctx.lineTo(-18, 15);
        ctx.moveTo(-5, -5); ctx.lineTo(-18, -15);
        ctx.stroke();
    }

    // LV3以上: サイドスラスター/フィン
    if (p.weaponLevel >= 2) {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(5, 5); ctx.lineTo(-5, 12);
        ctx.moveTo(5, -5); ctx.lineTo(-5, -12);
        ctx.stroke();
    }

    // LV4以上: 機首の強化（ツインカウル）
    if (p.weaponLevel >= 3) {
        ctx.beginPath();
        ctx.moveTo(10, 3); ctx.lineTo(25, 2);
        ctx.moveTo(10, -3); ctx.lineTo(25, -2);
        ctx.stroke();
    }

    // LV5以上: リアサブウィング
    if (p.weaponLevel >= 4) {
        ctx.beginPath();
        ctx.moveTo(-8, 8); ctx.lineTo(-22, 5);
        ctx.moveTo(-8, -8); ctx.lineTo(-22, -5);
        ctx.stroke();
    }

    // LV6以上: 重装甲化（エネルギーライン）
    if (p.weaponLevel >= 5) {
        ctx.save();
        ctx.strokeStyle = '#fff'; // エネルギーラインは白
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(15, 0); ctx.lineTo(-3, 0);
        ctx.stroke();
        ctx.restore();
    }



    ctx.restore();
    ctx.shadowBlur = 0; // シャドウをリセット

    // --- 2. サテライト（衛星）の描画 ---
    p.satellites.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);

        // サテライト自体もゆっくり自転させる（キラキラ感アップ）
        ctx.rotate(frame * 0.1);

        // レーザーチャージ中かどうかで色を変える
        ctx.fillStyle = '#0f0';

        // 少しだけ発光させる
        ctx.shadowBlur = 5;
        ctx.shadowColor = ctx.fillStyle;

        // --- ひし形の描画 ---
        const size = 4; // 大きさ
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.5); // 上
        ctx.lineTo(size, 0);        // 右
        ctx.lineTo(0, size * 1.5);  // 下
        ctx.lineTo(-size, 0);       // 左
        ctx.closePath();
        ctx.fill();

        // 芯を白くして硬質感と輝きを出す
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

function drawInvulnBarrier(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    const bRadius = 45 * G_SCALE;
    // パルスを少し速く、ダイナミックにする
    const pulseSpeed = p.invuln < 120 ? 0.25 : 0.1;
    const pulse = Math.sin(frame * pulseSpeed) * (p.invuln < 120 ? 6 : 3);
    const r = bRadius + pulse;

    // --- ★カラー動的設定：残り2秒（120F）を切ると警告色へ ---
    let barrierColor = '#ff0'; // 通常：黄色
    let glowBlur = 15;

    if (p.invuln < 120) {
        // 終了間際：赤と黄を高速点滅（残り時間が少ないほど速くなる）
        const flashFreq = p.invuln < 60 ? 3 : 6;
        const isFlash = Math.floor(frame / flashFreq) % 2 === 0;
        barrierColor = isFlash ? '#f44' : '#ff0';
        glowBlur = isFlash ? 25 : 10;
    }

    ctx.strokeStyle = barrierColor;
    ctx.shadowBlur = glowBlur;
    ctx.shadowColor = barrierColor;
    ctx.lineWidth = 2.0; // 少し太くして視認性アップ
    ctx.globalCompositeOperation = 'lighter';

    // --- 1. 球体を構成する3つの回転リング ---
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * i + (frame * 0.02)); // 全体もゆっくり自転させる

        // 擬似3D回転
        const rotSpeed = p.invuln < 120 ? 0.15 : 0.05;
        const scaleY = Math.sin(frame * rotSpeed + i * 2);
        ctx.scale(1, scaleY);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // --- 2. 輪郭の薄い円（外郭） ---
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // --- 3. 内部の塗りつぶし（グラデーション） ---
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0.7, 'transparent');
    grad.addColorStop(1.0, barrierColor);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.15;
    ctx.fill();

    ctx.restore();

    // --- 4. バリアから漏れ出るエネルギー粒子（残り時間に応じて増加） ---
    const particleCount = p.invuln < 120 ? 3 : 1;
    if (frame % 2 === 0) {
        for (let i = 0; i < particleCount; i++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = r;
            particles.push({
                x: p.x + Math.cos(ang) * dist,
                y: p.y + Math.sin(ang) * dist,
                vx: Math.cos(ang) * 2,
                vy: Math.sin(ang) * 2,
                color: barrierColor,
                life: 0.4,
                size: 1.5
            });
        }
    }
}

function drawEmeraldPhoenix(ctx, p) {

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // --- 状態に応じた動的なカラー設定 ---
    let mainColor = '#0f8';    // 通常：エメラルドグリーン
    let accentColor = '#0ff';  // 通常：シアン

    if (p.invuln > 0) {
        mainColor = '#ff0';    // 無敵：イエロー
        accentColor = '#fff';  // 無敵：ホワイト
    } else if (p.laserTimer > 0) {
        mainColor = '#0ff';    // レーザー：シアン
        accentColor = '#fff';  // レーザー：ホワイト
    }

    ctx.shadowBlur = 20;
    ctx.shadowColor = mainColor;
    ctx.globalCompositeOperation = 'lighter';

    const scale = G_SCALE * 1.1;
    const time = frame * 0.15;
    const flap = Math.sin(time) * 15;

    // 1. 揺らめく翼（メインカラー）
    ctx.lineWidth = 2;
    ctx.strokeStyle = mainColor;

    for (let side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
            -10 * scale, side * (30 + flap) * scale,
            -40 * scale, side * (40 + flap) * scale,
            -20 * scale, side * 5 * scale
        );
        ctx.stroke();

        // 翼内のアクセントハイライト
        ctx.save();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(-5 * scale, side * 5 * scale);
        ctx.lineTo(-25 * scale, side * (25 + flap) * scale);
        ctx.stroke();
        ctx.restore();
    }

    // 2. 輝く3本の尾羽（真ん中を太く、機体色に同期）
    for (let i = 0; i < 3; i++) {
        const isCenter = (i === 1);
        const tailOff = Math.sin(frame * 0.2 + i) * 10;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = mainColor;

        if (isCenter) {
            ctx.lineWidth = 3 * scale; // 真ん中を太く
            ctx.shadowBlur = 25;       // 発光を強化
        } else {
            ctx.lineWidth = 1 * scale;
            ctx.globalAlpha = 0.6;
        }

        ctx.moveTo(-10 * scale, (i - 1) * 5 * scale);
        ctx.quadraticCurveTo(
            -40 * scale, tailOff * scale,
            -70 * scale, (tailOff + (i - 1) * 15) * scale
        );
        ctx.stroke();
        ctx.restore();
    }

    // --- 3. 頭部デザイン（くちばしの点を削除し、シャープなラインへ） ---
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -4 * scale);
    ctx.lineTo(25 * scale, 0); // 鋭い先端
    ctx.lineTo(0, 4 * scale);
    ctx.stroke();

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // 4. 羽毛パーティクルの生成（色を同期）
    if (frame % 2 === 0) {
        const pAngle = p.angle + Math.PI + (Math.random() - 0.5);
        const pSpeed = 2 + Math.random() * 4;
        particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            color: Math.random() > 0.5 ? mainColor : accentColor,
            life: 1,
            size: 2 + Math.random() * 2
        });
    }
}

function drawLasers() {
    lasers.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle);
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#0ff';
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1.5;

        // 修正：固定値 2000 ではなく、計算された l.renderLen を使う
        const len = l.renderLen || 2000;

        const segments = 20;
        const segLen = len / segments;
        const jitter = 15 * (l.life / 5);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 1; i <= segments; i++) {
            const px = i * segLen;
            const py = (Math.random() - 0.5) * jitter * 2;
            ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 芯の白い線
        if (Math.random() > 0.2) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(len, (Math.random() - 0.5) * 5);
            ctx.stroke();
        }

        // ヒット地点の光（BOSSに当たっている時）
        if (len < 1900) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(len, 0, 10 + Math.random() * 10, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
}

// enemy
function drawDragonEnemy(ctx, e) {
    const dragonScale = e.scale * G_SCALE;
    const coreColor = e.color;

    // --- 1. 胴体セグメント ---
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    for (let i = e.segments.length - 1; i >= 0; i--) {
        const s = e.segments[i];
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.scale(dragonScale, dragonScale);

        const sizeMod = Math.max(0.6, 1 - (i * 0.08));
        const w = 12 * sizeMod;
        const h = 18 * sizeMod;

        // ★変更：装甲の塗り（0.9 → 0.4 に透明度を下げ、背景が見えるように）
        ctx.fillStyle = 'rgba(20, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(w, -h / 2);
        ctx.lineTo(w, h / 2);
        ctx.lineTo(-w * 0.9, h * 0.35);
        ctx.lineTo(-w * 0.9, -h * 0.35);
        ctx.closePath();
        ctx.fill();

        // 装甲の線
        ctx.strokeStyle = coreColor;
        ctx.stroke();

        // フィン
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, -h / 3); ctx.lineTo(w, -h / 3);
        ctx.moveTo(-w * 0.5, h / 3); ctx.lineTo(w, h / 3);
        ctx.stroke();

        ctx.restore();
    }

    // --- 2. 頭部ユニット ---
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.scale(dragonScale, dragonScale);

    // ★変更：メインヘッドの塗り（#300 固定色から、透明度のある rgba に変更）
    ctx.fillStyle = 'rgba(48, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // --- 3. センサーアイ（グローコア） ---
    ctx.save();
    ctx.translate(10, 0);
    ctx.globalCompositeOperation = 'lighter';

    const pulse = 0.8 + Math.sin(frame * 0.15) * 0.2;

    ctx.fillStyle = '#ff4400';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4400';
    ctx.beginPath();
    ctx.arc(0, 0, 5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(0, 0, 3 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // アンテナ
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -10); ctx.lineTo(-15, -20);
    ctx.moveTo(-5, 10); ctx.lineTo(-15, 20);
    ctx.stroke();

    ctx.restore();
}

function drawTriangleEnemy(ctx, e) {
    if (!e || typeof e.x !== 'number' || isNaN(e.x)) return;

    ctx.save();

    // --- 1. 座標と進行方向への回転 ---
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    const currentScale = (e.scale || 0.7) * G_SCALE * 1.2;
    ctx.scale(currentScale, currentScale);

    // --- 2. 描画設定 ---
    const visualAlpha = e.isWarping ? (e.warpPercent || 0) : 1.0;
    ctx.globalAlpha = visualAlpha;
    ctx.globalCompositeOperation = 'lighter';

    // --- 3. 3D形状（縦長の正八面体） ---
    const size = 12;
    const pts = [
        { x: 3.5, y: 0, z: 0 },  // 前頂点（縦長）
        { x: -1.2, y: 0, z: 0 },  // 後頂点
        { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 },
        { x: 0, y: -1, z: -1 }, { x: 0, y: 1, z: -1 }
    ];

    // --- 4. 自転計算 ---
    const cosR = Math.cos(e.rotX || 0);
    const sinR = Math.sin(e.rotX || 0);
    const proj = pts.map(p => {
        let ny = p.y * cosR - p.z * sinR;
        return { x: p.x * size, y: ny * size };
    });

    const lines = [
        [0, 2], [0, 3], [0, 4], [0, 5],
        [1, 2], [1, 3], [1, 4], [1, 5],
        [2, 3], [3, 4], [4, 5], [5, 2]
    ];

    // --- 5. ワイヤーフレーム ---
    ctx.strokeStyle = e.color || '#0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    lines.forEach(l => {
        ctx.moveTo(proj[l[0]].x, proj[l[0]].y);
        ctx.lineTo(proj[l[1]].x, proj[l[1]].y);
    });
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // --- 6. 点滅する熱源コア ---
    // フレーム数から0.8〜1.2の範囲で揺らぎを作る
    const pulse = 0.8 + Math.sin(frame * 0.15) * 0.2;

    // レイヤー1：赤（外側）
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // レイヤー2：橙（中間）
    ctx.fillStyle = '#f90';
    ctx.beginPath();
    ctx.arc(0, 0, 5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // レイヤー3：白（中心）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2); // 中心は安定させるため固定
    ctx.fill();

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
}

function drawCubeEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(e.scale * G_SCALE, e.scale * G_SCALE);

    // --- 1. アイテムの種類に応じたコアの色設定 ---
    let coreColor = '#ff0'; // デフォルト（クリスタル/なし）：黄
    if (e.drop === 'laser') coreColor = '#0ff';      // レーザー：シアン
    if (e.drop === 'level') coreColor = '#0f0';      // レベルアップ：緑
    if (e.drop === 'invincible') coreColor = '#fff'; // 無敵：白

    // 点滅演出
    const pulse = (Math.sin(frame * 0.15) * 0.5) + 0.5;
    const coreSize = 6 + pulse * 4;

    ctx.shadowBlur = 15 + pulse * 10;
    ctx.shadowColor = coreColor;

    // コアの外光（パルスに合わせて透明度変化）
    const rgb = coreColor === '#ff0' ? '255, 255, 0' :
        coreColor === '#0ff' ? '0, 255, 255' :
            coreColor === '#0f0' ? '0, 255, 0' : '255, 255, 255';

    ctx.fillStyle = `rgba(${rgb}, ${0.4 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    ctx.fill();

    // コアの中心（高輝度）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // --- 2. 外殻のワイヤーフレーム (緑色で固定) ---
    ctx.shadowBlur = 5;
    ctx.shadowColor = e.color;
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 1.5;

    const size = 16;
    const pts = [
        { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
        { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
        { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
        { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
    ];

    const cosX = Math.cos(e.rotX), sinX = Math.sin(e.rotX);
    const cosY = Math.cos(e.rotY), sinY = Math.sin(e.rotY);

    const proj = pts.map(p => {
        let y = p.y * cosX - p.z * sinX;
        let z = p.y * sinX + p.z * cosX;
        let x = p.x * cosY + z * sinY;
        return { x: x * size, y: y * size };
    });

    const lines = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    ctx.beginPath();
    lines.forEach(l => {
        ctx.moveTo(proj[l[0]].x, proj[l[0]].y);
        ctx.lineTo(proj[l[1]].x, proj[l[1]].y);
    });
    ctx.stroke();

    ctx.restore();
    ctx.shadowBlur = 0;
}

function drawHunterEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // 自転演出
    const spin = (e.rotSpeed || 0.12) * frame;
    ctx.rotate(spin);
    ctx.scale(e.scale * G_SCALE, e.scale * G_SCALE);

    const isAiming = (e.state === 'aim');
    const isDmg = e.flashTimer > 0;
    if (isDmg) e.flashTimer--;

    // --- 外郭のカラー（e.colorを反映） ---
    let mainColor = isDmg ? '#ffffff' : (e.color || '#00ffff');

    ctx.shadowBlur = 8;
    ctx.shadowColor = mainColor;
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.2;

    // --- 1. 外郭ワイヤーフレーム（円形） ---
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    // --- 1.2 スポーク（4方向の強化アーム構造） ---
    for (let i = 0; i < 4; i++) {
        const ang = (Math.PI / 2) * i;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);

        ctx.beginPath();
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.0;

        // 支柱を二股（V字）のトラス構造にする
        // 中心から少し離れた位置から、先端に向けて広がるライン
        const armSpread = 0.2; // 広がり具合
        ctx.moveTo(cos * 4, sin * 4);
        ctx.lineTo(Math.cos(ang - armSpread) * 14, Math.sin(ang - armSpread) * 14);
        ctx.moveTo(cos * 4, sin * 4);
        ctx.lineTo(Math.cos(ang + armSpread) * 14, Math.sin(ang + armSpread) * 14);
        ctx.stroke();

        // --- 先端のセンサーパーツ（ひし形/ポッド状） ---
        ctx.save();
        ctx.translate(cos * 16, sin * 16);
        ctx.rotate(ang); // スポークの向きに合わせる

        ctx.beginPath();
        // 鋭いひし形のチップデザイン
        ctx.moveTo(4, 0);   // 先端
        ctx.lineTo(0, 3);   // 横
        ctx.lineTo(-3, 0);  // 後ろ
        ctx.lineTo(0, -3);  // 横
        ctx.closePath();

        // ダメージ時は白、通常はメインカラーの塗り
        ctx.fillStyle = isDmg ? '#fff' : mainColor;
        ctx.globalAlpha = 0.6; // 少し透けさせてワイヤー感を出す
        ctx.fill();

        // 輪郭線
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = isDmg ? '#fff' : mainColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    // --- 2. 中央の赤く光るコア ---
    ctx.save();
    // 自転の影響を受けないよう逆回転させても良いですが、
    // 円形なのでそのまま描画します。

    // コアの脈動計算
    const pulse = Math.sin(frame * 0.15) * 1.5;
    const coreBaseRad = isAiming ? 6 : 4;
    const coreRad = coreBaseRad + pulse;

    // コアの外光（グローエフェクト）
    ctx.globalCompositeOperation = 'lighter';

    ctx.shadowBlur = isAiming ? 25 : 15;
    ctx.shadowColor = '#ff0000';

    // 放射状グラデーションで「熱源」を表現
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRad * 1.5);
    coreGrad.addColorStop(0, '#ffffff');      // 中心は白熱
    coreGrad.addColorStop(0.3, '#ff3300');    // 中間は鮮やかな赤
    coreGrad.addColorStop(1, 'transparent'); // 外側へ消える

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreRad * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // コアの実体（中心の小さな円）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- 3. 照準レーザー（赤いコアに合わせて赤色を強調） ---
    if (isAiming) {
        ctx.save();
        ctx.rotate(-spin);
        ctx.rotate(e.angle);

        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.setLineDash([10, 5]);
        ctx.strokeStyle = `rgba(255, 0, 50, ${0.6 + Math.sin(frame * 0.8) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.moveTo(12, 0);
        ctx.lineTo(600, 0);
        ctx.stroke();

        // 砲口のフラッシュ
        ctx.beginPath();
        ctx.arc(12, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffaaaa';
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

function drawTadpoleEnemy(ctx, e) {
    ctx.save();

    // --- 描画関数内 ---
    const baseColor = e.color; // 例: "#00ffff"
    const hue = getHue(baseColor); // 色相を取得


    // lightCyan: 元の色と同じ色相で、輝度を90%（ほぼ白に近い明るさ）にする
    const lightColor = `hsl(${hue}, 100%, 90%)`;

    // --- 1. テイル（高速流動フラグメント）の描画 ---
    if (e.history.length > 1) {
        ctx.setLineDash([12, 18]);
        for (let i = 0; i < e.history.length - 1; i += 3) {
            const p1 = e.history[i];
            const p2 = e.history[i + 1];
            if (!p2) break;

            const ratio = i / e.history.length;
            const alpha = (1 - ratio) * 0.6;

            // 尾も水色のグラデーションに
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = (14 - ratio * 14) * G_SCALE;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0; // 【重要】次の描画のために透明度を元に戻す
        ctx.setLineDash([]);
    }

    // --- 2. 幾何学メカニカル・ヘッド（頭部）の描画 ---
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.scale(e.scale * G_SCALE, e.scale * G_SCALE);

    // 背景の遮蔽（より深い紺色で水色を引き立てる）
    ctx.fillStyle = 'rgba(0, 10, 20, 0.9)';
    ctx.beginPath();
    ctx.rect(-10, -15, 45, 30);
    ctx.fill();

    // ワイヤーフレームの設定
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = baseColor;

    // --- メインボディ「＝＝＝」部分 ---
    for (let j = 0; j < 3; j++) {
        const xPos = j * 12;
        // シリンダーリング
        ctx.beginPath();
        ctx.ellipse(xPos, 0, 8, 15, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 水平支柱（ハイライト色を混ぜる）
        ctx.save();
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(xPos, -15); ctx.lineTo(xPos + 12, -15);
        ctx.moveTo(xPos, 15); ctx.lineTo(xPos + 12, 15);
        ctx.stroke();
        ctx.restore();
    }

    // --- 先端ユニット「＜＜」部分 ---
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.moveTo(35, -14); ctx.lineTo(52, 0); ctx.lineTo(35, 14); // 外側の ＜
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, -9); ctx.lineTo(42, 0); ctx.lineTo(25, 9);   // 内側の ＜
    ctx.stroke();
    ctx.restore();

    // --- コア・ユニット ---
    // 中心部で強く輝く水色のエネルギー体
    ctx.fillStyle = lightColor;
    ctx.shadowBlur = 20;
    ctx.shadowColor = baseColor;
    ctx.beginPath();
    ctx.rect(5, -4, 8, 8);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
}

function drawAsteroidEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const s = e.scale * G_SCALE;
    ctx.scale(s, s);

    if (e.variant === 'bubble') {
        ctx.globalCompositeOperation = 'lighter';

        // ★変更1：時間をゆっくり進めて、ゆったりとした動きにする (0.04 -> 0.02)
        const time = frame * 0.02;
        const baseRadius = 22;

        // ★変更2：衝突の余韻を少し長く残す (0.85 -> 0.92)
        e.bend = (e.bend || 0) * 0.92;

        const points = [];
        const numPoints = 8;

        for (let i = 0; i < numPoints; i++) {
            const ang = (Math.PI * 2 / numPoints) * i;

            // ★変更3：揺れ幅（係数）を全体的に大きくし、より複雑な波形にする
            // メインの大きな揺れ: 0.8 -> 1.5
            // サブの不規則な揺れ: 0.4 -> 0.8
            // 衝突時の影響: 0.3 -> 0.4
            const noise = Math.sin(time + i) * 1.5
                + Math.cos(time * 1.3 + i * 1.5) * 0.8
                + Math.sin(frame * 0.2 + i) * e.bend * 0.4;

            const r = baseRadius + noise;
            points.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
        }


        ctx.beginPath();
        let xc = (points[numPoints - 1].x + points[0].x) / 2;
        let yc = (points[numPoints - 1].y + points[0].y) / 2;
        ctx.moveTo(xc, yc);

        for (let i = 0; i < numPoints; i++) {
            const p = points[i];
            const pNext = points[(i + 1) % numPoints];
            xc = (p.x + pNext.x) / 2;
            yc = (p.y + pNext.y) / 2;
            ctx.quadraticCurveTo(p.x, p.y, xc, yc);
        }
        ctx.closePath();

        // ★追加: 奥のグリッドを暗く沈ませる「遮光レイヤー」
        ctx.globalCompositeOperation = 'source-over'; // 通常のアルファブレンド
        ctx.fillStyle = 'rgba(0, 5, 20, 0.6)'; // 半透明の暗い色（深海のようなネイビーブラック）
        ctx.fill(); // まず暗く塗りつぶす

        // ★変更: フチやハイライトだけを光らせる（加算合成）
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(-6, -6, 2, 0, 0, baseRadius + 4);
        // 中間の透明度を0にすることで、さきほど塗った「暗さ」を活かします
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); // 中心はわずかに光る
        grad.addColorStop(0.4, 'rgba(0, 255, 255, 0)');    // 中間は完全に透明（奥の暗さが見える）
        grad.addColorStop(0.85, 'rgba(0, 255, 255, 0.4)'); // 輪郭のフチは光る
        grad.addColorStop(1, 'rgba(0, 255, 255, 0)');      // 完全に溶け込む

        ctx.fillStyle = grad;
        ctx.fill(); // 上からグラデーションを重ね塗り

        // 輪郭線
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 1.2 / s;
        ctx.stroke();

        // フィルタを解除
        ctx.filter = 'none';

        // --- ハイライト削除済み ---

        // 内部のキラキラ（そのまま残す）
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 2; i++) {
            const slowTime = time * 0.5 + i;
            const bx = Math.cos(slowTime) * 10;
            const by = Math.sin(slowTime * 1.2) * 10;
            ctx.globalAlpha = 0.2 + Math.sin(slowTime) * 0.1;
            ctx.beginPath();
            ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else {
        // 岩の描画（影を消してソリッドな質感に）
        ctx.rotate(e.angle);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5 / s; // 少し線を太くして視認性を確保

        ctx.shadowBlur = 0;

        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const r = 22 * (0.8 + Math.sin(i * 2.1 + e.size * 5) * 0.25);
            const ang = (Math.PI * 2 / 8) * i;
            if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
            else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.stroke();

        // 内部のひび割れライン
        ctx.globalAlpha = 0.3; // 少しだけ濃くする
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(5, 8);

        ctx.fillStyle = 'rgba(20, 10, 0, 0.5)'; ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function drawPhantomEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const scale = e.scale * G_SCALE;
    ctx.scale(scale, scale);

    ctx.globalAlpha = e.alpha;
    ctx.globalCompositeOperation = 'lighter';

    // ゆっくりとした公転
    const orbitSpeed = 0.05;
    if (e.rotAngle === undefined) e.rotAngle = 0;
    e.rotAngle += orbitSpeed;

    // --- 1. 中央コア（重層描画） ---
    const hue = 15 + Math.sin(frame * 0.2) * 15;
    const corePulse = 1.0 + Math.sin(frame * 0.3) * 0.1;
    const coreColor = `hsl(${hue}, 100%, 60%)`;
    const coreColorOuter = `hsl(${hue}, 100%, 30%)`;

    ctx.fillStyle = coreColorOuter;
    ctx.beginPath(); ctx.arc(0, 0, 10 * corePulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = coreColor;
    ctx.beginPath(); ctx.arc(0, 0, 7 * corePulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 3 * corePulse, 0, Math.PI * 2); ctx.fill();

    // --- 照準レーザー ---
    if (e.isAiming) {
        const targetX = (player.x - e.x) / scale;
        const targetY = (player.y - e.y) / scale;
        const laserAlpha = 0.4 + Math.sin(frame * 0.8) * 0.2;
        ctx.save();
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = -frame * 3;
        ctx.lineWidth = 4.0 * G_SCALE;
        ctx.strokeStyle = `rgba(255, 0, 0, ${laserAlpha * 0.4})`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(targetX, targetY); ctx.stroke();
        ctx.lineWidth = 1.2 * G_SCALE;
        ctx.strokeStyle = `rgba(255, 200, 200, ${laserAlpha})`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(targetX, targetY); ctx.stroke();
        ctx.restore();
    }

    // --- 2. 三角錐パーツ ---
    const pts = [
        { x: 15, y: 0, z: 0 },    // 先端
        { x: -10, y: 10, z: 5 },   // 底面1
        { x: -10, y: -10, z: 5 },  // 底面2
        { x: -10, y: 0, z: -9 }    // 底面3
    ];

    // 各パーツの共通目標：プレイヤーへの角度
    const lookAtAngle = Math.atan2(player.y - e.y, player.x - e.x);
    const aimRate = e.aimRate || 0;

    const project = (pt, i, orbitDist, targetAngle, rate) => {
        // このパーツの現在の公転角度
        const currentOrbitAngle = e.rotAngle + (Math.PI / 2) * i;

        // 公転位置の算出
        const ox = Math.cos(currentOrbitAngle) * orbitDist;
        const oy = Math.sin(currentOrbitAngle) * orbitDist;

        // --- 最短回転のロジック ---
        // 狙っていない時(rate=0)は外側を向く(= currentOrbitAngle)
        // 狙い始めると(rate>0)最短距離でtargetAngleへ向く
        let startAng = currentOrbitAngle;
        let endAng = targetAngle;

        // 角度の差を -PI 〜 PI に正規化して、360度以上の無駄な回転を防ぐ
        let diff = endAng - startAng;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        // 現在のエイム率を掛けて、現在の向きを決定
        const currentLookAngle = startAng + diff * rate;

        // 回転計算（無駄なロール回転を排除）
        const rx = pt.x * Math.cos(currentLookAngle) - pt.y * Math.sin(currentLookAngle);
        const ry = pt.x * Math.sin(currentLookAngle) + pt.y * Math.cos(currentLookAngle);
        const rz = pt.z;

        // 3D投影
        const tilt = 0.4;
        const finalY = ry * Math.cos(tilt) - rz * Math.sin(tilt);

        return { px: rx + ox, py: finalY + oy };
    };

    const lines = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];

    for (let i = 0; i < 4; i++) {
        const dist = 35 + Math.sin(frame * 0.05) * 2;
        const p = pts.map(pt => project(pt, i, dist, lookAtAngle, aimRate));

        // --- ネオンライン描画 (shadowBlurなし・lighter合成) ---
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = e.alpha * 0.8
        ctx.beginPath();
        lines.forEach(l => { ctx.moveTo(p[l[0]].px, p[l[0]].py); ctx.lineTo(p[l[1]].px, p[l[1]].py); });
        ctx.stroke();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = e.alpha * 0.8;
        ctx.beginPath();
        lines.forEach(l => { ctx.moveTo(p[l[0]].px, p[l[0]].py); ctx.lineTo(p[l[1]].px, p[l[1]].py); });
        ctx.stroke();

        // 面の塗り
        ctx.save();
        ctx.globalAlpha = e.alpha * 0.12;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(p[0].px, p[0].py); ctx.lineTo(p[1].px, p[1].py); ctx.lineTo(p[2].px, p[2].py);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

function drawEclipseEnemy(ctx, e) {
    ctx.save();

    // --- 被弾（ダメージ）判定の自己完結ロジック ---
    if (e.prevHp !== undefined && e.hp < e.prevHp) {
        e.flashTimer = 4;
    }
    e.prevHp = e.hp;

    const isDmg = (e.flashTimer > 0);
    if (isDmg) e.flashTimer--;

    ctx.translate(e.x, e.y);

    // --- 出現演出 ---
    const appearDuration = 60;
    const timer = e.actionTimer || 0;
    const progress = Math.min(1.0, Math.max(0.0, timer / appearDuration));
    const easeProgress = 1.0 - Math.pow(1.0 - progress, 3);

    const safeScale = Math.max(0.01, e.scale * G_SCALE);
    const currentScale = safeScale * (0.05 + 0.95 * easeProgress);
    ctx.scale(currentScale, currentScale);
    ctx.globalAlpha = easeProgress;

    const baseColor = e.color || '#f05';
    const mainColor = isDmg ? '#fff' : baseColor;

    ctx.globalCompositeOperation = 'lighter';

    // ==========================================
    // ★ 本体デザインの深化（線を増やしリアクターを追加）
    // ==========================================
    const sides = 6;
    const bodyRotation = e.angle * 0.5;

    ctx.save();
    ctx.rotate(bodyRotation);

    // 1. 同心円状の拘束グリッド（中心付近）
    ctx.strokeStyle = mainColor;
    for (let r = 15; r <= 25; r += 5) {
        ctx.beginPath();
        ctx.globalAlpha = (0.4 - (r / 100)) * easeProgress;
        ctx.lineWidth = 1.5;
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 2. 多層トラス・フレーム
    const layers = [
        { r: 30, lw: 1.5, alpha: 0.6, dash: [] },
        { r: 35, lw: 1.0, alpha: 0.4, dash: [] },
        { r: 38, lw: 0.5, alpha: 0.3, dash: [] }
    ];

    layers.forEach((ly, index) => {
        ctx.beginPath();
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = ly.lw;
        ctx.globalAlpha = ly.alpha * easeProgress;
        if (ly.dash.length) ctx.setLineDash(ly.dash);

        for (let i = 0; i <= sides; i++) {
            const ang = (Math.PI * 2 / sides) * i;
            const px = Math.cos(ang) * ly.r;
            const py = Math.sin(ang) * ly.r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // レイヤー間の斜め補強線（トラス）を倍増
        if (index > 0) {
            const prevR = layers[index - 1].r;
            ctx.beginPath();
            ctx.globalAlpha = 0.2 * easeProgress;
            for (let i = 0; i < sides; i++) {
                const ang = (Math.PI * 2 / sides) * i;
                const nextAng = (Math.PI * 2 / sides) * (i + 1);
                // 放射状の線
                ctx.moveTo(Math.cos(ang) * prevR, Math.sin(ang) * prevR);
                ctx.lineTo(Math.cos(ang) * ly.r, Math.sin(ang) * ly.r);
                // 交差線
                ctx.moveTo(Math.cos(ang) * prevR, Math.sin(ang) * prevR);
                ctx.lineTo(Math.cos(nextAng) * ly.r, Math.sin(nextAng) * ly.r);
                ctx.moveTo(Math.cos(nextAng) * prevR, Math.sin(nextAng) * prevR);
                ctx.lineTo(Math.cos(ang) * ly.r, Math.sin(ang) * ly.r);
            }
            ctx.stroke();
        }
    });

    ctx.restore(); // ボディ回転終了

    // --- ブラックホール本体 ---
    const corePulse = 1.0 + Math.sin(frame * 0.05) * 0.08;
    const holeRad = 10 * corePulse;

    ctx.beginPath(); ctx.arc(0, 0, holeRad * 2.5, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(0, 0, holeRad * 0.8, 0, 0, holeRad * 2.5);
    grad.addColorStop(0, isDmg ? '#fff' : '#f00');
    grad.addColorStop(0.3, isDmg ? '#fff' : '#a00');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.arc(0, 0, holeRad, 0, Math.PI * 2);
    ctx.fillStyle = isDmg ? '#fff' : '#000';
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';

    // --- ビット（6基） ---
    const cycle = timer % 350;
    const isChargingSnipe = (cycle > 200 && cycle < 250);
    const isChargingAoe = (cycle > 80 && cycle < 120);

    let aimFactor = 0;
    if (timer >= appearDuration) {
        if (cycle >= 200 && cycle <= 340) {
            if (cycle < 250) aimFactor = (cycle - 200) / 50;
            else if (cycle <= 310) aimFactor = 1.0;
            else aimFactor = 1.0 - ((cycle - 310) / 30);
        }
    }

    const smoothAim = aimFactor * aimFactor * (3 - 2 * aimFactor);
    const targetAngle = Math.atan2(player.y - e.y, player.x - e.x);
    const orbitDist = 50 + Math.sin(frame * 0.05) * 4;

    const pts = [{ x: 14, y: 0, z: 0 }, { x: -7, y: 7, z: 4 }, { x: -7, y: -7, z: 4 }, { x: -7, y: 0, z: -8 }];
    const lines = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];

    for (let i = 0; i < 6; i++) {
        const orbitAngle = e.angle + (Math.PI * 2 / 6) * i;
        const ox = Math.cos(orbitAngle) * orbitDist;
        const oy = Math.sin(orbitAngle) * orbitDist;

        let diff = targetAngle - orbitAngle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const currentLookAngle = orbitAngle + diff * smoothAim;

        const p = pts.map(pt => {
            const rx = pt.x * Math.cos(currentLookAngle) - pt.y * Math.sin(currentLookAngle);
            const ry = pt.x * Math.sin(currentLookAngle) + pt.y * Math.cos(currentLookAngle);
            const finalY = ry * Math.cos(0.4) - pt.z * Math.sin(0.4);
            return { px: rx + ox, py: finalY + oy };
        });

        ctx.strokeStyle = mainColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3 * easeProgress;
        ctx.beginPath(); lines.forEach(l => { ctx.moveTo(p[l[0]].px, p[l[0]].py); ctx.lineTo(p[l[1]].px, p[l[1]].py); }); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.8 * easeProgress;
        ctx.beginPath(); lines.forEach(l => { ctx.moveTo(p[l[0]].px, p[l[0]].py); ctx.lineTo(p[l[1]].px, p[l[1]].py); }); ctx.stroke();
    }

    // --- 予兆演出 ---
    ctx.globalAlpha = 1.0 * easeProgress;
    if (timer >= appearDuration && !isDmg) {
        if (isChargingAoe) {
            const chargeRatio = (120 - cycle) / 40;
            ctx.strokeStyle = `rgba(255, 0, 80, ${1 - chargeRatio})`;
            ctx.lineWidth = 3 + chargeRatio * 2;
            ctx.beginPath(); ctx.arc(0, 0, 70 * chargeRatio, 0, Math.PI * 2); ctx.stroke();
        } else if (isChargingSnipe) {
            const targetX = (player.x - e.x) / currentScale;
            const targetY = (player.y - e.y) / currentScale;
            const laserAlpha = 0.5 + Math.sin(frame * 0.8) * 0.4;
            ctx.setLineDash([8, 12]);
            ctx.lineDashOffset = -((frame * 4) % 1000);
            ctx.lineWidth = 4.0;
            ctx.strokeStyle = `rgba(255, 0, 80, ${laserAlpha * 0.4})`;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(targetX, targetY); ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    ctx.restore();
}

function drawJellyfishEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.scale(e.scale * G_SCALE, e.scale * G_SCALE);

    const pulse = Math.sin(e.timer * 0.08);
    const squeeze = Math.max(0, pulse);
    const isSpark = (e.variant === 'spark');

    // --- 旋回に合わせた「能動的な足の曲がり」計算（控えめ調整版） ---
    if (e.prevAngle === undefined) e.prevAngle = e.angle;
    if (e.bend === undefined) e.bend = 0;

    let angleDiff = e.angle - e.prevAngle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    // ★係数を 3000 -> 600 (1/5) に減少。より自然なしなりへ。
    const targetBend = angleDiff * 600;
    e.bend += (targetBend - e.bend) * 0.1; // 追従を少しマイルドに
    e.bend *= 0.9; // 復元力

    // ★最大曲がり幅も 50 -> 10 (1/5) に制限
    const maxBend = 10;
    e.bend = Math.max(-maxBend, Math.min(maxBend, e.bend));

    ctx.globalCompositeOperation = 'lighter';

    // --- 1. 波打つ触手 ---
    ctx.lineWidth = isSpark ? 2.0 : 1.5;
    ctx.strokeStyle = e.color;
    ctx.globalAlpha = 0.5;

    const tentacleCount = isSpark ? 6 : 4;
    const spacing = isSpark ? 2.5 : 4;

    for (let i = 0; i < tentacleCount; i++) {
        ctx.beginPath();
        const startY = (i - (tentacleCount - 1) / 2) * spacing;
        ctx.moveTo(-5, startY);

        const waveSpd = isSpark ? 0.15 : 0.1;
        const waveAmp = isSpark ? 12 : 8;
        const wave1 = Math.sin(e.timer * waveSpd - i * 0.5) * waveAmp;
        const wave2 = Math.cos(e.timer * (waveSpd * 0.5) + i) * (waveAmp * 1.2);
        const stretch = squeeze * 15;

        // ベジェ曲線の y 座標に bend を適用。先端に向けて効果を強める。
        ctx.bezierCurveTo(
            -20 - stretch, startY + wave1 + e.bend * 0.3,
            -40 - stretch * 2, startY + wave2 + e.bend * 1.0,
            -65 - stretch * 3, startY + wave1 * 1.5 + e.bend * 2.0
        );
        ctx.stroke();

        if (isSpark && Math.random() < 0.1) {
            ctx.save();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.restore();
        }
    }

    // --- 2. 傘（変更なし） ---
    ctx.globalAlpha = 0.8;
    const grad = ctx.createRadialGradient(5, 0, 0, 5, 0, 20);
    grad.addColorStop(0, '#ffffff');
    const innerGlow = isSpark && e.chargeLevel ? Math.min(1.0, e.chargeLevel) : 0.4;
    grad.addColorStop(innerGlow, e.color);
    grad.addColorStop(1, 'transparent');
    const headX = 22 + squeeze * 6;
    const rearX = -6 + squeeze * 4;
    const widthY = 10 - squeeze * 3;
    ctx.beginPath();
    ctx.moveTo(headX, 0);
    ctx.quadraticCurveTo(8, widthY, rearX, widthY);
    ctx.quadraticCurveTo(0, 0, rearX, -widthY);
    ctx.quadraticCurveTo(8, -widthY, headX, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 0, 30, 0.7)'; ctx.fill();
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = e.color; ctx.lineWidth = 1.5;
    ctx.shadowBlur = isSpark ? 25 : 15; ctx.shadowColor = e.color;
    ctx.stroke();

    // --- 3. コア（変更なし） ---
    let coreColor = '#fff';
    if (isSpark) {
        const greenVal = Math.floor(60 + Math.sin(frame * 0.2) * 60);
        coreColor = `rgb(255, ${greenVal}, 0)`;
    }
    ctx.fillStyle = coreColor;
    ctx.shadowBlur = isSpark ? 20 : 0; ctx.shadowColor = coreColor;
    ctx.beginPath();
    if (isSpark) {
        const coreSize = 3 + pulse * 2 + (e.chargeLevel || 0) * 4;
        for (let j = 0; j < 6; j++) {
            const a = (Math.PI * 2 / 6) * j + frame * 0.2;
            const r = coreSize * (0.8 + Math.random() * 0.4);
            const cx = 4 + Math.cos(a) * r; const cy = Math.sin(a) * r * 0.8;
            if (j === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        }
        ctx.closePath(); ctx.fill();
    } else {
        ctx.ellipse(4 + squeeze * 2, 0, 3 + pulse * 2, 2 + pulse, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    e.prevAngle = e.angle;
    ctx.restore();
}

function drawSentinelEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    const s = G_SCALE * e.scale;
    ctx.scale(s, s);

    ctx.globalCompositeOperation = 'lighter';
    const isScan = (e.state === 'scan');
    const color = isScan && frame % 4 < 2 ? '#fff' : e.color;

    // --- 1. 本体（六角形のセンサーポッド） ---
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 / 6) * i;
        const r = i % 2 === 0 ? 15 : 10;
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.stroke();

    // --- 2. 左右のスタビライザー ---
    ctx.beginPath();
    ctx.moveTo(0, 8); ctx.lineTo(-15, 15);
    ctx.moveTo(0, -8); ctx.lineTo(-15, -15);
    ctx.stroke();

    // --- 3. スキャン演出（自機までの長さに制限） ---
    if (isScan) {
        const scanPulse = Math.sin(frame * 0.5) * 0.5 + 0.5;

        // ★ 自機までの実際の距離を計算
        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);

        // ★ スケール(s)で割ることで、描画上の長さを正確に合わせる
        const lineLength = distToPlayer / s;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -frame * 2; // レーザーが流れるアニメーション
        ctx.strokeStyle = `rgba(255, 50, 100, ${0.3 + scanPulse * 0.4})`;

        ctx.moveTo(15, 0);
        ctx.lineTo(lineLength, 0); // 自機の位置でピタッと止まる
        ctx.stroke();



        ctx.restore();
    }

    // --- 4. コア ---
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawIslandEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    const s = e.scale * G_SCALE;
    ctx.scale(s, s);

    // 1. 岩の本体
    ctx.fillStyle = e.color || '#444';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;

    ctx.beginPath();
    // 8角形の岩のような形
    for (let i = 0; i < 8; i++) {
        // 少し凸凹させる
        const r = 40 + Math.sin(i * 132.5) * 5;
        const ang = (Math.PI * 2 / 8) * i;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. 縞模様（スターフォース風ストライプ）
    ctx.globalCompositeOperation = 'source-atop'; // 岩の中にだけ描画
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // 暗い縞
    ctx.lineWidth = 3;

    const size = 45;
    for (let i = -size; i < size; i += 10) {
        ctx.beginPath();
        // 斜めのストライプ
        ctx.moveTo(-size, i);
        ctx.lineTo(size, i);
        ctx.stroke();
    }

    // ダメージ時の点滅
    if (e.flashTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        e.flashTimer--;
    }

    ctx.restore();
}

function drawTurretEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle); // 砲身の向き
    const s = e.scale * G_SCALE;
    ctx.scale(s, s);

    // 台座（回転しない四角）... を描くには逆回転が必要だが
    // ここではシンプルに砲台全体が回るデザインにする

    // 1. 砲身
    ctx.fillStyle = '#800'; // 暗い赤
    ctx.fillRect(0, -4, 15, 8); // 長方形の砲身

    // 2. 本体ドーム
    ctx.fillStyle = '#f00'; // 明るい赤
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // 3. コア（光る点）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // 枠線
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ダメージ点滅
    if (e.flashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        e.flashTimer--;
    }

    ctx.restore();
}

function drawBossEnemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // フェードアウト・出現演出
    const baseAlpha = e.opacity !== undefined ? e.opacity : 1.0;
    if (e.isSpawning) {
        const t = e.spawnTimer / e.spawnMax;
        const easeOut = 1 - Math.pow(1 - t, 4);
        ctx.globalAlpha = t * baseAlpha;
        const spawnScale = 0.1 + 0.9 * easeOut;
        ctx.scale(spawnScale, spawnScale);
        ctx.globalCompositeOperation = 'lighter';
    } else {
        ctx.globalAlpha = baseAlpha;
    }

    // 基本回転・スケール
    ctx.rotate(e.angle);
    const shipScale = e.scale * G_SCALE;
    ctx.scale(shipScale, shipScale);

    const isDmg = e.flashTimer > 0;
    if (isDmg) e.flashTimer--;

    // パラメータ
    const sides = e.variant.sides;
    const baseColor = e.color;
    const mainStroke = isDmg ? '#ffffff' : baseColor;
    const reactorColor = isDmg ? '#ffffff' : '#cc0000';

    // ★追加：書き込み用の極細線色（薄い白）
    const detailStroke = isDmg ? 'rgba(255,255,255,0.4)' : 'rgba(255, 255, 255, 0.2)';

    const baseRadius = 45;

    // --- 4. 中層：土台・トラス構造 ---
    ctx.save();
    ctx.globalAlpha = baseAlpha;
    // ★変更：塗りつぶしを削除し、線のみにする
    // ctx.fillStyle = 'rgba(5, 10, 15, 0.95)'; // 削除
    // ctx.beginPath(); drawPolygonPath(ctx, baseRadius, sides); ctx.fill(); // 削除

    // ベース枠線
    ctx.strokeStyle = mainStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); drawPolygonPath(ctx, baseRadius, sides); ctx.stroke();

    // 放射状ライン（元のコード通り）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * baseRadius, Math.sin(angle) * baseRadius);
    }
    ctx.stroke();

    // ★追加書き込み1：装甲パネルの継ぎ目（極細の同心線）
    ctx.strokeStyle = detailStroke;
    ctx.lineWidth = 0.5; // 極細
    ctx.beginPath();
    drawPolygonPath(ctx, baseRadius * 0.85, sides);
    drawPolygonPath(ctx, baseRadius * 0.65, sides);
    ctx.stroke();

    ctx.restore();

    // --- 4.5. 内装フレーム ---
    ctx.save();
    const innerFrameRad = baseRadius * 0.85;
    ctx.strokeStyle = mainStroke;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.5 * baseAlpha;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle1 = (Math.PI * 2 / sides) * i - Math.PI / 2;
        const angle2 = (Math.PI * 2 / sides) * (i + 1) - Math.PI / 2;
        const midAngle = (angle1 + angle2) / 2;

        const r1x = Math.cos(angle1); const r1y = Math.sin(angle1);
        const r2x = Math.cos(angle2); const r2y = Math.sin(angle2);
        const rmx = Math.cos(midAngle); const rmy = Math.sin(midAngle);

        // 元のフレーム構造
        ctx.moveTo(r1x * innerFrameRad, r1y * innerFrameRad);
        ctx.lineTo(r1x * (innerFrameRad * 0.3), r1y * (innerFrameRad * 0.3));
        ctx.moveTo(r1x * innerFrameRad, r1y * innerFrameRad);
        ctx.lineTo(rmx * (innerFrameRad * 0.6), rmy * (innerFrameRad * 0.6));
        ctx.lineTo(r2x * innerFrameRad, r2y * innerFrameRad);

        // ★追加書き込み2：フレーム補強材（斜めの極細線）
        // フレームの中点同士を結ぶ
        const midR1 = innerFrameRad * 0.65;
        const midR2 = innerFrameRad * 0.3;
        ctx.moveTo(r1x * midR1, r1y * midR1);
        ctx.lineTo(r2x * midR2, r2y * midR2);
    }
    drawPolygonPath(ctx, innerFrameRad * 0.3, sides);
    ctx.stroke();

    ctx.restore();

    // 砲台の塗りつぶしグラデーションも一旦削除して線画中心にする方針だが、
    // ここは「構造物」としての実体感を残すため、元のまま維持する。
    const modGrad = ctx.createLinearGradient(-10, -20, 10, 20);
    modGrad.addColorStop(0, 'rgba(40, 40, 40, 0.95)');
    modGrad.addColorStop(0.5, 'rgba(10, 10, 10, 0.95)');
    modGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');

    // --- 5. 精密砲台モジュール ---
    for (let i = 0; i < sides; i++) {
        ctx.save();
        ctx.globalAlpha = baseAlpha;
        ctx.rotate((Math.PI * 2 / sides) * i);
        ctx.translate(0, -baseRadius + 5);
        ctx.scale(0.5, 0.5);

        // A. 側面装甲（維持）
        ctx.fillStyle = '#050000';
        ctx.beginPath();
        ctx.moveTo(-16, -28); ctx.lineTo(16, -28); ctx.lineTo(14, 25);
        ctx.lineTo(8, 30); ctx.lineTo(-8, 30); ctx.lineTo(-14, 25);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = mainStroke; ctx.lineWidth = 2; ctx.stroke();

        // ★追加書き込み3：砲台のモールド線（極細）
        ctx.strokeStyle = detailStroke; ctx.lineWidth = 0.5;
        ctx.beginPath();
        // 縦方向の分割線
        ctx.moveTo(-5, -28); ctx.lineTo(-5, 25);
        ctx.moveTo(5, -28); ctx.lineTo(5, 25);
        ctx.stroke();

        // B. 天面（維持）
        ctx.translate(0, -3);
        ctx.fillStyle = modGrad;
        ctx.beginPath();
        ctx.moveTo(-12, -35); ctx.lineTo(12, -35); ctx.lineTo(14, 15);
        ctx.lineTo(8, 25); ctx.lineTo(-8, 25); ctx.lineTo(-14, 15);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = mainStroke; ctx.lineWidth = 1; ctx.stroke();

        // C. リアクター（維持）
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const energyPulse = Math.sin(frame * 0.3 + i) * 0.3 + 0.7;
        ctx.fillStyle = reactorColor;
        ctx.globalAlpha = energyPulse * baseAlpha;
        for (let k = 0; k < 5; k++) {
            const y = -10 + k * 6;
            const w = 14 + k * 1.5;
            ctx.fillRect(-w / 2 - 1, y - 1, w + 2, 4);
        }
        ctx.restore();

        // D. 砲身（維持）
        ctx.strokeStyle = mainStroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -35); ctx.lineTo(-6, -10);
        ctx.moveTo(6, -35); ctx.lineTo(6, -10);
        ctx.moveTo(0, 10); ctx.lineTo(0, 50);
        ctx.stroke();
        ctx.fillStyle = mainStroke;
        ctx.beginPath(); ctx.arc(0, 50, 1.5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // --- 6. 多層外殻フレーム ---
    ctx.save();
    const layers = 4;
    const outerRad = baseRadius + 28;
    const innerRad = baseRadius + 2;

    for (let i = 0; i < layers; i++) {
        const ratio = i / (layers - 1);
        const r = innerRad + (outerRad - innerRad) * Math.pow(ratio, 1.2);
        const layerAlpha = 0.15 + 0.6 * (1 - ratio);
        const layerWidth = 1.2 - (0.7 * ratio);

        ctx.beginPath();
        drawPolygonPath(ctx, r, sides);
        ctx.strokeStyle = mainStroke;
        ctx.lineWidth = Math.max(0.5, layerWidth);
        ctx.globalAlpha = layerAlpha * baseAlpha;
        ctx.stroke();

        // ★追加書き込み4：外殻間の微細接続構造（極細ジグザグ線）
        if (i > 0 && i < layers - 1) {
            const prevR = innerRad + (outerRad - innerRad) * Math.pow((i - 1) / (layers - 1), 1.2);
            ctx.strokeStyle = detailStroke;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.3 * baseAlpha;
            ctx.beginPath();
            for (let j = 0; j < sides * 2; j++) {
                const ang = (Math.PI * 2 / (sides * 2)) * j;
                // 内側の円周上の点と外側の円周上の点を交互に結ぶ
                const targetR = (j % 2 === 0) ? prevR : r;
                ctx.lineTo(Math.cos(ang) * targetR, Math.sin(ang) * targetR);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    // 外殻の支柱（元のコード通り）
    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = mainStroke;
    ctx.globalAlpha = 0.5 * baseAlpha;
    for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        ctx.moveTo(Math.cos(angle) * innerRad, Math.sin(angle) * innerRad);
        ctx.lineTo(Math.cos(angle) * outerRad, Math.sin(angle) * outerRad);
    }
    ctx.stroke();
    ctx.restore();

    // --- 7. コア・ソケット（変更なし） ---
    const socketRad = baseRadius * 0.45;
    ctx.save();
    ctx.globalAlpha = baseAlpha;
    ctx.fillStyle = '#080808'; ctx.strokeStyle = mainStroke; ctx.lineWidth = 1.5;
    ctx.beginPath(); drawPolygonPath(ctx, socketRad, sides); ctx.fill(); ctx.stroke();
    for (let i = 0; i < sides; i++) {
        ctx.save(); ctx.rotate((Math.PI * 2 / sides) * i);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // ここは薄い発光なので維持
        ctx.beginPath();
        ctx.moveTo(socketRad * 0.5, -3); ctx.lineTo(socketRad * 0.8, -1);
        ctx.lineTo(socketRad * 0.8, 1); ctx.lineTo(socketRad * 0.5, 3);
        ctx.fill(); ctx.restore();
    }
    ctx.restore();

    // --- 8. 立体ダイヤモンド・コア（変更なし） ---
    ctx.save();
    const pulse = Math.sin(frame * 0.1);
    const coreSize = socketRad * 0.6 + pulse * 1.5;

    ctx.globalCompositeOperation = 'lighter';
    const glowSize = isDmg ? 1.8 : 1.4;
    ctx.fillStyle = mainStroke;
    ctx.globalAlpha = (isDmg ? 0.5 : 0.15) * baseAlpha;
    ctx.beginPath(); drawPolygonPath(ctx, coreSize * glowSize, sides); ctx.fill();

    ctx.globalAlpha = 1.0 * baseAlpha;
    ctx.fillStyle = 'rgba(10, 0, 0, 0.8)';
    ctx.beginPath(); drawPolygonPath(ctx, coreSize, sides); ctx.fill();

    const coreLayers = 3;
    for (let l = 0; l < coreLayers; l++) {
        const scale3d = 1.0 - (l * 0.25);
        const alpha3d = 0.4 + (l * 0.2);
        ctx.save();
        ctx.rotate(frame * (0.02 + l * 0.01) * (l % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha3d})`;
        ctx.fillStyle = mainStroke;
        ctx.globalAlpha = (alpha3d * 0.3) * baseAlpha;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); drawPolygonPath(ctx, coreSize * scale3d, sides);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        const rad = coreSize * scale3d;
        for (let i = 0; i < sides; i++) {
            const ang = (Math.PI * 2 / sides) * i - Math.PI / 2;
            ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = mainStroke;
    ctx.globalAlpha = 0.5 * baseAlpha;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1.0 * baseAlpha;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); // コア終了

    // --- 9. ダメージエフェクト（変更なし） ---
    if (isDmg && !e.isSpawning) {
        for (let i = 0; i < 4; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 4 + Math.random() * 10;
            particles.push({
                x: e.x + (Math.random() - 0.5) * 40, y: e.y + (Math.random() - 0.5) * 40,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                color: Math.random() > 0.4 ? '#fff' : baseColor, life: 0.5, size: 2 + Math.random() * 2
            });
        }
    }
    ctx.restore();
}

// --- 巨大戦艦（ラスボス）の描画 ---
function drawBattleshipBoss(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // ==========================================
    // ★追加：フェードアウト用のベース透明度を取得
    // ==========================================
    const baseAlpha = e.opacity !== undefined ? e.opacity : 1.0;

    if (e.isSpawning) {
        const t = e.spawnTimer / e.spawnMax;
        const easeOut = 1 - Math.pow(1 - t, 4);
        ctx.globalAlpha = t * baseAlpha; // ★ baseAlpha を掛ける
        const spawnScale = 0.1 + 0.9 * easeOut;
        ctx.scale(spawnScale, spawnScale);
        ctx.globalCompositeOperation = 'lighter';
    } else {
        ctx.globalAlpha = baseAlpha; // ★ 通常時も baseAlpha を設定
    }

    ctx.rotate(e.angle);
    const shipScale = e.scale * G_SCALE * 1.5;
    ctx.scale(shipScale, shipScale);

    const isDmg = e.flashTimer > 0;
    if (isDmg) e.flashTimer--;

    const sides = e.variant.sides || 12;

    const colorCyan = '#00ffff';
    const colorDeepRed = '#aa0000';
    const colorRedNeon = '#ff0022';
    const colorHighLight = '#ffaaaa';

    const mainStroke = isDmg ? '#ffffff' : colorCyan;
    const subStroke = isDmg ? '#ffffff' : colorRedNeon;
    const reactorColor = isDmg ? '#ffffff' : '#cc0000';

    const baseRadius = 90;

    // --- 4. 中層：土台・トラス構造 ---
    ctx.save();
    ctx.globalAlpha = baseAlpha; // ★追加
    ctx.fillStyle = 'rgba(5, 10, 15, 0.95)';
    ctx.beginPath();
    drawPolygonPath(ctx, baseRadius, sides);
    ctx.fill();

    ctx.strokeStyle = '#004455';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * baseRadius, Math.sin(angle) * baseRadius);
    }
    ctx.stroke();
    ctx.restore();

    // --- 4.5. 内装フレーム ---
    ctx.save();
    const innerFrameRad = baseRadius * 0.85;
    ctx.strokeStyle = mainStroke;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.5 * baseAlpha; // ★ baseAlpha を掛ける
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle1 = (Math.PI * 2 / sides) * i - Math.PI / 2;
        const angle2 = (Math.PI * 2 / sides) * (i + 1) - Math.PI / 2;
        const midAngle = (angle1 + angle2) / 2;
        ctx.moveTo(Math.cos(angle1) * innerFrameRad, Math.sin(angle1) * innerFrameRad);
        ctx.lineTo(Math.cos(angle1) * (innerFrameRad * 0.3), Math.sin(angle1) * (innerFrameRad * 0.3));
        ctx.moveTo(Math.cos(angle1) * innerFrameRad, Math.sin(angle1) * innerFrameRad);
        ctx.lineTo(Math.cos(midAngle) * (innerFrameRad * 0.6), Math.sin(midAngle) * (innerFrameRad * 0.6));
        ctx.lineTo(Math.cos(angle2) * innerFrameRad, Math.sin(angle2) * innerFrameRad);
    }
    drawPolygonPath(ctx, innerFrameRad * 0.3, sides);
    ctx.stroke();
    ctx.restore();

    const modGrad = ctx.createLinearGradient(-10, -20, 10, 20);
    modGrad.addColorStop(0, 'rgba(30, 0, 5, 0.95)');
    modGrad.addColorStop(0.5, 'rgba(60, 10, 20, 0.95)');
    modGrad.addColorStop(1, 'rgba(20, 0, 0, 0.95)');

    // --- 5. 精密砲台モジュール ---
    for (let i = 0; i < sides; i++) {
        ctx.save();
        ctx.globalAlpha = baseAlpha; // ★追加
        ctx.rotate((Math.PI * 2 / sides) * i);
        ctx.translate(0, -baseRadius + 12);
        ctx.scale(0.8, 0.8);

        ctx.fillStyle = '#050000';
        ctx.beginPath();
        ctx.moveTo(-16, -28); ctx.lineTo(16, -28); ctx.lineTo(14, 25);
        ctx.lineTo(8, 30); ctx.lineTo(-8, 30); ctx.lineTo(-14, 25);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = colorCyan;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.translate(0, -3);
        ctx.fillStyle = modGrad;
        ctx.beginPath();
        ctx.moveTo(-12, -35); ctx.lineTo(12, -35); ctx.lineTo(14, 15);
        ctx.lineTo(8, 25); ctx.lineTo(-8, 25); ctx.lineTo(-14, 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = mainStroke;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const energyPulse = Math.sin(frame * 0.3 + i) * 0.3 + 0.7;
        ctx.fillStyle = reactorColor;
        ctx.globalAlpha = energyPulse * baseAlpha; // ★ baseAlpha を掛ける
        for (let k = 0; k < 5; k++) {
            const y = -10 + k * 6;
            const w = 14 + k * 1.5;
            ctx.fillRect(-w / 2 - 1, y - 1, w + 2, 4);
        }
        ctx.restore();

        ctx.strokeStyle = mainStroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -35); ctx.lineTo(-6, -10);
        ctx.moveTo(6, -35); ctx.lineTo(6, -10);
        ctx.moveTo(0, 10); ctx.lineTo(0, 50);
        ctx.stroke();

        ctx.fillStyle = mainStroke;
        ctx.beginPath(); ctx.arc(0, 50, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // --- 6. 多層外殻フレーム ---
    ctx.save();
    const layers = 5;
    const outerRad = baseRadius + 40;
    const innerRad = baseRadius + 5;
    for (let i = 0; i < layers; i++) {
        const ratio = i / (layers - 1);
        const r = innerRad + (outerRad - innerRad) * Math.pow(ratio, 1.2);
        const layerAlpha = 0.15 + 0.7 * (1 - ratio);
        const layerWidth = 1.5 - (1.0 * ratio);

        ctx.beginPath();
        drawPolygonPath(ctx, r, sides);
        ctx.strokeStyle = colorCyan;
        ctx.lineWidth = Math.max(0.5, layerWidth);
        ctx.globalAlpha = layerAlpha * baseAlpha; // ★ baseAlpha を掛ける
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = mainStroke;
    ctx.globalAlpha = 0.5 * baseAlpha; // ★ baseAlpha を掛ける
    for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
        ctx.moveTo(Math.cos(angle) * innerRad, Math.sin(angle) * innerRad);
        ctx.lineTo(Math.cos(angle) * outerRad, Math.sin(angle) * outerRad);
    }
    ctx.stroke();
    ctx.restore();

    // --- 7. コア・ソケット ---
    const socketRad = baseRadius * 0.45;
    ctx.save();
    ctx.globalAlpha = baseAlpha; // ★追加
    ctx.fillStyle = '#080000';
    ctx.strokeStyle = colorCyan;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawPolygonPath(ctx, socketRad, sides);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < sides; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 / sides) * i);
        ctx.fillStyle = '#660000';
        ctx.beginPath();
        const decorDist = socketRad * 0.65;
        ctx.moveTo(decorDist, -4); ctx.lineTo(decorDist + 13, -2);
        ctx.lineTo(decorDist + 13, 2); ctx.lineTo(decorDist, 4);
        ctx.fill();
        ctx.strokeStyle = colorCyan;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(decorDist + 13, 0); ctx.lineTo(decorDist - 5, 0);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    // --- 8. 立体ダイヤモンド・コア ---
    ctx.save();
    const pulse = Math.sin(frame * 0.1);
    const coreSize = socketRad * 0.6 + pulse * 1.5;

    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = isDmg ? 60 : 30;
    ctx.shadowColor = colorRedNeon;

    ctx.fillStyle = colorDeepRed;
    ctx.globalAlpha = baseAlpha; // ★追加
    ctx.beginPath(); drawPolygonPath(ctx, coreSize, sides); ctx.fill();

    const coreLayers = 4;
    for (let l = 0; l < coreLayers; l++) {
        const scale3d = 1.0 - (l * 0.18);
        const alpha3d = 0.4 + (l * 0.15);
        ctx.save();
        ctx.rotate(frame * (0.01 + l * 0.005) * (l % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `rgba(255, 200, 200, ${alpha3d})`;
        ctx.fillStyle = `rgba(255, 0, 50, ${alpha3d * 0.2})`;
        ctx.globalAlpha = baseAlpha; // ★ rgba のアルファとは別に全体に掛ける
        ctx.lineWidth = 1.0;
        ctx.shadowBlur = 0;

        ctx.beginPath(); drawPolygonPath(ctx, coreSize * scale3d, sides);
        ctx.fill(); ctx.stroke();

        ctx.beginPath();
        const rad = coreSize * scale3d;
        for (let i = 0; i < sides; i++) {
            const ang = (Math.PI * 2 / sides) * i - Math.PI / 2;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            if (l === 0) {
                const nextAng = (Math.PI * 2 / sides) * (i + 1) - Math.PI / 2;
                ctx.moveTo(Math.cos(ang) * rad * 0.5, Math.sin(ang) * rad * 0.5);
                ctx.lineTo(Math.cos(nextAng) * rad, Math.sin(nextAng) * rad);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.globalAlpha = baseAlpha; // ★追加
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = (0.3 + pulse * 0.1) * baseAlpha; // ★ baseAlpha を掛ける
    ctx.strokeStyle = colorHighLight;
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    const flareSize = coreSize * 1.5;
    ctx.moveTo(-flareSize, -flareSize); ctx.lineTo(flareSize, flareSize);
    ctx.moveTo(flareSize, -flareSize); ctx.lineTo(-flareSize, flareSize);
    ctx.stroke();
    ctx.restore();

    // --- 9. ダメージエフェクト ---
    if (isDmg && !e.isSpawning) {
        for (let i = 0; i < 4; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 4 + Math.random() * 10;
            particles.push({
                x: e.x + (Math.random() - 0.5) * 40, y: e.y + (Math.random() - 0.5) * 40,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                color: Math.random() > 0.4 ? '#fff' : colorRedNeon, life: 0.5, size: 2 + Math.random() * 2
            });
        }
    }
    ctx.restore();
}

// --- 補助関数: n角形のパスを描く ---
function drawPolygonPath(ctx, radius, sides) {
    // 頂点が常に上（Y軸マイナス方向）を向くように角度をオフセット
    const offsetAngle = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
        const theta = (Math.PI * 2 / sides) * i + offsetAngle;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

// --- 極限軽量・高速回転多面体コア（FighterJet / ビット） ---
function drawFighterJet(ctx, e) {
    // ★修正: 描画の基準位置を機体の座標に移動させる（必須）
    ctx.save();
    ctx.translate(e.x, e.y);

    const angle = e.drawAngle !== undefined ? e.drawAngle : Math.atan2(e.vy, e.vx);
    ctx.rotate(angle);

    // ★修正: 敵機用のスケール設定に対応
    const scale = G_SCALE * 1.5 * (e.scale || 1.0);
    const col = e.color || '#0FF';

    // ==========================================
    // 照準（レーダースコープ）エフェクト
    // ==========================================
    if (e.state === 'aim' && e.aimProgress !== undefined) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const aimProgress = e.aimProgress;
        const distToPlayer = e.distToPlayer || 100;

        // 赤い点線のレーザーサイト
        ctx.strokeStyle = `rgba(255, 0, 50, ${aimProgress * 0.8})`;
        ctx.lineWidth = 2 * G_SCALE;
        ctx.setLineDash([10, 15]);
        ctx.lineDashOffset = -frame * 3;

        ctx.beginPath();
        ctx.moveTo(15 * scale, 0);
        ctx.lineTo(distToPlayer, 0);
        ctx.stroke();

        // ターゲットを捕捉する収束サークル
        ctx.beginPath();
        const circleSize = 40 - aimProgress * 20;
        ctx.arc(distToPlayer, 0, circleSize, 0, Math.PI * 2);
        ctx.stroke();

        // ロックオン完了直前に強く光る
        if (aimProgress > 0.9) {
            ctx.fillStyle = `rgba(255, 0, 50, 0.6)`;
            ctx.beginPath();
            ctx.arc(distToPlayer, 0, 25, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // --- 機体本体の描画 ---
    const pulse = Math.sin(frame * 0.15) * 2 + 6;
    ctx.fillStyle = '#F00';
    ctx.fillRect(-pulse * 0.35 * scale, -pulse * 0.35 * scale, pulse * 0.7 * scale, pulse * 0.7 * scale);

    ctx.strokeStyle = col;
    ctx.lineWidth = 1.0;

    const rot = frame * 0.12;
    const points = [];
    const pCount = 4;

    for (let i = 0; i < pCount; i++) {
        const lon = (Math.PI * 2 / pCount) * i + rot;
        const py = Math.cos(lon) * 10 * scale;
        const pz = Math.sin(lon); // 奥行き
        points.push({ x: 0, y: py, z: pz });
    }

    const head = { x: 14 * scale, y: 0, z: 0 };
    const tail = { x: -14 * scale, y: 0, z: 0 };

    points.forEach((p, idx) => {
        ctx.globalAlpha = (p.z + 1) / 2 * 0.6 + 0.4;
        const nextIdx = (idx === pCount - 1) ? 0 : idx + 1;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(points[nextIdx].x, points[nextIdx].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tail.x, tail.y);
        ctx.stroke();
    });

    ctx.globalAlpha = 1.0;
    // ★修正: 冒頭の ctx.save() に対する restore
    ctx.restore();
}

function drawNormalBullet(ctx, eb) {
    ctx.rotate(frame * 0.15);

    const bulletColor = '#ff8800';
    const size = 8 * G_SCALE;


    ctx.fillStyle = bulletColor;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    // 中心を白くして発光感を出す
    ctx.fillStyle = (Math.floor(frame / 10) % 2 === 0) ? '#ff0000' : '#ff8800';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawHomingMissile(ctx, eb) {
    // --- 0. フェードアウト処理の反映 ---
    // eb.alpha が定義されている場合はそれを使用し、なければ 1.0 とする
    const currentAlpha = (eb.alpha !== undefined) ? eb.alpha : 1.0;

    // --- 1. ジェット噴射の軌跡（トレイル）を描画 ---
    if (eb.trail && eb.trail.length > 1) {
        ctx.save();
        ctx.translate(-eb.x, -eb.y);

        const trailColor = eb.color || '#f00';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        for (let i = 0; i < eb.trail.length - 1; i++) {
            const p1 = eb.trail[i];
            const p2 = eb.trail[i + 1];
            const ratio = 1 - (i / eb.trail.length);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            // ① 外側の光（全体の透明度 currentAlpha を掛ける）
            ctx.strokeStyle = trailColor;
            ctx.lineWidth = 6 * ratio * G_SCALE;
            ctx.globalAlpha = 0.2 * ratio * currentAlpha; // ★修正
            ctx.stroke();

            // ② 内側の白い芯
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * ratio * G_SCALE;
            ctx.globalAlpha = 0.4 * ratio * currentAlpha; // ★修正
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- 2. ミサイル本体の描画 ---
    ctx.save();
    // 本体描画全体にフェードアウトを適用
    ctx.globalAlpha = currentAlpha; // ★追加

    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);
    const mSize = 12 * G_SCALE;
    const color = eb.color || '#f00';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mSize, 0);
    ctx.lineTo(-mSize, mSize * 0.6);
    ctx.lineTo(-mSize * 0.4, 0);
    ctx.lineTo(-mSize, -mSize * 0.6);
    ctx.closePath();

    // 塗りの透明度はベースの透明度の半分にする
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 * currentAlpha; // ★修正
    ctx.fill();

    ctx.globalAlpha = currentAlpha; // 線のために戻す
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-mSize * 0.5, 0, 3 * G_SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawLaserMissile(ctx, eb) {
    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);

    const len = 40 * G_SCALE;
    const color = eb.color || '#0ff';

    // 加算合成は強力ですが、一回にまとめます
    ctx.globalCompositeOperation = 'lighter';

    // --- 1. 外側の光（厚み） ---
    // lineWidthと不透明度の組み合わせでグローを代用（ぼかしなし）
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 8 * G_SCALE;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();

    // --- 2. 中心の芯（真っ白） ---
    // 描画ステート（AlphaとWidth）を変更して重ねる
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 3 * G_SCALE;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();

    // source-overに戻すのは全体の最後、または描画マネージャー側で行うとさらに軽くなります
    ctx.globalCompositeOperation = 'source-over';
}

// score map popups
function drawScorePopups() {
    ctx.fillStyle = '#fff'; ctx.font = '16px Orbitron'; ctx.textAlign = 'center';
    scorePopups.forEach(s => { ctx.globalAlpha = s.alpha; ctx.fillText(s.text, s.x, s.y); });
    ctx.globalAlpha = 1.0;
}

function drawMiniMap() {
    // プレイ中または死亡演出中以外は非表示
    const container = document.getElementById('minimap-container');
    if (gameState !== 'PLAYING' && gameState !== 'DYING') {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    const mSize = 100; // HTMLで指定したサイズ
    const scale = mSize / worldSize; // 変換倍率

    // --- 描画開始 ---
    miniMapCtx.clearRect(0, 0, mSize, mSize);

    // 1. ワールド境界（薄い枠線）
    miniMapCtx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    miniMapCtx.strokeRect(0, 0, mSize, mSize);

    // 2. ワームホール（青い点）
    miniMapCtx.fillStyle = '#22f';
    wormholes.forEach(w => {
        if (w.active) {
            miniMapCtx.beginPath();
            miniMapCtx.arc(w.x * scale, w.y * scale, 1.5, 0, Math.PI * 2);
            miniMapCtx.fill();
        }
    });

    // 3. 敵の位置
    enemies.forEach(e => {
        if (e.type === 'boss') {
            // ボス：大きな赤点（点滅）
            miniMapCtx.fillStyle = (frame % 30 < 15) ? '#f00' : '#fff';
            miniMapCtx.beginPath();
            miniMapCtx.arc(e.x * scale, e.y * scale, 3.5, 0, Math.PI * 2);
            miniMapCtx.fill();
            // ボスのグロー効果
            miniMapCtx.shadowBlur = 5;
            miniMapCtx.shadowColor = '#f00';
        } else {
            // 雑魚敵：小さな紫点
            miniMapCtx.fillStyle = e.color || '#f0f';
            miniMapCtx.shadowBlur = 0;
            miniMapCtx.fillRect(e.x * scale - 1, e.y * scale - 1, 2, 2);
        }
    });

    // 4. 自機の位置（緑の点 + 軽い光）
    miniMapCtx.fillStyle = '#0f0';
    miniMapCtx.shadowBlur = 8;
    miniMapCtx.shadowColor = '#0f0';
    miniMapCtx.beginPath();
    miniMapCtx.arc(player.x * scale, player.y * scale, 2.5, 0, Math.PI * 2);
    miniMapCtx.fill();

    // シャドウ設定をリセット（他への影響を防ぐ）
    miniMapCtx.shadowBlur = 0;
}

function updateUI() {
    // --- ★修正: 'boss' だけでなく 'battleship' (ラスボス) も対象にする ---
    const currentBoss = enemies.find(e => e.type === 'boss' || e.type === 'battleship');

    if (currentBoss) {
        ui.bossContainer.style.display = 'block';
        const hpPct = Math.max(0, (currentBoss.hp / currentBoss.maxHp) * 100);
        const bColor = currentBoss.color;

        ui.bossHpBarInline.style.width = hpPct + "%";
        ui.bossHpBarInline.style.backgroundColor = bColor;
        ui.bossHpBarInline.style.boxShadow = `0 0 10px ${bColor}`;
        ui.bossBarFrame.style.borderColor = bColor;
        ui.bossNameLabel.style.color = bColor;

        // ★追加: Battleshipの場合は、専用の名前と色を強制的に適用する
        if (currentBoss.type === 'battleship') {
            ui.bossNameLabel.innerText = "GENESIS-ARK";
            ui.bossNameLabel.style.color = "#0ff"; // シアン
            ui.bossHpBarInline.style.backgroundColor = "#0ff";
            ui.bossHpBarInline.style.boxShadow = "0 0 10px #0ff";
            ui.bossBarFrame.style.borderColor = "#0ff";
        } else {
            ui.bossNameLabel.innerText = currentBoss.variant.name;
        }

        // ピンチ時の点滅演出
        if (hpPct < 25 && frame % 10 < 5) ui.bossHpBarInline.style.backgroundColor = '#fff';
    } else {
        ui.bossContainer.style.display = 'none';
    }

    // ★変更: ステージ9はボス進行度を表示
    if (stage === 9) {
        const progress = rushBossIndex / 8;
        ui.enemyBar.style.width = `${(1 - progress) * 100}%`;
        document.querySelector('.bar-label.enemy').innerText = `BOSS RUSH: ${rushBossIndex}/8`;
    } else if (stage === 10) {
        // ==========================================
        // ★追加: ラスボス戦は無限湧きなので「∞」と表示する
        ui.enemyBar.style.width = "100%";
        document.querySelector('.bar-label.enemy').innerText = `ENEMY: ∞`;
        // ==========================================
    } else {
        const rawRemains = enemiesToSpawn - enemiesKilled;
        const enemyRemains = Math.max(0, Math.ceil(rawRemains));
        ui.enemyBar.style.width = `${(enemyRemains / enemiesToSpawn) * 100}%`;
        document.querySelector('.bar-label.enemy').innerText = `ENEMY: ${enemyRemains}`;
    }

    // Shield Bar
    const shieldPercent = Math.max(0, (player.shield / PLAYER_BASE_SHIELD) * 100);
    ui.shieldBar.style.width = shieldPercent + "%";
    if (player.shield < PLAYER_BASE_SHIELD * 0.3) ui.shieldBar.classList.add('shield-critical');
    else ui.shieldBar.classList.remove('shield-critical');
    if (ui.shieldVal) ui.shieldVal.innerText = Math.floor(Math.max(0, player.shield));

    // Weapon Bar
    ui.weaponDisplay.innerHTML = '';
    if (player.laserTimer > 0) {
        const pct = Math.max(0, (player.laserTimer / LASER_DURATION) * 100);
        const frameDiv = document.createElement('div'); frameDiv.className = 'laser-bar-frame';
        const fillDiv = document.createElement('div'); fillDiv.className = 'laser-bar-fill';
        fillDiv.style.width = pct + '%';
        if (player.laserTimer < 120 && Math.floor(frame / 4) % 2 === 0) fillDiv.style.opacity = 0.3;
        frameDiv.appendChild(fillDiv); ui.weaponDisplay.appendChild(frameDiv);
        player.laserTimer--;
    } else {
        for (let i = 1; i <= MAX_WEAPON_LEVEL; i++) {
            const block = document.createElement('div'); block.className = 'w-block';
            if (i <= player.weaponLevel) block.classList.add('active');
            ui.weaponDisplay.appendChild(block);
        }
    }

    // Invuln Bar
    if (player.invuln > 20) {
        ui.invulnWrapper.style.display = 'block';
        const pct = Math.min(100, (player.invuln / INVULN_DURATION) * 100);
        ui.invulnBar.style.width = pct + "%";
        if (player.invuln < 120 && Math.floor(frame / 4) % 2 === 0) ui.invulnBar.style.opacity = 0.3;
        else ui.invulnBar.style.opacity = 1.0;
    } else {
        ui.invulnWrapper.style.display = 'none';
    }

    if (typeof drawMiniMap === 'function') drawMiniMap();
}

function createWallImpact(x, y, color) {
    // 壁に当たった際のエネルギーの火花
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 5 + 2) * SPEED_SCALE * 15; // 弾の勢いを表現
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            size: 1.5 * G_SCALE,
            life: 0.3 + Math.random() * 0.2
        });
    }
    // 小さな光のリング
    rings.push({ x: x, y: y, r: 2, color: color, life: 0.3 });
}

function createExplosion(x, y, baseColor, n) {
    const count = Math.floor(n * EXPLOSION_COUNT_MAG);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 8 + 2) * EXPLOSION_SPEED_MAG;

        let color;
        const rnd = Math.random();

        // --- 色の決定ロジックを整理 ---
        if (rnd < 0.85) {
            // 85% は指定されたベースカラー（敵の色）
            color = baseColor;
        } else {
            // 残り 15% は「白」または「高輝度な黄色」のみに絞る（火花表現）
            color = Math.random() > 0.5 ? '#ffffff' : '#ffff00';
        }

        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            size: (Math.random() * 3 + 1) * G_SCALE,
            life: 1.0 + Math.random() * 0.5
        });
    }
}

function drawBossWarningEffect() {
    if (!isBossWarning) return;

    // これから出現するボスの色を取得
    const variantIndex = (stage - 1) % BOSS_VARIANTS.length;
    const bossColor = BOSS_VARIANTS[variantIndex].color;

    // --- 1. 出現予定地点にターゲットサイトを描画 ---
    ctx.save();
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-camera.x, -camera.y);

    const p = warningTimer / 180;
    ctx.strokeStyle = bossColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = bossColor;
    ctx.beginPath();
    ctx.arc(nextBossSpawnX, nextBossSpawnY, 50 + p * 200, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    const crossSize = 10;
    ctx.moveTo(nextBossSpawnX - crossSize, nextBossSpawnY);
    ctx.lineTo(nextBossSpawnX + crossSize, nextBossSpawnY);
    ctx.moveTo(nextBossSpawnX, nextBossSpawnY - crossSize);
    ctx.lineTo(nextBossSpawnX, nextBossSpawnY + crossSize);
    ctx.stroke();
    ctx.restore();

    // --- 2. 警告メッセージの描画 ---
    if (warningTimer > 20 && Math.floor(warningTimer / (WARNING_SOUND_INTERVAL / 2)) % 2 !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';

        // ★スケール値を取得
        const s = globalUiScale;

        if (width > height) {
            // ==========================================
            // 【横画面】画面の中央・上部にコンパクトな枠で表示
            // ==========================================
            const cy = height * 0.18;

            // ★サイズと座標にスケール(s)を掛ける
            const boxW = 300 * s;
            const boxH = 60 * s;
            const startX = (width - boxW) / 2;
            const topY = cy - 30 * s;

            ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; // 少し透けさせる
            ctx.fillRect(startX, topY, boxW, boxH);

            ctx.fillStyle = bossColor;
            // ★変更：左右の線を消し、上下の線だけを描画
            ctx.fillRect(startX, topY, boxW, 2);
            ctx.fillRect(startX, topY + boxH, boxW, 2);

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // 文字サイズや光彩（シャドウ）もスケールに合わせる
            ctx.font = `900 ${24 * s}px Orbitron, sans-serif`;
            ctx.fillStyle = "#ff0000";
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 10 * s;
            ctx.fillText("WARNING !!", width / 2, cy - 6 * s);

            ctx.font = `700 ${12 * s}px Orbitron, sans-serif`;
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.8;
            ctx.fillText("BOSS APPROACHING", width / 2, cy + 16 * s);
        } else {
            // ==========================================
            // 【縦画面】右側のUIの下にコンパクトに表示
            // ==========================================
            const marginRight = 10 * s;
            const x = width - marginRight;
            const y = 115 * s; // HUDの下あたり
            const boxW = 120 * s;
            const boxH = 45 * s;

            ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            ctx.fillRect(x - boxW, y, boxW, boxH);

            ctx.fillStyle = bossColor;
            // ★変更：縦画面も上下の線だけにする
            ctx.fillRect(x - boxW, y, boxW, 2);
            ctx.fillRect(x - boxW, y + boxH, boxW, 2);

            ctx.textAlign = "right";
            ctx.textBaseline = "top";

            ctx.font = `900 ${16 * s}px Orbitron, sans-serif`;
            ctx.fillStyle = "#ff0000";
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 8 * s;
            ctx.fillText("WARNING !!", x - 5 * s, y + 5 * s);

            ctx.font = `700 ${8 * s}px Orbitron, sans-serif`;
            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.8;
            ctx.fillText("BOSS APPROACHING", x - 5 * s, y + 26 * s);
        }

        ctx.restore();
    }
}

// ユーティリティ
// 補助関数：色から色相(Hue)を取り出す（コードの最後の方に追加してください）
function getHue(color) {
    if (color.startsWith('#')) {
        // 簡易的な16進数→Hue変換（ボスの主要色に対応）
        if (color === '#f0f') return 300; // マゼンタ
        if (color === '#ffff00') return 60; // 黄
        if (color === '#0f8') return 150; // エメラルド
        if (color === '#0cc') return 180; // シアン
        if (color === '#44f') return 240; // 青
        if (color === '#f40') return 20;  // オレンジ赤
        if (color === '#f08') return 330; // ローズ
        if (color === '#fff') return 0;   // 白
    }
    return 0;
}


// =========================================================
// 11. 入力・イベントリスナー (Input & Event Listeners)
// =========================================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        setPaused(true);
        // ページが隠れたら強制的にBGMも一時停止
        if (AudioSys && AudioSys.bgmEl) AudioSys.bgmEl.pause();
    } else {
        setPaused(false);
        // ページが戻ってきたら、ポーズ中でなければBGM再開
        if (gameState !== 'PAUSED' && AudioSys) AudioSys.resumeBGM();
    }
});

window.addEventListener('blur', () => {
    // document.hidden が true の場合のみ（タブが裏に回った時など）ポーズする
    if (document.hidden) {
        setPaused(true);
        if (AudioSys && AudioSys.bgmEl) AudioSys.bgmEl.pause();
    }
});

window.addEventListener('focus', () => {
    setPaused(false);
    if (gameState !== 'PAUSED' && AudioSys) AudioSys.resumeBGM();
});

const resumeAction = (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ★追加：シンプルにキャンバスへフォーカスを戻す
    canvas.focus();

    // UIが消えた直後にも念押しでフォーカスする
    setTimeout(() => canvas.focus(), 100);

    if (AudioSys) AudioSys.resume();

    gameState = 'PLAYING';
    ui.pauseOverlay.style.display = 'none';
    AudioSys.resumeBGM();
};

// 画面全体クリックを廃止し、個別のボタンに処理を割り当てる
document.getElementById('btn-resume').onclick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    resumeAction();
};

document.getElementById('btn-quit').onclick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    ui.pauseOverlay.style.display = 'none';
    returnToTitle(); // タイトル画面に戻る
};

function handleTouch(e) {

    if (e.target.id === 'launch-btn') return;

    e.preventDefault();
    if (gameState !== 'PLAYING') return;
    input.move.active = false; input.aim.active = false;

    const lR = ui.stickL.getBoundingClientRect(); const rR = ui.stickR.getBoundingClientRect();
    const lC = { x: lR.left + lR.width / 2, y: lR.top + lR.height / 2 };
    const rC = { x: rR.left + rR.width / 2, y: rR.top + rR.height / 2 };

    // handleTouch 関数内の修正
    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];

        // 画面中央より左なら「左スティック」判定
        if (t.clientX < window.innerWidth / 2) {
            const dL = Math.hypot(t.clientX - lC.x, t.clientY - lC.y);
            if (dL < 120) { // 判定範囲
                input.move.active = true;
                const a = Math.atan2(t.clientY - lC.y, t.clientX - lC.x);
                const d = Math.min(dL, 40);
                input.move.x = Math.cos(a) * (d / 40);
                input.move.y = Math.sin(a) * (d / 40);
                ui.knobL.style.transform = `translate(${input.move.x * 40}px,${input.move.y * 40}px)`;
            }
        }
        // 画面中央より右なら「右スティック」判定
        else {
            const dR = Math.hypot(t.clientX - rC.x, t.clientY - rC.y);
            if (dR < 120) {
                input.aim.active = true;
                const a = Math.atan2(t.clientY - rC.y, t.clientX - rC.x);
                const d = Math.min(dR, 40);
                input.aim.x = Math.cos(a) * (d / 40);
                input.aim.y = Math.sin(a) * (d / 40);
                ui.knobR.style.transform = `translate(${input.aim.x * 40}px,${input.aim.y * 40}px)`;
            }
        }
    }

    if (!input.move.active) { input.move.x = 0; input.move.y = 0; ui.knobL.style.transform = 'translate(0,0)'; }
    if (!input.aim.active) { input.aim.x = 0; input.aim.y = 0; ui.knobR.style.transform = 'translate(0,0)'; }
}

// ★修正：タッチとマウスクリックの両方に対応させる
const handleBombPress = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameState === 'PLAYING') { // 念のためプレイ中のみ動作するようにガード
        launchSatellites();
        ui.launchBtn.classList.add('active');
        setTimeout(() => ui.launchBtn.classList.remove('active'), 100);
    }
};

ui.launchBtn.addEventListener('touchstart', handleBombPress, { passive: false });
ui.launchBtn.addEventListener('mousedown', handleBombPress);

ui.controls.addEventListener('touchstart', handleTouch, { passive: false });
ui.controls.addEventListener('touchmove', handleTouch, { passive: false });
ui.controls.addEventListener('touchend', handleTouch, { passive: false });

// ★修正決定版：すべての開始処理をここで安全に一括管理する
const startBtnElement = document.getElementById('btn-start');

// 念のため既存のイベントをクリーンアップ（ボタンを複製して置換）
const newBtn = startBtnElement.cloneNode(true);
startBtnElement.parentNode.replaceChild(newBtn, startBtnElement);
// 参照を更新
ui.btnStart = newBtn;

if (newBtn) {
    const handleStart = (e) => {
        // 1. デフォルト動作の抑止
        e.stopPropagation();

        // ユーザーのクリック直後にフルスクリーン化を要求する
        requestFullScreen();

        // 2. オーディオの「完全再初期化」（同期処理的呼び出し）
        // ★★★ ここを変更 ★★★
        if (typeof AudioSys !== 'undefined') {
            // resume() ではなく reset() を呼んで作り直す
            AudioSys.reset();
        }

        // 3. フォーカスの完全移動
        // 押されたボタンからフォーカスを外し、Canvasに移します
        if (e.target) e.target.blur();
        if (document.activeElement) document.activeElement.blur();

        const gameCanvas = document.getElementById('game');
        if (gameCanvas) gameCanvas.focus();
        window.focus();

        // 4. 【重要】遅延実行 + 状態分岐
        // ゲームの状態を見て、スタートするかリトライするかを決める
        setTimeout(() => {
            // ボタンの文字、またはgameStateで判断
            if (gameState === 'GAMEOVER_UI' || newBtn.innerText === 'RETRY') {
                resetGame();
            } else {
                startGame();
            }
        }, 50);
    };

    // 安全な click イベントのみを使用
    newBtn.addEventListener('click', handleStart);
}

// 他のボタン設定はそのまま
document.getElementById('btn-ost').onclick = openOST;
document.getElementById('btn-back').onclick = closeOST;
document.getElementById('btn-howto').onclick = (e) => {
    if (e) e.stopPropagation();
    showHowTo();
};

window.addEventListener('keydown', e => {
    if (document.activeElement === document.getElementById('player-name-input')) return;

    // ★ 配列の中に 'KeyW', 'KeyA', 'KeyS', 'KeyD' を追加
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();

    input.keys[e.code] = true;

    if (resetTitleIdle()) return;

    if (gameState === 'TITLE' && e.code === 'Space') startGame();
    if (gameState === 'PLAYING' && e.code === 'KeyX') launchSatellites();
});
window.addEventListener('keyup', e => input.keys[e.code] = false);
window.addEventListener('resize', resize);

// 修正後: あらゆる操作のタイミングで、執拗にAudioContextの状態を確認して叩き起こす
const handleInteraction = () => {
    if (typeof AudioSys !== 'undefined' && AudioSys.ctx) {
        // iOSでは 'suspended' または 'interrupted' になることが多い
        if (AudioSys.ctx.state === 'suspended' || AudioSys.ctx.state === 'interrupted') {
            AudioSys.ctx.resume().then(() => {
                console.log("AudioContext Force Resumed!");
            }).catch(e => console.error(e));
        }
    }
};

// 一度きりではなく、常にリスニングしておく（iOSではこれが有効）
// 'touchstart' が最も反応が良いです
document.addEventListener('touchstart', handleInteraction, { passive: true });
document.addEventListener('click', handleInteraction, { passive: true });
document.addEventListener('keydown', handleInteraction, { passive: true });

// 追加：画面が戻ってきたときにも強力に復帰を試みる
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        setPaused(true);
        if (AudioSys && AudioSys.bgmEl) AudioSys.bgmEl.pause();
    } else {
        // 戻ってきたとき
        setPaused(false);

        // BGM再開
        if (gameState !== 'PAUSED' && AudioSys) {
            AudioSys.resumeBGM();

            // 重要：戻ってきた直後はまだAudioContextが死んでいる可能性が高いので、
            // 少し待ってからresumeを試みる（ただし、最終的にはタッチが必要になることが多い）
            setTimeout(() => {
                AudioSys.resume();
            }, 100);
        }
    }
});


document.addEventListener('click', handleInteraction);
document.addEventListener('touchstart', handleInteraction);
document.addEventListener('keydown', handleInteraction);


/**
 * ゲームパッドの入力を処理する関数
 * iOS Safari対応のため毎フレーム呼び出されます
 */
function handleGamepadInput() {
    // 1. 接続されているゲームパッドを取得
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let activeGp = null;

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
            activeGp = gp;
            break; // 最初に認識した1台目を使用
        }
    }

    if (!activeGp) return;

    // 2. ゲームパッド接続時はタッチUIを隠す
    if (gameState === 'PLAYING' && ui.controls.style.display !== 'none') {
        ui.controls.style.display = 'none';
        ui.pauseBtn.style.display = 'none';
    }

    // 3. 入力状態の取得
    // ボタンマッピングは一般的なXbox/PSコントローラー準拠
    const aBtn = activeGp.buttons[0]?.pressed;      // A / ×
    const bBtn = activeGp.buttons[1]?.pressed;      // B / ○
    const xBtn = activeGp.buttons[2]?.pressed;      // X / □
    const yBtn = activeGp.buttons[3]?.pressed;      // Y / △
    const lbBtn = activeGp.buttons[4]?.pressed;     // LB / L1
    const rbBtn = activeGp.buttons[5]?.pressed;     // RB / R1
    const ltBtn = activeGp.buttons[6]?.pressed;     // LT / L2
    const rtBtn = activeGp.buttons[7]?.pressed;     // RT / R2
    const startBtn = activeGp.buttons[9]?.pressed;  // START / OPTION

    // スティック軸 (-1.0 ~ 1.0)
    const moveX = activeGp.axes[0]; // 左スティック左右
    const moveY = activeGp.axes[1]; // 左スティック上下
    const aimX = activeGp.axes[2];  // 右スティック左右
    const aimY = activeGp.axes[3];  // 右スティック上下

    // 十字キー (D-Pad)
    // 一部のブラウザ/OSでは軸として扱われる場合もあるが、ここではボタン12-15として判定
    const dpadUp = activeGp.buttons[12]?.pressed;
    const dpadDown = activeGp.buttons[13]?.pressed;
    const dpadLeft = activeGp.buttons[14]?.pressed;
    const dpadRight = activeGp.buttons[15]?.pressed;

    // -----------------------------------------------------
    // STARTボタン処理 (ポーズ / ゲーム開始 / リトライ)
    // -----------------------------------------------------
    if (startBtn && !input.padStartPressed) {
        if (gameState === 'PLAYING') {
            setPaused(true);
        } else if (gameState === 'PAUSED') {
            resumeAction();
        } else if (gameState === 'TITLE') {
            // タイトル画面からのスタート処理
            // ★重要：フォーカス移動・フルスクリーン・オーディオ初期化を確実に実行
            window.focus();
            if (document.activeElement) document.activeElement.blur();

            requestFullScreen();

            if (typeof AudioSys !== 'undefined') {
                // iOS対策：resumeではなくresetで作り直す
                AudioSys.reset();
            }
            startGame();

        } else if (gameState === 'GAMEOVER_UI') {
            resetGame();
        } else if (isTrainingMode) {
            returnToTitleFromTraining();
        } else if (gameState === 'HOWTO') {
            hideHowTo();
        } else if (gameState === 'STORY' || gameState === 'RANKING' || gameState === 'OST') {
            // 各画面の「戻る」ボタンを押したのと同じ挙動にする
            returnToTitle();
        }
    }
    input.padStartPressed = startBtn;

    // -----------------------------------------------------
    // メニュー画面での操作 (PLAYING以外)
    // -----------------------------------------------------
    if (gameState !== 'PLAYING') {

        // スクロール処理 (右スティックまたは左スティックでスクロール)
        if (['STORY', 'RANKING', 'OST'].includes(gameState)) {
            let scrollTargetId = null;
            if (gameState === 'STORY') scrollTargetId = 'story-scroll-container';
            else if (gameState === 'RANKING') scrollTargetId = 'ranking-scroll-container';
            else if (gameState === 'OST') scrollTargetId = 'ost-scroll-container';

            const container = document.getElementById(scrollTargetId);
            if (container && Math.abs(moveY) > 0.2) {
                container.scrollTop += moveY * 15; // スクロール速度
            }
        }

        // カーソル移動 (十字キー or 左スティック)
        const isUp = dpadUp || moveY < -0.5;
        const isDown = dpadDown || moveY > 0.5;
        const isLeft = dpadLeft || moveX < -0.5;
        const isRight = dpadRight || moveX > 0.5;

        // STORY画面などボタン選択がない画面は除外
        const hasMenuButtons = (currentMenuButtons.length > 0);

        if (hasMenuButtons && (isUp || isDown || isLeft || isRight)) {
            if (!input.padDirPressed) {
                if (isUp || isLeft) selectedMenuIndex--;
                if (isDown || isRight) selectedMenuIndex++;
                window.updateMenuSelectionUI();
            }
            input.padDirPressed = true;
        } else {
            input.padDirPressed = false;
        }

        // Aボタン決定 (Enter)
        if (aBtn) {
            if (!input.padAPressed) {
                // 現在選択されているボタンをクリックする
                const targetBtn = currentMenuButtons[selectedMenuIndex];
                if (targetBtn) {
                    // STARTボタンの場合は特別処理（フォーカス迷子防止）
                    if (targetBtn.id === 'btn-start') {
                        // タイトル画面のSTART処理と同じロジックを呼ぶ
                        // (ただしclickイベントリスナーが登録されているのでclick発火でOKだが念のため)
                        targetBtn.click();
                    } else {
                        targetBtn.click();
                    }
                }

                // 連打防止のため少し待つ
                input.padAPressed = true;
                setTimeout(() => {
                    // メニュー構成が変わったかもしれないので再取得
                    if (window.refreshMenuButtons) window.refreshMenuButtons(false);
                }, 250);
            }
        } else {
            input.padAPressed = false;
        }
        return; // メニュー操作中はここで終了
    }

    // -----------------------------------------------------
    // ゲームプレイ中の操作 (PLAYING)
    // -----------------------------------------------------

    // ショット (Aボタン押しっぱなしで連射)
    input.padAPressed = aBtn;

    // 移動 (左スティック)
    const moveDeadzone = 0.2;
    if (Math.abs(moveX) > moveDeadzone || Math.abs(moveY) > moveDeadzone) {
        input.move.active = true;
        input.move.x = moveX;
        input.move.y = moveY;
    } else {
        // キーボード入力がない場合のみ停止させる
        if (input.move.active && !input.keys['KeyA'] && !input.keys['KeyD'] && !input.keys['KeyW'] && !input.keys['KeyS']) {
            input.move.x = 0;
            input.move.y = 0;
            input.move.active = false;
        }
    }

    // 照準 (右スティック)
    const aimDeadzone = 0.2;
    if (Math.abs(aimX) > aimDeadzone || Math.abs(aimY) > aimDeadzone) {
        input.aim.active = true;
        input.aim.x = aimX;
        input.aim.y = aimY;
    } else {
        input.aim.active = false;
    }

    // ボム発射 (X, B, RB, RT いずれか)
    const bombBtn = xBtn || bBtn || rbBtn || rtBtn;

    if (bombBtn && !input.padBombPressed) {
        launchSatellites();
    }
    input.padBombPressed = bombBtn;
}

// 接続イベント
window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected: " + e.gamepad.id);
    if (gameState === 'PLAYING') {
        ui.controls.style.display = 'none';
        ui.pauseBtn.style.display = 'none'; // ★追加
    }
});


window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Gamepad disconnected");
    if (gameState === 'PLAYING') {
        ui.controls.style.display = 'block';
        ui.pauseBtn.style.display = 'flex'; // ★追加
    }
    input.move.x = 0; input.move.y = 0;
    input.move.active = false; input.aim.active = false;
});

// --- ★追加：タッチ用ポーズボタンのイベント ---
const handlePauseClick = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (gameState === 'PLAYING') setPaused(true);
};
ui.pauseBtn.addEventListener('click', handlePauseClick);
ui.pauseBtn.addEventListener('touchstart', handlePauseClick, { passive: false });

// --- トレーニングモード関連の制御 ---

// HOW TO画面のボタンイベント
const btnHowtoBack = document.getElementById('btn-howto-back');
if (btnHowtoBack) btnHowtoBack.onclick = hideHowTo;

const btnHowtoNext = document.getElementById('btn-howto-next');
if (btnHowtoNext) btnHowtoNext.onclick = (e) => {
    // ★クリックが背景に伝わるのを防ぐ（これが重要）
    if (e) e.stopPropagation();
    startTraining();
};

const btnTrainingExit = document.getElementById('btn-training-exit');
if (btnTrainingExit) btnTrainingExit.onclick = returnToTitleFromTraining;

function startTraining() {
    // HOW TO画面を隠す
    document.getElementById('howto-overlay').style.display = 'none';
    document.getElementById('training-guide').style.display = 'block';

    // ゲーム状態をプレイ中に設定
    gameState = 'PLAYING';
    isTrainingMode = true; // ★フラグをON

    // ゲームリセット（初期化）
    resetGame();

    // ★プレイヤーを画面中央に固定配置
    player.x = worldSize / 2;
    player.y = worldSize / 2;

    // ★テスト用に武器レベルを少し上げておく
    player.weaponLevel = 3;

    // ▼▼▼ 追加：トレーニング用にサテライト(BOMB弾)を最大数装備させる ▼▼▼
    player.satellites = [];
    for (let i = 0; i < 12; i++) {
        player.satellites.push({
            x: player.x,
            y: player.y,
            angle: (Math.PI * 2 / 12) * i
        });
    }
    // ▲▲▲ ここまで ▲▲▲

    // UI調整（不要なものを隠す）
    ui.pauseBtn.style.display = 'none';
    ui.stage.innerText = "TEST";

    // コントローラー表示（モバイル用）
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const isConnected = Array.from(gamepads).some(gp => gp !== null);
    ui.controls.style.display = isConnected ? 'none' : 'block';

    window.refreshMenuButtons();
}

function returnToTitleFromTraining() {
    isTrainingMode = false; // ★フラグをOFF
    document.getElementById('training-guide').style.display = 'none';
    returnToTitle();
}


// テスト用リセット有効化 & マイルド表現 & 5秒消去 ▼▼▼
function checkIOSInstallPrompt() {
    // ★テスト用：表示確認したい場合はこの行のコメントアウト(//)を外してください
    // localStorage.removeItem('neonGravity_install_closed');

    const ua = navigator.userAgent.toLowerCase();

    // 1. iOS判定
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // 2. インストール済み（スタンドアロン）か判定
    const isStandalone = window.navigator.standalone === true;
    // 3. すでに閉じた履歴があるか
    const hasClosed = localStorage.getItem('neonGravity_install_closed');

    if (!isIOS || isStandalone || hasClosed) {
        return;
    }

    // 4. アプリ内ブラウザ判定
    const isInApp = /twitter|fbav|line|instagram/.test(ua);

    const prompt = document.getElementById('ios-install-prompt');
    const textDiv = prompt.querySelector('.install-text');
    const arrow = prompt.querySelector('.arrow-down');

    const lang = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language || window.navigator.userLanguage || window.navigator.browserLanguage;
    const isJa = lang && lang.startsWith('ja');

    if (isInApp) {
        // ==========================================
        // パターンA：アプリ内ブラウザ（変更なし）
        // ==========================================
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
        // ==========================================
        // パターンB：Safari (またはChrome)
        // ★横画面についてのメッセージを追加
        // ==========================================
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

        // 5秒後に自動的に閉じる
        setTimeout(() => {
            if (prompt.style.display !== 'none') {
                if (typeof window.closeInstallPrompt === 'function') {
                    window.closeInstallPrompt();
                } else {
                    prompt.style.display = 'none';
                    localStorage.setItem('neonGravity_install_closed', 'true');
                }
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

// 起動時にチェックを実行
checkIOSInstallPrompt();


// （既存のコード）
init();
window.refreshMenuButtons();
loop();
