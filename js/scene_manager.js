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
    const requestedMode = (typeof queuedGameMode !== 'undefined' && queuedGameMode)
        ? queuedGameMode
        : GAME_MODES.NORMAL;
    const isExtremeMode = requestedMode === GAME_MODES.EXTREME_TIME_ATTACK;

    if (typeof setCurrentGameMode === 'function') {
        setCurrentGameMode(requestedMode);
    }
    if (typeof queueGameModeStart === 'function') {
        queueGameModeStart(GAME_MODES.NORMAL);
    }
    if (typeof isExtremeTimeAttackMode === 'function' && isExtremeTimeAttackMode()) {
        if (typeof initExtremeTimeAttackState === 'function') initExtremeTimeAttackState();
    } else {
        if (typeof resetExtremeTimeAttackState === 'function') resetExtremeTimeAttackState();
    }

    // 1. タイトルUIのフェードアウト（クリック防止とフォーカス維持）
    ui.titleOverlay.style.transition = 'opacity 0.2s';
    ui.titleOverlay.style.opacity = '0';
    ui.titleOverlay.style.pointerEvents = 'none';

    canvas.setAttribute('tabindex', '0'); // キャンバスがフォーカスを受け取れるようにする
    canvas.focus();
    setTimeout(() => canvas.focus(), 10);
    setTimeout(() => canvas.focus(), 100);

    setTimeout(() => {
        ui.titleOverlay.style.display = 'none';
        // 次回表示時のためにスタイルを裏でリセット
        ui.titleOverlay.style.transition = '';
        ui.titleOverlay.style.opacity = '1';
        ui.titleOverlay.style.pointerEvents = 'auto';
    }, 500);

    ui.ostOverlay.style.display = 'none';

    // 2. グローバル変数の初期化
    score = 0;
    stage = isExtremeMode ? 8 : START_STAGE;
    frame = 0;
    currentStage = stage;

    // 3. プレイヤー状態のリセット
    player.x = worldSize / 2;
    player.y = worldSize / 2;
    player.vx = 0;
    player.vy = 0;
    player.shield = PLAYER_BASE_SHIELD;
    player.weaponLevel = isExtremeMode ? MAX_WEAPON_LEVEL : DEFAULT_WEAPON_LEVEL;
    player.satellites = [];
    player.invuln = 0;
    player.laserTimer = 0;
    player.overdriveTimer = 0;
  
    player.history = [];
    player.homingLaserTick = 0;
    player.hasExitedScreen = false;
    player.exitTimer = 0;
    player.warpTimer = 0;
    player.warpSoundPlayed = false;
    isWarpingOut = false; // グローバル変数の初期化も確実に行う
    gameSpeed = 1.0;    // スロー演出のリセット

    // 4. 入力・カメラ・UIのリセット
    if (typeof clearInputState === 'function') clearInputState();

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const isConnected = Array.from(gamepads).some(gp => gp !== null);
    ui.controls.style.display = isConnected ? 'none' : 'block';

    cameraScale = baseAppScale;
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
    ui.pauseBtn.style.display = 'flex';

    // ★追加：成績のリセットとタイム計測開始
    if (typeof playStats !== 'undefined') {
        playStats.startTime = performance.now();
        playStats.endTime = 0;
        playStats.enemiesSpawned = 0;
        playStats.enemiesKilled = 0;
        playStats.itemsSpawned = 0;
        playStats.itemsCollected = 0;
    }

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
    //hideGameMessage(true); 
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';

    const stageBoard = document.getElementById('stage-result-board');
    if (stageBoard) {
        stageBoard.style.display = 'none';
        stageBoard.style.opacity = '0';
    }

    // 2. ゲーム内変数のリセット
    spawnedCount = 0;
    enemiesKilled = 0;
    
    window.enemiesEscaped = 0;  // ワープアウト（逃亡）した敵の数をリセット

    isStageClear = false;
    isBossSpawned = false;
    isBossWarning = false;
    warningTimer = 0;
    levelItemsDroppedInStage = 0;
    player.hasExitedScreen = false;
    player.exitTimer = 0;
    player.warpTimer = 0;
    player.warpSoundPlayed = false;
    isWarpingOut = false; // グローバル変数の初期化も確実に行う

