// =========================================================
// プレイヤー・武器制御 (Player & Weapon Systems)
// =========================================================


function updatePlayerMovement() {

    if (gameState === 'STAGE_INTRO' && introPhase === 3 && introTimer < 30) {
        player.vx = 0;
        player.vy = 0;

        // 入力状態もリセット（解禁と同時の暴発防止）
        input.move.x = 0; input.move.y = 0;
        input.aim.x = 0; input.aim.y = 0;

        return; // ここで中断
    }

    if (!Number.isFinite(player.x)) { player.x = worldSize / 2; player.y = worldSize / 2; player.vx = 0; player.vy = 0; }

    let mx = input.keys['KeyA'] ? -1 : input.keys['KeyD'] ? 1 : input.move.x;
    let my = input.keys['KeyW'] ? -1 : input.keys['KeyS'] ? 1 : input.move.y;
    const mag = Math.hypot(mx, my); if (mag > 1) { mx /= mag; my /= mag; }

    player.vx = mx * PLAYER_BASE_SPEED * SPEED_SCALE * gameSpeed;
    player.vy = my * PLAYER_BASE_SPEED * SPEED_SCALE * gameSpeed;
    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, player.x));
    player.y = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, player.y));

    // ==========================================
    // Lightcycleの光の壁でプレイヤーを物理的に弾き、ダメージを与える
    // ==========================================
    const LIGHT_WALL_RADIUS = 14; // 壁の厚み判定 + 自機の当たり判定余裕
    
    // 無敵状態かどうかに関わらず、壁の判定を行うように条件を変更
    if (typeof enemyPool !== 'undefined') {
        enemyPool.pool.forEach(e => {
            // ★追加: 非アクティブ（プール内待機中）のオブジェクトは無視する
            if (!e.active) return;

            if (e.type === 'lightcycle' && e.history && e.history.length > 1) {
                for (let i = 0; i < e.history.length - 1; i++) {
                    const p1 = e.history[i];
                    const p2 = e.history[i + 1];
                    
                    const l2 = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
                    if (l2 === 0) continue;

                    let t = ((player.x - p1.x) * (p2.x - p1.x) + (player.y - p1.y) * (p2.y - p1.y)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    
                    const projX = p1.x + t * (p2.x - p1.x);
                    const projY = p1.y + t * (p2.y - p1.y);
                    
                    const dx = player.x - projX;
                    const dy = player.y - projY;
                    const distSq = dx * dx + dy * dy;

                    // 壁にめり込んだ場合の処理
                    if (distSq < LIGHT_WALL_RADIUS * LIGHT_WALL_RADIUS) {
                        const dist = Math.sqrt(distSq) || 0.001;
                        const pushDist = LIGHT_WALL_RADIUS - dist;
                        
                        // 1. 弾き飛ばす（無敵状態でも問答無用で弾かれる）
                        player.x += (dx / dist) * pushDist * 2.5;
                        player.y += (dy / dist) * pushDist * 2.5;

                        // 2. 衝突地点に火花を散らす
                        const wallColor = e.variant ? (e.variant.trailColor || '#00ffff') : '#00ffff';
                        if (typeof createWallImpact === 'function') {
                            createWallImpact(player.x, player.y, wallColor);
                        }

                        // 3. ダメージ判定（★無敵じゃない時だけダメージを受ける）
                        if (player.invuln <= 0) {
                            if (typeof damage === 'function') {
                                damage(10); // シールドに10ダメージ
                            }
                        }
                    }
                }
            }
        });
    }

    // 向きと射撃の計算
    let aimX = input.keys['ArrowLeft'] ? -1 : input.keys['ArrowRight'] ? 1 : 0;
    let aimY = input.keys['ArrowUp'] ? -1 : input.keys['ArrowDown'] ? 1 : 0;
    let isArrowAiming = (aimX !== 0 || aimY !== 0);

    if (input.aim.active) {
        player.angle = Math.atan2(input.aim.y, input.aim.x);
    } else if (isArrowAiming) {
        player.angle = Math.atan2(aimY, aimX);
    } else if (Math.hypot(mx, my) > 0.1) {
        player.angle = Math.atan2(my, mx);
    }

    player.history.unshift({ x: player.x, y: player.y, angle: player.angle });
    if (player.history.length > 10) player.history.pop();

    //const fireInterval = player.laserTimer > 0 ? 4 : 6;
    const fireInterval = (player.laserTimer > 0 || player.overdriveTimer > 0) ? 4 : 6;
    let isFiring = input.aim.active || isArrowAiming || input.keys['Space'] || input.keys['KeyZ'] || input.padAPressed;

    if (player.fireTimer === undefined) player.fireTimer = fireInterval; // タイマー初期化

    if (isFiring) {
        player.fireTimer += gameSpeed; // スピードに応じてタイマーを進める
        if (player.fireTimer >= fireInterval) {
            fire();
            player.fireTimer = 0; // 発射したらタイマーをリセット
        }
    } else {
        // 撃っていない間はタイマーを満タンにしておき、次にボタンを押した瞬間にすぐ発射されるようにする
        player.fireTimer = fireInterval;
    }

    // ==========================================
    // 前面磁界バリアの展開判定
    // ==========================================
    const vMag = Math.hypot(player.vx, player.vy);
    if (vMag > 0.5) {
        // 自機の向きベクトル
        const dirX = Math.cos(player.angle);
        const dirY = Math.sin(player.angle);
        // 移動の正規化ベクトル
        const nvx = player.vx / vMag;
        const nvy = player.vy / vMag;
        
        // 内積計算 (1.0 = 完全に一致, 0.0 = 直角, -1.0 = 真逆)
        const dot = dirX * nvx + dirY * nvy;
        
        // 向いている方向への移動成分が高い（前進している）場合
        if (dot > 0.6) {
            // バリア強度を徐々に上げる (最大1.0)
            player.frontalBarrier = Math.min(1.0, (player.frontalBarrier || 0) + 0.1);
        } else {
            // 前進していない場合は徐々に下げる
            player.frontalBarrier = Math.max(0.0, (player.frontalBarrier || 0) - 0.1);
        }
    } else {
        // 停止中も下げる
        player.frontalBarrier = Math.max(0.0, (player.frontalBarrier || 0) - 0.1);
    }

    // サテライト更新
    player.satellites.forEach((s, i) => {
        s.angle = (s.angle || 0) + 0.15;
        const rad = 45 * G_SCALE;
        const off = (Math.PI * 2 / player.satellites.length) * i;
        s.x = player.x + Math.cos(s.angle + off) * rad;
        s.y = player.y + Math.sin(s.angle + off) * rad;
    });
}

