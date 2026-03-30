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

        this.syncPlayerBullets();
        this.syncEnemyBullets();
        this.syncParticles();
        this.syncRings();
        this.syncLasers();
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
            if (!p.active || p.isShard || p.isBubble) { p.sprite.x = -9999; p.sprite.alpha = 0; return; }
            
            p.sprite.position.set(p.x, p.y);
            
            // 指定色を正確に反映させる（白テクスチャへの乗算）
            p.sprite.tint = PIXI.utils.string2hex(p.color || '#ffffff');
            
            const speed = Math.hypot(p.vx, p.vy);
            p.sprite.rotation = Math.atan2(p.vy, p.vx);
            
            const rw = (p.size || 2) * 6 * scaleFactor + speed * 3;
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
                // リングはサイズや線の太さが個別に変化するため、SpriteではなくGraphicsを使う
                r.sprite = new PIXI.Graphics();
                r.sprite.blendMode = PIXI.BLEND_MODES.ADD;
                // GraphicsはParticleContainerには入れられないため、layerBulletsに入れる
                layerBullets.addChild(r.sprite);
            }
            
            const g = r.sprite;
            g.clear(); // 毎フレーム描画をリセットして書き直す
            
            if (!r.active) { 
                g.visible = false; 
                return; 
            }
            
            g.visible = true;
            g.position.set(r.x, r.y);
            
            const rColorHex = PIXI.utils.string2hex(r.color || '#0ff');

            if (r.isBomb) {
                // =====================================
                // プレイヤーのボム (3層構造)
                // =====================================
                // 1. 半透明の塗りつぶし
                g.beginFill(rColorHex, Math.max(0, r.life * 0.25));
                g.drawCircle(0, 0, r.r * scaleFactor);
                g.endFill();
                
                // 2. 外側の太い枠線（時間経過で細くなる）
                g.lineStyle(20 * r.life * scaleFactor, rColorHex, Math.max(0, r.life * 0.8));
                g.drawCircle(0, 0, r.r * scaleFactor);
                
                // 3. 内側の白い芯（シャープな線）
                g.lineStyle(4 * scaleFactor, 0xFFFFFF, Math.max(0, r.life));
                g.drawCircle(0, 0, r.r * scaleFactor);
                
            } else {
                // =====================================
                // 通常のリング・衝撃波
                // =====================================
                const lw = (r.lineWidth !== undefined ? r.lineWidth : 4) * scaleFactor;
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

                // 2. 発光(グロー)のシミュレート (WebGLにはshadowBlurが無いため、太くて薄い線で代用)
                if (typeof currentGraphicsQuality !== 'undefined' && currentGraphicsQuality === 'HIGH') {
                    g.lineStyle(lw + 15 * sizeFactor, rColorHex, baseAlpha * 0.3);
                    g.drawCircle(0, 0, currentR);
                }

                // 3. メインのカラー枠線
                g.lineStyle(lw, rColorHex, baseAlpha);
                g.drawCircle(0, 0, currentR);

                // 4. 内側の白い芯線
                if (lw > 2) {
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