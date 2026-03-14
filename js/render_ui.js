

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
    if (DEBUG.showHitboxes && Array.isArray(enemies)) {
        ctx.strokeStyle = "rgba(255,80,80,0.95)";
        for (const e of enemies) {
            if (!e) continue;
            const r = e.hitRadius || e.radius || e.size || 16;

            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // -------------------------
    // 3) Enemy target lines
    // -------------------------
    if (DEBUG.showEnemyTargetLines && player && Array.isArray(enemies)) {
        ctx.strokeStyle = "rgba(255,255,0,0.8)";
        for (const e of enemies) {
            if (!e) continue;

            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(player.x, player.y);
            ctx.stroke();
        }
    }

    // -------------------------
    // 4) Spawn points
    // -------------------------
    if (DEBUG.showSpawnPoints && Array.isArray(enemies)) {
        ctx.strokeStyle = "rgba(0,255,120,0.9)";
        for (const e of enemies) {
            if (!e) continue;
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
    overlay.classList.remove("show", "warning", "gold", "compact", "epic-clear");
    overlay.style.removeProperty("--msg-main-color");
    overlay.style.removeProperty("--msg-glow-color");

    if (type) overlay.classList.add(type);
    if (compact) overlay.classList.add("compact");
    if (extraClass) overlay.classList.add(extraClass);

    if (textColor) {
        overlay.style.setProperty("--msg-main-color", textColor);
    }
    if (glowColor) {
        overlay.style.setProperty("--msg-glow-color", glowColor);
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