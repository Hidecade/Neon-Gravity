// =========================================================
// 個別敵機AI (Specific Enemy AIs)
// =========================================================
let enemyFxBudgetFrame = -1;
let enemyAttackDistortCount = 0;
let enemyDeathDistortCount = 0;
let enemySeCount = 0;

function resetEnemyFxBudget() {
    if (enemyFxBudgetFrame === frame) return;
    enemyFxBudgetFrame = frame;
    enemyAttackDistortCount = 0;
    enemyDeathDistortCount = 0;
    enemySeCount = 0;
}

function tryPlayEnemyFxSe(name, ...args) {
    if (typeof AudioSys === 'undefined') return false;
    resetEnemyFxBudget();
    if (enemySeCount >= 3) return false;
    enemySeCount++;
    AudioSys.playSE(name, ...args);
    return true;
}

function tryEnemyFxDistort(kind, x, y, force, radius) {
    if (typeof distortGrid !== 'function') return false;
    resetEnemyFxBudget();

    if (kind === 'death') {
        if (enemyDeathDistortCount >= 1) return false;
        enemyDeathDistortCount++;
    } else {
        if (enemyAttackDistortCount >= 1) return false;
        enemyAttackDistortCount++;
    }

    distortGrid(x, y, force, radius);
    return true;
}

function updateTriangleAI(e) {
    // ★ 削除: ここにあった e.scale を変更する処理（if (e.isWarping) { ... }）を丸ごと消します。
    // 描画側の drawTriangleEnemy がワープアニメーションを自動でやってくれるため不要です。

    // 2. 座標と移動の計算 (リーダー機・独立機専用)
    const dx = player.x - e.x;
    const dy = player.y - e.y;

    if (e.isWarping) {
        // --- 出現中の挙動 ---
        e.vx *= 0.5;
        e.vy *= 0.5;

        // その場でプレイヤーの方へ旋回（ロックオン）する
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.angle += diff * 0.1; 

    } else {
        // --- 通常時の挙動 ---
        const d = Math.hypot(dx, dy) || 0.001;

        // プレイヤーへ向かって加速
        e.vx += (dx / d) * 0.2 * SPEED_SCALE * gameSpeed;
        e.vy += (dy / d) * 0.2 * SPEED_SCALE * gameSpeed;

        // 速度制限
        const cv = Math.hypot(e.vx, e.vy);
        if (cv > 0.0001 && cv > e.speed) {
            e.vx = (e.vx / cv) * e.speed;
            e.vy = (e.vy / cv) * e.speed;
        }

        e.angle = Math.atan2(e.vy, e.vx);
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // 3. 演出更新
    e.rotX += 0.08;
    e.rotY += 0.12;
    e.rotZ += 0.05;

    /*
    // リーダーのジェット噴射エフェクト
    if (!e.isWarping && Math.random() < 0.35) {
        const backX = Math.cos(e.angle + Math.PI);
        const backY = Math.sin(e.angle + Math.PI);
        const speedBase = 1.8 + Math.random() * 0.4;

        spawnParticleObj({
            x: e.x + backX * 16,
            y: e.y + backY * 16,
            vx: backX * speedBase,
            vy: backY * speedBase,
            color: e.color,
            size: 5,
            life: 0.45 + Math.random() * 0.08
        });
    }
        */
}

function updateTadpoleAI(e) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.001;

    // 1. 怒り倍率を取得（最大3.0）
    const rawAnger = (typeof bossAngerMinionSpeedMag !== 'undefined') ? bossAngerMinionSpeedMag : 1.0;

    // ★調整1: 怒りの影響をマイルドにする（3倍速だと速すぎるため、平方根をとって最大約1.7倍程度に抑える）
    const effectiveAnger = Math.sqrt(rawAnger);

    // --- 加速度ロジック ---
    // ★調整2: 加速度を 0.6 -> 0.20 に大幅ダウン。
    // これにより、すぐに最高速にならず、プレイヤーを通り過ぎた後に大きく膨らんで戻ってくる動きになります。
    const accel = 0.20 * SPEED_SCALE * gameSpeed * effectiveAnger;
    e.vx += (dx / d) * accel;
    e.vy += (dy / d) * accel;

    // 慣性を維持
    e.vx *= 0.99; // 少し摩擦を強めて(0.998 -> 0.99)制御しやすく
    e.vy *= 0.99;

    const currentV = Math.hypot(e.vx, e.vy);

    // --- 2. 最高速度制限の計算 ---
    let targetMaxSpd = e.speed * effectiveAnger;

    // ★調整3: 絶対的な速度上限を 24.0 -> 14.0 に低下
    // これ以上速いと目で追えません。
    const TADPOLE_ABSOLUTE_LIMIT = 14.0;
    if (targetMaxSpd > TADPOLE_ABSOLUTE_LIMIT) {
        targetMaxSpd = TADPOLE_ABSOLUTE_LIMIT;
    }

    if (currentV > targetMaxSpd) {
        e.vx = (e.vx / currentV) * targetMaxSpd;
        e.vy = (e.vy / currentV) * targetMaxSpd;
    }

    // 3. 座標更新
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // 進行方向を向く
    e.angle = Math.atan2(e.vy, e.vx);

    //if (!e.history) e.history = [];

    // --- 4. 軌跡の更新 ---
    e.history.unshift({ x: e.x, y: e.y });
    if (e.history.length > 80) e.history.pop();
}

function updateDragonAI(e) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const spd = SPEED_SCALE;

    // ★追加：現在の怒り倍率を取得（未定義なら1.0）
    const angerMult = (typeof bossAngerMinionSpeedMag !== 'undefined') ? bossAngerMinionSpeedMag : 1.0;

    // 1. 頭部の移動
    // 加速度にも怒り倍率を適用して、キビキビ動くようにする
    e.vx += (dx / d) * DRAGON_ACCELERATION * spd * angerMult;
    e.vy += (dy / d) * DRAGON_ACCELERATION * spd * angerMult;

    e.vx *= 0.98; e.vy *= 0.98;

    const stageMag = 1.0 + (stage - 1) * DIFFICULTY_CONFIG.SPEED_INC;

    // ★修正：最高速度制限（lim）に angerMult を掛け合わせる
    // これにより、途中からでも最高速度の上限が解放される
    const lim = ENEMY_SPEEDS.DRAGON * spd * stageMag * angerMult;

    const currentV = Math.hypot(e.vx, e.vy) || 0.001;
    if (currentV > lim) {
        e.vx = (e.vx / currentV) * lim;
        e.vy = (e.vy / currentV) * lim;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    e.angle = Math.atan2(e.vy, e.vx);

    // 2. 体節の追従 (変更なし)
    let leaderX = e.x;
    let leaderY = e.y;
    const spacing = 18;

    for (let i = 0; i < e.segments.length; i++) {
        const s = e.segments[i];
        const sDx = leaderX - s.x;
        const sDy = leaderY - s.y;
        const distance = Math.hypot(sDx, sDy) || 0.001;
        const targetAngle = Math.atan2(sDy, sDx);

        s.angle = targetAngle;

        if (distance > spacing) {
            const moveDist = distance - spacing;
            const tx = s.x + Math.cos(targetAngle) * moveDist;
            const ty = s.y + Math.sin(targetAngle) * moveDist;
            if (Number.isFinite(tx) && Number.isFinite(ty)) {
                s.x = tx; s.y = ty;
            }
        }
        leaderX = s.x; leaderY = s.y;
    }

    // 3. 弾の発射 (変更なし)
    e.fireTimer++;
    if (e.fireTimer > 100) {
        e.fireTimer = 0;
        if (e.inActiveRange) {
            // 弾速も怒りで速くしたければここに angerMult を掛けても良いです
            const currentEnemyBulletSpd = BULLET_CONFIG.ENEMY_NORMAL.SPEED * SPEED_SCALE * (1 + (stage - 1) * DIFFICULTY_CONFIG.BULLET_SPEED_INC);
            const shootAngle = e.angle;
            spawnEnemyBulletObj({
                x: e.x, y: e.y,
                vx: Math.cos(shootAngle) * currentEnemyBulletSpd,
                vy: Math.sin(shootAngle) * currentEnemyBulletSpd,
                life: BULLET_CONFIG.ENEMY_NORMAL.LIFE, color: '#c00'
            });
            AudioSys.playSE('shoot');
        }
    }
}

function updateCubeAI(e) {
    const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 0.001;
    e.vx += (dx / d) * 0.2 * SPEED_SCALE * gameSpeed;
    e.vy += (dy / d) * 0.2 * SPEED_SCALE * gameSpeed;
    const cv = Math.hypot(e.vx, e.vy); if (cv > e.speed) { e.vx = (e.vx / cv) * e.speed; e.vy = (e.vy / cv) * e.speed; }
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    e.rotX += 0.03;
    e.rotY += 0.04;
}

function updateHunterAI(e) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    const baseSpd = e.speed;
    e.actionTimer++;

    // --- 状態1: 高速接近 (APPROACH) ---
    if (e.state === 'approach') {
        // 回転しながら近づく
        e.angle += 0.15;

        const acc = baseSpd * 0.1;
        e.vx += (dx / dist) * acc;
        e.vy += (dy / dist) * acc;

        if (dist < 250) {
            e.state = 'aim';
            e.actionTimer = 0;
        }
    }
    // --- 状態2: 照準・チャージ (AIM) ---
    else if (e.state === 'aim') {
        // 急ブレーキをかける
        e.vx *= 0.85;
        e.vy *= 0.85;

        // 回転を止め、プレイヤーへロックオン
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.angle += diff * 0.2; 

        // ==========================================
        // ★ 追加：照準中に「ピピピピ」と鳴らす
        // ==========================================
        // if (Math.floor(e.actionTimer) % 10 === 0) {
        //     if (typeof AudioSys !== 'undefined') {
        //         AudioSys.playSE('target_ping');
        //     }
        // }

        // 約1秒（60フレーム）ほどレーザーで狙いを定めたら発砲
        if (e.actionTimer > 60) {
            e.state = 'attack';
            e.actionTimer = 0;
            e.burstCount = 0; // ★ここで射撃カウントをリセット
        }
    }
    // --- 状態3: 攻撃 (ATTACK) ---
    else if (e.state === 'attack') {
        // ★変更：15フレーム間隔で、合計3発撃つまで繰り返す
        if (e.inActiveRange && e.actionTimer % 15 === 1 && e.burstCount < 3) { 
            const bulletSpd = BULLET_CONFIG.ENEMY_NORMAL.SPEED * 1.8 * SPEED_SCALE;

            spawnEnemyBulletObj({
                x: e.x, y: e.y,
                vx: Math.cos(e.angle) * bulletSpd,
                vy: Math.sin(e.angle) * bulletSpd,
                life: BULLET_CONFIG.ENEMY_NORMAL.LIFE * 1.5,
                color: '#ff0055',
                size: 4
            });

            // 発射ごとの反動（連続で撃つため少し抑えめに）
            e.vx -= Math.cos(e.angle) * (baseSpd * 1.0);
            e.vy -= Math.sin(e.angle) * (baseSpd * 1.0);

            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser'); 
            
            e.burstCount++; // 撃った回数をカウント
        }

        // ★変更：3発撃ち終わって、少し硬直（60フレーム経過）したら離脱
        if (e.burstCount >= 3 && e.actionTimer > 60) {
            e.state = 'retreat';
            e.actionTimer = 0;
        }
    }
    // --- 状態4: 離脱・再配置 (RETREAT) ---
    else if (e.state === 'retreat') {
        // 再び回転しながら距離を取る
        e.angle += 0.1;

        const escapeAcc = baseSpd * 0.05;
        e.vx -= (dx / dist) * escapeAcc;
        e.vy -= (dy / dist) * escapeAcc;

        if (dist > 500 || e.actionTimer > 80) {
            e.state = 'approach';
            e.actionTimer = 0;
        }
    }

    // --- 速度制限 ---
    const currentSpeed = Math.hypot(e.vx, e.vy);
    let maxLimit = baseSpd;
    if (e.state === 'approach') maxLimit = baseSpd * 1.5;
    if (e.state === 'aim') maxLimit = baseSpd * 0.2; 
    if (e.state === 'retreat') maxLimit = baseSpd * 1.0;

    if (currentSpeed > maxLimit) {
        e.vx = (e.vx / currentSpeed) * maxLimit;
        e.vy = (e.vy / currentSpeed) * maxLimit;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
}

function updateAsteroidAI(e) {
    // 時間経過のカウント
    e.spawnTimer = (e.spawnTimer || 0) + 1;

    if (!e.isTracking && e.spawnTimer > e.trackingStart) {
        e.isTracking = true;
        e.vx = (e.vx * e.speed) * 0.2;
        e.vy = (e.vy * e.speed) * 0.2;
        e.speed = 1;
        e.rotSpd *= 3;
    }

    if (e.isTracking) {
        // --- 追跡モード ---
        if (e.type === 'asteroid') {

            const gb = Math.floor(215 + 40 * Math.sin(frame * 0.1));
            e.color = `rgb(255, ${gb}, ${gb})`;

        }

        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const accel = (0.6 / e.size) * SPEED_SCALE;

        e.vx += (dx / dist) * accel * gameSpeed;
        e.vy += (dy / dist) * accel * gameSpeed;

        const maxSpeed = 7.0 * SPEED_SCALE;
        e.vx *= 0.99; e.vy *= 0.99;
        const currentSpeed = Math.hypot(e.vx, e.vy);
        if (currentSpeed > maxSpeed) {
            e.vx = (e.vx / currentSpeed) * maxSpeed;
            e.vy = (e.vy / currentSpeed) * maxSpeed;
        }
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;

    } else {
        // --- 通常モード（漂流） ---
        if (e.type === 'asteroid') {
            e.color = '#ffffff';
        }

        e.x += e.vx * e.speed * gameSpeed;
        e.y += e.vy * e.speed * gameSpeed;

        if (e.x < 0 || e.x > worldSize) e.vx *= -1;
        if (e.y < 0 || e.y > worldSize) e.vy *= -1;
    }

    // 自転
    e.angle += e.rotSpd;
}

