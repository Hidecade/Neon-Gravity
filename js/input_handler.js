// =========================================================
// Input & Event Handlers (input_handler.js)
// 役割: キーボード、マウス、タッチ、ゲームパッドの入力制御とUIイベントのバインド
// =========================================================

// =========================================================
// 1. 入力状態の管理
// =========================================================

/**
 * すべての入力状態を初期化・リセットする
 * (ポーズ時やゲームパッド切断時などに呼ばれる)
 */
function clearInputState() {
    input.move.x = 0; input.move.y = 0; input.move.active = false;
    input.aim.x = 0; input.aim.y = 0; input.aim.active = false;
    input.keys = {};

    input.padAPressed = false;
    input.padBPressed = false;
    input.padBombPressed = false;
    input.padDirPressed = false;
    input.padStartPressed = false;
    input.padSkipLatch = false;

    // UIスティックの見た目もリセット
    if (ui.knobL) ui.knobL.style.transform = 'translate(0,0)';
    if (ui.knobR) ui.knobR.style.transform = 'translate(0,0)';
}
// =========================================================
// 2. タッチ・マウス用ロジック
// =========================================================

/**
 * 仮想スティック（画面左右のタッチ操作）の制御
 */
function handleTouch(e) {
    if (e.target.id === 'launch-btn') return; // ボムボタンへのタッチは除外
    e.preventDefault();

    const isIntroPlayable =
        (gameState === 'STAGE_INTRO' &&
            typeof introPhase !== 'undefined' &&
            introPhase === 3);

    if (gameState !== 'PLAYING' && !isIntroPlayable) return;

    input.move.active = false;
    input.aim.active = false;

    const canvasRect = canvas.getBoundingClientRect();
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;

    const lR = ui.stickL.getBoundingClientRect();
    const rR = ui.stickR.getBoundingClientRect();

    const lC = {
        x: lR.left + lR.width / 2,
        y: lR.top + lR.height / 2
    };

    const rC = {
        x: rR.left + rR.width / 2,
        y: rR.top + rR.height / 2
    };

    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const tx = t.clientX;
        const ty = t.clientY;

        // canvas表示領域外のタッチは無視
        if (
            tx < canvasRect.left ||
            tx > canvasRect.right ||
            ty < canvasRect.top ||
            ty > canvasRect.bottom
        ) {
            continue;
        }

        // 画面左半分ではなく「canvas左半分」を移動スティックにする
        if (tx < canvasCenterX) {
            const dL = Math.hypot(tx - lC.x, ty - lC.y);

            if (dL < 144) {
                input.move.active = true;

                const a = Math.atan2(ty - lC.y, tx - lC.x);
                const d = Math.min(dL, 48);

                input.move.x = Math.cos(a) * (d / 48);
                input.move.y = Math.sin(a) * (d / 48);

                ui.knobL.style.transform =
                    `translate(${input.move.x * 48}px, ${input.move.y * 48}px)`;
            }
        }
        // canvas右半分を照準スティックにする
        else {
            const dR = Math.hypot(tx - rC.x, ty - rC.y);

            if (dR < 144) {
                input.aim.active = true;

                const a = Math.atan2(ty - rC.y, tx - rC.x);
                const d = Math.min(dR, 48);

                input.aim.x = Math.cos(a) * (d / 48);
                input.aim.y = Math.sin(a) * (d / 48);

                ui.knobR.style.transform =
                    `translate(${input.aim.x * 48}px, ${input.aim.y * 48}px)`;
            }
        }
    }

    // タッチされていない側のスティックを中央に戻す
    if (!input.move.active) {
        input.move.x = 0;
        input.move.y = 0;
        ui.knobL.style.transform = 'translate(0, 0)';
    }

    if (!input.aim.active) {
        input.aim.x = 0;
        input.aim.y = 0;
        ui.knobR.style.transform = 'translate(0, 0)';
    }
}

/**
 * ボム（サテライト射出）ボタンの処理
 */
const handleBombPress = (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (gameState === 'PLAYING') {
        if (typeof launchSatellites === 'function') {
            launchSatellites();
        }

        ui.launchBtn.classList.add('active');
        setTimeout(() => ui.launchBtn.classList.remove('active'), 100);
    }
};

/**
 * ポーズボタン押下時の処理
 */
