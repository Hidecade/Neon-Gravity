// =========================================================
// Audio System Manager
// =========================================================

// 警告音の間隔設定
const WARNING_SOUND_INTERVAL = 48;

const BGM_FILES = {
    title: 'audio/Neon_Gravity_Title.mp3',
    clear: 'audio/Neon_Gravity_Clear.mp3',
    all_clear: 'audio/Neon_Gravity_All_Clear.mp3',
    boss: 'audio/Neon_Gravity_Boss.mp3',
    last: 'audio/Neon_Gravity_Last.mp3',
    name: 'audio/Neon_Gravity_Name.mp3',
    stages: [
        'audio/Neon_Gravity_01.mp3',
        'audio/Neon_Gravity_02.mp3',
        'audio/Neon_Gravity_03.mp3',
        'audio/Neon_Gravity_04.mp3',
        'audio/Neon_Gravity_05.mp3',
        'audio/Neon_Gravity_06.mp3',
        'audio/Neon_Gravity_07.mp3',
        'audio/Neon_Gravity_08.mp3'
    ]
};

// --- SEの音響定義ライブラリ ---
const SE_LIBRARY = {
    // ショット音
    shoot: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        g.gain.setValueAtTime(0.08, t);
        g.gain.linearRampToValueAtTime(0, t + 0.1);
        return { osc: o, duration: 0.1 };
    },

    // レーザー発射音
    laser: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(120, t);
        o.frequency.linearRampToValueAtTime(80, t + 0.15);
        const mod = ctx.createOscillator();
        mod.type = 'square'; mod.frequency.value = 500;
        const modGain = ctx.createGain();
        modGain.gain.value = 500;
        mod.connect(modGain); modGain.connect(o.frequency);
        mod.start(t); mod.stop(t + 0.15);
        g.gain.setValueAtTime(0.10, t);
        g.gain.linearRampToValueAtTime(0, t + 0.15);
        return { osc: o, duration: 0.15 };
    },

    // 警告音（ボス出現時）
    warning: (ctx, t, g) => {
        const repeatCount = 6;
        const interval = (typeof WARNING_SOUND_INTERVAL !== 'undefined' ? WARNING_SOUND_INTERVAL : 60) / 60;
        const duration = 0.6;
        for (let i = 0; i < repeatCount; i++) {
            const startTime = t + (i * interval);
            [400, 195, 100].forEach((freq) => {
                const o = ctx.createOscillator();
                const subG = ctx.createGain();
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(freq, startTime);
                o.frequency.linearRampToValueAtTime(freq * 1.8, startTime + duration);
                const volume = 0.08;
                subG.gain.setValueAtTime(volume, startTime);
                subG.gain.linearRampToValueAtTime(volume, startTime + duration - 0.1);
                subG.gain.linearRampToValueAtTime(0, startTime + duration);
                o.connect(subG); subG.connect(g);
                o.start(startTime); o.stop(startTime + duration);
            });
        }
        return { osc: null, duration: (repeatCount * interval) + duration };
    },

    // 爆発音（小）：通常の雑魚敵用
    explode_small: (ctx, t, g, noise) => {
        if (!noise) return { osc: null, duration: 0 };
        const n = ctx.createBufferSource();
        n.buffer = noise;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(800, t);
        f.frequency.exponentialRampToValueAtTime(20, t + 0.4);

        g.gain.setValueAtTime(0.6, t);
        g.gain.linearRampToValueAtTime(0, t + 0.4);

        n.connect(f); f.connect(g);
        n.start(t);
        n.stop(t + 0.4);
        return { osc: null, duration: 0.4 };
    },

    // 爆発音（中）：中ボス・アステロイド用
    explode_medium: (ctx, t, g, noise) => {
        if (!noise) return { osc: null, duration: 0 };
        const dur = 2.0;
        const n = ctx.createBufferSource();
        n.buffer = noise;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(400, t);
        f.frequency.exponentialRampToValueAtTime(10, t + dur);

        g.gain.setValueAtTime(1.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);

        n.connect(f); f.connect(g);
        n.start(t);
        n.stop(t + dur);
        return { osc: null, duration: dur };
    },

    // 爆発音（大）：ボスの崩壊を表現する不規則な3連鎖
    explode_large: (ctx, t, g, noise) => {
        if (!noise) return { osc: null, duration: 0 };
        const totalDur = 5.0;

        // タイミングを少し不規則にする（0秒、0.3~0.5秒、0.8~1.0秒）
        const bursts = [0, 0.15 + Math.random() * 0.2, 0.85 + Math.random() * 0.2];

        bursts.forEach((delay, i) => {
            const startTime = t + delay;
            const n = ctx.createBufferSource();
            n.buffer = noise;

            // 再生開始位置をランダムにして、毎回違うノイズ部分を使う（機械的な重複を避ける）
            n.loop = true; // バッファが短い場合を想定

            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';

            // --- 音色に役割を持たせる ---
            // 1回目：金属的な破壊音（高め）
            // 2回目：爆発の広がり（中域）
            // 3回目：巨大な質量崩壊（低域）
            const startFreq = i === 0 ? 1200 : i === 1 ? 600 : 250;
            const endFreq = 10;
            const dur = i === 2 ? 3.0 : 1.5; // 最後だけ長く残す

            f.frequency.setValueAtTime(startFreq, startTime);
            f.frequency.exponentialRampToValueAtTime(endFreq, startTime + dur);

            const subG = ctx.createGain();
            // ノイズの重なりを考慮して音量を少し控えめに調整（合計が1.0を超えすぎないよう）
            const volume = i === 2 ? 0.8 : 0.5;
            subG.gain.setValueAtTime(volume, startTime);
            subG.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

            n.connect(f);
            f.connect(subG);
            subG.connect(g);

            n.start(startTime, Math.random() * 2); // 開始位置をランダム化
            n.stop(startTime + dur);
        });

        // --- 最後の衝撃波（地響き：正弦波） ---
        const o = ctx.createOscillator();
        const finalBurstTime = t + bursts[2];
        o.type = 'sine';

        // 非常に低い周波数からさらに下げて、耳ではなく体に響く音へ
        o.frequency.setValueAtTime(55, finalBurstTime);
        o.frequency.exponentialRampToValueAtTime(15, finalBurstTime + 2.5);

        const og = ctx.createGain();
        og.gain.setValueAtTime(0, finalBurstTime);
        og.gain.linearRampToValueAtTime(0.4, finalBurstTime + 0.05); // 立ち上がりをより鋭く
        og.gain.exponentialRampToValueAtTime(0.001, finalBurstTime + 3.5);

        o.connect(og);
        og.connect(g);
        o.start(finalBurstTime);
        o.stop(finalBurstTime + 3.5);

        return { osc: null, duration: totalDur };
    },

    // ターゲット捕捉警告音（ピッ！）
    target_ping: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'square'; // 電子音らしい矩形波
        o.frequency.setValueAtTime(2500, t); // 高い音

        g.gain.setValueAtTime(0.1, t); // 音量は控えめ
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        return { osc: o, duration: 0.05 };
    },

    // 特殊攻撃（LAUNCH）音：1秒かけてフェードイン（音量半分調整版）
    launch: (ctx, t, g, noise) => {
        const dur = 1.5;
        const fadeInTime = 1.0;

        // --- 1. ノイズ成分 ---
        if (noise) {
            const n = ctx.createBufferSource();
            n.buffer = noise;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(5000, t);
            filter.frequency.exponentialRampToValueAtTime(1000, t + dur);
            filter.Q.value = 0.5;

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0, t);
            noiseGain.gain.linearRampToValueAtTime(2.0, t + fadeInTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + dur);

            n.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(g);

            n.start(t);
            n.stop(t + dur);
        }

        // --- 2. 金属的な共鳴成分 ---
        const metallicFreqs = [2043, 3102, 4519];
        metallicFreqs.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            const oscGain = ctx.createGain();
            oscGain.gain.setValueAtTime(0, t);
            oscGain.gain.linearRampToValueAtTime(0.02 - (index * 0.005), t + fadeInTime);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

            osc.connect(oscGain);
            oscGain.connect(g);

            osc.start(t);
            osc.stop(t + dur);
        });

        // ==========================================
        // ★ 全体の音量フェード（マスターエンベロープ）
        // ==========================================
        g.gain.setValueAtTime(0, t);
        // ★ 最大音量を 0.8 -> 0.4 に変更（半分）
        g.gain.linearRampToValueAtTime(0.08, t + fadeInTime);
        // 消え際も半分に合わせて減衰
        g.gain.exponentialRampToValueAtTime(0.005, t + dur);

        return { osc: null, duration: dur };
    },

    // パワーアップ取得音
    powerup: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, t);
        o.frequency.linearRampToValueAtTime(1800, t + 0.2);
        g.gain.setValueAtTime(0.2, t);
        g.gain.linearRampToValueAtTime(0, t + 0.2);
        return { osc: o, duration: 0.2 };
    },

    // ダメージ音
    damage: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(150, t);
        o.frequency.linearRampToValueAtTime(50, t + 0.2);
        g.gain.setValueAtTime(0.16, t);
        g.gain.linearRampToValueAtTime(0, t + 0.2);
        return { osc: o, duration: 0.2 };
    },

    // 無敵アイテム取得音
    invincible: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(300, t);
        o.frequency.linearRampToValueAtTime(800, t + 0.5);
        g.gain.setValueAtTime(0.3, t);
        g.gain.linearRampToValueAtTime(0, t + 0.5);
        return { osc: o, duration: 0.5 };
    },

    // ボス被弾音（金属の削れ音 ＋ 重低音の「バンー！」）
    boss_hit: (ctx, t, g) => {
        const dur = 0.18; // ★低音を響かせるため、少しだけ余韻を伸ばす

        // --- ステレオパンナー ---
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
        if (panner.pan) {
            panner.pan.value = (Math.random() - 0.5) * 1.2;
        }
        panner.connect(g);

        // ==========================================
        // 1. 今までの金属的なヒット音（中〜高音域）
        // ==========================================
        const o = ctx.createOscillator();
        o.type = 'sawtooth';

        const basePitch = 95 + Math.random() * 10;
        o.frequency.setValueAtTime(basePitch, t);
        o.frequency.exponentialRampToValueAtTime(basePitch - 10, t + dur);

        const mod = ctx.createOscillator();
        mod.type = 'square';
        mod.frequency.value = 750 + Math.random() * 100;

        const modGain = ctx.createGain();
        modGain.gain.value = 600;

        mod.connect(modGain);
        modGain.connect(o.frequency);

        mod.start(t);
        mod.stop(t + dur);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.15, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + dur);

        o.connect(env);
        env.connect(panner);
        o.start(t);
        o.stop(t + dur);

        // ==========================================
        // 2. ★追加：重低音の「バンー！」（サブベース）
        // ==========================================
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine'; // 重低音に最適な「サイン波」を使用

        // ドスッという打撃感を出すため、150Hzから地響きの30Hzへ急降下させる
        subOsc.frequency.setValueAtTime(150, t);
        subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

        const subEnv = ctx.createGain();
        // 低音は人間の耳に聞こえにくいため、音量を大きめ(0.4)に設定
        subEnv.gain.setValueAtTime(0.4, t);
        subEnv.gain.exponentialRampToValueAtTime(0.001, t + dur);

        subOsc.connect(subEnv);
        subEnv.connect(panner); // 低音もステレオに合わせて出力

        subOsc.start(t);
        subOsc.stop(t + dur);

        return { osc: null, duration: dur };
    },

    // 短く鋭い破裂音（パシッ！）
    enemy_hit: (ctx, t, g, noise) => {
        if (!noise) return { osc: null, duration: 0 };

        const duration = 0.12; // 0.1秒を切る極短設定でキレを出す
        const n = ctx.createBufferSource();
        const f = ctx.createBiquadFilter();
        n.buffer = noise;

        // --- フィルター設定：高域を少し通して「パシッ」感を出す ---
        f.type = 'bandpass'; // バンドパスで特定の「叩き」成分を抽出
        f.frequency.setValueAtTime(1000, t); // 高めの周波数から開始
        f.frequency.exponentialRampToValueAtTime(400, t + duration);
        f.Q.value = 0.5;

        // --- 音量：アタック（立ち上がり）を最大にして即座に消す ---
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);

        n.connect(f);
        f.connect(g);

        n.start(t);
        n.stop(t + duration);

        // オシレーターを使わずノイズのみなので osc は null
        return { osc: null, duration: duration };
    },
};