function updatePlayerRotationAndFiring(mx, my) {
    let aimX = input.keys['ArrowLeft'] ? -1 : input.keys['ArrowRight'] ? 1 : 0;
    let aimY = input.keys['ArrowUp'] ? -1 : 0;
    if (input.keys['ArrowDown']) aimY = 1;

    let isArrowAiming = (aimX !== 0 || aimY !== 0);

    if (input.aim.active) {
        player.angle = Math.atan2(input.aim.y, input.aim.x);
    } else if (isArrowAiming) {
        player.angle = Math.atan2(aimY, aimX);
    } else if (Math.hypot(mx, my) > 0.1) {
        player.angle = Math.atan2(my, mx);
    }

    //const fireInterval = player.laserTimer > 0 ? 4 : 6;
    const fireInterval = (player.laserTimer > 0 || player.overdriveTimer > 0) ? 4 : 6;
    let isFiring = input.aim.active || isArrowAiming || input.keys['Space'] || input.keys['KeyZ'] || input.padAPressed;

    if (player.fireTimer === undefined) player.fireTimer = fireInterval; // タイマー初期化

    if (isFiring) {
        player.fireTimer += gameSpeed; // スピードに応じてタイマーを進める
        if (player.fireTimer >= fireInterval) {
            fire();
            player.fireTimer = 0; // 発射したらタイマーをリセット
        }
    } else {
        player.fireTimer = fireInterval;
    }
}


