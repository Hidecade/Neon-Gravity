// ==========================================
// 描画（見た目・エフェクト） 弾の光り方、色、形などを定義
// ==========================================



function drawPlayerBullets() {
    const tex = getPlayerBulletTexture();
    ctx.save();

    const pPool = playerBulletPool.pool;
    for (let i = 0; i < pPool.length; i++) {
        const b = pPool[i];
        if (!b.active || !isOnScreen(b, 50)) continue;

        const vx = b.vx ?? 0;
        const vy = b.vy ?? -8;
        const angle = Math.atan2(vy, vx); // 進行方向の角度

        const maxLife = (typeof BULLET_CONFIG !== 'undefined') ? BULLET_CONFIG.PLAYER.LIFE : 120;
        const lifeRatio = Math.max(0, b.life / maxLife);
        
        // 寿命に合わせて長さを変える（引き伸ばし/縮小）
        const drawLen = Math.max(4, 20 * lifeRatio); 
        const drawThick = 12; // 描画する太さ

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        
        // 画像の中心（先端を現在地にしたい場合はX座標をずらす）
        // x位置は -drawLen(後方へ伸ばす), y位置は -drawThick/2(中心合わせ)
        ctx.drawImage(tex, -drawLen, -drawThick / 2, drawLen, drawThick);
        
        ctx.restore();
    }
    ctx.restore();
}

