// ==========================================
// ロジック（計算・当たり判定）
// ==========================================

function updatePlayerBullets() {
    // 現在のカメラの表示範囲を計算
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const margin = 50; // 画面外50pxまで飛んだら消す

    const pPool = playerBulletPool.pool; // プールを参照
    for (let i = 0; i < pPool.length; i++) {
        const b = pPool[i];
        if (!b.active) continue; // ★未使用の弾はスキップ
        
        b.x += b.vx * gameSpeed;
        b.y += b.vy * gameSpeed;
        b.life -= gameSpeed;

        // --- 画面（カメラ）の範囲外に出たら弾を消滅させる ---
        if (b.x < camera.x - margin || b.x > camera.x + viewW + margin ||
            b.y < camera.y - margin || b.y > camera.y + viewH + margin || b.life <= 0) {
            b.active = false; // ★プールへ返却
            b.life = 0;
            continue; 
        }

        // --- ワールド境界との衝突判定 ---
        if (b.x < WALL_MARGIN || b.x > worldSize - WALL_MARGIN ||
            b.y < WALL_MARGIN || b.y > worldSize - WALL_MARGIN) {

            const impactX = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, b.x));
            const impactY = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, b.y));

            createWallImpact(impactX, impactY, '#0f8');
            b.active = false; // ★プールへ返却
            b.life = 0;
            continue;
        }

        // --- 敵との当たり判定 ---
        for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            
            // 敵が死んでいる、または敵が画面外の場合はスキップ
            if (e.hp <= 0 || !e.inActiveRange) continue;

            // 出現演出中のボスはショットをすり抜ける
            if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) continue;

            // 敵の種類ごとの判定半径
            let hitRadius = 30 * e.scale;
            if (e.type === 'asteroid' || e.type === 'bubble') hitRadius = 25 * e.scale;
            else if (e.type === 'dragon') hitRadius = ENEMY_HITBOX.DRAGON;
            else if (e.type === 'triangle') hitRadius = ENEMY_HITBOX.TRIANGLE;
            else if (e.type === 'cube') hitRadius = ENEMY_HITBOX.CUBE;
            else if (e.type === 'tadpole') hitRadius = ENEMY_HITBOX.TADPOLE;
            else if (e.type === 'hunter') hitRadius = ENEMY_HITBOX.HUNTER;
            else if (e.type === 'boss') hitRadius = ENEMY_HITBOX.BOSS;

            const dx = b.x - e.x;
            const dy = b.y - e.y;
            const distSq = dx * dx + dy * dy;
            const hitRadiusSq = hitRadius * hitRadius;

            if (distSq < hitRadiusSq) {
                b.active = false; // ★ヒットしたのでプールへ返却
                b.life = 0;
                e.hp--;

                if (e.type === 'boss' || e.type === 'battleship') {
                    e.flashTimer = 5;
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('boss_hit');
                    if (e.hp > 0) createWallImpact(b.x, b.y, '#0f8');

                    for (let k = 0; k < 3; k++) {
                        spawnParticleObj({
                            x: b.x, y: b.y,
                            vx: (Math.random() - 0.5) * 20 * SPEED_SCALE,
                            vy: (Math.random() - 0.5) * 20 * SPEED_SCALE,
                            color: '#fff', life: 0.2, size: 2 * G_SCALE
                        });
                    }
                } else {
                    if (e.hp > 0) {
                        if (typeof AudioSys !== 'undefined') AudioSys.playSE('enemy_hit');
                        createWallImpact(b.x, b.y, '#0f8');
                        
                        const sparkColor = e.color || '#fff';
                        for (let k = 0; k < 4; k++) {
                            spawnParticleObj({
                                x: b.x, y: b.y,
                                vx: (Math.random() - 0.5) * 8,
                                vy: (Math.random() - 0.5) * 8,
                                color: sparkColor, life: 0.8 + Math.random() * 0.4, size: 2.0
                            });
                        }
                    }
                }
                break; // ★この弾は消滅したので、他の敵との判定を終了
            }
        }
    }
}