function updatePhantomAI(e) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.state === 'stealth') {
        // --- 1. 隠密モード ---
        // その場で減速しながら完全に光学迷彩（透明）になる
        e.vx *= 0.85;
        e.vy *= 0.85;
        e.alpha += (0.0 - e.alpha) * 0.1; // 目標アルファ値を 0 にする

        e.timer += gameSpeed;

        // 完全に消えて少し経過したら、自機の周囲へ瞬間移動（ワープ）する
        if (e.alpha < 0.05 && e.timer > 40) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 300 + Math.random() * 150; // 自機から300〜450pxの距離

            // 新しい出現位置を設定（壁の外に出ないように制限）
            e.x = Math.max(100, Math.min(worldSize - 100, player.x + Math.cos(spawnAngle) * spawnDist));
            e.y = Math.max(100, Math.min(worldSize - 100, player.y + Math.sin(spawnAngle) * spawnDist));

            e.state = 'approach';
            e.timer = 0;

            // 出現時の初速を自機に向ける
            const aimAngle = Math.atan2(player.y - e.y, player.x - e.x);
            e.vx = Math.cos(aimAngle) * 2;
            e.vy = Math.sin(aimAngle) * 2;
            e.angle = aimAngle;
        }
    }
    else if (e.state === 'approach') {
        // --- 2. 奇襲モード ---
        const approachSpd = 12 * SPEED_SCALE;
        e.vx += (dx / dist) * 0.8 * gameSpeed;
        e.vy += (dy / dist) * 0.8 * gameSpeed;

        const currentV = Math.hypot(e.vx, e.vy);
        if (currentV > approachSpd) {
            e.vx = (e.vx / currentV) * approachSpd;
            e.vy = (e.vy / currentV) * approachSpd;
        }

        e.angle = Math.atan2(e.vy, e.vx);

        // ワープ先から急速に実体化する
        e.alpha += (1.0 - e.alpha) * 0.1;
        e.timer += gameSpeed;

        // 姿がはっきり見え、かつ接近した場合に攻撃へ
        if (dist < 250 && e.alpha > 0.8) {
            e.state = 'attack';
            e.timer = 0;
        }
    }
    else if (e.state === 'attack') {
        // --- 3. 攻撃モード ---
        e.vx *= 0.8; e.vy *= 0.8; // ブレーキをかける

        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.angle += diff * 0.1;

        e.timer += gameSpeed;
        e.aimRate = Math.min(1.0, e.timer / 30);
        e.isAiming = (e.timer < 30);

        // ==========================================
        // ★ 追加：発射前の溜め時間に「ピピピピ」と鳴らす
        // ==========================================
        // 溜め時間（timerが30になるまで）に、8フレームおきに鳴らす
        // if (e.isAiming && Math.floor(e.timer) % 8 === 0) {
        //     if (typeof AudioSys !== 'undefined') {
        //         AudioSys.playSE('target_ping');
        //     }
        // }
        // ==========================================

        if (e.timer >= 30 && e.timer < 30 + gameSpeed) {
            e.isAiming = false;
            if (e.inActiveRange) {
                for (let i = 0; i < 4; i++) {
                    const orbitAngle = e.rotAngle + (Math.PI / 2) * i;
                    const orbitDist = 38;
                    const shootX = e.x + Math.cos(orbitAngle) * orbitDist;
                    const shootY = e.y + Math.sin(orbitAngle) * orbitDist;

                    const bulletSpd = 20 * SPEED_SCALE;
                    const aim = Math.atan2(player.y - shootY, player.x - shootX);

                    spawnEnemyBulletObj({
                        x: shootX,
                        y: shootY,
                        vx: Math.cos(aim) * bulletSpd,
                        vy: Math.sin(aim) * bulletSpd,
                        life: 200,
                        color: e.color,
                        isLaserMissile: true
                    });
                }
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
                if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 40, 100);
            }
        }

        // 撃ったらすぐ離脱へ
        if (e.timer > 60) {
            e.state = 'retreat';
            e.timer = 0;
            e.aimRate = 0;
        }
    }
    else if (e.state === 'retreat') {
        // --- 4. 離脱モード ---
        const retreatSpd = 10 * SPEED_SCALE;
        e.vx -= (dx / dist) * 0.6 * gameSpeed; // 自機から素早く遠ざかる
        e.vy -= (dy / dist) * 0.6 * gameSpeed;

        const currentV = Math.hypot(e.vx, e.vy);
        if (currentV > retreatSpd) {
            e.vx = (e.vx / currentV) * retreatSpd;
            e.vy = (e.vy / currentV) * retreatSpd;
        }

        e.angle = Math.atan2(e.vy, e.vx);

        // 逃げながら素早く透明になる
        e.alpha += (0.0 - e.alpha) * 0.1;
        e.timer += gameSpeed;

        // ほぼ見えなくなるか、一定時間経ったら再びワープ準備へ
        if (e.alpha < 0.05 || e.timer > 60) {
            e.state = 'stealth';
            e.timer = 0;
        }
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    e.x = Math.max(100, Math.min(worldSize - 100, e.x));
    e.y = Math.max(100, Math.min(worldSize - 100, e.y));
}

function updateEclipseAI(e) {
    // NaNやInfinityの混入を初期段階で防ぐ
    if (!Number.isFinite(e.x)) e.x = worldSize / 2;
    if (!Number.isFinite(e.y)) e.y = worldSize / 2;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    e.vx += (dx / dist) * 0.02 * SPEED_SCALE * gameSpeed;
    e.vy += (dy / dist) * 0.02 * SPEED_SCALE * gameSpeed;

    const spdLimit = e.speed || 1;
    const cv = Math.hypot(e.vx, e.vy);
    if (cv > spdLimit) {
        e.vx = (e.vx / cv) * spdLimit;
        e.vy = (e.vy / cv) * spdLimit;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    if (e.rotSpeed === undefined) e.rotSpeed = 0.02;
    e.angle += e.rotSpeed * gameSpeed;

    // ★タイマーは絶対に整数で管理する
    if (e.actionTimer === undefined) e.actionTimer = 0;
    e.actionTimer++;

    const cycle = e.actionTimer % 350;

    // ★ 出現直後（最初の60フレーム）の後はすぐに攻撃を許可する
    if (e.actionTimer > 60) {
        if (e.inActiveRange) {
            
            // 攻撃1：全方位ばらまき弾
            if (cycle === 120) {
                const ways = 16;
                const bSpd = 16 * SPEED_SCALE;
                for (let i = 0; i < ways; i++) {
                    const a = (Math.PI * 2 / ways) * i + e.angle;
                    spawnEnemyBulletObj({
                        x: e.x, y: e.y,
                        vx: Math.cos(a) * bSpd, vy: Math.sin(a) * bSpd,
                        life: 300, color: e.color
                    });
                }
                tryPlayEnemyFxSe('shoot');
                tryEnemyFxDistort('attack', e.x, e.y, 80, 150);
            }
            
            // ==========================================
            // 攻撃3：ブラックホール（重力引き寄せ）
            // ==========================================
            else if (cycle > 150 && cycle < 220) {

                if (cycle === 151) {
                    tryPlayEnemyFxSe('gravity', e.x, e.y);
                }

                const pullDx = e.x - player.x;
                const pullDy = e.y - player.y;
                const pullDist = Math.hypot(pullDx, pullDy) || 0.001;

                const maxPullDist = 800; 
                
                if (pullDist < maxPullDist) {
                    const pullStrength = 8.0 * SPEED_SCALE * gameSpeed;
                    const force = pullStrength * (1 - pullDist / maxPullDist);
                    player.x += (pullDx / pullDist) * force;
                    player.y += (pullDy / pullDist) * force;
                }

                // --- 視覚演出の軽量化 ---
                // ★軽量化1: グリッドの歪みは6フレームに1回に間引く（見た目の違和感はゼロです）
                if (frame % 6 === 0) {
                    tryEnemyFxDistort('attack', e.x, e.y, -40, 400);
                }

                // ★軽量化2: パーティクルの生成を「2フレームに1回」に間引く
                // （毎フレーム作らなくても、人間の目には十分な連続した線に見えます）
                if (frame % 2 === 0) {
                    // 間引いた分、1回あたりの生成数を少し増やす（3〜4個）
                    const numParticles = 3 + Math.floor(Math.random() * 2);
                    
                    for (let i = 0; i < numParticles; i++) {
                        const pAngle = Math.random() * Math.PI * 2;
                        const pDist = 120 + Math.random() * 250; 
                        
                        const colors = ['#ffaaff', '#880000', '#ffffff', '#00ffff'];
                        const pColor = colors[Math.floor(Math.random() * colors.length)];
                        
                        const speed = (14 + Math.random() * 6) * SPEED_SCALE;
                        const swirlAngle = pAngle + 0.15; 
                        const exactLife = (pDist / speed) * 0.02;

                        spawnParticleObj({
                            x: e.x + Math.cos(pAngle) * pDist,
                            y: e.y + Math.sin(pAngle) * pDist,
                            vx: -Math.cos(swirlAngle) * speed, 
                            vy: -Math.sin(swirlAngle) * speed,
                            color: pColor,
                            life: exactLife, 
                            size: 1.5 + Math.random() * 2.5 
                        });
                    }
                }
            }
            // 攻撃2：超高速レーザー
            else if (cycle === 250 || cycle === 270 || cycle === 290) {
                const bladeCount = 6;
                const currentOrbitDist = 50 + Math.sin(frame * 0.05) * 4;
                const bSpd = 24 * SPEED_SCALE;

                for (let i = 0; i < bladeCount; i++) {
                    const orbitAngle = e.angle + (Math.PI * 2 / bladeCount) * i;
                    const shootX = e.x + Math.cos(orbitAngle) * currentOrbitDist;
                    const shootY = e.y + Math.sin(orbitAngle) * currentOrbitDist;

                    const aim = Math.atan2(player.y - shootY, player.x - shootX);

                    spawnEnemyBulletObj({
                        x: shootX, y: shootY,
                        vx: Math.cos(aim) * bSpd, vy: Math.sin(aim) * bSpd,
                        life: 200, color: '#fff', isLaserMissile: true
                    });
                }
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
                distortGrid(e.x, e.y, 40, 100);
            }
        }
    }
}

function updateJellyfishAI(e) {
    e.timer += gameSpeed;

    // 自機への角度を計算
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const distToPlayer = Math.hypot(dx, dy) || 1;
    const targetAngle = Math.atan2(dy, dx);

    // ゆっくり自機の方へ旋回
    let diff = targetAngle - e.angle;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    // 帯電クラゲの方が旋回性能が高い
    const turnSpd = (e.variant === 'spark') ? 0.05 : 0.03;
    e.angle += diff * turnSpd * gameSpeed;

    // --- 脈動（パルス）と慣性ロジック ---
    // サイン波を使って収縮・膨張のリズムを作る
    const pulse = Math.sin(e.timer * 0.08);

    // 1. 水の抵抗（摩擦）による自然な減速
    // ここで毎フレーム速度を落とすことで、滑るような「慣性」が生まれる
    e.vx *= 0.95;
    e.vy *= 0.95;

    // 2. 脈動による加速（水を蹴る）
    if (pulse > 0) {
        // サイン波がプラスの時（カサをすぼめる時）に前方に加速力を足し込む
        const accel = pulse * e.speed * 0.4;
        e.vx += Math.cos(e.angle) * accel;
        e.vy += Math.sin(e.angle) * accel;
    } else {
        // 脈動が止まっている（カサが開いている）間も、わずかな推進力を与えてフワフワ漂わせる
        const drift = e.speed * 0.03;
        e.vx += Math.cos(e.angle) * drift;
        e.vy += Math.sin(e.angle) * drift;
    }

    // 最終的な速度を座標に適用
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // ==========================================
    // ★攻撃ロジックの分岐
    // ==========================================
    if (e.variant === 'spark') {
        // --- 帯電クラゲ（放電攻撃） ---
        if (pulse > 0) {
            // 収縮時にチャージを溜める
            e.chargeLevel += 0.05 * gameSpeed;

            // チャージエフェクト（ビリビリ：赤橙色に）
            if (Math.random() < e.chargeLevel && frame % 3 === 0) {
                const r = 20 * e.scale;
                const a = Math.random() * Math.PI * 2;
                spawnParticleObj({
                    x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r,
                    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
                    color: '#ff4400', life: 0.2, size: 2 // ★変更: 白から赤橙に
                });
            }
        }

        // 収縮のピークで一気に放電！
        if (pulse > 0.95 && e.canFire && e.chargeLevel > 1.0) {
            e.canFire = false;
            e.chargeLevel = 0;

            // 自身を中心とした放電エフェクト（そのまま残す）
            //spawnRingObj({ x: e.x, y: e.y, r: 10, color: '#ff0000', life: 1.5 });
            //spawnRingObj({ x: e.x, y: e.y, r: 40, color: '#ff8800', life: 1.0 });

            tryPlayEnemyFxSe('laser');
            tryEnemyFxDistort('attack', e.x, e.y, 80, 150);

            // ★ 変更：自機に向かって飛んでいく衝撃波を生成
            const bSpd = 12 * SPEED_SCALE; // 弾の速度
            spawnEnemyBulletObj({
                x: e.x + Math.cos(e.angle) * 20,
                y: e.y + Math.sin(e.angle) * 20,
                vx: Math.cos(targetAngle) * bSpd,
                vy: Math.sin(targetAngle) * bSpd,
                life: 200,
                color: e.color || '#0ff', // 危険な赤橙色
                isShockwave: true, // ★衝撃波フラグ
                baseScale: 1.0     // 拡大用の初期スケール
            });
        } else if (pulse < 0) {
            e.canFire = true;
            e.chargeLevel = Math.max(0, e.chargeLevel - 0.02 * gameSpeed);
        }

    } else {
        // --- 通常クラゲ（小さな衝撃波の発射） ---
        if (pulse > 0.95 && e.canFire) {
            e.canFire = false;
            if (Math.random() < 0.3) {
                const bSpd = 8 * SPEED_SCALE;
                spawnEnemyBulletObj({
                    x: e.x + Math.cos(e.angle) * 10,
                    y: e.y + Math.sin(e.angle) * 10,
                    vx: Math.cos(targetAngle) * bSpd,
                    vy: Math.sin(targetAngle) * bSpd,
                    life: 120,                // 帯電クラゲより寿命を短く
                    color: e.color || '#0ff', // クラゲと同じシアン色
                    isShockwave: true,        // ★衝撃波フラグ
                    baseScale: 0.5,           // ★初期サイズを小さく (帯電クラゲは1.0)
                    scaleSpeed: 0.02          // ★拡大速度も遅く (帯電クラゲは0.02)
                });

                // 衝撃波なので「ピシュッ」という単発音より、レーザー系の音を流用
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
                // 撃った瞬間に少しだけ空間を歪ませる
                if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 30, 80);
            }
        } else if (pulse < 0) {
            e.canFire = true;
        }
    }
}

