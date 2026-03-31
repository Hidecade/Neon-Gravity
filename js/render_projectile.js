// ==========================================
// 描画（見た目・エフェクト） 弾の光り方、色、形などを定義
// ==========================================

function drawPlayerBullets() {
    ctx.save();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pPool = playerBulletPool.pool; // ★プールを参照
    for (let i = 0; i < pPool.length; i++) {
        const b = pPool[i];

        // ★生存チェック：アクティブでない弾は描画しない
        if (!b.active) continue;

        // 画面外チェック（最適化のため、これまでの関数を維持）
        if (!isOnScreen(b, 50)) continue;

        // 弾の進行方向から短いレーザー線を作る
        const vx = b.vx ?? 0;
        const vy = b.vy ?? -8;

        const speed = Math.hypot(vx, vy) || 1;
        const nx = vx / speed;
        const ny = vy / speed;

        // ==========================================
        // ★修正: 線の長さを寿命に応じて計算し、徐々に短くする
        // ==========================================
        const maxLife = (typeof BULLET_CONFIG !== 'undefined') ? BULLET_CONFIG.PLAYER.LIFE : 120;
        const lifeRatio = Math.max(0, b.life / maxLife);
        const len = 12 * lifeRatio; // 元の長さ(12) × 寿命の割合(1.0〜0.0)

        // 先端が現在位置、後端が少し後ろ
        const x1 = b.x;
        const y1 = b.y;
        const x2 = b.x - nx * len;
        const y2 = b.y - ny * len;

        // --- 描画処理 ---
        
        // 外側グロー
        ctx.strokeStyle = 'rgba(0,255,180,0.22)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();

        // 中間光
        ctx.strokeStyle = 'rgba(0,255,180,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();

        // 芯
        ctx.strokeStyle = '#cffff5';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();
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
            //drawLaserMissile(ctx, eb);
        } else if (eb.isFighter) {
            drawFighterJet(ctx, eb);
        } else if (eb.isMissile) {
            drawHomingMissile(ctx, eb);
        } else if (eb.isShockwave) {
            drawShockwave(ctx, eb);
        } else {
            //drawNormalBullet(ctx, eb);
        }

        ctx.restore();
    }

    // 描画設定を元に戻す
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

