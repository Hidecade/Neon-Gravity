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
        // --- 1. 敵弾用 ---
        const dg = new PIXI.Graphics();
        dg.beginFill(0xFFFFFF);
        dg.moveTo(0, -10); dg.lineTo(7, 0); dg.lineTo(0, 10); dg.lineTo(-7, 0);
        dg.endFill();
        this.textures.enemyDiamond = this.app.renderer.generateTexture(dg);

        const cg = new PIXI.Graphics();
        cg.beginFill(0xFFFFFF); cg.drawCircle(0, 0, 5); cg.endFill();
        this.textures.enemyCore = this.app.renderer.generateTexture(cg);

        // --- 2. 汎用ライン用 (1x1の白ピクセル) ★これを引き伸ばしてレーザーにする ---
        const lg = new PIXI.Graphics();
        lg.beginFill(0xFFFFFF); lg.drawRect(0, 0, 1, 1); lg.endFill();
        this.textures.line = this.app.renderer.generateTexture(lg);

        // --- 3. その他 ---
        this.textures.playerBullet = this.generateGlowLine();
        this.textures.spark = this.generateSparkBase();
        
        // リング系
        const rg = new PIXI.Graphics();
        rg.lineStyle(2, 0xFFFFFF); rg.drawCircle(0, 0, 64);
        this.textures.ring = this.app.renderer.generateTexture(rg);
        const rgf = new PIXI.Graphics();
        rgf.beginFill(0xFFFFFF); rgf.drawCircle(0, 0, 64); rgf.endFill();
        this.textures.ringFilled = this.app.renderer.generateTexture(rgf);
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

        this.syncPlayerBullets();
        this.syncEnemyBullets();
        this.syncParticles();
        this.syncRings();
         
        this.syncEnemyProjectiles(scale); // 敵レーザー (Sprite版)
    },

    syncPlayerBullets() {
        playerBulletPool.pool.forEach(b => {
            if (!b.sprite) {
                b.sprite = new PIXI.Sprite(this.textures.playerBullet);
                
                // Canvas版は座標(b.x, b.y)から線を描画し、先端に丸み(約3px)がはみ出します。
                // アンカーを 0.85 付近にすることで、Canvas版の先端位置と完全に一致します。
                b.sprite.anchor.set(0.85, 0.5);
                b.sprite.blendMode = PIXI.BLEND_MODES.NORMAL;
                
                layerBullets.addChild(b.sprite);
            }
            
            const s = b.sprite;
            
            if (!b.active) { 
                s.visible = false; 
                return; 
            }
            
            s.visible = true;
            s.position.set(b.x, b.y);
            s.rotation = Math.atan2(b.vy, b.vx);
            
            // =====================================
            // ★ Canvas版と全く同じ長さを計算して適用
            // =====================================
            const maxLife = (typeof BULLET_CONFIG !== 'undefined') ? BULLET_CONFIG.PLAYER.LIFE : 120;
            const lifeRatio = Math.max(0, b.life / maxLife);
            
            // Canvas版の線の長さ(最大12) + 線の丸み部分(約6)
            const canvasLen = (12 * lifeRatio) + 6;
            
            // スケール(scale.x)ではなく、幅(width)を直接Canvasのピクセル数に合わせる
            s.width = canvasLen;
            s.scale.y = 1.0; // 高さはそのまま
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
                r.sprite = new PIXI.Container();
                
                const fillSprite = new PIXI.Sprite(this.textures.ringFilled);
                fillSprite.anchor.set(0.5);
                fillSprite.blendMode = PIXI.BLEND_MODES.ADD;
                
                const lineSprite = new PIXI.Sprite(this.textures.ring);
                lineSprite.anchor.set(0.5);
                lineSprite.blendMode = PIXI.BLEND_MODES.ADD;

                const coreSprite = new PIXI.Sprite(this.textures.ring);
                coreSprite.anchor.set(0.5);
                coreSprite.blendMode = PIXI.BLEND_MODES.ADD;

                r.sprite.addChild(fillSprite, lineSprite, coreSprite);
                layerBullets.addChild(r.sprite);
            }
            
            const container = r.sprite;
            const fillSprite = container.children[0];
            const lineSprite = container.children[1];
            const coreSprite = container.children[2];
            
            if (!r.active) { 
                container.visible = false; 
                return; 
            }
            
            // =====================================
            // ★修正: ボムの場合はCanvasで描画するため、PixiJS(WebGL)では非表示にしてスキップ
            // =====================================
            if (r.isBomb) {
                container.visible = false;
                return;
            }

            container.visible = true;
            container.position.set(r.x, r.y);
            
            const rColorHex = PIXI.utils.string2hex(r.color || '#0ff');
            const currentR = Math.max(0.1, r.r * scaleFactor);
            container.scale.set(currentR / 64);

            // =====================================
            // 通常のリング・衝撃波（ボムのコードは削除してスッキリ）
            // =====================================
            const originalLw = r.lineWidth !== undefined ? r.lineWidth : 4;
            let sizeFactor = 1.0;

            if (r.vr < 0 && !r.isIntroRing) {
                const progress = Math.max(0, Math.min(1.0, 1.0 - (r.r / 500)));
                sizeFactor = Math.pow(progress, 3);
            }

            const baseAlpha = Math.min(1.0, r.life) * sizeFactor;

            if (r.fill) {
                fillSprite.visible = true;
                fillSprite.tint = rColorHex;
                fillSprite.alpha = baseAlpha * 0.15;
            } else {
                fillSprite.visible = false;
            }

            lineSprite.visible = true;
            lineSprite.tint = rColorHex;
            lineSprite.alpha = baseAlpha;

            if (originalLw > 2) {
                coreSprite.visible = true;
                coreSprite.tint = 0xFFFFFF;
                coreSprite.alpha = Math.min(1.0, baseAlpha * 1.5);
                coreSprite.scale.set(0.95);
            } else {
                coreSprite.visible = false;
            }
        });
    },
    
  // ★修正: 敵の直線レーザー (LaserMissile) を2層スプライトで同期
    syncEnemyProjectiles(scaleFactor) {
        enemyBulletPool.pool.forEach(eb => {
            if (!eb.active || !eb.isLaserMissile) {
                if (eb.laserContainer) eb.laserContainer.visible = false;
                return;
            }

            // 初回生成: 外光と芯の2層構造を作成
            if (!eb.laserContainer) {
                eb.laserContainer = new PIXI.Container();
                
                // 層1: 外側のグロー (加算合成)
                eb.glowSprite = new PIXI.Sprite(this.textures.line);
                eb.glowSprite.anchor.set(0.5, 0.5);
                eb.glowSprite.blendMode = PIXI.BLEND_MODES.ADD;
                
                // 層2: 中心の芯 (通常合成)
                eb.coreSprite = new PIXI.Sprite(this.textures.line);
                eb.coreSprite.anchor.set(0.5, 0.5);
                eb.coreSprite.blendMode = PIXI.BLEND_MODES.NORMAL;

                eb.laserContainer.addChild(eb.glowSprite, eb.coreSprite);
                layerBullets.addChild(eb.laserContainer);
            }

            const container = eb.laserContainer;
            container.visible = true;
            container.position.set(eb.x, eb.y);
            container.rotation = Math.atan2(eb.vy, eb.vx);

            const len = 40 * scaleFactor;
            const baseAlpha = eb.alpha !== undefined ? eb.alpha : 1.0;

            // ==========================================
            // ★修正: 外光と芯の height (太さ) を小さくする
            // ==========================================
            // 外光の設定 (元は 8 だったものを 5 くらいに細く)
            eb.glowSprite.width = len;
            eb.glowSprite.height = 5 * scaleFactor; 
            eb.glowSprite.tint = PIXI.utils.string2hex(eb.color || '#0ff');
            eb.glowSprite.alpha = 0.4 * baseAlpha;

            // 芯の設定 (元は 2 だったものを 1.2〜1.5 くらいに細く)
            eb.coreSprite.width = len;
            eb.coreSprite.height = 1.2 * scaleFactor;
            eb.coreSprite.tint = 0xFFFFFF;
            eb.coreSprite.alpha = 0.8 * baseAlpha;
        });
    },
};