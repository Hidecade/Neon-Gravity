// ==========================================
// BOSS AI
// ==========================================

const BOSS_PROJECTILE_SPEED_MULT = 1.15;
const BOSS_ANGER_MAX_BONUS = 0.9;
const BATTLESHIP_PROJECTILE_SPEED_MULT = 1.05;

function getBossHomingLaserShotCount() {
    if (stage <= 2) return 2;
    if (stage <= 4) return 3;
    return 3;
}

function isBossHomingLaserShotFrame(timer, shotCount, attackFrames) {
    for (let i = 1; i <= shotCount; i++) {
        const shotFrame = Math.round((attackFrames / (shotCount + 1)) * i);
        if (timer === shotFrame) return true;
    }
    return false;
}

function updateBossCombatMovement(e, options = {}) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1.0;

    const orbitDir = e.orbitDir || 1;
    const desiredRadius = options.desiredRadius || 360;
    const radiusTolerance = options.radiusTolerance || 95;
    const approachAccel = options.approachAccel || 0.024;
    const strafeAccel = options.strafeAccel || 0.045;
    const retreatAccel = options.retreatAccel || 0.02;
    const friction = options.friction || 0.972;
    const maxSpeed = options.maxSpeed || (e.speed * 2.2);
    const margin = options.margin || 110;
    const radiusCorrectionAccel = options.radiusCorrectionAccel || 0.0009;

    let moveNx = dx / dist;
    let moveNy = dy / dist;

    const holdPosition = !!options.holdPosition;
    const forceApproach = !!options.forceApproach;
    const brakePosition = !!options.brakePosition;

    if (holdPosition) {
        const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
        const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
        if (clampedX !== e.x || clampedY !== e.y) {
            e.orbitDir = -(e.orbitDir || 1);
        }
        e.vx = 0;
        e.vy = 0;
        e.x = clampedX;
        e.y = clampedY;
        return;
    }

    if (brakePosition) {
        const brakeFriction = options.brakeFriction || 0.94;
        e.vx *= brakeFriction;
        e.vy *= brakeFriction;
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;

        const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
        const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
        if (clampedX !== e.x || clampedY !== e.y) {
            e.orbitDir = -(e.orbitDir || 1);
            if (clampedX !== e.x) e.vx = 0;
            if (clampedY !== e.y) e.vy = 0;
        }
        e.x = clampedX;
        e.y = clampedY;
        return;
    }

    const tx = -moveNy * orbitDir;
    const ty = moveNx * orbitDir;
    const radiusError = dist - desiredRadius;
    const radiusCorrection = Math.max(-1, Math.min(1, radiusError / Math.max(1, radiusTolerance))) * radiusCorrectionAccel;

    e.vx += moveNx * radiusCorrection * SPEED_SCALE * gameSpeed;
    e.vy += moveNy * radiusCorrection * SPEED_SCALE * gameSpeed;

    if (forceApproach || dist > desiredRadius + radiusTolerance) {
        e.vx += moveNx * approachAccel * SPEED_SCALE * gameSpeed;
        e.vy += moveNy * approachAccel * SPEED_SCALE * gameSpeed;
    } else if (dist < desiredRadius - radiusTolerance) {
        e.vx -= moveNx * retreatAccel * SPEED_SCALE * gameSpeed;
        e.vy -= moveNy * retreatAccel * SPEED_SCALE * gameSpeed;
    }

    e.vx += tx * strafeAccel * SPEED_SCALE * gameSpeed;
    e.vy += ty * strafeAccel * SPEED_SCALE * gameSpeed;

    e.vx *= friction;
    e.vy *= friction;

    const currentSpeed = Math.hypot(e.vx, e.vy) || 0.001;
    if (currentSpeed > maxSpeed) {
        e.vx = (e.vx / currentSpeed) * maxSpeed;
        e.vy = (e.vy / currentSpeed) * maxSpeed;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
    const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
    if (clampedX !== e.x || clampedY !== e.y) {
        e.orbitDir = -orbitDir;
        if (clampedX !== e.x) e.vx *= -0.45;
        if (clampedY !== e.y) e.vy *= -0.45;
    }
    e.x = clampedX;
    e.y = clampedY;
}

function getBossMovementPatternStage(e) {
    if (stage === 9 && e.variant && typeof BOSS_VARIANTS !== 'undefined') {
        const idx = BOSS_VARIANTS.findIndex(v => v && v.name === e.variant.name);
        if (idx >= 0) return idx + 1;
    }
    return stage;
}

