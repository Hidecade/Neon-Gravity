// =========================================================
// テクスチャ管理・生成システム (textures.js)
// =========================================================

// ---------------------------------------------------------
// 1. アイテム用テクスチャ
// ---------------------------------------------------------
const ItemTextures = {};

function createNeonItemTexture(char, color, baseGlow, shape) {
    const texScale = 3.0; 

    const logicalRadius = 16;
    const logicalPadding = Math.max(baseGlow * 2, 10); 
    const logicalSize = (logicalRadius + logicalPadding) * 2;
    const logicalCx = logicalSize / 2;
    const logicalCy = logicalSize / 2;

    const canvasSize = logicalSize * texScale;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;

    // --- 枠のテクスチャ ---
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = canvasSize; frameCanvas.height = canvasSize;
    const fCtx = frameCanvas.getContext('2d');
    
    const drawFrameShape = () => {
        if (shape === 'circle') {
            fCtx.beginPath();
            fCtx.arc(cx, cy, 10 * texScale, 0, Math.PI * 2);
            fCtx.stroke();
        } else if (shape === 'rect') {
            fCtx.strokeRect(cx - 8 * texScale, cy - 8 * texScale, 16 * texScale, 16 * texScale);
        } else if (shape === 'crystal') {
            fCtx.beginPath();
            fCtx.moveTo(cx, cy - 6 * texScale); fCtx.lineTo(cx + 4 * texScale, cy);
            fCtx.lineTo(cx, cy + 6 * texScale); fCtx.lineTo(cx - 4 * texScale, cy);
            fCtx.fill();
        }
    };

    if (baseGlow > 0) {
        fCtx.shadowBlur = baseGlow * texScale;
        fCtx.shadowColor = shape === 'crystal' ? '#0f0' : color; 
        fCtx.strokeStyle = color;
        fCtx.fillStyle = color;
        fCtx.lineWidth = (shape === 'circle' ? 1.5 : 2) * texScale; 
        drawFrameShape(); 
    } else {
        fCtx.strokeStyle = color;
        fCtx.fillStyle = color;
        fCtx.lineWidth = (shape === 'circle' ? 1.5 : 2) * texScale;
        drawFrameShape();
    }

    // --- 文字のテクスチャ ---
    let textCanvas = null;
    if (char) {
        textCanvas = document.createElement('canvas');
        textCanvas.width = canvasSize; textCanvas.height = canvasSize;
        const tCtx = textCanvas.getContext('2d');
        
        tCtx.font = `bold ${12 * texScale}px monospace`;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';

        if (baseGlow > 0) {
            tCtx.shadowBlur = baseGlow * texScale;
            tCtx.shadowColor = color;
            tCtx.fillStyle = color;
            tCtx.fillText(char, cx, cy);
        } else {
            tCtx.fillStyle = color;
            tCtx.fillText(char, cx, cy);
        }
    }

    return { frameCanvas, textCanvas, logicalSize, logicalCx, logicalCy };
}

function initItemTextures() {
    const quality = typeof currentGraphicsQuality !== 'undefined' ? currentGraphicsQuality : 'HIGH';
    
    let baseGlow = 0;
    if (quality === 'ULTRA') baseGlow = 25;   
    else if (quality === 'HIGH') baseGlow = 18;
    else if (quality === 'MEDIUM') baseGlow = 10;
    else baseGlow = 0;

    ItemTextures['point'] = createNeonItemTexture('P', '#ffc000', baseGlow, 'circle');
    ItemTextures['level'] = createNeonItemTexture('W', '#00ff88', baseGlow, 'rect');
    ItemTextures['laser'] = createNeonItemTexture('L', '#00ffff', baseGlow, 'rect');
    ItemTextures['shield'] = createNeonItemTexture('S', '#00ff88', baseGlow, 'rect');
    ItemTextures['invincible'] = createNeonItemTexture('I', '#ff0', baseGlow, 'rect');
    ItemTextures['crystal'] = createNeonItemTexture(null, '#008000', baseGlow * 0.6, 'crystal');
    
    ItemTextures._lastQuality = quality;
}



// ---------------------------------------------------------
// 2. アステロイド（岩）用テクスチャ (textures.js)
// ---------------------------------------------------------
const AsteroidTextures = {};