function updateSweeperAI(e) {
    // --- 汎用的な加速処理 ---
    const accel = 0.20 * SPEED_SCALE; 
    
    // 現在向いている方向（angle）に向かって加速力を足す
    e.vx += Math.cos(e.angle) * accel * gameSpeed;
    e.vy += Math.sin(e.angle) * accel * gameSpeed;

    // 最高速度の制限
    const maxSpeed = 40.0 * SPEED_SCALE;
    const currentSpeed = Math.hypot(e.vx, e.vy);
    if (currentSpeed > maxSpeed) {
        e.vx = (e.vx / currentSpeed) * maxSpeed;
        e.vy = (e.vy / currentSpeed) * maxSpeed;
    }

    // --- 移動と回転 ---
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    e.angle = Math.atan2(e.vy, e.vx); // 進行方向を向く
    e.rotX += 0.2; // 高速ドリル回転
    e.rotY = 0;
    e.rotZ = 0;

    if (!e.isWarping && Math.random() < 0.5) {

        const backX = Math.cos(e.angle + Math.PI);
        const backY = Math.sin(e.angle + Math.PI);

        // 進行方向に対して直角（左右方向）
        const sideX = Math.cos(e.angle + Math.PI / 2);
        const sideY = Math.sin(e.angle + Math.PI / 2);

        const sideSpread = (Math.random() - 0.5) * 1.4;  // 左右の振れ
        const speedBase = 1.2 + Math.random() * 1.0;

        spawnParticleObj({
            x: e.x + backX * 16,
            y: e.y + backY * 16,

            vx: backX * speedBase + sideX * sideSpread,
            vy: backY * speedBase + sideY * sideSpread,

            color: '#aaf0ff',

            size: 3 + Math.random() * 2,  // ← 太さ
            life: 0.55 + Math.random() * 0.25
        });
    }

    // --- 壁に激突したら爆発して消滅 ---
    if (!e.hasEntered) {
        if (e.y > WALL_MARGIN && e.y < worldSize - WALL_MARGIN &&
            e.x > WALL_MARGIN && e.x < worldSize - WALL_MARGIN) {
            e.hasEntered = true; 
        }
    } else {
        if (e.y <= WALL_MARGIN || e.y >= worldSize - WALL_MARGIN ||
            e.x <= WALL_MARGIN || e.x >= worldSize - WALL_MARGIN) {

            if (typeof createWallImpact === 'function') createWallImpact(e.x, e.y, e.color);
            if (typeof createExplosion === 'function') createExplosion(e.x, e.y, e.color, 5);
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');

            e.hp = 0;
            e.isDead = true; 
        }
    }
}

function updateLightcycleAI(e) {
    // history 未初期化対策
    //if (!e.history) e.history = [];

    // --- ライトサイクルのワープ（出現）更新ロジック ---
    if (e.isWarping) {
        e.warpPercent += 0.02;

        // ワープ中も少しずつ前進
        const moveStep = e.speed * 0.2;
        e.x += Math.cos(e.angle) * moveStep;
        e.y += Math.sin(e.angle) * moveStep;

        // 履歴更新
        if (typeof frame !== 'undefined' && frame % 2 === 0) {
            e.history.unshift({ x: e.x, y: e.y });
            if (e.history.length > ENEMY_LIMITS.LIGHTCYCLE_TAIL_LENGTH) {
                e.history.pop();
            }
        }

        if (e.warpPercent >= 1.0) {
            e.isWarping = false;
            e.warpPercent = 1.0;
        }

        return;
    }

    // 2. 初速の設定とタイマー初期化
    if (e.turnTimer === undefined) {
        e.turnTimer = 40;
        e.history = [];

        // 初期方向を縦か横に固定
        if (Math.abs(e.vx) > Math.abs(e.vy)) {
            e.vx = (e.vx > 0 ? 1 : -1) * e.speed;
            e.vy = 0;
        } else {
            e.vx = 0;
            e.vy = (e.vy > 0 ? 1 : -1) * e.speed;
        }
    }

    e.turnTimer -= gameSpeed;

    // 3. 90度ターンの実行
    if (e.turnTimer <= 0) {
        e.turnTimer = 30 + Math.random() * 50;
        const speed = e.speed;

        if (Math.abs(e.vx) > 0) {
            // 横移動中 → 縦移動へ
            e.vx = 0;
            e.vy = (player.y > e.y) ? speed : -speed;
        } else {
            // 縦移動中 → 横移動へ
            e.vy = 0;
            e.vx = (player.x > e.x) ? speed : -speed;
        }

        // ターン時の火花
        if (typeof spawnParticleObj === 'function') {
            spawnParticleObj({
                x: e.x,
                y: e.y,
                vx: (Math.random() - 0.5) * 3.2,
                vy: (Math.random() - 0.5) * 3.2,
                color: e.variant ? (e.variant.trailColor || '#00ffff') : '#00ffff',
                life: 0.22,
                size: 1.7
            });
        }
    }

    // 4. 座標と向きの更新
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    e.angle = Math.atan2(e.vy, e.vx);

    // 5. 光の壁の履歴
    e.history.unshift({ x: e.x, y: e.y });
    if (e.history.length > ENEMY_LIMITS.LIGHTCYCLE_TAIL_LENGTH) {
        e.history.pop();
    }

    // ==========================================
    // ジェット噴射
    // 負荷軽減のため 2フレームに1回、左右どちらか1発のみ生成
    // ==========================================
    if (!e.isWarping && typeof frame !== 'undefined' && frame % 2 === 0) {
        const scale = e.scale || 1;

        // 車体後方中心
        const rearOffset = 15 * scale;
        const rearX = e.x - Math.cos(e.angle) * rearOffset;
        const rearY = e.y - Math.sin(e.angle) * rearOffset;

        // 左右の底辺角
        const widthOffset = 5 * scale;
        const leftX = rearX + Math.cos(e.angle - Math.PI / 2) * widthOffset;
        const leftY = rearY + Math.sin(e.angle - Math.PI / 2) * widthOffset;
        const rightX = rearX + Math.cos(e.angle + Math.PI / 2) * widthOffset;
        const rightY = rearY + Math.sin(e.angle + Math.PI / 2) * widthOffset;

        // 左右交互に1発だけ出す
        const useLeft = ((frame >> 1) % 2 === 0);
        const spawnX = useLeft ? leftX : rightX;
        const spawnY = useLeft ? leftY : rightY;

        const backAngle = e.angle + Math.PI + (Math.random() - 0.5) * 0.16;
        const jetSpeed = 4.2 + Math.random() * 2.0;

        const baseColor = e.variant ? (e.variant.trailColor || '#00ffff') : '#00ffff';
        const jetColor = (Math.random() > 0.94) ? '#ffffff' : baseColor;

        if (typeof spawnParticleObj === 'function') {
            spawnParticleObj({
                x: spawnX,
                y: spawnY,
                vx: Math.cos(backAngle) * jetSpeed,
                vy: Math.sin(backAngle) * jetSpeed,
                color: jetColor,
                life: 0.08 + Math.random() * 0.08,
                size: 2.2 + Math.random() * 1.8
            });
        }
    }
}

function updateFighterJetAI(eb) {
    eb.timer += gameSpeed;

    // ==========================================
    // ★ 修正：自機の前に「真の円弧」状に並べる計算
    // ==========================================
    // eb.baseAngle は「自機からボスへ向かう角度」
    // eb.orbitAngleOffset は「-2, -1, 0, 1, 2」の並び位置インデックス

    // ビットとビットの間の広がり角度（0.25ラジアン ≒ 約14度）
    // この数値を大きくすると円弧が広く開き、小さくすると密集します。
    const spreadAngle = 0.15;

    // このビットが配置されるべき正確な角度
    const currentOrbitAngle = eb.baseAngle + (eb.orbitAngleOffset * spreadAngle);

    // 自機(player)を中心点として、指定した半径(targetRadius)の円周上に配置
    const finalTargetX = player.x + Math.cos(currentOrbitAngle) * eb.targetRadius;
    const finalTargetY = player.y + Math.sin(currentOrbitAngle) * eb.targetRadius;
    // ==========================================

    if (eb.state === 'deploy') {
        const dx = finalTargetX - eb.x;
        const dy = finalTargetY - eb.y;
        const spring = 0.003 * gameSpeed;
        eb.vx += dx * spring;
        eb.vy += dy * spring;
        eb.vx *= 0.94;
        eb.vy *= 0.94;

        if (eb.timer > 60) {
            eb.state = 'aim';
            eb.timer = 0;
        }
    } else if (eb.state === 'aim') {
        eb.vx = (finalTargetX - eb.x) * 0.02;
        eb.vy = (finalTargetY - eb.y) * 0.02;

        eb.aimProgress = eb.timer / 40;
        eb.distToPlayer = Math.hypot(player.x - eb.x, player.y - eb.y);

        // ==========================================
        // ★ 修正：照準中に「ピピピピ」と鳴らす
        // ==========================================
        // 10フレームに1回（約0.16秒おき）に音を鳴らす
        if (Math.floor(eb.timer) % 10 === 0) {
            if (typeof AudioSys !== 'undefined') {
                AudioSys.playSE('target_ping');
            }
        }
        // ==========================================

        if (eb.timer > 40) {
            eb.state = 'fire';
            eb.timer = 0;
        }
    } else if (eb.state === 'fire') {
        eb.vx *= 0.8;
        eb.vy *= 0.8;

        if (Math.floor(eb.timer) % 6 === 0 && eb.burstCount < 3) {
            const aimAngle = Math.atan2(player.y - eb.y, player.x - eb.x);
            spawnEnemyBulletObj({
                x: eb.x, y: eb.y,
                vx: Math.cos(aimAngle) * 32 * SPEED_SCALE,
                vy: Math.sin(aimAngle) * 32 * SPEED_SCALE,
                life: 250, color: '#f05', isLaserMissile: true
            });
            eb.burstCount++;
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            eb.vx -= Math.cos(aimAngle) * 2.5 * SPEED_SCALE;
            eb.vy -= Math.sin(aimAngle) * 2.5 * SPEED_SCALE;
        }

        if (eb.timer > 30) {
            eb.state = 'escape';
            eb.timer = 0;
        }
    } else if (eb.state === 'escape') {
        const escAngle = Math.atan2(eb.y - player.y, eb.x - player.x);
        eb.vx += Math.cos(escAngle) * 1.0 * SPEED_SCALE * gameSpeed;
        eb.vy += Math.sin(escAngle) * 1.0 * SPEED_SCALE * gameSpeed;
        if (eb.timer > 100) eb.hp = 0;
    }

    eb.x += eb.vx * gameSpeed;
    eb.y += eb.vy * gameSpeed;


    // 向きの更新
    let targetDrawAngle = Math.atan2(eb.vy, eb.vx);
    if (eb.state === 'aim' || eb.state === 'fire') {
        targetDrawAngle = Math.atan2(player.y - eb.y, player.x - eb.x);
    }
    if (eb.drawAngle === undefined) eb.drawAngle = targetDrawAngle;
    let angleDiff = targetDrawAngle - eb.drawAngle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    eb.drawAngle += angleDiff * 0.2 * gameSpeed;

    // パーティクル
    if (frame % 2 === 0 && (eb.state === 'deploy' || eb.state === 'escape')) {
        spawnParticleObj({
            x: eb.x - Math.cos(eb.drawAngle) * 15 * G_SCALE,
            y: eb.y - Math.sin(eb.drawAngle) * 15 * G_SCALE,
            vx: -eb.vx * 0.2,
            vy: -eb.vy * 0.2,
            color: '#0ff', life: 0.3, size: 1.5
        });
    }
}

function applyWorldBoundary(e) {

    if (e.x < WALL_MARGIN) {
        e.x = WALL_MARGIN;
        e.vx = Math.abs(e.vx);
    }

    if (e.x > worldSize - WALL_MARGIN) {
        e.x = worldSize - WALL_MARGIN;
        e.vx = -Math.abs(e.vx);
    }

    if (e.y < WALL_MARGIN) {
        e.y = WALL_MARGIN;
        e.vy = Math.abs(e.vy);
    }

    if (e.y > worldSize - WALL_MARGIN) {
        e.y = worldSize - WALL_MARGIN;
        e.vy = -Math.abs(e.vy);
    }
}