function getBossMovementPatternKey(e) {
    const patternStage = getBossMovementPatternStage(e);
    if (patternStage === 1 || patternStage === 5) return 'A';
    if (patternStage === 2 || patternStage === 6) return 'B';
    if (patternStage === 3 || patternStage === 7) return 'C';
    if (patternStage === 4 || patternStage === 8) return 'D';
    return 'C';
}

function shouldBossUseGravity(e, enableGravity) {
    if (!enableGravity || stage < 5) return false;
    const patternStage = getBossMovementPatternStage(e);
    if (stage === 9 && patternStage <= 4) return false;
    return ((e.gravityCycleIndex || 0) % 2) === 0;
}

function clampBossMovement(e, margin = 95) {
    const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
    const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
    if (clampedX !== e.x || clampedY !== e.y) {
        e.orbitDir = -(e.orbitDir || 1);
        if (clampedX !== e.x) e.vx *= -0.45;
        if (clampedY !== e.y) e.vy *= -0.45;
    }
    e.x = clampedX;
    e.y = clampedY;
}

function limitBossMovementSpeed(e, maxSpeed) {
    const currentSpeed = Math.hypot(e.vx, e.vy) || 0.001;
    if (currentSpeed > maxSpeed) {
        e.vx = (e.vx / currentSpeed) * maxSpeed;
        e.vy = (e.vy / currentSpeed) * maxSpeed;
    }
}

function updateBossEvadeSide(e, interval = 54) {
    if (!e.evadeSide) e.evadeSide = Math.random() < 0.5 ? -1 : 1;
    e.evadeSideTimer = (e.evadeSideTimer || 0) + 1;
    if (e.evadeSideTimer >= interval) {
        e.evadeSide *= -1;
        e.evadeSideTimer = 0;
    }
    return e.evadeSide;
}

function updateBossPatternAMovement(e, options = {}) {
    const dy = player.y - e.y;
    const absDy = Math.abs(dy);
    const dirToPlayerY = dy === 0 ? (e.orbitDir || 1) : Math.sign(dy);
    const desiredRadius = options.desiredRadius || 360;
    const radiusTolerance = options.radiusTolerance || 95;
    const accel = (options.isPressurePhase ? 0.17 : 0.11) * options.angerFactor * options.movementSpeedMult;
    const retreatAccel = (options.isPressurePhase ? 0.13 : 0.1) * options.angerFactor * options.movementSpeedMult;
    const maxSpeed = e.speed * (options.isPressurePhase ? 6.2 : 4.8) * options.angerFactor * options.movementSpeedMult;

    const evadeDir = updateBossEvadeSide(e, 46);
    e.vx += (e.orbitDir || 1) * 0.09 * SPEED_SCALE * gameSpeed;
    e.vx += evadeDir * 0.11 * options.angerFactor * options.movementSpeedMult * SPEED_SCALE * gameSpeed;

    if (options.isChargePhase) {
        e.vy *= 0.92;
    } else if (absDy > desiredRadius + radiusTolerance) {
        e.vy += dirToPlayerY * accel * SPEED_SCALE * gameSpeed;
    } else if (absDy < desiredRadius - radiusTolerance) {
        e.vy -= dirToPlayerY * retreatAccel * SPEED_SCALE * gameSpeed;
    } else {
        e.vy *= 0.94;
    }

    e.vx *= 0.985;
    e.vy *= 0.985;
    limitBossMovementSpeed(e, maxSpeed);
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    clampBossMovement(e, options.margin || 95);
}

function updateBossPatternBMovement(e, options = {}) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const evadeDir = updateBossEvadeSide(e, 42);
    const wiggle = evadeDir * 170;
    const dodge = evadeDir * 0.09;
    const axisAccel = (options.isPressurePhase ? 0.22 : 0.15) * options.angerFactor * options.movementSpeedMult;
    const maxSpeed = e.speed * (options.isPressurePhase ? 7.0 : 5.4) * options.angerFactor * options.movementSpeedMult;

    if (options.isChargePhase) {
        e.vx *= 0.92;
        e.vy *= 0.92;
    } else if (absDy >= absDx) {
        const targetX = player.x + wiggle;
        const moveX = targetX - e.x;
        e.vx += Math.max(-1, Math.min(1, moveX / 180)) * axisAccel * SPEED_SCALE * gameSpeed;
        e.vx += dodge * options.angerFactor * options.movementSpeedMult * SPEED_SCALE * gameSpeed;
        e.vy *= 0.94;
    } else {
        const targetY = player.y + wiggle;
        const moveY = targetY - e.y;
        e.vy += Math.max(-1, Math.min(1, moveY / 180)) * axisAccel * SPEED_SCALE * gameSpeed;
        e.vx += dodge * 0.65 * options.angerFactor * options.movementSpeedMult * SPEED_SCALE * gameSpeed;
        e.vx *= 0.94;
    }

    e.vx *= 0.985;
    e.vy *= 0.985;
    limitBossMovementSpeed(e, maxSpeed);
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    clampBossMovement(e, options.margin || 95);
}

