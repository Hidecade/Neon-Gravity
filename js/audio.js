// =========================================================
// Audio System Manager (Fixed & Optimized)
// =========================================================

// 警告音の間隔設定
const WARNING_SOUND_INTERVAL = 48;

// ストップさせる必要がなく、鳴らしっぱなしで良いSEのリスト
const ONE_SHOT_SE = [
    'shoot', 'laser', 'enemy_hit',
    'explode_small', 'explode_medium', 'explode_large',
    'target_ping', 'launch', 'powerup', 'damage',
    'invincible', 'boss_hit'
];

const BGM_FILES = {
    title: 'audio/Neon_Gravity_Title.mp3',
    clear: 'audio/Neon_Gravity_Clear.mp3',
    all_clear: 'audio/Neon_Gravity_All_Clear.mp3',
    boss: 'audio/Neon_Gravity_Boss.mp3',
    last: 'audio/Neon_Gravity_Last.mp3',
    name: 'audio/Neon_Gravity_Name.mp3',
    ending: 'audio/Neon_Gravity_Ending.mp3',
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
    // (SE定義は元のまま変更なしでOKです。長いので省略しませんが、そのまま貼り付けてください)
    shoot: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        g.gain.setValueAtTime(0.08, t);
        g.gain.linearRampToValueAtTime(0, t + 0.1);
        return { osc: o, duration: 0.1 };
    },
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
        n.start(t); n.stop(t + 0.4);
        return { osc: null, duration: 0.4 };
    },
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
        n.start(t); n.stop(t + dur);
        return { osc: null, duration: dur };
    },
    explode_large: (ctx, t, g, noise) => {
        if (!noise) return { osc: null, duration: 0 };
        const totalDur = 5.0;
        const bursts = [0, 0.15 + Math.random() * 0.2, 0.85 + Math.random() * 0.2];
        bursts.forEach((delay, i) => {
            const startTime = t + delay;
            const n = ctx.createBufferSource();
            n.buffer = noise;
            n.loop = true;
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            const startFreq = i === 0 ? 1200 : i === 1 ? 600 : 250;
            const endFreq = 10;
            const dur = i === 2 ? 3.0 : 1.5;
            f.frequency.setValueAtTime(startFreq, startTime);
            f.frequency.exponentialRampToValueAtTime(endFreq, startTime + dur);
            const subG = ctx.createGain();
            const volume = i === 2 ? 0.8 : 0.5;
            subG.gain.setValueAtTime(volume, startTime);
            subG.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
            n.connect(f); f.connect(subG); subG.connect(g);
            n.start(startTime, Math.random() * 2);
            n.stop(startTime + dur);
        });

        const o = ctx.createOscillator();
        const finalBurstTime = t + bursts[2];
        o.type = 'sine';
        o.frequency.setValueAtTime(55, finalBurstTime);
        o.frequency.exponentialRampToValueAtTime(15, finalBurstTime + 2.5);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, finalBurstTime);
        og.gain.linearRampToValueAtTime(0.4, finalBurstTime + 0.05);
        og.gain.exponentialRampToValueAtTime(0.001, finalBurstTime + 3.5);
        o.connect(og); og.connect(g);
        o.start(finalBurstTime); o.stop(finalBurstTime + 3.5);
        return { osc: null, duration: totalDur };
    },
    target_ping: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(2500, t);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        return { osc: o, duration: 0.05 };
    },
    launch: (ctx, t, g, noise) => {
        const dur = 1.5;
        const fadeInTime = 1.0;
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
            n.connect(filter); filter.connect(noiseGain); noiseGain.connect(g);
            n.start(t); n.stop(t + dur);
        }
        const metallicFreqs = [2043, 3102, 4519];
        metallicFreqs.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            const oscGain = ctx.createGain();
            oscGain.gain.setValueAtTime(0, t);
            oscGain.gain.linearRampToValueAtTime(0.02 - (index * 0.005), t + fadeInTime);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(oscGain); oscGain.connect(g);
            osc.start(t); osc.stop(t + dur);
        });
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + fadeInTime);
        g.gain.exponentialRampToValueAtTime(0.005, t + dur);
        return { osc: null, duration: dur };
    },
    powerup: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, t);
        o.frequency.linearRampToValueAtTime(1800, t + 0.2);
        g.gain.setValueAtTime(0.2, t);
        g.gain.linearRampToValueAtTime(0, t + 0.2);
        return { osc: o, duration: 0.2 };
    },
    damage: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(150, t);
        o.frequency.linearRampToValueAtTime(50, t + 0.2);
        g.gain.setValueAtTime(0.16, t);
        g.gain.linearRampToValueAtTime(0, t + 0.2);
        return { osc: o, duration: 0.2 };
    },
    invincible: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(300, t);
        o.frequency.linearRampToValueAtTime(800, t + 0.5);
        g.gain.setValueAtTime(0.3, t);
        g.gain.linearRampToValueAtTime(0, t + 0.5);
        return { osc: o, duration: 0.5 };
    },
    boss_hit: (ctx, t, g) => {
        const dur = 0.18;
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
        if (panner.pan) panner.pan.value = (Math.random() - 0.5) * 1.2;
        panner.connect(g);

        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        const basePitch = 95 + Math.random() * 10;
        o.frequency.setValueAtTime(basePitch, t);
        o.frequency.exponentialRampToValueAtTime(basePitch - 10, t + dur);
        const mod = ctx.createOscillator();
        mod.type = 'square'; mod.frequency.value = 750 + Math.random() * 100;
        const modGain = ctx.createGain();
        modGain.gain.value = 600;
        mod.connect(modGain); modGain.connect(o.frequency);
        mod.start(t); mod.stop(t + dur);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.15, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(env); env.connect(panner);
        o.start(t); o.stop(t + dur);

        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(150, t);
        subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
        const subEnv = ctx.createGain();
        subEnv.gain.setValueAtTime(0.4, t);
        subEnv.gain.exponentialRampToValueAtTime(0.001, t + dur);
        subOsc.connect(subEnv); subEnv.connect(panner);
        subOsc.start(t); subOsc.stop(t + dur);
        return { osc: null, duration: dur };
    },
    enemy_hit: (ctx, t, g, noise) => {
        if (!noise) return { osc: null, duration: 0 };
        const duration = 0.12;
        const n = ctx.createBufferSource();
        const f = ctx.createBiquadFilter();
        n.buffer = noise;
        f.type = 'bandpass';
        f.frequency.setValueAtTime(1000, t);
        f.frequency.exponentialRampToValueAtTime(400, t + duration);
        f.Q.value = 0.5;
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        n.connect(f); f.connect(g);
        n.start(t); n.stop(t + duration);
        return { osc: null, duration: duration };
    },
    select: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(2400, t);
        o.frequency.exponentialRampToValueAtTime(1600, t + 0.05);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        return { osc: o, duration: 0.05 };
    },
    warp: (ctx, t, g, noise) => {
        const dur = 1.2;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(400, t);
        o.frequency.exponentialRampToValueAtTime(6000, t + dur);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.15, t + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(env); env.connect(g);
        o.start(t); o.stop(t + dur);

        if (noise) {
            const n = ctx.createBufferSource();
            n.buffer = noise;
            const f = ctx.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.setValueAtTime(500, t);
            f.frequency.exponentialRampToValueAtTime(8000, t + dur);
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(0, t);
            ng.gain.linearRampToValueAtTime(0.6, t + 0.2);
            ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
            n.connect(f); f.connect(ng); ng.connect(g);
            n.start(t); n.stop(t + dur);
        }
        return { osc: null, duration: dur };
    },
    warp_in: (ctx, t, g, noise) => {
        const dur = 2.2;
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(200, t + dur);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.05, t + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(env); env.connect(g);
        o.start(t); o.stop(t + dur);

        const o2 = ctx.createOscillator();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(1100, t);
        o2.frequency.exponentialRampToValueAtTime(300, t + dur);
        const env2 = ctx.createGain();
        env2.gain.setValueAtTime(0, t);
        env2.gain.linearRampToValueAtTime(0.04, t + 0.1);
        env2.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o2.connect(env2); env2.connect(g);
        o2.start(t); o2.stop(t + dur);

        if (noise) {
            const n = ctx.createBufferSource();
            n.buffer = noise;
            const f = ctx.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.setValueAtTime(8000, t);
            f.frequency.exponentialRampToValueAtTime(50, t + dur);
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(0, t);
            ng.gain.linearRampToValueAtTime(0.6, t + 0.15);
            ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
            n.connect(f); f.connect(ng); ng.connect(g);
            n.start(t); n.stop(t + dur);
        }
        return { osc: null, duration: dur };
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
    lastPlayed: {},
    isUnlocking: false,

    reset() {
        this.stopBgmInterval();
        if (!this.ctx) {
            this.init();
        } else {
            this.resume();
        }
        if (this.bgmEl) {
            this.bgmEl.pause();
            this.bgmEl.currentTime = 0;
            this.bgmEl.src = "";
            this.currentSrc = null;
        }
        console.log("Audio System Soft Reset.");
    },

    init() {
        if (!this.ctx) {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) {
                    this.ctx = new AC();
                    this.createNoise();
                    this._unlockAudio();
                }
            } catch (e) { console.error("Audio init error:", e); }
        }

        if (!this.bgmEl) {
            this.bgmEl = new Audio();
            this.bgmEl.loop = true;
            this.bgmEl.volume = 0.4;
            this.bgmEl.setAttribute("playsinline", "");

            this.bgmEl.addEventListener('ended', () => {
                if (window.gameState === 'OST' && typeof window.playNextOST === 'function') {
                    window.playNextOST();
                } else if (this.bgmEl.loop) {
                    this.bgmEl.currentTime = 0;
                    this.bgmEl.play().catch(e => { });
                }
            });
        }
    },

    _unlockAudio() {
        if (!this.ctx || this.isUnlocking) return;
        if (this.ctx.state === 'running') return;
        this.isUnlocking = true;
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        this.ctx.resume().then(() => { this.isUnlocking = false; }).catch(() => { this.isUnlocking = false; });
    },

    async resume() {
        if (!this.ctx) { this.init(); return; }
        if (this.ctx.state === 'running') return;
        try {
            await this.ctx.resume();
            if (this.ctx.state !== 'running') this._unlockAudio();
        } catch (e) { }
    },

    createNoise() {
        if (!this.ctx) return;
        const bSize = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bSize; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buf;
    },

    registerNode(type, node, durationMs) {
        if (ONE_SHOT_SE.includes(type)) {
            setTimeout(() => {
                try { node.disconnect(); } catch (e) { }
            }, durationMs);
            return;
        }
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

    playSE(type) {
        if (!this.ctx) this.init();
        if (!this.ctx || !SE_LIBRARY[type]) return;

        const now = this.ctx.currentTime;
        if (this.lastPlayed[type] && now - this.lastPlayed[type] < 0.05) return;
        this.lastPlayed[type] = now;

        // もしコンテキストが停止(suspended)していたら、SEを鳴らすついでに再開を試みる
        if (this.ctx.state !== 'running') {
            this.ctx.resume().catch(() => { });
        }


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
        } catch (e) { }
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

    getNormalizedUrl(path) {
        return path ? new URL(path, window.location.href).href : "";
    },

    playBGM(key, idx = 0) {
        this.stopBgmInterval();
        if (!this.bgmEl) return;

        let src = "";
        if (key === 'stage') {
            if (BGM_FILES.stages && BGM_FILES.stages[idx]) {
                src = BGM_FILES.stages[idx];
            } else {
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
        if (this.currentSrc === nextFull && !this.bgmEl.paused) return;

        const isOST = (typeof window.gameState !== 'undefined' && window.gameState === 'OST');
        this.bgmEl.loop = !isOST;

        this.bgmEl.pause();
        this.bgmEl.src = src;
        this.currentSrc = src;
        this.bgmEl.currentTime = 0;
        this.bgmEl.volume = 0.4;
        this.bgmEl.play().catch(e => { });
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
            if (!this.bgmEl || this.bgmEl.paused) { resolve(); return; }
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
                    resolve();
                }
            }, 50);
        });
    },

    stopBGM() {
        this.stopBgmInterval();
        if (this.bgmEl) this.bgmEl.pause();
    },

    // ★重要修正：!!this.bgmEl.paused を !this.bgmEl.paused に修正
    // さらに、SE用コンテキストも一時停止させる
    pauseBGM() {
        // BGMの一時停止
        if (this.bgmEl && !this.bgmEl.paused) {
            this.bgmEl.pause();
        }
        // ★追加：SE用コンテキストの一時停止（これでワープ音も止まる）
        if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend().catch(e => { });
        }
    },

    // ★重要修正：再開時にSE用コンテキストも再開させる
    resumeBGM() {
        // BGMの再開
        if (this.bgmEl && this.bgmEl.paused && this.currentSrc != null && this.bgmEl.src) {
            this.bgmEl.play().catch(() => { });
        }
        // ★追加：SE用コンテキストの再開
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => { });
        }
    }
};

window.AudioSys = AudioSys;