function applyAsteroidCollisions(e) {
    if (e.type !== 'asteroid' && e.type !== 'bubble') return;

    enemyPool.pool.forEach(other => {
        // 非アクティブ（プール内待機中）のオブジェクトは無視する
        if (!other.active) return;
        
        if (e === other || other.hp <= 0 || (other.type !== 'asteroid' && other.type !== 'bubble')) return;

        const dx = other.x - e.x;
        const dy = other.y - e.y;
        const distSq = dx * dx + dy * dy;

        const hitRadius = 22 * 0.85;
        const r1 = hitRadius * e.scale * G_SCALE;
        const r2 = hitRadius * other.scale * G_SCALE;
        const minDist = r1 + r2;

        // 二乗同士で比較
        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001; // 衝突が確定した場合のみ計算
            // --- 1. 重なり解消（少し強めに押し出す） ---
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            const totalScale = e.scale + other.scale;
            const ratioE = other.scale / totalScale;
            const ratioOther = e.scale / totalScale;

            // overlap に 1.05 程度を掛けて「重なりをわずかに超えて」引き離す
            const separation = overlap * 1.05;
            e.x -= nx * separation * ratioE;
            e.y -= ny * separation * ratioE;
            other.x += nx * separation * ratioOther;
            other.y += ny * separation * ratioOther;

            // --- 2. 反射処理 ---
            const rvx = other.vx - e.vx;
            const rvy = other.vy - e.vy;
            const velAlongNormal = rvx * nx + rvy * ny;

            if (velAlongNormal > 0) return;

            const isAnyBubble = (e.type === 'bubble' || other.type === 'bubble');
            // 反発係数を上げる。泡なら1.0（エネルギー減衰なし）
            const restitution = isAnyBubble ? 1.0 : 0.8;

            // ★最低反発速度を保証する（ゆっくり近づいた時も確実に弾き飛ばす）
            const minBounceVelocity = -1.5;
            const effectiveVel = Math.min(velAlongNormal, minBounceVelocity);

            const j = -(1 + restitution) * effectiveVel;

            e.vx -= j * nx * ratioE;
            e.vy -= j * ny * ratioE;
            other.vx += j * nx * ratioOther;
            other.vy += j * ny * ratioOther;

            // ==========================================
            // ★追加：物理暴走を防ぐための速度リミッター（安全装置）
            // ==========================================
            const maxSpeedE = (e.speed || 5) * 4.0; // 通常の4倍程度を絶対上限とする
            const cvE = Math.hypot(e.vx, e.vy);
            if (cvE > maxSpeedE) {
                e.vx = (e.vx / cvE) * maxSpeedE;
                e.vy = (e.vy / cvE) * maxSpeedE;
            }

            const maxSpeedOther = (other.speed || 5) * 4.0;
            const cvOther = Math.hypot(other.vx, other.vy);
            if (cvOther > maxSpeedOther) {
                other.vx = (other.vx / cvOther) * maxSpeedOther;
                other.vy = (other.vy / cvOther) * maxSpeedOther;
            }
            // ==========================================

            // --- 3. 演出 ---
            if (Math.abs(effectiveVel) > 0.5) {
                const midX = (e.x + other.x) / 2;
                const midY = (e.y + other.y) / 2;
                if (isAnyBubble) {
                    if (frame % 3 === 0) createExplosion(midX, midY, '#0ff', 1);
                    if (e.type === 'bubble') e.bend = 15; // 衝撃の見た目も強く
                    if (other.type === 'bubble') other.bend = 15;
                }
            }
        }
    });
}

function applyJellyfishAsteroidCollisions(e) {
    // クラゲ以外はこの処理を行わない
    if (e.type !== 'jellyfish') return;

    enemyPool.pool.forEach(other => {
        // ★追加: 非アクティブ（プール内待機中）のオブジェクトは無視する
        if (!other.active) return;

        // 死んでいる敵や、アステロイド以外の敵は無視
        if (other.hp <= 0 || other.type !== 'asteroid') return;

        const dx = e.x - other.x; // 岩からクラゲへのベクトル
        const dy = e.y - other.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        // --- 判定半径 ---
        // クラゲの見た目のサイズに合わせて半径を調整
        const r1 = 20 * e.scale * G_SCALE;     // クラゲの半径（少し大きめに）
        const r2 = 20 * other.scale * G_SCALE; // アステロイドの半径
        const minDist = r1 + r2;

        if (dist < minDist) {
            // --- 1. 重なりの解消（位置を押し戻す） ---
            const overlap = minDist - dist;
            const nx = dx / dist; // 法線ベクトルX（岩→クラゲ）
            const ny = dy / dist; // 法線ベクトルY

            e.x += nx * overlap;
            e.y += ny * overlap;

            // --- 2. 速度ベクトルの反射計算 ---
            // 現在の速度と法線の内積を計算（接近しているか判定）
            const dot = e.vx * nx + e.vy * ny;

            // 岩に向かって進んでいる場合のみ反射させる
            if (dot < 0) {
                // ★変更：弾力係数を 1.6 → 0.8 に下げ、過剰な加速を防ぐ
                const bounceFactor = 0.8;

                // 反射ベクトル計算
                const impulse = (1 + bounceFactor) * dot;
                e.vx -= impulse * nx;
                e.vy -= impulse * ny;

                // ★追加：跳ね返り速度の安全装置（リミッター）
                // どんなに強く当たっても、基本速度の1.5倍以上にはならないようにする
                const maxBounceSpeed = e.speed * 1.5;
                const currentV = Math.hypot(e.vx, e.vy);
                if (currentV > maxBounceSpeed) {
                    e.vx = (e.vx / currentV) * maxBounceSpeed;
                    e.vy = (e.vy / currentV) * maxBounceSpeed;
                }

                // --- 3. 「ぼよーん」感の演出 ---
                // 反射後の速度から、新しい進行角度をセット
                e.angle = Math.atan2(e.vy, e.vx);

                // 強制的に「縮んだ」状態にするタイマー値にセット
                // 次の瞬間に反動で大きくカサが開く
                e.timer = (Math.PI * 1.5) / 0.08;

                // 少し回転を加える（衝撃でよろめく感じ）
                e.angle += (Math.random() - 0.5) * 0.5;
            }
        }
    });
}

function destroyEnemy(e) {

    // ==========================================
    // ★修正：撃破カウントを関数の最初に移動
    // （ドロップがない敵でも確実にカウントされるようにする）
    // ==========================================
    if (typeof window.playStats !== 'undefined') {
        window.playStats.enemiesKilled++;
    }

    // --- ボス撃破時の処理 ---
    if (e.type === 'boss') {
        let shouldClearMinions = false;

        if (stage === 9) {
            rushBossIndex++; // 現在のボス撃破数をカウントアップ
            rushIntervalTimer = 0;

            // Stage 9の場合：8体目のボス（Indexが8に到達した時）を倒した時だけ一掃
            if (rushBossIndex >= 8) {
                shouldClearMinions = true;
            }
        } else {
            // Stage 1-8の場合：ボスを倒せば常に一掃
            shouldClearMinions = true;
        }

        // --- 雑魚一掃ロジックの実行 ---
        if (shouldClearMinions) {
            enemyPool.pool.forEach(other => {
                if (!other.active) return; // ★追加
                if (other !== e && other.hp > 0) {
                    other.hp = 0;
                    other.noSplit = true; // ★アステロイドが分裂しないようにする
                    other.noDrop = true;  // 画面がアイテムで埋まるのを防ぐ
                }
            });
            // 進行中のワームホールもすべて閉じる
            wormholes.forEach(w => w.life = 0);

            // ★追加：残っている敵弾をすべて小さな爆発エフェクトにしてから消去
            const ebPool = enemyBulletPool.pool;

            for (let i = 0; i < ebPool.length; i++) {
                const eb = ebPool[i];
                
                // 生きている弾だけを対象にする
                if (eb.active) {
                    // 爆発エフェクトを発生
                    createExplosion(eb.x, eb.y, eb.color || '#fff', 3);
                    
                    // ★重要：オブジェクトプールに返却
                    eb.active = false;
                    eb.life = 0;
                }
            }

            // 派手なグリッドの歪み
            distortGrid(e.x, e.y, 200, 500);
        }

        // ボス撃破の報酬（シールド回復）を確定ドロップ
        powerups.push({ x: e.x, y: e.y, vx: 0, vy: 0, type: 'shield', life: 600 });
        
        // ★修正：シールドの出現をカウント（安全対策版）
        if (typeof window.playStats !== 'undefined' && window.playStats.items && window.playStats.items['shield']) {
            window.playStats.items['shield'].spawned++;
        }
        
    }
    // --- ラスボス（Stage 10 / Battleship） ---
    else if (e.type === 'battleship') {
        // Battleship自体の撃破時は一掃ロジックを入れなくても
        // startStageのクリア判定で次の演出へ移行します
        gameSpeed = 0.05;
        playerBulletPool.clearAll();
        enemyBulletPool.clearAll();

        // ★修正: ラスボス撃破時も同様に enemyPool を使って一掃
        enemyPool.pool.forEach(other => {
            if (!other.active) return; // ★追加
            if (other !== e && other.hp > 0) {
                other.hp = 0;
                other.noSplit = true; // ★アステロイド分裂防止
                other.noDrop = true;  // アイテムドロップ防止
            }
        });
        wormholes.forEach(w => w.life = 0);


    }
    // --- 通常の敵の撃破 ---
    else {
        // asteroid または bubble 以外の場合に撃破数を加算する
        if (e.type !== 'asteroid' && e.type !== 'bubble' && e.type !== 'sweeper') {
            if (e.type === 'triangle') {
                enemiesKilled += 0.2;
            } else {
                enemiesKilled += 1;
            }
        }
    }

    // --- 爆発エフェクトの生成 ---
    // 敵の種類に応じて基本の火花（パーティクル）の数を調整
    const particleCount =
        EXPLOSION_PARTICLE_COUNT[e.type] ??
        EXPLOSION_PARTICLE_COUNT.default;


    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 8 + 2) * EXPLOSION_SPEED_MAG;
        let color;
        if (e.type === 'asteroid') color = Math.random() < 0.85 ? '#ffffff' : '#ffaa00';
        else color = Math.random() < 0.85 ? e.color : '#ffff00';
        createExplosion(e.x, e.y, color, 1);
    }