const handlePauseClick = (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (gameState === 'PLAYING') {
        if (typeof setPaused === 'function') {
            setPaused(true);
        }
    }
};

/**
 * ポーズ解除・ゲーム再開時の処理
 */
// ★修正: async を外す（または残しても中の await を消す）
const resumeAction = (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    canvas.focus();
    setTimeout(() => canvas.focus(), 100);

    // ==========================================
    // ★修正: オーディオ処理を「待たずに」裏で実行させる
    // ==========================================
    if (typeof AudioSys !== 'undefined') {
        if (typeof AudioSys.forceWakeUp === 'function') {
            AudioSys.forceWakeUp(); // awaitを削除！
        }
        
        // 通常のBGM・SE再開処理も await せずに実行（フリーズ完全防止）
        if (typeof AudioSys.resume === 'function') AudioSys.resume(true).catch(err => console.warn(err));
        if (typeof AudioSys.resumeBGM === 'function') AudioSys.resumeBGM(true).catch(err => console.warn(err));
    }

    // ここにすぐ到達するので、フリーズせずにプレイ画面に戻れます
    gameState = previousGameState || 'PLAYING';
    ui.pauseOverlay.style.display = 'none';
};

// =========================================================
// 3. ゲームパッドロジック
// =========================================================

/**
 * ゲームパッドの入力を監視 (毎フレーム main.js の loop から呼ばれる)
 */
