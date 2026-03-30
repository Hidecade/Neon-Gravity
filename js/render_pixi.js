/**
 * PixiJS Rendering Manager (render_pixi.js)
 * 役割: WebGLテクスチャの生成、オブジェクトプールとSpriteの同期
 */

const PixiRender = {
    textures: {},
    
    init(app) {
        this.app = app;
        this.setupLayers();
        this.generateTextures();
    },

    setupLayers() {
        // main.jsのグローバル変数へ直接代入
        layerBg = new PIXI.Container();
        layerEntities = new PIXI.Container();
        layerBullets = new PIXI.Container(); 
        layerParticles = new PIXI.ParticleContainer(4000, { 
            position: true, rotation: true, scale: true, alpha: true, tint: true 
        });
        layerUI = new PIXI.Container();

        this.app.stage.addChild(layerBg, layerEntities, layerBullets, layerParticles, layerUI);
    },

    generateTextures() {
        // --- 1. 敵弾用テクスチャ (Canvasオリジナル版完全再現) ---
        // ① ひし形のベース (Canvasの size=10 相当の比率)
        const dg = new PIXI.Graphics();
        dg.beginFill(0xFFFFFF);
        dg.moveTo(0, -10); dg.lineTo(7, 0); dg.lineTo(0, 10); dg.lineTo(-7, 0);
        dg.endFill();
        this.textures.enemyDiamond = this.app.renderer.generateTexture(dg);

        // ② 中心の点滅コア (Canvasの size*0.5 相当の半径5)
        const cg = new PIXI.Graphics();
        cg.beginFill(0xFFFFFF);
        cg.drawCircle(0, 0, 5);
        cg.endFill();
        this.textures.enemyCore = this.app.renderer.generateTexture(cg);

        // 2. リングエフェクト用
        const rg = new PIXI.Graphics();
        rg.lineStyle(2, 0xFFFFFF); rg.drawCircle(0, 0, 64);
        this.textures.ring = this.app.renderer.generateTexture(rg);

        // 3. レーザー用 (1x1の白ピクセル)
        const lg = new PIXI.Graphics();
        lg.beginFill(0xFFFFFF); lg.drawRect(0, -0.5, 1, 1); lg.endFill();
        this.textures.line = this.app.renderer.generateTexture(lg);

        // 4. 自機弾 (3層グロー)
        this.textures.playerBullet = this.generateGlowLine();
        
        // 5. 花火・パーティクル用 (純白のスピード線グラデーション)
        this.textures.spark = this.generateSparkBase();
    },

    // 自機弾用テクスチャの生成（オリジナルと全く同じ色・太さ・透明度）
    generateGlowLine() {
        const c = document.createElement('canvas');
        // オリジナルの最大の太さ(6px)が収まる高さと、計算しやすい長さ
        c.width = 60; 
        c.height = 12;
        const ctx = c.getContext('2d');
        ctx.lineCap = 'round';
        
        const mid = 6; // 高さの中心
        const startX = 6;
        const endX = 54; // 線の長さは48px分

        // 1. 外側グロー (オリジナル: rgba(0,255,180,0.22), 太さ: 6)
        ctx.strokeStyle = 'rgba(0,255,180,0.22)'; 
        ctx.lineWidth = 6; 
        ctx.beginPath(); ctx.moveTo(startX, mid); ctx.lineTo(endX, mid); ctx.stroke();
        
        // 2. 中間光 (オリジナル: rgba(0,255,180,0.55), 太さ: 3)
        ctx.strokeStyle = 'rgba(0,255,180,0.55)'; 
        ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(startX, mid); ctx.lineTo(endX, mid); ctx.stroke();
        
        // 3. 芯 (オリジナル: #cffff5, 太さ: 1.4)
        ctx.strokeStyle = '#cffff5'; 
        ctx.lineWidth = 1.4; 
        ctx.beginPath(); ctx.moveTo(startX, mid); ctx.lineTo(endX, mid); ctx.stroke();
        
        return PIXI.Texture.from(c);
    },

    // 花火用純白テクスチャの生成（色は実行時にtintで乗算する）
    generateSparkBase() {
        const c = document.createElement('canvas');
        c.width = 40; c.height = 10;
        const ctx = c.getContext('2d');
        const grad = ctx.createLinearGradient(0, 5, 40, 5);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.7, 'rgba(255,255,255,1)');
        grad.addColorStop(1, '#ffffff');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(20, 5, 18, 3, 0, 0, Math.PI * 2); ctx.fill();
        return PIXI.Texture.from(c);
    },

    sync(camera, scale) {
        [layerBg, layerEntities, layerBullets, layerParticles, layerUI].forEach(l => {
            if (l) {
                l.scale.set(scale);
                l.position.set(-camera.x * scale, -camera.y * scale);
            }
        });
        this.syncPlayer();
        this.syncPlayerBullets();
        this.syncEnemyBullets();
        this.syncParticles();
        this.syncRings();
        this.syncLasers();
    },
    // ==========================================
    // 自機システムのPixiJS同期
    // ==========================================
    syncPlayer() {

        const hideStates = [
            'DYING', 'GAMEOVER_UI', 'TITLE', 'HOWTO', 
            'RANKING', 'STORY', 'SETTINGS', 'ENDING', 'ENDING_STORY'
        ];
        
        if (typeof player === 'undefined' || !player || hideStates.includes(gameState)) {
            if (this.playerShip) this.playerShip.visible = false;
            if (this.playerWorld) this.playerWorld.visible = false;
            return;
        }

        if (!this.playerShip) {
            this.playerShip = new PIXI.Graphics();
            this.playerShip.blendMode = PIXI.BLEND_MODES.ADD;
            layerEntities.addChild(this.playerShip);

            this.playerWorld = new PIXI.Graphics();
            this.playerWorld.blendMode = PIXI.BLEND_MODES.ADD;
            layerEntities.addChildAt(this.playerWorld, 0); 
        }

        const vY = player.visualYOffset || 0;
        const currentScale = (player.visualScale !== undefined) ? player.visualScale : 1.0;

        if (currentScale < 0.01) {
            this.playerShip.visible = false;
            this.playerWorld.visible = false;
            return;
        }

        this.playerShip.visible = true;
        this.playerWorld.visible = true;

        const sg = this.playerShip;
        const wg = this.playerWorld;
        sg.clear();
        wg.clear();

        const scaleFactor = typeof G_SCALE !== 'undefined' ? G_SCALE : 0.7;
        const finalScale = scaleFactor * currentScale;

        // --- カラー設定 ---
        let mainHex = 0x00ff88;   
        let accentHex = 0x00ffff; 
        let mainColorStr = '#0f8'; // 煙幕パーティクル用
        let accentColorStr = '#0ff';
        if (player.overdriveTimer > 0) { mainHex = 0xff8800; accentHex = 0xffcc88; mainColorStr = '#ff8800'; accentColorStr = '#ffcc88'; }
        else if (player.invuln > 0)    { mainHex = 0xffff00; accentHex = 0xffffff; mainColorStr = '#ff0'; accentColorStr = '#fff'; }
        else if (player.laserTimer > 0){ mainHex = 0x00ffff; accentHex = 0xffffff; mainColorStr = '#0ff'; accentColorStr = '#fff'; }

        // --- ジェット噴射の推力計算 ---
        const currentMoveMag = Math.hypot(player.vx, player.vy);
        let thrustFactor = 0;
        if (currentMoveMag > 0.1) {
            const dirX = Math.cos(player.angle);
            const dirY = Math.sin(player.angle);
            const moveX = player.vx / currentMoveMag;
            const moveY = player.vy / currentMoveMag;
            const dot = dirX * moveX + dirY * moveY;
            thrustFactor = Math.max(0.2, dot);
        }

        if (typeof gameState !== 'undefined' && gameState === 'STAGE_INTRO' && typeof introPhase !== 'undefined' && introPhase === 3) {
            thrustFactor = 0.8 * currentScale;
        }

        const baseSpd = typeof PLAYER_BASE_SPEED !== 'undefined' ? PLAYER_BASE_SPEED : 12;
        const spdScale = typeof SPEED_SCALE !== 'undefined' ? SPEED_SCALE : 0.25;
        const speedFactor = Math.min(1.0, currentMoveMag / (baseSpd * spdScale * 0.8));
        const finalThrustScale = (typeof gameState !== 'undefined' && gameState === 'STAGE_INTRO') ? thrustFactor : speedFactor * thrustFactor;

        // エメラルドフェニックス状態かどうかの判定
        const isPhoenix = player.weaponLevel >= (typeof MAX_WEAPON_LEVEL !== 'undefined' ? MAX_WEAPON_LEVEL - 1 : 6);
        const isIntro = (typeof introPhase !== 'undefined' && introPhase === 3);
        const currentFrame = typeof frame !== 'undefined' ? frame : 0;

        // ==========================================
        // ★復刻1: フェニックス専用の煙幕パーティクル生成
        // (描画関数内で生成されていた副作用をここに移植)
        // ==========================================
        if (isPhoenix && !isIntro && currentFrame % 2 === 0 && currentScale > 0.5) {
            const pAngle = player.angle + Math.PI + (Math.random() - 0.5);
            const pSpeed = 2 + Math.random() * 4;
            if (typeof spawnParticleObj === 'function') {
                spawnParticleObj({
                    x: player.x,
                    y: player.y + vY,
                    vx: Math.cos(pAngle) * pSpeed,
                    vy: Math.sin(pAngle) * pSpeed,
                    color: Math.random() > 0.5 ? mainColorStr : accentColorStr,
                    life: 1,
                    size: 2 + Math.random() * 2
                });
            }
        }

        // ==========================================
        // ① 機体本体とスラスターの描画 (ローカル座標系)
        // ==========================================
        sg.position.set(player.x, player.y + vY);
        sg.rotation = player.angle;
        sg.scale.set(finalScale);

        // --- 通常スラスターの描画 ---
        if (finalThrustScale > 0.05) {
            let pColorHex = 0x00ffb4; 
            if (player.overdriveTimer > 0) pColorHex = 0xff8800; 
            else if (player.invuln > 0) pColorHex = 0xffe600; 
            else if (player.laserTimer > 0) pColorHex = 0x00ffff; 

            const offsetStart = 8;
            const particleCount = Math.floor(30 * finalThrustScale);

            for (let i = 0; i < particleCount; i++) {
                const ratio = (1 - i / particleCount);
                const dist = offsetStart + (i * 6 * finalThrustScale);
                const alpha = Math.pow(ratio, 1.2) * 0.35;
                const finalSize = 7 - i * 0.2;

                if (finalSize < 0.2) continue;

                sg.beginFill(pColorHex, alpha);
                sg.drawEllipse(-dist, 0, finalSize, finalSize * 0.5);
                sg.endFill();

                if (i < 12 && Math.random() > 0.3) {
                    sg.beginFill(0xffffff, alpha * 0.7);
                    sg.drawCircle(-dist, 0, finalSize * 0.3);
                    sg.endFill();
                }
            }
        }

        // --- 機体ベースライン ---
        const drawShipCore = (graphics, baseLineWidth, baseColor, alphaMult = 1.0, isGlow = false) => {
            if (isPhoenix) {
                // ==========================================
                // ★復刻2: フェニックスの尾羽と翼のアニメーション
                // ==========================================
                const flap = Math.sin(currentFrame * 0.15) * 15;

                // 翼と頭部
                graphics.lineStyle(baseLineWidth, baseColor, alphaMult);
                graphics.moveTo(0, -4); graphics.lineTo(25, 0); graphics.lineTo(0, 4);
                
                for (let side of [-1, 1]) {
                    graphics.moveTo(0, 0);
                    graphics.bezierCurveTo(-10, side * (30 + flap), -40, side * (40 + flap), -20, side * 5);
                }

                // ゆらめく3本の尾羽の描画
                for (let i = 0; i < 3; i++) {
                    const isCenter = (i === 1);
                    const tailOff = Math.sin(currentFrame * 0.2 + i) * 10;
                    
                    // 中央の尾は太く、両端は細く薄くする
                    const tailWidth = isCenter ? baseLineWidth * 1.5 : baseLineWidth * 0.5;
                    const tailAlpha = isCenter ? alphaMult : alphaMult * 0.6;
                    
                    graphics.lineStyle(tailWidth, baseColor, tailAlpha);
                    graphics.moveTo(-10, (i - 1) * 5);
                    graphics.quadraticCurveTo(-40, tailOff, -70, tailOff + (i - 1) * 15);
                }

                // スタイルを元に戻す
                graphics.lineStyle(baseLineWidth, baseColor, alphaMult);

            } else {
                // --- 通常機体 ---
                graphics.lineStyle(baseLineWidth, baseColor, alphaMult);
                graphics.moveTo(20, 0); graphics.lineTo(-10, 10);
                graphics.lineTo(-5, 0); graphics.lineTo(-10, -10); graphics.lineTo(20, 0);
                if (player.weaponLevel >= 1) { graphics.moveTo(-5, 5); graphics.lineTo(-18, 15); graphics.moveTo(-5, -5); graphics.lineTo(-18, -15); }
                if (player.weaponLevel >= 2) { graphics.moveTo(5, 5); graphics.lineTo(-5, 12); graphics.moveTo(5, -5); graphics.lineTo(-5, -12); }
                if (player.weaponLevel >= 3) { graphics.moveTo(10, 3); graphics.lineTo(25, 2); graphics.moveTo(10, -3); graphics.lineTo(25, -2); }
                if (player.weaponLevel >= 4) { graphics.moveTo(-8, 8); graphics.lineTo(-22, 5); graphics.moveTo(-8, -8); graphics.lineTo(-22, -5); }
                if (player.weaponLevel >= 5 && !isGlow) {
                    graphics.lineStyle(1, 0xffffff, 0.6);
                    graphics.moveTo(15, 0); graphics.lineTo(-3, 0);
                }
            }
        };

        if (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'HIGH') {
            drawShipCore(sg, 8, mainHex, 0.3, true);
        }
        drawShipCore(sg, 2, mainHex, 1.0, false);


        // ==========================================
        // ② ワールド座標への描画 (サテライト、バリア、残像)
        // ==========================================
        wg.position.set(0, 0);
        wg.rotation = 0;

        // 機体の残像（Ghost）
        player.history.forEach((pos, i) => {
            if (i === 0) return;
            const alpha = 0.4 * (1 - i / player.history.length);
            this.drawRotatedTriangle(wg, pos.x, pos.y + vY, pos.angle, finalScale, mainHex, alpha);
        });

        // サテライト
        player.satellites.forEach(s => {
            const rot = currentFrame * 0.1;
            const sSize = 4 * finalScale;
            wg.beginFill(0x00ff00, 1.0);
            this.drawRotatedDiamond(wg, s.x, s.y + vY, rot, sSize);
            wg.endFill();
            wg.beginFill(0xffffff, 0.6);
            wg.drawCircle(s.x, s.y + vY, 1.5 * currentScale);
            wg.endFill();
        });

        // 無敵バリア
        if (player.invuln > 0) {
            const bRadius = 45 * scaleFactor;
            let bColor = 0xffff00;
            let bAlpha = 0.4;
            if (player.invuln < 120 && Math.floor(currentFrame / (player.invuln < 60 ? 3 : 6)) % 2 === 0) {
                bColor = 0xff4444; bAlpha = 0.7;
            }
            wg.lineStyle(10, bColor, bAlpha * 0.3);
            wg.drawCircle(player.x, player.y + vY, bRadius);
            wg.lineStyle(2, bColor, bAlpha);
            wg.drawCircle(player.x, player.y + vY, bRadius);
            wg.beginFill(bColor, 0.15);
            wg.drawCircle(player.x, player.y + vY, bRadius);
            wg.endFill();
        }
    },

    // --- 機体や残像を描画するためのヘルパー関数 ---
    drawRotatedTriangle(graphics, cx, cy, angle, scale, color, alpha) {
        graphics.lineStyle(1.5, color, alpha);
        const cos = Math.cos(angle) * scale;
        const sin = Math.sin(angle) * scale;
        
        // ローカル座標 (20,0), (-10,10), (-5,0), (-10,-10)
        const pts = [[20,0], [-10,10], [-5,0], [-10,-10]];
        
        graphics.moveTo(cx + pts[0][0]*cos - pts[0][1]*sin, cy + pts[0][0]*sin + pts[0][1]*cos);
        for(let i=1; i<pts.length; i++) {
            graphics.lineTo(cx + pts[i][0]*cos - pts[i][1]*sin, cy + pts[i][0]*sin + pts[i][1]*cos);
        }
        graphics.lineTo(cx + pts[0][0]*cos - pts[0][1]*sin, cy + pts[0][0]*sin + pts[0][1]*cos);
    },

    drawRotatedDiamond(graphics, cx, cy, angle, size) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const pts = [[0, -size*1.5], [size, 0], [0, size*1.5], [-size, 0]];
        
        graphics.moveTo(cx + pts[0][0]*cos - pts[0][1]*sin, cy + pts[0][0]*sin + pts[0][1]*cos);
        for(let i=1; i<pts.length; i++) {
            graphics.lineTo(cx + pts[i][0]*cos - pts[i][1]*sin, cy + pts[i][0]*sin + pts[i][1]*cos);
        }
        graphics.lineTo(cx + pts[0][0]*cos - pts[0][1]*sin, cy + pts[0][0]*sin + pts[0][1]*cos);
    },

    syncPlayerBullets() {
        playerBulletPool.pool.forEach(b => {
            if (!b.sprite) {
                b.sprite = new PIXI.Graphics();
                // ★ 修正1: 加算合成(ADD)を外し、オリジナルと同じ通常合成(NORMAL)に戻すことで透け・貫通感をなくす
                b.sprite.blendMode = PIXI.BLEND_MODES.NORMAL;
                layerBullets.addChild(b.sprite);
            }
            
            const g = b.sprite;
            g.clear(); // 毎フレーム描画をリセット
            
            if (!b.active) { 
                g.visible = false; 
                return; 
            }
            
            g.visible = true;
            g.position.set(b.x, b.y);
            g.rotation = Math.atan2(b.vy, b.vx);
            
            // 長さの計算
            const maxLife = (typeof BULLET_CONFIG !== 'undefined') ? BULLET_CONFIG.PLAYER.LIFE : 120;
            const lifeRatio = Math.max(0, b.life / maxLife);
            const len = 12 * lifeRatio;
            
            // ★ 修正2: cap: 'ROUND' による丸みのはみ出し（太さの半分=3px）を相殺するため、
            // 描画の開始点を 3px 後ろにずらして敵にめり込まないようにする
            const offset = 3; 

            // 1. 外側グロー (太さ: 6)
            g.lineStyle({ width: 6, color: 0x00ffb4, alpha: 0.22, cap: PIXI.LINE_CAP.ROUND });
            g.moveTo(-offset, 0); g.lineTo(-(len + offset), 0);
            
            // 2. 中間光 (太さ: 3)
            g.lineStyle({ width: 3, color: 0x00ffb4, alpha: 0.55, cap: PIXI.LINE_CAP.ROUND });
            g.moveTo(-offset, 0); g.lineTo(-(len + offset), 0);
            
            // 3. 芯 (太さ: 1.4)
            g.lineStyle({ width: 1.4, color: 0xcffff5, alpha: 1.0, cap: PIXI.LINE_CAP.ROUND });
            g.moveTo(-offset, 0); g.lineTo(-(len + offset), 0);
        });
    },

    syncEnemyBullets() {
        const scaleFactor = typeof G_SCALE !== 'undefined' ? G_SCALE : 1;
        
        enemyBulletPool.pool.forEach(b => {
            // ★ 特殊弾（ミサイルなど）はCanvas側に任せるためWebGLからは隠す
            if (!b.active || b.isMissile || b.isShockwave || b.isLaserMissile || b.isFighter) { 
                if (b.sprite) {
                    b.sprite.x = -9999; 
                    b.sprite.alpha = 0; 
                }
                return; 
            }

            if (!b.sprite) {
                b.sprite = new PIXI.Container();
                
                const diamond = new PIXI.Sprite(this.textures.enemyDiamond);
                diamond.anchor.set(0.5);
                diamond.blendMode = PIXI.BLEND_MODES.ADD;
                
                const core = new PIXI.Sprite(this.textures.enemyCore);
                core.anchor.set(0.5);
                core.blendMode = PIXI.BLEND_MODES.ADD;
                
                b.sprite.addChild(diamond, core);
                layerBullets.addChild(b.sprite);
            }
            
            b.sprite.position.set(b.x, b.y);
            b.sprite.alpha = b.alpha !== undefined ? b.alpha : 1.0;
            
            const s = (b.baseScale || 1.0) * scaleFactor * 0.8;
            b.sprite.scale.set(s, s);

            b.sprite.rotation = (typeof frame !== 'undefined' ? frame : 0) * 0.15;

            const diamondSprite = b.sprite.children[0];
            const coreSprite = b.sprite.children[1];

            // ==========================================
            // ★ オリジナル(render_projectile.js)と完全一致
            // 通常弾は個別の色設定を無視し、常にオレンジ(#ff8800)で固定する
            // ==========================================
            const bulletColor = '#ff8800';
            diamondSprite.tint = PIXI.utils.string2hex(bulletColor);
            
            const currentFrame = typeof frame !== 'undefined' ? frame : 0;
            if (Math.floor(currentFrame / 10) % 2 === 0) {
                coreSprite.tint = PIXI.utils.string2hex('#ff0000'); // 点滅時: 赤
            } else {
                coreSprite.tint = PIXI.utils.string2hex(bulletColor); // 通常時: オレンジ
            }
        });
    },

    syncParticles() {
        const scaleFactor = typeof G_SCALE !== 'undefined' ? G_SCALE : 1;
        particlePool.pool.forEach(p => {
            if (!p.sprite) {
                // 常に純白のグラデーションテクスチャを適用
                p.sprite = new PIXI.Sprite(this.textures.spark);
                p.sprite.anchor.set(1.0, 0.5);
                p.sprite.blendMode = PIXI.BLEND_MODES.ADD;
                layerParticles.addChild(p.sprite);
            }
            
            // 破片や泡は2D Canvasに任せる
            if (!p.active || p.isShard || p.isBubble) { 
                p.sprite.x = -9999; 
                p.sprite.alpha = 0; 
                return; 
            }
            
            p.sprite.position.set(p.x, p.y);
            
            // 指定色を正確に反映させる（白テクスチャへの乗算）
            p.sprite.tint = PIXI.utils.string2hex(p.color || '#ffffff');
            
            const speed = Math.hypot(p.vx, p.vy);
            p.sprite.rotation = Math.atan2(p.vy, p.vx);
            
            // ==========================================
            // ★修正: 速度(speed)による線の引き伸ばしを「3」から「10」へ大幅強化！
            // 初速が速い爆発の瞬間だけグンと線が長くなり、遅くなると点に戻ります。
            // ==========================================
            const rw = (p.size || 2) * 6 * scaleFactor + speed * 7; 
            const rh = (p.size || 2) * 3 * scaleFactor;
            
            p.sprite.scale.set(rw / 40, rh / 10);
            
            let alpha = p.life <= 1.0 ? p.life : p.life / (p.maxLife || 60);
            p.sprite.alpha = Math.pow(Math.max(0, alpha), 0.7);
        });
    },

    syncRings() {
        const scaleFactor = typeof G_SCALE !== 'undefined' ? G_SCALE : 1;
        
        ringPool.pool.forEach(r => {
            if (!r.sprite) {
                r.sprite = new PIXI.Graphics();
                r.sprite.blendMode = PIXI.BLEND_MODES.ADD;
                layerBullets.addChild(r.sprite);
            }
            
            const g = r.sprite;
            g.clear(); 
            
            if (!r.active) { 
                g.visible = false; 
                return; 
            }
            
            g.visible = true;
            g.position.set(r.x, r.y);
            
            const rColorHex = PIXI.utils.string2hex(r.color || '#0ff');

            if (r.isBomb) {
                g.beginFill(rColorHex, Math.max(0, r.life * 0.25));
                g.drawCircle(0, 0, r.r * scaleFactor);
                g.endFill();
                
                g.lineStyle(20 * r.life * scaleFactor, rColorHex, Math.max(0, r.life * 0.8));
                g.drawCircle(0, 0, r.r * scaleFactor);
                
                g.lineStyle(4 * scaleFactor, 0xFFFFFF, Math.max(0, r.life));
                g.drawCircle(0, 0, r.r * scaleFactor);
                
            } else {
                // =====================================
                // 通常のリング・衝撃波
                // =====================================
                const originalLw = r.lineWidth !== undefined ? r.lineWidth : 4;
                const lw = originalLw * scaleFactor;
                const currentR = Math.max(0, r.r * scaleFactor);
                let sizeFactor = 1.0;

                if (r.vr < 0 && !r.isIntroRing) {
                    const progress = Math.max(0, Math.min(1.0, 1.0 - (r.r / 500)));
                    sizeFactor = Math.pow(progress, 3);
                }

                const baseAlpha = Math.min(1.0, r.life) * sizeFactor;

                // 1. 塗りつぶし (fillフラグがある場合)
                if (r.fill) {
                    g.beginFill(rColorHex, baseAlpha * 0.15);
                    g.drawCircle(0, 0, currentR);
                    g.endFill();
                }

                // ★ 1や2の太さでは巨大グローを発動させず、本来の大きなリング(4以上)の時だけ発動させる
                const shouldDrawGlow = !r.noGlow && (originalLw > 2);

                if (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'HIGH' && shouldDrawGlow) {
                    g.lineStyle(lw + 15 * sizeFactor, rColorHex, baseAlpha * 0.3);
                    g.drawCircle(0, 0, currentR);
                }

                // 3. メインのカラー枠線
                g.lineStyle(lw, rColorHex, baseAlpha);
                g.drawCircle(0, 0, currentR);

                // 4. 内側の白い芯線
                if (originalLw > 2) {
                    g.lineStyle(lw * 0.3, 0xFFFFFF, Math.min(1.0, baseAlpha * 1.5));
                    g.drawCircle(0, 0, currentR);
                }
            }
        });
    },

    syncLasers() {
        if (typeof lasers === 'undefined' || !Array.isArray(lasers)) return;
        const scaleFactor = typeof G_SCALE !== 'undefined' ? G_SCALE : 1;
        
        if (!this.laserGraphics) this.laserGraphics = [];
        let gIdx = 0;

        lasers.forEach(l => {
            let g = this.laserGraphics[gIdx];
            if (!g) {
                g = new PIXI.Graphics();
                // ★ 修正: 加算合成(ADD)を外し、通常合成(NORMAL)に変更して透け・貫通感をなくす
                g.blendMode = PIXI.BLEND_MODES.NORMAL;
                layerBullets.addChild(g);
                this.laserGraphics[gIdx] = g;
            }
            
            g.clear();
            g.visible = true;
            g.position.set(l.x, l.y);
            g.rotation = l.angle;

            const isHyper = typeof player !== 'undefined' && player.overdriveTimer > 0;
            const mainColor = isHyper ? 0xff8800 : 0x00ffff;
            const coreColor = isHyper ? 0xffddaa : 0xffffff;
            const hitColor  = isHyper ? 0xffcc88 : 0xffffff;

            const mainLineWidth = (isHyper ? 3.0 : 1.5) * scaleFactor;
            const coreLineWidth = (isHyper ? 2.0 : 1.0) * scaleFactor;

            // 当たり判定システム側で計算された着弾点までの長さ (renderLen) を使用
            const len = l.renderLen || 2000;
            const segments = 20;
            const segLen = len / segments;
            const jitter = 15 * (l.life / 5) * (isHyper ? 1.5 : 1.0) * scaleFactor;

            // 1. レーザーの外側の光 (少し透明)
            if (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'HIGH') {
                g.lineStyle(mainLineWidth + 10 * scaleFactor, mainColor, 0.3);
                g.moveTo(0, 0);
                for (let i = 1; i <= segments; i++) {
                    const px = i * segLen;
                    const py = (Math.random() - 0.5) * jitter * 2;
                    g.lineTo(px, py);
                }
            }

            // 2. レーザーのメインの線 (不透明)
            g.lineStyle(mainLineWidth, mainColor, 1.0);
            g.moveTo(0, 0);
            for (let i = 1; i <= segments; i++) {
                const px = i * segLen;
                const py = (Math.random() - 0.5) * jitter * 2;
                g.lineTo(px, py);
            }

            // 3. レーザーの芯の線
            if (Math.random() > 0.2) {
                g.lineStyle(coreLineWidth, coreColor, 1.0);
                g.moveTo(0, 0);
                g.lineTo(len, (Math.random() - 0.5) * 5 * scaleFactor);
            }

            // 4. 着弾点の爆発エフェクト
            // (画面端の2000まで到達していない = 何かに当たっている場合)
            if (len < 1900) {
                const hitSize = ((isHyper ? 15 : 10) + Math.random() * 10) * scaleFactor;
                g.lineStyle(0);
                if (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'HIGH') {
                    g.beginFill(hitColor, 0.3);
                    g.drawCircle(len, 0, hitSize * 1.8);
                    g.endFill();
                }
                g.beginFill(hitColor, 1.0);
                g.drawCircle(len, 0, hitSize);
                g.endFill();
            }

            gIdx++;
        });

        for (let j = gIdx; j < this.laserGraphics.length; j++) {
            this.laserGraphics[j].clear();
            this.laserGraphics[j].visible = false;
        }
    }
};