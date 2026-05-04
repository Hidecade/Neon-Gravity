// ==========================================
// ★ 設定画面のUI・ロジック管理 (js/setting.js)
// ==========================================

// スライダーの数値(0〜3)と品質の対応表
const GFX_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
const SETTING_SE_LIST = [
    'gravity',
    'gravity_boss',
    'shoot',
    'laser',
    'homing',
    'boss_laser',
    'boss_3way',
    'boss_cross',
    'boss_homing',
    'boss_shockwave',
    'boss_dash',
    'ark_laser',
    'ark_fighter',
    'ark_summon',
    'ark_rotary',
    'warning',
    'explode_small',
    'explode_medium',
    'explode_large',
    'target_ping',
    'launch',
    'powerup',
    'damage',
    'invincible',
    'boss_hit',
    'enemy_hit',
    'lc_engine',
    'select',
    'warp',
    'warp_in',
    'coin',
    'coin_cyber',
    'point'
];
let settingSeIndex = 0;

/**
 * スライダーを動かしている「最中」にテキストと見た目を更新する
 */
function updateGraphicsSliderText(val) {
    const label = document.getElementById('gfx-slider-label');
    if (!label) return;
    
    const quality = GFX_LEVELS[val];
    label.innerText = 'QUALITY: ' + quality;
    
    // ULTRAの時だけマゼンタのネオン発光にする特別演出
    if (quality === 'ULTRA') {
        label.style.color = '#fff';
        label.style.textShadow = '0 0 8px #f0f, 0 0 15px #f0f';
    } else {
        label.style.color = '#fff';
        label.style.textShadow = '0 0 8px #0ff, 0 0 15px #0ff';
    }
}

/**
 * 指/マウスを離した「決定時」に実際に設定を適用する
 */
function applyGraphicsSliderValue(val) {
    const quality = GFX_LEVELS[val];
    applyGraphicsQuality(quality); 
}

/**
 * 設定画面を開いた時に、現在の設定値に合わせてスライダーの位置を同期する
 */
function syncSliderWithCurrentQuality() {
    const slider = document.getElementById('gfx-slider');
    if (!slider || typeof currentGraphicsQuality === 'undefined') return;
    
    const idx = GFX_LEVELS.indexOf(currentGraphicsQuality);
    if (idx !== -1) {
        slider.value = idx;
        updateGraphicsSliderText(idx);
    }
}

/**
 * グラフィックス品質を実際にシステムに適用し、保存する
 */
function applyGraphicsQuality(quality) {
    if (typeof GRAPHICS_SETTINGS === 'undefined' || !GRAPHICS_SETTINGS[quality]) return;
    
    // グローバル変数を更新
    currentGraphicsQuality = quality;
    
    // 次回起動時のためにブラウザのローカルストレージに保存
    localStorage.setItem('neonGravity_gfxQuality', quality);
    console.log(`[SETTINGS] Graphics Quality set to: ${quality}`);
    
    // （任意）品質を変えた瞬間に背景の星などを再生成したい場合は、初期化関数を呼ぶ
    // if (typeof initBackground === 'function') initBackground();
}

/**
 * 言語設定の適用と保存
 */
function applyLanguage(lang) {
    // グローバル変数を更新 (※main.js等で currentLanguage が定義されている前提)
    currentLanguage = lang;
    
    // 次回起動時のために保存
    localStorage.setItem('neonGravity_language', lang);
    console.log(`[SETTINGS] Language set to: ${lang}`);
    
    // （任意）UIのテキストを即座に切り替える関数があればここで呼ぶ
    // if (typeof updateUITexts === 'function') updateUITexts();
}

// ==========================================
// ★ 言語のトグル切り替えロジック
// ==========================================

/**
 * トグルボタンを押した時の処理：英語と日本語を反転させる
 */
function toggleLanguage() {
    // 現在が 'ja' なら 'en' に、そうでないなら 'ja' にする
    const newLang = (currentLanguage === 'ja') ? 'en' : 'ja';
    applyLanguage(newLang);
    
    // ボタンの表示テキストを更新する
    syncLanguageToggleText();
}

/**
 * 言語トグルボタンと下のガイドメッセージを現在の設定値に同期する
 */
function syncLanguageToggleText() {
    const toggleBtn = document.getElementById('btn-lang-toggle');
    const instruction = document.getElementById('lang-instruction'); // ★追加
    
    if (!toggleBtn || typeof currentLanguage === 'undefined') return;

    if (currentLanguage === 'ja') {
        toggleBtn.innerText = '日本語';
        if (instruction) instruction.innerText = 'クリックして言語を選択してください'; // 日本語メッセージ
    } else {
        toggleBtn.innerText = 'ENGLISH';
        if (instruction) instruction.innerText = 'PLEASE SELECT YOUR LANGUAGE'; // 英語メッセージ
    }
}

function syncSettingSEBrowser() {
    const nameEl = document.getElementById('se-test-name');
    const countEl = document.getElementById('se-test-count');
    if (!nameEl || !countEl) return;

    const name = SETTING_SE_LIST[settingSeIndex] || SETTING_SE_LIST[0];
    const configKey = (typeof SE_VOLUME_CONFIG_KEYS !== 'undefined' && SE_VOLUME_CONFIG_KEYS[name])
        ? SE_VOLUME_CONFIG_KEYS[name]
        : name;
    nameEl.innerText = configKey.toUpperCase().replace(/_/g, ' ');
    countEl.innerText = `${String(settingSeIndex + 1).padStart(2, '0')} / ${SETTING_SE_LIST.length}`;
}

function cycleSettingSE(dir) {
    settingSeIndex = (settingSeIndex + dir + SETTING_SE_LIST.length) % SETTING_SE_LIST.length;
    syncSettingSEBrowser();
    previewCurrentSettingSE();
}

function previewCurrentSettingSE() {
    const name = SETTING_SE_LIST[settingSeIndex] || SETTING_SE_LIST[0];
    previewSettingSE(name);
}

async function previewSettingSE(name) {
    if (typeof AudioSys === 'undefined') return;
    AudioSys.init();
    const ready = await AudioSys.ensureAudioReady(true);
    if (!ready) return;

    const x = (typeof player !== 'undefined' && Number.isFinite(player.x)) ? player.x : null;
    const y = (typeof player !== 'undefined' && Number.isFinite(player.y)) ? player.y : null;
    const param = name === 'gravity_boss' ? 0.65 : 1.0;
    AudioSys.playSE(name, x, y, param);
}