function fire() {
    // 演出用のオフセット（下から登場中など）を考慮した発射位置を計算
    const vY = player.visualYOffset || 0;
    const spawnY = player.y + vY; // ★ここがポイント

    if (player.overdriveTimer > 0 || player.laserTimer > 0) {
        const isHyper = player.overdriveTimer > 0;

        // 1. レーザーの発射
        lasers.push({
            x: player.x,
            y: spawnY,
            angle: player.angle,
            life: 5,
            width: 40 
        });
        
        if (typeof AudioSys !== 'undefined') AudioSys.playSE('laser');
        distortGrid(player.x, spawnY, isHyper ? 30 : 20, 60);

        // 2. ハイパーモード専用：ホーミングミサイル展開
        if (isHyper) {
            // 全体フレームではなく、fire()が呼ばれた回数をカウントする
            player.homingLaserTick = (player.homingLaserTick || 0) + 1;

            // 射撃2回につき1回（安定した間隔で）ミサイルを射出する
            if (player.homingLaserTick % 8 === 0) {
                
                // 左、右、左斜め後ろ、右斜め後ろ の4方向の角度を計算
                const missileAngles = [
                    player.angle - Math.PI / 2,         // 左
                    player.angle + Math.PI / 2,         // 右
                    player.angle - Math.PI * 0.75,      // 左後方
                    player.angle + Math.PI * 0.75       // 右後方
                ];

                const initialSpeed = 30 * SPEED_SCALE;
                const cruiseSpeed = 20 * SPEED_SCALE;

                missileAngles.forEach(a => {
                    homingLasers.push({
                        x: player.x,
                        y: spawnY,
                        vx: Math.cos(a) * initialSpeed,
                        vy: Math.sin(a) * initialSpeed,
                        speed: cruiseSpeed, 
                        life: 180, 
                        color: '#ffea00' // 黄金色
                    });
                });

                if (typeof AudioSys !== 'undefined') {
                    AudioSys.playSE('homing');
                }
            }
        }
        return; // 通常弾は撃たない
    }

    const s = BULLET_CONFIG.PLAYER.SPEED * SPEED_SCALE;
    const shotPatterns = {
        1: [0.08, -0.08], 2: [0.15, 0, -0.15], 3: [0.15, 0, -0.15, Math.PI],
        4: [0.15, 0, -0.15, Math.PI - 0.15, Math.PI + 0.15],
        5: [0.2, 0.07, -0.07, -0.2, Math.PI - 0.15, Math.PI + 0.15],
        6: [0.2, 0.07, -0.07, -0.2, Math.PI - 0.15, Math.PI + 0.15, Math.PI / 2, -Math.PI / 2],
        7: [0.25, 0.12, 0, -0.12, -0.25, Math.PI - 0.15, Math.PI + 0.15, Math.PI / 2, -Math.PI / 2]
    };

    const currentPattern = shotPatterns[player.weaponLevel] || shotPatterns[1];
    const baseLife = BULLET_CONFIG.PLAYER.LIFE;

    // 自機の純粋な移動量ベクトルを算出（二重のgameSpeed乗算を防止）
    const pVx = (typeof gameSpeed !== 'undefined' && gameSpeed > 0) ? player.vx / gameSpeed : 0;
    const pVy = (typeof gameSpeed !== 'undefined' && gameSpeed > 0) ? player.vy / gameSpeed : 0;

    currentPattern.forEach(offset => {
        const a = player.angle + offset;
        
        // オフセットの絶対値が45度(Math.PI/4)より大きければ横・後ろと判定し、寿命を0.7にする
        const bulletLife = Math.abs(offset) > (Math.PI / 4) ? baseLife * 0.7 : baseLife;

        spawnPlayerBulletObj({
            x: player.x,
            y: spawnY,
            // 弾の基本速度ベクトルに、自機の移動量ベクトルをそのまま加算
            vx: Math.cos(a) * s + pVx,
            vy: Math.sin(a) * s + pVy,
            life: bulletLife
        });
    });

    if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');
    distortGrid(player.x, spawnY, 10, 40);
}