function drawLasers() {
    lasers.forEach(l => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle);
        ctx.globalCompositeOperation = 'lighter';
        if (currentGraphicsQuality === 'HIGH') ctx.shadowBlur = 15;

        // ==========================================
        // ★状態に応じたレーザーの色と太さの設定
        // ==========================================
        const isHyper = player.overdriveTimer > 0;
        const mainColor = isHyper ? '#ff8800' : '#0ff';  // オレンジ or シアン
        const coreColor = isHyper ? '#ffddaa' : '#fff';  // 芯の色（薄いオレンジ or 白）
        const hitColor  = isHyper ? '#ffcc88' : '#fff';  // ヒット時の光

        ctx.shadowColor = mainColor;
        ctx.strokeStyle = mainColor;
        
        // ハイパー時はメインの光線を少し太くする
        ctx.lineWidth = isHyper ? 3.0 : 1.5;

        const len = l.renderLen || 2000;

        const segments = 20;
        const segLen = len / segments;
        
        // ハイパー時はジグザグ（荒ぶり）も1.5倍にして高エネルギー感を出す
        const jitter = 15 * (l.life / 5) * (isHyper ? 1.5 : 1.0);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 1; i <= segments; i++) {
            const px = i * segLen;
            const py = (Math.random() - 0.5) * jitter * 2;
            ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 芯の線
        if (Math.random() > 0.2) {
            ctx.strokeStyle = coreColor;
            ctx.lineWidth = isHyper ? 2.0 : 1.0; // 芯も太く
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(len, (Math.random() - 0.5) * 5);
            ctx.stroke();
        }

        // ヒット地点の光（BOSSや壁などに当たっている時）
        if (len < 1900) {
            ctx.fillStyle = hitColor;
            ctx.beginPath();
            // ハイパー時はヒット地点の爆発光も少し大きく
            const hitSize = (isHyper ? 15 : 10) + Math.random() * 10;
            ctx.arc(len, 0, hitSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
}

function drawHomingLasers() {
    if (typeof homingLasers === 'undefined' || homingLasers.length === 0) return;

    ctx.save();
    // 描画モードを「加算」に設定（強く発光させるため）
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    homingLasers.forEach(m => {
        if (!isOnScreen(m, 50)) return;

        const color = m.color || (player.overdriveTimer > 0 ? '#ff8800' : '#0ff');

        // --- 1. 軌跡（レーザーの尾）の描画 ---
        if (m.trail && m.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(m.trail[0].x, m.trail[0].y);
            for (let i = 1; i < m.trail.length; i++) {
                ctx.lineTo(m.trail[i].x, m.trail[i].y);
            }

            // 外側の光
            ctx.strokeStyle = color;
            ctx.lineWidth = 6 * G_SCALE;
            ctx.globalAlpha = 0.5;
            ctx.stroke();

            // ★ 内側の芯を高熱を感じさせる薄いオレンジ(#ffddaa)に
            ctx.strokeStyle = '#ffddaa';
            ctx.lineWidth = 2 * G_SCALE;
            ctx.globalAlpha = 1.0;
            ctx.stroke();
        }

     // --- 2. ミサイル先端（レーザーの頭）の描画 ---
        ctx.save();
        ctx.translate(m.x, m.y);
        const angle = Math.atan2(m.vy, m.vx);
        ctx.rotate(angle);
        
        // ==========================================
        // ★修正: 先端の長さも寿命の割合に応じて短くする
        // ==========================================
        const maxLife = 180;
        const lifeRatio = Math.max(0, m.life / maxLife);
        const headLen = Math.max(2, 15 * G_SCALE * lifeRatio); // 最低2pxの長さは残す
        
        // 外側の光
        ctx.strokeStyle = color;
        ctx.lineWidth = 6 * G_SCALE;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(-headLen * 0.5, 0);
        ctx.lineTo(headLen * 0.5, 0);
        ctx.stroke();

        // 内側の白い芯
        ctx.strokeStyle = '#fff8cc';
        ctx.lineWidth = 2 * G_SCALE;
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.moveTo(-headLen * 0.5, 0);
        ctx.lineTo(headLen * 0.5, 0);
        ctx.stroke();
        
        ctx.restore();
    });

    ctx.restore();
}



function drawEnemyProjectiles() {
    // 描画モードを「加算」に設定（光る演出のため）
    ctx.globalCompositeOperation = 'lighter';

    const ebPool = enemyBulletPool.pool; // ★プールを参照
    for (let i = 0; i < ebPool.length; i++) {
        const eb = ebPool[i];

        // ★生存チェック：アクティブでない弾、または完全に消えた弾は描画しない
        if (!eb.active) continue;

        // 画面外チェック
        if (!isOnScreen(eb, 50)) continue;

        ctx.save();
        ctx.translate(eb.x, eb.y);

        // フェードアウト演出の適用
        const currentAlpha = eb.isFading ? Math.max(0, eb.alpha) : 1.0;
        ctx.globalAlpha = currentAlpha;

        // 弾の種類に応じた描画関数の呼び出し
        if (eb.isLaserMissile) {
            drawLaserMissile(ctx, eb);
        } else if (eb.isFighter) {
            drawFighterJet(ctx, eb);
        } else if (eb.isMissile) {
            drawHomingMissile(ctx, eb);
        } else if (eb.isShockwave) {
            drawShockwave(ctx, eb);
        } else {
            drawNormalBullet(ctx, eb);
        }

        ctx.restore();
    }

    // 描画設定を元に戻す
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

function drawNormalBullet(ctx, eb) {
    // 10フレームごとに点滅画像を交互に選ぶ（元のコードの周期を再現）
    const texIndex = (Math.floor(frame / 10) % 2 === 0) ? 0 : 1;
    const tex = getEnemyBulletTextures()[texIndex];

    // 弾全体を回転させる
    ctx.rotate(frame * 0.15);

    // ★修正: 元の G_SCALE を描画時に掛けて大きさを合わせる
    const scale = (typeof G_SCALE !== 'undefined') ? G_SCALE : 1.0;
    
    // キャッシュキャンバスのサイズ(32) × G_SCALE
    const drawSize = 32 * scale; 

    // 画像の中心が(0,0)にくるようにずらして描画
    ctx.drawImage(tex, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
}

function drawHomingMissile(ctx, eb) {
    // --- 0. フェードアウト処理の反映 ---
    // eb.alpha が定義されている場合はそれを使用し、なければ 1.0 とする
    const currentAlpha = (eb.alpha !== undefined) ? eb.alpha : 1.0;

    // --- 1. ジェット噴射の軌跡（トレイル）を描画 ---
    if (eb.trail && eb.trail.length > 1) {
        ctx.save();
        ctx.translate(-eb.x, -eb.y);

        const trailColor = eb.color || '#f00';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        for (let i = 0; i < eb.trail.length - 1; i++) {
            const p1 = eb.trail[i];
            const p2 = eb.trail[i + 1];
            const ratio = 1 - (i / eb.trail.length);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            // ① 外側の光（全体の透明度 currentAlpha を掛ける）
            ctx.strokeStyle = trailColor;
            ctx.lineWidth = 6 * ratio * G_SCALE;
            ctx.globalAlpha = 0.2 * ratio * currentAlpha; // ★修正
            ctx.stroke();

            // ② 内側の白い芯
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * ratio * G_SCALE;
            ctx.globalAlpha = 0.4 * ratio * currentAlpha; // ★修正
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- 2. ミサイル本体の描画 ---
    ctx.save();
    // 本体描画全体にフェードアウトを適用
    ctx.globalAlpha = currentAlpha; // ★追加

    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);
    const mSize = 12 * G_SCALE;
    const color = eb.color || '#f00';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mSize, 0);
    ctx.lineTo(-mSize, mSize * 0.6);
    ctx.lineTo(-mSize * 0.4, 0);
    ctx.lineTo(-mSize, -mSize * 0.6);
    ctx.closePath();

    // 塗りの透明度はベースの透明度の半分にする
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 * currentAlpha; // ★修正
    ctx.fill();

    ctx.globalAlpha = currentAlpha; // 線のために戻す
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-mSize * 0.5, 0, 3 * G_SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawLaserMissile(ctx, eb) {
    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);

    const color = eb.color || '#0ff';
    const tex = getLaserMissileTexture(color);

    // G_SCALEを使って描画時のサイズを調整
    const scale = (typeof G_SCALE !== 'undefined') ? G_SCALE : 1.0;
    
    // キャッシュキャンバスのサイズ(60x20)にスケールを掛ける
    const drawW = 60 * scale;
    const drawH = 20 * scale;

    // 加算合成は強力ですが、一回にまとめます
    ctx.globalCompositeOperation = 'lighter';

    // 画像の中心が (0,0) にくるようにずらして描画！
    ctx.drawImage(tex, -drawW / 2, -drawH / 2, drawW, drawH);

    // source-overに戻すのは全体の最後、または描画マネージャー側で行うとさらに軽くなります
    ctx.globalCompositeOperation = 'source-over';
}

function drawShockwave(ctx, eb) {
    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);

    const currentScale = eb.baseScale || 1.0;
    const scale = currentScale * G_SCALE;
    ctx.scale(scale, scale);

    // --- 広がるほど薄くなるが、0.3以下にはならない ---
    let scatterAlpha = 1.2 - (currentScale * 0.4);
    scatterAlpha = Math.max(0.3, scatterAlpha);

    const lifeAlpha = Math.min(1.0, eb.life / 40);
    const finalAlpha = scatterAlpha * lifeAlpha;

    if (finalAlpha <= 0) return;

    ctx.globalCompositeOperation = 'lighter';
    const waveColor = eb.color || '#0ff';

    ctx.beginPath();
    ctx.arc(-10, 0, 25, -Math.PI / 3, Math.PI / 3, false);
    ctx.lineCap = 'round';
    ctx.strokeStyle = waveColor;

    // 中心の芯（元の太さと濃さ）
    ctx.globalAlpha = finalAlpha * 0.8;
    ctx.lineWidth = 4 + currentScale;
    ctx.stroke();
}

function drawScorePopups() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;

    const sPool = scorePopupPool.pool; // ★ プールを参照
    for (let i = 0; i < sPool.length; i++) {
        const s = sPool[i];
        
        // ★ 生存チェック（休んでいるオブジェクトは描画しない）
        if (!s.active) continue;

        // フォントサイズの指定
        ctx.font = s.isBoss ? 'bold 20px Orbitron' : '16px Orbitron';
        
        // ==========================================
        // ★修正: オブジェクトの color プロパティを最優先で使う！
        // ==========================================
        ctx.fillStyle = s.color || (s.isBoss ? '#ffea00' : '#fff');
        
        // 透明度を安全な範囲（0.0〜1.0）に収めて適用
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        
        // テキストを描画
        ctx.fillText(s.text, s.x, s.y);
    }

    ctx.restore();
}

function drawItems() {
    if (!ItemTextures._lastQuality || ItemTextures._lastQuality !== currentGraphicsQuality) {
        initItemTextures();
    }

    // --- 1. クリスタル（スコアアイテム） ---
    const crystalTex = ItemTextures['crystal'];
    crystals.forEach(c => {
        if (!isOnScreen(c, 50)) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(frame * 0.1);
        
        const scale = c.life > 60 ? 1 : c.life / 60;
        ctx.scale(scale, scale);

        if (crystalTex) {
            ctx.drawImage(
                crystalTex.frameCanvas, 
                -crystalTex.logicalCx, 
                -crystalTex.logicalCy, 
                crystalTex.logicalSize, 
                crystalTex.logicalSize
            );
        }

        ctx.restore();
    });

    // --- 2. パワーアップアイテム ---
    powerups.forEach(p => {
        if (!isOnScreen(p, 50)) return;

        const tex = ItemTextures[p.type];
        if (!tex) return; 

        ctx.save();
        ctx.translate(p.x, p.y);

        const baseScale = p.life > 60 ? 1 : p.life / 60;
        ctx.scale(baseScale, baseScale);

        // --- 枠の描画（PとWは回転させる） ---
        ctx.save();
        if (p.type === 'point' || p.type === 'level') {
            const rotateSpeed = 0.1;
            const angle = frame * rotateSpeed;
            ctx.scale(Math.cos(angle), 1); 
        }
        ctx.drawImage(tex.frameCanvas, -tex.logicalCx, -tex.logicalCy, tex.logicalSize, tex.logicalSize);
        ctx.restore(); 

        // --- 固定文字の描画 ---
        if (tex.textCanvas) {
            ctx.drawImage(tex.textCanvas, -tex.logicalCx, -tex.logicalCy, tex.logicalSize, tex.logicalSize);
        }

        ctx.restore();
    });
}