function handleGamepadInput() {

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let activeGp = null;

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        // 接続されている有効なパッドを探す
        if (gp && gp.connected) { 
            activeGp = gp; 
            
            // --- フォーカス改善ロジック ---
            // いずれかのボタンが押されているか、スティックが一定以上動かされているか判定
            const isActivelyOperating = 
                gp.buttons.some(b => b.pressed) || 
                gp.axes.some(a => Math.abs(a) > 0.2);

            if (isActivelyOperating) {
                // 現在のフォーカスが名前入力欄などの INPUT 要素にない場合のみ実行
                if (document.activeElement !== canvas && document.activeElement.tagName !== 'INPUT') {
                    canvas.focus();
                    // デバッグ用（必要に応じて）
                    // console.log("Gamepad activity detected: Focusing canvas");
                }
            }
            // ------------------------------
            
            break; 
        }
    }

    if (!activeGp) return;

    // ゲームパッド接続時はタッチUIを隠す
    if (gameState === 'PLAYING' && ui.controls.style.display !== 'none') {
        ui.controls.style.display = 'none';
        ui.pauseBtn.style.display = 'none';
    }

    // ボタンの取得
    const aBtn = activeGp.buttons[0]?.pressed;      // A
    const bBtn = activeGp.buttons[1]?.pressed;      // B
    const xBtn = activeGp.buttons[2]?.pressed;      // X
    const rbBtn = activeGp.buttons[5]?.pressed;     // RB
    const rtBtn = activeGp.buttons[7]?.pressed;     // RT
    const startBtn = activeGp.buttons[9]?.pressed;  // START

    // スティック・十字キーの取得
    const moveX = activeGp.axes[0];
    const moveY = activeGp.axes[1];
    const aimX = activeGp.axes[2];
    const aimY = activeGp.axes[3];
    const dpadUp = activeGp.buttons[12]?.pressed;
    const dpadDown = activeGp.buttons[13]?.pressed;
    const dpadLeft = activeGp.buttons[14]?.pressed;
    const dpadRight = activeGp.buttons[15]?.pressed;

    // 1. STAGE_INTRO のスキップ判定
    if (gameState === 'STAGE_INTRO' && typeof introPhase !== 'undefined' && (introPhase === 1 || introPhase === 2)) {
        const isSkipPressed = (startBtn || aBtn || bBtn || rbBtn);
        if (isSkipPressed && !input.padSkipLatch) {
            if (typeof window.skipStory === 'function') window.skipStory();
            input.padSkipLatch = true;
        }
        if (!isSkipPressed) input.padSkipLatch = false;

        // 誤爆防止
        input.padStartPressed = startBtn;
        input.padAPressed = aBtn;
        input.padBombPressed = (xBtn || bBtn || rbBtn || rtBtn);
        return;
    }

    // 2. ENDING_STORY のスキップ・進行判定
    if (gameState === 'ENDING_STORY') {
        const isSkipPressed = (startBtn || rbBtn); // STARTボタン等でスキップ
        const isNextAction = aBtn; // Aボタンはテキスト完了後のNEXT進行に限定

        if (isSkipPressed && !input.padSkipLatch) {
            if (typeof window.skipStory === 'function') window.skipStory();
            input.padSkipLatch = true;
        }
        if (!isSkipPressed) input.padSkipLatch = false;

        if (isNextAction && !input.padAPressed) {
            const skipBtn = document.getElementById('skip-button');
            // テキストが完走し「NEXT >>」クラスが付与されている場合のみクリックをトリガー
            if (skipBtn && skipBtn.classList.contains('ending-next')) {
                skipBtn.click();
            }
            input.padAPressed = true;
        }
        if (!isNextAction) input.padAPressed = false;

        // 誤爆防止
        input.padStartPressed = startBtn;
        input.padBombPressed = (xBtn || bBtn || rbBtn || rtBtn);
        return;
    }
    
    // --- STARTボタン & Bボタン(戻る) 処理 ---
    
    // 現在どのオーバーレイが開いているかを確認
    const isRankingOpen = document.getElementById('ranking-overlay')?.style.display === 'flex';
    const isOstOpen = document.getElementById('ost-overlay')?.style.display === 'flex';
    const isStoryOpen = document.getElementById('story-overlay')?.style.display === 'flex';
    const isHowToOpen = document.getElementById('howto-overlay')?.style.display === 'flex';
    const isSettingsOpen = document.getElementById('settings-overlay')?.style.display === 'flex';
    
    // どれかのサブメニューが開いているか
    const isSubMenuOpen = isRankingOpen || isOstOpen || isStoryOpen || isHowToOpen || isSettingsOpen;

    // 1. STARTボタン専用のアクション (ゲーム開始、ポーズ、リトライなど)
    if (startBtn && !input.padStartPressed && !isSubMenuOpen) {
        if (gameState === 'PLAYING') {
            setPaused(true);
        }
        else if (gameState === 'PAUSED') {
            resumeAction();
        }
        else if (gameState === 'TITLE') {
            window.focus();
            if (document.activeElement) document.activeElement.blur();
            if (typeof requestFullScreen === 'function') requestFullScreen();
            if (typeof AudioSys !== 'undefined') AudioSys.reset();
            if (typeof startGame === 'function') startGame();
        }
        else if (gameState === 'GAMEOVER_UI') {
            if (typeof resetGame === 'function') resetGame();
        }
    }

    // 2. 「戻る / キャンセル」アクション (START 又は Bボタン)
    const isBackAction = (startBtn && !input.padStartPressed) || (bBtn && !input.padBPressed);

    if (isBackAction) {
        if (isTrainingMode) {
            if (typeof returnToTitleFromTraining === 'function') returnToTitleFromTraining();
        }
        else if (isHowToOpen) {
            const btn = document.getElementById('btn-howto-back');
            if (btn) btn.click();
            else if (typeof hideHowTo === 'function') hideHowTo();
        }
        else if (isSettingsOpen || gameState === 'SETTINGS') {
            const btn = document.getElementById('btn-settings-back');
            if (btn) btn.click();
            else if (typeof closeSetting === 'function') closeSetting();
        }
        else if (isSubMenuOpen || ['STORY', 'RANKING', 'OST'].includes(gameState)) {
            // 各画面の固有の「戻る」ボタンをシミュレートクリックして安全に閉じる
            let backBtnId = '';
            if (isStoryOpen || gameState === 'STORY') backBtnId = 'btn-story-back';
            else if (isRankingOpen || gameState === 'RANKING') backBtnId = 'close-ranking-btn';
            else if (isOstOpen || gameState === 'OST') backBtnId = 'btn-back';
            
            const btn = document.getElementById(backBtnId);
            if (btn && btn.offsetParent !== null) {
                btn.click();
            } else if (typeof returnToTitle === 'function') {
                returnToTitle(); // フォールバック
            }
        }
    }

    // 状態の保存
    input.padStartPressed = startBtn;
    input.padBPressed = bBtn; // Bボタンの長押し防止用

  // --- メニュー操作 (PLAYING以外) ---
    const isIntroPlayable = (gameState === 'STAGE_INTRO' && typeof introPhase !== 'undefined' && introPhase === 3);
    if (gameState !== 'PLAYING' && !isIntroPlayable) {

        // 開いているオーバーレイ（画面）を直接判定する
        const isRankingOpen = document.getElementById('ranking-overlay')?.style.display === 'flex';
        const isOstOpen = document.getElementById('ost-overlay')?.style.display === 'flex';
        const isStoryOpen = document.getElementById('story-overlay')?.style.display === 'flex';
        
        // スクロールすべき画面かどうかのフラグ
        const isScrollScreen = isRankingOpen || isOstOpen || isStoryOpen || ['STORY', 'RANKING', 'OST'].includes(gameState);

        // ---------------------------------------------------------
        // スクロール可能な画面の処理 (STORY, RANKING, OST)
        // ---------------------------------------------------------
        if (isScrollScreen) {
            let targetId = '';
            if (isStoryOpen || gameState === 'STORY') targetId = 'story-scroll-container';
            else if (isRankingOpen || gameState === 'RANKING') targetId = 'ranking-scroll-container';
            else if (isOstOpen || gameState === 'OST') targetId = 'ost-scroll-container';

            const container = document.getElementById(targetId);
            
            // スティックのデッドゾーン(0.2)を超えた場合のみスクロール
            if (container && Math.abs(moveY) > 0.2) {
                // 15はスクロール速度。好みに応じて数値を調整してください
                container.scrollTop += moveY * 15; 
            }
        }

        // カーソル移動 (スクロール画面では上下のカーソル移動を無効化する)
        const isUp = dpadUp || moveY < -0.5;
        const isDown = dpadDown || moveY > 0.5;
        const isLeft = dpadLeft || moveX < -0.5;
        const isRight = dpadRight || moveX > 0.5;
        
        // ★ スクロール画面では上下入力(isUp/isDown)を無視し、スクロールに専念させる
        const shouldMoveCursor = isScrollScreen ? (isLeft || isRight) : (isUp || isDown || isLeft || isRight);

        if (currentMenuButtons.length > 0 && shouldMoveCursor) {
            if (!input.padDirPressed) {
                if (isUp || isLeft) selectedMenuIndex--;
                if (isDown || isRight) selectedMenuIndex++;
                if (typeof window.updateMenuSelectionUI === 'function') window.updateMenuSelectionUI();
            }
            input.padDirPressed = true;
        } else {
            input.padDirPressed = false;
        }

        // Aボタンで決定
        if (aBtn) {
            if (!input.padAPressed) {
                const targetBtn = currentMenuButtons[selectedMenuIndex];
                if (targetBtn) targetBtn.click();
                input.padAPressed = true;
                setTimeout(() => { if (window.refreshMenuButtons) window.refreshMenuButtons(false); }, 250);
            }
        } else {
            input.padAPressed = false;
        }
        return;
    }

    // --- ゲームプレイ操作 ---
    input.padAPressed = aBtn; // 射撃

    // 移動制御
    const moveDeadzone = 0.2;
    if (Math.abs(moveX) > moveDeadzone || Math.abs(moveY) > moveDeadzone) {
        input.move.active = true;
        input.move.x = moveX;
        input.move.y = moveY;
    } else {
        // キーボード入力がない場合のみ停止
        if (input.move.active && !input.keys['KeyA'] && !input.keys['KeyD'] && !input.keys['KeyW'] && !input.keys['KeyS']) {
            input.move.x = 0; input.move.y = 0; input.move.active = false;
        }
    }

    // 照準制御
    const aimDeadzone = 0.2;
    if (Math.abs(aimX) > aimDeadzone || Math.abs(aimY) > aimDeadzone) {
        input.aim.active = true;
        input.aim.x = aimX;
        input.aim.y = aimY;
    } else {
        input.aim.active = false;
    }

    // ボム制御
    const bombBtn = xBtn || bBtn || rbBtn || rtBtn;
    if (bombBtn && !input.padBombPressed) {
        if (typeof launchSatellites === 'function') launchSatellites();
    }
    input.padBombPressed = bombBtn;
}

