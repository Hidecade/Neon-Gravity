

function drawBackground() {
    // --- 1. 背景のベース色 ---
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // ----------------------------------------------------
    // ★トリック：イントロ中だけ、星描画用のカメラ位置を「偽装」する
    // ----------------------------------------------------
    const originalCamY = camera.y; // 本来の位置（グリッド用）をバックアップ

    camera.y -= introBgScroll; // プレイヤーが進んでいる（背景が下に流れる）のでマイナス


    // ★重要：星と星雲で共通のループ範囲を定義する
    const LOOP_MARGIN_X = 400;
    const LOOP_MARGIN_Y = 400;
    const loopW = width + LOOP_MARGIN_X;
    const loopH = height + LOOP_MARGIN_Y;

    // ----------------------------------------------------
    // 2. 星雲の描画 (変更なし)
    // ----------------------------------------------------
    if (typeof nebulae !== 'undefined') {
        nebulae.forEach(n => {
            let nx = (n.x - camera.x * n.parallax) % loopW;
            let ny = (n.y - camera.y * n.parallax) % loopH;
            if (nx < 0) nx += loopW;
            if (ny < 0) ny += loopH;
            nx -= LOOP_MARGIN_X / 2;
            ny -= LOOP_MARGIN_Y / 2;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(n.image, nx - n.radius, ny - n.radius);

            // ループ境界の折り返し描画
            if (nx < -n.radius) ctx.drawImage(n.image, nx - n.radius + loopW, ny - n.radius);
            else if (nx > width + n.radius) ctx.drawImage(n.image, nx - n.radius - loopW, ny - n.radius);
            if (ny < -n.radius) ctx.drawImage(n.image, nx - n.radius, ny - n.radius + loopH);
            else if (ny > height + n.radius) ctx.drawImage(n.image, nx - n.radius, ny - n.radius - loopH);
            ctx.restore();
        });
    }

    // ----------------------------------------------------
    // 4. 星の描画 (変更なし)
    // ----------------------------------------------------
    stars.forEach(s => {
        let sx = (s.x - camera.x * s.parallax) % loopW;
        let sy = (s.y - camera.y * s.parallax) % loopH;
        if (sx < 0) sx += loopW;
        if (sy < 0) sy += loopH;
        sx -= LOOP_MARGIN_X / 2;
        sy -= LOOP_MARGIN_Y / 2;

        if (sx > -50 && sx < width + 50 && sy > -50 && sy < height + 50) {
            ctx.fillStyle = s.color || '#fff'; // 保存した色を使う
            ctx.globalAlpha = s.brightness * 0.8;
            ctx.beginPath();
            const sizeBoost = s.parallax > 0.8 ? 1.2 : 1.0;
            ctx.arc(sx, sy, s.size * 0.8 * sizeBoost, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.restore(); // ベース色のrestore


    camera.y = originalCamY;


    // ▼▼▼ イントロ時のグリッド表示制御 ▼▼▼
    // Phase 1, 2 (テキスト中) はメイングリッドを描画しない
    if (gameState === 'STAGE_INTRO' && introPhase < 3) return;

    // Phase 3 (フェードイン中) は透明度を適用
    if (gameState === 'STAGE_INTRO' && introPhase === 3) {
        ctx.save();
        ctx.globalAlpha = introAlpha;
    }
    // ▲▲▲ 制御ここまで ▲▲▲


    // ★ ここに追加：エンディング系ステートなら、グリッド描画を行わずに終了する
    if (
        gameState === 'ENDING_STORY' ||
        gameState === 'GAMEOVER_UI' ||
        gameState === 'ENDING' ||
        gameState === 'TITLE' ||
        gameState === 'HOWTO'||
        gameState === 'OST'||
        gameState === 'RANKING'||
        gameState === 'STORY'||
        gameState === 'SETTINGS'
        ) {
            return;
    }

    // ==========================================
    // ここから下は「エリア内」の描画（メイングリッド）
    // ==========================================
    ctx.save();

    // クリップ領域の設定（そのまま）
    ctx.beginPath();
    ctx.rect(WALL_MARGIN, WALL_MARGIN, worldSize - WALL_MARGIN * 2, worldSize - WALL_MARGIN * 2);
    ctx.clip();

    ctx.globalCompositeOperation = 'lighter';
    const baseColor = STAGE_THEMES[stage] || '#00f0ff';
    ctx.lineWidth = 1.5;

    // 表示範囲の計算
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const buffer = 3;
    const startX = Math.max(0, Math.floor(camera.x / GRID_SPACING) - buffer);
    const endX = Math.min(gridPoints.length - 1, Math.ceil((camera.x + viewW) / GRID_SPACING) + buffer);
    const startY = Math.max(0, Math.floor(camera.y / GRID_SPACING) - buffer);
    const endY = Math.min(gridPoints[0].length - 1, Math.ceil((camera.y + viewH) / GRID_SPACING) + buffer);

    // ==========================================
    // ★追加：グリッド用のフェード率計算
    // ==========================================
    let gridFade = 1.0;
    if (isWarpingOut) {
        // 枠線より少し早く消えるように調整（/50）
        gridFade = Math.max(0, 1.0 - (player.warpTimer / 50));
    }

    // --- A. 静的グリッドの一括描画 ---
    ctx.beginPath();
    ctx.strokeStyle = baseColor;

    // 元の 0.08 に gridFade を掛ける
    ctx.globalAlpha = 0.08 * gridFade;

    for (let i = startX; i <= endX; i++) {
        for (let j = startY; j <= endY; j++) {
            const p = gridPoints[i][j];
            if (!p) continue;
            // 左の点と繋ぐ
            if (i > startX && gridPoints[i - 1][j]) {
                ctx.moveTo(gridPoints[i - 1][j].x, gridPoints[i - 1][j].y);
                ctx.lineTo(p.x, p.y);
            }
            // 上の点と繋ぐ
            if (j > startY && gridPoints[i][j - 1]) {
                ctx.moveTo(gridPoints[i][j - 1].x, gridPoints[i][j - 1].y);
                ctx.lineTo(p.x, p.y);
            }
        }
    }
    ctx.stroke();

    // --- B. 動的グリッド（歪み）の個別描画 ---
    for (let i = startX; i <= endX; i++) {
        for (let j = startY; j <= endY; j++) {
            const p = gridPoints[i][j];
            if (!p) continue;

            const energy = Math.abs(p.vx) + Math.abs(p.vy);

            if (energy > 0.5) {
                const highlightAlpha = Math.min(0.8, energy * 0.12);
                ctx.beginPath();
                ctx.strokeStyle = baseColor;

                // ここも gridFade を掛ける
                ctx.globalAlpha = highlightAlpha * gridFade;

                if (i > startX && gridPoints[i - 1][j]) {
                    ctx.moveTo(gridPoints[i - 1][j].x, gridPoints[i - 1][j].y);
                    ctx.lineTo(p.x, p.y);
                }
                if (j > startY && gridPoints[i][j - 1]) {
                    ctx.moveTo(gridPoints[i][j - 1].x, gridPoints[i][j - 1].y);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
            }
        }
    }

    ctx.restore(); // グリッド描画終了

    // イントロ用の save を元に戻す
    if (gameState === 'STAGE_INTRO' && introPhase === 3) {
        ctx.restore();
    }
}

function drawTitleBackground() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, height);

    if (typeof drawBackground === "function") {
        drawBackground();
    }
}


function drawWorldBounds() {
    const color = STAGE_THEMES[stage] || '#00f0ff';
    ctx.save();

    // ==========================================
    // ★追加：ワープ時は徐々に透明にする
    // ==========================================
    if (isWarpingOut) {
        // 60フレーム（約1秒）かけて 1.0 -> 0.0 にする
        const fade = Math.max(0, 1.0 - (player.warpTimer / 60));
        ctx.globalAlpha = fade;
    }
    // ==========================================

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    ctx.shadowBlur = 20;
    ctx.shadowColor = color;

    // 枠線を描画
    ctx.strokeRect(WALL_MARGIN, WALL_MARGIN, worldSize - WALL_MARGIN * 2, worldSize - WALL_MARGIN * 2);

    // さらに内側にもう一本、薄い線を引いて「二重結界」っぽくする
    ctx.lineWidth = 1;
    // ワープ中でなければ0.5、ワープ中なら計算したfadeの半分
    ctx.globalAlpha = isWarpingOut ? ctx.globalAlpha * 0.5 : 0.5;

    ctx.strokeRect(WALL_MARGIN + 5, WALL_MARGIN + 5, worldSize - WALL_MARGIN * 2 - 10, worldSize - WALL_MARGIN * 2 - 10);

    ctx.restore();
}

function drawEndingBackground() {
    ctx.save();
    ctx.scale(cameraScale, cameraScale);
    ctx.translate(-camera.x, -camera.y);

    drawBackground();

    drawVisualEffects();

    ctx.restore();
}