

function drawPlayerSystems() {
    if (gameState === 'DYING') return;

    // --- 1. 演出用パラメータの取得 ---
    const vY = player.visualYOffset || 0;
    const currentScale = (player.visualScale !== undefined) ? player.visualScale : 1.0;

    // 登場演出中（スケールがほぼ0）は描画をスキップしてゴーストを防ぐ
    if (currentScale < 0.01) return;

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

    // イントロ中の推力：スケールに連動（徐々にエンジンが点火する演出）
    if (gameState === 'STAGE_INTRO' && introPhase === 3) {
        thrustFactor = 0.8 * currentScale;
    }

    const speedFactor = Math.min(1.0, currentMoveMag / (PLAYER_BASE_SPEED * SPEED_SCALE * 0.8));
    const finalThrustScale = (gameState === 'STAGE_INTRO') ? thrustFactor : speedFactor * thrustFactor;

    // =========================================================
    // ★重要：ここから先のすべての描画を vY 分だけオフセットさせる
    // =========================================================
    ctx.save();
    ctx.translate(0, vY);

    // --- 2. スラスター（噴射炎）の描画 ---
    if (finalThrustScale > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        let pColor = player.overdriveTimer > 0 ? '255, 136, 0' : 
                 (player.invuln > 0 ? '255, 230, 0' : // (無敵も黄金っぽいためそのまま)
                 (player.laserTimer > 0 ? '0, 255, 255' : '0, 255, 180'));
                 
        const offsetStart = 8 * G_SCALE * currentScale;
        const particleCount = Math.floor(30 * finalThrustScale);

        for (let i = 0; i < particleCount; i++) {
            const ratio = (1 - i / particleCount);
            const dist = offsetStart + (i * 6 * G_SCALE * finalThrustScale * currentScale);
            const alpha = Math.pow(ratio, 1.2) * 0.35;
            const finalSize = (7 - i * 0.2) * G_SCALE * currentScale;

            if (finalSize < 0.2) continue;

            ctx.save();
            const offsetX = -Math.cos(player.angle) * dist;
            const offsetY = -Math.sin(player.angle) * dist;

            // 親の translate(0, vY) が効いているため、ここでは player.y でOK
            ctx.translate(player.x + offsetX, player.y + offsetY);
            ctx.rotate(player.angle);

            ctx.beginPath();
            ctx.ellipse(0, 0, finalSize, finalSize * 0.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${pColor}, ${alpha})`;
            ctx.fill();

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

    // --- 3. 残像（履歴）の描画 ---
    // 残像は「過去の絶対座標」を記録しているため、
    // ここだけは translate(0, vY) の外、あるいは打ち消す計算が必要。
    // 今回は一番シンプルな「本体と同じスライドをさせる」方式を維持。
    player.history.forEach((pos, i) => {
        if (i === 0) return;
        ctx.save();
        // pos.y は記録時の座標。そこに現在のスライド量 vY を足す
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.angle);
        ctx.scale(G_SCALE * currentScale, G_SCALE * currentScale);

        ctx.globalAlpha = 0.4 * (1 - i / player.history.length);
        let trailColor = player.overdriveTimer > 0 ? '#ff8800' : 
                         (player.invuln > 0 ? '#ff0' : 
                         (player.laserTimer > 0 ? '#0ff' : '#0f8'));
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    });

    // --- 4. その他のサブシステム描画 ---
    // translate(0, vY) の内側なので、これらはズレることなく自機に吸着します
    if (player.weaponLevel >= MAX_WEAPON_LEVEL - 1) drawEmeraldPhoenix(ctx, player);
    if (player.invuln > 0) drawInvulnBarrier(ctx, player);

    // drawPlayer 内での重複 translate を防ぐため、必要なら drawPlayer の中身も確認してください
    drawPlayer(ctx, player);

    ctx.restore(); // 全体のオフセット(vY)を終了
}

function drawPlayer(ctx, p) {
    // --- 準備：共通のオフセットとスケール ---
    const vY = p.visualYOffset || 0;
    const currentScale = (p.visualScale !== undefined) ? p.visualScale : 1.0;

    // スケールが0のときは何も描画しない
    if (currentScale < 0.01) return;

    // --- 1. 自機本体の描画 ---
    ctx.save();

    // ★ 修正：本体の表示座標にも vY を加算
    ctx.translate(p.x, p.y + vY);
    ctx.rotate(p.angle);
    ctx.scale(G_SCALE * currentScale, G_SCALE * currentScale);

    // 状態に応じた機体色の決定
    let shipColor = '#0f8';
    if (p.overdriveTimer > 0) shipColor = '#ff8800';
    else if (p.invuln > 0) shipColor = '#ff0';
    else if (p.laserTimer > 0) shipColor = '#0ff';

    ctx.strokeStyle = shipColor;
    ctx.lineWidth = 2;
    if (currentGraphicsQuality === 'HIGH')ctx.shadowBlur = 10;
    ctx.shadowColor = shipColor;

    // --- ベース機体 ---
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.stroke();

    // --- 装飾・進化パーツ（そのまま） ---
    if (p.weaponLevel >= 1) { // LV2
        ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-18, 15); ctx.moveTo(-5, -5); ctx.lineTo(-18, -15); ctx.stroke();
    }
    if (p.weaponLevel >= 2) { // LV3
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(-5, 12); ctx.moveTo(5, -5); ctx.lineTo(-5, -12); ctx.stroke();
    }
    if (p.weaponLevel >= 3) { // LV4
        ctx.beginPath(); ctx.moveTo(10, 3); ctx.lineTo(25, 2); ctx.moveTo(10, -3); ctx.lineTo(25, -2); ctx.stroke();
    }
    if (p.weaponLevel >= 4) { // LV5
        ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-22, 5); ctx.moveTo(-8, -8); ctx.lineTo(-22, -5); ctx.stroke();
    }
    if (p.weaponLevel >= 5) { // LV6
        ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-3, 0); ctx.stroke(); ctx.restore();
    }

    ctx.restore();

    // --- 2. サテライト（衛星）の描画 ---
    p.satellites.forEach(s => {
        ctx.save();
        // ★ サテライトは既に player.x/y を基準に計算されているはずなので、
        // 同様に表示用オフセット vY を加算して同期させる
        ctx.translate(s.x, s.y + vY);

        ctx.rotate(frame * 0.1);
        ctx.fillStyle = '#0f0';
        ctx.shadowColor = ctx.fillStyle;

        // ひし形の描画
        const size = 4 * currentScale; // サテライトも本体のスケールに合わせる
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.5);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size * 1.5);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.fill();

        // 芯を白く
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 1.5 * currentScale, 0, Math.PI * 2);
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
    if (currentGraphicsQuality === 'HIGH')ctx.shadowBlur = glowBlur;
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
            spawnParticleObj({
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
    // --- 1. 表示用パラメータの抽出（ここを厳密に修正） ---
    // undefined の時だけ 600 を使い、0（目的地）の時は正しく 0 を使う
    const vY = (typeof p.visualYOffset === 'number') ? p.visualYOffset : 700
    const vScale = (typeof p.visualScale === 'number') ? p.visualScale : 1.0;

    // 出現前（スケールが極小）なら何も描画・計算しない
    if (vScale < 0.01) return;

    // 最新の表示位置を計算
    const drawX = p.x;
    const drawY = p.y + vY;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(p.angle);
    ctx.scale(vScale, vScale);

    // 2. カラー設定 の部分を書き換え
    let mainColor = '#0f8';
    let accentColor = '#0ff';
    
    // ★ハイパー時のメインカラーを黄金(#ffea00)へ、アクセントを薄い黄金に
    if (p.overdriveTimer > 0) { mainColor = '#ff8800'; accentColor = '#ffcc88'; }
    else if (p.invuln > 0) { mainColor = '#ff0'; accentColor = '#fff'; }
    else if (p.laserTimer > 0) { mainColor = '#0ff'; accentColor = '#fff'; }

    if (currentGraphicsQuality === 'HIGH')ctx.shadowBlur = 20;
    ctx.shadowColor = mainColor;
    ctx.globalCompositeOperation = 'lighter';

    const scale = G_SCALE * 1.1;
    const flap = Math.sin(frame * 0.15) * 15;

    // 3. 翼の描画
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

    // 4. 尾羽の描画
    for (let i = 0; i < 3; i++) {
        const isCenter = (i === 1);
        const tailOff = Math.sin(frame * 0.2 + i) * 10;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = mainColor;
        if (isCenter) { ctx.lineWidth = 3 * scale; ctx.shadowBlur = 25; }
        else { ctx.lineWidth = 1 * scale; ctx.globalAlpha = 0.6; }
        ctx.moveTo(-10 * scale, (i - 1) * 5 * scale);
        ctx.quadraticCurveTo(-40 * scale, tailOff * scale, -70 * scale, (tailOff + (i - 1) * 15) * scale);
        ctx.stroke();
        ctx.restore();
    }

    // 5. 頭部
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -4 * scale);
    ctx.lineTo(25 * scale, 0);
    ctx.lineTo(0, 4 * scale);
    ctx.stroke();

    ctx.restore();

    // --- 6. パーティクル生成の同期 ---
    // ★ 修正：出現演出中（introPhase === 3）は、この「翼パーティクル」を止める
    // 出現中の彗星尾は updateIntro 側で出しているため、ここで出すと座標計算の隙間で中央に漏れる
    const isIntro = (typeof introPhase !== 'undefined' && introPhase === 3);

    if (!isIntro && frame % 2 === 0 && vScale > 0.5) {
        const pAngle = p.angle + Math.PI + (Math.random() - 0.5);
        const pSpeed = 2 + Math.random() * 4;
        spawnParticleObj({
            x: drawX,
            y: drawY,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            color: Math.random() > 0.5 ? mainColor : accentColor,
            life: 1,
            size: 2 + Math.random() * 2
        });
    }
}