// --- Phantom専用の特殊撃破演出 ---
    if (e.type === 'phantom') {
        tryPlayEnemyFxSe('explode_medium', e.x, e.y); // 中サイズの爆発音
        
        // ★ULTRAの時のみ歪ませる
        if (currentGraphicsQuality === 'ULTRA') {
            tryEnemyFxDistort('death', e.x, e.y, 40, 120);
        }

        const phantomPartExplosionStride = currentGraphicsQuality === 'ULTRA' ? 1 : 2;
        const phantomCoreExplosionCount = currentGraphicsQuality === 'ULTRA' ? 20 : 14;

        // 4つの三角錐パーツを独立した破片として放出
        for (let i = 0; i < 4; i++) {
            const orbitAngle = (e.rotAngle || 0) + (Math.PI / 2) * i;
            const orbitDist = 40;
            const partX = e.x + Math.cos(orbitAngle) * orbitDist;
            const partY = e.y + Math.sin(orbitAngle) * orbitDist;

            // 外側へ吹き飛ぶベクトル
            const pvx = Math.cos(orbitAngle) * (5 + Math.random() * 5);
            const pvy = Math.sin(orbitAngle) * (5 + Math.random() * 5);

            // 特殊パーティクルとして追加（isShardフラグで三角錐を描画させる）
            spawnParticleObj({
                x: partX, y: partY,
                vx: pvx, vy: pvy,
                color: e.color,
                life: 1.5, // 少し長めに残す
                size: 1.0,
                isShard: true, // ★破片フラグ
                angle: orbitAngle,
                rotV: (Math.random() - 0.5) * 0.2 // 回転速度
            });

            // 各パーツの根元でも小さな爆発
            if (i % phantomPartExplosionStride === 0) {
                createExplosion(partX, partY, e.color, 4);
            }
        }

        // 中心コアの爆発
        createExplosion(e.x, e.y, '#fff', phantomCoreExplosionCount);
    }
    // --- ★追加：Eclipse専用の特殊撃破演出 ---
    else if (e.type === 'eclipse') {
        tryPlayEnemyFxSe('explode_medium', e.x, e.y);

        // ★ULTRAの時のみ歪ませる
        if (currentGraphicsQuality === 'ULTRA') {
            tryEnemyFxDistort('death', e.x, e.y, 60, 200);
        }

        const bitCount = 6;
        const orbitDist = 50 + Math.sin(frame * 0.05) * 4;
        const eclipseBitExplosionStride = currentGraphicsQuality === 'ULTRA' ? 1 : 2;
        const eclipseCoreExplosionCount = currentGraphicsQuality === 'ULTRA' ? 30 : 20;

        for (let i = 0; i < bitCount; i++) {
            // 現在の回転角からビットの正確な位置を算出
            const orbitAngle = (e.angle || 0) + (Math.PI * 2 / bitCount) * i;
            const partX = e.x + Math.cos(orbitAngle) * orbitDist;
            const partY = e.y + Math.sin(orbitAngle) * orbitDist;

            // 中心から外側へ向かうベクトル
            const pvx = Math.cos(orbitAngle) * (3 + Math.random() * 4);
            const pvy = Math.sin(orbitAngle) * (3 + Math.random() * 4);

            spawnParticleObj({
                x: partX, y: partY,
                vx: pvx, vy: pvy,
                color: e.color || '#f05',
                life: 1.5,           // 粘り強く残す
                size: e.scale || 1.0,
                isShard: true,
                shardType: 'eclipseBit', // ★Eclipse専用ビットフラグ
                angle: orbitAngle,
                rotV: (Math.random() - 0.5) * 0.4 // クルクル回る
            });

            // 各ビットの根元で小さな爆発
            if (i % eclipseBitExplosionStride === 0) {
                createExplosion(partX, partY, e.color, 3);
            }
        }

        // 中心（ブラックホール）の崩壊エフェクト
        createExplosion(e.x, e.y, '#fff', eclipseCoreExplosionCount);
    }
    // --- Triangle専用の特殊撃破演出（サイズ微調整版） ---
    else if (e.type === 'triangle') {
        tryPlayEnemyFxSe('explode_small', e.x, e.y);

        // ★ULTRAの時のみ軽い歪みを追加
        if (currentGraphicsQuality === 'ULTRA') {
            tryEnemyFxDistort('death', e.x, e.y, 20, 80);
        }

        const shardCount = 3 + (currentGraphicsQuality === 'HIGH' ? Math.floor(Math.random() * 2) : 0);
        for (let i = 0; i < shardCount; i++) {
            const angle = (Math.PI * 2 / shardCount) * i + e.angle + (Math.random() - 0.5);
            const speed = 4 + Math.random() * 4;

            const vertices = [];
            for (let v = 0; v < 3; v++) {
                const a = (Math.PI * 2 / 3) * v + (Math.random() - 0.5) * 1.0;
                // ★頂点の距離を少し抑える (10〜25 -> 7〜18)
                const r = 7 + Math.random() * 11;
                vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }

            spawnParticleObj({
                x: e.x, y: e.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: e.color || '#0ff',
                life: 1.2,
                // ★全体の描画スケールを適正サイズに (1.5 -> 1.1)
                size: e.scale ? e.scale * 1.1 : 1.1,
                isShard: true,
                shardType: 'tri',
                vertices: vertices,
                angle: angle,
                rotV: (Math.random() - 0.5) * 0.5
            });
        }
    }
    else if (e.type === 'dragon') {
        AudioSys.playSE('explode_medium', e.x, e.y);

        // ★ULTRAの時のみ歪ませる
        if (currentGraphicsQuality === 'ULTRA' && typeof distortGrid === 'function') {
            distortGrid(e.x, e.y, 60, 140);
        }

        // 体節をバラバラに放出（頭 + セグメント）
        const allParts = [{ x: e.x, y: e.y, angle: e.angle }, ...e.segments];

        allParts.forEach((seg, i) => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3; // 速度を少し抑える

            spawnParticleObj({
                x: seg.x, y: seg.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: e.color || '#c00',
                life: 2,
                size: e.scale || 1.0,
                isShard: true,
                shardType: 'dragonSeg',
                angle: seg.angle,
                rotV: (Math.random() - 0.5) * 0.2,
                segIndex: i
            });
        });

        // ドラゴン撃破時は専用の「ごく少数」の火花だけ出す
        createExplosion(e.x, e.y, '#fff', 5);
    }
    // --- ★変更：JellyfishとBubble共通の特殊撃破演出 ---
    else if (e.type === 'jellyfish' || e.type === 'bubble') {
        AudioSys.playSE('explode_small', e.x, e.y); 

        // ★ULTRAの時のみ歪ませる
        if (currentGraphicsQuality === 'ULTRA' && typeof distortGrid === 'function') {
            distortGrid(e.x, e.y, 25, 100);
        }

        let bubbleCount = 20;
        if (e.type === 'bubble') {
            // ★元の3段階の泡の数に戻す (size1=30, size2=20, size3=10)
            bubbleCount = (4 - (e.size || 2)) * 10;
        }

        for (let i = 0; i < bubbleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3; // ふんわり飛び散る速度
            spawnParticleObj({
                x: e.x + (Math.random() - 0.5) * 20,
                y: e.y + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#aff',
                life: 0.5 + Math.random(),   // 長めに残す
                size: 3 + Math.random() * 3, // 泡の大きさ（半径）
                isBubble: true,              // ★泡フラグ
                wobbleOffset: Math.random() * Math.PI * 2 // 揺らぎの初期位相
            });
        }
    }
    // --- その他の敵の処理 ---
    else if (e.type === 'boss' || e.type === 'battleship') {
        AudioSys.playSE('explode_large', e.x, e.y);
    }
    // --- アステロイドの判定 ---
    else if (e.type === 'asteroid') {

        // ★元の3段階のスケール計算に戻す
        const scale = (4 - (e.size || 2)) * 0.6;
        
        // ★ULTRAの時のみ、サイズに応じた軽い歪みを追加
        if (currentGraphicsQuality === 'ULTRA' && typeof distortGrid === 'function') {
            distortGrid(e.x, e.y, 15 * scale, 70 * scale);
        }

        // 破片数
        const shardCount = Math.floor((2 + Math.random() * 2) * scale); 

        for (let i = 0; i < shardCount; i++) {

            const angle = Math.random() * Math.PI * 2;
            const speed = (1.5 + Math.random() * 3) * scale;

            spawnParticleObj({
                x: e.x,
                y: e.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: Math.random() < 0.7 ? '#888' : '#bba27a',

                life: 1.2 + Math.random() * 0.5,

                // ★サイズを asteroid に合わせる
                size: (0.5 + Math.random() * 0.6) * scale,

                isShard: true,
                shardType: 'rock',

                angle: angle,
                rotV: (Math.random() - 0.5) * 0.6
            });

        }

        // e.size === 1 が最大サイズです
        if (e.size === 1) {
            AudioSys.playSE('explode_medium', e.x, e.y);
        } else {
            AudioSys.playSE('explode_small', e.x, e.y);
        }
    }
    // --- 小型（小）：その他雑魚（triangleは上で処理済み）---
    else {
        AudioSys.playSE('explode_small', e.x, e.y);
        
        // ★ULTRAの時のみ、その他の雑魚（CubeやTadpoleなど）でも軽い歪みを追加
        if (currentGraphicsQuality === 'ULTRA' && typeof distortGrid === 'function') {
            distortGrid(e.x, e.y, 12, 60);
        }
    }

    // =========================================================
    // ★ 修正：スコア加算（ボスは生存時間でスコアが変動する）
    // =========================================================
    let pts = ENEMY_SCORES[e.type] || DEFAULT_ENEMY_SCORE;

    if (e.type === 'boss' || e.type === 'battleship') {
        const baseScore = pts;
        const aliveFrames = e.aliveTimer || 0;
        
        // 30秒 (60fps * 30 = 1800フレーム) を基準とする
        const angerThreshold = 1800; 

        if (aliveFrames < angerThreshold) {
            // --- 早期撃破ボーナス（最大2倍）---
            // 早く倒すほど倍率が高い（0秒=2.0倍, 30秒=1.0倍）
            const timeRatio = 1.0 - (aliveFrames / angerThreshold);
            const bonusMult = 1.0 + (timeRatio * 1.0); 
            pts = Math.floor(baseScore * bonusMult);
        } else {
            // --- 怒りモードペナルティ（最小0.1倍）---
            // 30秒を超えると徐々に減少し、120秒(7200F)で最低値になる
            const overTime = aliveFrames - angerThreshold;
            const penaltyRatio = Math.min(1.0, overTime / (7200 - angerThreshold));
            const penaltyMult = 1.0 - (penaltyRatio * 0.9); // 1.0 -> 0.1 に減少
            pts = Math.max(Math.floor(baseScore * penaltyMult), Math.floor(baseScore * 0.1));
        }
    }

    score += pts;
    ui.score.innerText = score.toString().padStart(6, '0');

    if (typeof addExtremeTimeAttackGaugeSeconds === 'function' && typeof isExtremeTimeAttackMode === 'function' && isExtremeTimeAttackMode()) {
        const bonusMap = EXTREME_TIME_ATTACK_CONFIG.KILL_BONUS_SECONDS;
        const gain = bonusMap[e.type] || bonusMap.default || 0;
        addExtremeTimeAttackGaugeSeconds(gain);
    }
    
    // ボス撃破時は文字を少し強調する（alphaを高く、寿命を長く）
    const isBossClass = (e.type === 'boss' || e.type === 'battleship');
    const popLife = isBossClass ? 120 : 40;
    const popVy = isBossClass ? -0.5 : -1;
    
    spawnScorePopupObj({ 
        x: e.x, y: e.y, 
        text: pts, 
        life: popLife, 
        alpha: 1, 
        vy: popVy,
        isBoss: isBossClass // 描画側で色を変えるためのフラグ
    });

    // --- ドロップ処理 ---
    if (e.noDrop || e.drop === 'none') return;
    const itemProps = { x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 };

    // 実際のドロップ内容を判定する
    let finalDropType = e.drop;

    // ==========================================
    // ★追加: ドロップする瞬間にクリスタルが満タンならPアイテムに変換
    // ==========================================
    if (finalDropType === 'crystal' && player.satellites && player.satellites.length >= MAX_SATELLITES) {
        finalDropType = 'point'; // Pアイテムに変える
    }

    if (finalDropType === 'level') {
        levelItemsDroppedInStage++;
    }

    // ★変更: e.drop ではなく finalDropType で判定するように書き換える
    if (finalDropType === 'level') powerups.push({ ...itemProps, type: 'level', life: ITEM_LIFE * 2 });
    else if (finalDropType === 'laser') powerups.push({ ...itemProps, type: 'laser', life: ITEM_LIFE });
    else if (finalDropType === 'invincible') powerups.push({ ...itemProps, type: 'invincible', life: ITEM_LIFE });
    else if (finalDropType === 'crystal') crystals.push({ ...itemProps, life: ITEM_LIFE });
    else if (finalDropType === 'shield') powerups.push({ ...itemProps, type: 'shield', life: ITEM_LIFE });
    else if (finalDropType === 'point') powerups.push({ ...itemProps, type: 'point', life: ITEM_LIFE });

    // ★修正：出たアイテムの種類に合わせてカウント（安全対策版）
    if (['level', 'laser', 'invincible', 'crystal', 'shield', 'point'].includes(finalDropType)) {
        if (typeof window.playStats !== 'undefined' && window.playStats.items && window.playStats.items[finalDropType]) {
            window.playStats.items[finalDropType].spawned++;
        }
    }
}

function applySeparation(e) {
    if (frame % 2 !== 0) return;
    enemyPool.pool.forEach(other => {
        // 非アクティブ、自分自身、死亡している敵は無視
        if (!other.active || e === other || other.hp <= 0) return;

        // ★追加: 同じ編隊グループ（リーダー・フォロワーの関係）なら反発処理をキャンセル
        const isSameFormation = 
            (e.leader && e.leader === other) || 
            (other.leader && other.leader === e) || 
            (e.leader && other.leader && e.leader === other.leader);

        if (isSameFormation) return;

        const odx = e.x - other.x;
        const ody = e.y - other.y;
        const distSq = odx * odx + ody * ody;

        // 距離が30未満(二乗で900未満)の場合
        if (distSq > 0 && distSq < 900) {
            const od = Math.sqrt(distSq); // 衝突が確定した場合のみ平方根を計算
            const push = (30 - od) * 0.05;
            e.x += (odx / od) * push;
            e.y += (ody / od) * push;
        }
    });
}

function updateEnemiesForDying() {
    enemyPool.pool.forEach(e => {
        // ★追加: 非アクティブ（プール内待機中）のオブジェクトは無視する
        if (!e.active) return;

        // 自機から敵機へのベクトル（逃げる方向）
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const d = Math.hypot(dx, dy) || 0.001;

        // 離脱ベクトルを計算（徐々に加速して去っていく）
        const escapeSpeed = e.speed * 1.5; // 離脱なので少し速めに
        e.vx += (dx / d) * 0.1;
        e.vy += (dy / d) * 0.1;

        // 速度制限をかけつつ更新
        const cv = Math.hypot(e.vx, e.vy);
        if (cv > escapeSpeed) {
            e.vx = (e.vx / cv) * escapeSpeed;
            e.vy = (e.vy / cv) * escapeSpeed;
        }

        e.x += e.vx;
        e.y += e.vy;

        // 進行方向を向かせる
        e.angle = Math.atan2(e.vy, e.vx);

        // 各種演出の更新（しっぽやパーツ回転）
        if (e.type === 'dragon') {
            let lx = e.x, ly = e.y;
            e.segments.forEach(s => {
                const dd = Math.hypot(lx - s.x, ly - s.y);
                if (dd > 10) { s.x += (lx - s.x) * 0.3; s.y += (ly - s.y) * 0.3; }
                lx = s.x; ly = s.y;
            });
        }
        if (e.type === 'tadpole') {
            e.history.unshift({ x: e.x, y: e.y });
            if (e.history.length > 60) e.history.pop();
        }
        if (e.type === 'lightcycle') {
            //if (!e.history) e.history = [];
            e.history.unshift({ x: e.x, y: e.y });
            if (e.history.length > ENEMY_LIMITS.LIGHTCYCLE_TAIL_LENGTH) e.history.pop();
        }
        if (e.type === 'triangle' || e.type === 'cube') {
            e.rotX += 0.1; e.rotY += 0.1;
        }
    });
}

function updateWormholes() {
wormholes.forEach((w) => {
        w.life--;
        if (w.active) {
            if (stage !== 9 && stage !== 10 && w.life > 60 && w.life % SPAWN_SETTINGS.SPAWN_INTERVAL === 0) {
                const isExtremeMode = (typeof isExtremeTimeAttackMode === 'function') && isExtremeTimeAttackMode();

                if (isExtremeMode) {
                    const pool = getExtremeTimeAttackSpawnPool();
                    const type = pool[Math.floor(Math.random() * pool.length)];
                    spawnEnemy(w.x, w.y, type);
                } else {
                
                    // ★修正：escaped を含めて remaining（残りノルマ） を正しく計算
                    const escaped = window.enemiesEscaped || 0;
                    const remaining = enemiesToSpawn - (enemiesKilled + escaped);
                    
                    if (!isBossSpawned && (remaining <= enemiesToSpawn * 0.2 || spawnedCount >= enemiesToSpawn)) {
                        triggerBossEncounter();
                        isBossSpawned = true;
                    } else {
                        const bossEx = enemyPool.pool.some(e => e.active && e.type === 'boss');
                        if (spawnedCount < enemiesToSpawn || bossEx) {
                            const pool = STAGE_ENEMIES[stage] || STAGE_ENEMIES[7];
                            const type = Math.random() < 0.15 ? 'cube' : pool[Math.floor(Math.random() * pool.length)];
                            spawnEnemy(w.x, w.y, type);
                        }
                    }
                }
            }
            if (w.life <= 0) w.active = false;

            const dx = player.x - w.x, dy = player.y - w.y;
            const d = Math.hypot(dx, dy) || 0.01;
            if (d < 180) {
                const f = 500 / (d + 1);
                player.x += (dx / d) * f * 0.01 * SPEED_SCALE * gameSpeed;
                player.y += (dy / d) * f * 0.01 * SPEED_SCALE * gameSpeed;
            }
            if (frame % 2 === 0 && typeof distortGrid === 'function') {
                let pull = -15 + Math.sin(frame * 0.07) * 2;
                if (w.life < 60) pull *= (Math.max(0, w.life) / 60);
                distortGrid(w.x, w.y, pull, 250);
            }
        }
    });
    wormholes = wormholes.filter(w => w.life > -60);
}