// =========================================================
// 4. グローバルシステムイベント
// =========================================================

/**
 * iOS/ブラウザの制限を解除し、AudioContextを強制的に叩き起こす
 */
const handleInteraction = () => {
    // ★修正: 先ほど追加した forceWakeUp を呼ぶように変更
    if (typeof AudioSys !== 'undefined' && typeof AudioSys.forceWakeUp === 'function') {
        AudioSys.forceWakeUp();
    }
};

// =========================================================
// 5. 一括初期化 (main.js の init から呼び出す)
// =========================================================

function initInputHandlers() {

    // -----------------------------------------------------
    // A. キーボード制御
    // -----------------------------------------------------
    window.addEventListener('keydown', e => {
        // 名前入力中はショートカットを無効化
        if (document.activeElement === document.getElementById('player-name-input')) return;

        // ブラウザのデフォルト操作(スクロール等)を防止
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();

        input.keys[e.code] = true;

        if (typeof resetTitleIdle === 'function' && resetTitleIdle()) return;

        if (gameState === 'TITLE' && e.code === 'Space') {
            if (typeof startGame === 'function') startGame();
        }
        if (gameState === 'PLAYING' && e.code === 'KeyX') {
            if (typeof launchSatellites === 'function') launchSatellites();
        }
        if (gameState === 'STAGE_INTRO' && typeof introPhase !== 'undefined' && (introPhase === 1 || introPhase === 2)) {
            if (e.code === 'Space' && !e.repeat) {
                if (typeof window.skipStory === 'function') window.skipStory();
            }
        }

        if (e.code === "F3") {
            e.preventDefault();
            if (DEBUG.enabled) DEBUG.showOverlay = !DEBUG.showOverlay;
            return;
        }

        if (e.code === "F4") {
            e.preventDefault();
            if (DEBUG.enabled) DEBUG.showHitboxes = !DEBUG.showHitboxes;
            return;
        }

        if (e.code === "F5") {
            e.preventDefault();
            if (DEBUG.enabled) DEBUG.showEnemyTargetLines = !DEBUG.showEnemyTargetLines;
            return;
        }

        if (e.code === "F6") {
            e.preventDefault();
            if (DEBUG.enabled) DEBUG.showSpawnPoints = !DEBUG.showSpawnPoints;
            return;
        }
    });

    window.addEventListener('keyup', e => input.keys[e.code] = false);

    // -----------------------------------------------------
    // B. オンスクリーンUI (スティック・ボタン)
    // -----------------------------------------------------
    if (ui.controls) {
        ui.controls.addEventListener('touchstart', handleTouch, { passive: false });
        ui.controls.addEventListener('touchmove', handleTouch, { passive: false });
        ui.controls.addEventListener('touchend', handleTouch, { passive: false });
    }
    if (ui.launchBtn) {
        ui.launchBtn.addEventListener('touchstart', handleBombPress, { passive: false });
        ui.launchBtn.addEventListener('mousedown', handleBombPress);
    }
    if (ui.pauseBtn) {
        ui.pauseBtn.addEventListener('click', handlePauseClick);
        ui.pauseBtn.addEventListener('touchstart', handlePauseClick, { passive: false });
    }

    // -----------------------------------------------------
    // C. ゲームパッド接続イベント
    // -----------------------------------------------------
    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected: " + e.gamepad.id);
        if (gameState === 'PLAYING') {
            ui.controls.style.display = 'none';
            ui.pauseBtn.style.display = 'none';
        }
        // ==========================================
        // ゲームパッド接続時は威力・寿命を標準にする
        // ==========================================
        if (typeof BULLET_CONFIG !== 'undefined') {
            BULLET_CONFIG.PLAYER.POWER = BULLET_CONFIG.PLAYER.BASE_POWER;
            BULLET_CONFIG.PLAYER.LIFE = BULLET_CONFIG.PLAYER.BASE_LIFE; 
            console.log("Gamepad active: Bullet power set to", BULLET_CONFIG.PLAYER.POWER, "LIFE set to", BULLET_CONFIG.PLAYER.LIFE);
        }
    });
    window.addEventListener("gamepaddisconnected", (e) => {
        console.log("Gamepad disconnected");
        if (gameState === 'PLAYING') {
            ui.controls.style.display = 'block';
            ui.pauseBtn.style.display = 'flex';
        }
        clearInputState();
        // ==========================================
        // ゲームパッド切断時（タッチ/キーボード操作時）は威力・寿命を上げる
        // ==========================================
        if (typeof BULLET_CONFIG !== 'undefined') {
            BULLET_CONFIG.PLAYER.POWER = BULLET_CONFIG.PLAYER.TOUCH_POWER;
            BULLET_CONFIG.PLAYER.LIFE = BULLET_CONFIG.PLAYER.TOUCH_LIFE; 
            console.log("Gamepad disconnected: Bullet power set to", BULLET_CONFIG.PLAYER.POWER, "LIFE set to", BULLET_CONFIG.PLAYER.LIFE);
        }
    });

    // -----------------------------------------------------
    // D. ウィンドウ・システムイベント監視
    // -----------------------------------------------------

    // 1. タイトル画面放置判定のリセット
    const resetIdle = () => { if (typeof resetTitleIdle === 'function') resetTitleIdle(); };
    document.addEventListener('mousedown', resetIdle);
    document.addEventListener('touchstart', resetIdle, { passive: true });

    // 2. オーディオのロック解除監視
    document.addEventListener('click', handleInteraction, { passive: true });
    document.addEventListener('touchstart', handleInteraction, { passive: true });
    document.addEventListener('touchend', handleInteraction, { passive: true })
    document.addEventListener('keydown', handleInteraction, { passive: true });

    // 3. バックグラウンド移行時のポーズ制御
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (typeof setPaused === 'function') setPaused(true);
            if (typeof AudioSys !== 'undefined' && AudioSys.bgmEl) AudioSys.bgmEl.pause();
        }
    });
    window.addEventListener('blur', () => {
        if (document.hidden) {
            if (typeof setPaused === 'function') setPaused(true);
            if (typeof AudioSys !== 'undefined' && AudioSys.bgmEl) AudioSys.bgmEl.pause();
        }
    });
    window.addEventListener('focus', () => {
        // プレイ中、導入中、死亡演出中、またはワープ中のみ再開を許可する
        const activeStates = ['PLAYING', 'STAGE_INTRO', 'DYING'];
        const isWarping = typeof isWarpingOut !== 'undefined' && isWarpingOut;

        if (activeStates.includes(gameState) || isWarping) {
            if (typeof AudioSys !== 'undefined') {
                AudioSys.resumeBGM(false);
            }
        }
    })

    // -----------------------------------------------------
    // E. 各種メニューUIボタンのバインド
    // -----------------------------------------------------

    // ポーズメニュー
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.onclick = (e) => { e.preventDefault(); resumeAction(); };

    const btnQuit = document.getElementById('btn-quit');
    if (btnQuit) btnQuit.onclick = (e) => {
        e.preventDefault();
        ui.pauseOverlay.style.display = 'none';
        if (typeof returnToTitle === 'function') returnToTitle();
    };

    // TITLE画面・GAMEOVER画面のスタート/リトライボタン
    const startBtnElement = document.getElementById('btn-start');
    if (startBtnElement) {
        // イベントの重複登録を防ぐため、ノードをクローンして置き換える
        const newBtn = startBtnElement.cloneNode(true);
        startBtnElement.parentNode.replaceChild(newBtn, startBtnElement);
        ui.btnStart = newBtn;

        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof requestFullScreen === 'function') requestFullScreen();
            if (typeof AudioSys !== 'undefined') AudioSys.reset();
            if (document.activeElement) document.activeElement.blur();

            const gameCanvas = document.getElementById('game');
            if (gameCanvas) gameCanvas.focus();
            window.focus();

            setTimeout(() => {
                if (gameState === 'GAMEOVER_UI' || newBtn.innerText === 'RETRY') {
                    if (typeof resetGame === 'function') resetGame();
                } else {
                    if (typeof startGame === 'function') startGame();
                }
            }, 50);
        });
    }

    // HowTo ボタンの独自処理
    const btnHowTo = document.getElementById('btn-howto');
    if (btnHowTo) {
        btnHowTo.onclick = (e) => {
            if (e) e.stopPropagation();
            if (typeof showHowTo === 'function') showHowTo();
        };
    }