function updateLasers() {
    // ★追加：現在のカメラの表示範囲に基づいて、レーザーの最大長を計算
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const dynamicMaxLen = Math.max(viewW, viewH) + 100;

    // ★修正1: 最大長の2乗を事前に計算（比較用）
    const dynamicMaxLenSq = dynamicMaxLen * dynamicMaxLen;

    lasers.forEach(l => {
        l.life -= gameSpeed;

        let currentLen = dynamicMaxLen;
        // ★修正2: 現在の長さの2乗も管理（比較用）
        let currentLenSq = dynamicMaxLenSq;

        const cos = Math.cos(l.angle);
        const sin = Math.sin(l.angle);

        // --- 壁との交差判定（壁で止める処理） ---
        const min = WALL_MARGIN;
        const max = worldSize - WALL_MARGIN;

        let distX = Infinity;
        if (cos !== 0) {
            distX = (cos > 0 ? max - l.x : min - l.x) / cos;
        }

        let distY = Infinity;
        if (sin !== 0) {
            distY = (sin > 0 ? max - l.y : min - l.y) / sin;
        }

        // 壁までの距離は平方根計算なしで求められるのでそのまま使用
        const distToWall = Math.min(distX, distY);

        if (distToWall < currentLen) {
            currentLen = distToWall;
            currentLenSq = currentLen * currentLen; // 2乗も更新

            // 壁に当たった地点でエフェクト発生
            const hitX = l.x + cos * currentLen;
            const hitY = l.y + sin * currentLen;
            createWallImpact(hitX, hitY, '#0ff'); // シアン色の火花
        }

        const p1x = l.x;
        const p1y = l.y;

        // --- 敵との衝突判定 ---
        enemies.forEach(e => {
            if (e.hp <= 0 || !e.inActiveRange) return;
            if ((e.type === 'boss' || e.type === 'battleship') && e.isSpawning) return;

            const dx = e.x - p1x;
            const dy = e.y - p1y;
            // ★修正3: 距離の2乗を計算 (Math.hypot廃止)
            const distToEnemySq = dx * dx + dy * dy;

            // 敵の方向とレーザーの方向が一致しているか
            const angleToEnemy = Math.atan2(dy, dx);
            let diff = Math.abs(l.angle - angleToEnemy);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            // ★修正4: 距離比較を2乗で行う (distToEnemy < currentLen -> distToEnemySq < currentLenSq)
            if (diff < 0.35 && distToEnemySq < currentLenSq) {
                const hitRadius = (e.type === 'boss' || e.type === 'battleship' ? 45 : 15) * e.scale;

                // ボスや戦艦の場合はレーザーを貫通させず、そこで止める
                if (e.type === 'boss' || e.type === 'battleship') {
                    // ★ここだけは実際の距離が必要になるので平方根を計算 (頻度は低い)
                    const distToEnemy = Math.sqrt(distToEnemySq);
                    currentLen = Math.min(currentLen, distToEnemy);
                    currentLenSq = currentLen * currentLen; // 2乗も更新
                    e.flashTimer = 5;
                }

                // ダメージ処理
                e.hp -= 0.5;
                if (frame % 2 === 0) {
                    createExplosion(e.x, e.y, e.color, 2);

                    // ==========================================
                    // ★追加: レーザーのヒット音（爆音防止のため4フレームに1回）
                    // ==========================================
                    if (frame % 4 === 0 && typeof AudioSys !== 'undefined') {
                        if (e.type === 'boss' || e.type === 'battleship') {
                            AudioSys.playSE('boss_hit');
                        } else {
                            AudioSys.playSE('enemy_hit');
                        }
                    }
                    // ヒット地点のエフェクト
                    // 正確なヒット位置計算には本来 sqrt が必要だが、
                    // エフェクト用なので distToEnemySq の平方根を取らずに簡易計算するか、
                    // ここだけ sqrt を使う（頻度低めならOK）
                    const distToEnemy = Math.sqrt(distToEnemySq); // エフェクト位置用
                    const hitX = p1x + Math.cos(l.angle) * distToEnemy;
                    const hitY = p1y + Math.sin(l.angle) * distToEnemy;
                    spawnParticleObj({
                        x: hitX, y: hitY,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        color: '#fff', life: 0.2, size: 2
                    });
                }
            }
        });

        // 最終的な描画長さを保存
        l.renderLen = currentLen;

        // --- 敵弾の消去判定 ---
        // 事前に計算できる定数を準備
        // 直線の方程式 Ax + By + C = 0 の係数計算用
        // (p1x, p1y) と (p2x, p2y) を通る直線
        // A = p1y - p2y, B = p2x - p1x, C = p1x*p2y - p2x*p1y
        // ここでは p2 = p1 + vec(cos, sin) * currentLen なので
        // A = -sin * currentLen
        // B = cos * currentLen
        // C = p1x * (p1y + sin*L) - (p1x + cos*L) * p1y = p1x*sin*L - p1y*cos*L
        // 全体を currentLen で割ると正規化できる:
        // A' = -sin, B' = cos, C' = p1x*sin - p1y*cos
        // 点と直線の距離 d = |A'x + B'y + C'| / sqrt(A'^2 + B'^2)
        // A'^2 + B'^2 = sin^2 + cos^2 = 1 なので、分母は1になる！

        const A_norm = -sin;
        const B_norm = cos;
        const C_norm = p1x * sin - p1y * cos;
        const hitWidth = (l.width / 2 + 15) * G_SCALE;

        const ebPool = enemyBulletPool.pool; // ★プールを参照

        for (let i = 0; i < ebPool.length; i++) {
            const eb = ebPool[i];
            
            // ★生存チェック（activeフラグとlifeの両方を確認）
            if (!eb.active || eb.life <= 0) continue;

            // ★修正5: 点と直線の距離公式を最適化 (平方根なし)
            // レーザーの直線に対して敵弾(eb)がどれだけ離れているか（横幅の判定）
            const dist = Math.abs(A_norm * eb.x + B_norm * eb.y + C_norm);

            // ★修正6: 内積計算 (射影) で線分上にあるか判定
            // レーザーの根元から先端までの間に敵弾があるか（長さの判定）
            const dot = (eb.x - p1x) * cos + (eb.y - p1y) * sin;

            // 当たり判定：横幅(dist)がレーザー幅以内、かつ長さ(dot)が0〜レーザー長の間
            if (dist < hitWidth && dot > 0 && dot < currentLen) {
                // 敵弾を消去
                eb.active = false; // ★プールへ返却
                eb.life = 0;
                
                // スコア加算
                score += 10;

                // 演出：レーザーでかき消した感じを出すなら小さな火花
                if (Math.random() < 0.3) {
                    spawnParticleObj({
                        x: eb.x, y: eb.y,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        color: '#fff', life: 0.2, size: 1.5
                    });
                }
            }
        }
    });
    lasers = lasers.filter(l => l.life > 0);
}

