// =========================================================
// Utility functions (utils.js)
// =========================================================

/**
 * Hexカラーを明るくする関数
 * @param {string} hex - #RRGGBB 形式の色
 * @param {number} percent - 0~100 の数値（大きいほど白に近づく）
 */
function lightenHex(hex, percent) {
    hex = hex.replace(/^#/, '');

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    const ratio = percent / 100;
    r = Math.round(r + (255 - r) * ratio);
    g = Math.round(g + (255 - g) * ratio);
    b = Math.round(b + (255 - b) * ratio);

    const rr = r.toString(16).padStart(2, '0');
    const gg = g.toString(16).padStart(2, '0');
    const bb = b.toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
}

/**
 * 16進数カラーをRGBオブジェクトに変換
 */
function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 255, b: 255 };
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

/**
 * 色から色相(Hue)を取得する
 */
function getHue(color) {
    if (color.startsWith('#')) {
        const rgb = hexToRgb(color);
        const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h;
        if (max === min) h = 0;
        else if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
        else if (max === g) h = (60 * ((b - r) / (max - min)) + 120) % 360;
        else if (max === b) h = (60 * ((r - g) / (max - min)) + 240) % 360;
        return h;
    }
    return 0;
}

// --- 補助関数: n角形のパスを描く ---
function drawPolygonPath(ctx, radius, sides) {
    // 頂点が常に上（Y軸マイナス方向）を向くように角度をオフセット
    const offsetAngle = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
        const theta = (Math.PI * 2 / sides) * i + offsetAngle;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}


function isOnScreen(obj, margin = 50) {
    // 現在のカメラの表示範囲（スケール考慮）
    const viewW = width / cameraScale;
    const viewH = height / cameraScale;

    return (
        obj.x > camera.x - margin &&
        obj.x < camera.x + viewW + margin &&
        obj.y > camera.y - margin &&
        obj.y < camera.y + viewH + margin
    );
}

// =========================================================
// オブジェクトプールシステム (Object Pool)
// =========================================================
class ObjectPool {
    constructor(createFn, initialSize, maxSize = initialSize) {
        this.pool = [];
        this.createFn = createFn;
        this.maxSize = Math.max(initialSize, maxSize);
        this.currentIndex = 0; // ★ 追加：最後にチェックしたインデックス

        for (let i = 0; i < initialSize; i++) {
            const obj = this.createFn();
            obj.active = false;
            this.pool.push(obj);
        }
    }

    get() {
        const len = this.pool.length;
        // currentIndexから探し始める
        for (let i = 0; i < len; i++) {
            // (this.currentIndex + i) を配列長で丸める
            const index = (this.currentIndex + i) % len;
            if (!this.pool[index].active) {
                this.pool[index].active = true;
                this.currentIndex = (index + 1) % len; // 次回は次の要素から探す
                return this.pool[index];
            }
        }

        // 上限に達したら新規確保しない
        if (len >= this.maxSize) {
            return null;
        }

        const newObj = this.createFn();
        newObj.active = true;
        this.pool.push(newObj);
        this.currentIndex = 0; // 追加されたら先頭に戻すなど適宜
        return newObj;
    }

    clearAll() {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].active = false;
        }
    }

    getActiveCount() {
        let count = 0;
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                count++;
            }
        }
        return count;
    }
}