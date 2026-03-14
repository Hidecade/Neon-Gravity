// =========================================================
// 2. オーディオシステム (Audio System)
// =========================================================
// --- Menu & OST Logic ---
let ostTracks = [];
let currentOstIndex = -1;
let ostUpdateInterval = null;

// OST画面を開く関数（曲リストの生成）
function openOST() {
    if (typeof AudioSys !== 'undefined') AudioSys.resume();
    
    ui.titleOverlay.style.display = 'none';

    gameState = 'OST'; // ★ここで状態をOSTにする
    ui.ost.style.display = 'flex';

    const list = document.getElementById('track-list');
    list.innerHTML = '';

    // 曲リストの定義
    ostTracks = [
        { n: 'Title Theme', k: 'title' }
    ];
    // ステージ曲
    // config.js の STAGE_TITLES や BGM_FILES.stages を使ってリスト化
    // (ここでは簡易的にBGM_FILESを参照している想定)
    if (typeof BGM_FILES !== 'undefined' && BGM_FILES.stages) {
        BGM_FILES.stages.forEach((path, index) => {
            ostTracks.push({ n: `Stage ${index + 1} BGM`, k: 'stage', i: index });
        });
    }
    // その他の曲
    ostTracks.push(
        { n: 'Boss Encounter', k: 'boss' },
        { n: 'The Final Ark', k: 'last' },
        { n: 'Mission Complete', k: 'clear' },
        { n: 'All Mission Complete', k: 'all_clear' },
        { n: 'Name Entry', k: 'name' },
        { n: 'Ending Theme', k: 'ending' } 
    );

    // リスト描画
    ostTracks.forEach((t, idx) => {
        const d = document.createElement('div');
        d.className = 'track-item';
        d.innerText = t.n;
        d.onclick = () => playOSTTrack(idx);
        list.appendChild(d);
    });

    // UI初期化
    const ostControls = document.getElementById('ost-controls');
    if (ostControls) ostControls.style.display = 'flex';

    // プログレスバーの更新開始（定義されていれば）
    if (typeof startOstProgressUpdate === 'function') startOstProgressUpdate();
    if (window.refreshMenuButtons) window.refreshMenuButtons();
}

// 指定したインデックスのOSTを再生する関数
function playOSTTrack(idx) {
    if (idx < 0 || idx >= ostTracks.length) return;

    currentOstIndex = idx; // 現在の曲番号を更新
    const t = ostTracks[idx];

    // BGM再生（audio_manager.js の playBGM が呼ばれ、loopがfalseになる）
    if (typeof AudioSys !== 'undefined') {
        AudioSys.playBGM(t.k, t.i);
    }

    // リストの見た目を更新（再生中の曲を光らせる）
    const items = document.querySelectorAll('#track-list .track-item');
    items.forEach((e, i) => {
        if (i === idx) {
            e.classList.add('playing');
            // リスト内でスクロールして表示
            e.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            e.classList.remove('playing');
        }
    });

    const nowPlayingText = document.getElementById('ost-now-playing');
    if (nowPlayingText) {
        nowPlayingText.innerText = "NOW PLAYING: " + t.n;
    }
}

// 次の曲へ進む（AudioSysのendedイベントから呼ばれる）
window.playNextOST = function () {
    if (currentOstIndex >= 0 && ostTracks.length > 0) {
        let nextIndex = currentOstIndex + 1;

        // 最後の曲まで行ったら最初に戻る
        if (nextIndex >= ostTracks.length) {
            nextIndex = 0;
        }

        playOSTTrack(nextIndex);
    }
};

// 秒数を 0:00 形式に変換
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 再生バーの定期更新
function startOstProgressUpdate() {
    if (ostUpdateInterval) clearInterval(ostUpdateInterval);
    ostUpdateInterval = setInterval(() => {
        if (gameState !== 'OST' || !AudioSys.bgmEl) return;

        const bgm = AudioSys.bgmEl;
        const cur = bgm.currentTime || 0;
        const tot = bgm.duration || 0;

        document.getElementById('ost-time-current').innerText = formatTime(cur);
        document.getElementById('ost-time-total').innerText = formatTime(tot);

        let pct = 0;
        if (tot > 0) pct = (cur / tot) * 100;
        document.getElementById('ost-progress-fill').style.width = `${pct}%`;
    }, 200);
}

// OSTを閉じる処理
function closeOST() {
    if (ostUpdateInterval) clearInterval(ostUpdateInterval);

    // ★変更：即座に止める処理を削除（returnToTitle側でフェードアウトさせるため）

    if (AudioSys.bgmEl) AudioSys.bgmEl.loop = true; // ゲーム用にループを戻す
    returnToTitle();
}

// シークバー（再生バー）のクリック・タップ操作
const ostProgressBar = document.getElementById('ost-progress-bar');

const seekOst = (e) => {
    if (gameState !== 'OST' || !AudioSys.bgmEl || !AudioSys.bgmEl.duration) return;
    const rect = ostProgressBar.getBoundingClientRect();
    // タッチかマウスかを判定してX座標を取得
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width)); // 0.0 ~ 1.0の範囲に収める

    AudioSys.bgmEl.currentTime = AudioSys.bgmEl.duration * pct;
};

ostProgressBar.addEventListener('mousedown', seekOst);
ostProgressBar.addEventListener('touchstart', (e) => { e.preventDefault(); seekOst(e); }, { passive: false });