// BOSS
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