function updateEnemyBullets() {
    const bulletStageMag = 1.0 + (stage - 1) * DIFFICULTY_CONFIG.BULLET_SPEED_INC;

    const ebPool = enemyBulletPool.pool; // ★プールを参照
    for (let i = 0; i < ebPool.length; i++) {
        const eb = ebPool[i];

        // ★生存チェック
        if (!eb.active) continue;

        // --- 1. 座標更新 ---
        eb.x += eb.vx * gameSpeed;
        eb.y += eb.vy * gameSpeed;

        // --- 2. ワールド境界との衝突判定 ---
        const isHitWall = (eb.x < WALL_MARGIN || eb.x > worldSize - WALL_MARGIN || eb.y < WALL_MARGIN || eb.y > worldSize - WALL_MARGIN);

        if (isHitWall) {
            const impactX = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, eb.x));
            const impactY = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, eb.y));

            if (!eb.isFading && (eb.isMissile || eb.isLaserMissile)) {
                createExplosion(impactX, impactY, eb.color, 10);
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('enemy_hit');
                distortGrid(impactX, impactY, 15, 30);
            }

            eb.active = false; // ★プール返却
            eb.life = 0;
            continue;
        }

        // --- 3. フェードアウト中の処理 ---
        if (eb.isFading) {
            eb.baseAlpha = (eb.baseAlpha === undefined ? 1.0 : eb.baseAlpha) - 0.03 * gameSpeed;
            const wave = (Math.sin(frame * 1.0) + 1) / 2;
            eb.alpha = eb.baseAlpha * wave;
            if (eb.baseAlpha <= 0) {
                eb.active = false; // ★プール返却
                eb.life = 0;
            }
            continue; 
        }

        // --- 4. 寿命の消費 ---
        eb.life -= gameSpeed;
        if (eb.life <= 0) {
            if (eb.isMissile || eb.isLaserMissile) {
                eb.isFading = true;
                eb.baseAlpha = 1.0;
                eb.life = 1; 
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('enemy_hit', 0.5);
                continue;
            } else {
                eb.active = false; // ★プール返却
                eb.life = 0;
                continue;
            }
        }

        // --- 5. アステロイドによる弾の吸収 ---
        if (!eb.isShockwave) {
            for (let j = 0; j < enemies.length; j++) {
                const rock = enemies[j];
                if (rock.type !== 'asteroid' || rock.hp <= 0) continue;
                const rockRadius = 25 * rock.scale * G_SCALE;
                
                const dx = rock.x - eb.x;
                const dy = rock.y - eb.y;
                if (dx * dx + dy * dy < rockRadius * rockRadius) {
                    eb.active = false; // ★プール返却
                    eb.life = 0;
                    createExplosion(eb.x, eb.y, '#fff', 3);
                    break;
                }
            }
            if (!eb.active) continue;
        }

        // --- 6. ミサイルの誘導と自機弾との判定 ---
        if (eb.isMissile) {
            // ... (誘導ロジックは既存のままでOKですが、eb.activeチェックを適宜挟みます) ...
            if (eb.trail) {
                if (eb.trail.length >= 10) {
                    // 一番古いオブジェクトを取り出して、今の座標に書き換えて先頭に戻す
                    const oldPos = eb.trail.pop();
                    oldPos.x = eb.x;
                    oldPos.y = eb.y;
                    eb.trail.unshift(oldPos);
                } else {
                    // 10個溜まるまでは仕方ないので作る
                    eb.trail.unshift({ x: eb.x, y: eb.y });
                }
            }

            if (eb.homingTimer > 0) {
                eb.homingTimer -= gameSpeed;
                eb.vx *= 0.99; eb.vy *= 0.99;
                const dx = player.x - eb.x, dy = player.y - eb.y;
                const d = Math.hypot(dx, dy) || 0.001;
                const accel = 0.4 * SPEED_SCALE;
                eb.vx += (dx / d) * accel * gameSpeed;
                eb.vy += (dy / d) * accel * gameSpeed;
            }
            // (中略: ミサイル速度制限など)

            // ★プレイヤーのショットで撃墜 (二重ループ最適化済みのものを適用)
            const pPool = playerBulletPool.pool;
            for (let j = 0; j < pPool.length; j++) {
                const b = pPool[j];
                if (!b.active) continue;

                const bdx = b.x - eb.x;
                const bdy = b.y - eb.y;
                const hitDist = 20 * G_SCALE;
                if (bdx * bdx + bdy * bdy < hitDist * hitDist) {
                    createExplosion(eb.x, eb.y, eb.color, 8);
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');
                    eb.active = false; 
                    eb.life = 0;
                    b.active = false; 
                    b.life = 0;
                    score += 50;
                    break; 
                }
            }
            if (!eb.active) continue;
        }

        // --- 7. プレイヤーとの判定 ---
        if (gameState !== 'DYING' && player.invuln <= 0) {
            const dx = player.x - eb.x;
            const dy = player.y - eb.y;
            const distSq = dx * dx + dy * dy;
            
            let collisionRadius = (eb.isMissile ? 12 : 8) * G_SCALE;

            if (eb.isShockwave) {
                const growSpd = (eb.scaleSpeed !== undefined) ? eb.scaleSpeed : 0.02;
                eb.baseScale = (eb.baseScale || 1.0) + growSpd * gameSpeed;
                collisionRadius = 18 * eb.baseScale * G_SCALE;
            }

            if (distSq < collisionRadius * collisionRadius) {
                eb.active = false; // ★プール返却
                eb.life = 0;
                createExplosion(player.x, player.y, eb.color || '#f00', 10);
                damage(15);
            }
        }
    }
    // enemyBullets = enemyBullets.filter(...) // ★削除
}

