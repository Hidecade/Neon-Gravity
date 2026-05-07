// =========================================================
// 2. オーディオシステム (Audio System) - OST Manager
// =========================================================
// --- Menu & OST Logic ---
let ostTracks = [];
let currentOstIndex = -1;
let ostUpdateInterval = null;

// OST画面を開く関数（曲リストの生成）
function openOST() {
    if (typeof AudioSys !== 'undefined') AudioSys.resume();

    gameState = 'OST';
    titleIdleTimer = 0;

    if (ui.titleOverlay) ui.titleOverlay.style.display = 'none';
    if (ui.ostOverlay) {
        ui.ostOverlay.style.display = 'flex';
        ui.ostOverlay.style.opacity = '0';
    }

    const list = document.getElementById('track-list');
    if (!list) return;

    list.innerHTML = '';

    // 曲リストの定義
    ostTracks = [
        { n: 'Title Theme', k: 'title' }
    ];

    // ステージ曲
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
        { n: 'Archive Story', k: 'story' },
        { n: 'Ending Theme', k: 'ending' }
    );

    if (typeof BGM_FILES !== 'undefined' && BGM_FILES.storyChapters) {
        BGM_FILES.storyChapters.forEach((path, index) => {
            ostTracks.push({ n: `Archive Story Chapter ${index + 1}`, k: 'storyChapter', i: index });
        });
    }

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

    // プログレスバーの更新開始
    if (typeof startOstProgressUpdate === 'function') {
        startOstProgressUpdate();
    }

    if (window.refreshMenuButtons) {
        window.refreshMenuButtons(true);
    }

    // フェードイン
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (ui.ostOverlay) ui.ostOverlay.style.opacity = '1';
        });
    });
}


// OSTを閉じる処理
function closeOST() {
    titleIdleTimer = 0;

    // プログレス更新停止
    if (ostUpdateInterval) {
        clearInterval(ostUpdateInterval);
        ostUpdateInterval = null;
    }

    // Web Audio API の仕様に合わせて停止を指示
    if (typeof AudioSys !== 'undefined') {
        AudioSys.stopBGM(); 
    }

    // フェードアウト
    if (ui.ostOverlay) ui.ostOverlay.style.opacity = '0';

    setTimeout(() => {
        if (ui.ostOverlay) ui.ostOverlay.style.display = 'none';

        if (ui.titleOverlay) ui.titleOverlay.style.display = 'flex';
        gameState = 'TITLE';

        if (window.refreshMenuButtons) {
            window.refreshMenuButtons();
        }
    }, 300);
}


