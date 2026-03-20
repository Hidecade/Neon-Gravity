

function initGrid() {
    const cols = Math.ceil(worldSize / GRID_SPACING) + 2;
    const rows = Math.ceil(worldSize / GRID_SPACING) + 2;
    gridPoints = [];
    for (let x = 0; x <= cols; x++) {
        gridPoints[x] = [];
        for (let y = 0; y <= rows; y++) gridPoints[x][y] = { x: x * GRID_SPACING, y: y * GRID_SPACING, ox: x * GRID_SPACING, oy: y * GRID_SPACING, vx: 0, vy: 0 };
    }
}

function initStars() {
    stars = [];
    starClusters = [];

    // ★修正1：画面外の予備スペース設定
    // スクロールした際に星が急に消えたり現れたりしないよう、
    // 画面サイズ（width, height）より広い範囲（マージン）に星を生成します。
    // マージンを 1000 -> 400 に減らすことで、計算範囲を狭め密度感を上げています。
    const LOOP_MARGIN = 400;
    const rangeW = width + LOOP_MARGIN;
    const rangeH = height + LOOP_MARGIN;

    // --- A. 星団（星が集まる中心点）の生成 ---
    // 画面内に 8箇所の「星が集まるポイント」をランダムに決めます。
    const clusterCount = 8;
    for (let i = 0; i < clusterCount; i++) {
        starClusters.push({
            x: Math.random() * rangeW - LOOP_MARGIN / 2,
            y: Math.random() * rangeH - LOOP_MARGIN / 2
        });
    }

    // --- B. 星の生成ループ ---
    // 300個の星を作成します
    const starNum = window.currentStarCount !== undefined ? window.currentStarCount : 300;
    for (let i = 0; i < starNum; i++) {
        let sx, sy;

        // 60%の確率で「星団の近く」に配置し、40%は「ランダム」に配置します
        // これにより、疎密（濃い部分と薄い部分）のある自然な星空になります
        if (Math.random() < 0.6) {
            // 星団モード: ランダムに選んだ星団の中心から、±250pxの範囲に配置
            const cluster = starClusters[Math.floor(Math.random() * clusterCount)];
            const spread = 500; // 散らばり具合
            sx = cluster.x + (Math.random() - 0.5) * spread;
            sy = cluster.y + (Math.random() - 0.5) * spread;
        } else {
            // ランダムモード: 全体にまんべんなく配置
            sx = Math.random() * rangeW - LOOP_MARGIN / 2;
            sy = Math.random() * rangeH - LOOP_MARGIN / 2;
        }

        // 色をランダムに決定（青白～白～黄色～赤）
        const starColors = ['#ffffff', '#cceeff', '#ffddaa', '#ffcccc'];
        const randomColor = starColors[Math.floor(Math.random() * starColors.length)];

        stars.push({
            x: sx, y: sy,
            size: 0.5 + Math.random() * 2,
            brightness: Math.random(),
            parallax: 0.2 + Math.random() * 0.3,
            color: randomColor // ★ここに色情報を保存する
        });
    }
}