function updateBossPatternDMovement(e, options = {}) {
    e.attackDashCooldown = Math.max(0, (e.attackDashCooldown || 0) - 1);
    e.attackDashTimer = Math.max(0, e.attackDashTimer || 0);

    if (!options.isChargePhase && options.isPressurePhase && e.attackDashTimer <= 0 && e.attackDashCooldown <= 0) {
        e.attackDashTimer = 28;
        e.attackDashCooldown = 150 + Math.floor(Math.random() * 90);
        if (typeof AudioSys !== 'undefined' && isOnScreen(e)) AudioSys.playSE('launch');
    }

    if (e.attackDashTimer > 0) {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy) || 1.0;
        const dashAccel = 0.42 * options.angerFactor * options.movementSpeedMult;
        const maxSpeed = e.speed * 11.0 * options.angerFactor * options.movementSpeedMult;
        e.vx += (dx / dist) * dashAccel * SPEED_SCALE * gameSpeed;
        e.vy += (dy / dist) * dashAccel * SPEED_SCALE * gameSpeed;
        e.vx *= 0.99;
        e.vy *= 0.99;
        limitBossMovementSpeed(e, maxSpeed);
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;
        e.attackDashTimer--;
        clampBossMovement(e, options.margin || 95);
        return;
    }

    updateBossCombatMovement(e, {
        ...options,
        strafeAccel: options.strafeAccel * 1.12,
        maxSpeed: options.maxSpeed * 1.05
    });
}

function updateBossStageMovement(e, options = {}) {
    const pattern = getBossMovementPatternKey(e);
    if (pattern === 'A') {
        updateBossPatternAMovement(e, options);
    } else if (pattern === 'B') {
        updateBossPatternBMovement(e, options);
    } else if (pattern === 'D') {
        updateBossPatternDMovement(e, options);
    } else {
        updateBossCombatMovement(e, options);
    }
}