// 指定したインデックスのOSTを再生する関数
function playOSTTrack(idx) {
    if (idx < 0 || idx >= ostTracks.length) return;

    currentOstIndex = idx; // 現在の曲番号を更新
    const t = ostTracks[idx];

    // BGM再生
    // ※ 新しいaudio.jsでは gameState === 'OST' の場合に自動的にループが解除され、終了時にwindow.playNextOSTが呼ばれます
    if (typeof AudioSys !== 'undefined') {
        AudioSys.playBGM(t.k, t.i);
    }

    // ★ Bluetooth・ロック画面用のメディアセッション更新
    updateMediaSession(t.n);

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

// 次の曲へ進む（AudioSysのendedイベント、またはメディアコントロールから呼ばれる）
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

// 前の曲へ戻る（メディアコントロールから呼ばれる）
window.playPrevOST = function () {
    if (currentOstIndex >= 0 && ostTracks.length > 0) {
        let prevIndex = currentOstIndex - 1;

        // 最初の曲から戻ろうとしたら最後に飛ぶ
        if (prevIndex < 0) {
            prevIndex = ostTracks.length - 1;
        }

        playOSTTrack(prevIndex);
    }
};

// 秒数を 0:00 形式に変換
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// 再生バーの定期更新（Web Audio API のオフセット計算に対応）
function startOstProgressUpdate() {
    if (ostUpdateInterval) clearInterval(ostUpdateInterval);
    ostUpdateInterval = setInterval(() => {
        if (gameState !== 'OST' || typeof AudioSys === 'undefined') return;

        let cur = 0;
        let tot = 0;

        // BGMがロード済み・キャッシュ済みか判定し、時間を計算する
        if (AudioSys.currentBgmUrl && AudioSys.bgmBuffers && AudioSys.bgmBuffers[AudioSys.currentBgmUrl]) {
            const buffer = AudioSys.bgmBuffers[AudioSys.currentBgmUrl];
            tot = buffer.duration;
            
            if (AudioSys.isBgmPaused) {
                cur = AudioSys.bgmOffset;
            } else if (AudioSys.bgmSource && AudioSys.ctx) {
                cur = AudioSys.ctx.currentTime - AudioSys.bgmStartTime;
            }
            // バッファ長を超えないようにクリップ
            if (tot > 0) {
                cur = cur % tot;
            }
        }

        const curEl = document.getElementById('ost-time-current');
        const totEl = document.getElementById('ost-time-total');
        if (curEl) curEl.innerText = formatTime(cur);
        if (totEl) totEl.innerText = formatTime(tot);

        let pct = 0;
        if (tot > 0) pct = (cur / tot) * 100;
        
        const fillEl = document.getElementById('ost-progress-fill');
        if (fillEl) fillEl.style.width = `${pct}%`;
    }, 200);
}


// シークバー（再生バー）のクリック・タップ操作（Web Audio API対応版）
const ostProgressBar = document.getElementById('ost-progress-bar');
if (ostProgressBar) {
    const seekOst = (e) => {
        if (gameState !== 'OST' || typeof AudioSys === 'undefined' || !AudioSys.currentBgmUrl) return;
        
        const buffer = AudioSys.bgmBuffers[AudioSys.currentBgmUrl];
        if (!buffer) return;

        const rect = ostProgressBar.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clickX = clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));

        const targetTime = buffer.duration * pct;

        // Web Audio API で途中から再生するには、ノードを破棄して指定位置（オフセット）から再構築する必要があります
        if (!AudioSys.isBgmPaused && AudioSys.ctx) {
            AudioSys.stopBGM(false); // 情報は消さずにノードだけ止める
            AudioSys._startBgmNode(buffer, AudioSys.currentBgmRawKey, targetTime);
        } else {
            // ポーズ中の場合は再開用のオフセット記録だけを書き換える
            AudioSys.bgmOffset = targetTime;
            
            // 見た目だけ先に反映
            document.getElementById('ost-time-current').innerText = formatTime(targetTime);
            document.getElementById('ost-progress-fill').style.width = `${pct * 100}%`;
        }
    };

    ostProgressBar.addEventListener('mousedown', seekOst);
    ostProgressBar.addEventListener('touchstart', (e) => { e.preventDefault(); seekOst(e); }, { passive: false });
}

/**
 * Bluetooth・ロック画面用のメディアコントロールを更新・登録する
 * @param {string} trackTitle - 表示する曲名
 */
function updateMediaSession(trackTitle) {
    if ('mediaSession' in navigator) {
        // 1. ディスプレイに表示されるメタデータの設定
        navigator.mediaSession.metadata = new MediaMetadata({
            title: trackTitle,
            artist: 'Neon Gravity',
            album: 'Original Soundtrack',
            artwork: [
                { src: 'img/NeonGravity.png', sizes: '512x512', type: 'image/png' }
            ]
        });

        // 2. Bluetooth機器からの操作イベントハンドラ
        navigator.mediaSession.setActionHandler('play', async () => {
            if (window.AudioSys) {
                await window.AudioSys.resumeBGM(true);
            }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            if (window.AudioSys) {
                window.AudioSys.pauseBGM();
            }
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (typeof window.playNextOST === 'function') {
                window.playNextOST();
            }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (typeof window.playPrevOST === 'function') {
                window.playPrevOST();
            }
        });
    }
}