// ==========================================
    // ステージごとの成績リセットと、過去ステージの合算
    // ==========================================
    const _isXTA = typeof isExtremeTimeAttackMode === 'function' && isExtremeTimeAttackMode();
    if (stage === 1 || typeof window.pastPlayStats === 'undefined' || _isXTA) {
        // 最初から遊ぶ時・XTAモードは毎回合計データをゼロにする
        window.pastPlayStats = {
            totalTime: 0,
            enemiesSpawned: 0,
            enemiesKilled: 0,
            items: {
                level: { spawned: 0, collected: 0 },
                laser: { spawned: 0, collected: 0 },
                shield: { spawned: 0, collected: 0 },
                invincible: { spawned: 0, collected: 0 },
                point: { spawned: 0, collected: 0 }, // ★ここに追加！
                crystal: { spawned: 0, collected: 0 }
            }
        };
    } else if (typeof window.playStats !== 'undefined') {
        // ステージ2以降に進んだ時、クリアした直前のステージ成績を過去分に加算する
        const endTime = window.playStats.endTime || performance.now();
        window.pastPlayStats.totalTime += (endTime - window.playStats.startTime);
        window.pastPlayStats.enemiesSpawned += window.playStats.enemiesSpawned;
        window.pastPlayStats.enemiesKilled += window.playStats.enemiesKilled;
        
        // ★配列に 'point' を追加して、全ステージ総合の合算にも対応させる
        ['level', 'laser', 'shield', 'invincible', 'point', 'crystal'].forEach(type => {
            window.pastPlayStats.items[type].spawned += window.playStats.items[type].spawned;
            window.pastPlayStats.items[type].collected += window.playStats.items[type].collected;
        });
    }

    // 現在のステージ用のデータをリセット
    window.playStats = {
        startTime: performance.now(),
        endTime: 0,
        enemiesSpawned: 0,
        enemiesKilled: 0,
        items: {
            level: { spawned: 0, collected: 0 },
            laser: { spawned: 0, collected: 0 },
            shield: { spawned: 0, collected: 0 },
            invincible: { spawned: 0, collected: 0 },
            point: { spawned: 0, collected: 0 }, // ★ここに追加！
            crystal: { spawned: 0, collected: 0 }
        }
    };
    // ==========================================

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
    playerBulletPool.clearAll(); lasers = []; 
    enemyPool.clearAll();
    enemyBulletPool.clearAll();
    homingLasers = []; wormholes = []; 
    scorePopupPool.clearAll();

    ringPool.clearAll();
    particlePool.clearAll();

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
        const isExtremeMode = (typeof isExtremeTimeAttackMode === 'function') && isExtremeTimeAttackMode();

        if (isExtremeMode) {
            // Time Attackは導入演出をスキップして即プレイ開始
            gameState = 'PLAYING';
            hideGameMessage(true);
            if (typeof resetStoryTypingState === 'function') resetStoryTypingState();
            introPhase = 0;
            introTimer = 0;
            introAlpha = 0;
            introBgScroll = 0;

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
        } else {
            // --- A. ストーリーモード（イントロ演出開始） ---
            gameState = 'STAGE_INTRO';
            introPhase = 1;
            introTimer = 0;
            introAlpha = 0;
            introBgScroll = 0;
        }

        const skipContainer = document.getElementById('story-typing-container');
        if (skipContainer) {
            skipContainer.style.display = 'none';
            skipContainer.style.opacity = '0';
            skipContainer.style.transition = 'opacity 0.5s';
        }

        
        // BGM制御
        if (typeof AudioSys !== 'undefined') {
            if (stage === MAX_STAGE) AudioSys.playBGM('last');
            else if (stage === MAX_STAGE - 1) AudioSys.playBGM('boss');
            else {
                const bgmIndex = (stage - 1) % BGM_FILES.stages.length;
                AudioSys.playBGM('stage', bgmIndex);
            }
        }

        // ステージタイトルの多言語対応構築
        const data = STAGE_TITLES[stage] || { en: "UNKNOWN SECTOR", ja: "未知の宙域" };
        
        // ★修正：ブラウザ言語判定から、設定した currentLanguage に変更
        const isJa = currentLanguage === 'ja';

        // ステージテーマカラー
        const themeHex = STAGE_THEMES[stage] || '#00bbff';
        const textBodyColor = lightenHex ? lightenHex(themeHex, 70) : '#ffffff';
        const glowColor = themeHex;

        // 表示
        if (!isExtremeMode) {
            showGameMessage({
                kicker: `STAGE ${stage}`,
                main: data.en,
                sub: isJa ? data.ja : "",
                textColor: textBodyColor,
                glowColor: glowColor
            });
        } else {
            showGameMessage({
                kicker: 'TIME ATTACK',
                main: 'HOSTILE GRID SATURATION',
                sub: isJa ? '全敵種混成宙域' : 'ALL HOSTILE TYPES INBOUND',
                textColor: textBodyColor,
                glowColor: glowColor,
                duration: 1400
            });
        }

        // ノルマと初期ワームホールの配置
        if (typeof isExtremeTimeAttackMode === 'function' && isExtremeTimeAttackMode()) {
            enemiesToSpawn = 999999;
            const whCount = 3;
            for (let i = 0; i < whCount; i++) {
                if (typeof spawnWormhole === 'function') spawnWormhole();
            }
        } else if (stage === 9 || stage === 10) {
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

    playerBulletPool.clearAll(); lasers = []; 
    enemyPool.clearAll();
    enemyBulletPool.clearAll();
    particlePool.clearAll();
    ringPool.clearAll();
    crystalPool.clearAll();
    crystals = []; homingLasers = []; powerups = [];
    wormholes = []; 
    scorePopupPool.clearAll();


    player.x = worldSize / 2; player.y = worldSize / 2;
    player.vx = 0; player.vy = 0;
    player.shield = PLAYER_BASE_SHIELD;
    player.weaponLevel = (typeof isExtremeTimeAttackMode === 'function' && isExtremeTimeAttackMode())
        ? MAX_WEAPON_LEVEL
        : DEFAULT_WEAPON_LEVEL;
    player.invuln = 0; player.laserTimer = 0; player.overdriveTimer = 0;
    player.satellites = [];
    player.history = [];
    gameSpeed = 1.0;

    if (typeof clearInputState === 'function') clearInputState();

    cameraScale = baseAppScale;
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
    //hideGameMessage(true); 

    ui.pauseBtn.style.display = 'flex';
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';

    if (typeof isExtremeTimeAttackMode === 'function' && isExtremeTimeAttackMode()) {
        if (typeof initExtremeTimeAttackState === 'function') initExtremeTimeAttackState();
    } else {
        if (typeof resetExtremeTimeAttackState === 'function') resetExtremeTimeAttackState();
    }

    // UIオーバーレイのゴースト化消去
    ui.titleOverlay.style.transition = 'opacity 0.2s';
    ui.titleOverlay.style.opacity = '0';
    ui.titleOverlay.style.pointerEvents = 'none';
    setTimeout(() => {
        ui.titleOverlay.style.display = 'none';
        ui.titleOverlay.style.transition = '';
        ui.titleOverlay.style.opacity = '1';
        ui.titleOverlay.style.pointerEvents = 'auto';
    }, 500);

    //const bgmIndex = Math.floor((stage - 1) / 2) % BGM_FILES.stages.length;
    //if (typeof AudioSys !== 'undefined') AudioSys.playBGM('stage', bgmIndex);

    gameState = 'PLAYING';
    startStage();
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
        if (enemyPool.getActiveCount() === 0 && isBossSpawned) isClearCondition = true;
    } else {
        const noEnemies = enemyPool.getActiveCount() === 0;
        const noWormholes = countActiveWormholes() === 0;
        if (noEnemies && noWormholes && isBossSpawned) isClearCondition = true;
    }

    if (!isStageClear && isClearCondition) {
        isStageClear = true;
        stageClearTimer = 0;
        if (typeof window.playStats !== 'undefined' && !window.playStats.endTime) {
            window.playStats.endTime = performance.now();
        }

        // クリア演出中は操作UIを隠す
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

            showGameMessage({
                kicker: "FINAL RESULT",
                main: "ALL MISSION CLEAR",
                sub: `TOTAL SCORE: ${score.toLocaleString()}`,
                type: "gold",
                extraClass: "epic-clear"
            });

            window.isFireworksActive = true;
            if (typeof triggerRandomFireworkLoop === 'function') {
                triggerRandomFireworkLoop();
            }

        } else {
            // 通常クリア
            gameSpeed = 0.25;

            if (typeof distortGrid === 'function') {
                distortGrid(worldSize / 2, worldSize / 2, 1000, worldSize);
            }

            if (typeof AudioSys !== 'undefined') {
                AudioSys.playBGM('clear');
            }

            showGameMessage({
                main: `STAGE ${stage} CLEAR`,
                glowColor: STAGE_THEMES[stage] || '#00bbff',
                duration: 2000 // ★追加：表示時間を2秒に短縮（デフォルトは3000ms前後の場合が多いです）
            });
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
    ui.titleOverlay.style.display = 'none';
    if (ui.bossContainer) ui.bossContainer.style.display = 'none';
    ui.pauseBtn.style.display = 'none';

    const stageBoard = document.getElementById('stage-result-board');
    if (stageBoard) stageBoard.style.display = 'none';

    // 全ステージ総合レポートをゲームオーバー画面に表示する
    if (typeof showFinalResultBoard === 'function') {
        showFinalResultBoard();
    }

    try {
        await waitForFirebase();

        const currentMode = (typeof getCurrentGameMode === 'function')
            ? getCurrentGameMode()
            : GAME_MODES.NORMAL;
        const isExtreme = currentMode === GAME_MODES.EXTREME_TIME_ATTACK;
        const extState = (typeof getExtremeTimeAttackState === 'function') ? getExtremeTimeAttackState() : null;
        const survivedSeconds = isExtreme && extState
            ? Math.floor((extState.survivalFrames || 0) / 60)
            : 0;
        const isExtremeClear = !!(isExtreme && extState && extState.cleared);
        const isExtremeTimeout = !!(isExtreme && extState && extState.timeoutTriggered && !isExtremeClear);

        // ランキング圏内チェック
        let canRegister = false;
        try {
            canRegister = await window.firebaseOps.checkRankIn(score, currentMode, survivedSeconds);
        } catch (e) {
            console.error("Rank check failed:", e);
            canRegister = true; // エラー時は念のため登録許容
        }

        // ==========================================
        // ★修正: 画面を表示する前に、裏側で確実に文字を作る
        // ==========================================
        const scoreDisplay = document.getElementById('result-score-display');
        if (scoreDisplay) {
            const baseText = `SCORE: ${score.toLocaleString()}`;
            const modeText = isExtreme ? `<br>TIME: ${survivedSeconds}s` : '';
            scoreDisplay.innerHTML = `${baseText}${modeText}`;
            scoreDisplay.style.display = "flex";
            scoreDisplay.style.textAlign = "center";
        }

        const msgPara = document.querySelector("#name-input-area p");
        const nameInp = document.getElementById("player-name-input");
        if (msgPara) msgPara.style.textAlign = "center";

        if (canRegister) {
            if (msgPara) {
                msgPara.innerHTML = isExtreme
                    ? "TIME ATTACK RECORD! REGISTER TO TIME ATTACK RANKING?"
                    : "NEW RECORD! REGISTER TO WORLD RANKING?";
                msgPara.style.color = "#0ff";
            }
            if (nameInp) nameInp.style.display = "block";
            ui.submitBtn.style.display = "block";
            ui.submitBtn.innerText = "SUBMIT";
            ui.submitBtn.style.pointerEvents = "auto";
            ui.skipScoreBtn.innerText = "SKIP";
            
        } else {
            if (msgPara) {
                msgPara.innerHTML = isExtreme
                    ? "TIME ATTACK RANKING OUT (TOP 20 ONLY)"
                    : "RANKING OUT (TOP 20 ONLY)";
                msgPara.style.color = "#f44";
            }
            if (nameInp) nameInp.style.display = "none";
            ui.submitBtn.style.display = "none";
            ui.skipScoreBtn.innerText = "NEXT";
        }

        if (window.refreshMenuButtons) window.refreshMenuButtons();

        // ==========================================
        // ★修正: 全てのテキストの準備が整ってから、画面を表示する
        // ==========================================
        if (isExtremeTimeout) {
            // TIME OUT 表示から Enter Name への間を作る
            hideGameMessage();
            await new Promise(resolve => setTimeout(resolve, 520));
        }

        ui.nameInputArea.style.display = 'flex';
        ui.nameInputArea.style.opacity = '0';
        ui.nameInputArea.style.transition = 'opacity 0.45s ease';

        requestAnimationFrame(() => {
            ui.nameInputArea.style.opacity = '1';
        });
        if (window.refreshMenuButtons) window.refreshMenuButtons(true);

        // 画面が表示された直後にフォーカスを当てる
        if (canRegister && nameInp) {
            setTimeout(() => nameInp.focus(), 50);
        }

        // --- 送信ボタン処理 ---
        let isSubmitting = false;
        ui.submitBtn.onclick = async () => {
            if (isSubmitting) return;
            isSubmitting = true;

            ui.submitBtn.style.pointerEvents = "none";
            ui.submitBtn.innerText = "SENDING...";
            const name = nameInp.value.trim() || "PILOT";

            let displayStage = stage;
            if (isExtreme) {
                displayStage = isExtremeClear ? "TA-CLEAR" : "TA";
            } else if (stage === 10 && isStageClear) {
                displayStage = "CLEAR";
            }

            try {
                await window.firebaseOps.submitAndCleanup(
                    score,
                    displayStage,
                    name,
                    currentMode,
                    survivedSeconds,
                    isExtremeClear
                );
                localStorage.setItem("neonGravity_last_name", name);
                ui.nameInputArea.style.display = "none";

                if (typeof AudioSys !== 'undefined') AudioSys.currentSrc = null;

                if (window.showRanking) {
                    window.showRanking(() => proceedToNextMenu(), currentMode);
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

function runExtremeTimeAttackReportFade(durationMs = 1800) {
    return new Promise(resolve => {
        const start = performance.now();
        const animate = (now) => {
            const progress = Math.min(1, (now - start) / durationMs);
            window.extremeReportFadeAlpha = progress;
            if (progress < 1) {
                requestAnimationFrame(animate);
                return;
            }
            resolve();
        };

        if (typeof window.extremeReportFadeAlpha !== 'number') {
            window.extremeReportFadeAlpha = 0;
        }
        requestAnimationFrame(animate);
    });
}

function revealExtremeTimeAttackReportFade(durationMs = 650) {
    const startAlpha = window.extremeReportFadeAlpha || 0;
    const start = performance.now();
    const animate = (now) => {
        const progress = Math.min(1, (now - start) / durationMs);
        window.extremeReportFadeAlpha = startAlpha * (1 - progress);
        if (progress < 1) {
            requestAnimationFrame(animate);
            return;
        }
        window.extremeReportFadeAlpha = 0;
    };

    requestAnimationFrame(animate);
}

function finishExtremeTimeAttackSequence({ cleared = false, bonus = 0, remainSeconds = 0 } = {}) {
    if (gameState !== 'PLAYING') return;

    enemyBulletPool.clearAll();
    playerBulletPool.clearAll();
    lasers = [];
    homingLasers = [];
    wormholes = [];
    isStageClear = true;
    stageClearTimer = 0;

    const extState = (typeof getExtremeTimeAttackState === 'function') ? getExtremeTimeAttackState() : null;
    if (extState) {
        extState.active = false;
        extState.cleared = !!cleared;
        extState.timeoutTriggered = !cleared;
    }
    if (typeof window.playStats !== 'undefined' && !window.playStats.endTime) {
        window.playStats.endTime = performance.now();
    }

    if (cleared) {
        if (bonus > 0) {
            score += bonus;
            ui.score.innerText = score.toString().padStart(6, '0');
        }

        window.isFireworksActive = true;
        if (typeof triggerRandomFireworkLoop === 'function') triggerRandomFireworkLoop();

        showGameMessage({
            kicker: 'TIME ATTACK CLEAR',
            main: `TIME BONUS +${bonus.toLocaleString()}`,
            sub: `${remainSeconds}s REMAINING`,
            type: 'gold',
            duration: 3200
        });
    } else {
        showGameMessage({
            kicker: 'TIME ATTACK',
            main: 'TIME OVER',
            sub: 'MISSION TERMINATED',
            type: 'warning',
            duration: 2400
        });
    }

    setTimeout(async () => {
        window.isFireworksActive = false;
        if (typeof hideGameMessage === 'function') hideGameMessage();

        await runExtremeTimeAttackReportFade(1800);
        if (gameState !== 'GAMEOVER_UI') await showGameOver();
        revealExtremeTimeAttackReportFade();
    }, cleared ? 3600 : 2600);
}

// =========================================================
// 2. メニュー・モード・ウィンドウ制御 (Menus & Modes)
// =========================================================

/**
 * リザルト画面・最終メニューの表示
 */
function proceedToNextMenu() {
    // ==========================================
    // 1. フェードアウトさせる要素をリストアップ
    // ==========================================
    const elementsToFade = [
        ui.nameInputArea,
        document.getElementById('final-report-panel'),
        document.getElementById('result-score-display'),
        document.getElementById('ranking-overlay') // ランキング画面から戻った場合用
    ];

    let isFading = false;

    // 現在画面に表示されている要素だけをフェードアウトさせる
    elementsToFade.forEach(el => {
        if (el && window.getComputedStyle(el).display !== 'none' && el.style.opacity !== '0') {
            el.style.transition = 'opacity 0.5s ease-out';
            el.style.opacity = '0';
            isFading = true;
        }
    });

    // ==========================================
    // 2. フェードアウト完了（0.5秒）を待ってから画面を切り替える
    // ==========================================
    setTimeout(() => {
        // 見えなくなった要素を非表示にして、次回の表示のために透明度を元に戻しておく
        elementsToFade.forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.style.transition = '';
                el.style.opacity = '1';
            }
        });

        // 確実にストーリー表示を消去
        const container = document.getElementById('story-typing-container');
        if (container) {
            container.style.display = 'none';
            container.classList.remove('ending-mode');
        }

        // ==========================================
        // 3. 次のメニュー（RETRY画面）をフェードインさせる
        // ==========================================
        ui.titleOverlay.style.display = 'flex';
        ui.titleOverlay.style.opacity = '0';
        ui.titleOverlay.style.transition = 'opacity 0.5s ease-in';
        
        // 描画フレームを待って不透明度を1にする（CSSアニメーション発動）
        requestAnimationFrame(() => {
            ui.titleOverlay.style.opacity = '1';
        });

        let titleColor = '#f00';

        ui.btnStart.innerText = 'RETRY';
        ui.btnStart.style.display = 'block';
        ui.btnStart.style.borderColor = titleColor;
        ui.btnStart.style.color = titleColor;

        ui.btnTitle.style.display = 'block';

        ui.btnTitle.onclick = () => {
            // 1. まず現在のRETRY画面を0.5秒かけてフェードアウト
            ui.titleOverlay.style.transition = 'opacity 0.5s ease-out';
            ui.titleOverlay.style.opacity = '0';

            setTimeout(() => {
                // 2. 画面が完全に消えた裏側で、中身をタイトル画面用にリセットする
                returnToTitle();

                // 3. タイトル画面として新しくフェードインさせる
                ui.titleOverlay.style.opacity = '0';
                ui.titleOverlay.style.transition = 'opacity 0.5s ease-in';
                
                requestAnimationFrame(() => {
                    ui.titleOverlay.style.opacity = '1';
                });

                // 4. アニメーション完了後にスタイルを元に戻す
                setTimeout(() => {
                    ui.titleOverlay.style.transition = '';
                }, 500);
                
            }, 500); // フェードアウトの時間（0.5秒）待つ
        };

        ui.pauseBtn.style.display = 'none';

        // 不要なボタンを隠す
        if (ui.btnHowto) ui.btnHowto.style.display = 'none';
        if (ui.btnExtremeTa) ui.btnExtremeTa.style.display = 'none';
        if (ui.btnRanking) ui.btnRanking.style.display = 'none';
        if (ui.btnOst) ui.btnOst.style.display = 'none';
        if (ui.btnStory) ui.btnStory.style.display = 'none';
        if (ui.btnSettings) ui.btnSettings.style.display = 'none';

        if (window.refreshMenuButtons) window.refreshMenuButtons();

        // フェードインが完了したら transition を消して元に戻す
        setTimeout(() => {
            ui.titleOverlay.style.transition = '';
        }, 500);

    }, isFading ? 500 : 0); // フェードアウトする要素があった時だけ500ms待つ
}

/**
 * メインタイトル画面への復帰
 */
function returnToTitle() {
    gameState = 'TITLE';

    if (typeof resetStoryTypingState === 'function') resetStoryTypingState();

    playerBulletPool.clearAll(); lasers = []; 
    enemyPool.clearAll();
    enemyBulletPool.clearAll();
    particlePool.clearAll(); 
    ringPool.clearAll();     
    crystalPool.clearAll();
    crystals = []; homingLasers = []; powerups = [];
    wormholes = []; 
    scorePopupPool.clearAll();

    if (typeof AudioSys !== 'undefined') {
        AudioSys.fadeOutBGM().then(() => {
            AudioSys.currentSrc = null;
        });
    }

    introPhase = 0;
    introTimer = 0;
    introAlpha = 0;
    introBgScroll = 0;

    // タイトル背景を初期状態へ戻す
    camera.x = worldSize / 2 - width / (2 * cameraScale);
    camera.y = worldSize / 2 - height / (2 * cameraScale);

    if (typeof initGrid === 'function') initGrid();
    if (typeof initStars === 'function') initStars();
    if (typeof initNebulae === 'function') initNebulae('#00bbff');

    // 前フレームの描画状態をクリア
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // UIの表示状態
    ui.gameoverOverlay.style.display = 'none';
    ui.titleOverlay.style.display = 'flex';

    // ★追加：成績ボードを確実に隠す
    const stageBoard = document.getElementById('stage-result-board');
    if (stageBoard) stageBoard.style.display = 'none';

    ui.ostOverlay.style.display = 'none';
    ui.controls.style.display = 'none';
    hideGameMessage(true); 

    const guide = document.getElementById('training-guide');
    if (guide) guide.style.display = 'none';

    const hud = document.querySelector('.hud-row');
    if (hud) hud.style.display = 'none';

    ui.pauseBtn.style.display = 'none';

    // タイトル周辺の追加要素がある場合に備える
    const titleShell = document.getElementById('title-shell');
    if (titleShell) {
        titleShell.style.display = 'flex';
    }

    const titleKicker = document.getElementById('title-kicker');
    if (titleKicker) {
        titleKicker.style.display = '';
    }

    const titleScanline = document.getElementById('title-scanline');
    if (titleScanline) {
        titleScanline.style.display = '';
    }

    // ボタンを通常タイトル状態へ戻す
    if (ui.btnStart) {
        ui.btnStart.innerText = 'START GAME';
        ui.btnStart.style.display = 'block';
        ui.btnStart.style.borderColor = '';
        ui.btnStart.style.color = '';
        ui.btnStart.style.background = '';
        ui.btnStart.style.transform = '';
    }

    if (ui.btnTitle) {
        ui.btnTitle.style.display = 'none';
        ui.btnTitle.style.borderColor = '';
        ui.btnTitle.style.color = '';
        ui.btnTitle.style.background = '';
        ui.btnTitle.style.transform = '';
    }

    if (ui.btnSettings) {
        ui.btnSettings.style.display = 'block';
        ui.btnSettings.style.borderColor = '';
        ui.btnSettings.style.color = '';
        ui.btnSettings.style.background = '';
        ui.btnSettings.style.transform = '';
    }

    if (ui.btnOst) {
        ui.btnOst.style.display = 'block';
        ui.btnOst.style.borderColor = '';
        ui.btnOst.style.color = '';
        ui.btnOst.style.background = '';
        ui.btnOst.style.transform = '';
    }

    if (ui.btnHowto) {
        ui.btnHowto.style.display = 'block';
        ui.btnHowto.style.borderColor = '';
        ui.btnHowto.style.color = '';
        ui.btnHowto.style.background = '';
        ui.btnHowto.style.transform = '';
    }

    if (ui.btnExtremeTa) {
        ui.btnExtremeTa.style.display = 'block';
        ui.btnExtremeTa.style.borderColor = '';
        ui.btnExtremeTa.style.color = '';
        ui.btnExtremeTa.style.background = '';
        ui.btnExtremeTa.style.transform = '';
    }

    if (ui.btnStory) {
        ui.btnStory.style.display = 'block';
        ui.btnStory.style.borderColor = '';
        ui.btnStory.style.color = '';
        ui.btnStory.style.background = '';
        ui.btnStory.style.transform = '';
    }

    if (ui.btnRanking) {
        ui.btnRanking.style.display = 'block';
        ui.btnRanking.style.borderColor = '';
        ui.btnRanking.style.color = '';
        ui.btnRanking.style.background = '';
        ui.btnRanking.style.transform = '';
        ui.btnRanking.onclick = () => window.showRanking(null, GAME_MODES.NORMAL);
    }

    const menuButtons = document.getElementById('menu-buttons-container');
    if (menuButtons) {
        menuButtons.style.display = 'flex';
    }

    const menuFooter = document.getElementById('menu-footer');
    if (menuFooter) {
        menuFooter.style.display = 'block';
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
        // 解禁と同時の暴発防止（control_player.jsのイントロ処理と同様の考え方）
        if (typeof input !== 'undefined') {
            input.move.x = 0; input.move.y = 0;
            input.aim.x = 0; input.aim.y = 0;
            // キー状態も一旦リセットすると確実です
            input.keys = {}; 
        }
        if (typeof AudioSys !== 'undefined') AudioSys.resumeBGM(false);
        gameState = previousGameState; // 状態を戻す
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
    ui.titleOverlay.style.display = 'none';
    const storyOverlay = document.getElementById('story-overlay');
    if (storyOverlay) {
        // 初期状態を透明にしてから表示開始
        storyOverlay.style.opacity = '0'; 
        storyOverlay.style.display = 'flex';
        
        // 次の描画タイミングで不透明度を1にする
        requestAnimationFrame(() => {
            storyOverlay.style.opacity = '1';
        });
    }

    const container = document.getElementById('story-scroll-container');
    if (container) {
        container.classList.remove('lang-ja', 'lang-en');
        
        // ★修正：ブラウザ言語判定から、設定した currentLanguage に変更
        container.classList.add(currentLanguage === 'ja' ? 'lang-ja' : 'lang-en');
        container.scrollTop = 0;
    }

    if (typeof AudioSys !== 'undefined') AudioSys.playBGM('title');
    if (window.refreshMenuButtons) window.refreshMenuButtons();
}

function closeStory() {
    const storyOverlay = document.getElementById('story-overlay');
    if (storyOverlay) {
        // 1. まず透明にする（CSSのtransitionが効く）
        storyOverlay.style.opacity = '0';

        // 2. フェード時間（0.5秒）待ってから完全に消す
        setTimeout(() => {
            storyOverlay.style.display = 'none';
            returnToTitle(); // フェード後にタイトルへ戻る
        }, 500); // CSSの transition 0.5s に合わせる
    } else {
        returnToTitle();
    }
}

/**
 * HOW TO PLAY 画面の開閉
 */
function showHowTo() {

    gameState = 'HOWTO';
    titleIdleTimer = 0;

    ui.titleOverlay.style.display = 'none';
    ui.howtoOverlay.style.display = 'flex';

    if (window.refreshMenuButtons) {
        window.refreshMenuButtons(true);
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ui.howtoOverlay.style.opacity = '1';
        });
    });
}