function updateBossAI(e, options = {}) {
    const enableGravity = options.enableGravity !== false;
    const movementSpeedMult = options.movementSpeedMult || 1.0;
    const bulletSpeedMult = (options.bulletSpeedMult || 1.0) * BOSS_PROJECTILE_SPEED_MULT;

    // =========================================================
    // 1. 出現演出 (Spawn Sequence)
    // =========================================================
    if (e.isSpawning) {
        e.spawnTimer++;
        // 出現位置へ強制固定
        e.x = e.spawnX;
        e.y = e.spawnY;
        e.vx = 0; e.vy = 0;

        // 出現完了時の初期化処理
        if (e.spawnTimer >= e.spawnMax) {
            e.isSpawning = false;
            e.attackPattern = 0;  // 最初の攻撃パターン
            e.aliveTimer = 0;     // ★生存タイマーを0リセット
            e.orbitDir = Math.random() < 0.5 ? -1 : 1;
        }
        return; // 出現中はこれ以上の処理をしない
    }

    // ★生存タイマーを加算 (1フレーム = 1/60秒)
    // これを使って「怒りモード」や「自爆」を判定します
    e.aliveTimer = (e.aliveTimer || 0) + 1;

    // =========================================================
    // ★追加仕様：メルトダウン（暴走自爆）シーケンス
    // =========================================================
    // 出現から2分 (60fps * 120秒 = 7200フレーム) を経過した場合
    if (e.aliveTimer > 7200) {

        // --- 1. 見た目の変化 ---
        e.color = '#ff0000'; // 全身を赤く変色（危険信号）
        e.angle += 0.5 * gameSpeed; // 制御不能な超高速回転

        // --- 2. 挙動の変化 ---
        // プレイヤーを追わず、その場で激しく振動（暴走状態）
        e.vx *= 0.8;
        e.vy *= 0.8; // 減速して停止
        e.x += (Math.random() - 0.5) * 15 * gameSpeed; // ガタガタ震える
        e.y += (Math.random() - 0.5) * 15 * gameSpeed;

        // --- 3. 攻撃：全方位発狂弾幕 ---
        // 4フレームごとの超高速連射
        if (frame % 4 === 0) {
            const sides = 16; // 16方向へ同時発射
            const spd = 12 * SPEED_SCALE * BOSS_PROJECTILE_SPEED_MULT;

            for (let i = 0; i < sides; i++) {
                // 回転に合わせて発射角度をずらす（スパイラル状に広がる）
                const a = e.angle + (Math.PI * 2 / sides) * i;

                spawnEnemyBulletObj({
                    x: e.x, y: e.y,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    life: 150,
                    color: '#f00',       // 弾の色も赤
                    isLaserMissile: true // 当たり判定の大きい弾を使用
                });
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');    // 発射音
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 80, 100); // 空間を歪ませる演出
        }

        // --- 4. 結末：自爆 ---
        // 暴走開始から5秒後 (7200 + 300 = 7500フレーム)
        if (e.aliveTimer > 7500) {
            e.hp = 0; // HPを0にする（updateEnemies側で爆発演出と撃破処理が行われる）

            // 自爆時の特大エフェクト（断末魔）
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 500, 500);
            if (typeof createExplosion === 'function') createExplosion(e.x, e.y, '#f00', 50);
        }

        // ★重要：ここでreturnし、通常の移動・攻撃ロジックを実行させない
        return;
    }


    // =========================================================
    // 以下、通常時のAIロジック（怒りモード含む）
    // =========================================================

    // --- A. 怒りモード係数 (Anger Factor) の計算 ---
    // 30秒(1800F)経過後から、ボスの性能が徐々に上がり始める
    let angerFactor = 1.0;
    if (e.aliveTimer > 1800) {
        // 時間経過で 1.0 -> 1.9 まで上昇
        angerFactor = 1.0 + Math.min(BOSS_ANGER_MAX_BONUS, (e.aliveTimer - 1800) * 0.0007);
    }

    if (e.orbitDir === undefined) {
        e.orbitDir = Math.random() < 0.5 ? -1 : 1;
    }

    // --- B. 移動ロジック ---
    // 座標がNaNにならないよう安全策
    if (!Number.isFinite(e.x)) e.x = e.spawnX || worldSize / 2;
    if (!Number.isFinite(e.y)) e.y = e.spawnY || worldSize / 2;

    const cycle = e.fireTimer || 0;
    const isPressurePhase = cycle < 140;
    const isGravityEnabledForStage = shouldBossUseGravity(e, enableGravity);
    const isChargePhase = isGravityEnabledForStage && cycle >= 140 && cycle < 260;
    const isIPhoneView = typeof currentResolution !== 'undefined' &&
        currentResolution.key &&
        currentResolution.key.includes('iPhone');
    const desiredBossRadius = isIPhoneView ? 300 : 360;
    const bossRadiusTolerance = isIPhoneView ? 85 : 110;

    updateBossStageMovement(e, {
        desiredRadius: desiredBossRadius,
        radiusTolerance: bossRadiusTolerance,
        isPressurePhase,
        isChargePhase,
        angerFactor,
        movementSpeedMult,
        approachAccel: (isPressurePhase ? 0.12 : 0.085) * angerFactor * movementSpeedMult,
        strafeAccel: (isPressurePhase ? 0.2 : 0.14) * angerFactor * movementSpeedMult,
        retreatAccel: (isPressurePhase ? 0.08 : 0.1) * angerFactor * movementSpeedMult,
        radiusCorrectionAccel: (isPressurePhase ? 0.12 : 0.08) * angerFactor * movementSpeedMult,
        friction: 0.99,
        maxSpeed: e.speed * (isPressurePhase ? 7.0 : 5.8) * angerFactor * movementSpeedMult,
        margin: 95,
        holdPosition: false,
        brakePosition: isChargePhase,
        brakeFriction: 0.94
    });

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1.0;

    // --- C. 攻撃サイクル ---
    e.fireTimer++;

    // ==========================================
    // ★修正: 重力（吸い込み）時間を倍にするため、サイクル全体を延長
    // ==========================================
    const maxCycle = 360;     // サイクル全体を延長
    const brakeStart = 140;   // メイン攻撃終了
    const gravityEnd = 260;   // ★重力攻撃終了（140〜260Fの「120フレーム＝2秒間」吸い込む）
    const fireTime = 300;     // 必殺技発射
    const restartTime = 330;  // クールダウン開始

    // ----------------------------------------------------
    // [フェーズ1] メイン攻撃 (0 ~ 139F)
    // ----------------------------------------------------
    if (e.fireTimer < brakeStart) {

        // パターン0: ホーミングレーザー
        if (e.attackPattern === 0) {
            e.angle += 0.08 * gameSpeed * angerFactor; // 怒ると回転が速くなる
            const shotCount = getBossHomingLaserShotCount();
            if (isBossHomingLaserShotFrame(e.fireTimer, shotCount, brakeStart)) {
                const sides = e.variant.sides;
                const startSpd = 10.0 * SPEED_SCALE * bulletSpeedMult;
                const targetSpd = 25.0 * SPEED_SCALE * bulletSpeedMult;
                for (let i = 0; i < sides; i++) {
                    const a = e.angle + (Math.PI * 2 / sides) * i;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 45, y: e.y + Math.sin(a) * 45,
                        vx: Math.cos(a) * startSpd, vy: Math.sin(a) * startSpd,
                        life: BULLET_CONFIG.BOSS_LASER.LIFE,
                        isLaserMissile: true,
                        isBossHomingLaser: true,
                        lockTimer: 38,
                        accelTimer: 26,
                        turnRate: 0.035 * angerFactor,
                        targetSpeed: targetSpd,
                        accelRate: 0.75 * SPEED_SCALE * bulletSpeedMult,
                        color: e.color
                    });
                }
                if (isOnScreen(e) && typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
            }
        }
        // パターン1: 自機狙い3WAY
        else if (e.attackPattern === 1) {
            const targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - e.angle;
            // 最短回転方向の計算
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            e.angle += diff * 0.1 * gameSpeed * angerFactor; // 怒ると照準合わせが速くなる

            if (e.fireTimer % 20 === 0) {
                const bulletSpd = 22.5 * SPEED_SCALE * bulletSpeedMult;
                for (let i = -1; i <= 1; i++) {
                    const a = e.angle + i * 0.15;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 50, y: e.y + Math.sin(a) * 50,
                        vx: Math.cos(a) * bulletSpd, vy: Math.sin(a) * bulletSpd,
                        life: 300, color: '#ffaa00'
                    });
                }
                if (isOnScreen(e) && typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
            }
        }
        // パターン2: 十字回転クロスファイア
        else if (e.attackPattern === 2) {
            e.angle -= 0.08 * gameSpeed * angerFactor; // 怒ると逆回転も速くなる
            if (e.fireTimer % 12 === 0) {
                const bulletSpd = 10 * SPEED_SCALE * bulletSpeedMult;
                for (let i = 0; i < 4; i++) {
                    const a = e.angle + (Math.PI / 2) * i;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40,
                        vx: Math.cos(a) * bulletSpd, vy: Math.sin(a) * bulletSpd,
                        life: 180, color: '#ff00ff', isLaserMissile: true
                    });
                }
                if (isOnScreen(e) && e.fireTimer % 16 === 0 && typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
            }
        }
    }
    // ----------------------------------------------------
    // [フェーズ1.5 & 2] 減速・重力場・溜め演出 (140 ~ 299F)
    // ----------------------------------------------------
    else if (e.fireTimer >= brakeStart && e.fireTimer < fireTime) {
        
        // 回転を徐々に止める
        const ratio = 1.0 - (e.fireTimer - brakeStart) / (fireTime - brakeStart);
        e.angle += Math.pow(ratio, 1.5) * 0.1;

        const gravityRatio = 1.0;

        if (isGravityEnabledForStage && e.fireTimer < gravityEnd) {

            if (e.fireTimer === brakeStart + 1) {
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('gravity_boss', e.x, e.y, gravityRatio);
            }

            const pullDx = e.x - player.x;
            const pullDy = e.y - player.y;
            const pullDist = Math.hypot(pullDx, pullDy) || 0.001;

            const maxPullDist = 1700;

            if (pullDist < maxPullDist) {
                const pullStrength = 7.5 * SPEED_SCALE * gameSpeed * Math.min(angerFactor, 1.6) * gravityRatio;
                const force = pullStrength * (1 - pullDist / maxPullDist);
                player.x += (pullDx / pullDist) * force;
                player.y += (pullDy / pullDist) * force;
            }

            if (frame % 6 === 0 && typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, -80 * gravityRatio, 800 * gravityRatio);
            }

            const particleCount = Math.max(1, Math.round(8 * gravityRatio));
            for (let i = 0; i < particleCount; i++) {
                const pAngle = Math.random() * Math.PI * 2;
                const pDist = 200 + Math.random() * 1000;
                const pColor = Math.random() > 0.5 ? e.color : '#ffffff';
                const pSpeed = (12 + Math.random() * 18) * SPEED_SCALE;
                const swirlAngle = pAngle + 0.2;

                spawnParticleObj({
                    x: e.x + Math.cos(pAngle) * pDist,
                    y: e.y + Math.sin(pAngle) * pDist,
                    vx: -Math.cos(swirlAngle) * pSpeed,
                    vy: -Math.sin(swirlAngle) * pSpeed,
                    color: pColor,
                    life: 1.5 + Math.random(),
                    size: Math.max(2.0, (2.5 + Math.random() * 2.0) * gravityRatio)
                });
            }
        } else if (!enableGravity && frame % 3 === 0) {
            const ang = Math.random() * Math.PI * 2;
            const dist = 70 + Math.random() * 30;
            spawnParticleObj({
                x: e.x + Math.cos(ang) * dist,
                y: e.y + Math.sin(ang) * dist,
                vx: -Math.cos(ang) * 5,
                vy: -Math.sin(ang) * 5,
                color: '#fff',
                life: 0.2,
                size: 2.5
            });
        }
    }
    // ----------------------------------------------------
    // [フェーズ3] 必殺技発射
    // ----------------------------------------------------
    else if (e.fireTimer >= fireTime && e.fireTimer < restartTime) {
        const isHomingAttack = e.attackPattern === 0 || stage < 4;
        const isHomingVolleyTime = isHomingAttack && (e.fireTimer === fireTime || (stage >= 6 && e.fireTimer === fireTime + 14));

        if (e.fireTimer === fireTime || isHomingVolleyTime) {

            // 必殺A: ホーミングミサイル (Pattern 0 または 低ステージ)
            if (isHomingAttack) {
                const sides = e.variant.sides;
                const volleyOffset = e.fireTimer === fireTime ? 0 : Math.PI / sides;
                for (let i = 0; i < sides; i++) {
                    const a = e.angle + volleyOffset + (Math.PI * 2 / sides) * i;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60,
                        vx: Math.cos(a) * (BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE * bulletSpeedMult),
                        vy: Math.sin(a) * (BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE * bulletSpeedMult),
                        life: BULLET_CONFIG.BOSS_HOMING.LIFE,
                        isMissile: true, color: e.color, trail: []
                    });
                }
            }
            // 必殺B: 衝撃波リング (高ステージ)
            else if (e.fireTimer === fireTime) {
                const ringCount = 12;
                for (let i = 0; i < ringCount; i++) {
                    const a = (Math.PI * 2 / ringCount) * i;
                    const spd = 12 * SPEED_SCALE * bulletSpeedMult;
                    spawnEnemyBulletObj({
                        x: e.x, y: e.y,
                        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                        life: 250, color: e.color,
                        isShockwave: true, baseScale: 0.8, scaleSpeed: 0.02
                    });
                }
            }
            if (isOnScreen(e) && typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
            spawnRingObj({ x: e.x, y: e.y, r: 20, color: '#fff', life: 1.0 });
            spawnRingObj({ x: e.x, y: e.y, r: 100, color: e.color, life: 0.8 });
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 150, 250);
        }
    }
    // ----------------------------------------------------
    // [フェーズ4] クールダウン
    // ----------------------------------------------------
    else if (e.fireTimer >= restartTime) {
        // 次の動き出しに向けて少し回転
        const ratio = (e.fireTimer - restartTime) / (maxCycle - restartTime);
        e.angle += Math.pow(ratio, 2) * 0.1;
    }

    // --- サイクル完了・次パターンの抽選 ---
    if (e.fireTimer >= maxCycle) {
        e.fireTimer = 0;
        e.gravityCycleIndex = (e.gravityCycleIndex || 0) + 1;
        // ステージ進行度に応じて攻撃パターンの種類を増やす
        if (stage <= 2) {
            e.attackPattern = 0;
        } else if (stage <= 5) {
            e.attackPattern = Math.random() < 0.5 ? 0 : 1;
        } else {
            const r = Math.random();
            if (r < 0.33) e.attackPattern = 0;
            else if (r < 0.66) e.attackPattern = 1;
            else e.attackPattern = 2;
        }
    }
}