// 引数に asteroidScale（大きさ）を追加
function getAsteroidTexture(color, typeId, asteroidScale = 1.0) {
    // キャッシュキーにスケールも含める
    const key = `${color}_${typeId}_${asteroidScale}`;
    if (AsteroidTextures[key]) return AsteroidTextures[key];

    const texScale = 3.0;
    
    // 岩の大きさに応じてキャンバスサイズを広げる
    const logicalSize = 80 * asteroidScale; 
    const canvasSize = logicalSize * texScale;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize; canvas.height = canvasSize;
    const fCtx = canvas.getContext('2d');

    // ★ 外郭の頂点情報を保存（内部ディテールで使うため）
    const outerVertices = [];

    fCtx.beginPath();
    for (let i = 0; i < 8; i++) {
        // 半径に asteroidScale を掛けて大きくする
        const r = 22 * asteroidScale * (0.8 + Math.sin(i * 2.1 + typeId * 5) * 0.25) * texScale;
        const ang = (Math.PI * 2 / 8) * i;
        const vx = cx + Math.cos(ang) * r;
        const vy = cy + Math.sin(ang) * r;
        if (i === 0) fCtx.moveTo(vx, vy);
        else fCtx.lineTo(vx, vy);
        outerVertices.push({x: vx, y: vy}); // 頂点を保存
    }
    fCtx.closePath();

    // グラデーション（ネオンのエネルギー）
    const grad = fCtx.createRadialGradient(cx, cy, 0, cx, cy, 25 * asteroidScale * texScale);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    fCtx.fillStyle = grad;
    fCtx.globalAlpha = 0.15; // うっすら
    fCtx.fill();

    // 拡散（グロー）
    fCtx.strokeStyle = color;
    fCtx.globalAlpha = 0.25;
    fCtx.lineWidth = 3 * texScale; // 太さは一定
    fCtx.stroke();

    // 芯の線（シャープ）
    fCtx.globalAlpha = 1.0;
    fCtx.lineWidth = 1.5 * texScale; // 太さは一定
    fCtx.stroke();

    // =========================================================
    // ★ 修正：内部ディテール（シンプルに数本の線のみ）
    // =========================================================
    
    fCtx.strokeStyle = color;
    fCtx.globalAlpha = 0.4; // くっきり見える濃さ
    fCtx.lineWidth = 1.5 * texScale; 
    fCtx.lineJoin = 'round';

    const getRand = (seed) => {
        const x = Math.sin(seed * 12.9898) * 43758.5453;
        return x - Math.floor(x);
    };

    // ギザギザ線を引く関数（complexity=1 で控えめなギザギザに）
    const drawCraggyLine = (p1, p2) => {
        fCtx.beginPath();
        fCtx.moveTo(p1.x, p1.y);
        
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / dist; 
        const ny = dx / dist;
        
        // 少しだけ中央をずらす
        const offset = (getRand(typeId * 100) - 0.5) * 8 * asteroidScale * texScale;
        
        fCtx.lineTo(midX + nx * offset, midY + ny * offset);
        fCtx.lineTo(p2.x, p2.y);
        fCtx.stroke();
    };

    // --- シンプルに2〜3本のひび割れだけを描く ---
    const numLines = 2 + Math.floor(getRand(typeId * 5) * 2); // 2本か3本
    
    for (let i = 0; i < numLines; i++) {
        // 外郭の頂点を選ぶ
        const startIdx = Math.floor(getRand(typeId * 10 + i) * outerVertices.length);
        const startP = outerVertices[startIdx];
        
        let endP;
        // 半分の確率で中心へ、半分の確率で向かい側の頂点へ線を引く
        if (getRand(typeId * 20 + i) > 0.5) {
            // 中心付近へ
            const endX = cx + (getRand(typeId * 30 + i) - 0.5) * 20 * asteroidScale * texScale;
            const endY = cy + (getRand(typeId * 40 + i) - 0.5) * 20 * asteroidScale * texScale;
            endP = { x: endX, y: endY };
        } else {
            // 向かい側（または少しずれた）頂点へ
            const targetIdx = (startIdx + 3 + Math.floor(getRand(typeId * 50 + i) * 3)) % outerVertices.length;
            endP = outerVertices[targetIdx];
        }
        
        drawCraggyLine(startP, endP);
    }

    const texture = { canvas, logicalSize, cx: logicalSize / 2, cy: logicalSize / 2 };
    AsteroidTextures[key] = texture;

    return texture;
}