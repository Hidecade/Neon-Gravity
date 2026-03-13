// =========================================================
// Scene & Flow Manager
// 役割: ゲームの進行、ステージ遷移、メニュー画面、および各種演出の制御
// =========================================================



// =========================================================
// 1. ゲームのメインフロー制御 (Game Main Flow)
// =========================================================

/**
 * ゲームの初回スタート処理
 * (タイトル画面から「START GAME」を押した時に呼ばれる)
 */
function startGame() {
    // 1. タイトルUIのフェードアウト（クリック防止とフォーカス維持）
    ui.overlay.style.transition = 'opacity 0.2s';
    ui.overlay.style.opacity = '0';
    ui.overlay.style.pointerEvents = 'none';
    canvas.focus(); // 即座にキャンバスへフォーカス

    setTimeout(() => {
        ui.overlay.style.display = 'none';
        // 次回表示時のためにスタイルを裏でリセット
        ui.overlay.style.transition = '';
        ui.overlay.style.opacity = '1';
        ui.overlay.style.pointerEvents = 'auto';
    }, 500);

    ui.ost.style.display = 'none';

    // 2. グローバル変数の初期化
    score = 0;
    stage = START_STAGE;
    frame = 0;
    currentStage = START_STAGE;

    // 3. プレイヤー状態のリセット
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

    // 4. 入力・カメラ・UIのリセット
    if (typeof clearInputState === 'function') clearInputState();

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

    // ステージ開始ロジックへ移行
    startStage();
}

/**
 * 各ステージの開始処理とイントロ演出のセットアップ
 */