// --- 2. メインのオーディオシステム ---
const AudioSys = {
    ctx: null,
    bgmEl: null,
    currentSrc: null,
    noiseBuffer: null,
    activeNodes: [],
    bgmFadeInterval: null,

    async reset() {
        // 既存のコンテキストがあれば閉じて破棄する
        if (this.ctx) {
            try {
                await this.ctx.close();
            } catch (e) {
                console.log("AudioContext close error:", e);
            }
            this.ctx = null;
        }

        // 再初期化
        this.init();

        // iOS用の無音再生（アンロック）を実行
        this._unlockAudio();

        console.log("AudioSystem Force Reset Completed.");
    },

    init() {
        if (!this.ctx) {
            try {
                // AudioContextを作成
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) {
                    this.ctx = new AC();
                    this.createNoise();

                    // ★追加：iOS対策（無音のバッファを一瞬再生して、オーディオエンジンを強制的に起こす）
                    this._unlockAudio();
                }
            } catch (e) { console.error("AudioContext init error:", e); }
        }

        if (!this.bgmEl) {
            this.bgmEl = new Audio();
            this.bgmEl.loop = true;
            this.bgmEl.volume = 0.4;
            // ★重要：曲が終わった時の処理
            this.bgmEl.addEventListener('ended', () => {
                // main.js で定義する "gameState" と "playNextOST" を参照
                if (window.gameState === 'OST' && typeof window.playNextOST === 'function') {
                    window.playNextOST(); // OSTモードなら次の曲へ
                } else if (this.bgmEl.loop) {
                    // ゲーム中などはループ再生
                    this.bgmEl.currentTime = 0;
                    this.bgmEl.play().catch(e => { });
                }
            });
        }
    },


    // ★追加：サイレント状態でオシレーターを一瞬走らせる関数
    _unlockAudio() {
        if (!this.ctx) return;
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);

        if (this.ctx.state !== 'running') {
            this.ctx.resume().catch(e => { });
        }
    },

    async resume() {
        if (!this.ctx) {
            this.init();
            return;
        }

        // すでに動いていれば何もしない
        if (this.ctx.state === 'running') return;

        // 再開を試みる
        try {
            await this.ctx.resume();

            // ★追加：それでも動かない場合は無音再生で刺激を与える
            if (this.ctx.state !== 'running') {
                this._unlockAudio();
            }
        } catch (e) {
            console.log("AudioContext resume failed:", e);
        }
    },

    createNoise() {
        if (!this.ctx) return;
        const bSize = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bSize; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buf;
    },

    // ノードの管理と自動破棄
    registerNode(type, node, durationMs) {
        const nodeRef = { type, node };
        this.activeNodes.push(nodeRef);
        setTimeout(() => {
            const index = this.activeNodes.indexOf(nodeRef);
            if (index > -1) {
                try { node.disconnect(); } catch (e) { }
                this.activeNodes.splice(index, 1);
            }
        }, durationMs);
    },

    async playSE(type) {
        if (!this.ctx || !SE_LIBRARY[type]) return;

        // --- 重複防止ロジック ---
        const now = this.ctx.currentTime;
        this.lastPlayed = this.lastPlayed || {};

        // 前回の再生から 0.05秒（約3フレーム）経過していなければ無視
        // 「チリッ」という短い音の場合、これくらいの間隔が自然です
        if (this.lastPlayed[type] && now - this.lastPlayed[type] < 0.05) {
            return;
        }
        this.lastPlayed[type] = now;
        // ----------------------

        await this.resume();

        const t = this.ctx.currentTime;
        const g = this.ctx.createGain();
        g.connect(this.ctx.destination);

        try {
            const effect = SE_LIBRARY[type](this.ctx, t, g, this.noiseBuffer);

            if (effect.osc) {
                effect.osc.connect(g);
                effect.osc.start(t);
                effect.osc.stop(t + effect.duration);
            }

            const cleanupTime = Math.max(2000, effect.duration * 1000 + 500);
            this.registerNode(type, g, cleanupTime);

        } catch (e) { console.warn(`Error playing SE: ${type}`, e); }
    },

    stopSE(targetType = null) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.activeNodes = this.activeNodes.filter(item => {
            if (!targetType || item.type === targetType) {
                this.fadeAndDisconnect(item.node, t);
                return false;
            }
            return true;
        });
    },

    fadeAndDisconnect(gainNode, time) {
        try {
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(gainNode.gain.value, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            setTimeout(() => { try { gainNode.disconnect(); } catch (e) { } }, 100);
        } catch (e) { }
    },

    // BGM関連のヘルパー
    getNormalizedUrl(path) {
        return path ? new URL(path, window.location.href).href : "";
    },

    playBGM(key, idx = 0) {
        if (!this.bgmEl) return;

        // --- パス決定ロジックの修正 ---
        let src = "";
        if (key === 'stage') {
            // ここで引数 idx を使って配列から曲を選択する
            if (BGM_FILES.stages && BGM_FILES.stages[idx]) {
                src = BGM_FILES.stages[idx];
            } else {
                console.error(`Stage BGM at index ${idx} not found.`);
                return;
            }
        } else {
            src = BGM_FILES[key];
        }

        if (!src) {
            this.bgmEl.pause();
            this.bgmEl.src = "";
            this.currentSrc = null;
            return;
        }

        const nextFull = new URL(src, window.location.href).href;
        // すでに同じ曲が再生中なら何もしない
        if (this.currentSrc === nextFull && !this.bgmEl.paused) {
            return;
        }

        // ★修正：OSTモードの時はループしない（false）、それ以外はループする（true）
        // window.gameState が undefined の可能性も考慮
        const isOST = (typeof window.gameState !== 'undefined' && window.gameState === 'OST');
        this.bgmEl.loop = !isOST;

        // 別の曲を再生する場合
        this.bgmEl.pause();
        this.bgmEl.src = src;
        this.currentSrc = src; // ★追加：現在再生中の曲を記憶する
        this.bgmEl.currentTime = 0;
        this.bgmEl.volume = 0.4; // 音量調整

        this.bgmEl.play().catch(e => {
            console.warn("BGM playback failed. User interaction might be required.", e);
        });
    },

    getBgmPath(key, idx) {
        if (BGM_FILES[key]) {
            if (key === 'stage') return BGM_FILES.stages[idx % BGM_FILES.stages.length];
            return BGM_FILES[key];
        }
        return BGM_FILES.stages[0];
    },

    stopBgmInterval() {
        if (this.bgmFadeInterval) {
            clearInterval(this.bgmFadeInterval);
            this.bgmFadeInterval = null;
        }
    },

    fadeOutBGM() {
        return new Promise((resolve) => {
            if (!this.bgmEl || this.bgmEl.paused) {
                resolve();
                return;
            }
            this.stopBgmInterval();
            let vol = this.bgmEl.volume;
            this.bgmFadeInterval = setInterval(() => {
                if (vol > 0.05) {
                    vol -= 0.05;
                    if (vol < 0) vol = 0;
                    this.bgmEl.volume = vol;
                } else {
                    this.bgmEl.volume = 0;
                    this.bgmEl.pause();
                    this.stopBgmInterval();
                    resolve(); // フェードアウト完了を通知
                }
            }, 50); // 約0.4秒かけてスッと消える
        });
    },

    stopBGM() {
        this.stopBgmInterval();
        if (this.bgmEl) this.bgmEl.pause();
    },

    pauseBGM() { if (this.bgmEl && !!this.bgmEl.paused) this.bgmEl.pause(); },

    resumeBGM() {
        // currentSrcの代わりに、bgmElにsrcがセットされているかを確認する
        if (this.bgmEl && this.bgmEl.paused && this.currentSrc != null && this.bgmEl.src) {
            this.bgmEl.play().catch(() => { });
        }
    }
};

// グローバルスコープに登録（main.jsからアクセスするため）
window.AudioSys = AudioSys;