function updateBossSpecialAI(e) {
    updateBossAI(e);
}

function updateBattleshipAI(e) {
    // 1. 出現演出
    if (e.isSpawning) {
        e.spawnTimer++;
        if (e.spawnTimer >= e.spawnMax) {
            e.isSpawning = false;
            if (ui.bossContainer) ui.bossContainer.style.display = 'block';
            if (ui.bossNameLabel) {
                ui.bossNameLabel.innerText = "GENESIS-ARK";
                ui.bossNameLabel.style.color = "#0ff";
            }
            if (ui.bossHpBarInline) ui.bossHpBarInline.style.backgroundColor = "#0ff";
            if (ui.bossBarFrame) ui.bossBarFrame.style.borderColor = "#0ff";
        }
        return;
    }

    // --- ★HP割合の計算と発狂モード判定 ---
    const hpPct = e.hp / e.maxHp;
    const isDesperationMode = hpPct <= 0.50;

    e.fireTimer++;

    // 2. 基本移動（追尾）
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.1;

    if (isDesperationMode) {
        e.vx *= 0.95; e.vy *= 0.95;
    } else {
        const cycle = e.fireTimer % 1380;
        const isRushing = (cycle >= 900 && cycle < 1200);
        const moveSpeed = isRushing ? e.speed * 2.5 : e.speed;
        const accel = isRushing ? 0.05 : 0.01;
        e.vx += (dx / d) * accel * SPEED_SCALE;
        e.vy += (dy / d) * accel * SPEED_SCALE;
        const cv = Math.hypot(e.vx, e.vy);
        if (cv > moveSpeed) {
            e.vx = (e.vx / cv) * moveSpeed;
            e.vy = (e.vy / cv) * moveSpeed;
        }
    }
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // 3. 旋回・発光演出
    if (isDesperationMode) {
        e.angle += 0.25 * gameSpeed;
        if (ui.bossNameLabel) {
            ui.bossNameLabel.innerText = "CRITICAL: EVENT HORIZON";
            ui.bossNameLabel.style.color = "#f0f";
        }
        if (ui.bossHpBarInline) {
            ui.bossHpBarInline.style.backgroundColor = (frame % 4 < 2) ? "#fff" : "#f0f";
            ui.bossHpBarInline.style.boxShadow = "0 0 15px #f0f";
        }
        if (ui.bossBarFrame) ui.bossBarFrame.style.borderColor = "#f0f";


        // 60フレーム（約1秒）に1回、ワームホールから敵を召喚
        if (frame % 60 === 0) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 400;
            const sx = e.x + Math.cos(spawnAngle) * spawnDist;
            const sy = e.y + Math.sin(spawnAngle) * spawnDist;

            // 境界チェック（画面外すぎる場合はクランプ）
            const targetX = Math.max(100, Math.min(worldSize - 100, sx));
            const targetY = Math.max(100, Math.min(worldSize - 100, sy));

            // ワームホール生成演出
            wormholes.push({ x: targetX, y: targetY, life: 60, maxLife: 60, active: true, spawnSource: 'battleship' });
            if (typeof distortGrid === 'function') distortGrid(targetX, targetY, 150, 300);

            // 0.5秒後に敵を出現させる
            setTimeout(() => {
                if (gameState === 'PLAYING' && isDesperationMode) {
                    const types = ['triangle', 'tadpole', 'dragon', 'asteroid'];
                    const randomType = types[Math.floor(Math.random() * types.length)];

                    // 1. 敵を生成（spawnEnemy内部でステージ10の速度補正 1.72倍 がすでにかかります）
                    spawnEnemy(targetX, targetY, randomType, 1, '#e00', 'battleship');

                    // プールを後ろから検索して「たった今生成された敵」を取得する
                    let newEnemy = null;
                    const pool = enemyPool.pool;
                    for (let i = pool.length - 1; i >= 0; i--) {
                        if (pool[i].active && pool[i].type === randomType) {
                            newEnemy = pool[i];
                            break;
                        }
                    }

                    if (newEnemy) {
                        // ==========================================
                        // ★ 修正：2倍補正を削除し、ステージ10の最高速度にリセット
                        // ==========================================
                        // newEnemy.speed はすでに計算済み（ベース速度 × 0.25 × 1.72）

                        // 登場時の勢い（vx, vy）を現在の進行方向に合わせる
                        const angle = Math.random() * Math.PI * 2;
                        newEnemy.vx = Math.cos(angle) * newEnemy.speed;
                        newEnemy.vy = Math.sin(angle) * newEnemy.speed;

                        newEnemy.color = '#e00'; // 発狂モードの敵として赤色に統一
                    }
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
                }
            }, 500);
        }

    } else {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const cycle = e.fireTimer % 1380;
        if (cycle >= 900 && cycle < 1200) e.angle += 0.15 * gameSpeed;
        else e.angle += diff * 0.01 * gameSpeed;

        // 150フレームに1回、30%の確率でアステロイドを召喚
        if (frame % 150 === 0 && Math.random() < 0.3) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const sx = e.x + Math.cos(spawnAngle) * 300;
            const sy = e.y + Math.sin(spawnAngle) * 300;

            wormholes.push({ x: sx, y: sy, life: 80, maxLife: 80, active: true, spawnSource: 'battleship' });
            setTimeout(() => {
                if (gameState === 'PLAYING' && !isDesperationMode) {
                    spawnEnemy(sx, sy, 'asteroid', 1, null, 'battleship');
                }
            }, 800);
        }
    }

    // 4. 攻撃ロジック

    const cycle = e.fireTimer % 1380;
    const sides = e.variant.sides || 12;

    if (cycle < 300) {
        if (cycle % 60 === 0) {
            for (let j = 0; j < sides; j++) {
                const baseA = e.angle + (Math.PI * 2 / sides) * j;
                const sx = e.x + Math.cos(baseA) * 100, sy = e.y + Math.sin(baseA) * 100;
                for (let i = -1; i <= 1; i++) {
                    const a = baseA + (i * 0.2);
                    spawnEnemyBulletObj({
                        x: sx, y: sy,
                        vx: Math.cos(a) * 24 * SPEED_SCALE * BATTLESHIP_PROJECTILE_SPEED_MULT,
                        vy: Math.sin(a) * 24 * SPEED_SCALE * BATTLESHIP_PROJECTILE_SPEED_MULT,
                        life: 200, color: '#0ff', isLaserMissile: true
                    });
                }
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
            // ==========================================
            // ★追加：全方位レーザー発射時の軽い歪み
            // ==========================================
            if (typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 100, 300);
            }

        }
    }
    // ==========================================
    // ★ 修正：パターン2 ファイター一斉展開＆包囲（ゆっくり）
    // ==========================================
    else if (cycle < 600) {
        if (cycle % 10 === 0 && typeof distortGrid === 'function') {
            distortGrid(e.x, e.y, 250, -15);
        }
        if (cycle === 320 || cycle === 460) {
            const fighterCount = 8;
            const pToBossAngle = Math.atan2(e.y - player.y, e.x - player.x);
            const bossToPlayerAngle = pToBossAngle + Math.PI;

            for (let i = 0; i < fighterCount; i++) {
                const posIdx = i - Math.floor(fighterCount / 2);
                const launchA = bossToPlayerAngle + posIdx * 0.4;

                const fighter = spawnEnemyObj({
                    x: e.x,
                    y: e.y,
                    // ★修正: 初速を 2.5 -> 0.5 に下げて、フワッと射出させる
                    vx: Math.cos(launchA) * 0.25 * SPEED_SCALE,
                    vy: Math.sin(launchA) * 0.25 * SPEED_SCALE,
                    hp: 3, 
                    speed: 1.0, 
                    color: '#0ff',
                    type: 'fighter',
                    state: 'deploy',
                    scale: 0.8,
                    noDrop: true,
                    spawnSource: 'battleship'
                });

                if (!fighter) continue;

                // fighter特有のパラメータを直接セット
                fighter.burstCount = 0;
                fighter.baseAngle = pToBossAngle;
                fighter.orbitAngleOffset = posIdx;
                fighter.targetRadius = 400;
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');

            // ==========================================
            // ★追加：ファイター射出時の歪み（射出の反動を表現）
            // ==========================================
            if (typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 150, 400);
            }
        }
    }
    // ==========================================
    // ★ 修正：ミサイルから「ワームホール & Phantom召喚」へ変更
    // ==========================================
    else if (cycle < 900) {
        const sub = cycle % 140; // 召喚の間隔を少し調整

        if (sub === 0) {
            // 1. ボスの斜め前方にワームホールを生成する座標を計算
            // ボスの向いている角度(e.angle)から少し横にずらす
            const spawnAngle = e.angle + (Math.random() > 0.5 ? 0.8 : -0.8);
            const spawnDist = 200;
            const sx = e.x + Math.cos(spawnAngle) * spawnDist;
            const sy = e.y + Math.sin(spawnAngle) * spawnDist;

            // 2. ワームホールを設置（life 100で消える設定）
            wormholes.push({
                x: sx,
                y: sy,
                life: 100,
                maxLife: 100,
                active: true,
                spawnSource: 'battleship'
            });
            if (typeof distortGrid === 'function') distortGrid(sx, sy, 100, 200);

            // 3. 少し遅らせて（ワームホールが開ききった頃）Phantomを出現させる
            setTimeout(() => {
                // ゲームが進行中（タイトルに戻っていない）かチェック
                if (gameState === 'PLAYING') {
                    spawnEnemy(sx, sy, 'phantom', 1, null, 'battleship');
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
                }
            }, 600); // 0.6秒後に実体化
        }
    }
    else if (cycle < 1200) {
        if (cycle % 10 === 0) {
            for (let i = 0; i < 8; i++) {
                const a = e.angle + (Math.PI * 2 / 8) * i;
                spawnEnemyBulletObj({
                    x: e.x + Math.cos(a) * 80, y: e.y + Math.sin(a) * 80,
                    vx: Math.cos(a) * 4 * BATTLESHIP_PROJECTILE_SPEED_MULT,
                    vy: Math.sin(a) * 4 * BATTLESHIP_PROJECTILE_SPEED_MULT,
                    life: 200, color: '#0ff', isLaserMissile: true
                });
            }

            // ==========================================
            // ★追加：回転連射中の継続的な軽い歪み
            // ==========================================
            if (cycle === 900 && typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 140, 150);
            }
        }
        if (Math.random() < 0.3) createExplosion(e.x + (Math.random() - 0.5) * 150, e.y + (Math.random() - 0.5) * 150, '#0ff', 5);
    }

}