function getExtremeTimeAttackSpawnPool() {
    const state = (typeof getExtremeTimeAttackState === 'function') ? getExtremeTimeAttackState() : null;
    const survivedSeconds = state ? Math.floor((state.survivalFrames || 0) / 60) : 0;
    const pool = [];

    EXTREME_TIME_ATTACK_SPAWN_TIERS.forEach((tier) => {
        if (survivedSeconds >= tier.unlockAtSeconds) {
            pool.push(...tier.pool);
        }
    });

    return pool.length > 0 ? pool : ['triangle', 'tadpole', 'cube'];
}

// =========================================================
// 7. 敵機生成と共通AI (Enemy Spawning & Common AI)
// =========================================================
function spawnWormhole() {
    if (isStageClear) return;
    if (stage === 9 && rushBossIndex >= 8) return;
    
    if (stage !== 9 && isBossSpawned && !enemyPool.pool.some(e => e.active && (e.type === 'boss' || e.type === 'battleship'))) return;

    // 変数に作ってからpushする形に修正（配列末尾への直接アクセス撲滅）
    const newWormhole = {
        x: WALL_MARGIN + 100 + Math.random() * (worldSize - WALL_MARGIN * 2 - 200),
        y: WALL_MARGIN + 100 + Math.random() * (worldSize - WALL_MARGIN * 2 - 200),
        life: 400, maxLife: 400, active: true
    };
    
    wormholes.push(newWormhole);
    distortGrid(newWormhole.x, newWormhole.y, 50, 150);
}

