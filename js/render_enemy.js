// =========================================================
// renderer.js - 描画専門
// =========================================================


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

        else if (e.type === 'fighter') drawFighterJet(ctx, e);

        else if (e.type === 'boss') drawBossEnemy(ctx, e);
        else if (e.type === 'battleship') drawBattleshipBoss(ctx, e);

        ctx.restore();
    });
}

// ENEMY
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