function updateMissiles() {
    // missiles配列がない場合は何もしない
    if (typeof missiles === 'undefined') return;

    missiles.forEach(m => {
        // ★追加: ミサイルが発射されてからのフレーム数をカウント
        m.age = (m.age || 0) + 1;

        // --- 1. ターゲット探索（発射直後はターゲットを探さず直進する） ---
        if (m.age > 60 && (!m.target || !enemies.includes(m.target))) {
            let min = 999999;
            enemies.forEach(e => {
                if (e.hp > 0) { // 生きている敵だけ対象
                    // 高速化のため平方根を使わず2乗で距離比較
                    const dx = e.x - m.x;
                    const dy = e.y - m.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < min) { min = distSq; m.target = e; }
                }
            });
        }

    // --- 2. フェーズに応じた誘導と速度制御 ---
        const scale = (typeof SPEED_SCALE !== 'undefined') ? SPEED_SCALE : 0.25;

        if (m.age <= 30) {
            // 【フェーズ1: 射出・拡散】（0〜30フレーム）
            // ★拡散時間を大幅に延長。減速をほぼ無くし(0.99)、遠くまで大きく広がるようにする
            m.vx *= 0.99;
            m.vy *= 0.99;

        } else if (m.age <= 45) {
            // 【フェーズ2: 減速＆旋回】（31〜45フレーム）
            // 大きく広がった位置から、滑らかに減速しながらターゲットの方へ弧を描く
            m.vx *= 0.90; 
            m.vy *= 0.90;
            
            if (m.target) {
                const ta = Math.atan2(m.target.y - m.y, m.target.x - m.x);
                m.vx += Math.cos(ta) * 3.5 * scale;
                m.vy += Math.sin(ta) * 3.5 * scale;
            }

        } else {
            // 【フェーズ3: 点火・狙い撃ち】（46フレーム以降）
            // ターゲットに向かって急加速
            if (m.target) {
                const ta = Math.atan2(m.target.y - m.y, m.target.x - m.x);
                m.vx += Math.cos(ta) * 6.0 * scale;
                m.vy += Math.sin(ta) * 6.0 * scale;
            } else {
                m.vx *= 1.15;
                m.vy *= 1.15;
            }
        }

        // --- 3. 最高速度の制限 ---
        const s = Math.hypot(m.vx, m.vy);
        if (s > 0.001) {
            let maxSpeed = m.speed;
            
            // ★上限のリミッター期間もフェーズ2の終わり(45F)まで延長
            if (m.age <= 45) {
                maxSpeed = m.speed * 0.6; 
            } else {
                maxSpeed = m.speed * 1.5; 
            }

            if (s > maxSpeed) {
                m.vx = (m.vx / s) * maxSpeed;
                m.vy = (m.vy / s) * maxSpeed;
            }
        }

        // --- 4. 移動と軌跡の記録 ---
        m.x += m.vx * gameSpeed;
        m.y += m.vy * gameSpeed;
        m.life -= gameSpeed;

        if (!m.trail) m.trail = [];
        m.trail.unshift({ x: m.x, y: m.y });
        // 軌跡を少し長め(12フレーム)にすると、よりレーザーらしくなります
        if (m.trail.length > 12) m.trail.pop(); 

        // --- 5. 壁衝突判定 ---
        if (m.x < WALL_MARGIN || m.x > worldSize - WALL_MARGIN ||
            m.y < WALL_MARGIN || m.y > worldSize - WALL_MARGIN) {

            if (typeof createExplosion === 'function') {
                const impactX = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, m.x));
                const impactY = Math.max(WALL_MARGIN, Math.min(worldSize - WALL_MARGIN, m.y));
                createExplosion(impactX, impactY, m.color || '#fff', 10);
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');
            m.life = 0;
            return;
        }

        // --- 6. 敵との衝突判定 ---
        enemies.forEach(e => {
            if (e.hp <= 0) return;
            const hitRadius = (e.type === 'asteroid' ? 25 * e.scale : 30);
            
            const dx = e.x - m.x;
            const dy = e.y - m.y;
            if (dx * dx + dy * dy < hitRadius * hitRadius) {
                e.hp -= 15;
                m.life = 0;
                if (typeof createExplosion === 'function') createExplosion(m.x, m.y, m.color || '#fff', 8);
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('explode_small');
                if (typeof distortGrid === 'function') distortGrid(m.x, m.y, 20, 50);
            }
        });
        
        // （※パーティクルの処理は削除しました）
    });

    // 寿命切れを削除
    missiles = missiles.filter(m => m.life > 0);
}