// ▼ ここから追加: FPSタップ表示の切り替え＆ポーズ中の画質切り替え処理
    const fpsZone = document.getElementById('simple-fps-zone');
    const fpsText = document.getElementById('simple-fps-text');
    if (fpsZone && fpsText) {
        let isFpsVisible = false;
        const handleFpsZoneClick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (gameState === 'PAUSED') {
                // --- ポーズ中の場合：グラフィック品質をローテーションで切り替える ---
                // ★修正: 配列の先頭に 'ULTRA' を追加！
                const qualities = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW'];
                let currentIndex = qualities.indexOf(currentGraphicsQuality);
                
                // 万が一見つからなかった場合の安全対策
                if (currentIndex === -1) currentIndex = 0;

                let nextIndex = (currentIndex + 1) % qualities.length;
                let nextQuality = qualities[nextIndex];
                
                // すでに定義されている applyGraphicsQuality 関数があれば呼び出す
                if (typeof applyGraphicsQuality === 'function') {
                    applyGraphicsQuality(nextQuality);
                } else {
                    // フォールバック（念のため直接設定を更新）
                    currentGraphicsQuality = nextQuality;
                    const settings = GRAPHICS_SETTINGS[currentGraphicsQuality];
                    GRID_SPACING = settings.gridSpacing;
                    EXPLOSION_COUNT_MAG = settings.explosionMag;
                }

                // 画面中央に現在の品質を短時間表示してフィードバック
                if (typeof showGameMessage === 'function') {
                    showGameMessage({
                        main: `QUALITY: ${nextQuality}`,
                        type: 'compact',
                        duration: 1000
                    });
                }
            } else {
                // --- ポーズ中以外の場合：従来のFPS表示/非表示切り替え ---
                isFpsVisible = !isFpsVisible;
                fpsText.style.opacity = isFpsVisible ? '1' : '0';
            }
        };
        fpsZone.addEventListener('mousedown', handleFpsZoneClick);
        fpsZone.addEventListener('touchstart', handleFpsZoneClick, { passive: false });
    }

    // その他汎用ボタンの一括バインド用ヘルパー
    const bindBtn = (id, func) => {
        const el = document.getElementById(id);
        if (el) el.onclick = (e) => {
            if (e) e.stopPropagation();
            if (typeof func === 'function') func();
        };
    };

    bindBtn('btn-ost', openOST);
    bindBtn('btn-back', closeOST);
    bindBtn('btn-story', openStory);
    bindBtn('btn-story-back', closeStory);
    bindBtn('btn-howto-back', hideHowTo);
    bindBtn('btn-extreme-ta', startExtremeTimeAttack);
    bindBtn('btn-howto-next', startTraining);
    bindBtn('btn-training-exit', returnToTitleFromTraining);
    bindBtn('btn-settings', openSetting);
    bindBtn('btn-settings-back', closeSetting);
    bindBtn('btn-retry', resetGame);
    bindBtn('btn-gameover-title', returnToTitle);