function initNebulae(forcedColor = null) {
    // 星雲オブジェクトを格納する配列をリセット
    nebulae = [];

    // --- 1. テーマカラーの取得 ---
    // 引数があればそれを使用、なければステージのテーマ色、それもなければシアン
    let themeHex = forcedColor || STAGE_THEMES[stage] || '#00bbff';

    if (!forcedColor && ['TITLE', 'HOWTO', 'RANKING', 'OST', 'STORY', 'GAMEOVER_UI'].includes(gameState)) {
        themeHex = '#00bbff';
    }

    const base = hexToRgb(themeHex);
    const spaceDeep = { r: 20, g: 0, b: 60 };

    // --- 2. 配置基準となる星団（クラスター）の決定 ---
    const clusters = (starClusters.length > 0) ? starClusters : [{ x: width / 2, y: height / 2 }];

    // --- 3. 星雲生成ループ ---
    const count = window.currentNebulaeCount !== undefined ? window.currentNebulaeCount : 20;

    for (let i = 0; i < count; i++) {
        // --- A. 星雲の個体差（サイズ・透明度）の設定 ---
        const radius = 200 + Math.random() * 150;

        // 透明度（アルファ値）を 0.04 〜 0.10 の範囲でランダムに決定
        // 背景が見えるように薄く設定し、重ね合わせで濃淡を表現する
        // 以前より少し値を上げて見やすく調整済み
        const alpha = 0.04 + Math.random() * 0.06;

        // --- B. 色の決定ロジック ---
        let r, g, b;
        const variant = Math.random(); // 0.0 〜 1.0 の乱数で色の傾向を決める

        if (variant < 0.6) {
            // パターン1 (60%): ベーステーマ色に近い色
            // ベース色に -30 〜 +30 のランダムな変動（variance）を加えて微妙なニュアンスを出す
            const variance = (Math.random() - 0.5) * 60;
            r = base.r + variance;
            g = base.g + variance;
            b = base.b + variance;
        } else if (variant < 0.8) {
            // パターン2 (20%): 深い宇宙の色（影）
            // ベース色と深淵色(spaceDeep)の中間色を作り、暗めの星雲にする
            r = (base.r + spaceDeep.r) / 2;
            g = (base.g + spaceDeep.g) / 2;
            b = (base.b + spaceDeep.b) / 2;
        } else {
            // パターン3 (20%): ハイライト（明るい色）
            // ベース色を明るくして（+100）、輝いている部分を作る
            // Math.min(255, ...) でRGB値が255を超えないように制限
            r = Math.min(255, base.r + 100);
            g = Math.min(255, base.g + 100);
            b = Math.min(255, base.b + 100);
        }

        // 決定したRGB値を整数化し、0〜255の範囲に収める（クランプ処理）
        const color = {
            r: Math.floor(Math.max(0, Math.min(255, r))),
            g: Math.floor(Math.max(0, Math.min(255, g))),
            b: Math.floor(Math.max(0, Math.min(255, b)))
        };

        // --- C. キャッシュ用キャンバスへの描画 ---
        // 毎回計算して描画すると重いため、星雲1つ分の画像をオフスクリーンキャンバスに作成しておく
        const cacheCanvas = document.createElement('canvas');
        const size = Math.ceil(radius * 2); // キャンバスサイズは直径分
        cacheCanvas.width = size;
        cacheCanvas.height = size;
        const cacheCtx = cacheCanvas.getContext('2d');

        // 円形グラデーションの作成（中心から外側へ）
        const grad = cacheCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);

        // グラデーションの色定義
        // 中心 (0%): 指定した色と透明度
        grad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);

        // 中間 (60%): 透明度を下げてふわっとさせる
        grad.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);

        // 外側 (100%): 完全透明にして境界を消す
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        // キャンバス全体をグラデーションで塗りつぶす
        cacheCtx.fillStyle = grad;
        cacheCtx.fillRect(0, 0, size, size);

        // --- D. 配列への登録 ---
        // ランダムに選んだ星団（クラスター）の周辺に配置する
        const targetCluster = clusters[Math.floor(Math.random() * clusters.length)];

        nebulae.push({
            // クラスター中心から ±250px の範囲にランダム配置
            x: targetCluster.x + (Math.random() - 0.5) * 500,
            y: targetCluster.y + (Math.random() - 0.5) * 500,
            radius: radius, // 半径
            image: cacheCanvas, // 生成した画像データ
            // 視差効果（パララックス）の係数
            // 0.2 〜 0.4 の値。小さいほど遠くに見え、カメラ移動時の動きが遅くなる
            parallax: 0.2 + Math.random() * 0.2
        });
    }
}


function createWallImpact(x, y, color) {
    // 壁に当たった際のエネルギーの火花
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 5 + 2) * SPEED_SCALE * 15; // 弾の勢いを表現
        spawnParticleObj({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            size: 1.5 * G_SCALE,
            life: 0.3 + Math.random() * 0.2
        });
    }
    // 小さな光のリング
    spawnRingObj({ x: x, y: y, r: 2, color: color, life: 0.3 });
}