function launchSatellites() {
    // サテライト（回収したクリスタル）がなければ発動しない
    if (!player.satellites || player.satellites.length === 0) return;

    // ==========================================
    // 1. 攻撃範囲（半径）の計算（見えている範囲に制限）
    // ==========================================
    const crystalCount = player.satellites.length;

    // 現在のカメラで見えている画面の幅と高さを取得
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    // 画面の「長辺の半分強」（＝画面の四隅ギリギリに届くくらいの半径）を最大値とする
    const maxRadius = Math.max(viewW, viewH) * 0.5;

    const baseRadius = 50; // 基本の攻撃半径（初期は自機の周辺のみ）

    // クリスタル最大数(12個)の時に、ちょうど maxRadius になるように1個あたりの増加量を自動計算
    const bonusPerCrystal = (maxRadius - baseRadius) / MAX_SATELLITES;

    const bombRadius = baseRadius + (crystalCount * bonusPerCrystal);

    AudioSys.playSE('explode_large'); // 爆発音

    // ==========================================
    // 2. 敵を一掃する
    // ==========================================
    enemyPool.pool.forEach(e => {
        // ★追加: 非アクティブ（プール内待機中）のオブジェクトは無視する
        if (!e.active) return;

        // 出現中のボス・戦艦はすり抜ける（無敵）
        // ★修正: forループの continue ではなく、forEach なので return でスキップします
        if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) return;

        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist <= bombRadius) {
            if (e.type === 'boss' || e.type === 'battleship' || e.type === 'dragon') {
                // ボス級にはクリスタル数に応じたダメージ（少しマイルドに調整）
                e.hp -= crystalCount * 2;
                e.flashTimer = 10;
                createExplosion(e.x, e.y, '#ff0', 8);
            } else {
                // 雑魚敵は即死
                e.hp = 0;
                e.noDrop = true; // ボムで倒した時はアイテムを出さない
                createExplosion(e.x, e.y, e.color, 10);
            }
        }
    });

    // ==========================================
    // 3. 敵の弾も範囲内なら消し去る
    // ==========================================
    // ボムによる敵弾消去ロジック
    const ebPool = enemyBulletPool.pool; // プールを参照

    for (let i = 0; i < ebPool.length; i++) {
        const eb = ebPool[i];
        
        // 使用中（画面に存在している）弾だけが対象
        if (!eb.active) continue;

        const dx = eb.x - player.x;
        const dy = eb.y - player.y;
        // Math.hypot は重いので、距離の2乗で判定するとより高速です
        const distSq = dx * dx + dy * dy;
        const bombRadiusSq = bombRadius * bombRadius;

        if (distSq <= bombRadiusSq) {
            // 爆発エフェクトを発生
            createExplosion(eb.x, eb.y, eb.color || '#fff', 2);
            
            // ★重要：削除の代わりに非アクティブにする
            enemyBulletPool.release(eb);
            eb.life = 0; // 念のため寿命も0にしておく
        }
    }

    // ==========================================
    // 4. 巨大な波紋エフェクトを登録する
    // ==========================================
    spawnRingObj({
        x: player.x,
        y: player.y,
        r: 10,                 // 初期半径
        targetR: bombRadius,   // 目標半径
        color: '#0ff',         // ネオンシアン
        life: 1.0,             // 寿命 (1.0 = 100%)
        isBomb: true           // ボム用フラグ
    });

    // 空間を大きく歪ませる演出
    if (typeof distortGrid === 'function') {
        distortGrid(player.x, player.y, bombRadius * 0.5, bombRadius);
    }

    // ==========================================
    // 5. サテライト（クリスタル）を全て消費する
    // ==========================================
    player.satellites = [];
}