// -----------------------------------------------------
    // F. SETTINGS（画質設定）メニューのバインド
    // -----------------------------------------------------

    bindBtn('btn-gfx-ultra', () => {
        if (typeof applyGraphicsQuality === 'function') applyGraphicsQuality('ULTRA');
    });

    bindBtn('btn-gfx-high', () => {
        if (typeof applyGraphicsQuality === 'function') applyGraphicsQuality('HIGH');
    });

    bindBtn('btn-gfx-medium', () => {
        if (typeof applyGraphicsQuality === 'function') applyGraphicsQuality('MEDIUM');
    });

    bindBtn('btn-gfx-low', () => {
        if (typeof applyGraphicsQuality === 'function') applyGraphicsQuality('LOW');
    });

    // ==========================================
    // ゲーム起動時の初期コントローラー判定
    // ==========================================
    if (typeof BULLET_CONFIG !== 'undefined') {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let hasGamepad = false;
        
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i] && gamepads[i].connected) {
                hasGamepad = true;
                break;
            }
        }
        
        BULLET_CONFIG.PLAYER.POWER = hasGamepad ? BULLET_CONFIG.PLAYER.BASE_POWER : BULLET_CONFIG.PLAYER.TOUCH_POWER;
        BULLET_CONFIG.PLAYER.LIFE = hasGamepad ? BULLET_CONFIG.PLAYER.BASE_LIFE : BULLET_CONFIG.PLAYER.TOUCH_LIFE; 
        
        console.log("Initial Setup - Bullet power set to:", BULLET_CONFIG.PLAYER.POWER, "LIFE set to:", BULLET_CONFIG.PLAYER.LIFE);
    }
} 
