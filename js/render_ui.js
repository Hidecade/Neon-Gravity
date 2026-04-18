

function updateUI() {
    const isExtremeMode = (typeof isExtremeTimeAttackMode === 'function') && isExtremeTimeAttackMode();
    const extremeState = (typeof getExtremeTimeAttackState === 'function') ? getExtremeTimeAttackState() : null;

    // ==========================================
    // 1. BOSS & BATTLESHIP ゲージ
    // ==========================================
    const currentBoss = enemyPool.pool.find(e => e.active && (e.type === 'boss' || e.type === 'battleship'));

    if (currentBoss && !currentBoss.isDead) {
        ui.bossContainer.style.display = 'block';
        const hpPct = Math.max(0, (currentBoss.hp / currentBoss.maxHp) * 100);
        const bColor = currentBoss.color || '#ff0000';

        ui.bossHpBarInline.style.width = hpPct + "%";

        // ==========================================
        // ★ ここで「黒に近いボスの色」と「半透明のボスの色」を動的に生成
        // ==========================================
        // darkColor: ボスの色を40%、黒を60%混ぜた「指定色帯びた暗黒色」
        const darkColor = `color-mix(in srgb, ${bColor} 40%, black)`;
        
        // semiTransColor: ボスの色を40%、透明色を60%混ぜた「指定色の半透明」
        const semiTransColor = `color-mix(in srgb, ${bColor} 40%, transparent)`;

        if (currentBoss.type === 'battleship') {
            ui.bossNameLabel.innerText = "GENESIS-ARK";
            ui.bossNameLabel.style.color = bColor;
            
            // 元の rgba(0, 255, 255, 0.4) の代わりに、動的生成した半透明色を使用
            ui.bossHpBarInline.style.background = `linear-gradient(90deg, ${semiTransColor}, ${bColor})`;
            ui.bossHpBarInline.style.boxShadow = `0 0 calc(12px * var(--hud-scale, 1)) ${bColor}`;
            ui.bossBarFrame.style.borderColor = bColor;
            
        } else {
            ui.bossNameLabel.innerText = currentBoss.variant ? currentBoss.variant.name : 'UNKNOWN';
            ui.bossNameLabel.style.color = bColor;
            
            // ★ transparent（完全な透明＝下地の黒）ではなく、指定色を帯びた黒（darkColor）を指定
            ui.bossHpBarInline.style.background = `linear-gradient(90deg, ${darkColor}, ${bColor})`;
            ui.bossHpBarInline.style.boxShadow = `0 0 calc(12px * var(--hud-scale, 1)) ${bColor}`;
            ui.bossBarFrame.style.borderColor = darkColor; 
        }

        // --- (お好みで追加) ゲージの減った部分（背景）もうっすらボスの色にする場合 ---
        // ui.bossBarFrame.style.backgroundColor = `color-mix(in srgb, ${bColor} 10%, black)`;

        // ピンチ時の点滅演出
        if (hpPct < 25 && frame % 10 < 5) {
            ui.bossHpBarInline.style.background = '#fff';
            ui.bossHpBarInline.style.boxShadow = `0 0 calc(15px * var(--hud-scale, 1)) #fff`;
        }
    } else {
        if (ui.bossContainer) ui.bossContainer.style.display = 'none';
    }

    // ==========================================
    // 2. ENEMY ゲージ
    // ==========================================
    // ★JSでの強制上書きを解除し、CSSの美しい赤グラデーション設定を100%優先！
    ui.enemyBar.style.background = '';
    ui.enemyBar.style.boxShadow = '';

    if (isExtremeMode && extremeState) {
        const gaugePct = extremeState.maxGaugeFrames > 0
            ? Math.max(0, Math.min(100, (extremeState.gaugeFrames / extremeState.maxGaugeFrames) * 100))
            : 0;
        const targetSec = Math.floor((extremeState.targetFrames || 0) / 60);
        const survivedSec = Math.floor((extremeState.survivalFrames || 0) / 60);
        const remainSec = Math.max(0, targetSec - survivedSec);

        ui.enemyBar.style.width = `${gaugePct}%`;
        document.querySelector('.bar-label.enemy').innerText = `CORE: ${Math.max(0, extremeState.gaugeFrames / 60).toFixed(1)}s`;
        ui.stage.innerText = `TA ${remainSec}s`;
    } else if (stage === 9) {
        const progress = rushBossIndex / 8;
        ui.enemyBar.style.width = `${(1 - progress) * 100}%`;
        document.querySelector('.bar-label.enemy').innerText = `BOSS RUSH: ${rushBossIndex}/8`;
    } else if (stage === 10) {
        ui.enemyBar.style.width = "100%";
        document.querySelector('.bar-label.enemy').innerText = `ENEMY: ∞`;
    } else {
        // ==========================================
        // ★修正：倒した数と逃げられた数を合計して、残り数を計算する
        // ==========================================
        const escaped = window.enemiesEscaped || 0;
        const rawRemains = enemiesToSpawn - (enemiesKilled + escaped);
        const enemyRemains = Math.max(0, Math.ceil(rawRemains));

        if (isTrainingMode || enemiesToSpawn <= 0) {
            ui.enemyBar.style.width = '0%';
            document.querySelector('.bar-label.enemy').innerText = isTrainingMode ? 'TRAINING' : 'ENEMY: 0';
        } else {
            ui.enemyBar.style.width = `${(enemyRemains / enemiesToSpawn) * 100}%`;
            document.querySelector('.bar-label.enemy').innerText = `ENEMY: ${enemyRemains}`;
        }
        ui.stage.innerText = stage;
    }


    // ==========================================
    // 3. SHIELD ゲージ
    // ==========================================
    const shieldPercent = Math.max(0, (player.shield / PLAYER_BASE_SHIELD) * 100);
    ui.shieldBar.style.width = shieldPercent + "%";

    if (player.shield < PLAYER_BASE_SHIELD * 0.3) {
        ui.shieldBar.classList.add('shield-critical');
        
        // ①確実な赤色指定（青色が出ないように完全上書き）
        ui.shieldBar.style.background = 'linear-gradient(90deg, rgba(255, 51, 51, 0.4), rgb(255, 51, 51))';
        
        // ②フレーム数を利用した確実な点滅アニメーション
        if (frame % 30 < 15) {
            // 光る状態
            ui.shieldBar.style.opacity = '1';
            ui.shieldBar.style.boxShadow = '0 0 calc(10px * var(--hud-scale, 1)) rgb(255, 51, 51)';
        } else {
            // 暗くなる状態
            ui.shieldBar.style.opacity = '0.4';
            ui.shieldBar.style.boxShadow = '0 0 calc(2px * var(--hud-scale, 1)) rgb(255, 51, 51)';
        }
    } else {
        ui.shieldBar.classList.remove('shield-critical');
        ui.shieldBar.style.opacity = '1'; // 通常時は不透明に戻す
        
        // 通常時：エメラルドグリーン
        let r = 0, g = 255, b = 180; 
        ui.shieldBar.style.background = `linear-gradient(90deg, rgba(${r}, ${g}, ${b}, 0.4), rgb(${r}, ${g}, ${b}))`;
        ui.shieldBar.style.boxShadow = `0 0 calc(8px * var(--hud-scale, 1)) rgb(${r}, ${g}, ${b})`;
    }
    
    if (ui.shieldVal) ui.shieldVal.innerText = Math.floor(Math.max(0, player.shield));


    // ==========================================
    // 4. WEAPON / OVERDRIVE ゲージ
    // ==========================================
    const weaponLabel = document.getElementById('weapon-label');
    ui.weaponDisplay.innerHTML = '';

    if (player.overdriveTimer > 0) {
        if (weaponLabel) {
            weaponLabel.innerText = "OVERDRIVE";
            weaponLabel.style.color = "rgb(255, 136, 0)";
            weaponLabel.style.textShadow = "0 0 10px rgb(255, 136, 0)";
        }
        
        // ==========================================
        // ★修正: 計算エラー(NaN)を防ぐ鉄壁のガード！
        // ==========================================
        const maxTime = player.maxOverdriveTimer ? player.maxOverdriveTimer : 400;
        let pct = (player.overdriveTimer / maxTime) * 100;
        if (isNaN(pct)) pct = 100; // 万が一計算エラーになっても100%で表示させる
        pct = Math.min(100, Math.max(0, pct)); // 0〜100の間に収める
        
        const frameDiv = document.createElement('div');
        frameDiv.className = 'laser-bar-frame';
        frameDiv.style.borderColor = 'rgba(255, 136, 0, 0.4)';

        const fillDiv = document.createElement('div');
        fillDiv.className = 'laser-bar-fill';
        fillDiv.style.width = pct + '%'; // ここに計算結果が入る
        fillDiv.style.background = "linear-gradient(90deg, rgba(255, 136, 0, 0.4), rgb(255, 136, 0))";
        fillDiv.style.boxShadow = "0 0 calc(8px * var(--hud-scale, 1)) rgb(255, 136, 0)";

        if (player.overdriveTimer < 120 && Math.floor(frame / 4) % 2 === 0) fillDiv.style.opacity = 0.3;
        frameDiv.appendChild(fillDiv);
        ui.weaponDisplay.appendChild(frameDiv);

    } else if (player.laserTimer > 0) {
        if (weaponLabel) {
            weaponLabel.innerText = "LASER";
            weaponLabel.style.color = "rgb(0, 255, 255)";
            weaponLabel.style.textShadow = "0 0 10px rgb(0, 255, 255)";
        }
        const pct = Math.min(100, Math.max(0, (player.laserTimer / LASER_DURATION) * 100));
        
        const frameDiv = document.createElement('div');
        frameDiv.className = 'laser-bar-frame';
        frameDiv.style.borderColor = 'rgba(0, 255, 255, 0.4)';

        const fillDiv = document.createElement('div');
        fillDiv.className = 'laser-bar-fill';
        fillDiv.style.width = pct + '%';
        // ★ LASERのシアン色はCSS側に .laser-bar-fill として定義済みなのでJSは手出ししない！
        fillDiv.style.background = '';
        fillDiv.style.boxShadow = '';

        if (player.laserTimer < 120 && Math.floor(frame / 4) % 2 === 0) fillDiv.style.opacity = 0.3;
        frameDiv.appendChild(fillDiv);
        ui.weaponDisplay.appendChild(frameDiv);

    } else {
        if (weaponLabel) {
            weaponLabel.innerText = "WEAPON";
            weaponLabel.style.color = "rgba(200, 240, 255, 0.9)"; // CSSのデフォルト色に戻す
            weaponLabel.style.textShadow = "none";
        }
        for (let i = 1; i <= MAX_WEAPON_LEVEL; i++) {
            const block = document.createElement('div');
            block.className = 'w-block';
            if (i <= player.weaponLevel) block.classList.add('active');
            ui.weaponDisplay.appendChild(block);
        }
    }


    // ==========================================
    // 5. INVINCIBLE ゲージ
    // ==========================================
    if (player.invuln > 20) {
        ui.invulnWrapper.style.display = 'block';
        const pct = Math.min(100, (player.invuln / INVULN_DURATION) * 100);
        ui.invulnBar.style.width = pct + "%";
        
        // CSSフォーマットに合わせてイエローを注入
        ui.invulnBar.style.background = "linear-gradient(90deg, rgba(255, 255, 0, 0.4), rgb(255, 255, 0))";
        ui.invulnBar.style.boxShadow = "0 0 calc(8px * var(--hud-scale, 1)) rgb(255, 255, 0)";
        ui.invulnBar.style.borderColor = "rgba(255, 255, 0, 0.4)";

        if (player.invuln < 120 && Math.floor(frame / 4) % 2 === 0) ui.invulnBar.style.opacity = 0.3;
        else ui.invulnBar.style.opacity = 1.0;
    } else {
        ui.invulnWrapper.style.display = 'none';
    }

    if (typeof drawMiniMap === 'function') drawMiniMap();
}