function damage(v) {
    player.shield -= v;
    player.invuln = 60;

    if (v > 0 && typeof applyExtremeTimeAttackHitPenalty === 'function') {
        applyExtremeTimeAttackHitPenalty(EXTREME_TIME_ATTACK_CONFIG.DAMAGE_PENALTY_SECONDS);
    }

    const shieldPercent = Math.max(0, (player.shield / PLAYER_BASE_SHIELD) * 100);
    ui.shieldBar.style.width = shieldPercent + "%";

    AudioSys.playSE('damage');
    distortGrid(player.x, player.y, 50, 100);

    if (player.shield <= 0) {
        gameState = 'DYING';
        AudioSys.stopSE('warning');

        // ★修正：「GAME OVER」をメイン、「SHIELD LOST」をサブにまとめて表示
        // durationを0にすることで、途中で勝手に消えなくなります
        showGameMessage({
            main: "GAME OVER",
            sub: "SHIELD LOST",
            type: "warning",
            duration: 0
        });

        player.invuln = 0;
        player.laserTimer = 0;
        gameSpeed = 0.1;
        dyingTimer = 300;

        playerBulletPool.clearAll(); lasers = []; homingLasers = [];
        createExplosion(player.x, player.y, '#0f8', 200);

        AudioSys.playSE('explode_large');
        distortGrid(player.x, player.y, 300, 500);
    }
}

function updatePlayerStatus() {
    if (player.invuln > 0) player.invuln--;
    if (player.laserTimer > 0) player.laserTimer--;
    if (player.overdriveTimer > 0) player.overdriveTimer--;
}



