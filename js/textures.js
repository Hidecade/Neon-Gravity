// =========================================================
// テクスチャ管理・生成システム (textures.js)
// 役割: ゲーム内で使用する各種Canvasテクスチャの生成とキャッシュ管理
// =========================================================

// ---------------------------------------------------------
// 1. アイテム用テクスチャ
// ---------------------------------------------------------
const ItemTextures = {};

/**
 * ネオンアイテムのテクスチャ（枠と文字）を生成する
 * @param {string|null} char - 表示する文字（'P', 'W', 'L'など）。nullの場合は文字なし。
 * @param {string} color - ネオンのベースカラー
 * @param {number} baseGlow - グロー（光彩）の強さ
 * @param {string} shape - 枠の形状 ('circle', 'rect', 'crystal')
 * @returns {Object} 生成されたテクスチャ情報（frameCanvas, textCanvas, サイズ等）
 */
function createNeonItemTexture(char, color, baseGlow, shape) {
    const texScale = 3.0; // 高解像度描画用のスケール（Retinaディスプレイ等でも綺麗に見せるため）

    const logicalRadius = 16;
    const logicalPadding = Math.max(baseGlow * 2, 10); 
    const logicalSize = (logicalRadius + logicalPadding) * 2;
    const logicalCx = logicalSize / 2;
    const logicalCy = logicalSize / 2;

    const canvasSize = logicalSize * texScale;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;

    // --- 枠（フレーム）のテクスチャ生成 ---
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = canvasSize; 
    frameCanvas.height = canvasSize;
    const fCtx = frameCanvas.getContext('2d');
    
    // 形状に応じたパスを描画するヘルパー関数
    const drawFrameShape = () => {
        if (shape === 'circle') {
            fCtx.beginPath();
            fCtx.arc(cx, cy, 10 * texScale, 0, Math.PI * 2);
            fCtx.stroke();
        } else if (shape === 'rect') {
            fCtx.strokeRect(cx - 8 * texScale, cy - 8 * texScale, 16 * texScale, 16 * texScale);
        } else if (shape === 'crystal') {
            fCtx.beginPath();
            fCtx.moveTo(cx, cy - 6 * texScale); 
            fCtx.lineTo(cx + 4 * texScale, cy);
            fCtx.lineTo(cx, cy + 6 * texScale); 
            fCtx.lineTo(cx - 4 * texScale, cy);
            fCtx.fill(); // クリスタル型は塗りつぶし
        }
    };

    // グロー（発光）設定がある場合
    if (baseGlow > 0) {
        fCtx.shadowBlur = baseGlow * texScale;
        fCtx.shadowColor = shape === 'crystal' ? '#0f0' : color; // クリスタルは緑色の光
        fCtx.strokeStyle = color;
        fCtx.fillStyle = color;
        fCtx.lineWidth = (shape === 'circle' ? 1.5 : 2) * texScale; 
        drawFrameShape(); 
    } else {
        // グローなしの場合（軽量描画）
        fCtx.strokeStyle = color;
        fCtx.fillStyle = color;
        fCtx.lineWidth = (shape === 'circle' ? 1.5 : 2) * texScale;
        drawFrameShape();
    }

    // --- 文字（ラベル）のテクスチャ生成 ---
    let textCanvas = null;
    if (char) {
        textCanvas = document.createElement('canvas');
        textCanvas.width = canvasSize; 
        textCanvas.height = canvasSize;
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

/**
 * ゲーム開始時や画質変更時にアイテムテクスチャを一括初期化する
 */
function initItemTextures() {
    const quality = typeof currentGraphicsQuality !== 'undefined' ? currentGraphicsQuality : 'HIGH';
    
    // 画質設定に応じたグロー強さの決定
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
    ItemTextures['crystal'] = createNeonItemTexture(null, '#00d000', baseGlow * 0.6, 'crystal');
    
    ItemTextures._lastQuality = quality;
}

// ---------------------------------------------------------
// 2. アステロイド（岩）用テクスチャ (textures.js)
// ---------------------------------------------------------
const AsteroidTextures = {};
let asteroidCacheCount = 0; // ★ キャッシュ上限を管理するカウンター（iOSメモリリーク対策）

/**
 * アステロイドのテクスチャを取得（なければ生成）する
 * @param {string} color - ネオンの色
 * @param {number} typeId - 形状パターンのシード値（ID）
 * @param {number} asteroidScale - 大きさの倍率（デフォルトは1.0）
 * @returns {Object} 生成された岩のテクスチャ情報
 */
function getAsteroidTexture(color, typeId, asteroidScale = 1.0) {
    // ==========================================
    // ★ 形状のバリエーションを5種類に制限し、Canvasを使い回す
    // （typeIdに連番のspawnIdが渡されてもキャッシュが無限に増えないように安全化）
    // ==========================================
    const patternId = (typeof typeId === 'number') ? typeId % 5 : 0;
    
    // ★ スケールの微小なブレで別の画像が作られるのを防ぐ（小数点第1位で丸める）
    const roundedScale = Math.round(asteroidScale * 10) / 10;
    
    // キャッシュキーを安全な値で生成
    const key = `${color}_${patternId}_${roundedScale}`;
    if (AsteroidTextures[key]) return AsteroidTextures[key];

    // ==========================================
    // ★ iOSクラッシュ対策（増えすぎた場合はメモリ強制解放）
    // ==========================================
    if (asteroidCacheCount > 50) {
        for (let k in AsteroidTextures) {
            if (AsteroidTextures[k] && AsteroidTextures[k].canvas) {
                // widthとheightを1に潰すことで、Safari(iOS)にGPUメモリを即座に破棄させる
                AsteroidTextures[k].canvas.width = 1;
                AsteroidTextures[k].canvas.height = 1; 
            }
            delete AsteroidTextures[k];
        }
        asteroidCacheCount = 0;
        console.log("[TEXTURE] Asteroid cache cleared to prevent memory leak");
    }

    const texScale = 3.0;
    
    // 岩の大きさに応じてキャンバスサイズを計算
    const logicalSize = 80 * roundedScale; 
    const canvasSize = logicalSize * texScale;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasSize; 
    canvas.height = canvasSize;
    const fCtx = canvas.getContext('2d');

    // ★ 外郭の頂点情報を保存（内部のひび割れディテールを描くため）
    const outerVertices = [];

    fCtx.beginPath();
    // 8角形をベースに凹凸をつける
    for (let i = 0; i < 8; i++) {
        // 半径の計算に patternId と roundedScale を使用して形状を決定
        const r = 22 * roundedScale * (0.8 + Math.sin(i * 2.1 + patternId * 5) * 0.25) * texScale;
        const ang = (Math.PI * 2 / 8) * i;
        const vx = cx + Math.cos(ang) * r;
        const vy = cy + Math.sin(ang) * r;
        if (i === 0) fCtx.moveTo(vx, vy);
        else fCtx.lineTo(vx, vy);
        outerVertices.push({x: vx, y: vy}); // 頂点を保存
    }
    fCtx.closePath();
    /*
    // ==========================================
    // ★ 復元: 内部のグラデーション（ネオンのエネルギー）
    // ==========================================
    const grad = fCtx.createRadialGradient(cx, cy, 0, cx, cy, 25 * roundedScale * texScale);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    fCtx.fillStyle = grad;
    fCtx.globalAlpha = 0.15; 
    fCtx.fill();
    // ==========================================
    */
    // 拡散光（グローエフェクト）
    fCtx.strokeStyle = color;
    fCtx.globalAlpha = 0.25;
    fCtx.lineWidth = 3 * texScale; 
    fCtx.stroke();

    // 芯の線（シャープなメインライン）
    fCtx.globalAlpha = 1.0;
    fCtx.lineWidth = 1.5 * texScale; 
    fCtx.stroke();

    // --- 内部ディテール（ひび割れ線） ---
    fCtx.strokeStyle = color;
    fCtx.globalAlpha = 0.4; 
    fCtx.lineWidth = 1.5 * texScale; 
    fCtx.lineJoin = 'round';

    // 簡易的な乱数生成関数
    const getRand = (seed) => {
        const x = Math.sin(seed * 12.9898) * 43758.5453;
        return x - Math.floor(x);
    };

    // 少しギザギザした線を引く関数
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
        
        // オフセット計算に patternId と roundedScale を使用
        const offset = (getRand(patternId * 100) - 0.5) * 8 * roundedScale * texScale;
        
        fCtx.lineTo(midX + nx * offset, midY + ny * offset);
        fCtx.lineTo(p2.x, p2.y);
        fCtx.stroke();
    };

    // ひび割れを 2〜3本描画する
    const numLines = 2 + Math.floor(getRand(patternId * 5) * 2); 
    
    for (let i = 0; i < numLines; i++) {
        // 外郭の頂点からランダムにスタート地点を選ぶ
        const startIdx = Math.floor(getRand(patternId * 10 + i) * outerVertices.length);
        const startP = outerVertices[startIdx];
        
        let endP;
        // 50%の確率で岩の中心付近へ、残り50%で向かい側の頂点へ線を引く
        if (getRand(patternId * 20 + i) > 0.5) {
            const endX = cx + (getRand(patternId * 30 + i) - 0.5) * 20 * roundedScale * texScale;
            const endY = cy + (getRand(patternId * 40 + i) - 0.5) * 20 * roundedScale * texScale;
            endP = { x: endX, y: endY };
        } else {
            const targetIdx = (startIdx + 3 + Math.floor(getRand(patternId * 50 + i) * 3)) % outerVertices.length;
            endP = outerVertices[targetIdx];
        }
        
        drawCraggyLine(startP, endP);
    }

    const texture = { canvas, logicalSize, cx: logicalSize / 2, cy: logicalSize / 2 };
    AsteroidTextures[key] = texture;
    
    // ★ キャッシュカウンターを増やす
    asteroidCacheCount++;

    return texture;
}

// ---------------------------------------------------------
// 3. 各種プロジェクタイル（弾）と背景オブジェクトのテクスチャ
// ---------------------------------------------------------

let playerBulletTexture = null; // ★ 自機弾の画像キャッシュ

/**
 * 自機弾（レーザー風）のテクスチャを生成・取得する
 * @returns {HTMLCanvasElement} 自機弾のテクスチャ
 */
function getPlayerBulletTexture() {
    if (playerBulletTexture) return playerBulletTexture;

    const offscreen = document.createElement('canvas');
    offscreen.width = 60;  // 弾の最大の長さ
    offscreen.height = 16; // 弾の太さ（余白含む）
    const oCtx = offscreen.getContext('2d');

    const centerY = offscreen.height / 2;

    oCtx.lineCap = 'round';
    oCtx.lineJoin = 'round';

    // 1. 外側グロー（ぼんやりした光）
    oCtx.strokeStyle = 'rgba(0,255,180,0.22)';
    oCtx.lineWidth = 6;
    oCtx.beginPath(); 
    oCtx.moveTo(4, centerY); 
    oCtx.lineTo(56, centerY); 
    oCtx.stroke();

    // 2. 中間光（少し明るい部分）
    oCtx.strokeStyle = 'rgba(0,255,180,0.55)';
    oCtx.lineWidth = 4;
    oCtx.beginPath(); 
    oCtx.moveTo(4, centerY); 
    oCtx.lineTo(56, centerY); 
    oCtx.stroke();

    // 3. 芯（最も明るい中心部分）
    oCtx.strokeStyle = '#cffff5';
    oCtx.lineWidth = 1.4;
    oCtx.beginPath(); 
    oCtx.moveTo(4, centerY); 
    oCtx.lineTo(56, centerY); 
    oCtx.stroke();

    playerBulletTexture = offscreen;
    return offscreen;
}

let enemyBulletTextures = null; // ★ 敵通常弾の画像キャッシュ (デザイン修正版)

/**
 * 敵通常弾（ひし形）のテクスチャを生成・取得する
 * @returns {HTMLCanvasElement[]} テクスチャ配列（色違い2種）
 */
function getEnemyBulletTextures() {
    if (enemyBulletTextures) return enemyBulletTextures;

    enemyBulletTextures = [];
    
    // 元のコードの size = 8 に相当する基本サイズ
    const baseSize = 8; 
    // 回転しても絶対に見切れないように大きめのキャンバスにする (8 × 4 = 32px)
    const canvasSize = baseSize * 4; 
    const center = canvasSize / 2;

    const centerColors = ['#ff0000', '#ff8800']; 

    // 色違いを2パターン生成して配列に保存
    for (let i = 0; i < 2; i++) {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvasSize;
        offscreen.height = canvasSize;
        const oCtx = offscreen.getContext('2d');

        // 1. ベースのひし形を描画（元の比率を完全再現）
        oCtx.fillStyle = '#ff8800';
        oCtx.beginPath();
        oCtx.moveTo(center, center - baseSize);
        oCtx.lineTo(center + baseSize * 0.7, center); // 横幅は0.7倍
        oCtx.lineTo(center, center + baseSize);
        oCtx.lineTo(center - baseSize * 0.7, center);
        oCtx.closePath();
        oCtx.fill();

        // 2. 中心の円（コア）を描画
        oCtx.fillStyle = centerColors[i];
        oCtx.beginPath();
        oCtx.arc(center, center, baseSize * 0.5, 0, Math.PI * 2);
        oCtx.fill();

        enemyBulletTextures.push(offscreen);
    }

    return enemyBulletTextures;
}

const laserMissileTextureCache = {}; // ★ 敵レーザーミサイルの画像キャッシュ

/**
 * 敵レーザーミサイルのテクスチャを取得（なければ生成）する
 * @param {string} color - レーザーの色
 * @returns {HTMLCanvasElement} レーザーミサイルのテクスチャ
 */
function getLaserMissileTexture(color) {
    if (laserMissileTextureCache[color]) {
        return laserMissileTextureCache[color];
    }

    const offscreen = document.createElement('canvas');
    // 基本の長さ40、太さ8。見切れないように少し余裕を持たせて 幅60・高さ20 とする
    offscreen.width = 60;
    offscreen.height = 20;
    const oCtx = offscreen.getContext('2d');

    const cx = offscreen.width / 2;
    const cy = offscreen.height / 2;
    const len = 40; // レーザーの基本長

    // 1. 外側の光（厚み・グロー）
    oCtx.strokeStyle = color;
    oCtx.globalAlpha = 0.3;
    oCtx.lineWidth = 8;
    oCtx.beginPath();
    oCtx.moveTo(cx - len / 2, cy);
    oCtx.lineTo(cx + len / 2, cy);
    oCtx.stroke();

    // 2. 中心の芯（真っ白・シャープ）
    oCtx.strokeStyle = '#fff';
    oCtx.globalAlpha = 1.0;
    oCtx.lineWidth = 3;
    oCtx.beginPath();
    oCtx.moveTo(cx - len / 2, cy);
    oCtx.lineTo(cx + len / 2, cy);
    oCtx.stroke();

    laserMissileTextureCache[color] = offscreen;
    return offscreen;
}

const starTextureCache = {}; // ★ 背景の星（Star）の画像キャッシュ

/**
 * 背景の星のテクスチャを取得（なければ生成）する
 * @param {string} color - 星の色
 * @returns {HTMLCanvasElement} 星のテクスチャ
 */
function getStarTexture(color) {
    if (starTextureCache[color]) {
        return starTextureCache[color];
    }
    const offscreen = document.createElement('canvas');
    const size = 16; // 見切れないように余裕を持たせたサイズ
    offscreen.width = size;
    offscreen.height = size;
    const oCtx = offscreen.getContext('2d');

    // 綺麗な円を描いてキャッシュ
    oCtx.fillStyle = color;
    oCtx.beginPath();
    oCtx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    oCtx.fill();

    starTextureCache[color] = offscreen;
    return offscreen;
}


// ==========================================
// ★ パーティクル画像キャッシュシステム (細長く鋭い火花 ＋ メモリ最適化版)
// ==========================================
const particleTextureCache = {};

// 色を制限（丸め処理）するためのヘルパー関数
function quantizeColor(colorStr) {
    // 1. HEX形式 (#RRGGBB) の場合
    if (colorStr.startsWith('#') && colorStr.length === 7) {
        // 下位ビットを切り捨てて、色を大雑把にする（例: #FF33AA -> #F030A0）
        const r = colorStr[1];
        const g = colorStr[3];
        const b = colorStr[5];
        return `#${r}0${g}0${b}0`; 
    }
    
    // 2. rgb(r, g, b) 形式の場合
    const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        // 32単位で丸める（256階調 → 8階調に制限）
        const r = Math.floor(parseInt(rgbMatch[1]) / 32) * 32;
        const g = Math.floor(parseInt(rgbMatch[2]) / 32) * 32;
        const b = Math.floor(parseInt(rgbMatch[3]) / 32) * 32;
        return `rgb(${r},${g},${b})`;
    }
    
    // それ以外の特殊な色（'white' や 'rgba(...)' など）はそのまま返す
    return colorStr;
}

function getParticleTexture(color) {
    // 色を丸めて種類を制限する（これだけでメモリ無限増殖を防げる）
    const limitedColor = quantizeColor(color);

    if (particleTextureCache[limitedColor]) {
        return particleTextureCache[limitedColor];
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = 80;
    offscreen.height = 10;
    const oCtx = offscreen.getContext('2d');

    // ★ 元の細長いデザインのグラデーション位置に復元 (Y座標=4)
    const grad = oCtx.createLinearGradient(0, 4, 80, 4);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); // 尻尾（左端）は透明
    grad.addColorStop(0.8, limitedColor);  // 頭の少し後ろが元の色
    grad.addColorStop(1, '#ffffff');       // 頭（右端）は明るい白

    oCtx.fillStyle = grad;
    
    // ★ 元の鋭いスピード線形状に復元
    // 中心を(40, 4)、横半径40、縦半径1.5 (超細く)
    oCtx.beginPath();
    oCtx.ellipse(40, 4, 40, 1.5, 0, 0, Math.PI * 2);
    oCtx.fill();

    particleTextureCache[limitedColor] = offscreen;
    return offscreen;
}