function drawNormalBullet(ctx, eb) {
    ctx.rotate(frame * 0.15);

    const bulletColor = '#ff8800';
    const size = 8 * G_SCALE;


    ctx.fillStyle = bulletColor;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    // 中心を白くして発光感を出す
    ctx.fillStyle = (Math.floor(frame / 10) % 2 === 0) ? '#ff0000' : '#ff8800';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawHomingMissile(ctx, eb) {
    // 移行済み: 関数全体を実質的に停止（PixiJS側で処理）
    return;
    /*
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
    */
}

function drawLaserMissile(ctx, eb) {
    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);

    const len = 40 * G_SCALE;
    const color = eb.color || '#0ff';

    // 加算合成は強力ですが、一回にまとめます
    ctx.globalCompositeOperation = 'lighter';

    // --- 1. 外側の光（厚み） ---
    // lineWidthと不透明度の組み合わせでグローを代用（ぼかしなし）
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 8 * G_SCALE;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();

    // --- 2. 中心の芯（真っ白） ---
    // 描画ステート（AlphaとWidth）を変更して重ねる
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 3 * G_SCALE;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();

    // source-overに戻すのは全体の最後、または描画マネージャー側で行うとさらに軽くなります
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

function drawShockwave(ctx, eb) {
    const angle = Math.atan2(eb.vy, eb.vx);
    ctx.rotate(angle);

    const currentScale = eb.baseScale || 1.0;
    const scale = currentScale * G_SCALE;
    ctx.scale(scale, scale);

    // --- ★修正ロジック：広がるほど薄くなるが、0.3以下にはならない ---
    let scatterAlpha = 1.2 - (currentScale * 0.4);
    scatterAlpha = Math.max(0.3, scatterAlpha);

    const lifeAlpha = Math.min(1.0, eb.life / 40);
    const finalAlpha = scatterAlpha * lifeAlpha;

    if (finalAlpha <= 0) return;

    ctx.globalCompositeOperation = 'lighter';

    // ★修正1：弾に設定された色(eb.color)を使用する。未設定ならシアン(#0ff)。
    const waveColor = eb.color || '#0ff';

    // --- 1. 外側の波紋 ---
    ctx.strokeStyle = waveColor; // ★修正
    ctx.lineWidth = 4 + (currentScale);
    ctx.lineCap = 'round';
    if (currentGraphicsQuality === 'HIGH')ctx.shadowBlur = 15;
    ctx.shadowColor = waveColor; // ★修正

    // 元の設計より少しだけ alpha を底上げ
    ctx.globalAlpha = finalAlpha * 0.8;

    ctx.beginPath();
    ctx.arc(-10, 0, 25, -Math.PI / 3, Math.PI / 3, false);
    ctx.stroke();

    // --- 3. 背後の余韻粒子 ---
    if (frame % 5 === 0 && Math.random() < Math.max(0.2, scatterAlpha)) {
        spawnParticleObj({
            x: eb.x, y: eb.y,
            vx: -eb.vx * 0.05, vy: -eb.vy * 0.05,
            color: waveColor, // ★修正：パーティクルも同じ色にする
            life: 0.3, size: 1.0 * scale,
            isBubble: true,
            wobbleOffset: Math.random() * Math.PI
        });
    }
}

function drawItems() {
    // --- 1. クリスタル（スコアアイテム） ---
    ctx.fillStyle = '#008000';
    crystals.forEach(c => {
        if (!isOnScreen(c, 50)) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(frame * 0.1);
        const scale = c.life > 60 ? 1 : c.life / 60;
        ctx.scale(scale, scale);

        // クリスタルも少し光らせる
        if (currentGraphicsQuality === 'HIGH')ctx.shadowBlur = 5;
        ctx.shadowColor = '#0f0';

        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0);
        ctx.fill();
        ctx.restore();
    });

    // --- 2. パワーアップアイテム ---
    powerups.forEach(p => {
        if (!isOnScreen(p, 50)) return;

        let char = '?';
        let color = '#fff';

        if (p.type === 'laser') { color = '#aff'; char = 'L'; }
        else if (p.type === 'level') { color = '#0f0'; char = 'W'; }
        else if (p.type === 'invincible') { color = '#ff0'; char = 'I'; }
        else if (p.type === 'shield') { color = '#0ff'; char = 'S'; }
        else if (p.type === 'point') { color = '#fff000'; char = 'P'; } 

        ctx.save();
        ctx.translate(p.x, p.y);

        // 寿命によるスケール（共通）
        const baseScale = p.life > 60 ? 1 : p.life / 60;

        if (p.type === 'point') {
          // =========================================================
            // ★Pアイテム：垂直回転円盤 + 固定文字「P」
            // =========================================================
            const rotateSpeed = 0.1; // 回転速度
            const angle = frame * rotateSpeed;
            const xScale = Math.cos(angle); // -1 ～ 1 で変化（X方向の縮尺、円盤用）

            // 発光設定（共通）
            if (currentGraphicsQuality === 'HIGH') ctx.shadowBlur = 15;
            ctx.shadowColor = color;

            // 全体のサイズ設定
            const itemRadius = 10; 

            // --- 1. 固定文字「P」の描画 ---
            // ★ユーザー要望：コアをやめて、回転しないPの文字にする
            ctx.save();
            // 寿命スケールのみ適用（xScaleを適用しないので常に正面を向く）
            ctx.scale(baseScale, baseScale); 
            
            ctx.fillStyle = color;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(char, 0, 0); // charには既に 'P' が入っています
            ctx.restore(); // 文字描画用の状態を戻す（xScaleを適用するため）

            // --- 2. 回転する外側円盤の描画 ---
            // ここで寿命スケールと回転スケールの両方を適用
            ctx.save();
            // ctx.scale(Xスケール, Yスケール)
            ctx.scale(baseScale * xScale, baseScale); 

            // 立体回転によって潰れた楕円（コインの側面）になります。
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, itemRadius, 0, Math.PI * 2); // 円を描画（スケールされて楕円になる）
            ctx.stroke();
            ctx.restore(); // 円盤描画用の状態を戻す
        } else if (p.type === 'level') {
            // =========================================================
            // ★Wアイテム：垂直回転四角枠 + 固定文字「W」
            // =========================================================
            const rotateSpeed = 0.1;
            const angle = frame * rotateSpeed;
            const xScale = Math.cos(angle);

            if (currentGraphicsQuality === 'HIGH') ctx.shadowBlur = 15;
            ctx.shadowColor = color;

            // 1. 固定文字「W」の描画
            ctx.save();
            ctx.scale(baseScale, baseScale); 
            ctx.fillStyle = color;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(char, 0, 0); 
            ctx.restore(); 

            // 2. 回転する外側四角枠の描画
            ctx.save();
            ctx.scale(baseScale * xScale, baseScale); 
            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.strokeRect(-8, -8, 16, 16);
            ctx.restore();
        } else {
            // =========================================================
            // 他のアイテム（元の四角い枠線）
            // =========================================================
            ctx.scale(baseScale, baseScale); // 寿命スケールのみ
            if (currentGraphicsQuality === 'HIGH') ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(-8, -8, 16, 16);

            // 文字の描画
            ctx.fillStyle = color;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(char, 0, 0);
        }

        ctx.restore();
    });
}

function drawScorePopups() {
    ctx.save();
    ctx.textAlign = 'center';

    // ★追加: ブラー（発光・影）を完全に無効化してシャープにする
    ctx.shadowBlur = 0; 
    ctx.shadowColor = 'transparent';

    const sPool = scorePopupPool.pool; // プールを参照
    for (let i = 0; i < sPool.length; i++) {
        const s = sPool[i];
        
        // 生存チェック
        if (!s.active) continue;

        // ★修正: アイテム取得時などに指定された色(s.color)を使用する
        ctx.fillStyle = s.color || '#ffffff';
        
        // ボス撃破時だけ文字サイズを少し大きくする
        ctx.font = s.isBoss ? 'bold 20px Orbitron' : '16px Orbitron';
        
        // 透明度を安全な範囲（0.0〜1.0）に収めて適用
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        
        // テキストを描画
        ctx.fillText(s.text, s.x, s.y);
    }

    ctx.restore();
}