function createExplosion(x, y, baseColor, n) {
    const count = Math.floor(n * EXPLOSION_COUNT_MAG);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 8 + 2) * EXPLOSION_SPEED_MAG;

        let color;
        const rnd = Math.random();

        // --- 色の決定ロジックを整理 ---
        if (rnd < 0.85) {
            // 85% は指定されたベースカラー（敵の色）
            color = baseColor;
        } else {
            // 残り 15% は「白」または「高輝度な黄色」のみに絞る（火花表現）
            color = Math.random() > 0.5 ? '#ffffff' : '#ffff00';
        }

        spawnParticleObj({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            size: (Math.random() * 3 + 1) * G_SCALE,
            life: 1.0 + Math.random() * 0.5
        });
    }
}



// 花火ループ用関数（グローバルに定義、またはmain.js内の適当な場所に配置）
function triggerRandomFireworkLoop() {
    if (gameState !== 'PLAYING' || !window.isFireworksActive) return;

    // 花火の発生ロジック（既存のものを流用）
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const pad = 100;
    const fx = camera.x + pad + Math.random() * (viewW - pad * 2);
    const fy = camera.y + pad + Math.random() * (viewH - pad * 2);

    // ランダムな色で爆発
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#ffffff', '#00ff00'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    createExplosion(fx, fy, c, 30 + Math.random() * 50);
    distortGrid(fx, fy, 100, 300);
    if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_medium');

    // 次の花火を予約 (間隔を少しランダムに)
    setTimeout(triggerRandomFireworkLoop, 400 + Math.random() * 600);
}

function distortGrid(x, y, force, radius) {
    const cx = Math.floor(x / GRID_SPACING);
    const cy = Math.floor(y / GRID_SPACING);
    const r = Math.ceil(radius / GRID_SPACING);

    // 半径の二乗
    const radSq = radius * radius;

    for (let i = Math.max(0, cx - r); i < Math.min(gridPoints.length, cx + r); i++) {
        for (let j = Math.max(0, cy - r); j < Math.min(gridPoints[0].length, cy + r); j++) {
            const p = gridPoints[i][j];

            const dx = p.x - x;
            const dy = p.y - y;
            const distSq = dx * dx + dy * dy;

            // 範囲内かつ、中心点(0除算)でない場合
            if (distSq < radSq && distSq > 0.001) {
                const d = Math.sqrt(distSq);

                // 三角関数を使わずベクトルで力を加える
                const f = force * (1 - d / radius);

                p.vx += (dx / d) * f;
                p.vy += (dy / d) * f;

                // 吸い込み時の反転防止リミッター
                if (force < 0) {

                    const speedSq = p.vx * p.vx + p.vy * p.vy;
                    const limitDist = d * 0.5;

                    if (speedSq > limitDist * limitDist) {
                        const speed = Math.sqrt(speedSq);
                        const brake = limitDist / speed;
                        p.vx *= brake;
                        p.vy *= brake;
                    }
                }
            }
        }
    }
}

function updateGrid() {
    // スケールを考慮して、現在の表示範囲に必要なインデックス範囲を計算
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    const buffer = 15;
    const startX = Math.max(0, Math.floor(camera.x / GRID_SPACING) - buffer);
    const endX = Math.min(gridPoints.length - 1, Math.ceil((camera.x + viewW) / GRID_SPACING) + buffer);
    const startY = Math.max(0, Math.floor(camera.y / GRID_SPACING) - buffer);
    const endY = Math.min(gridPoints[0].length - 1, Math.ceil((camera.y + viewH) / GRID_SPACING) + buffer);

    const lastColIndex = gridPoints.length - 1;
    const lastRowIndex = gridPoints[0].length - 1;

    for (let i = startX; i <= endX; i++) {
        for (let j = startY; j <= endY; j++) {
            const p = gridPoints[i][j];
            if (!p) continue;

            // 外枠のアンカー留め
            const isEdge = (i === 0 || i === lastColIndex || j === 0 || j === lastRowIndex);
            if (isEdge) {
                p.x = p.ox; p.y = p.oy; p.vx = 0; p.vy = 0;
                continue;
            }

            // --- 物理演算の高速化（三角関数排除） ---
            const dx = p.x - p.ox;
            const dy = p.y - p.oy;

            // 距離の二乗
            const distSq = dx * dx + dy * dy;

            // 0.1の二乗 = 0.01
            if (distSq > 0.01) {
                // ここで初めてルート計算（動いている点だけ）
                // フックの法則: F = -k * x
                // 本来は Fx = cos(θ) * F = (dx/dist) * (-k * dist) = -k * dx
                // つまり、距離(dist)を計算せずに直接 dx, dy に係数を掛ければよい

                const springFactor = -0.12 * gameSpeed;
                p.vx += dx * springFactor;
                p.vy += dy * springFactor;
            }

            p.vx *= 0.85;
            p.vy *= 0.85;

            // 静止判定
            if (Math.abs(p.vx) < 0.01 && Math.abs(p.vy) < 0.01 && distSq < 0.01) {
                p.x = p.ox; p.y = p.oy; p.vx = 0; p.vy = 0;
            } else {
                p.x += p.vx * gameSpeed;
                p.y += p.vy * gameSpeed;
            }
        }
    }
}