function updateCrystals() {
    crystals.forEach(c => {
        c.life -= gameSpeed;

        // --- 1. 初速（飛び散り）の適用 ---
        // destroyEnemyで設定された vx, vy があれば使用します
        // 0.95 を掛けることで、飛び散った勢いが徐々に弱まる（摩擦）表現になります
        c.vx = (c.vx || 0) * 0.95;
        c.vy = (c.vy || 0) * 0.95;

        // 初速にも SPEED_SCALE を適用して移動させる
        c.x += c.vx * SPEED_SCALE * gameSpeed;
        c.y += c.vy * SPEED_SCALE * gameSpeed;

        // --- 2. 自機への吸い寄せ（マグネット） ---
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const dist = Math.hypot(dx, dy) || 0.0001;

        // 吸い寄せスピード計算に SPEED_SCALE を適用
        // ベース速度(10.0) + 距離による加速(0.08)
        // これにより、遠くにあるときは高速で、近くでも適度な速さで吸い寄せられます
        const pullSpeed = (10.0 + (dist * 0.08)) * SPEED_SCALE;

        const moveAmount = Math.min(dist, pullSpeed);

        c.x += (dx / dist) * moveAmount;
        c.y += (dy / dist) * moveAmount;

        // --- 3. 回収判定 ---
        if (dist < 30) { // 判定距離（少し広めに30px）
            c.life = 0;

            // 衛星（サテライト）追加ロジック
            if (player.satellites.length < 12) {
                // 初期座標と角度を持たせて push
                player.satellites.push({
                    x: player.x,
                    y: player.y,
                    angle: Math.random() * Math.PI * 2
                });
            }
        }
    });

    // 寿命切れを削除
    crystals = crystals.filter(c => c.life > 0);
}