function startStage() {
    // 1. UIの初期化（非表示）
    const hud = document.querySelector('.hud-row');
    if (hud) {
        hud.style.display = 'none';
        hud.style.opacity = '0';
    }
    ui.msg.style.display = 'none';
    ui.warn.style.display = 'none';
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';

    // 2. ゲーム内変数のリセット
    spawnedCount = 0;
    enemiesKilled = 0;
    isStageClear = false;
    isBossSpawned = false;
    isBossWarning = false;
    warningTimer = 0;
    levelItemsDroppedInStage = 0;

    // 特殊ステージ用の変数をリセット
    if (stage === 9) {
        rushBossIndex = 0;
        rushIntervalTimer = 0;
    }
    if (stage === 10) {
        stage10SpawnTimer = 0;
        stage10BeatCount = 0;
        stage10Timer = 0;
    }

    // 演出スキップフラグのリセット
    isSkippingStory = false;
    isSkipComplete = false;
    player.visualScale = 0; // イントロ中は透明にする

    // 3. エンティティプールのクリア
    bullets = []; lasers = []; enemies = []; enemyBullets = [];
    missiles = []; wormholes = []; scorePopups = []; rings = [];

    // カメラリセット
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    camera.x = player.x - viewW / 2;
    camera.y = player.y - viewH * CAMERA_Y_OFFSET;

    // コントローラー表示制御
    const isConnected = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(gp => gp !== null);
    ui.controls.style.display = 'none';
    ui.pauseBtn.style.display = 'none';

    // 4. ▼ 演出分岐（通常プレイ vs トレーニング） ▼
    if (!isTrainingMode) {
        // --- A. ストーリーモード（イントロ演出開始） ---
        gameState = 'STAGE_INTRO';
        introPhase = 1;
        introTimer = 0;
        introAlpha = 0;
        introBgScroll = 0;

        const skipContainer = document.getElementById('story-typing-container');
        if (skipContainer) {
            skipContainer.style.display = 'none';
            skipContainer.style.opacity = '0';
            skipContainer.style.transition = 'opacity 0.5s';
        }

        // ステージタイトルの多言語対応構築
        const data = STAGE_TITLES[stage] || { en: "UNKNOWN SECTOR", ja: "未知の宙域" };
        const lang = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language;
        const isJa = lang && lang.startsWith('ja');

        let msgContent = `<span style="font-size: 0.7em; letter-spacing: 4px; opacity: 0.8; display:block; margin-bottom:10px;">- STAGE ${stage} -</span>`;
        msgContent += `<span style="display:block;">${data.en}</span>`;
        if (isJa) {
            msgContent += `<span style="font-size: 0.6em; font-family: sans-serif; letter-spacing: 2px; color: rgba(255,255,255,0.6); display:block; margin-top:10px;">${data.ja}</span>`;
        }

        // BGM制御
        if (typeof AudioSys !== 'undefined') {
            if (stage === 10) AudioSys.playBGM('last');
            else if (stage === 9) AudioSys.playBGM('boss');
            else {
                const bgmIndex = (stage - 1) % BGM_FILES.stages.length;
                AudioSys.playBGM('stage', bgmIndex);
            }
        }

        // ステージテーマカラーの適用
        ui.msg.innerHTML = msgContent;
        const themeHex = STAGE_THEMES[stage] || '#00bbff';
        const textBodyColor = lightenHex ? lightenHex(themeHex, 70) : '#fff'; // lightenHex未定義対策
        const glowColor = themeHex;

        ui.msg.style.color = textBodyColor;
        ui.msg.style.textShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 40px ${glowColor}, 0 0 80px ${glowColor}`;
        ui.msg.style.display = 'block';
        ui.msg.style.transition = 'none';
        ui.msg.style.opacity = '0';
        ui.msg.style.transform = `scale(${globalUiScale})`;

        // タイトルフェードイン
        setTimeout(() => {
            ui.msg.style.transition = "opacity 0.5s ease-out";
            ui.msg.style.opacity = "1";
        }, 100);

        // ノルマと初期ワームホールの配置
        if (stage === 9 || stage === 10) {
            enemiesToSpawn = 9999;
        } else {
            enemiesToSpawn = (stage <= STAGE_ENEMY_COUNTS.length)
                ? STAGE_ENEMY_COUNTS[stage - 1]
                : STAGE_ENEMY_COUNTS[STAGE_ENEMY_COUNTS.length - 1] + 50;

            const whCount = Math.max(1, Math.floor((stage + 1) / 2));
            for (let i = 0; i < whCount; i++) {
                if (typeof spawnWormhole === 'function') spawnWormhole();
            }
        }

    } else {
        // --- B. トレーニングモード（演出スキップ） ---
        gameState = 'PLAYING';

        if (hud) {
            hud.style.display = 'flex';
            hud.style.opacity = '1';
        }

        const miniMapContainer = document.getElementById('minimap-container');
        if (miniMapContainer) {
            miniMapContainer.style.display = 'block';
            miniMapContainer.style.opacity = '1';
        }

        if (ui.controls) {
            ui.controls.style.display = isConnected ? 'none' : 'block';
            ui.controls.style.opacity = isConnected ? '0' : '1';
        }
        if (ui.launchBtn) {
            ui.launchBtn.style.display = isConnected ? 'none' : 'flex';
            ui.launchBtn.style.opacity = isConnected ? '0' : '1';
        }

        ui.pauseBtn.style.display = isConnected ? 'none' : 'flex';
        ui.pauseBtn.style.opacity = isConnected ? '0' : '1';

        player.visualScale = 1.0;
        player.visualYOffset = 0;
    }

    if (typeof initStars === 'function') initStars();
    if (typeof initNebulae === 'function') initNebulae();
}

/**
 * 同一ステージの再挑戦 (リトライ・コンティニュー)
 */
function resetGame() {
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

    if (typeof clearInputState === 'function') clearInputState();

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
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';

    // UIオーバーレイのゴースト化消去
    ui.overlay.style.transition = 'opacity 0.2s';
    ui.overlay.style.opacity = '0';
    ui.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
        ui.overlay.style.display = 'none';
        ui.overlay.style.transition = '';
        ui.overlay.style.opacity = '1';
        ui.overlay.style.pointerEvents = 'auto';
    }, 500);

    const bgmIndex = Math.floor((stage - 1) / 2) % BGM_FILES.stages.length;
    if (typeof AudioSys !== 'undefined') AudioSys.playBGM('stage', bgmIndex);

    gameState = 'PLAYING';
    startStage();

    const isConnected = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(gp => gp !== null);
    ui.controls.style.display = isConnected ? 'none' : 'block';
    ui.pauseBtn.style.display = isConnected ? 'none' : 'flex';
}

/**
 * ステージクリアの条件判定とクリア演出の発火
 */
function checkStageClear() {

    if (isTrainingMode) return;

    let isClearCondition = false;

    // ステージごとのクリア判定
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
        stageClearTimer = 0;

        // クリア演出中は操作UIを隠す
        //if (ui.controls) ui.controls.style.display = 'none';
        if (ui.pauseBtn) ui.pauseBtn.style.display = 'none';

        // --- 演出分岐 ---
        if (stage === MAX_STAGE) {
            // 全クリア (ALL CLEAR)
            gameSpeed = 0.25;
            if (typeof distortGrid === 'function') distortGrid(worldSize / 2, worldSize / 2, 1000, worldSize);
            player.invuln = 9999; // 無敵化

            if (typeof AudioSys !== 'undefined') {
                if (AudioSys.bgmEl) AudioSys.bgmEl.pause();
                AudioSys.playBGM('all_clear');
            }

            const clearText = `ALL MISSION CLEAR<br><span id="clear-score-text" style="opacity: 0; display: inline-block; margin-top: 20px; font-size: 0.6em; color: #fff; text-shadow: 0 0 10px #fff, 0 0 20px #0ff; letter-spacing: 4px;">TOTAL SCORE: ${score.toLocaleString()}</span>`;
            showMessage(clearText, 'gold');

            ui.msg.style.transition = "none";
            ui.msg.style.opacity = "0";
            ui.msg.style.transform = `translateY(100px) scale(${globalUiScale})`;

            window.isFireworksActive = true;
            if (typeof triggerRandomFireworkLoop === 'function') triggerRandomFireworkLoop();

            // テキストのせり上がりアニメーション
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

        } else {
            // 通常クリア
            gameSpeed = 0.25;
            if (typeof distortGrid === 'function') distortGrid(worldSize / 2, worldSize / 2, 1000, worldSize);
            if (typeof AudioSys !== 'undefined') AudioSys.playBGM('clear');
            showMessage("STAGE " + stage + " CLEAR", 'default');
        }
    }
}

/**
 * Firebase (ランキングDB) の準備完了を待つ
 */
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

/**
 * ゲームオーバー・ランキング登録画面への移行
 */
async function showGameOver() {
    if (gameState === 'GAMEOVER_UI') return;
    gameState = 'GAMEOVER_UI';

    // BGM停止と専用BGM再生
    if (typeof AudioSys !== 'undefined') {
        AudioSys.stopBGM();
        AudioSys.stopSE('warning');
        AudioSys.stopSE('boss_engine');
        AudioSys.playBGM('name');
    }

    ui.controls.style.display = 'none';

    // 画面上のUIを全消去
    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'none';
    ui.endingHud.style.display = 'none';
    ui.overlay.style.display = 'none';
    ui.msg.style.display = 'none';
    ui.warn.style.display = 'none';
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';
    ui.pauseBtn.style.display = 'none';

    document.getElementById('result-score-display').innerText = `SCORE: ${score.toLocaleString()}`;

    try {
        await waitForFirebase();

        // ランキング圏内チェック
        let canRegister = false;
        try {
            canRegister = await window.firebaseOps.checkRankIn(score);
        } catch (e) {
            console.error("Rank check failed:", e);
            canRegister = true; // エラー時は念のため登録許容
        }

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

        if (window.refreshMenuButtons) window.refreshMenuButtons();

        // --- 送信ボタン処理 ---
        let isSubmitting = false;
        ui.submitBtn.onclick = async () => {
            if (isSubmitting) return;
            isSubmitting = true;

            ui.submitBtn.style.pointerEvents = "none";
            ui.submitBtn.innerText = "SENDING...";
            const name = nameInp.value.trim() || "PILOT";

            let displayStage = stage;
            if (stage === 10 && isStageClear) {
                displayStage = "CLEAR";
            }

            try {
                await window.firebaseOps.submitAndCleanup(score, displayStage, name);
                localStorage.setItem("neonGravity_last_name", name);
                ui.nameInputArea.style.display = "none";

                if (typeof AudioSys !== 'undefined') AudioSys.currentSrc = null;

                if (window.showRanking) {
                    window.showRanking(() => proceedToNextMenu());
                } else {
                    proceedToNextMenu();
                }
            } catch (e) {
                console.error(e);
                alert("Connection error. Please try again.");
                ui.submitBtn.style.pointerEvents = "auto";
                ui.submitBtn.innerText = "SUBMIT";
                isSubmitting = false;
            }
        };

        // --- スキップボタン処理 ---
        ui.skipScoreBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof AudioSys !== 'undefined') AudioSys.currentSrc = null;
            proceedToNextMenu();
        };

    } catch (e) {
        console.error("Critical error in showGameOver:", e);
        if (typeof AudioSys !== 'undefined') AudioSys.currentSrc = null;
        proceedToNextMenu();
    }
}


// =========================================================
// 2. メニュー・モード・ウィンドウ制御 (Menus & Modes)
// =========================================================

/**
 * リザルト画面・最終メニューの表示
 */
function proceedToNextMenu() {
    ui.nameInputArea.style.display = 'none';
    ui.overlay.style.display = 'flex';

    let titleHTML = `GAME OVER`;
    let titleColor = '#f00';

    if (isStageClear) {
        titleHTML = `MISSION COMPLETE<br><span style="font-size:20px;color:#0ff;">SCORE: ${score.toLocaleString()}</span>`;
        titleColor = '#0ff';
    }

    ui.titleText.innerHTML = titleHTML;
    ui.titleText.style.color = titleColor;
    ui.titleText.style.textShadow = `0 0 20px ${titleColor}`;

    ui.btnStart.innerText = 'RETRY';
    ui.btnStart.style.display = 'block';
    ui.btnStart.style.borderColor = titleColor;
    ui.btnStart.style.color = titleColor;

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

    if (window.refreshMenuButtons) window.refreshMenuButtons();
}

/**
 * メインタイトル画面への復帰
 */
function returnToTitle() {
    gameState = 'TITLE';

    if (typeof AudioSys !== 'undefined') {
        AudioSys.fadeOutBGM().then(() => {
            AudioSys.currentSrc = null;
        });
    }

    introPhase = 0;
    introTimer = 0;
    introAlpha = 0;
    introBgScroll = 0;

    ui.ost.style.display = 'none';
    ui.overlay.style.display = 'flex';
    ui.controls.style.display = 'none';
    ui.msg.style.display = 'none';

    const guide = document.getElementById('training-guide');
    if (guide) guide.style.display = 'none';
    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'none';
    ui.pauseBtn.style.display = 'none';

    ui.titleText.innerHTML = `NEON GRAVITY<br><span style="font-size:20px;color:#fff;">ORBITAL</span>`;
    ui.titleText.style.color = '#0ff';
    ui.titleText.style.textShadow = '0 0 20px #0ff';

    ui.btnStart.innerText = 'START GAME';
    ui.btnStart.style.display = 'block';
    ui.btnStart.style.borderColor = '#0ff';
    ui.btnStart.style.color = '#0ff';

    if (ui.btnOst) ui.btnOst.style.display = 'block';
    if (ui.btnTitle) ui.btnTitle.style.display = 'none';

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

    if (window.refreshMenuButtons) window.refreshMenuButtons();
}

/**
 * ポーズ機能の切り替え
 */
function setPaused(paused) {
    if (paused) {
        if (gameState === 'PLAYING' || gameState === 'STAGE_INTRO' || gameState === 'DYING' || isWarpingOut) {
            if (typeof clearInputState === 'function') clearInputState();
            previousGameState = gameState;
            gameState = 'PAUSED';
            ui.pauseOverlay.style.display = 'flex';
            if (window.refreshMenuButtons) window.refreshMenuButtons();
            if (typeof AudioSys !== 'undefined') AudioSys.pauseBGM();
        }
    } else {
        if (typeof AudioSys !== 'undefined') AudioSys.resumeBGM(false);
    }
}

/**
 * フルスクリーン化リクエスト
 */
function requestFullScreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
        el.requestFullscreen().catch(e => console.log("Fullscreen blocked", e));
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    } else if (typeof isIOS !== 'undefined' && isIOS) {
        window.scrollTo(0, 0);
    }
}

/**
 * ストーリーアーカイブ画面を開く
 */
function openStory() {
    if (typeof resetTitleIdle === 'function') resetTitleIdle();
    gameState = 'STORY';
    ui.overlay.style.display = 'none';
    const storyOverlay = document.getElementById('story-overlay');
    if (storyOverlay) storyOverlay.style.display = 'flex';

    const container = document.getElementById('story-scroll-container');
    if (container) {
        container.classList.remove('lang-ja', 'lang-en');
        const lang = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language;
        const isJa = lang && lang.startsWith('ja');
        container.classList.add(isJa ? 'lang-ja' : 'lang-en');
        container.scrollTop = 0;
    }

    if (typeof AudioSys !== 'undefined') AudioSys.playBGM('title');
    if (window.refreshMenuButtons) window.refreshMenuButtons();
}

function closeStory() {
    const storyOverlay = document.getElementById('story-overlay');
    if (storyOverlay) storyOverlay.style.display = 'none';
    returnToTitle();
}

/**
 * HOW TO PLAY 画面の開閉
 */
function showHowTo() {
    gameState = 'HOWTO';
    titleIdleTimer = 0;
    ui.overlay.style.display = 'none';

    const howtoUI = document.getElementById('howto-overlay');
    howtoUI.style.display = 'flex';

    if (window.refreshMenuButtons) window.refreshMenuButtons(true);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            howtoUI.style.opacity = '1';
        });
    });
}

function hideHowTo() {
    gameState = 'HOWTO_CLOSING';
    titleIdleTimer = 0;

    const howtoUI = document.getElementById('howto-overlay');
    howtoUI.style.opacity = '0';

    setTimeout(() => {
        howtoUI.style.display = 'none';
        ui.overlay.style.display = 'flex';
        gameState = 'TITLE';
        if (window.refreshMenuButtons) window.refreshMenuButtons();
    }, 500);
}

/**
 * トレーニングモードの開始と終了
 */
function startTraining() {
    document.getElementById('howto-overlay').style.display = 'none';
    document.getElementById('training-guide').style.display = 'block';

    gameState = 'PLAYING';
    isTrainingMode = true;

    resetGame();

    player.x = worldSize / 2;
    player.y = worldSize / 2;
    player.weaponLevel = 3;
    player.satellites = [];
    for (let i = 0; i < 12; i++) {
        player.satellites.push({
            x: player.x,
            y: player.y,
            angle: (Math.PI * 2 / 12) * i
        });
    }

    ui.pauseBtn.style.display = 'none';
    ui.stage.innerText = "TEST";

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const isConnected = Array.from(gamepads).some(gp => gp !== null);
    ui.controls.style.display = isConnected ? 'none' : 'block';

    if (window.refreshMenuButtons) window.refreshMenuButtons();
}

function returnToTitleFromTraining() {
    isTrainingMode = false;
    document.getElementById('training-guide').style.display = 'none';
    returnToTitle();
}


// =========================================================
// 3. 演出・アニメーション・シーン更新 (Cinematics & VFX Updates)
// =========================================================

/**
 * ステージ開始前のイントロ（ワープアウト）演出の更新
 */
function updateIntro() {
    introTimer++;

    // 背景スクロール制御
    if (introPhase < 3) {
        const minDrift = 2.0;
        if (introBgSpeed > minDrift) introBgSpeed *= 0.96;
        else introBgSpeed = minDrift;
    } else {
        introBgSpeed *= 0.92;
    }
    introBgScroll += introBgSpeed * gameSpeed;

    if (isSkippingStory && introPhase < 3) {
        skipToPlaying();
        return;
    }

    // --- Phase 1: タイトル表示 ---
    if (introPhase === 1) {
        if (introTimer === 60) {
            const skipContainer = document.getElementById('story-typing-container');
            if (skipContainer) {
                skipContainer.style.display = 'flex';
                requestAnimationFrame(() => { skipContainer.style.opacity = '1'; });
            }
        }
        if (introTimer > 180) {
            introPhase = 2; introTimer = 0;
            ui.msg.style.transition = "opacity 1.0s ease-in"; ui.msg.style.opacity = "0";
            const storyText = STAGE_STORY_TEXTS[stage];
            if (storyText) setTimeout(() => { playStoryTyping(storyText); }, 500);
            else isSkippingStory = true;
        }
    }
    // --- Phase 2: ストーリータイピング ---
    else if (introPhase === 2) {
        const el = document.getElementById('story-typing-msg');
        if (el.style.display === 'none' && introTimer > 60) {
            introPhase = 3; introTimer = 0;
            player.visualYOffset = 700;
            player.visualScale = 0;

            const hud = document.querySelector('.hud-row');
            if (hud) { hud.style.display = 'flex'; hud.style.opacity = '0'; }
            const miniMapContainer = document.getElementById('minimap-container');
            if (miniMapContainer) { miniMapContainer.style.display = 'block'; miniMapContainer.style.opacity = '0'; }
        }
    }
    // --- Phase 3: 自機出現 (ワープイン) ---
    else if (introPhase === 3) {
        const APPEAR_START_TIME = 1;
        const ARRIVE_TIME = 90;
        const WARP_DURATION = 140;

        player.angle = -Math.PI / 2;

        if (introTimer <= ARRIVE_TIME) {
            const t = (introTimer - APPEAR_START_TIME) / (ARRIVE_TIME - APPEAR_START_TIME);
            const ease = 1 - Math.pow(1 - t, 4);
            player.visualYOffset = 700 * (1 - ease) - (Math.sin(t * Math.PI) * 20);
            player.visualScale = 0.5 + (ease * 0.7);
            introBgSpeed = 25 * Math.pow(1 - t, 3);
        } else {
            player.visualYOffset *= 0.92;
            player.visualScale += (1.0 - player.visualScale) * 0.15;
            introBgSpeed *= 0.9;
        }

        const currentVisualY = player.y + player.visualYOffset;

        // カメラ制御（目的地で固定して待ち構える）
        const viewW = width / cameraScale;
        const viewH = height / cameraScale;
        camera.x = player.x - viewW / 2;
        camera.y = player.y - viewH * CAMERA_Y_OFFSET;

        // UIフェードイン
        introAlpha = Math.min(1.0, introTimer / 40);
        const updateUIAlpha = (id, display) => {
            const el = document.getElementById(id) || document.querySelector(id);
            if (el) {
                if (introAlpha <= 0) {
                    el.style.display = 'none';
                    el.style.opacity = '0';
                } else {
                    el.style.display = display;
                    el.style.opacity = introAlpha;
                }
            }
        };

        updateUIAlpha('.hud-row', 'flex');
        updateUIAlpha('minimap-container', 'block');

        const isPad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(gp => gp !== null);
        if (!isPad) {
            updateUIAlpha('controls', 'block');
            updateUIAlpha('joystick-container', 'block');
            updateUIAlpha('launch-btn', 'flex');
        } else {
            const ctrl = document.getElementById('controls');
            if (ctrl) ctrl.style.display = 'none';
        }
        updateUIAlpha('pause-btn', isPad ? 'none' : 'flex');

        // エフェクト（彗星の尾）
        const safeVY = (player.visualYOffset !== undefined) ? player.visualYOffset : 700;
        if (introTimer > 5 && introTimer <= ARRIVE_TIME && player.visualScale > 0.1) {
            if (safeVY > 10) {
                for (let i = 0; i < 5; i++) {
                    const tailOffset = 40 * player.visualScale;
                    const spreadX = 12 * player.visualScale;
                    particles.push({
                        x: player.x + (Math.random() - 0.5) * spreadX,
                        y: currentVisualY + tailOffset,
                        vx: (Math.random() - 0.5) * 2,
                        vy: 8 + Math.random() * 5,
                        color: (Math.random() > 0.3) ? '#0f8' : '#fff',
                        life: 0.5,
                        size: 2 + Math.random() * 2
                    });
                }
            }
        }

        // 多段爆発エフェクト
        if (introTimer === 30 || introTimer === 38 || introTimer === 46) {
            if (introTimer === 30) {
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('warp_in');
                if (typeof distortGrid === 'function') distortGrid(player.x, currentVisualY, -100, 200);
                particles.push({
                    x: player.x, y: currentVisualY, vx: 0, vy: 0,
                    color: '#fff', life: 0.2, size: 150, isBubble: true
                });
            }

            const spread = (introTimer === 30) ? 60 : (introTimer === 38) ? 40 : 20;
            for (let i = 0; i < 20; i++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = 5 + Math.random() * 10;
                particles.push({
                    x: player.x + (Math.random() - 0.5) * spread,
                    y: currentVisualY + (Math.random() - 0.5) * spread,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 3,
                    color: Math.random() > 0.5 ? '#fff' : '#0ff',
                    life: 0.6 + Math.random() * 0.4, size: 2 + Math.random() * 2
                });
            }
        }

        if (introTimer > WARP_DURATION) {
            gameState = 'PLAYING';
            introPhase = 0;
            player.visualScale = 1.0;
            player.visualYOffset = 0;
            introBgSpeed = 0;
            spawnWaitTimer = 60;
        }
    }
}

/**
 * イントロ専用の描画レイヤー
 */
function drawIntro() {
    ctx.save();
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-camera.x, -camera.y);

    if (typeof drawBackground === 'function') drawBackground();
    if (typeof drawVisualEffects === 'function') drawVisualEffects();

    if (introPhase === 3) {
        ctx.save();
        ctx.globalAlpha = introAlpha;
        if (typeof drawWorldBounds === 'function') drawWorldBounds();
        if (typeof drawEnemies === 'function') drawEnemies();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 1.0;
        if (typeof drawWormholes === 'function') drawWormholes();
        if (typeof drawLasers === 'function') drawLasers();
        if (typeof drawPlayerBullets === 'function') drawPlayerBullets();
        if (typeof drawItems === 'function') drawItems();
        if (typeof drawPlayerSystems === 'function') drawPlayerSystems();
        ctx.restore();

        if (frame % 3 === 0 && typeof drawMiniMap === 'function') drawMiniMap();
    }

    ctx.restore();
}

/**
 * ストーリータイピング処理
 */
async function playStoryTyping(text, options = {}) {
    const container = document.getElementById('story-typing-container');
    const el = document.getElementById('story-typing-msg');
    if (!container || !el) return 'missing';

    const {
        keepVisibleAfterTyping = false,
        waitAfterTypingMs = 6000,
        autoScroll = false
    } = options;

    isSkippingStory = false;

    container.style.display = 'flex';
    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.transition = 'none';
    el.innerHTML = '';
    el.scrollTop = 0;

    // ビジュアル設定
    let typeColor = '#eee';
    let shadowColor = '#eee';
    if (text.includes('アキシオム') || text.includes('幾何学')) shadowColor = '#0ff';
    else if (text.includes('フェニックス') || text.includes('生命')) shadowColor = '#0f8';

    el.style.color = typeColor;
    el.style.textShadow = `0 0 8px ${shadowColor}`;

    const lines = text.split('\n');
    const cursor = document.createElement('span');
    cursor.className = 'cursor-blink';
    cursor.textContent = '_';

    const shouldAutoScroll = autoScroll || container.classList.contains('ending-mode');

    for (let lineText of lines) {
        if (isSkippingStory) break;

        const lineDiv = document.createElement('div');
        lineDiv.style.minHeight = '1.6em';
        lineDiv.style.marginBottom = '0.4em';
        el.appendChild(lineDiv);
        lineDiv.appendChild(cursor);

        if (shouldAutoScroll) el.scrollTop = el.scrollHeight;

        for (let char of lineText) {
            if (isSkippingStory) break;

            cursor.before(char);

            if (autoScroll) el.scrollTop = el.scrollHeight;

            let delay = 40;
            if (/[。、，,\.]/.test(char)) delay = 300;
            else if (/[!?！？]/.test(char)) delay = 400;
            else if (char === ' ') delay = 20;

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (isSkippingStory) break;

        if (lineText.trim() !== '') {
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }

    cursor.remove();

    if (isSkippingStory) {
        el.style.display = 'none';
        container.style.display = 'none';
        el.innerHTML = '';
        return 'skipped';
    }

    if (waitAfterTypingMs > 0) {
        await new Promise(r => setTimeout(r, waitAfterTypingMs));
    }

  if (keepVisibleAfterTyping) {
    return 'completed';
}

    el.style.transition = 'opacity 0.6s ease-out';
    el.style.opacity = '0';
    await new Promise(r => setTimeout(r, 600));
    el.style.display = 'none';
    container.style.display = 'none';
    el.innerHTML = '';
    return 'completed';
}

/**
 * ストーリーテキストを外部からスキップする
 */
window.skipStory = function () {
    if (gameState === 'STAGE_INTRO' && introPhase === 1 && introTimer < 60) return;

    if (isSkippingStory) return;
    isSkippingStory = true;
    isSkipComplete = false;

    const container = document.getElementById('story-typing-container');
    const msgEl = ui.msg;
    const typingMsg = document.getElementById('story-typing-msg');

    const fadeStyle = "opacity 1.0s ease-out";
    if (container) { container.style.transition = fadeStyle; container.style.opacity = "0"; }
    if (msgEl) { msgEl.style.transition = fadeStyle; msgEl.style.opacity = "0"; }
    if (typingMsg) { typingMsg.style.transition = fadeStyle; typingMsg.style.opacity = "0"; }

    setTimeout(() => {
        isSkipComplete = true;
        if (container) {
            container.style.display = 'none';
            container.classList.remove('ending-mode');
        }
        if (typingMsg) {
            typingMsg.style.display = 'none';
            typingMsg.innerHTML = '';
            typingMsg.scrollTop = 0;
        }

        if (gameState === 'ENDING_STORY') {
            showGameOver();
        }
    }, 1000);
};

/**
 * イントロを強制スキップしてゲームプレイへ移行
 */
function skipToPlaying() {
    ui.msg.style.display = 'none';
    ui.msg.style.opacity = '0';
    const storyTypingContainer = document.getElementById('story-typing-container');
    if (storyTypingContainer) storyTypingContainer.style.display = 'none';

    introPhase = 3;
    introTimer = 0;
    introAlpha = 0;
    isSkippingStory = false;

    player.visualYOffset = 700;
    player.visualScale = 0;
}

/**
 * プレイヤー死亡演出の更新
 */
function updateDying() {
    dyingTimer--;

    if (dyingTimer === 135) {
        ui.msg.style.opacity = "0";
    }
    if (dyingTimer === 120) {
        showMessage("GAME OVER", 'red');
        ui.msg.style.fontSize = "calc(32px * var(--ui-scale, 1))";
    }

    if (dyingTimer === 20) {
        ui.msg.style.opacity = "0";
    }

    if (gameSpeed < 1.0) {
        gameSpeed += 0.005;
    }

    // カメラスピン演出
    camera.x += (Math.random() - 0.5) * 10 * gameSpeed;
    camera.y += (Math.random() - 0.5) * 10 * gameSpeed;

    if (typeof updateGrid === 'function') updateGrid();
    if (typeof updateParticlesAndRings === 'function') updateParticlesAndRings();
    if (typeof updateEnemyBullets === 'function') updateEnemyBullets();
    if (typeof updateEnemiesForDying === 'function') updateEnemiesForDying();
    if (typeof updateScorePopups === 'function') updateScorePopups();
    if (typeof updateCrystals === 'function') updateCrystals();

    if (dyingTimer <= 0) {
        gameSpeed = 1.0;
        ui.msg.style.display = 'none';
        showGameOver();
    }
}

/**
 * ステージクリア後のワープ演出（次のステージへの離脱）
 */
function updateWarpProcess() {
    bullets = []; lasers = []; missiles = []; player.history = [];

    if (player.warpTimer === undefined) player.warpTimer = 0;
    player.warpTimer++;

    player.angle = -Math.PI / 2; // 上向き固定

    // 加速ロジック
    if (player.vy === 0 || player.vy > -0.5) player.vy = -0.5;
    player.vy *= 1.08;

    // 背景速度
    introBgSpeed = Math.abs(player.vy) * 0.5;
    introBgScroll += introBgSpeed * gameSpeed;

    // 効果音演出
    if (player.warpTimer < 60 && player.warpTimer % 15 === 0) {
        if (typeof AudioSys !== 'undefined') AudioSys.playSE('select');
    }
    if (player.vy < -5.0 && !player.warpSoundPlayed) {
        if (typeof AudioSys !== 'undefined') AudioSys.playSE('warp');
        player.warpSoundPlayed = true;
    }

    // 速度制限と位置更新
    if (player.vy < -100) player.vy = -100;
    player.y += player.vy;
    player.vx *= 0.9;
    player.x += player.vx;

    // サテライト追従
    player.satellites.forEach((s, i) => {
        s.angle = (s.angle || 0) + 0.15;
        const rad = 45 * G_SCALE;
        const off = (Math.PI * 2 / player.satellites.length) * i;
        s.x = player.x + Math.cos(s.angle + off) * rad;
        s.y = player.y + Math.sin(s.angle + off) * rad;
    });

    // 彗星の尾エフェクト
    const tailCount = Math.min(15, Math.floor(Math.abs(player.vy) / 2));
    for (let i = 0; i < tailCount; i++) {
        particles.push({
            x: player.x + (Math.random() - 0.5) * 12,
            y: player.y + 5,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.abs(player.vy) * 0.4,
            color: (Math.random() > 0.3) ? '#0f8' : '#fff',
            life: 0.5, size: 1 + Math.random() * 3
        });
    }

    // アイテム回収処理
    const checkWarpPickup = (list, isPowerup) => {
        for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            if (item.life <= 0) continue;
            const dx = Math.abs(item.x - player.x);
            const dy = Math.abs(item.y - player.y);
            const hitRangeY = Math.abs(player.vy) + 50;
            if (dx < 80 && dy < hitRangeY) {
                item.life = 0;
                if (!isPowerup) {
                    if (player.satellites.length < 12) {
                        player.satellites.push({ x: player.x, y: player.y, angle: Math.random() * Math.PI * 2 });
                    }
                    if (typeof createExplosion === 'function') createExplosion(item.x, item.y, '#0f0', 5);
                } else {
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('powerup');
                    if (item.type === 'shield') {
                        player.shield = Math.min(PLAYER_BASE_SHIELD, player.shield + 10);
                        ui.shieldBar.style.width = Math.max(0, player.shield) + "%";
                    } else if (item.type === 'level') {
                        player.weaponLevel = Math.min(MAX_WEAPON_LEVEL, player.weaponLevel + 1);
                    }
                    if (typeof createExplosion === 'function') createExplosion(item.x, item.y, '#fff', 8);
                }
            }
        }
    };
    checkWarpPickup(crystals, false);
    checkWarpPickup(powerups, true);

    updateCamera();
    if (typeof updateParticlesAndRings === 'function') updateParticlesAndRings();
    if (typeof updateGrid === 'function') updateGrid();
    if (typeof updateScorePopups === 'function') updateScorePopups();

    // =========================================================
    // ★大修正：機体が画面外に出た瞬間の処理
    // =========================================================
    if (player.y < camera.y - 50) {
        player.visualScale *= 0.85;
        crystals.forEach(c => c.life = 0);
        powerups.forEach(p => p.life = 0);
        scorePopups.forEach(s => s.life = 0);
        enemyBullets.forEach(eb => eb.life = 0);

        // 画面から消えた瞬間に、1度だけフェードアウト開始の命令を出す
        if (!player.hasExitedScreen) {
            player.hasExitedScreen = true;
            player.exitTimer = 0; // フェードアウト用の新しいタイマー

            // スコアパネルやミニマップなどのUI要素を、CSSで1秒かけて透明にする
            const uiElements = [
                document.querySelector('.hud-row'),
                document.getElementById('minimap-container'),
                document.getElementById('controls')
            ];
            uiElements.forEach(el => {
                if (el) {
                    el.style.transition = 'opacity 1.0s ease-out';
                    el.style.opacity = '0';
                }
            });
        }
    }

    // 画面外に出てからのカウントダウン（フェードアウト進行中）
    if (player.hasExitedScreen) {
        player.exitTimer++;

        // 1秒のフェードアウト完了後、少し余韻を持たせて（80フレーム目）次へ遷移
        if (player.exitTimer > 80) {
            if (introPhase === 0) {
                ui.msg.style.display = 'none';
                isWarpingOut = false;
                player.warpTimer = 0;
                player.warpSoundPlayed = false;
                player.hasExitedScreen = false;
                player.exitTimer = 0;
                if (typeof clearInputState === 'function') clearInputState();

                // 次のシーンへ行く前にUIの透明度設定をリセット（通常ステージ移行時のため）
                const uiElements = [
                    document.querySelector('.hud-row'),
                    document.getElementById('minimap-container'),
                    document.getElementById('controls')
                ];
                uiElements.forEach(el => {
                    if (el) {
                        el.style.transition = '';
                        el.style.opacity = '';
                    }
                });

                // エンディング or 次のステージへ
                if (stage === MAX_STAGE) {
                    if (typeof initNebulae === 'function') initNebulae('#00ccff');
                    startEndingSequence();
                } else {
                    player.x = worldSize / 2;
                    player.y = worldSize / 2;
                    player.vx = 0; player.vy = 0;
                    player.visualScale = 0;
                    stage++;
                    ui.stage.innerText = stage;

                    const viewW = width / cameraScale;
                    const viewH = height / cameraScale;
                    camera.x = player.x - viewW / 2;
                    camera.y = player.y - viewH * CAMERA_Y_OFFSET;

                    startStage();
                    if (typeof initNebulae === 'function') initNebulae();
                }
            }
        }
    }
}

/**
 * エンディングシーケンスの開始
 */
async function startEndingSequence() {
    // 1. 真っ暗な状態(ENDING)に移行し、タイマーリセット
    gameState = 'ENDING';
    introTimer = 0;

    introBgScroll = 0;
    introBgSpeed = 2;

    // UIを隠す
    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'none';
    if (ui.controls) ui.controls.style.display = 'none';
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';

    // 真っ黒になった瞬間からエンディングBGMを開始
    if (typeof AudioSys !== 'undefined') {
        AudioSys.playBGM('ending');

        // 念のためここでもループを切る
        if (AudioSys.bgmEl) {
            AudioSys.bgmEl.loop = false;
        }
    }

    // 余韻用の暗転
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 2. 星空と文字をフェードイン
    gameState = 'ENDING_STORY';
    introTimer = 0;

    isSkippingStory = false;
    isSkipComplete = false;

    const container = document.getElementById('story-typing-container');
    const typingMsg = document.getElementById('story-typing-msg');
    const skipBtn = document.getElementById('skip-button');

    if (container) {
        container.classList.add('ending-mode');
        container.style.display = 'flex';
        container.style.opacity = '0';
        container.style.transition = 'opacity 2.0s ease-in';
        setTimeout(() => { container.style.opacity = '1'; }, 50);
    }

    if (typingMsg) {
        typingMsg.style.display = 'block';
        typingMsg.style.opacity = '1';
        typingMsg.style.color = '#fff';
        typingMsg.style.transition = 'none';
        typingMsg.scrollTop = 0;
    }

    if (skipBtn) {
        skipBtn.innerText = 'SKIP';
        skipBtn.style.animation = 'none';
        skipBtn.classList.remove('ending-next');
    }

    const typingResult = await playStoryTyping(ENDING_STORY_TEXT, {
        keepVisibleAfterTyping: true,
        waitAfterTypingMs: 0,
        autoScroll: true
    });

    if (typingResult !== 'completed' || gameState !== 'ENDING_STORY' || isSkipComplete) return;

    if (skipBtn) {
        skipBtn.innerText = 'NEXT >>';
        skipBtn.style.animation = 'blink-anim 1.2s infinite';
        skipBtn.classList.add('ending-next');
    }

    const bgmEl = (typeof AudioSys !== 'undefined') ? AudioSys.bgmEl : null;

    const advanceToResult = () => {
        if (gameState !== 'ENDING_STORY' || isSkipComplete) return;
        isSkipComplete = true;

        if (bgmEl) {
            bgmEl.removeEventListener('ended', advanceToResult);
        }

        showGameOver();
    };

    if (!bgmEl) {
        advanceToResult();
        return;
    }

    // 念のためエンディングBGMはループ禁止
    bgmEl.loop = false;

    // すでに終了済みなら即遷移
    if (bgmEl.ended) {
        advanceToResult();
        return;
    }

    // paused でも ended ではないなら再生失敗の可能性があるので即遷移しない
    // ended のみで判定する
    bgmEl.removeEventListener('ended', advanceToResult);
    bgmEl.addEventListener('ended', advanceToResult, { once: true });
}

/**
 * ボス出現時の警告演出を発火
 */
function triggerBossEncounter() {
    if (isTrainingMode) return;

    if (isBossWarning) return;

    isBossWarning = true;
    if (typeof AudioSys !== 'undefined') AudioSys.playSE('warning');

    const centerX = worldSize / 2;
    const centerY = worldSize / 2;
    const dx = centerX - player.x;
    const dy = centerY - player.y;
    const distToCenter = Math.hypot(dx, dy) || 1;

    // プレイヤーから中央側に少し寄った位置に出現
    const spawnDist = 300;
    let tx = player.x + (dx / distToCenter) * spawnDist;
    let ty = player.y + (dy / distToCenter) * spawnDist;

    const margin = 300;
    nextBossSpawnX = Math.max(margin, Math.min(worldSize - margin, tx));
    nextBossSpawnY = Math.max(margin, Math.min(worldSize - margin, ty));

    gameSpeed = 1;
    warningTimer = 180;
}


// =========================================================
// 4. システム・UI更新ロジック (System & UI Updates)
// =========================================================

/**
 * 画面中央のメッセージ表示
 */
function showMessage(textHTML, colorType = 'default') {
    if (msgHideTimeout) {
        clearTimeout(msgHideTimeout);
        msgHideTimeout = null;
    }

    ui.msg.innerHTML = textHTML;
    ui.msg.style.display = 'block';
    ui.msg.style.transition = 'none';
    ui.msg.style.opacity = '0';
    ui.msg.style.transform = `scale(${globalUiScale})`;

    const baseSize = (window.innerWidth > window.innerHeight) ? 20 : 28;
    ui.msg.style.fontSize = `calc(${baseSize}px * var(--ui-scale, 1))`;

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

    setTimeout(() => {
        ui.msg.style.transition = "opacity 0.2s ease-out";
        ui.msg.style.opacity = "1";
    }, 50);
}

/**
 * ボス警告テキストと画面メッセージのフェード処理更新
 */
function updateMessageAndBossWarning() {
    if (stageMessageTimer > 0) {
        stageMessageTimer--;
        if (stageMessageTimer === 0 && !isBossWarning) {
            ui.msg.style.transition = "opacity 0.3s ease-in";
            requestAnimationFrame(() => { ui.msg.style.opacity = "0"; });
            if (msgHideTimeout) clearTimeout(msgHideTimeout);
            msgHideTimeout = setTimeout(() => {
                if (stageMessageTimer === 0 && !isBossWarning) ui.msg.style.display = 'none';
                msgHideTimeout = null;
            }, 300);
        }
    }
    if (isBossWarning) {
        warningTimer--;
        if (warningTimer <= 0) {
            isBossWarning = false;
            gameSpeed = 1.0;
            if (stage !== 9 && stage !== 10) {
                wormholes.unshift({ x: nextBossSpawnX, y: nextBossSpawnY, life: 300, maxLife: 300, active: true });
                if (typeof spawnEnemy === 'function') spawnEnemy(nextBossSpawnX, nextBossSpawnY, 'boss');
                if (typeof distortGrid === 'function') distortGrid(nextBossSpawnX, nextBossSpawnY, 250, 400);
            }
        }
    }
}

/**
 * グローバル状態 (ゲームスピード回復やボス発狂等) の更新
 */
function handleGlobalStateUpdates() {
    if (gameState === 'PLAYING' && !isBossWarning) {
        if (!(isStageClear && stage === MAX_STAGE) && gameSpeed < 1.0) {
            gameSpeed += 0.005;
            if (gameSpeed > 1.0) gameSpeed = 1.0;
        }
    }
    frame++;

    bossAngerMinionSpeedMag = 1.0;
    const currentBoss = enemies.find(e => e.type === 'boss' || e.type === 'battleship');
    if (currentBoss && currentBoss.aliveTimer > 1800) {
        // 長時間生存による発狂化
        bossAngerMinionSpeedMag = Math.min(3.0, 1.0 + (currentBoss.aliveTimer - 1800) * 0.0005);
        if (frame % 60 < 30) {
            ui.warn.innerText = "CRITICAL: ENEMY ACCELERATING";
            ui.warn.style.display = 'block';
            ui.warn.style.color = '#f00';
        }
    } else if (!isBossWarning) {
        ui.warn.style.display = 'none';
    }

    if (stage === 10 && gameState === 'PLAYING') {
        stage10Timer++;
        const PSEUDO_BEAT_INTERVAL = 110;
        if (stage10BeatCount < 5 && stage10Timer % PSEUDO_BEAT_INTERVAL === 20) {
            const boss = enemies.find(e => e.type === 'battleship');
            if (typeof distortGrid === 'function') distortGrid(boss ? boss.x : worldSize / 2, boss ? boss.y : worldSize / 2, 250, 500);
            stage10BeatCount++;
        }
    }
}

/**
 * カメラの追従計算とズーム制御
 */
function updateCamera() {
    let targetScale = 1.0;
    let focusX = player.x;
    let focusY = player.y;

    const boss = enemies.find(e => e.type === 'boss' || e.type === 'battleship');

    if (boss && Number.isFinite(boss.x) && Number.isFinite(boss.y)) {
        const smoothMax = (boss.spawnMax || 100) + 20;
        if (boss.cameraLerpTimer === undefined) boss.cameraLerpTimer = 0;

        if (boss.cameraLerpTimer < smoothMax) {
            boss.cameraLerpTimer++;
        }

        const t = boss.cameraLerpTimer / smoothMax;
        const camT = 1 - Math.pow(1 - t, 4);

        const dist = Math.hypot(player.x - boss.x, player.y - boss.y) || 0.1;
        const maxDist = 1500;
        const ratio = Math.min(dist / maxDist, 1.0);

        targetScale = 1.0 - (ratio * 0.35 * camT);

        const bias = ratio * 0.25 * camT;
        focusX = player.x + (boss.x - player.x) * bias;
        focusY = player.y + (boss.y - player.y) * bias;
    }

    const finalTargetScale = targetScale * baseAppScale;
    cameraScale += (finalTargetScale - cameraScale) * 0.05 * gameSpeed;

    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    let tx = focusX - viewW / 2;
    let ty = focusY - viewH * CAMERA_Y_OFFSET;

    // ワールド端のクランプ
    let padX = 150 / baseAppScale;
    let padY = 125 / baseAppScale;
    if (height > width) { padX = 0; } else { padY = 0; }

    const limitMinX = -padX;
    const limitMaxX = worldSize - viewW + padX;
    if (limitMinX <= limitMaxX) {
        tx = Math.max(limitMinX, Math.min(limitMaxX, tx));
    } else {
        tx = (worldSize - viewW) / 2;
    }

    const limitMinY = -padY;
    const limitMaxY = worldSize - viewH + padY;
    if (limitMinY <= limitMaxY) {
        ty = Math.max(limitMinY, Math.min(limitMaxY, ty));
    } else {
        ty = (worldSize - viewH) / 2;
    }

    camera.x += (tx - camera.x) * 0.1 * gameSpeed;
    camera.y += (ty - camera.y) * 0.1 * gameSpeed;
}

/**
 * タイトル放置判定のリセット判定
 */
function resetTitleIdle() {
    if (gameState === 'TITLE') {
        return false;
    } else if (gameState === 'HOWTO') {
        return true;
    }
    return false;
}

/**
 * トレーニングモードの更新
 */
function updateTraining() {
    spawnedCount = 9999;
    enemiesToSpawn = 0;
    isBossWarning = false;
    warningTimer = 0;
    wormholes = [];
    if (player.satellites.length < 12) {
        player.satellites.push({ x: player.x, y: player.y, angle: Math.random() * Math.PI * 2 });
    }

}