function updateParticlesAndRings() {
    // 摩擦係数を事前計算
    const friction = Math.pow(0.92, gameSpeed);

    // --- パーティクルの更新 ---
    // プールの配列を直接参照します
    const pPoolArray = particlePool.pool;
    
    // Swap & Pop をやめるため、配列の後ろから回す必要がなくなり、普通の順方向ループでOKになります
    for (let i = 0; i < pPoolArray.length; i++) {
        const p = pPoolArray[i];
        
        // ★ 休んでいる（未使用の）オブジェクトは計算をスキップ
        if (!p.active) continue;

        p.x += p.vx * gameSpeed;
        p.y += p.vy * gameSpeed;
        p.vx *= friction;
        p.vy *= friction;

        if (p.isBubble) {
            p.vy -= 0.01 * gameSpeed;
            p.x += Math.sin(frame * 0.05 + p.wobbleOffset) * 0.5 * gameSpeed;
            p.life -= 0.015 * gameSpeed;
        } else {
            p.vy += 0.005 * gameSpeed;
            p.life -= 0.02 * gameSpeed;
        }
        
        if (p.rotV) p.angle += p.rotV * gameSpeed;
        
        // ★ 削除（Pop）の代わりに、非アクティブ状態にしてプールへ返却するだけ
        if (p.life <= 0) {
            p.active = false;
        }
    }

    // --- リングの更新 ---
    const rPoolArray = ringPool.pool;
    
    for (let i = 0; i < rPoolArray.length; i++) {
        const r = rPoolArray[i];

        // ★ 同様に、未使用オブジェクトはスキップ
        if (!r.active) continue;

        if (r.followPlayer) {
            r.x = player.x;
            r.y = player.y + (player.visualYOffset || 0);
        }

        if (r.isBomb) {
            r.r += (r.targetR - r.r) * 0.15 * gameSpeed;
            r.life -= 0.02 * gameSpeed;
        } else {
            r.r += (r.vr !== undefined ? r.vr : 8) * SPEED_SCALE * gameSpeed;
            r.life -= (r.decay !== undefined ? r.decay : 0.08) * SPEED_SCALE * gameSpeed;
        }

        // ★ リングも同様に、非アクティブ状態にするだけ
        if (r.life <= 0) {
            r.active = false;
        }
    }
}


function drawWormholes() {
    wormholes.forEach(w => {
        if (w.active || w.life > -60) {
            let scale = 1;
            if (w.life > 300) scale = (400 - w.life) / 100;
            else if (w.life <= 0) scale = Math.max(0, (60 + w.life) / 60);
            ctx.save();
            ctx.translate(w.x, w.y);
            ctx.scale(scale, scale);
            if (currentGraphicsQuality === 'HIGH') ctx.shadowBlur = 30;
            ctx.shadowColor = '#209';
            const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 25);
            grad.addColorStop(0, '#333'); grad.addColorStop(0.2, '#000'); grad.addColorStop(0.8, '#000'); grad.addColorStop(1, '#0ff');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(frame * 0.1) * 2, 0, Math.PI * 2); ctx.fill();

            // 外側の枠線を描画していた部分を削除

            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(5, 5); ctx.stroke();
            ctx.restore();
        }
    });
}