function updatePowerups() {
    powerups.forEach(p => {
        // --- 1. 消失防止と寿命の更新 ---
        // レベルアップアイテム以外は寿命を減らす
        if (p.type !== 'level') {
            p.life -= gameSpeed;
        }

        // 自機との距離と方向ベクトルを計算
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        // --- 2. レベルアップアイテム専用：吸い寄せロジック ---
        if (p.type === 'level') {
            // 遠くても確実に自機へ向かう（距離に応じた加速）
            const pullSpeed = (2.0 + (dist * 0.04)) * SPEED_SCALE;
            const moveAmount = Math.min(dist, pullSpeed) * gameSpeed;

            p.x += (dx / dist) * moveAmount;
            p.y += (dy / dist) * moveAmount;

            // 飛んでいる間、キラキラしたパーティクルを出す演出
            if (frame % 3 === 0) {
                spawnParticleObj({
                    x: p.x, y: p.y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    color: '#0f8', life: 0.3, size: 1.5
                });
            }
        }

        // --- 3. 回収判定 ---
        if (dist < 30) {
            p.life = 0;
            AudioSys.playSE('powerup');

            if (p.type === 'laser') {
                if (player.hyperTimer > 0) {
                    player.hyperTimer = HYPER_DURATION;
                    player.maxHyperTimer = HYPER_DURATION;
                    if (typeof spawnScorePopupObj === 'function') {
                        spawnScorePopupObj({ x: player.x, y: player.y - 20, text: "OVERDRIVE MAX!", life: 60, alpha: 1, vy: -1.2 });
                    }
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('powerup');
                }
                else {
                    // 通常のレーザー発動
                    player.laserTimer = (typeof LASER_DURATION !== 'undefined') ? LASER_DURATION : 240;
                    spawnRingObj({ x: player.x, y: player.y, r: 10, color: '#0ff', life: 1 });
                    spawnRingObj({ x: player.x, y: player.y, r: 50, color: '#0ff', life: 1 });
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('powerup');
                }
            }
            else if (p.type === 'invincible') {
                player.invuln = INVULN_DURATION;
                AudioSys.playSE('invincible');

                // 取得時の演出：白い大きなリングを表示
                spawnRingObj({ x: player.x, y: player.y, r: 10, color: '#fff', life: 1.0 });
                // グリッドを大きく歪ませる
                distortGrid(player.x, player.y, 150, 300);
            }
            else if (p.type === 'level') {
                if (player.weaponLevel >= MAX_WEAPON_LEVEL) {
                    player.laserTimer = 0; 
                    
                    player.hyperTimer = HYPER_DURATION;
                    player.maxHyperTimer = HYPER_DURATION;
                    
                    if (typeof spawnScorePopupObj === 'function') {
                        spawnScorePopupObj({ x: player.x, y: player.y - 30, text: "OVERDRIVE AWAKENING!", life: 90, alpha: 1, vy: -1.5, isBoss: true });
                    }
                    
                    spawnRingObj({ x: player.x, y: player.y, r: 20, color: '#ff8800', life: 1.5, lineWidth: 8 });
                    spawnRingObj({ x: player.x, y: player.y, r: 80, color: '#ff5500', life: 1.0 });
                    if (typeof distortGrid === 'function') distortGrid(player.x, player.y, 100, 200);
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('powerup');
                    
                }
                else {
                    // 通常のレベルアップ
                    player.weaponLevel = Math.min(MAX_WEAPON_LEVEL, player.weaponLevel + 1);
                    if (typeof spawnScorePopupObj === 'function') {
                        spawnScorePopupObj({ x: player.x, y: player.y - 20, text: "LEVEL UP!", life: 60, alpha: 1, vy: -1.2 });
                    } else {
                        scorePopups.push({ x: player.x, y: player.y - 20, text: "LEVEL UP!", life: 60, alpha: 1, vy: -1.2 });
                    }
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('powerup');
                }
            }
            else if (p.type === 'shield') {
                // 最大値(PLAYER_BASE_SHIELD)を超えないように回復
                player.shield = Math.min(PLAYER_BASE_SHIELD, player.shield + 10);

                // バーの表示更新
                ui.shieldBar.style.width = Math.max(0, player.shield) + "%";
                if (player.shield < 30) ui.shieldBar.classList.add('shield-critical');
                else ui.shieldBar.classList.remove('shield-critical');
                if (ui.shieldVal) ui.shieldVal.innerText = Math.floor(player.shield);

                // ポップアップ表示
                spawnScorePopupObj({
                    x: player.x,
                    y: player.y - 20,
                    text: "SHIELD +10",
                    life: 60, alpha: 1, vy: -1.2
                });
            }
        }
    });
    // 取得済み(life=0)または時間切れのものを削除
    powerups = powerups.filter(p => p.life > 0);
}

function updateScorePopups() {
    // 画面範囲の計算
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;
    const margin = 100; // 画面外のマージン

    const sPool = scorePopupPool.pool; // ★プールを参照
    for (let i = 0; i < sPool.length; i++) {
        const s = sPool[i];
        
        // ★未使用のオブジェクトは計算をスキップ
        if (!s.active) continue;

        s.y += s.vy;
        s.life--;
        s.alpha = s.life / 30;

        // ★寿命切れ、または画面外に出たら非アクティブ化してプールへ返却
        if (s.life <= 0 ||
            s.x < camera.x - margin || s.x > camera.x + viewW + margin ||
            s.y < camera.y - margin || s.y > camera.y + viewH + margin) {
            
            s.active = false;
            s.life = 0;
        }
    }
}