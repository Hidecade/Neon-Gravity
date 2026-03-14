// =========================================================
// 個別敵機AI (Specific Enemy AIs)
// =========================================================
function updateTriangleAI(e) {
    // --- 1. 出現・展開アニメーション (全員共通) ---
    if (e.isWarping) {
        e.warpPercent = (e.warpPercent || 0) + 0.015;
        if (e.warpPercent >= 1) {
            e.warpPercent = 1;
            e.isWarping = false;
            e.scale = 0.7;
        } else {
            e.scale = 0.1 + 0.6 * e.warpPercent;
        }
    }

    // --- 2. 座標と移動の計算 ---
    if (!e.isLeader && e.leader && e.leader.hp > 0) {
        // 【副機】
        // リーダーの角度がNaNなら0扱いにする（安全対策）
        const angle = Number.isFinite(e.leader.angle) ? e.leader.angle : 0;

        const targetRx = e.formOffset.x * Math.cos(angle) - e.formOffset.y * Math.sin(angle);
        const targetRy = e.formOffset.x * Math.sin(angle) + e.formOffset.y * Math.cos(angle);

        const ratio = e.isWarping ? e.warpPercent : 1.0;

        e.x = e.leader.x + targetRx * ratio;
        e.y = e.leader.y + targetRy * ratio;
        e.angle = angle;
        e.vx = e.leader.vx || 0;
        e.vy = e.leader.vy || 0;

    } else {
        // 【リーダー機】
        const dx = player.x - e.x;
        const dy = player.y - e.y;

        if (e.isWarping) {
            // --- 出現中の挙動 ---

            // 1. 移動にはブレーキをかけ、穴の中心付近に留める
            e.vx *= 0.5;
            e.vy *= 0.5;

            // 2. ★追加：その場でプレイヤーの方へ旋回（ロックオン）する
            const targetAngle = Math.atan2(dy, dx);

            // 現在の角度との差分を計算してスムーズに回す
            let diff = targetAngle - e.angle;
            // -PI ~ PI の範囲に正規化（最短距離で回るため）
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            e.angle += diff * 0.1; // 0.1 は旋回速度（お好みで調整）

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

            // 通常時は「進行方向」を向く
            e.angle = Math.atan2(e.vy, e.vx);
        }

        // 座標更新
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;
    }

    // --- 3. 演出更新 ---
    e.rotX += 0.08;
    e.rotY += 0.12;
    e.rotZ += 0.05;
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

    e.segments.forEach((s, i) => {
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
    });

    // 3. 弾の発射 (変更なし)
    e.fireTimer++;
    if (e.fireTimer > 100) {
        e.fireTimer = 0;
        // 弾速も怒りで速くしたければここに angerMult を掛けても良いです
        const currentEnemyBulletSpd = BULLET_CONFIG.ENEMY_NORMAL.SPEED * SPEED_SCALE * (1 + (stage - 1) * DIFFICULTY_CONFIG.BULLET_SPEED_INC);
        const shootAngle = e.angle;
        enemyBullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(shootAngle) * currentEnemyBulletSpd,
            vy: Math.sin(shootAngle) * currentEnemyBulletSpd,
            life: BULLET_CONFIG.ENEMY_NORMAL.LIFE, color: '#c00'
        });
        AudioSys.playSE('shoot');
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

    // 定数から基本スピードを取得（SPEED_SCALEは既に掛かっている前提か、ここで掛けるか）
    // 今回は e.speed (生成時に計算済み) をベースにします
    const baseSpd = e.speed;

    e.actionTimer++;

    // --- 状態1: 高速接近 (APPROACH) ---
    if (e.state === 'approach') {
        // 定数 HUNTER_ROT があれば使用、なければ直書き
        e.angle += ENEMY_SPEEDS.HUNTER_ROT;

        // プレイヤーに向かって加速
        // 加速度も baseSpd に比例させることで、ステージが進んで速くなっても挙動が安定します
        const acc = baseSpd * 0.1;
        e.vx += (dx / dist) * acc;
        e.vy += (dy / dist) * acc;

        if (dist < 180) {
            e.state = 'attack';
            e.actionTimer = 0;
            e.burstCount = 0;
        }
    }
    // --- 状態2: 攻撃 (ATTACK) ---
    else if (e.state === 'attack') {
        e.vx *= 0.85;
        e.vy *= 0.85;

        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        e.angle += diff * 0.2;

        if (e.actionTimer > 20 && e.actionTimer % 10 === 0 && e.burstCount < 3) {
            // 弾速も定数の影響を受ける
            const bulletSpd = BULLET_CONFIG.ENEMY_NORMAL.SPEED * 1.3 * SPEED_SCALE;

            enemyBullets.push({
                x: e.x, y: e.y,
                vx: Math.cos(e.angle) * bulletSpd,
                vy: Math.sin(e.angle) * bulletSpd,
                life: BULLET_CONFIG.ENEMY_NORMAL.LIFE,
                color: '#f80'
            });

            // 反動
            e.vx -= Math.cos(e.angle) * (baseSpd * 0.5);
            e.vy -= Math.sin(e.angle) * (baseSpd * 0.5);

            AudioSys.playSE('shoot');
            e.burstCount++;
        }

        if (e.burstCount >= 3 && e.actionTimer > 60) {
            e.state = 'retreat';
            e.actionTimer = 0;
        }
    }
    // --- 状態3: 離脱 (RETREAT) ---
    else if (e.state === 'retreat') {
        e.angle -= 0.2;

        const escapeAcc = baseSpd * 0.08;
        e.vx -= (dx / dist) * escapeAcc;
        e.vy -= (dy / dist) * escapeAcc;

        if (dist > 450 || e.actionTimer > 120) {
            e.state = 'approach';
            e.actionTimer = 0;
        }
    }

    // --- 速度制限（ここが定数活用のキモ） ---
    const currentSpeed = Math.hypot(e.vx, e.vy);
    // 状態に合わせて制限速度を可変にする（接近時は基本の1.5倍まで許容）
    let maxLimit = baseSpd;
    if (e.state === 'approach') maxLimit = baseSpd * 1.5;
    if (e.state === 'retreat') maxLimit = baseSpd * 1.2;

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

        if (e.timer >= 30 && e.timer < 30 + gameSpeed) {
            e.isAiming = false;
            for (let i = 0; i < 4; i++) {
                const orbitAngle = e.rotAngle + (Math.PI / 2) * i;
                const orbitDist = 38;
                const shootX = e.x + Math.cos(orbitAngle) * orbitDist;
                const shootY = e.y + Math.sin(orbitAngle) * orbitDist;

                const bulletSpd = 20 * SPEED_SCALE;
                const aim = Math.atan2(player.y - shootY, player.x - shootX);

                enemyBullets.push({
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

    // ★タイマーは絶対に整数で管理する（小数点のズレによる不発・バグを防ぐ）
    if (e.actionTimer === undefined) e.actionTimer = 0;
    e.actionTimer++;

    const cycle = e.actionTimer % 350;

    // ★ 出現直後（最初の60フレーム）の後はすぐに攻撃を許可する
    if (e.actionTimer > 60) {
        // 攻撃1：全方位ばらまき弾
        if (cycle === 120) {
            const ways = 16;
            const bSpd = 16 * SPEED_SCALE;
            for (let i = 0; i < ways; i++) {
                const a = (Math.PI * 2 / ways) * i + e.angle;
                enemyBullets.push({
                    x: e.x, y: e.y,
                    vx: Math.cos(a) * bSpd, vy: Math.sin(a) * bSpd,
                    life: 300, color: e.color
                });
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
            distortGrid(e.x, e.y, 80, 150);
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

                enemyBullets.push({
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

function updateJellyfishAI(e) {
    e.timer += gameSpeed;

    if (e.chargeLevel === undefined) e.chargeLevel = 0;
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
                particles.push({
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
            //rings.push({ x: e.x, y: e.y, r: 10, color: '#ff0000', life: 1.5 });
            //rings.push({ x: e.x, y: e.y, r: 40, color: '#ff8800', life: 1.0 });

            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            distortGrid(e.x, e.y, 80, 150);

            // ★ 変更：自機に向かって飛んでいく衝撃波を生成
            const bSpd = 12 * SPEED_SCALE; // 弾の速度
            enemyBullets.push({
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
                enemyBullets.push({
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

function updateSentinelAI(e) {
    e.timer += gameSpeed;
    const cycleTime = e.timer % 240;

    let targetAngle = e.angle; // 旋回する目標の角度

    if (cycleTime < 150) {
        // --- 周回モード (Orbit) ---
        e.state = 'orbit';
        const currentAngle = Math.atan2(e.y - player.y, e.x - player.x);
        const nextAngle = currentAngle + (0.02 * e.orbitDir * gameSpeed);

        const tx = player.x + Math.cos(nextAngle) * e.orbitDist;
        const ty = player.y + Math.sin(nextAngle) * e.orbitDist;

        // ★修正：0.9 だとワープするので、0.05 に下げて滑らかに追従させる
        e.vx = (tx - e.x) * 0.1;
        e.vy = (ty - e.y) * 0.1;

        // 目標角度：進行方向を向く
        targetAngle = Math.atan2(e.vy, e.vx);

    } else if (cycleTime < 210) {
        // --- スキャンモード (Scan) ---
        e.state = 'scan';
        e.vx *= 0.9; // その場で停止して狙う
        e.vy *= 0.9;

        // 目標角度：プレイヤー（自機）の方を向く
        targetAngle = Math.atan2(player.y - e.y, player.x - e.x);

    } else if (cycleTime >= 210 && cycleTime < 220) {
        // --- 発射 (Fire) ---
        // 目標角度：発射中もプレイヤーの方を向いたまま
        targetAngle = Math.atan2(player.y - e.y, player.x - e.x);

        if (e.state !== 'fire') {
            e.state = 'fire';
            // 高速弾を発射
            const bSpd = 22 * SPEED_SCALE;
            enemyBullets.push({
                x: e.x, y: e.y,
                vx: Math.cos(e.angle) * bSpd, // 現在向いている方向に撃つ
                vy: Math.sin(e.angle) * bSpd,
                life: 180, color: e.color, isLaserMissile: true
            });
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 30, 80);
        }
    }

    // --- 向きの滑らかな旋回処理 ---
    let diff = targetAngle - e.angle;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    // スキャン時は素早く自機を向き、移動中は自然な速度で向く
    const turnSpeed = (e.state === 'scan' || e.state === 'fire') ? 0.15 : 0.08;
    e.angle += diff * turnSpeed * gameSpeed;

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
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
            enemyBullets.push({
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
        particles.push({
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

    enemies.forEach(other => {
        if (e === other || other.hp <= 0 || (other.type !== 'asteroid' && other.type !== 'bubble')) return;

        const dx = other.x - e.x;
        const dy = other.y - e.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        const hitRadius = 22 * 0.85;
        const r1 = hitRadius * e.scale * G_SCALE;
        const r2 = hitRadius * other.scale * G_SCALE;
        const minDist = r1 + r2;

        if (dist < minDist) {
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

    enemies.forEach(other => {
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
            enemies.forEach(other => {
                if (other !== e && other.hp > 0) {
                    other.hp = 0;
                    other.noSplit = true; // ★アステロイドが分裂しないようにする
                    other.noDrop = true;  // 画面がアイテムで埋まるのを防ぐ
                }
            });
            // 進行中のワームホールもすべて閉じる
            wormholes.forEach(w => w.life = 0);

            // ★追加：残っている敵弾をすべて小さな爆発エフェクトにしてから消去
            enemyBullets.forEach(eb => {
                createExplosion(eb.x, eb.y, eb.color || '#fff', 3);
            });
            enemyBullets = [];

            // 派手なグリッドの歪み
            distortGrid(e.x, e.y, 200, 500);
        }

        // ボス撃破の報酬（シールド回復）を確定ドロップ
        powerups.push({ x: e.x, y: e.y, vx: 0, vy: 0, type: 'shield', life: 600 });
    }
    // --- ラスボス（Stage 10 / Battleship） ---
    else if (e.type === 'battleship') {
        // Battleship自体の撃破時は一掃ロジックを入れなくても
        // startStageのクリア判定で次の演出へ移行します
        gameSpeed = 0.05;
        bullets = [];
        enemyBullets = [];

        // ★追加：ラスボス撃破時も、アステロイドを含めた全ての敵を連鎖爆発させる
        enemies.forEach(other => {
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
        if (e.type !== 'asteroid' && e.type !== 'bubble') {
            if (e.type === 'triangle') {
                enemiesKilled += 0.2;
            } else {
                enemiesKilled += 1;
            }
        }
    }

    // --- 爆発エフェクトの生成 ---
    // 敵の種類に応じて基本の火花（パーティクル）の数を調整
    let particleCount = 40; // デフォルトの雑魚
    if (e.type === 'boss') {
        particleCount = 120;
    } else if (e.type === 'asteroid') {
        particleCount = 30;
    } else if (e.type === 'phantom' || e.type === 'triangle') {
        // ★ 破片演出がある敵は、細かい火花を極端に減らす（控えめにする）
        particleCount = 3;
    } else if (e.type === 'jellyfish' || e.type === 'bubble') {
        // ★追加: クラゲとバブルは通常の火花（線）をゼロにする
        particleCount = 2;
    }


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
        AudioSys.playSE('explode_medium'); // 中サイズの爆発音
        distortGrid(e.x, e.y, 60, 120);

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
            particles.push({
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
            createExplosion(partX, partY, e.color, 5);
        }

        // 中心コアの爆発
        createExplosion(e.x, e.y, '#fff', 20);
    }
    // --- ★追加：Eclipse専用の特殊撃破演出 ---
    else if (e.type === 'eclipse') {
        AudioSys.playSE('explode_medium');
        distortGrid(e.x, e.y, 100, 200);

        const bitCount = 6;
        const orbitDist = 50 + Math.sin(frame * 0.05) * 4;

        for (let i = 0; i < bitCount; i++) {
            // 現在の回転角からビットの正確な位置を算出
            const orbitAngle = (e.angle || 0) + (Math.PI * 2 / bitCount) * i;
            const partX = e.x + Math.cos(orbitAngle) * orbitDist;
            const partY = e.y + Math.sin(orbitAngle) * orbitDist;

            // 中心から外側へ向かうベクトル
            const pvx = Math.cos(orbitAngle) * (3 + Math.random() * 4);
            const pvy = Math.sin(orbitAngle) * (3 + Math.random() * 4);

            particles.push({
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
            createExplosion(partX, partY, e.color, 3);
        }

        // 中心（ブラックホール）の崩壊エフェクト
        createExplosion(e.x, e.y, '#fff', 30);
    }
    // --- Triangle専用の特殊撃破演出（サイズ微調整版） ---
    else if (e.type === 'triangle') {
        AudioSys.playSE('explode_small');

        const shardCount = 3 + Math.floor(Math.random() * 2);
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

            particles.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: e.color || '#0f8',
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
        AudioSys.playSE('explode_medium');
        distortGrid(e.x, e.y, 80, 140);

        // 体節をバラバラに放出（頭 + セグメント）
        const allParts = [{ x: e.x, y: e.y, angle: e.angle }, ...e.segments];

        allParts.forEach((seg, i) => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3; // 速度を少し抑える

            particles.push({
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
        AudioSys.playSE('explode_small'); // 少し高い音が水泡が弾ける音に似ます
        distortGrid(e.x, e.y, 50, 100);

        // ★追加：バブルの場合はサイズ(1が最大, 3が最小)に応じて泡の数を変える
        let bubbleCount = 20;
        if (e.type === 'bubble') {
            // size1(大)なら30個、size2(中)なら20個、size3(小)なら10個
            bubbleCount = (4 - (e.size || 2)) * 5;
        }

        for (let i = 0; i < bubbleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3; // ふんわり飛び散る速度
            particles.push({
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
        AudioSys.playSE('explode_large');
    }
    // --- アステロイドの判定 ---
    else if (e.type === 'asteroid') {
        // e.size === 1 が最大サイズです
        if (e.size === 1) {
            AudioSys.playSE('explode_medium');
        } else {
            AudioSys.playSE('explode_small');
        }
    }
    // --- 小型（小）：その他雑魚（triangleは上で処理済み）---
    else {
        AudioSys.playSE('explode_small');
    }

    // スコア加算（テーブルから取得、未定義ならデフォルト値）
    const pts = ENEMY_SCORES[e.type] || DEFAULT_ENEMY_SCORE;

    score += pts;
    ui.score.innerText = score.toString().padStart(6, '0');
    scorePopups.push({ x: e.x, y: e.y, text: pts, life: 40, alpha: 1, vy: -1 });

    // ドロップ処理
    if (e.noDrop || e.drop === 'none') return;
    const itemProps = { x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 };
    if (e.drop === 'level') powerups.push({ ...itemProps, type: 'level', life: 999999 });
    else if (e.drop === 'laser') powerups.push({ ...itemProps, type: 'laser', life: ITEM_LIFE });
    else if (e.drop === 'invincible') powerups.push({ ...itemProps, type: 'invincible', life: ITEM_LIFE });
    else if (e.drop === 'crystal') crystals.push({ ...itemProps, life: ITEM_LIFE });
    else if (e.drop === 'shield') powerups.push({ ...itemProps, type: 'shield', life: ITEM_LIFE });
}

function applySeparation(e) {
    enemies.forEach(other => {
        if (e === other) return;
        const odx = e.x - other.x;
        const ody = e.y - other.y;
        const od = Math.hypot(odx, ody);

        // 距離が30未満の場合、お互いを押し離す
        if (od < 30) {
            const push = (30 - od) * 0.05;
            e.x += (odx / od) * push;
            e.y += (ody / od) * push;
        }
    });
}

function updateEnemiesForDying() {
    enemies.forEach(e => {
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
                const remaining = enemiesToSpawn - enemiesKilled;
                if (!isBossSpawned && (remaining <= enemiesToSpawn * 0.2 || spawnedCount >= enemiesToSpawn)) {
                    triggerBossEncounter();
                    isBossSpawned = true;
                } else {
                    const bossEx = enemies.some(e => e.type === 'boss');
                    if (spawnedCount < enemiesToSpawn || bossEx) {
                        const pool = STAGE_ENEMIES[stage] || STAGE_ENEMIES[7];
                        const type = Math.random() < 0.15 ? 'cube' : pool[Math.floor(Math.random() * pool.length)];
                        spawnEnemy(w.x, w.y, type);
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

// =========================================================
// 7. 敵機生成と共通AI (Enemy Spawning & Common AI)
// =========================================================
function spawnWormhole() {

    if (isStageClear) return;
    if (stage === 9 && rushBossIndex >= 8) return;
    if (stage !== 9 && isBossSpawned && !enemies.some(e => e.type === 'boss' || e.type === 'battleship')) return;

    wormholes.push({
        x: WALL_MARGIN + 100 + Math.random() * (worldSize - WALL_MARGIN * 2 - 200),
        y: WALL_MARGIN + 100 + Math.random() * (worldSize - WALL_MARGIN * 2 - 200),
        life: 400, maxLife: 400, active: true
    });
    distortGrid(wormholes[wormholes.length - 1].x, wormholes[wormholes.length - 1].y, 50, 150);
}

function spawnEnemy(x, y, type, size = 1, overrideColor = null) {

    if (isStageClear) return;
    if (stage === 9 && rushBossIndex >= 8) return;
    if (stage !== 9 && isBossSpawned && type !== 'boss' && type !== 'battleship') {
        const bossExists = enemies.some(e => e.type === 'boss' || e.type === 'battleship');
        if (!bossExists) return; // ボスが既に死んでいるなら雑魚は出さない
    }

    const spd = SPEED_SCALE;
    const stageMag = (1.0 + (stage - 1) * DIFFICULTY_CONFIG.SPEED_INC) * bossAngerMinionSpeedMag; // ★ここを修正
    //const stageMag = 1.0 + (stage - 1) * DIFFICULTY_CONFIG.SPEED_INC;

    const hpMag = (stage - 1) * DIFFICULTY_CONFIG.HP_INC;

    const angle = Math.random() * Math.PI * 2;
    const bSpd = 5.0 * spd;
    const vx = Math.cos(angle) * bSpd;
    const vy = Math.sin(angle) * bSpd;

    // -----------------------------------------------------
    // ★修正：アイテムドロップ決定ロジック (整理版)
    // -----------------------------------------------------
    let dropType = 'crystal'; // デフォルト
    const rnd = Math.random();

    // 1. 【最優先】レベルアップアイテム (条件付き)
    if (levelItemsDroppedInStage < 2 && player.weaponLevel < MAX_WEAPON_LEVEL && rnd < DROP_RATES.LEVEL) {
        dropType = 'level';
        levelItemsDroppedInStage++; // ★出現したらカウントを増やす
    }
    // 2. その他のアイテム抽選 (レベルアップが出なかった場合)
    else {
        const subRnd = Math.random();
        // ピンチかどうかで回復率を変える
        const shieldChance = (player.shield < 30) ? DROP_RATES.SHIELD_LOW : DROP_RATES.SHIELD_NORM;

        // 確率の積み上げ判定
        if (subRnd < DROP_RATES.LASER) {
            dropType = 'laser';
        }
        else if (subRnd < DROP_RATES.LASER + DROP_RATES.INVINCIBLE) {
            dropType = 'invincible';
        }
        else if (subRnd < DROP_RATES.LASER + DROP_RATES.INVINCIBLE + shieldChance) {
            dropType = 'shield';
        }
        // それ以外は 'crystal' のまま
    }

    if (type === 'dragon') {
        enemies.push({
            x: x, y: y, vx: vx, vy: vy,
            hp: 8 + hpMag * 2,
            speed: ENEMY_SPEEDS.DRAGON * spd * stageMag,
            color: '#c00', type: 'dragon',
            angle: Math.atan2(vy, vx), // 初速に合わせた角度を設定
            segments: [],
            drop: 'none',
            scale: 0.9, fireTimer: 0
        });

        const segmentCount = 8;
        const initialAngle = Math.atan2(vy, vx);
        for (let i = 0; i < segmentCount; i++) {
            // 全ての節に初期座標と進行方向の角度をセット
            enemies[enemies.length - 1].segments.push({
                x: x,
                y: y,
                angle: initialAngle
            });
        }
        spawnedCount++;
    } else if (type === 'cube') {
        // アイテムキャリア（Cube）はドロップ確定
        enemies.push({
            x, y, vx, vy,
            hp: 2 + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.CUBE * spd * stageMag,
            color: '#0f0', type: 'cube', angle: 0,
            drop: dropType, // ここで決定したドロップを適用
            scale: 0.8, rotX: 0, rotY: 0
        });
        spawnedCount++;
    } else if (type === 'tadpole') {
        enemies.push({
            x: x, y: y, vx: vx, vy: vy,
            hp: 1,
            speed: ENEMY_SPEEDS.TADPOLE * spd * stageMag,
            color: '#0ff',
            type: 'tadpole', angle: 0,
            drop: 'none',
            scale: 0.6, history: []
        });
        spawnedCount++;
    } else if (type === 'triangle') {
        // フォーメーションパターンの定義
        const patterns = ['V', 'W', 'H'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const initialAngle = Math.atan2(vy, vx);

        // ==========================================
        // ★ 修正：色指定の確実な継承
        // 引数 overrideColor が指定されている場合はそれを使用し、
        // なければランダムに選ぶ
        // ==========================================
        let selectedColor;
        let selectedFormationType = 'custom'; // デフォルトはカスタム扱い

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
        // ==========================================

        // --- 1. リーダー（中心機）の生成 ---
        const leader = {
            x: x, y: y, vx: vx, vy: vy,
            hp: 1 + Math.floor(hpMag * 0.5),
            speed: ENEMY_SPEEDS.TRIANGLE * spd * stageMag,
            color: selectedColor, // ★ リーダーの色をセット
            type: 'triangle',
            formationType: selectedFormationType,
            angle: initialAngle,
            drop: dropType,
            scale: 0.1,
            isLeader: true,
            followers: [],
            isWarping: true,
            warpPercent: 0,
            rotX: Math.random() * Math.PI,
            rotY: Math.random() * Math.PI,
            rotZ: Math.random() * Math.PI
        };
        enemies.push(leader);
        spawnedCount += 0.2;

        // --- 2. 取り巻き（フォロワー）の生成 ---
        // リーダーを中心に左右2台ずつ、計4台を配置
        for (let i = 0; i < 4; i++) {
            // ★修正：ボス戦中、またはStage 9(ボスラッシュ)、Stage 10ならノルマ上限を無視して出し切る
            // 通常ステージでボスがいない時だけ、ノルマチェックを行う
            const ignoreLimit = isBossSpawned || stage === 9 || stage === 10;
            if (!ignoreLimit && spawnedCount >= enemiesToSpawn) break;

            let offX = 0, offY = 0;
            const side = (i % 2 === 0) ? 1 : -1; // 左右交互 (1 or -1)
            const step = Math.floor(i / 2) + 1; // 1段目 or 2段目

            if (pattern === 'V') {
                // V型: 後方に広がる (リーダーが先端)
                offX = -step * 25;
                offY = side * step * 25;
            }
            else if (pattern === 'W') {
                // W型: リーダーを中心にジグザグ配置
                offX = (step === 1) ? -25 : 0; // 1段目は後ろ、2段目は真横
                offY = side * step * 25;
            }
            else if (pattern === 'H') {
                // H型: 縦に並ぶ二列の中央にリーダー
                offX = (step === 1) ? 25 : -25; // 前後に配置
                offY = side * 25; // 左右幅は固定
            }

            enemies.push({
                x: x, y: y, vx: vx, vy: vy,
                hp: 1,
                speed: ENEMY_SPEEDS.TRIANGLE * spd * stageMag,
                color: selectedColor, // ★ フォロワーにも「同じ色」をセット
                type: 'triangle',
                formationType: selectedFormationType,
                angle: initialAngle,
                drop: 'none',
                scale: 0.1,
                leader: leader,
                formOffset: { x: offX, y: offY },
                isWarping: true,
                warpPercent: 0,
                rotX: Math.random() * Math.PI,
                rotY: Math.random() * Math.PI,
                rotZ: Math.random() * Math.PI
            });
            leader.followers.push(enemies[enemies.length - 1]);
            spawnedCount += 0.2;
        }

    } else if (type === 'boss') {
        const variantIndex = (stage - 1) % BOSS_VARIANTS.length;
        const variant = BOSS_VARIANTS[variantIndex];
        const bossHp = variant.hp + (stage - 1) * 10;

        const sX = Number(x);
        const sY = Number(y);

        enemies.push({
            x: sX, y: sY,
            spawnX: sX, spawnY: sY,
            vx: 0, vy: 0,
            hp: bossHp, maxHp: bossHp,
            speed: 1.2 * variant.speedFactor * SPEED_SCALE * (1.0 + (stage - 1) * 0.08),
            color: variant.color,
            type: 'boss', variant: variant,
            angle: 0,
            drop: 'shield',
            scale: 1.5 + (variant.sides * 0.1),
            fireTimer: 0, flashTimer: 0,
            spawnTimer: 0, spawnMax: 150,
            isSpawning: true,
            // ★追加：カメラ補間専用タイマー（isSpawningが消えても止まらない）
            cameraLerpTimer: 0
        });
        spawnedCount++;
        // bubble か asteroid (rock) の共通処理
    } else if (type === 'bubble' || type === 'asteroid') {
        const sizeFactor = 1.0 + (stage - 1) * 0.1;
        const hp = (size === 1 ? 4 : size === 2 ? 2 : 1) + Math.floor((stage - 1) * 0.5);
        const baseScale = size === 1 ? 1.8 : size === 2 ? 1.1 : 0.6;
        const finalScale = baseScale * sizeFactor;

        // スピード定数の選択 (typeによって切り替え)
        const baseSpdConst = (type === 'bubble') ? ENEMY_SPEEDS.BUBBLE : ENEMY_SPEEDS.ASTEROID;
        const moveSpeed = (baseSpdConst * 0.7) * (1 + size * 0.4) * spd * stageMag;
        const ang = Math.random() * Math.PI * 2;

        enemies.push({
            x: x, y: y,
            vx: Math.cos(ang) * moveSpeed,
            vy: Math.sin(ang) * moveSpeed,
            hp: hp,
            speed: moveSpeed,
            color: (type === 'bubble') ? '#0ff' : '#fff',
            type: type,      // 'bubble' か 'asteroid'
            variant: (type === 'bubble') ? 'bubble' : 'asteroid', // 見た目の指定
            size: size,
            angle: Math.random() * Math.PI * 2,
            rotSpd: (Math.random() - 0.5) * 0.1,
            scale: finalScale,
            drop: 'none',
            spawnTimer: 0,
            trackingStart: 300 + Math.random() * 200,
            isTracking: false
        });

    } else if (type === 'hunter') {
        enemies.push({
            x: x, y: y, vx: vx * 0.5, vy: vy * 0.5,
            hp: 3 + Math.floor(hpMag * 1.5),
            speed: ENEMY_SPEEDS.HUNTER * spd * stageMag,
            color: '#fa4',
            type: 'hunter',
            angle: 0,
            drop: dropType,
            scale: 1.2,
            actionTimer: 0,
            state: 'approach', // 初期状態を 'approach' (接近) に設定
            burstCount: 0      // ★追加：連射数カウント用
        });
        spawnedCount++;
        // spawnEnemy関数内の最後の方に追加
    } else if (type === 'battleship') {
        // BOSS_VARIANTS の一番最後の要素（GENESIS-ARK）を取得
        const variant = BOSS_VARIANTS[BOSS_VARIANTS.length - 1];

        enemies.push({
            x: x, y: y,
            spawnX: x, spawnY: y,
            vx: 0, vy: 0,
            hp: variant.hp,
            maxHp: variant.hp,
            // 定数の speedFactor を適用（超重厚な動き）
            speed: variant.speedFactor * SPEED_SCALE,
            color: variant.color,
            type: 'battleship',
            angle: 0,
            drop: 'none',
            scale: 1.0,

            fireTimer: 0,
            flashTimer: 0,
            spawnTimer: 0,
            spawnMax: 240,
            isSpawning: true,

            // variant 情報をそのまま持たせる
            variant: variant
        });
        spawnedCount++;

        if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_large');
    } else if (type === 'phantom') {
        enemies.push({
            x: x, y: y, vx: vx * 0.5, vy: vy * 0.5,
            hp: 4 + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.PHANTOM * spd * stageMag,
            color: '#0ff',
            type: 'phantom',
            angle: 0,
            drop: dropType,
            scale: 1.0,
            state: 'stealth', // 状態管理：stealth, appear, dash
            timer: 0,
            alpha: 0.1, // 初期はほぼ透明
            trail: []
        });
        spawnedCount++;
    } else if (type === 'eclipse') {
        // --- ★追加：出現制限ロジック ---
        const MIN_DISTANCE = 600; // Eclipse同士の最低間隔（ピクセル）

        // 既に存在している Eclipse との距離をチェック
        const tooClose = enemies.some(other => {
            if (other.type === 'eclipse') {
                const dist = Math.hypot(x - other.x, y - other.y);
                return dist < MIN_DISTANCE;
            }
            return false;
        });

        // 近すぎる場合は、今回の出現を中止する
        if (tooClose) return;

        // --- ここから通常の出現処理 ---
        enemies.push({
            x: x, y: y, vx: vx * 0.2, vy: vy * 0.2,
            hp: 24 + hpMag * 5,
            speed: ENEMY_SPEEDS.ECLIPSE * spd * stageMag,
            color: '#0ff',
            type: 'eclipse',
            angle: 0,
            rotSpeed: 0.02,
            drop: dropType,
            scale: 1.5,
            actionTimer: 0
        });
        spawnedCount++;
    } else if (type === 'jellyfish' || type === 'spark_jelly') {
        const isSpark = (type === 'spark_jelly');

        enemies.push({
            x: x, y: y, vx: vx * 0.1, vy: vy * 0.1,
            hp: (isSpark ? 4 : 2) + Math.floor(hpMag * 1.5),
            speed: ENEMY_SPEEDS.JELLYFISH * spd * stageMag * (isSpark ? 1.2 : 1.0),
            color: '#0ff', // ★変更: すべてシアン（#0ff）に統一
            type: 'jellyfish',
            variant: isSpark ? 'spark' : 'normal',
            angle: angle,
            prevAngle: angle,
            bend: 0,
            drop: dropType,
            scale: isSpark ? 1.4 : 1.2,
            timer: Math.random() * 100,
            canFire: true,
            chargeLevel: 0
        });
        spawnedCount++;
    } else if (type === 'sentinel') {
        enemies.push({
            x: x, y: y, vx: 0, vy: 0,
            hp: 3 + Math.floor(hpMag),
            speed: ENEMY_SPEEDS.SENTINEL * spd * stageMag,
            color: '#ff3366', // 鮮やかなネオンピンク
            type: 'sentinel',
            angle: 0,
            drop: dropType,
            scale: 1.1,
            timer: Math.random() * 100, // 個体ごとにタイミングをずらす
            orbitDist: 200 + Math.random() * 100, // プレイヤーとの距離
            orbitDir: Math.random() > 0.5 ? 1 : -1, // 右回りか左回りか
            state: 'orbit' // orbit: 周回, scan: 照準, fire: 発射
        });
        spawnedCount++;
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
            bullets = [];
            enemyBullets = [];
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

                particles.push({
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
        if ((e.type === 'asteroid' || e.type === 'bubble') && e.size < 3 && !e.noSplit) {
            for (let i = 0; i < 2; i++) {
                spawnEnemy(e.x, e.y, e.type, e.size + 1, e.variant);
            }
        }

        destroyEnemy(e);
    };

    enemies.forEach(e => {
        // --- 画面内（＋マージン）にいるかどうかの判定 ---
        const inActiveRange = (
            e.x > camera.x - ACTIVE_MARGIN &&
            e.x < camera.x + viewW + ACTIVE_MARGIN &&
            e.y > camera.y - ACTIVE_MARGIN &&
            e.y < camera.y + viewH + ACTIVE_MARGIN
        );

        // 敵のプロパティとしてフラグを保存（プレイヤーの弾との判定に使うため）
        e.inActiveRange = inActiveRange;

        // ========================================================
        // ★修正：ボスの死亡アニメーション（フェードアウト＆誘爆）
        // ========================================================
        if (e.isDying) {
            e.dyingTimer -= 1;
            e.scale *= 0.98
            // 小さくなるエフェクト(e.scale *= 0.98)を削除し、透明度を初期化/減少させる
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
                rings.push({ x: e.x + ox, y: e.y + oy, r: expSize, color: sparkColor, life: 0.5 });

                // 三角の破片（デブリ）
                if (Math.random() < 0.3) {
                    const shardAngle = Math.random() * Math.PI * 2;
                    const shardSpeed = 2 + Math.random() * 4;
                    particles.push({
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
            return;
        }

        const isTriangle = (e.type === 'triangle');

        if (!isTriangle && e.leader && e.leader.hp > 0) {
            updateFormationMovement(e);
            if (e.type === 'cube') { e.rotX += 0.03; e.rotY += 0.04; }
        } else {
            // AI実行前の敵弾の数を記録
            const bulletCountBefore = enemyBullets.length;

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
                case 'sentinel': updateSentinelAI(e); break;

                case 'fighter': updateFighterJetAI(e); break;
                case 'boss':
                    if (stage === 9) updateBossSpecialAI(e);
                    else updateBossAI(e);
                    break;
                case 'battleship': updateBattleshipAI(e); break;

            }

            // 画面外の敵が弾を撃った場合、無効化する
            if (!inActiveRange && enemyBullets.length > bulletCountBefore) {
                enemyBullets.length = bulletCountBefore;
            }
        }

        // ボスや巨大戦艦は質量が大きいため、雑魚敵との重なり反発処理を受けないように除外する
        if (e.type !== 'boss' && e.type !== 'battleship') {
            applySeparation(e);
        }

        // bubble または asteroid の場合に衝突ロジックを適用
        if (e.type === 'asteroid' || e.type === 'bubble') {
            applyAsteroidCollisions(e);
        }

        applyWorldBoundary(e);

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
                enemyBullets = [];

                // 演出開始時の音と画面揺れ
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_medium');
                distortGrid(e.x, e.y, 100, 200);
            } else {
                // 雑魚敵は今まで通り即時撃破
                e.isDead = true;
                executeRealDeath(e);
            }
        }
    });

    // isDeadフラグが立ったものだけを配列から削除
    enemies = enemies.filter(e => !e.isDead);
}

function updateFormationMovement(e) {
    if (!e.leader || e.leader.hp <= 0) return;
    const la = e.leader.angle;
    const rotatedOffX = e.formOffset.x * Math.cos(la) - e.formOffset.y * Math.sin(la);
    const rotatedOffY = e.formOffset.x * Math.sin(la) + e.formOffset.y * Math.cos(la);
    const targetX = e.leader.x + rotatedOffX; const targetY = e.leader.y + rotatedOffY;
    e.x += (targetX - e.x) * 0.3 * gameSpeed;
    e.y += (targetY - e.y) * 0.3 * gameSpeed;
    e.vx = e.leader.vx; e.vy = e.leader.vy; e.angle = la;
}



// --- 7. 敵の出現（スポーン）ロジック ---
function updateSpawnLogic() {
    if (stage === 9) {
        // --- Stage 9: ボスラッシュ ---
        const bossExists = enemies.some(e => e.type === 'boss');
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
                const newBoss = enemies[enemies.length - 1];
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
        // 2. 援護雑魚のスポーン（定数を使用して制御）
        if (bossExists &&
            enemies.length < BOSS_RUSH_SPAWN_CONFIG.MAX_ENEMIES &&
            frame % BOSS_RUSH_SPAWN_CONFIG.INTERVAL === 0) {

            const currentPool = STAGE_ENEMIES[rushBossIndex + 1] || STAGE_ENEMIES[1];
            const randomType = currentPool[Math.floor(Math.random() * currentPool.length)];

            const angle = Math.random() * Math.PI * 2;
            const dist = 600;
            const sx = Math.max(100, Math.min(worldSize - 100, player.x + Math.cos(angle) * dist));
            const sy = Math.max(100, Math.min(worldSize - 100, player.y + Math.sin(angle) * dist));

            // ワームホール生成
            wormholes.push({ x: sx, y: sy, life: 100, maxLife: 100, active: true });

            // 指定した数だけ敵を生成
            setTimeout(() => {
                if (gameState === 'PLAYING' && stage === 9) {
                    for (let i = 0; i < BOSS_RUSH_SPAWN_CONFIG.SPAWN_COUNT; i++) {
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
        const screenMax = STAGE_MAX_ON_SCREEN[stage - 1] || 40;
        const bossExists = enemies.some(e => e.type === 'boss' || e.type === 'battleship');

        // 修正：ノルマに達していない、またはボス戦中ならスポーン可能
        const canSpawn = (spawnedCount < enemiesToSpawn) || (isBossSpawned && bossExists);

        // 1. 通常のワームホール生成判定
        let shouldSpawn = gameState === 'PLAYING' && spawnWaitTimer <= 0 &&
            !isBossWarning && canSpawn &&
            activeWh < maxW && enemies.length < screenMax &&
            Math.random() < SPAWN_SETTINGS.WORMHOLE_CHANCE;

        // 2. 敵が全滅してワームホールもない場合の救済処置
        if (gameState === 'PLAYING' && enemies.length === 0 && activeWh === 0 && canSpawn) {
            shouldSpawn = true;
        }

        if (shouldSpawn) {
            spawnWormhole();
        }

        // ==========================================
        // ★ 追加：ボス出現のセーフティネット
        // ==========================================
        // 条件：プレイ中、ボス未出現、ワームホールなし、敵もいない、且つノルマ付近
        const remaining = enemiesToSpawn - enemiesKilled;
        if (gameState === 'PLAYING' && !isBossSpawned && !isBossWarning && activeWh === 0 && enemies.length === 0) {
            // ノルマをほぼ達成している（残り20%以下）、または生成数が上限に達している場合
            if (remaining <= enemiesToSpawn * 0.2 || spawnedCount >= enemiesToSpawn) {
                console.log("Safety Net: Triggering Boss Encounter");
                triggerBossEncounter();
                isBossSpawned = true;
            }
        }
        // ==========================================
    }
}

