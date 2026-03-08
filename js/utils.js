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