function drawMiniMap() {
    // プレイ中または死亡演出中以外は非表示
    const container = document.getElementById('minimap-container');
    if (gameState !== 'PLAYING' && gameState !== 'DYING' && gameState !== 'STAGE_INTRO') {
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
    enemyPool.pool.forEach(e => {
        // ★追加: 非アクティブ（プール内待機中）のオブジェクトはミニマップに描画しない
        if (!e.active) return;

        if (e.type === 'boss') {
            // ボス：大きな赤点（点滅）
            miniMapCtx.fillStyle = (frame % 30 < 15) ? '#f00' : '#fff';
            miniMapCtx.beginPath();
            miniMapCtx.arc(e.x * scale, e.y * scale, 3.5, 0, Math.PI * 2);
            miniMapCtx.fill();
            // ボスのグロー効果
            //miniMapCtx.shadowBlur = 5;
            miniMapCtx.shadowColor = '#f00';
        } else {
            // 雑魚敵：小さな紫点
            miniMapCtx.fillStyle = e.color || '#f0f';
            //miniMapCtx.shadowBlur = 0;
            miniMapCtx.fillRect(e.x * scale - 1, e.y * scale - 1, 2, 2);
        }
    });

    // 4. 自機の位置（緑の点 + 軽い光）
    miniMapCtx.fillStyle = '#0f0';
    //miniMapCtx.shadowBlur = 8;
    miniMapCtx.shadowColor = '#0f0';
    miniMapCtx.beginPath();
    miniMapCtx.arc(player.x * scale, player.y * scale, 2.5, 0, Math.PI * 2);
    miniMapCtx.fill();

    // シャドウ設定をリセット（他への影響を防ぐ）
    miniMapCtx.shadowBlur = 0;
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

}

function drawDebugWorldOverlay() {
    if (!DEBUG.enabled) return;

    ctx.save();
    ctx.lineWidth = 1 / cameraScale;

    // -------------------------
    // 1) Player hitbox
    // -------------------------
    if (DEBUG.showHitboxes && player) {
        ctx.strokeStyle = "rgba(0,255,255,0.95)";
        const r = player.hitRadius || player.radius || 8;
        ctx.beginPath();
        ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x - 12, player.y);
        ctx.lineTo(player.x + 12, player.y);
        ctx.moveTo(player.x, player.y - 12);
        ctx.lineTo(player.x, player.y + 12);
        ctx.stroke();
    }

    // -------------------------
    // 2) Enemy hitboxes
    // -------------------------
    if (DEBUG.showHitboxes && typeof enemyPool !== 'undefined' && Array.isArray(enemyPool.pool)) {
        ctx.strokeStyle = "rgba(255,80,80,0.95)";
        for (const e of enemyPool.pool) {
            if (!e || !e.active) continue;

            // 基本となる当たり判定の半径を敵の種類から推測
            let baseR = e.hitRadius || e.radius;
            if (!baseR) {
                if (e.type === 'asteroid' || e.type === 'bubble') {
                    baseR = 22 * 0.85; // 岩・泡の基本当たり判定
                } else if (e.type === 'boss' || e.type === 'battleship') {
                    baseR = 40; // ボス系の基本判定
                } else {
                    baseR = 16; // その他の雑魚のデフォルト
                }
            }

            // ★修正: e.scale と G_SCALE を掛け算して実際のサイズに合わせる
            let currentScale = e.scale || 1.0;
            if (typeof G_SCALE !== 'undefined') currentScale *= G_SCALE;

            const finalRadius = baseR * currentScale;

            ctx.beginPath();
            ctx.arc(e.x, e.y, finalRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // -------------------------
    // 3) Enemy target lines
    // -------------------------
    if (DEBUG.showEnemyTargetLines && player && typeof enemyPool !== 'undefined' && Array.isArray(enemyPool.pool)) {
        ctx.strokeStyle = "rgba(255,255,0,0.8)";
        for (const e of enemyPool.pool) {
            // ★追加: 待機中データを除外
            if (!e || !e.active) continue;

            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(player.x, player.y);
            ctx.stroke();
        }
    }

    // -------------------------
    // 4) Spawn points
    // -------------------------
    if (DEBUG.showSpawnPoints && typeof enemyPool !== 'undefined' && Array.isArray(enemyPool.pool)) {
        ctx.strokeStyle = "rgba(0,255,120,0.9)";
        for (const e of enemyPool.pool) {
            // ★追加: 待機中データを除外
            if (!e || !e.active) continue;
            if (typeof e.spawnX !== "number" || typeof e.spawnY !== "number") continue;

            ctx.beginPath();
            ctx.arc(e.spawnX, e.spawnY, 10, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(e.spawnX - 8, e.spawnY);
            ctx.lineTo(e.spawnX + 8, e.spawnY);
            ctx.moveTo(e.spawnX, e.spawnY - 8);
            ctx.lineTo(e.spawnX, e.spawnY + 8);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(e.spawnX, e.spawnY);
            ctx.lineTo(e.x, e.y);
            ctx.stroke();
        }
    }

    ctx.restore();
}

let gameMessageHideTimer = null;
let gameMessageFadeHandler = null;

function showGameMessage({
    main = "",
    sub = "",
    kicker = "",
    type = "",
    compact = false,
    duration = 0,
    textColor = "",
    glowColor = "",
    extraClass = ""
} = {}) {
    const overlay = document.getElementById("game-message-overlay");
    const mainEl = document.getElementById("game-message-main");
    const subEl = document.getElementById("game-message-sub");
    const kickerEl = document.getElementById("game-message-kicker");

    if (!overlay || !mainEl || !subEl || !kickerEl) return;

    // 以前の自動非表示タイマー解除
    if (gameMessageHideTimer) {
        clearTimeout(gameMessageHideTimer);
        gameMessageHideTimer = null;
    }

    // 前回の transitionend ハンドラ解除
    if (gameMessageFadeHandler) {
        overlay.removeEventListener("transitionend", gameMessageFadeHandler);
        gameMessageFadeHandler = null;
    }

    // 内容更新
    mainEl.innerHTML = main;
    subEl.textContent = sub || "";
    kickerEl.textContent = kicker || "";

    // 状態リセット
    overlay.classList.remove("show", "warning", "gold", "compact", "epic-clear", "story-fade");
    overlay.style.removeProperty("--msg-main-color");
    overlay.style.removeProperty("--msg-glow-color");
    overlay.style.removeProperty("--msg-sub-color");

    // 直接指定していた色も戻す
    kickerEl.style.color = "";
    subEl.style.color = "";

    if (type) overlay.classList.add(type);
    if (compact) overlay.classList.add("compact");
    if (extraClass) overlay.classList.add(extraClass);

    if (textColor) {
        overlay.style.setProperty("--msg-main-color", textColor);

        // sub / kicker は textColor をかなり明るくした白寄り色
        const softWhite = (typeof lightenHex === "function")
            ? lightenHex(textColor, 85)
            : "#f4f8ff";

        overlay.style.setProperty("--msg-sub-color", softWhite);
    }

    if (glowColor) {
        overlay.style.setProperty("--msg-glow-color", glowColor);
    }

    // textColor未指定時の既定色
    if (!textColor) {
        overlay.style.setProperty("--msg-sub-color", "#eef6ff");
    }

    // 表示を戻してから次フレームで show を付ける
    overlay.style.display = "flex";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.classList.add("show");
        });
    });

    if (duration > 0) {
        gameMessageHideTimer = setTimeout(() => {
            hideGameMessage();
        }, duration);
    }
}

function hideGameMessage(immediate = false) {
    const overlay = document.getElementById("game-message-overlay");
    if (!overlay) return;

    if (gameMessageHideTimer) {
        clearTimeout(gameMessageHideTimer);
        gameMessageHideTimer = null;
    }

    if (gameMessageFadeHandler) {
        overlay.removeEventListener("transitionend", gameMessageFadeHandler);
        gameMessageFadeHandler = null;
    }

    // 即消し
    if (immediate) {
        overlay.classList.remove("show", "warning", "gold", "compact", "epic-clear", "story-fade");
        overlay.style.display = "none";
        return;
    }

    // すでに非表示なら何もしない
    if (!overlay.classList.contains("show")) {
        overlay.style.display = "none";
        return;
    }

    gameMessageFadeHandler = (e) => {
        if (e.target !== overlay) return;
        overlay.style.display = "none";
        overlay.removeEventListener("transitionend", gameMessageFadeHandler);
        gameMessageFadeHandler = null;
    };

    overlay.addEventListener("transitionend", gameMessageFadeHandler);

    // フェードアウト開始
    overlay.classList.remove("show");
}