function hideHowTo() {

    titleIdleTimer = 0;
    ui.howtoOverlay.style.opacity = '0';

    setTimeout(() => {
        ui.howtoOverlay.style.display = 'none';
        ui.titleOverlay.style.display = 'flex';
        gameState = 'TITLE';
        if (window.refreshMenuButtons) {
            window.refreshMenuButtons();
        }
    }, 300);
}

function startExtremeTimeAttack() {
    if (typeof queueGameModeStart === 'function') {
        queueGameModeStart(GAME_MODES.EXTREME_TIME_ATTACK);
    }
    startGame();
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

function openSetting() {
    if (typeof resetTitleIdle === 'function') resetTitleIdle();
    gameState = 'SETTINGS';
    ui.titleOverlay.style.display = 'none';
    
    // IDを settings-overlay (sあり) に修正
    const settingOverlay = document.getElementById('settings-overlay');
    if (settingOverlay) {
        settingOverlay.style.opacity = '0';
        settingOverlay.style.display = 'flex';
        settingOverlay.style.pointerEvents = 'auto';

        requestAnimationFrame(() => {
            settingOverlay.style.opacity = '1';
        });
    }
    
    if (window.refreshMenuButtons) window.refreshMenuButtons();

    if (typeof syncSliderWithCurrentQuality === 'function') {
        syncSliderWithCurrentQuality();
    }

    if (typeof syncLanguageToggleText === 'function') {
        syncLanguageToggleText();
    }
}

function closeSetting() {
    const settingOverlay = document.getElementById('settings-overlay');
    if (settingOverlay) {
        settingOverlay.style.opacity = '0';
        settingOverlay.style.pointerEvents = 'none';

        setTimeout(() => {
            settingOverlay.style.display = 'none';
            returnToTitle();
        }, 500); 
    } else {
        returnToTitle();
    }
}


// =========================================================
// 3. 演出・アニメーション・シーン更新 (Cinematics & VFX Updates)
// =========================================================
let storyTypingSessionId = 0;
let storyTypingStartTimeout = null;
let isStoryTypingActive = false;

/**
 * ステージ開始前のイントロ（ワープアウト）演出の更新
 */
/**
 * ステージ開始前のイントロ（ワープアウト）演出の更新
 */
function updateIntro() {

    if (gameState === 'PAUSED') return;

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
        if (introTimer > 180) { // タイトル表示終了(約3秒後)
            introPhase = 2;
            introTimer = 0;

            hideGameMessage(); // ステージタイトルを消す

            const storyTextObj = STAGE_STORY_TEXTS[stage];
            if (storyTextObj) {
                resetStoryTypingState();

                // ★修正：現在の言語に対応するテキストを取得
                const storyText = storyTextObj[currentLanguage] || storyTextObj['en'];

                // ここでストーリー開始と同時にSKIPボタンが出るようになります
                (async () => {
                    await waitWithPause(500, () => isSkippingStory);
                    if (!isSkippingStory && gameState === 'STAGE_INTRO' && introPhase === 2) {
                        playStoryTyping(storyText); // この中でボタンが表示されます
                    }
                })();
            } else {
                isSkippingStory = true;
            }
        }
    }

    // --- Phase 2: ストーリータイピング ---
    else if (introPhase === 2) {
        if (!isStoryTypingActive && introTimer > 60) {
            introPhase = 3;
            introTimer = 0;

            player.visualYOffset = 700;
            player.visualScale = 0;

            const hud = document.querySelector('.hud-row');
            if (hud) {
                hud.style.display = 'flex';
                hud.style.opacity = '0';
            }

            const miniMapContainer = document.getElementById('minimap-container');
            if (miniMapContainer) {
                miniMapContainer.style.display = 'block';
                miniMapContainer.style.opacity = '0';
            }
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

        // カメラ制御
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

        // エフェクト
        const safeVY = (player.visualYOffset !== undefined) ? player.visualYOffset : 700;
        if (introTimer > 5 && introTimer <= ARRIVE_TIME && player.visualScale > 0.1) {
            if (safeVY > 10) {
                for (let i = 0; i < 5; i++) {
                    const tailOffset = 40 * player.visualScale;
                    const spreadX = 12 * player.visualScale;
                    spawnParticleObj({
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

        if (introTimer === 30 || introTimer === 38 || introTimer === 46) {
            if (introTimer === 30) {
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('warp_in');
                if (typeof distortGrid === 'function') distortGrid(player.x, currentVisualY, -100, 200);
                spawnParticleObj({
                    x: player.x, y: currentVisualY, vx: 0, vy: 0,
                    color: '#fff', life: 0.2, size: 150, isBubble: true
                });
            }

            const spread = (introTimer === 30) ? 60 : (introTimer === 38) ? 40 : 20;
            for (let i = 0; i < 20; i++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = 5 + Math.random() * 10;
                spawnParticleObj({
                    x: player.x + (Math.random() - 0.5) * spread,
                    y: currentVisualY + (Math.random() - 0.5) * spread,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 3,
                    color: Math.random() > 0.5 ? '#fff' : '#0ff',
                    life: 0.6 + Math.random() * 0.4,
                    size: 2 + Math.random() * 2
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
        ctx.globalAlpha = 1.0;
        if (typeof drawWormholes === 'function') drawWormholes();
        ctx.restore();

        // 敵とワールド境界線（フェードイン演出あり）
        ctx.save();
        ctx.globalAlpha = introAlpha;
        if (typeof drawWorldBounds === 'function') drawWorldBounds();
        if (typeof drawEnemies === 'function') drawEnemies();
        ctx.restore();

        // 弾やプレイヤーなどの手前のオブジェクト
        ctx.save();
        ctx.globalAlpha = 1.0;
        // ※ここにあった drawWormholes() を削除し、上に移動しました
        if (typeof drawLasers === 'function') drawLasers();
        if (typeof drawPlayerBullets === 'function') drawPlayerBullets();
        if (typeof drawHomingLasers === 'function') drawHomingLasers();
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

    const sessionId = ++storyTypingSessionId;
    isStoryTypingActive = true;

    const {
        keepVisibleAfterTyping = false,
        waitAfterTypingMs = 6000,
        autoScroll = false
    } = options;

    isSkippingStory = false;

    // ==========================================
    // ★修正部分：コンテナをフェードインさせる
    // ==========================================
    container.style.display = 'flex';
    // 次の描画フレームで不透明度を1にすることで、CSSのtransition（フェードイン）を効かせる
    requestAnimationFrame(() => {
        container.style.opacity = '1';
    });

    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.transition = 'none';
    el.innerHTML = '';
    el.scrollTop = 0;

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
        // 行開始前のポーズ待機
        while (gameState === 'PAUSED') {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (sessionId !== storyTypingSessionId || isSkippingStory) break;
        }
        if (sessionId !== storyTypingSessionId || isSkippingStory) break;

        const lineDiv = document.createElement('div');
        lineDiv.style.minHeight = '1.6em';
        lineDiv.style.marginBottom = '0.4em';
        el.appendChild(lineDiv);
        lineDiv.appendChild(cursor);

        if (shouldAutoScroll) el.scrollTop = el.scrollHeight;

        for (let char of lineText) {
            // ★追加：1文字ごとの出力前にもポーズ待機を入れる
            while (gameState === 'PAUSED') {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (sessionId !== storyTypingSessionId || isSkippingStory) break;
            }

            if (sessionId !== storyTypingSessionId || isSkippingStory) break;

            cursor.before(char);

            if (shouldAutoScroll) el.scrollTop = el.scrollHeight;

            let delay = 40;
            if (/[。、，,\.]/.test(char)) delay = 300;
            else if (/[!?！？]/.test(char)) delay = 400;
            else if (char === ' ') delay = 20;

            // ポーズ対応の文字単位ディレイ
            await waitWithPause(delay, () => sessionId !== storyTypingSessionId || isSkippingStory);
        }

        if (sessionId !== storyTypingSessionId || isSkippingStory) break;

        // 行終わりの待機
        if (lineText.trim() !== '') {
            await waitWithPause(250, () => sessionId !== storyTypingSessionId || isSkippingStory);
        }
    }

    cursor.remove();

    if (sessionId !== storyTypingSessionId) {
        isStoryTypingActive = false;
        return 'cancelled';
    }

    if (isSkippingStory) {
        el.style.display = 'none';
        container.style.display = 'none';
        el.innerHTML = '';
        isStoryTypingActive = false;
        return 'skipped';
    }

    // ★追加：読み終わったあとの長めの待機中もポーズ判定を組み込む
    if (waitAfterTypingMs > 0) {
        let waited = 0;
        while (waited < waitAfterTypingMs) {
            if (gameState === 'PAUSED') {
                // ポーズ中はタイマーを進めない
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                await new Promise(resolve => setTimeout(resolve, 100));
                waited += 100;
            }
            if (sessionId !== storyTypingSessionId || isSkippingStory) break;
        }

        if (sessionId !== storyTypingSessionId || isSkippingStory) {
            isStoryTypingActive = false;
            return 'cancelled';
        }
    }

    if (keepVisibleAfterTyping) {
        isStoryTypingActive = false;
        return 'completed';
    }

    el.style.transition = 'opacity 0.6s ease-out';
    el.style.opacity = '0';
    await waitWithPause(600, () => sessionId !== storyTypingSessionId || isSkippingStory);

    if (sessionId !== storyTypingSessionId) {
        isStoryTypingActive = false;
        return 'cancelled';
    }

    el.style.display = 'none';
    container.style.display = 'none';
    el.innerHTML = '';
    isStoryTypingActive = false;
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

    storyTypingSessionId++;

    const container = document.getElementById('story-typing-container');
    const typingMsg = document.getElementById('story-typing-msg');

    const fadeStyle = "opacity 0.8s ease-out"; // テンポ良く消えるように少し短縮
    if (container) {
        container.style.transition = fadeStyle;
        container.style.opacity = "0";
    }
    if (typingMsg) {
        typingMsg.style.transition = fadeStyle;
        typingMsg.style.opacity = "0";
    }

    setTimeout(() => {
        isSkipComplete = true;
        isStoryTypingActive = false;

        if (container) {
            container.style.display = 'none';
            container.classList.remove('ending-mode');
            container.style.transition = '';
            container.style.opacity = '1'; // 次回のために確実に不透明に戻す
        }

        if (typingMsg) {
            typingMsg.style.display = 'none';
            typingMsg.innerHTML = '';
            typingMsg.scrollTop = 0;
            typingMsg.style.transition = '';
            typingMsg.style.opacity = '1'; // 次回のために確実に不透明に戻す
        }

        if (gameState === 'ENDING_STORY') {
            showGameOver();
        }
    }, 1000); // フェードアウト完了後に実行
};


/**
 * イントロを強制スキップしてゲームプレイへ移行
 */
function skipToPlaying() {
    hideGameMessage();

    resetStoryTypingState();

    introPhase = 3;
    introTimer = 0;
    introAlpha = 0;
    isSkippingStory = false;

    player.visualYOffset = 700;
    player.visualScale = 0;
}

function resetStoryTypingState() {
    storyTypingSessionId++;
    isStoryTypingActive = false;

    const container = document.getElementById('story-typing-container');
    const el = document.getElementById('story-typing-msg');

    if (container) {
        container.style.display = 'none';
        container.style.opacity = '';
        container.style.transition = '';
        container.classList.remove('ending-mode');
    }

    if (el) {
        el.style.display = 'none';
        el.style.opacity = '';
        el.style.transition = '';
        el.innerHTML = '';
        el.scrollTop = 0;
    }
}





/**
 * プレイヤー死亡演出の更新
 */
function updateDying() {
    dyingTimer--;

    // ★修正1：途中でメッセージを切り替える不要な処理を削除
    // ★修正2：完全に画面が切り替わる少し前（50フレーム目）に1回だけフェードアウトさせる
    if (dyingTimer === 50) {
        hideGameMessage(); 
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
        // ★修正3：hideGameMessage(true); を削除し、一瞬明るく点滅するバグを防止
        showGameOver();
    }
}

/**
 * ステージクリア後のワープ演出（次のステージへの離脱）
 */
function updateWarpProcess() {
    playerBulletPool.clearAll(); lasers = []; homingLasers = []; player.history = [];
    enemyBulletPool.clearAll();

    if (player.warpTimer === undefined) player.warpTimer = 0;
    player.warpTimer++;

    // ==========================================
    // ★追加：ワープが開始した瞬間に、CSSクラスを付与して一斉にフェードアウトさせる
    // ==========================================
    if (player.warpTimer === 1) {
        const uiElements = [
            document.querySelector('.hud-row'),
            document.getElementById('minimap-container'),
            document.getElementById('controls'),
            document.getElementById('stage-result-board')
        ];
        uiElements.forEach(el => {
            if (el) {
                // iOS対策: JSで直接styleを書かず、CSSクラスを追加するだけでアニメーションを発火させる
                el.classList.add('fade-out-now');
            }
        });

        // ワープアウト開始時に残存敵を自爆させる（スコア加算なし）
        enemyPool.pool.forEach(e => {
            if (!e || !e.active || e.isDead || e.isDying) return;

            const burst = (e.type === 'boss' || e.type === 'battleship') ? 35 : 10;
            if (typeof createExplosion === 'function') {
                createExplosion(e.x, e.y, e.color || '#fff', burst);
            }

            e.hp = 0;
            e.isDying = false;
            e.isDead = true;
            enemyPool.release(e);
        });
    }

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
        spawnParticleObj({
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
                    if (player.satellites.length < MAX_SATELLITES) {
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
    // 機体が画面外に出た瞬間の処理
    // =========================================================
    if (player.y < camera.y - 50) {
        player.visualScale *= 0.85;
        crystals.forEach(c => c.life = 0);
        powerups.forEach(p => p.life = 0);
        scorePopupPool.clearAll();
        enemyBulletPool.clearAll();

        // 画面から消えた瞬間に、次へ進むためのタイマーを開始
        if (!player.hasExitedScreen) {
            player.hasExitedScreen = true;
            player.exitTimer = 0;
            // ★修正：ここにあった、古い「直接スタイルを書き換えるフェードアウト処理」は削除しました
        }
    }

    // 画面外に出てからのカウントダウン（フェードアウト進行中）
    if (player.hasExitedScreen) {
        player.exitTimer++;

        // 1秒のフェードアウト完了後、少し余韻を持たせて（80フレーム目）次へ遷移
        if (player.exitTimer > 80) {
            if (introPhase === 0) {
                hideGameMessage(true);
                isWarpingOut = false;
                player.warpTimer = 0;
                player.warpSoundPlayed = false;
                player.hasExitedScreen = false;
                player.exitTimer = 0;
                if (typeof clearInputState === 'function') clearInputState();

                // ★修正：次のシーンへ行く前に、付与したフェードアウト用クラスを剥がす
                const uiElements = [
                    document.querySelector('.hud-row'),
                    document.getElementById('minimap-container'),
                    document.getElementById('controls'),
                    document.getElementById('stage-result-board')
                ];
                uiElements.forEach(el => {
                    if (el) {
                        el.style.transition = '';
                        el.style.opacity = '';
                        el.classList.remove('fade-out-now'); // クラスを外して元に戻す
                    }
                });

                const extState = (typeof getExtremeTimeAttackState === 'function') ? getExtremeTimeAttackState() : null;
                const isExtremeTimeoutWarp =
                    (typeof isExtremeTimeAttackMode === 'function') &&
                    isExtremeTimeAttackMode() &&
                    !!(extState && extState.timeoutTriggered && !extState.cleared);

                if (isExtremeTimeoutWarp) {
                    showGameOver();
                    return;
                }

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

    // 余韻用の暗転 (ポーズ対応)
    await waitWithPause(1500, () => isSkippingStory);

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
        // ★追加：上下のフェードアウト領域（透明になる部分）を避けるための余白
        typingMsg.style.paddingTop = '40px';
        typingMsg.style.paddingBottom = '40px';
    }

    if (skipBtn) {
        skipBtn.innerText = 'SKIP';
        skipBtn.style.animation = 'none';
        skipBtn.classList.remove('ending-next');
    }

    const endingText = ENDING_STORY_TEXT[currentLanguage] || ENDING_STORY_TEXT['en'];

    const typingResult = await playStoryTyping(endingText, {
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
}

/**
 * ボス出現時の警告演出を発火
 */
function triggerBossEncounter(bossType = 'boss') {
    if (isTrainingMode) return;

    if (isBossWarning) return;

    isBossWarning = true;
    if (typeof AudioSys !== 'undefined') {
        AudioSys.playSE('warning');
    }

    // ==========================================
    // ★追加: HTMLオーバーレイでWARNINGを表示する
    // ==========================================
    showGameMessage({
        kicker: "TACTICAL ALERT",
        main: "WARNING !!",
        sub: "BOSS APPROACHING",
        type: "warning" // ← これによりCSSで赤く点滅します
    });

    const centerX = worldSize / 2;
    const centerY = worldSize / 2;
    const dx = centerX - player.x;
    const dy = centerY - player.y;
    const distToCenter = Math.hypot(dx, dy) || 1;

    // ラスボスは通常Stage 10と同じく中央から出現
    const spawnDist = 300;
    let tx = bossType === 'battleship' ? centerX : player.x + (dx / distToCenter) * spawnDist;
    let ty = bossType === 'battleship' ? centerY : player.y + (dy / distToCenter) * spawnDist;

    const margin = 300;
    nextBossSpawnX = Math.max(margin, Math.min(worldSize - margin, tx));
    nextBossSpawnY = Math.max(margin, Math.min(worldSize - margin, ty));
    nextBossSpawnType = bossType;

    gameSpeed = 1;
    warningTimer = 180;
}


// =========================================================
// 4. システム・UI更新ロジック (System & UI Updates)
// =========================================================

/**
 * ボス警告テキストと画面メッセージのフェード処理更新
 */
function updateMessageAndBossWarning() {
    if (stageMessageTimer > 0) {
        stageMessageTimer--;

        if (stageMessageTimer === 0 && !isBossWarning) {
            hideGameMessage(); // フェードアウト
        }
    }

    if (isBossWarning) {
        warningTimer--;

        if (warningTimer <= 0) {
            isBossWarning = false;
            gameSpeed = 1.0;

            // ボス警告終了時に警告メッセージも消す
            hideGameMessage();

            if (stage !== 9 && stage !== 10) {
                wormholes.unshift({
                    x: nextBossSpawnX,
                    y: nextBossSpawnY,
                    life: 300,
                    maxLife: 300,
                    active: true
                });

                if (typeof spawnEnemy === 'function') {
                    spawnEnemy(nextBossSpawnX, nextBossSpawnY, nextBossSpawnType || 'boss');
                }

                if (typeof distortGrid === 'function') {
                    distortGrid(nextBossSpawnX, nextBossSpawnY, 250, 400);
                }
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
    const currentBoss = enemyPool.pool.find(e => e.active && (e.type === 'boss' || e.type === 'battleship'));

    // ボス発狂警告
    if (currentBoss && currentBoss.aliveTimer > 1800) {
        bossAngerMinionSpeedMag = Math.min(
            3.0,
            1.0 + (currentBoss.aliveTimer - 1800) * 0.0005
        );
        // 点滅
        if (frame % 60 < 30) {

            if (!isBossRageWarningVisible) {
                showGameMessage({
                    kicker: "WARNING",
                    main: "ENEMY ACCELERATING",
                    type: "warning",
                    compact: true
                });

                isBossRageWarningVisible = true;
            }
        } else {
            hideGameMessage();
            isBossRageWarningVisible = false;
        }
    }
    else if (!isBossWarning) {
        if (isBossRageWarningVisible) {
            hideGameMessage();
            isBossRageWarningVisible = false;
        }
    }

    if (stage === 10 && gameState === 'PLAYING') {
        stage10Timer++;
        const PSEUDO_BEAT_INTERVAL = 110;
        if (stage10BeatCount < 5 && stage10Timer % PSEUDO_BEAT_INTERVAL === 20) {
            const boss = enemyPool.pool.find(e => e.active && e.type === 'battleship');
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

    const boss = enemyPool.pool.find(e => e.active && (e.type === 'boss' || e.type === 'battleship'));

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
    if (player.satellites.length < MAX_SATELLITES) {
        player.satellites.push({ x: player.x, y: player.y, angle: Math.random() * Math.PI * 2 });
    }

}

/**
 * 指定された要素をフェードインさせる
 * @param {HTMLElement} element - フェードインさせる要素
 * @param {string} display - 表示時のdisplayスタイル（デフォルト: 'flex'）
 */
function fadeInElement(element, display = 'flex') {
    if (!element) return;

    // 1. まず表示状態にして（display: noneを解除）、CSS Transitionを有効にする
    element.style.display = display;
    
    // 2. 次の描画フレームを待ってから opacity を 1 にする
    // これにより、opacity: 0 -> 1 へのアニメーションが走る
    requestAnimationFrame(() => {
        element.style.opacity = '1';
    });
}

// ==========================================
// ★変更：ステージクリア時の成績ポップアップ
// (iPhone横向き対応・低解像度コンパクト版)
// ==========================================
window.showStageResultBoard = function() {
    if (typeof window.playStats === 'undefined') return;

    const stats = window.playStats;

    const endTime = stats.endTime || performance.now();
    const totalSeconds = Math.floor((endTime - stats.startTime) / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

    const enemyKilled = stats.enemiesKilled || 0;
    const enemySpawned = stats.enemiesSpawned || 0;
    const enemyRate = enemySpawned > 0 ? Math.floor((enemyKilled / enemySpawned) * 100) : 0;

    const getStatStr = (type) => {
        const stat = stats.items && stats.items[type];
        
        if (!stat || stat.spawned === 0) {
            return `
                <div style="display: flex; color:#555; margin-left: auto; align-items: baseline; justify-content: flex-end;">
                    <span style="font-weight: bold; font-size: 1.1em;">0 / 0</span>
                    <span style="width: 3.8em; text-align: right; font-size: 0.85em; margin-left: 0.3em; font-weight: normal;">(0%)</span>
                </div>`;
        }
        
        const rate = Math.floor((stat.collected / stat.spawned) * 100);
        const color = stat.collected === stat.spawned ? '#0f8' : (stat.collected > 0 ? '#ff0' : '#f05');
        
        return `
            <div style="display: flex; color:${color}; text-shadow:0 0 5px ${color}; margin-left: auto; align-items: baseline; justify-content: flex-end;">
                <span style="font-weight: bold; font-size: 1.1em;">${stat.collected} / ${stat.spawned}</span>
                <span style="width: 3.8em; text-align: right; font-size: 0.85em; margin-left: 0.3em; font-weight: normal;">(${rate}%)</span>
            </div>`;
    };

    // ★追加：アイテムの行を描画する共通関数
    const getItemRowHtml = (cssClass, labelChar, labelText, statKey) => {
        return `
            <div style="display: flex; align-items: center; margin-bottom: 0.2em; padding-left: 0.3em; white-space: nowrap;">
                <div style="width: 2.2em; flex-shrink: 0; display: flex; justify-content: center; align-items: center;">
                    <span class="result-item-icon ${cssClass}" style="transform: scale(0.75);">${labelChar}</span> 
                </div>
                <span style="font-weight: normal; margin-left: 0.5em; font-size: 0.9em;">${labelText}</span> 
                ${getStatStr(statKey)}
            </div>
        `;
    };

    let resultDiv = document.getElementById('stage-result-board');
    if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'stage-result-board';
        // ★修正1：z-indexのトラブルを防ぐため、UIコンテナではなくbody直下に配置する
        document.body.appendChild(resultDiv);
    }

    resultDiv.innerHTML = `
        <style>
            /* 既存のstyleの中身はそのまま */
            @media screen and (max-height: 500px) {
                #stage-report-panel { 
                    font-size: 0.65rem !important; 
                    padding: 0.8em !important; 
                }
            }
            .result-item-icon {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 24px !important;
                height: 24px !important;
                min-width: 24px !important;
                min-height: 24px !important;
                max-width: 24px !important;
                max-height: 24px !important;
                font-size: 13px !important;
                font-weight: bold !important;
                border: 2px solid !important;
                box-sizing: border-box !important;
                background: rgba(0,0,0,0.5) !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1 !important;
                overflow: hidden !important;
            }
            .ri-w, .ri-s { color: #0f0 !important; border-color: #0f0 !important; box-shadow: 0 0 5px #0f0 !important; }
            .ri-l { color: #0ff !important; border-color: #0ff !important; box-shadow: 0 0 5px #0ff !important; }
            .ri-i { color: #ff0 !important; border-color: #ff0 !important; box-shadow: 0 0 5px #ff0 !important; }
            .ri-p {
                color: #fff000 !important;
                border-color: #fff000 !important;
                box-shadow: 0 0 5px #fff000 inset, 0 0 5px #fff000 !important;
                border-radius: 50% !important;
                text-shadow: 0 0 5px #fff000 !important;
            }
        </style>
        <div id="stage-report-panel" style="
            position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0, 15, 25, 0.3); border: 2px solid #0ff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5); border-radius: 8px;
            padding: 1.2em 1.2em; color: #fff; font-family: 'Orbitron', sans-serif;
            text-align: center; z-index: 1000; width: max-content; min-width: 280px; max-width: 95vw; box-sizing: border-box; pointer-events: none;
            font-size: clamp(0.75rem, 2vw, 1.2rem);
        ">
            <div style="font-size: 1.3em; color: #0ff; text-shadow: 0 0 8px #0ff; margin-bottom: 0.6em; border-bottom: 2px solid rgba(0,255,255,0.5); padding-bottom: 0.3em; letter-spacing: 2px; font-weight: bold;">
                STAGE REPORT
            </div>
            
            <div style="text-align: left; line-height: 1.4;">
                <div style="display: flex; align-items: center; margin-bottom: 0.3em; white-space: nowrap;">
                    <span style="font-weight: normal; font-size: 0.9em;">TIME</span> 
                    <span style="color: #0f8; text-shadow: 0 0 5px #0f8; font-weight: bold; margin-left: auto; font-size: 1.2em;">${timeStr}</span>
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 0.6em; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 0.5em; white-space: nowrap;">
                    <span style="font-weight: normal; font-size: 0.9em;">ENEMY</span> 
                    <div style="display: flex; color: #0f8; text-shadow: 0 0 5px #0f8; margin-left: auto; align-items: baseline; justify-content: flex-end;">
                        <span style="font-weight: bold; font-size: 1.1em;">${enemyKilled} / ${enemySpawned}</span>
                        <span style="width: 3.8em; text-align: right; font-size: 0.85em; margin-left: 0.3em; font-weight: normal;">(${enemyRate}%)</span>
                    </div>
                </div>
                
                <div style="font-size: 0.8em; color: #aaa; margin-top: 0.4em; margin-bottom: 0.6em; text-align: center; letter-spacing: 1px; font-weight: normal;">
                    [ ITEMS : COLLECTED / SPAWNED ]
                </div>
                
                ${getItemRowHtml('ri-w', 'W', 'WEAPON', 'level')}
                ${getItemRowHtml('ri-l', 'L', 'LASER', 'laser')}
                ${getItemRowHtml('ri-s', 'S', 'SHIELD', 'shield')}
                ${getItemRowHtml('ri-i', 'I', 'INVINCIBLE', 'invincible')}
                ${getItemRowHtml('ri-p', 'P', 'POINT', 'point')}
            </div>
        </div>
    `;
    
    // 確実にフェードアウト用クラスを剥がしておく
    resultDiv.classList.remove('fade-out-now');
    
    // ★修正2：JSでのインラインスタイル指定を最小限にする（opacityはアニメーションのため残す）
    resultDiv.style.opacity = '0';
    resultDiv.style.display = 'block';
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            resultDiv.style.opacity = '1';
        });
    });
};

// ==========================================
// ★追加：ゲームオーバー時の「全ステージ総合」成績ポップアップ
// (iPhone横向き対応・低解像度コンパクト版)
// ==========================================
window.showFinalResultBoard = function() {
    if (typeof window.playStats === 'undefined' || typeof window.pastPlayStats === 'undefined') return;

    // XTAモードはフレーム数から直接計算（performance.now()の誤差・再生成問題を回避）
    const _isXTA = typeof isExtremeTimeAttackMode === 'function' && isExtremeTimeAttackMode();
    const _xtaState = typeof getExtremeTimeAttackState === 'function' ? getExtremeTimeAttackState() : null;
    let totalTimeMs;
    if (_isXTA && _xtaState && _xtaState.survivalFrames > 0) {
        totalTimeMs = Math.round(_xtaState.survivalFrames / 60) * 1000;
    } else {
        window.playStats.endTime = window.playStats.endTime || performance.now();
        const currentStageTime = window.playStats.endTime - window.playStats.startTime;
        totalTimeMs = window.pastPlayStats.totalTime + currentStageTime;
    }

    const total = {
        totalTime: totalTimeMs,
        enemiesSpawned: window.pastPlayStats.enemiesSpawned + window.playStats.enemiesSpawned,
        enemiesKilled: window.pastPlayStats.enemiesKilled + window.playStats.enemiesKilled,
        items: {}
    };
    
    ['level', 'laser', 'shield', 'invincible', 'point'].forEach(type => {
        const pastSpawned = (window.pastPlayStats.items[type] && window.pastPlayStats.items[type].spawned) || 0;
        const pastCollected = (window.pastPlayStats.items[type] && window.pastPlayStats.items[type].collected) || 0;
        const currentSpawned = (window.playStats.items[type] && window.playStats.items[type].spawned) || 0;
        const currentCollected = (window.playStats.items[type] && window.playStats.items[type].collected) || 0;

        total.items[type] = {
            spawned: pastSpawned + currentSpawned,
            collected: pastCollected + currentCollected
        };
    });

    const totalSeconds = Math.floor(total.totalTime / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

    const enemyKilled = total.enemiesKilled;
    const enemySpawned = total.enemiesSpawned;
    const enemyRate = enemySpawned > 0 ? Math.floor((enemyKilled / enemySpawned) * 100) : 0;

    const getStatStr = (type) => {
        const stat = total.items[type];
        if (!stat || stat.spawned === 0) {
            return `
                <div style="display: flex; color:#555; margin-left: auto; align-items: baseline; justify-content: flex-end;">
                    <span style="font-weight: bold; font-size: 1.1em;">0 / 0</span>
                    <span style="width: 3.8em; text-align: right; font-size: 0.85em; margin-left: 0.3em; font-weight: normal;">(0%)</span>
                </div>`;
        }
        const rate = Math.floor((stat.collected / stat.spawned) * 100);
        const color = stat.collected === stat.spawned ? '#0f8' : (stat.collected > 0 ? '#ff0' : '#f05');
        return `
            <div style="display: flex; color:${color}; text-shadow:0 0 5px ${color}; margin-left: auto; align-items: baseline; justify-content: flex-end;">
                <span style="font-weight: bold; font-size: 1.1em;">${stat.collected} / ${stat.spawned}</span>
                <span style="width: 3.8em; text-align: right; font-size: 0.85em; margin-left: 0.3em; font-weight: normal;">(${rate}%)</span>
            </div>`;
    };

    // ★追加：アイテムの行を描画する共通関数
    const getItemRowHtml = (cssClass, labelChar, labelText, statKey) => {
        return `
            <div style="display: flex; align-items: center; margin-bottom: 0.2em; padding-left: 0.3em; white-space: nowrap;">
                <div style="width: 2.2em; flex-shrink: 0; display: flex; justify-content: center; align-items: center;">
                    <span class="result-item-icon ${cssClass}" style="transform: scale(0.75);">${labelChar}</span> 
                </div>
                <span style="font-weight: normal; margin-left: 0.5em; font-size: 0.9em;">${labelText}</span> 
                ${getStatStr(statKey)}
            </div>
        `;
    };

const html = `
        <style>
            /* 既存のstyleの中身はそのまま */
            @media screen and (max-height: 500px) {
                #final-report-panel { 
                    font-size: 0.56rem !important; 
                    padding: 0.45em 0.55em !important; 
                    margin-top: 2px !important;
                }
                #final-report-panel > div:first-child {
                    margin-bottom: 0.35em !important;
                    padding-bottom: 0.2em !important;
                }
                #final-report-panel .result-item-icon {
                    width: 20px !important;
                    height: 20px !important;
                    min-width: 20px !important;
                    min-height: 20px !important;
                    max-width: 20px !important;
                    max-height: 20px !important;
                    font-size: 11px !important;
                }
            }
            .result-item-icon {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 24px !important;
                height: 24px !important;
                min-width: 24px !important;
                min-height: 24px !important;
                max-width: 24px !important;
                max-height: 24px !important;
                font-size: 13px !important;
                font-weight: bold !important;
                border: 2px solid !important;
                box-sizing: border-box !important;
                background: rgba(0,0,0,0.5) !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1 !important;
                overflow: hidden !important;
            }
            .ri-w, .ri-s { color: #0f0 !important; border-color: #0f0 !important; box-shadow: 0 0 5px #0f0 !important; }
            .ri-l { color: #0ff !important; border-color: #0ff !important; box-shadow: 0 0 5px #0ff !important; }
            .ri-i { color: #ff0 !important; border-color: #ff0 !important; box-shadow: 0 0 5px #ff0 !important; }
            .ri-p {
                color: #fff000 !important;
                border-color: #fff000 !important;
                box-shadow: 0 0 5px #fff000 inset, 0 0 5px #fff000 !important;
                border-radius: 50% !important;
                text-shadow: 0 0 5px #fff000 !important;
            }
        </style>
        <div id="final-report-panel" style="
            background: rgba(0, 15, 25, 0.3); border: 2px solid #0ff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5); border-radius: 8px;
            padding: 1.2em 1.2em; color: #fff; font-family: 'Orbitron', sans-serif;
            text-align: center; margin: 20px auto 0 auto;
            width: max-content; min-width: 280px; max-width: 95vw; box-sizing: border-box;
            font-size: clamp(0.75rem, 2vw, 1.2rem);
        ">
            <div style="font-size: 1.3em; color: #0ff; text-shadow: 0 0 8px #0ff; margin-bottom: 0.6em; border-bottom: 2px solid rgba(0,255,255,0.5); padding-bottom: 0.3em; letter-spacing: 2px; font-weight: bold;">
                TOTAL REPORT
            </div>
            
            <div style="text-align: left; line-height: 1.4;">
                <div style="display: flex; align-items: center; margin-bottom: 0.3em; white-space: nowrap;">
                    <span style="font-weight: normal; font-size: 0.9em;">TOTAL TIME</span> 
                    <span style="color: #0f8; text-shadow: 0 0 5px #0f8; font-weight: bold; margin-left: auto; font-size: 1.2em;">${timeStr}</span>
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 0.6em; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 0.5em; white-space: nowrap;">
                    <span style="font-weight: normal; font-size: 0.9em;">TOTAL ENEMIES</span> 
                    <div style="display: flex; color: #0f8; text-shadow: 0 0 5px #0f8; margin-left: auto; align-items: baseline; justify-content: flex-end;">
                        <span style="font-weight: bold; font-size: 1.1em;">${enemyKilled} / ${enemySpawned}</span>
                        <span style="width: 3.8em; text-align: right; font-size: 0.85em; margin-left: 0.3em; font-weight: normal;">(${enemyRate}%)</span>
                    </div>
                </div>
                
                <div style="font-size: 0.8em; color: #aaa; margin-top: 0.4em; margin-bottom: 0.6em; text-align: center; letter-spacing: 1px; font-weight: normal;">
                    [ TOTAL ITEMS : COLLECTED / SPAWNED ]
                </div>
                
                ${getItemRowHtml('ri-w', 'W', 'WEAPON', 'level')}
                ${getItemRowHtml('ri-l', 'L', 'LASER', 'laser')}
                ${getItemRowHtml('ri-s', 'S', 'SHIELD', 'shield')}
                ${getItemRowHtml('ri-i', 'I', 'INVINCIBLE', 'invincible')}
                ${getItemRowHtml('ri-p', 'P', 'POINT', 'point')}
            </div>
        </div>
    `;

    const resultContainer = document.getElementById('result-score-display');
    if (resultContainer) {
        const oldBoard = document.getElementById('final-stats-board');
        if (oldBoard) oldBoard.remove();
        const oldBoard2 = document.getElementById('final-report-panel');
        if (oldBoard2) oldBoard2.remove();
        
        resultContainer.insertAdjacentHTML('afterend', html);
    }
};



/**
 * ポーズ中は時間を進めない非同期待機関数
 * @param {number} ms - 待機させたい実質的なミリ秒数
 * @param {function} cancelCondition - 途中で待機をキャンセル（スキップ）するための関数
 */
async function waitWithPause(ms, cancelCondition = null) {
    let waited = 0;
    const interval = 20; // 判定の精度（ミリ秒）

    while (waited < ms) {
        // スキップフラグ等が立っていれば即座に待機終了
        if (cancelCondition && cancelCondition()) {
            break;
        }

        if (gameState === 'PAUSED') {
            // ポーズ中は経過時間を加算せずに待機だけ行う
            await new Promise(resolve => setTimeout(resolve, interval));
        } else {
            // ポーズ中以外は経過時間を加算して待機
            await new Promise(resolve => setTimeout(resolve, interval));
            waited += interval;
        }
    }
}