function checkPlayerCollision(e) {
    if (gameState === 'DYING' || gameState === 'GAMEOVER') return;

    // ★修正1: Math.hypot を廃止し、距離の2乗 (dx*dx + dy*dy) を計算
    // 平方根(sqrt)を使わないため非常に高速です
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const distSq = dx * dx + dy * dy;

    // --- 当たり判定半径の決定 (ここは変更なし) ---
    let radius = 15 * G_SCALE;
    if (e.type === 'asteroid') {
        radius = 20 * e.scale * G_SCALE;
    } else if (e.type === 'triangle') {
        radius = ENEMY_HITBOX.TRIANGLE * G_SCALE;
    } else if (e.type === 'cube') {
        radius = ENEMY_HITBOX.CUBE * G_SCALE;
    } else if (e.type === 'tadpole') {
        radius = ENEMY_HITBOX.TADPOLE * G_SCALE;
    } else if (e.type === 'dragon') {
        radius = ENEMY_HITBOX.DRAGON * G_SCALE;
    } else if (e.type === 'hunter') {
        radius = ENEMY_HITBOX.HUNTER * G_SCALE;
    } else if (e.type === 'boss') {
        radius = 45 * G_SCALE;
    } else if (e.type === 'battleship') {
        radius = 80 * G_SCALE;
    }

    // 衝突境界距離の計算
    const collisionDist = radius * (e.type === 'asteroid' ? 1 : (e.scale / 0.7)) + (player.invuln > 0 ? 20 : 0);

    // ★修正2: 判定距離の方を2乗する (比較対象を合わせる)
    const collisionDistSq = collisionDist * collisionDist;

    // ★修正3: 2乗同士で比較判定を行う (結果は同じになる)
    if (distSq < collisionDistSq) {

        // --- 以下、衝突時の処理 (変更なし) ---
        if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) return;

        if (player.invuln > 0) {
            if (e.type === 'boss' || e.type === 'battleship' || e.type === 'dragon' || e.type === 'asteroid') {
                e.hp -= 0.15;

                if (e.type === 'boss' || e.type === 'battleship') {
                    player.invuln -= 1;
                    const pushAngle = Math.atan2(player.y - e.y, player.x - e.x);
                    player.x += Math.cos(pushAngle) * 3;
                    player.y += Math.sin(pushAngle) * 3;
                }

                if (e.type === 'boss' || e.type === 'battleship') e.flashTimer = 5;

                if (frame % 4 === 0) {
                    createExplosion(e.x, e.y, '#ff0', 2);
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('boss_hit');
                }
            } else {
                e.hp = 0;
                score += 100;
                createExplosion(e.x, e.y, e.color, 15);
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');
            }
            return;
        }

        // --- (中略) 無敵ではない場合の通常ダメージ処理 ---
        player.shield -= 0.5;
        if (player.invuln <= 0) {
            
            // ==========================================
            // ★追加: 前面バリア展開中のダメージ軽減処理
            // ==========================================
            let damageAmount = 10; // 基本ダメージ
             
            // バリアが一定以上展開されているか
            if (player.frontalBarrier && player.frontalBarrier > 0.5) {
                // 敵が自機の前方にいるか判定する
                const edx = e.x - player.x;
                const edy = e.y - player.y;
                const eDist = Math.sqrt(edx * edx + edy * edy) || 1;
                const dotEnemy = Math.cos(player.angle) * (edx / eDist) + Math.sin(player.angle) * (edy / eDist);
                
                // 敵が前方（約60度の範囲内）にいる場合
                if (dotEnemy > 0.5) {
                    damageAmount = 2; // ダメージを大幅に軽減
                    
                    // バリアで弾いたことを示すエフェクト（シアン色の火花）
                    if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#0ff', 5);
                }
            }

            player.shield -= damageAmount; // 計算したダメージを適用
            if (typeof applyExtremeTimeAttackHitPenalty === 'function') {
                applyExtremeTimeAttackHitPenalty(EXTREME_TIME_ATTACK_CONFIG.DAMAGE_PENALTY_SECONDS);
            }
            player.invuln = 10;
            createExplosion(player.x, player.y, '#f00', 5);
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('damage');
        }
        ui.shieldBar.style.width = Math.max(0, player.shield) + "%";


        if (player.shield <= 0) damage(0);
    }
}

function checkSatelliteCollision(e) {
    // 出現中のボス・戦艦は当たり判定なし（すり抜ける）
    if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) return;

    // ★修正1: 判定半径(25)の2乗を定数として定義 (25 * 25 = 625)
    const HIT_RADIUS_SQ = 625;

    for (let i = player.satellites.length - 1; i >= 0; i--) {
        const s = player.satellites[i];

        // ★修正2: Math.hypot を廃止し、距離の2乗を計算
        const dx = s.x - e.x;
        const dy = s.y - e.y;
        const distSq = dx * dx + dy * dy;

        // ★修正3: 2乗同士で比較
        if (distSq < HIT_RADIUS_SQ) {

            // --- 以下、衝突時の処理 (変更なし) ---
            if (e.type === 'boss' || e.type === 'battleship' || e.type === 'dragon') {
                e.hp -= 20;

                if (e.type === 'boss' || e.type === 'battleship') e.flashTimer = 5;
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('boss_hit');

                if (typeof createExplosion === 'function') {
                    createExplosion(s.x, s.y, '#0f0', 5);
                }
            } else {
                e.hp = 0;
                e.noDrop = true;

                if (typeof createExplosion === 'function') {
                    createExplosion(s.x, s.y, e.color, 10);
                }
            }

            // 衛星（サテライト）を消滅させる
            player.satellites.splice(i, 1);

            // 1つの衛星は1回ヒットしたら消えるのでループを抜ける
            break;
        }
    }
}