function spawnEnemy(x, y, type, size = 1, overrideColor = null) {

    if (isStageClear) return;
    if (stage === 9 && rushBossIndex >= 8) return;
    if (stage !== 9 && isBossSpawned && type !== 'boss' && type !== 'battleship') {
        const bossExists = enemyPool.pool.some(e => e.active && (e.type === 'boss' || e.type === 'battleship'));
        if (!bossExists) return; // ボスが既に死んでいるなら雑魚は出さない
    }

    const spd = SPEED_SCALE;
    const stageMag = (1.0 + (stage - 1) * DIFFICULTY_CONFIG.SPEED_INC) * bossAngerMinionSpeedMag; 

    const hpMag = (stage - 1) * DIFFICULTY_CONFIG.HP_INC;

    const angle = Math.random() * Math.PI * 2;
    const bSpd = 5.0 * spd;
    const vx = Math.cos(angle) * bSpd;
    const vy = Math.sin(angle) * bSpd;

    // -----------------------------------------------------
    // アイテムドロップ決定ロジック
    // -----------------------------------------------------
    let dropType = 'crystal'; // デフォルト
    
    const shieldChance = (player.shield < 30) ? DROP_RATES.SHIELD_LOW : DROP_RATES.SHIELD_NORM;
    const canDropLevel = true;
    const levelChance = canDropLevel ? DROP_RATES.LEVEL : 0;

    // 1. 設定された確率の合計値を計算
    const totalRate = levelChance + DROP_RATES.LASER + DROP_RATES.INVINCIBLE + shieldChance;
    
    // 2. 合計が1.0を超える場合は、比率を保ったまま1.0に収める（スケールダウン）
    const scale = totalRate > 1.0 ? 1.0 / totalRate : 1.0;

    const rnd = Math.random();

    // 3. スケールを掛けた値で累積判定を行う
    if (rnd < levelChance * scale) {
        dropType = 'level';
    }
    else if (rnd < (levelChance + DROP_RATES.LASER) * scale) {
        dropType = 'laser';
    }
    else if (rnd < (levelChance + DROP_RATES.LASER + DROP_RATES.INVINCIBLE) * scale) {
        dropType = 'invincible';
    }
    else if (rnd < (levelChance + DROP_RATES.LASER + DROP_RATES.INVINCIBLE + shieldChance) * scale) {
        dropType = 'shield';
    }
    // 上記のどれにも当てはまらない場合（rnd が totalRate * scale 以上の場合）は初期値の 'crystal' になる

    if (type === 'dragon') {
        const e = spawnEnemyObj({
            x: x, y: y, vx: vx, vy: vy,
            hp: ENEMY_HP.dragon + hpMag * 2,
            speed: ENEMY_SPEEDS.DRAGON * spd * stageMag,
            color: '#c00', type: 'dragon',
            angle: Math.atan2(vy, vx),
            drop: 'none',
            scale: 0.9,
        });

        if (!e) return;

        const segmentCount = 8;
        const initialAngle = Math.atan2(vy, vx);
        for (let i = 0; i < segmentCount; i++) {
            e.segments.push({
                x: x, y: y, angle: initialAngle
            });
        }
        spawnedCount++;

    } else if (type === 'cube') {
        spawnEnemyObj({
            x: x, y: y, vx: vx, vy: vy,
            hp: ENEMY_HP.cube + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.CUBE * spd * stageMag,
            color: '#0f0', type: 'cube', angle: 0,
            drop: dropType,
            scale: 0.8, rotX: 0, rotY: 0,
            isWarping: true
        });
        spawnedCount++;
    } else if (type === 'tadpole') {
        spawnEnemyObj({
            x: x, y: y, vx: vx, vy: vy,
            hp: ENEMY_HP.tadpole,
            speed: ENEMY_SPEEDS.TADPOLE * spd * stageMag,
            color: '#0ff', type: 'tadpole', angle: 0,
            drop: 'none',
            scale: 0.6
        });
        spawnedCount++;
    } else if (type === 'triangle') {
        const patterns = ['V', 'W', 'H'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const initialAngle = Math.atan2(vy, vx);

        let selectedColor;
        let selectedFormationType = 'custom';

        if (overrideColor) {
            selectedColor = overrideColor;
        } else {
            const formationTypes = ['blue', 'purple', 'yellow'];
            selectedFormationType = formationTypes[Math.floor(Math.random() * formationTypes.length)];
            const colorMap = {
                blue: '#00f0ff',
                purple: '#bf00ff',
                yellow: '#ffdf00'
            };
            selectedColor = colorMap[selectedFormationType];
        }

        // 1. リーダー機の生成
        const leader = spawnEnemyObj({
            x: x, y: y, vx: vx, vy: vy,
            hp: ENEMY_HP.triangle + Math.floor(hpMag * 0.5),
            speed: ENEMY_SPEEDS.TRIANGLE * spd * stageMag,
            color: selectedColor,
            type: 'triangle',
            formationType: selectedFormationType,
            angle: initialAngle,
            drop: dropType,
            scale: 0.7,
            isLeader: true, // ※1
            rotX: Math.random() * Math.PI,
            rotY: Math.random() * Math.PI,
            rotZ: Math.random() * Math.PI,
            isWarping: true
        });
        if (!leader) return;
        spawnedCount += 0.2;

        // 2. フォロワー機の生成ループ
        for (let i = 0; i < 4; i++) {
            const ignoreLimit = isBossSpawned || stage === 9 || stage === 10;
            if (!ignoreLimit && spawnedCount >= enemiesToSpawn) break;

            let offX = 0, offY = 0;
            const side = (i % 2 === 0) ? 1 : -1;
            const step = Math.floor(i / 2) + 1;

            if (pattern === 'V') { offX = -step * 25; offY = side * step * 25; }
            else if (pattern === 'W') { offX = (step === 1) ? -25 : 0; offY = side * step * 25; }
            else if (pattern === 'H') { offX = (step === 1) ? 25 : -25; offY = side * 25; }

            // フォロワー機を変数で受け取る
            const follower = spawnEnemyObj({
                x: x, y: y, vx: vx, vy: vy,
                hp: ENEMY_HP.triangle,
                speed: ENEMY_SPEEDS.TRIANGLE * spd * stageMag,
                color: selectedColor,
                type: 'triangle',
                formationType: selectedFormationType,
                angle: initialAngle,
                drop: 'none',
                scale: 0.7,
                leader: leader, // 生成したリーダーを割り当て
                formOffset: { x: offX, y: offY },
                rotX: Math.random() * Math.PI,
                rotY: Math.random() * Math.PI,
                rotZ: Math.random() * Math.PI,
                isWarping: true
            });

            // フォロワーが正常に作れた時だけ配列に追加
            if (follower) {
                leader.followers.push(follower);
                spawnedCount += 0.2;
            }
        }

    } else if (type === 'boss') {
        const variantIndex = (stage - 1) % BOSS_VARIANTS.length;
        const variant = BOSS_VARIANTS[variantIndex];
        const bossHp = variant.hp + (stage - 1) * 10;
        const sX = Number(x); const sY = Number(y);

        const e = spawnEnemyObj({
            x: sX, y: sY,
            vx: 0, vy: 0,
            hp: bossHp, maxHp: bossHp,
            speed: 1.2 * variant.speedFactor * SPEED_SCALE * (1.0 + (stage - 1) * 0.08),
            color: variant.color,
            type: 'boss', variant: variant, angle: 0,
            drop: 'shield',
            scale: 1.5 + (variant.sides * 0.1),
            spawnMax: 150,
            isSpawning: true
        });
        if (!e) return; // ★追加: 生成失敗（プールがいっぱい）の場合は以降の処理をスキップ

        // ボス専用の特殊なパラメータを追加でセット
        e.spawnX = sX;
        e.spawnY = sY;
        e.cameraLerpTimer = 0;

        spawnedCount++;

    } else if (type === 'bubble' || type === 'asteroid') {
        const sizeFactor = 1.0 + (stage - 1) * 0.1;
        
        // HPは元の3段階のまま
        const hp = (size === 1 ? 4 : size === 2 ? 2 : 1) + Math.floor((stage - 1) * 0.5);
        
        // ★修正: 元の baseScale (1.8 / 1.1 / 0.6) をそれぞれ1.2倍に変更
        // 大: 1.8 * 1.2 = 2.16
        // 中: 1.1 * 1.2 = 1.32
        // 小: 0.6 * 1.2 = 0.72
        const baseScale = size === 1 ? 2.16 : size === 2 ? 1.32 : 0.72;

        const baseSpdConst = (type === 'bubble') ? ENEMY_SPEEDS.BUBBLE : ENEMY_SPEEDS.ASTEROID;
        const moveSpeed = (baseSpdConst * 0.7) * (1 + size * 0.4) * spd * stageMag;
        const ang = Math.random() * Math.PI * 2;

        spawnEnemyObj({
            x: x, y: y, 
            vx: Math.cos(ang) * moveSpeed, vy: Math.sin(ang) * moveSpeed,
            hp: hp, speed: moveSpeed,
            color: (type === 'bubble') ? '#0ff' : '#fff',
            type: type, variant: (type === 'bubble') ? 'bubble' : 'asteroid',
            size: size, angle: Math.random() * Math.PI * 2,
            rotSpd: (Math.random() - 0.5) * 0.1,
            scale: baseScale * sizeFactor, drop: 'none',
            trackingStart: 300 + Math.random() * 200,
            isWarping: true
        });

    } else if (type === 'hunter') {
        spawnEnemyObj({
            x: x, y: y, vx: vx * 0.5, vy: vy * 0.5,
            hp: ENEMY_HP.hunter + Math.floor(hpMag * 1.5),
            speed: ENEMY_SPEEDS.HUNTER * spd * stageMag,
            color: '#fa4', type: 'hunter', angle: 0,
            drop: dropType, scale: 1.2,
            state: 'approach'
        });
        spawnedCount++;
    } else if (type === 'battleship') {
        const variant = BOSS_VARIANTS[BOSS_VARIANTS.length - 1];
        
        const e = spawnEnemyObj({
            x: x, y: y, vx: 0, vy: 0,
            hp: variant.hp, maxHp: variant.hp,
            speed: variant.speedFactor * SPEED_SCALE,
            color: variant.color, type: 'battleship', angle: 0,
            drop: 'none', scale: 1.0,
            spawnMax: 240,
            isSpawning: true, variant: variant
        });
        
        if (!e) return

        // ボス・戦艦専用の特殊パラメータを直接セット
        e.spawnX = x;
        e.spawnY = y;

        spawnedCount++;
        if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_large');

    } else if (type === 'phantom') {
        spawnEnemyObj({
            x: x, y: y, vx: vx * 0.5, vy: vy * 0.5,
            hp: ENEMY_HP.phantom + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.PHANTOM * spd * stageMag,
            color: '#0ff', type: 'phantom', angle: 0,
            drop: dropType, scale: 1.0,
            state: 'stealth', alpha: 0.1
        });
        spawnedCount++;

    } else if (type === 'eclipse') {
        const MIN_DISTANCE = 600;
        
        // ★修正: enemyPool.pool を使い、active なものだけを対象にする
        const tooClose = enemyPool.pool.some(other => {
            if (other.active && other.type === 'eclipse') {
                const dist = Math.hypot(x - other.x, y - other.y);
                return dist < MIN_DISTANCE;
            }
            return false;
        });
        
        if (tooClose) return;

        spawnEnemyObj({
            x: x, y: y, vx: vx * 0.2, vy: vy * 0.2,
            hp: ENEMY_HP.eclipse + hpMag * 5,
            speed: ENEMY_SPEEDS.ECLIPSE * spd * stageMag,
            color: '#0ff', type: 'eclipse', angle: 0,
            rotSpeed: 0.02, drop: dropType, scale: 1.5
        });
        spawnedCount++;

    } else if (type === 'jellyfish' || type === 'spark_jelly') {
        const isSpark = (type === 'spark_jelly');
        
        const e = spawnEnemyObj({
            x: x, y: y, vx: vx * 0.1, vy: vy * 0.1,
            hp: (isSpark ? ENEMY_HP.spark_jelly : ENEMY_HP.jellyfish) + Math.floor(hpMag * 1.5),
            speed: ENEMY_SPEEDS.JELLYFISH * spd * stageMag * (isSpark ? 1.2 : 1.0),
            color: '#0ff', type: 'jellyfish', variant: isSpark ? 'spark' : 'normal',
            angle: angle,
            drop: dropType, scale: isSpark ? 1.4 : 1.2,
            timer: Math.random() * 100,
            isWarping: true
        });

        if (!e) return;
        
        // クラゲ特有のパラメータを直接セット
        e.prevAngle = angle;
        
        spawnedCount++;

    } else if (type === 'sweeper') {
        const viewW = width / cameraScale;
        const viewH = height / cameraScale;
        const count = 8; 
        const spacing = 70; // 機体同士の間隔
        const totalSpan = spacing * (count - 1);
        const speed = ENEMY_SPEEDS.SWEEPER * spd * stageMag;

        // ★追加：前回と同じ方向が出ないようにする仕組み
        if (typeof window.lastSweeperDir === 'undefined') window.lastSweeperDir = -1;
        let dir;
        do {
            dir = Math.floor(Math.random() * 4); // 0:上, 1:下, 2:左, 3:右
        } while (dir === window.lastSweeperDir);
        window.lastSweeperDir = dir; // 今回の方向を記憶しておく

        let startX, startY, moveVx, moveVy, baseAngle;
        let offsetX = 0, offsetY = 0;

        // ★追加：4方向ごとの初期座標・速度・並べ方の計算
        if (dir === 0) { // 上から下へ
            startY = camera.y - 100;
            startX = camera.x + (viewW - totalSpan) / 2; // 中央に揃える
            offsetX = spacing; // 横に並べる
            moveVx = 0;
            moveVy = speed;
            baseAngle = Math.PI / 2; // 下向き
        } else if (dir === 1) { // 下から上へ
            startY = camera.y + viewH + 100;
            startX = camera.x + (viewW - totalSpan) / 2;
            offsetX = spacing;
            moveVx = 0;
            moveVy = -speed;
            baseAngle = -Math.PI / 2; // 上向き
        } else if (dir === 2) { // 左から右へ
            startX = camera.x - 100;
            startY = camera.y + (viewH - totalSpan) / 2; // 中央に揃える
            offsetY = spacing; // 縦に並べる
            moveVx = speed;
            moveVy = 0;
            baseAngle = 0; // 右向き
        } else if (dir === 3) { // 右から左へ
            startX = camera.x + viewW + 100;
            startY = camera.y + (viewH - totalSpan) / 2;
            offsetY = spacing;
            moveVx = -speed;
            moveVy = 0;
            baseAngle = Math.PI; // 左向き
        }

        for (let i = 0; i < count; i++) {
            spawnEnemyObj({
                x: startX + offsetX * i,
                y: startY + offsetY * i,
                vx: moveVx, vy: moveVy,
                hp: ENEMY_HP.sweeper + Math.floor(hpMag),
                speed: ENEMY_SPEEDS.SWEEPER * spd * stageMag,
                color: '#bbbbbb', 
                type: 'sweeper',
                angle: baseAngle, // 計算した向きをセット
                drop: Math.random() < 0.1 ? dropType : 'none',
                scale: 0.8,
                isWarping: true
            });
        }
        if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');

    } else if (type === 'lightcycle') {
        let rx, ry, ra;
        
        // カメラの表示範囲（ワールド座標における画面の幅と高さ）を取得
        const viewW = width / cameraScale;
        const viewH = height / cameraScale;

        // ボス戦中（Stage 9/10）かどうかの判定
        if (stage === 9 || stage === 10 || isBossSpawned) {
            // 画面の上下左右の端（画面外 100px）から出現させる
            const edge = Math.floor(Math.random() * 4);
            const margin = 100;

            if (edge === 0) { // 上から下へ
                rx = camera.x + Math.random() * viewW;
                ry = camera.y - margin;
                ra = Math.PI / 2;
            } else if (edge === 1) { // 右から左へ
                rx = camera.x + viewW + margin;
                ry = camera.y + Math.random() * viewH;
                ra = Math.PI;
            } else if (edge === 2) { // 下から上へ
                rx = camera.x + Math.random() * viewW;
                ry = camera.y + viewH + margin;
                ra = -Math.PI / 2;
            } else { // 左から右へ
                rx = camera.x - margin;
                ry = camera.y + Math.random() * viewH;
                ra = 0;
            }
        } else {
            // 通常面：ワームホールの位置から出現
            rx = x; 
            ry = y; 
            // ★修正: プレイヤーの大まかな方角を向きつつ、必ず上下左右（90度単位）にスナップさせる
            const rawAngle = Math.atan2(player.y - y, player.x - x);
            ra = Math.round(rawAngle / (Math.PI / 2)) * (Math.PI / 2);
        }

        // ワールド境界の外に出すぎないようにクランプ（安全策）
        rx = Math.max(0, Math.min(worldSize, rx));
        ry = Math.max(0, Math.min(worldSize, ry));

        const lcSpd = Math.min(ENEMY_SPEEDS.LIGHTCYCLE * spd * stageMag, ENEMY_LIMITS.LIGHTCYCLE_MAX);

        const e = spawnEnemyObj({
            x: rx, y: ry,
            vx: Math.cos(ra) * lcSpd, // 初速をセット
            vy: Math.sin(ra) * lcSpd,
            speed: lcSpd,
            hp: ENEMY_HP.lightcycle + Math.floor(hpMag * 1.5),
            color: '#e0e0e0', 
            type: 'lightcycle',
            angle: ra,
            isWarping: true, 
            drop: dropType
        });
        
        if (!e) return; // ★追加

        // ライトサイクル特有の初期設定
        e.history.push({ x: rx, y: ry }); // 履歴の初期化
        e.inActiveRange = true;           // 出現直後は判定を有効にする

        spawnedCount++;

        if (typeof AudioSys !== 'undefined') {
            AudioSys.stopSE('lc_engine'); 
            AudioSys.playSE('lc_engine', rx, ry); 
        }
    }
}

function updateEnemies() {
    // 現在の表示範囲（カメラ位置＋画面サイズ）
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    // 攻撃や当たり判定を許可するマージン（画面外200pxまで）
    const ACTIVE_MARGIN = 200;

    // ========================================================
    // ★本来の撃破処理をまとめた関数
    // ========================================================
    const executeRealDeath = (e) => {
        // ラスボス撃破演出
        if (e.type === 'battleship') {
            gameSpeed = 0.05; // 完全撃破時にさらに超スローにする
            playerBulletPool.clearAll();
            enemyBulletPool.clearAll();
            createExplosion(e.x, e.y, '#fff', 200);

            // ==========================================
            // ★変更：大爆発で大量の装甲破片を画面の端まで吹き飛ばす
            // ==========================================
            // 数を60個に増量
            for (let i = 0; i < 60; i++) {
                const shardAngle = Math.random() * Math.PI * 2;
                // スローモーションに負けないよう、初速を以前の約2.5倍に強化
                const shardSpeed = (30 + Math.random() * 50) * SPEED_SCALE;

                // 中心の一点からではなく、少し広い範囲から発生させて広がり感を出す
                const offsetDist = Math.random() * 120;
                const startX = e.x + Math.cos(shardAngle) * offsetDist;
                const startY = e.y + Math.sin(shardAngle) * offsetDist;

                spawnParticleObj({
                    x: startX,
                    y: startY,
                    vx: Math.cos(shardAngle) * shardSpeed,
                    vy: Math.sin(shardAngle) * shardSpeed,
                    color: Math.random() > 0.5 ? '#fff' : '#0ff',
                    life: 1.5 + Math.random(), // 寿命を長くして画面外まで飛ばす
                    size: 0.5 + Math.random(), // 少し大きめの破片も混ぜる
                    isShard: true,
                    shardType: 'tri',
                    angle: shardAngle,
                    rotV: (Math.random() - 0.5) * 1.2 // 回転も少し激しく
                });
            }

            if (typeof AudioSys !== 'undefined') {
                AudioSys.playSE('explode_large');
                if (AudioSys.bgmEl) {
                    AudioSys.bgmEl.pause();
                }
                AudioSys.playBGM('clear');
            }
        }

        // --- 分裂処理の修正 ---
        // ★分裂の限界を「size < 3」に戻す
        if ((e.type === 'asteroid' || e.type === 'bubble') && e.size < 3 && !e.noSplit) {
            for (let i = 0; i < 2; i++) {
                spawnEnemy(e.x, e.y, e.type, e.size + 1, e.variant);
            }
        }

        destroyEnemy(e);
    };

    enemyPool.pool.forEach(e => {
        // ★追加: プール内で待機中（非アクティブ）のオブジェクトは処理しない
        if (!e.active) return;

        // --- 画面内（＋マージン）にいるかどうかの判定 ---
        const inActiveRange = (
            e.x > camera.x - ACTIVE_MARGIN &&
            e.x < camera.x + viewW + ACTIVE_MARGIN &&
            e.y > camera.y - ACTIVE_MARGIN &&
            e.y < camera.y + viewH + ACTIVE_MARGIN
        );

        // 敵のプロパティとしてフラグを保存（プレイヤーの弾との判定に使うため）
        e.inActiveRange = inActiveRange;

        // ▼▼▼ ここから追加: ワープイン演出（拡大・フェードイン）の進行 ▼▼▼
        if (e.isWarping) {
            //if (e.warpPercent === undefined) e.warpPercent = 0;
            
            // 30フレーム（約0.5秒）かけて 0.0 から 1.0 に増やす
            e.warpPercent += 1.0 / 30; 
            
            if (e.warpPercent >= 1.0) {
                e.warpPercent = 1.0;
                e.isWarping = false; // 出現完了
            }
        }

        // ========================================================
        // ★新規追加：タイムリミット（グリッド滞在限界）による強制ワープアウト
        // ========================================================
        if (e.gridLifeSpawnId !== e.spawnId) {
            e.gridLifeSpawnId = e.spawnId;
            e.gridLife = undefined; 
            if (e.type !== 'phantom') e.alpha = 1.0; 
            
            e.isWarpingOut = false; // ★追加：消失フラグリセット
            e.originalScale = undefined; // ★追加：スケール記憶のリセット
        }

        if (e.gridLife === undefined) {
            if (e.type === 'boss' || e.type === 'battleship') {
                e.gridLife = Infinity; 
            } else if (e.type === 'cube' || e.type === 'asteroid' || e.type === 'bubble' || e.type === 'sweeper') {
                e.gridLife = 1200; 
            } else if (e.type === 'hunter' || e.type === 'phantom' || e.type === 'eclipse' || e.type === 'fighter') {
                e.gridLife = 600;  
            } else {
                e.gridLife = 900;  
            }
        }

        // ========================================================
        // ★新規追加：ワープアウト（波打ちフェードアウト）の進行処理
        // ========================================================
        if (e.isWarpingOut) {
            e.warpOutTimer -= gameSpeed;
            
            e.invuln = 10; // 消失中は無敵
            e.isDying = true; // 撃破数カウントや当たり判定を通さないため

            if (e.warpOutTimer <= 0) {
                // アニメーション完了で完全に消す
                e.hp = 0;
                e.isDead = true;
                e.active = false;
                e.isWarpingOut = false; 
            }
            return; // 消失中は以降の処理（移動など）をすべてスキップ
        }
        // ========================================================

        // ワープイン完了後から寿命を減らす
        // ★修正: !e.isWarpingOut の条件を追加
        if (!e.isWarping && !e.isWarpingOut && e.gridLife !== Infinity && !e.isDying && !e.isDead) {
            e.gridLife -= gameSpeed;

            // ★修正：Phantomは自前のステルス処理でalphaを使用するため、警告点滅から除外する
            if (e.gridLife < 180 && e.type !== 'phantom') {
                if (Math.floor(e.gridLife) % 6 < 3) {
                    e.alpha = 0.2; 
                } else {
                    e.alpha = 1.0;
                }
            }

            // 寿命切れ
            if (e.gridLife <= 0) {

                // ==========================================
                // ★追加：逃亡した敵の数を「進行度」としてカウントする
                // ==========================================
                if (e.type !== 'asteroid' && e.type !== 'bubble' && e.type !== 'sweeper') {
                    if (e.type === 'triangle') {
                        window.enemiesEscaped = (window.enemiesEscaped || 0) + 0.2;
                    } else {
                        window.enemiesEscaped = (window.enemiesEscaped || 0) + 1;
                    }
                }
                
                // 空間が内側に歪んで吸い込まれる演出
                if (typeof distortGrid === 'function') distortGrid(e.x, e.y, -60, 150);

                // ★修正: 即座に消さず、消失アニメーション状態へ移行
                if (!e.isWarpingOut) {
                    e.isWarpingOut = true;
                    e.warpOutTimer = 60; // 1秒間のアニメーション
                    e.warpOutDuration = 60; 
                    
                    if (typeof distortGrid === 'function') distortGrid(e.x, e.y, -60, 150);
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
                }
            }
        }

        // ========================================================
        // ★修正：ボスの死亡アニメーション（フェードアウト＆誘爆）
        // ========================================================
        if (e.isDying) {
            e.dyingTimer -= 1;
            e.scale *= 0.98;
            
            if (e.opacity === undefined) e.opacity = 1.0;
            // 60フレーム（dyingTimerの初期値）かけて 1.0 から 0 へ
            e.opacity = Math.max(0, e.dyingTimer / 60);

            // 回転は重厚感を出すために極低速に設定
            e.angle += 0.01;

            // 激震（ガタガタ震える演出）
            e.x += (Math.random() - 0.5) * 8;
            e.y += (Math.random() - 0.5) * 8;

            // 誘爆エフェクト（確率は0.4のまま）
            if (Math.random() < 0.4) {
                const ox = (Math.random() - 0.5) * 180 * e.scale;
                const oy = (Math.random() - 0.5) * 180 * e.scale;
                const sparkColor = Math.random() > 0.5 ? '#fff' : (e.color || '#f00');
                const expSize = 5 + Math.random() * 8;

                createExplosion(e.x + ox, e.y + oy, sparkColor, expSize);
                spawnRingObj({ x: e.x + ox, y: e.y + oy, r: expSize, color: sparkColor, life: 0.5 });

                // 三角の破片（デブリ）
                if (Math.random() < 0.3) {
                    const shardAngle = Math.random() * Math.PI * 2;
                    const shardSpeed = 2 + Math.random() * 4;
                    spawnParticleObj({
                        x: e.x + ox, y: e.y + oy,
                        vx: Math.cos(shardAngle) * shardSpeed,
                        vy: Math.sin(shardAngle) * shardSpeed,
                        color: sparkColor,
                        life: 1.0 + Math.random() * 0.5,
                        size: 0.5 + Math.random(),
                        isShard: true,
                        shardType: 'tri',
                        angle: shardAngle,
                        rotV: (Math.random() - 0.5) * 0.4
                    });
                }
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');
            }

            if (e.dyingTimer <= 0) {
                e.isDying = false;
                e.isDead = true;
                executeRealDeath(e);
            }
            // 死亡演出中は以降の処理を行わない
            if (e.isDead) e.active = false; // ★追加: プールへ返却
            return;
        }

        // ==========================================
        // ★修正: 全ての編隊が共通の追従ロジックを使うようにする
        // ==========================================
        if (e.leader) {
            // 共通の安全な追従ロジック
            updateFormationMovement(e);
            
            // 追従中の個別の見た目アニメーション
            if (e.type === 'cube') { 
                e.rotX += 0.03; e.rotY += 0.04; 
            } else if (e.type === 'triangle') {
                e.rotX += 0.08; e.rotY += 0.12; e.rotZ += 0.05;
                /*
                // 副機のジェット噴射
                if (!e.isWarping && Math.random() < 0.35) {
                    const backX = Math.cos(e.angle + Math.PI);
                    const backY = Math.sin(e.angle + Math.PI);
                    const speedBase = 1.8 + Math.random() * 0.4;
                    spawnParticleObj({
                        x: e.x + backX * 16, y: e.y + backY * 16,
                        vx: backX * speedBase, vy: backY * speedBase,
                        color: e.color, size: 3, life: 0.45 + Math.random() * 0.08
                    });
                }
                */
            }
        } else {
            // AI（移動と射撃）の実行
            switch (e.type) {
                case 'dragon': updateDragonAI(e); break;
                case 'tadpole': updateTadpoleAI(e); break;
                case 'triangle': updateTriangleAI(e); break;
                case 'cube': updateCubeAI(e); break;
                case 'asteroid': updateAsteroidAI(e); break;
                case 'bubble': updateAsteroidAI(e); break;
                case 'hunter': updateHunterAI(e); break;
                case 'phantom': updatePhantomAI(e); break;
                case 'eclipse': updateEclipseAI(e); break;
                case 'jellyfish': updateJellyfishAI(e); break;
                case 'sweeper': updateSweeperAI(e); break;
                case 'lightcycle' : updateLightcycleAI(e); break;

                case 'fighter': updateFighterJetAI(e); break;
                case 'boss':
                    if (stage === 9) updateBossSpecialAI(e);
                    else updateBossAI(e);
                    break;
                case 'battleship': updateBattleshipAI(e); break;

            }
        }

        // ボスや巨大戦艦は質量が大きいため、雑魚敵との重なり反発処理を受けないように除外する
        if (e.type !== 'boss' && e.type !== 'battleship' && e.type !== 'lightcycle') {
            applySeparation(e);
        }

        // bubble または asteroid の場合に衝突ロジックを適用
        if (e.type === 'asteroid' || e.type === 'bubble') {
            applyAsteroidCollisions(e);
        }

        // ★ e.variant !== 'sweeper' を条件に追加（壁でバウンドせず通り抜けるようにする）
        if (e.variant !== 'sweeper') {
            applyWorldBoundary(e);
        }

        // --- 画面外にはるか遠くへ行った敵のクリンナップ（メモリリーク対策） ---
        // ワールドサイズからさらに1000px以上離れた場合は、不要なオブジェクトとして強制削除する
        if (e.x < -1000 || e.x > worldSize + 1000 || e.y < -1000 || e.y > worldSize + 1000) {
            e.hp = 0;
            e.isDead = true; 
            e.active = false; // ★追加: プールへ返却
            return; // これ以上の判定は行わずスキップ
        }

        // プレイヤーとの体当たり判定などは「画面付近」のみ
        if (inActiveRange) {
            checkPlayerCollision(e);
            checkSatelliteCollision(e);
        }

        // ========================================================
        // ★変更：撃破判定のトリガー
        // ========================================================
        if (e.hp <= 0 && !e.isDying && !e.isDead) {
            if (e.type === 'boss' || e.type === 'battleship') {
                // ボス級は即死させず、死亡演出ステートへ
                e.isDying = true;
                e.dyingTimer = 60; // 約1.5秒（90フレーム）かけて断末魔
                e.hp = 1;          // 削除されないようにHPを維持

                // ★追加：爆発開始の瞬間から全体をスローモーションにする
                if (stage != 9) {
                    gameSpeed = 0.25;
                }

                // ボスが死にかけたら、安全のために敵弾をすべて消す
                enemyBulletPool.clearAll();

                // 演出開始時の音と画面揺れ
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_medium');
                distortGrid(e.x, e.y, 100, 200);
            } else {
                // 雑魚敵は今まで通り即時撃破
                e.isDead = true;
                executeRealDeath(e);
            }
        }

        // ★追加: 完全に死んだ敵はプールへ返却する
        if (e.isDead) {
            e.active = false;
        }
    });
}

function updateFormationMovement(e) {
    const isLeaderValid = e.leader && 
                         e.leader.active && 
                         e.leader.spawnId === e.leaderSpawnId;

    if (!isLeaderValid) {
        // --- 解散処理 ---
        e.leader = null;
        e.leaderSpawnId = -1;

        const la = e.angle || 0;
        e.vx = Math.cos(la) * e.speed;
        e.vy = Math.sin(la) * e.speed;
        return;
    }

    // --- 本物のリーダーへの追従処理 ---
    const la = e.leader.angle;

    // ★追加: ワープ中は中心から徐々に所定のフォーメーション位置へ展開する演出
    const ratio = e.isWarping ? (e.warpPercent !== undefined ? e.warpPercent : 1.0) : 1.0;

    const rotatedOffX = (e.formOffset.x * Math.cos(la) - e.formOffset.y * Math.sin(la)) * ratio;
    const rotatedOffY = (e.formOffset.x * Math.sin(la) + e.formOffset.y * Math.cos(la)) * ratio;
    
    const targetX = e.leader.x + rotatedOffX; 
    const targetY = e.leader.y + rotatedOffY;

    // ★修正: ワープ中はズレないようにガッチリ固定(1.0)、通常時は滑らかに追従(0.3)
    const lerpFactor = e.isWarping ? 1.0 : 0.3 * gameSpeed;
    
    e.x += (targetX - e.x) * lerpFactor;
    e.y += (targetY - e.y) * lerpFactor;

    e.vx = e.leader.vx; 
    e.vy = e.leader.vy; 
    e.angle = la;
}

function updateSpawnLogic() {
    const isExtremeMode = (typeof isExtremeTimeAttackMode === 'function') && isExtremeTimeAttackMode();

    if (stage === 9) {
        // --- Stage 9: ボスラッシュ ---
        const bossExists = enemyPool.pool.some(e => e.active && e.type === 'boss');
        if (!bossExists && rushBossIndex < 8) {
            rushIntervalTimer++;
            // 3秒(180F)待って次ボス出現
            if (rushIntervalTimer > 180) {
                rushIntervalTimer = 0;
                const cx = worldSize / 2;
                const cy = worldSize / 2;

                // ワームホール演出
                wormholes.push({ x: cx, y: cy, life: 300, maxLife: 300, active: true });
                distortGrid(cx, cy, 300, 500);

                // ボス生成
                spawnEnemy(cx, cy, 'boss');
                // ★修正: 生成されたばかりのボスを取得（配列末尾ではなく、プールの最後尾でアクティブなbossを探す）
                // ※本来は spawnEnemy の戻り値を使うのが一番確実ですが、現状の仕様に合わせて探索します
                let newBoss = null;
                for (let i = enemyPool.pool.length - 1; i >= 0; i--) {
                    if (enemyPool.pool[i].active && enemyPool.pool[i].type === 'boss') {
                        newBoss = enemyPool.pool[i];
                        break;
                    }
                }

                if (newBoss && newBoss.type === 'boss') {
                    const variant = BOSS_VARIANTS[rushBossIndex];
                    newBoss.variant = variant;
                    newBoss.color = variant.color;
                    newBoss.hp = variant.hp * 1.5; // ラッシュ用にHP強化
                    newBoss.maxHp = newBoss.hp;
                    newBoss.scale = 1.5 + (variant.sides * 0.1);
                    newBoss.spawnMax = 150;
                    newBoss.isSpawning = true;
                }

                isBossSpawned = true;
                AudioSys.playSE('warning');
            }
        }
        // 2. 援護雑魚のスポーン
        if (bossExists &&
            enemyPool.getActiveCount() < BOSS_RUSH_SPAWN_CONFIG.MAX_ENEMIES &&
            frame % BOSS_RUSH_SPAWN_CONFIG.INTERVAL === 0) {

            const currentPool = STAGE_ENEMIES[rushBossIndex + 1] || STAGE_ENEMIES[1];
            let randomType = currentPool[Math.floor(Math.random() * currentPool.length)];

            // --- ★追加：lightcycleの出現制限ロジック ---
            const LC_LIMIT = 2; // 最大生存数
            // 現在画面にいる lightcycle の数をカウント
            const currentLCCount = enemyPool.pool.filter(e => e.active && e.type === 'lightcycle' && e.hp > 0).length;

            // 30%の確率で lightcycle を抽選するが、すでに3機以上いる場合は別の敵にする
            if (Math.random() < 0.3) {
                if (currentLCCount < LC_LIMIT) {
                    randomType = 'lightcycle';
                } else {
                    // 3機以上なら PHANTOM など別の敵に差し替える（またはそのままの randomType を使う）
                    randomType = 'phantom'; 
                }
            }

            const angle = Math.random() * Math.PI * 2;
            const dist = 600;
            const sx = Math.max(100, Math.min(worldSize - 100, player.x + Math.cos(angle) * dist));
            const sy = Math.max(100, Math.min(worldSize - 100, player.y + Math.sin(angle) * dist));

            // ワームホール生成
            wormholes.push({ x: sx, y: sy, life: 100, maxLife: 100, active: true });

            // 指定した数だけ敵を生成
            setTimeout(() => {
                if (gameState === 'PLAYING' && stage === 9) {
                    // ★修正：敵のタイプによってループ回数（出現数）を決める
                    // randomType が 'lightcycle' なら 1回、それ以外なら元の設定（SPAWN_COUNT）回ループする
                    const spawnCount = (randomType === 'lightcycle') ? 1 : BOSS_RUSH_SPAWN_CONFIG.SPAWN_COUNT;

                    for (let i = 0; i < spawnCount; i++) {
                        // 少し位置をずらして生成
                        const ox = (Math.random() - 0.5) * 20;
                        const oy = (Math.random() - 0.5) * 20;
                        spawnEnemy(sx + ox, sy + oy, randomType);
                    }
                }
            }, BOSS_RUSH_SPAWN_CONFIG.WARP_DELAY);
        }
    } else if (stage === 10) {
        // --- Stage 10: ラスボス出現 ---
        if (!isBossSpawned) {
            stage10SpawnTimer++;
            if (stage10SpawnTimer === 240) {
                spawnEnemy(worldSize / 2, worldSize / 2, 'battleship');
                isBossSpawned = true;
            }
        }
    } else {
        // --- 通常ステージ ---
        const maxW = SPAWN_SETTINGS.MAX_WORMHOLES_BASE + stage * 1.5;
        const activeWh = wormholes.filter(w => w.active).length;
        
        // ★修正：基本の最大数を取得
        let screenMax = STAGE_MAX_ON_SCREEN[stage - 1] || 40;
        
        // ★追加：スマホ（MOBILE_P や MOBILE_L）の時は、最大敵数を 80% に減らす
        if (typeof currentResolution !== 'undefined' && currentResolution.key.includes('MOBILE')) {
            screenMax = Math.floor(screenMax * 0.80);
        }

        const bossExists = enemyPool.pool.some(e => e.active && (e.type === 'boss' || e.type === 'battleship'));

        // 修正：ノルマに達していない、またはボス戦中ならスポーン可能
        const canSpawn = isExtremeMode || (spawnedCount < enemiesToSpawn) || (isBossSpawned && bossExists);

        const currentEnemyCount = enemyPool.getActiveCount();

        // 1. 通常のワームホール生成判定
        let shouldSpawn = gameState === 'PLAYING' && spawnWaitTimer <= 0 &&
            !isBossWarning && canSpawn &&
            activeWh < maxW && currentEnemyCount < screenMax &&
            Math.random() < SPAWN_SETTINGS.WORMHOLE_CHANCE;

        // 2. 敵が全滅してワームホールもない場合の救済処置
        if (gameState === 'PLAYING' && currentEnemyCount === 0 && activeWh === 0 && canSpawn) {
            shouldSpawn = true;
        }

        if (shouldSpawn) {
            spawnWormhole();
        }

        // ==========================================
        // ★ 追加：ボス出現のセーフティネット
        // ==========================================
        // 条件：プレイ中、ボス未出現、ワームホールなし、敵もいない、且つノルマ付近
        const escaped = window.enemiesEscaped || 0; // ★追加
        const remaining = enemiesToSpawn - (enemiesKilled + escaped); // ★修正
        
        if (!isExtremeMode && gameState === 'PLAYING' && !isBossSpawned && !isBossWarning && activeWh === 0 && currentEnemyCount === 0) {
            if (remaining <= enemiesToSpawn * 0.2 || spawnedCount >= enemiesToSpawn) {
                console.log("Safety Net: Triggering Boss Encounter");
                triggerBossEncounter();
                isBossSpawned = true;
            }
        }
        // ==========================================
    }
}

