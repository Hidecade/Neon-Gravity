/**
 * PixiJSを使用した背景管理クラス
 * 星（Stars）と星雲（Nebulae）の描画を担当
 */
class PixiBackgroundManager {
    constructor(app) {
        this.app = app;
        this.starContainer = null;
        this.nebulaContainer = null;
        this.stars = [];
        this.nebulae = [];
        
        // 描画範囲の定義 (render_background.js の定数を参照)
        this.LOOP_MARGIN_X = 400;
        this.LOOP_MARGIN_Y = 400;
        
        this.isInitialized = false;
    }

    /**
     * 初期化処理
     */
    init() {
        // 1. 星雲用コンテナ（加算合成を使用するため通常のContainer）
        this.nebulaContainer = new PIXI.Container();
        this.app.stage.addChild(this.nebulaContainer);

        // 2. 星用コンテナ（大量の点を描画するため高速なParticleContainer）
        const maxStars = window.currentStarCount || 1000;
        this.starContainer = new PIXI.ParticleContainer(maxStars, {
            position: true,
            alpha: true,
            scale: true,
            vertices: false,
            tint: false
        });
        this.app.stage.addChild(this.starContainer);

        this.setupStars();
        this.setupNebulae();

        this.isInitialized = true;
    }

    /**
     * 星の生成
     */
    setupStars() {
console.log("Current stars data count:", stars.length); // 0ならデータ生成ミス

        const starGraphic = new PIXI.Graphics();
        starGraphic.beginFill(0xFFFFFF);
        starGraphic.drawCircle(0, 0, 2);
        starGraphic.endFill();
        const starTexture = this.app.renderer.generateTexture(starGraphic);

        // 既存の global stars 配列からデータを移行、または新規生成
        stars.forEach(s => {
            const sprite = new PIXI.Sprite(starTexture);
            sprite.anchor.set(0.5);
            
            // プロパティ設定
            const sizeBoost = s.parallax > 0.8 ? 1.2 : 1.0;
            sprite.scale.set(s.size * 0.4 * sizeBoost); // Pixiのスケールに合わせて調整
            sprite.alpha = s.brightness * 0.8;
            
            this.starContainer.addChild(sprite);
            this.stars.push({
                sprite: sprite,
                baseX: s.x,
                baseY: s.y,
                parallax: s.parallax
            });
        });

        console.log("Pixi stars sprites created:", this.stars.length); // 作成された数を確認
    }

    /**
     * 星雲の生成
     */
    setupNebulae() {
        if (typeof nebulae === 'undefined') return;

        nebulae.forEach(n => {
            // n.image (HTMLImageElement) からテクスチャを作成
            const texture = PIXI.Texture.from(n.image);
            const sprite = new PIXI.Sprite(texture);
            
            sprite.anchor.set(0.5);
            sprite.blendMode = PIXI.BLEND_MODES.ADD; // Canvasの 'lighter' 相当
            
            this.nebulaContainer.addChild(sprite);
            this.nebulae.push({
                sprite: sprite,
                baseX: n.x,
                baseY: n.y,
                parallax: n.parallax
            });
        });
    }

    /**
     * 毎フレームの更新（main.js の loop から呼ばれる想定）
     * @param {number} camX - camera.x
     * @param {number} camY - camera.y
     * @param {number} scrollOffset - introBgScroll
     */
    update(camX, camY, scrollOffset = 0) {
        if (!this.isInitialized) return;

        // イントロ中のカメラ位置偽装ロジックを統合
        const adjustedCamY = camY - scrollOffset;
        
        const loopW = width + this.LOOP_MARGIN_X;
        const loopH = height + this.LOOP_MARGIN_Y;
        const halfMarginX = this.LOOP_MARGIN_X / 2;
        const halfMarginY = this.LOOP_MARGIN_Y / 2;

        // 星の更新
        this.stars.forEach(s => {
            let sx = (s.baseX - camX * s.parallax) % loopW;
            let sy = (s.baseY - adjustedCamY * s.parallax) % loopH;

            if (sx < 0) sx += loopW;
            if (sy < 0) sy += loopH;

            s.sprite.x = sx - halfMarginX;
            s.sprite.y = sy - halfMarginY;
        });

        // 星雲の更新
        this.nebulae.forEach(n => {
            let nx = (n.baseX - camX * n.parallax) % loopW;
            let ny = (n.baseY - adjustedCamY * n.parallax) % loopH;

            if (nx < 0) nx += loopW;
            if (ny < 0) ny += loopH;

            n.sprite.x = nx - halfMarginX;
            n.sprite.y = ny - halfMarginY;
        });
    }

    /**
     * 画面リサイズ時の対応
     */
    resize() {
        // 必要に応じてコンテナのマスクや座標を再計算
    }
}