function drawVisualEffects() {
    // 1. 特殊ミサイル（これはプールの対象外なので通常のforループで高速化だけします）
    ctx.fillStyle = '#fd0';
    ctx.beginPath();
    for (let i = 0; i < missiles.length; i++) {
        const m = missiles[i];
        ctx.moveTo(m.x, m.y);
        ctx.arc(m.x, m.y, 4 * G_SCALE, 0, PI2);
    }
    ctx.fill();

    // =========================================================
    // 2 & 3. パーティクルの描画 (ループ統合版)
    // =========================================================
    const batches = {};

    // ★ 変更点1：プールの配列を参照し、通常のforループにする
    const pPoolArray = particlePool.pool;
    for (let i = 0; i < pPoolArray.length; i++) {
        const p = pPoolArray[i];

        // ★ 変更点2：休んでいるオブジェクトは絶対に描画しない！
        if (!p.active) continue;

        // ★ 変更点3：forEachの return は continue に変える
        if (!isOnScreen(p, 50)) continue;

        // A. 特殊パーティクル（破片、泡）の個別描画
        if (p.isShard || p.isBubble) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, p.life);
            
            if (p.isShard) {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle || 0);
                const opacity = Math.min(1.0, p.life);
                const smoothAlpha = Math.pow(opacity, 0.7);
                const s = (p.size || 1.0) * G_SCALE * (0.6 + opacity * 0.4);
                ctx.scale(s, s);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.5;
                ctx.globalCompositeOperation = 'lighter';

                if (p.shardType === 'eclipseBit') {
                    const pts = [{ x: 14, y: 0, z: 0 }, { x: -7, y: 7, z: 4 }, { x: -7, y: -7, z: 4 }, { x: -7, y: 0, z: -8 }];
                    const lines = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
                    ctx.beginPath();
                    lines.forEach(l => {
                        const tilt = 0.4;
                        const p1y = pts[l[0]].y * Math.cos(tilt) - pts[l[0]].z * Math.sin(tilt);
                        const p2y = pts[l[1]].y * Math.cos(tilt) - pts[l[1]].z * Math.sin(tilt);
                        ctx.moveTo(pts[l[0]].x, p1y); ctx.lineTo(pts[l[1]].x, p2y);
                    });
                    ctx.globalAlpha = smoothAlpha; ctx.stroke();
                    ctx.fillStyle = p.color; ctx.globalAlpha = smoothAlpha * 0.2; ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.globalAlpha = smoothAlpha * 0.5; ctx.stroke();
                } else if (p.shardType === 'dragonSeg') {
                    const w = 12, h = 18;
                    ctx.beginPath(); ctx.moveTo(w, -h / 2); ctx.lineTo(w, h / 2); ctx.lineTo(-w * 0.9, h * 0.35); ctx.lineTo(-w * 0.9, -h * 0.35); ctx.closePath();
                    ctx.fillStyle = p.color; ctx.globalAlpha = smoothAlpha * 0.3; ctx.fill();
                    ctx.globalAlpha = smoothAlpha; ctx.stroke();
                } else if (p.shardType === 'tri') {
                    ctx.lineWidth = 1.0 / s;
                    ctx.beginPath();
                    if (p.vertices) { ctx.moveTo(p.vertices[0].x, p.vertices[0].y); ctx.lineTo(p.vertices[1].x, p.vertices[1].y); ctx.lineTo(p.vertices[2].x, p.vertices[2].y); }
                    else { ctx.moveTo(0, -10); ctx.lineTo(8, 8); ctx.lineTo(-8, 8); }
                    ctx.closePath(); ctx.stroke();
                    ctx.fillStyle = p.color; ctx.globalAlpha = opacity * 0.3; ctx.fill();
                } else if (p.shardType === 'rock') {
                    ctx.lineWidth = 1.0 / s;
                    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(6, -4); ctx.lineTo(8, 5); ctx.lineTo(-5, 7); ctx.closePath();
                    ctx.fillStyle = p.color || '#777'; ctx.globalAlpha = smoothAlpha * 0.55; ctx.fill();
                    ctx.globalAlpha = smoothAlpha; ctx.stroke();
                }
            } else if (p.isBubble) {
                ctx.translate(p.x, p.y);
                const fade = Math.min(1.0, p.life) * 0.6;
                ctx.globalAlpha = fade;
                const r = p.size * G_SCALE;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, PI2); 
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
                ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
                ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.4, r * 0.25, 0, PI2); ctx.fill();
            }
            ctx.restore();

        } else {
            // B. 通常火花のバッチ分類処理
            const alpha = p.life > 1 ? 1 : Math.max(0.1, Math.round(p.life * 10) / 10);
            const lw = p.size ? Math.round(p.size) : 2;
            const key = `${p.color}_${lw}_${alpha}`;

            if (!batches[key]) {
                batches[key] = { color: p.color, lineWidth: lw, alpha: alpha, lines: [] };
            }
            batches[key].lines.push(p);
        }
    }

    // 分類した通常火花を一括描画
    ctx.save();
    ctx.lineCap = 'round';
    for (const key in batches) {
        const batch = batches[key];
        ctx.strokeStyle = batch.color;
        ctx.lineWidth = batch.lineWidth;
        ctx.globalAlpha = batch.alpha;
        
        ctx.beginPath();
        for (let j = 0; j < batch.lines.length; j++) {
            const p = batch.lines[j];
            const length = 4.0;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * length, p.y - p.vy * length);
        }
        ctx.stroke(); 
    }
    ctx.restore();

    // =========================================================
    // 4. リングエフェクト
    // =========================================================
    ctx.globalAlpha = 1.0;

    // ★ リングも同様にプールの配列を参照し、forループにする
    const rPoolArray = ringPool.pool;
    for (let i = 0; i < rPoolArray.length; i++) {
        const r = rPoolArray[i];

        // ★ 休んでいる波紋は無視！
        if (!r.active) continue;

        // ★ forEachの return を continue に変更
        if (!isOnScreen({ x: r.x, y: r.y }, r.r * G_SCALE + 50)) continue;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (r.isBomb) {
            ctx.fillStyle = r.color; ctx.globalAlpha = Math.max(0, r.life * 0.25); ctx.beginPath(); ctx.arc(r.x, r.y, r.r * G_SCALE, 0, PI2); ctx.fill();
            ctx.strokeStyle = r.color; ctx.lineWidth = 20 * r.life * G_SCALE; ctx.globalAlpha = Math.max(0, r.life * 0.8); ctx.beginPath(); ctx.arc(r.x, r.y, r.r * G_SCALE, 0, PI2); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * G_SCALE; ctx.globalAlpha = Math.max(0, r.life); ctx.beginPath(); ctx.arc(r.x, r.y, r.r * G_SCALE, 0, PI2); ctx.stroke();
        } else {
            const lw = (r.lineWidth !== undefined ? r.lineWidth : 4) * G_SCALE;
            const currentR = Math.max(0, r.r * G_SCALE);
            let sizeFactor = 1.0;

            if (r.vr < 0 && !r.isIntroRing) {
                const progress = Math.max(0, Math.min(1.0, 1.0 - (r.r / 500)));
                sizeFactor = Math.pow(progress, 3);
            }

            const baseAlpha = Math.min(1.0, r.life) * sizeFactor;

            if (r.fill) {
                ctx.fillStyle = r.color;
                ctx.globalAlpha = baseAlpha * 0.15;
                ctx.beginPath(); ctx.arc(r.x, r.y, currentR, 0, PI2); ctx.fill();
            }

            ctx.globalAlpha = baseAlpha;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = lw;
            if (currentGraphicsQuality === 'HIGH') ctx.shadowBlur = 15 * sizeFactor;
            ctx.shadowColor = r.color;

            ctx.beginPath(); ctx.arc(r.x, r.y, currentR, 0, PI2); ctx.stroke();

            if (lw > 2) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = lw * 0.3;
                ctx.shadowBlur = 0;
                ctx.globalAlpha = Math.min(1.0, baseAlpha * 1.5);
                ctx.beginPath(); ctx.arc(r.x, r.y, currentR, 0, PI2); ctx.stroke();
            }
        }
        ctx.restore();
    }
}
