


function drawCanvasHud() {
    const isPortrait =
        (typeof VIEWPORT !== 'undefined' && VIEWPORT.mode)
            ? VIEWPORT.mode === 'portrait'
            : height > width;

    // =========================================================
    // HUDデザイン設定
    // =========================================================
    const HUD_MARGIN_RATIO = 0.018;
    const HUD_LINE_GAP_RATIO = 0.012;

    const HUD_FONT_LABEL_RATIO_PORTRAIT = 0.024;
    const HUD_FONT_LABEL_RATIO_LANDSCAPE = 0.024;

    const HUD_FONT_VALUE_RATIO_PORTRAIT = 0.034;
    const HUD_FONT_VALUE_RATIO_LANDSCAPE = 0.028;

    const HUD_LEFT_PANEL_WIDTH_RATIO_PORTRAIT = 0.30;
    const HUD_LEFT_PANEL_WIDTH_RATIO_LANDSCAPE = 0.20;

    const HUD_RIGHT_PANEL_WIDTH_RATIO_PORTRAIT = 0.30;
    const HUD_RIGHT_PANEL_WIDTH_RATIO_LANDSCAPE = 0.20;

    const HUD_LABEL_COLOR = '#9f9f9f';
    const HUD_VALUE_COLOR = '#00f6ff';

    const HUD_SHIELD_COLOR = '#0ff';
    const HUD_SHIELD_COLOR_CRITICAL = '#ff7070';

    const HUD_WEAPON_ACTIVE = '#00ff55';
    const HUD_WEAPON_INACTIVE = 'rgba(255,255,255,0.16)';

    const HUD_LASER_COLOR = '#00f6ff';
    const HUD_INVINCIBLE_COLOR = '#ffe800';
    const HUD_ENEMY_COLOR = '#ff4a4a';
    const HUD_BOSS_ACTIVE_COLOR = '#ff7070';

    const LEFT_ROW_STEP = 0.7;
    const RIGHT_ROW_STEP = 0.95;
    const MINIMAP_SCALE = 0.8;

    // =========================================================
    // canvasサイズ基準で計算
    // =========================================================
    const shortSideCanvas = Math.min(width, height);

    const marginX = shortSideCanvas * HUD_MARGIN_RATIO;
    const marginY = shortSideCanvas * HUD_MARGIN_RATIO;
    const lineGap = shortSideCanvas * HUD_LINE_GAP_RATIO;

    const fontLabel = shortSideCanvas *
        (isPortrait ? HUD_FONT_LABEL_RATIO_PORTRAIT : HUD_FONT_LABEL_RATIO_LANDSCAPE);

    const fontValue = shortSideCanvas *
        (isPortrait ? HUD_FONT_VALUE_RATIO_PORTRAIT : HUD_FONT_VALUE_RATIO_LANDSCAPE);

    const leftPanelW = width * (
        isPortrait ? HUD_LEFT_PANEL_WIDTH_RATIO_PORTRAIT : HUD_LEFT_PANEL_WIDTH_RATIO_LANDSCAPE
    );

    const rightPanelW = width * (
        isPortrait ? HUD_RIGHT_PANEL_WIDTH_RATIO_PORTRAIT : HUD_RIGHT_PANEL_WIDTH_RATIO_LANDSCAPE
    );

    const leftX = marginX;
    const leftY = marginY;
    const rightX = width - rightPanelW - marginX;
    const rightY = marginY;

    const gaugeW = leftPanelW * 0.8;
    const gaugeH = fontLabel * 0.72;

    const blockGap = Math.max(3, gaugeH * 0.20);
    const blockW = (gaugeW - blockGap * (MAX_WEAPON_LEVEL - 1)) / MAX_WEAPON_LEVEL;
    const blockH = gaugeH * 0.92;

    const currentBoss = enemies.find(e => e.type === 'boss' || e.type === 'battleship');

    let enemyRatio;
    let enemyText;

    if (stage === 9) {
        const progress = rushBossIndex / 8;
        enemyRatio = Math.max(0, Math.min(1, 1 - progress));
        enemyText = `${rushBossIndex}/8`;
    } else if (stage === 10) {
        enemyRatio = 1;
        enemyText = '∞';
    } else {
        const rawRemains = enemiesToSpawn - enemiesKilled;
        const enemyRemains = Math.max(0, Math.ceil(rawRemains));
        enemyRatio = enemiesToSpawn > 0
            ? Math.max(0, Math.min(1, enemyRemains / enemiesToSpawn))
            : 0;
        enemyText = String(enemyRemains);
    }

    const shieldValue = Math.max(0, player?.shield ?? 0);
    const shieldMax = Math.max(
        1,
        typeof PLAYER_BASE_SHIELD !== 'undefined'
            ? PLAYER_BASE_SHIELD
            : (player?.maxShield ?? 100)
    );
    const shieldRatio = Math.max(0, Math.min(1, shieldValue / shieldMax));

    const laserRatio = player?.laserTimer > 0
        ? Math.max(0, Math.min(1, player.laserTimer / LASER_DURATION))
        : 0;

    const invRatio = player?.invuln > 0
        ? Math.max(0, Math.min(1, player.invuln / INVULN_DURATION))
        : 0;

    const rowH = fontLabel + fontValue + gaugeH + lineGap;

    ctx.save();

    const hudAlpha = Math.max(0, Math.min(1, hudFadeTimer / HUD_FADE_DURATION));
    ctx.globalAlpha = hudAlpha;
    ctx.textBaseline = 'top';

    // =========================================================
    // 左上
    // SCORE -> STAGE -> SHIELD -> WEAPON -> LASER(条件) -> INVINCIBLE(条件)
    // =========================================================
    let cy = leftY;

    // SCORE
    ctx.textAlign = 'left';
    ctx.fillStyle = HUD_LABEL_COLOR;
    ctx.shadowBlur = 0;
    ctx.font = `${fontLabel}px Orbitron`;
    ctx.fillText('SCORE', leftX, cy);

    ctx.fillStyle = HUD_VALUE_COLOR;
    ctx.shadowBlur = 4;
    ctx.shadowColor = HUD_VALUE_COLOR;
    ctx.font = `bold ${fontValue * 1.4}px Orbitron`;
    ctx.fillText(formatHudScore(typeof score !== 'undefined' ? score : 0), leftX, cy + fontLabel * 1.05);
    ctx.shadowBlur = 0;

    cy += rowH*0.9;

    // STAGE
    ctx.fillStyle = HUD_LABEL_COLOR;
    ctx.font = `${fontLabel}px Orbitron`;
    ctx.fillText('STAGE', leftX, cy);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontValue}px Orbitron`;
    ctx.fillText(getHudStageText(), leftX, cy + fontLabel * 0.95);

    cy += rowH * LEFT_ROW_STEP;

    // SHIELD
    ctx.fillStyle = HUD_LABEL_COLOR;
    ctx.font = `${fontLabel}px Orbitron`;
    ctx.fillText('SHIELD', leftX, cy);

    drawHudBar(
        leftX,
        cy + fontLabel * 1.05,
        gaugeW,
        gaugeH,
        shieldRatio,
        shieldRatio > 0.3 ? HUD_SHIELD_COLOR : HUD_SHIELD_COLOR_CRITICAL
    );

    cy += rowH * LEFT_ROW_STEP;

    // WEAPON
    ctx.fillStyle = HUD_LABEL_COLOR;
    ctx.font = `${fontLabel}px Orbitron`;
    ctx.fillText('WEAPON', leftX, cy);

    drawHudWeaponBlocks(
        leftX,
        cy + fontLabel * 1.15,
        Math.max(0, Math.min(MAX_WEAPON_LEVEL, player?.weaponLevel ?? 0)),
        MAX_WEAPON_LEVEL,
        blockW,
        blockH,
        blockGap,
        HUD_WEAPON_ACTIVE,
        HUD_WEAPON_INACTIVE
    );

    cy += rowH * LEFT_ROW_STEP;

    // LASER
    if (laserRatio > 0) {
        ctx.fillStyle = HUD_LASER_COLOR;
        ctx.font = `bold ${fontLabel}px Orbitron`;
        ctx.fillText('LASER', leftX, cy);

        drawHudBar(
            leftX,
            cy + fontLabel * 1.25,
            gaugeW,
            gaugeH,
            laserRatio,
            HUD_LASER_COLOR
        );

        cy += rowH * LEFT_ROW_STEP;
    }

    // INVINCIBLE
    if (invRatio > 0) {
        ctx.fillStyle = HUD_INVINCIBLE_COLOR;
        ctx.font = `bold ${fontLabel}px Orbitron`;
        ctx.fillText('INVINCIBLE', leftX, cy);

        drawHudBar(
            leftX,
            cy + fontLabel * 1.25,
            gaugeW,
            gaugeH,
            invRatio,
            HUD_INVINCIBLE_COLOR
        );

        cy += rowH * LEFT_ROW_STEP;
    }

    // =========================================================
    // 右上
    // ENEMY -> BOSS -> miniMap
    // =========================================================
    let ry = rightY;

    ctx.textAlign = 'right';

    // ENEMY
    ctx.fillStyle = HUD_ENEMY_COLOR;
    ctx.font = `bold ${fontLabel * 1.05}px Orbitron`;
    ctx.fillText(`ENEMY: ${enemyText}`, width - marginX, ry);

    drawHudBar(
        width - marginX - gaugeW,
        ry + fontLabel * 1.05,
        gaugeW,
        gaugeH,
        enemyRatio,
        HUD_ENEMY_COLOR
    );

    ry += rowH * RIGHT_ROW_STEP;

    // BOSS
    ctx.textAlign = 'right';

    if (currentBoss) {
        const bossHpRatio = Math.max(0, Math.min(1, currentBoss.hp / currentBoss.maxHp));

        const bossColor = currentBoss.color || '#ff7070';

        ctx.fillStyle = bossColor;
        ctx.font = `bold ${fontLabel * 1.05}px Orbitron`;
        ctx.fillText(currentBoss.variant?.name || 'BOSS', width - marginX, ry);

        drawHudBar(
            width - marginX - gaugeW,
            ry + fontLabel * 1.05,
            gaugeW,
            gaugeH,
            bossHpRatio,
            bossColor
        );
    }

    ry += rowH * RIGHT_ROW_STEP;

    // miniMap
    const miniMapSize = rightPanelW * MINIMAP_SCALE;
    drawMiniMapInHud(width - miniMapSize - marginX, ry, miniMapSize);

    ctx.restore();
}

function drawMiniMapInHud(x, y, size) {
    const scale = size / worldSize;

    // miniMap 枠設定
    const frameColor = 'rgba(0, 246, 255, 0.9)';
    const frameWidth = Math.max(1, size * 0.02);
    const bgColor = 'rgba(0, 10, 20, 0.35)';

    ctx.save();

    // 背景
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, size, size);

    // 枠
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameWidth;
    ctx.strokeRect(
        x + frameWidth * 0.5,
        y + frameWidth * 0.5,
        size - frameWidth,
        size - frameWidth
    );

    // ワームホール
    ctx.fillStyle = '#22f';
    wormholes.forEach(w => {
        if (!w.active) return;
        ctx.beginPath();
        ctx.arc(
            x + w.x * scale,
            y + w.y * scale,
            Math.max(1.2, size * 0.015),
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    // 敵
    enemies.forEach(e => {
        if (e.type === 'boss' || e.type === 'battleship') {
            const bossColor = e.color || '#f44';
            ctx.fillStyle = bossColor;
            ctx.shadowBlur = Math.max(3, size * 0.05);
            ctx.shadowColor = bossColor;
            ctx.beginPath();
            ctx.arc(
                x + e.x * scale,
                y + e.y * scale,
                Math.max(2.5, size * 0.035),
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            ctx.fillStyle = e.color || '#f0f';
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            const dot = Math.max(2, size * 0.02);
            ctx.fillRect(
                x + e.x * scale - dot * 0.5,
                y + e.y * scale - dot * 0.5,
                dot,
                dot
            );
        }
    });

    // 自機
    ctx.fillStyle = '#0f0';
    ctx.shadowBlur = Math.max(4, size * 0.08);
    ctx.shadowColor = '#0f0';
    ctx.beginPath();
    ctx.arc(
        x + player.x * scale,
        y + player.y * scale,
        Math.max(2.2, size * 0.03),
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
}

function formatHudScore(v) {
    return String(v ?? 0).padStart(7, '0');
}

function drawHudBar(x, y, w, h, ratio, color, backColor = 'rgba(255,255,255,0.10)') {

    const r = Math.max(0, Math.min(1, ratio));

    const frameColor = brightenColor(color, 1.6);
    const frameThickness = Math.max(1, h * 0.14);
    const inset = frameThickness;

    ctx.save();

    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameThickness;
    ctx.strokeRect(x + frameThickness * 0.5, y + frameThickness * 0.5, w - frameThickness, h - frameThickness);

    ctx.fillStyle = 'rgba(0,20,30,0.75)';
    ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);

    if (r > 0) {
        const fillW = (w - inset * 2) * r;

        ctx.fillStyle = color;
        ctx.shadowBlur = h * 0.9;
        ctx.shadowColor = color;
        ctx.fillRect(x + inset, y + inset, fillW, h - inset * 2);
    }

    ctx.restore();
}
function drawHudWeaponBlocks(x, y, count, maxCount, blockW, blockH, gap, activeColor = '#00ff55', inactiveColor = 'rgba(255,255,255,0.16)') {
    ctx.save();

    for (let i = 0; i < maxCount; i++) {
        const bx = x + i * (blockW + gap);
        const active = i < count;

        ctx.fillStyle = active ? activeColor : inactiveColor;
        //ctx.shadowBlur = active ? blockH * 0.5 : 0;
        ctx.shadowColor = active ? activeColor : 'transparent';
        ctx.fillRect(bx, y, blockW, blockH);
    }

    ctx.restore();
}

function getHudStageText() {
    if (typeof stage !== 'undefined') return String(stage);
    if (typeof currentStage !== 'undefined') return String(currentStage);
    return '-';
}




function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
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

        
            // ==========================================
            // 【横画面】画面の中央・上部にコンパクトな枠で表示
            // ==========================================
        const cy = (width > height) ? height * 0.18 : height * 0.3;

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