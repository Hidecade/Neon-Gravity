// =========================================================
// Audio System Manager (Web Audio API Native Version)
// 役割: BGM・SEのすべてをWeb Audio APIで統合管理し、iOSの制限を回避する
// =========================================================

// 警告音の間隔設定
const WARNING_SOUND_INTERVAL = 48;

// ストップさせる必要がなく、鳴らしっぱなしで良いSEのリスト
const ONE_SHOT_SE = [
    'shoot', 'laser', 'enemy_hit',
    'explode_small', 'explode_medium', 'explode_large',
    'target_ping', 'launch', 'powerup', 'damage',
    'invincible', 'boss_hit', 'gravity',
    'boss_laser', 'boss_3way', 'boss_cross', 'boss_homing', 'boss_shockwave', 'boss_dash',
    'ark_laser', 'ark_fighter', 'ark_summon', 'ark_rotary'
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

const SE_VOLUME_CONFIG_KEYS = {
    shoot: 'player_shoot',
    laser: 'player_laser',
    homing: 'player_homing',
    launch: 'player_satellite_launch',
    powerup: 'player_powerup',
    damage: 'player_damage',
    invincible: 'player_invincible',
    coin: 'player_coin',
    coin_cyber: 'player_coin_cyber',
    point: 'player_score_point',

    gravity: 'enemy_gravity',
    enemy_hit: 'enemy_hit',
    lc_engine: 'enemy_lightcycle_engine',
    explode_small: 'enemy_explode_small',
    explode_medium: 'enemy_explode_medium',
    explode_large: 'enemy_explode_large',

    gravity_boss: 'boss_gravity',
    boss_hit: 'boss_hit',
    target_ping: 'boss_target_ping',
    warning: 'boss_warning',
    boss_laser: 'boss_laser',
    boss_3way: 'boss_3way',
    boss_cross: 'boss_cross',
    boss_homing: 'boss_homing',
    boss_shockwave: 'boss_shockwave',
    boss_dash: 'boss_dash',

    ark_laser: 'ark_laser',
    ark_fighter: 'ark_fighter',
    ark_summon: 'ark_summon',
    ark_rotary: 'ark_rotary',

    select: 'system_select',
    warp: 'system_warp',
    warp_in: 'system_warp_in'
};

const SE_BASE_VOLUME_MULTIPLIERS = {
    player_laser: 0.4,
    enemy_lightcycle_engine: 1.6,

    boss_hit: 0.8,
    boss_warning: 0.6,
    boss_laser: 1.4,
    boss_3way: 1.4,
    boss_cross: 1.8,
    boss_homing: 1.4,
    boss_shockwave: 1.4,
    boss_dash: 1.4,

    ark_laser: 1.6,
    ark_summon: 2.0,

    system_warp: 0.8
};

function getSEVolumeMultiplier(name) {
    const levels = (typeof SE_VOLUME_LEVELS !== 'undefined') ? SE_VOLUME_LEVELS : null;
    const configKey = SE_VOLUME_CONFIG_KEYS[name] || name;
    const rawLevel = levels && Number.isFinite(Number(levels[configKey])) ? Number(levels[configKey]) : 5;
    const level = Math.max(1, Math.min(10, rawLevel));
    const baseMult = SE_BASE_VOLUME_MULTIPLIERS[configKey] || 1.0;
    return baseMult * (level / 5);
}

// --- 1. SEの音響定義ライブラリ (変更なし) ---
const SE_LIBRARY = {
    gravity: (ctx, t, g, noise) => {
        const dur = 1.2;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(30, t);
        o.frequency.linearRampToValueAtTime(80, t + dur);
        
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.5, t + 0.1);
        env.gain.exponentialRampToValueAtTime(0.01, t + dur);
        
        o.connect(env); env.connect(g);
        o.start(t); o.stop(t + dur);

        if (noise) {
            const n = ctx.createBufferSource();
            n.buffer = noise;
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(150, t);
            f.frequency.exponentialRampToValueAtTime(3500, t + dur);
            f.Q.value = 6.0;

            const nEnv = ctx.createGain();
            nEnv.gain.setValueAtTime(0, t);
            nEnv.gain.linearRampToValueAtTime(0.8, t + 0.2);
            nEnv.gain.exponentialRampToValueAtTime(0.01, t + dur);

            n.connect(f); f.connect(nEnv); nEnv.connect(g);
            n.start(t); n.stop(t + dur);
        }
        return { osc: null, duration: dur };
    },
    gravity_boss: (ctx, t, g, noise, ratio = 1.0) => {
        const dur = 2.2; 

        // 1. 地鳴りのような低い振動
        const oscLow = ctx.createOscillator();
        oscLow.type = 'sawtooth';
        oscLow.frequency.setValueAtTime(40, t);
        oscLow.frequency.exponentialRampToValueAtTime(10, t + dur); 
        
        const envLow = ctx.createGain();
        envLow.gain.setValueAtTime(0, t);
        // ★ 引数で受け取った ratio を掛けて比例させる
        envLow.gain.linearRampToValueAtTime(0.6 * ratio, t + 0.2);
        envLow.gain.linearRampToValueAtTime(1.0 * ratio, t + dur - 0.2);
        envLow.gain.exponentialRampToValueAtTime(0.01, t + dur);
        
        oscLow.connect(envLow); envLow.connect(g);
        oscLow.start(t); oscLow.stop(t + dur);

        // 2. 吸い込まれるような上昇音
        const oscHigh = ctx.createOscillator();
        oscHigh.type = 'sine';
        oscHigh.frequency.setValueAtTime(100, t);
        oscHigh.frequency.exponentialRampToValueAtTime(1200, t + dur); 
        
        const envHigh = ctx.createGain();
        envHigh.gain.setValueAtTime(0, t);
        envHigh.gain.linearRampToValueAtTime(0.05 * ratio, t + 0.5);
        envHigh.gain.exponentialRampToValueAtTime(0.15 * ratio, t + dur - 0.2); 
        envHigh.gain.linearRampToValueAtTime(0.01, t + dur);
        
        oscHigh.connect(envHigh); envHigh.connect(g);
        oscHigh.start(t); oscHigh.stop(t + dur);

        // 3. 轟音ノイズ
        if (noise) {
            const n = ctx.createBufferSource();
            n.buffer = noise;
            n.loop = true; 
            
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(4000, t);
            f.frequency.exponentialRampToValueAtTime(200, t + dur); 
            f.Q.setValueAtTime(5.0, t);
            f.Q.linearRampToValueAtTime(1.0, t + dur); 

            const nEnv = ctx.createGain();
            nEnv.gain.setValueAtTime(0, t);
            // ★ ノイズの爆音にも ratio を掛ける
            nEnv.gain.linearRampToValueAtTime(1.5 * ratio, t + 0.1);
            nEnv.gain.exponentialRampToValueAtTime(0.08 * ratio, t + dur - 0.1); 
            nEnv.gain.linearRampToValueAtTime(0.01, t + dur);

            n.connect(f); f.connect(nEnv); nEnv.connect(g);
            n.start(t); n.stop(t + dur);
        }
        return { osc: null, duration: dur };
    },
    shoot: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        g.gain.setValueAtTime(0.06, t);
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
        g.gain.setValueAtTime(0.07, t);
        g.gain.linearRampToValueAtTime(0, t + 0.15);
        return { osc: o, duration: 0.15 };
    },
    homing: (ctx, t, g) => {
        const duration = 0.15;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(250, t);
        o.frequency.exponentialRampToValueAtTime(40, t + duration);

        const oGain = ctx.createGain();
        oGain.gain.setValueAtTime(0.05, t); 
        oGain.gain.linearRampToValueAtTime(0, t + duration);
        o.connect(oGain); oGain.connect(g);

        const bufferSize = ctx.sampleRate * duration;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.5; 
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t); 
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);
        filter.Q.value = 2.0; 

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.2, t); 
        nGain.gain.linearRampToValueAtTime(0, t + duration);

        noise.connect(filter); filter.connect(nGain); nGain.connect(g);
        o.start(t); o.stop(t + duration);
        noise.start(t); noise.stop(t + duration);
        return { osc: null, duration: duration };
    },
    boss_laser: (ctx, t, g) => {
        const dur = 0.22;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(520, t);
        o.frequency.exponentialRampToValueAtTime(1350, t + dur);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        return { osc: o, duration: dur };
    },
    boss_3way: (ctx, t, g) => {
        const dur = 0.12;
        [520, 650, 780].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const og = ctx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(freq, t + i * 0.018);
            og.gain.setValueAtTime(0.045, t + i * 0.018);
            og.gain.exponentialRampToValueAtTime(0.001, t + dur);
            o.connect(og); og.connect(g);
            o.start(t + i * 0.018); o.stop(t + dur);
        });
        return { osc: null, duration: dur };
    },
    boss_cross: (ctx, t, g) => {
        const dur = 0.16;
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(340, t);
        o.frequency.linearRampToValueAtTime(220, t + dur);
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        mod.type = 'square';
        mod.frequency.value = 36;
        modGain.gain.value = 80;
        mod.connect(modGain); modGain.connect(o.frequency);
        mod.start(t); mod.stop(t + dur);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        return { osc: o, duration: dur };
    },
    boss_homing: (ctx, t, g, noise) => {
        const dur = 0.35;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(900, t + dur);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.07, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(og); og.connect(g);
        o.start(t); o.stop(t + dur);
        if (noise) {
            const n = ctx.createBufferSource();
            const f = ctx.createBiquadFilter();
            const ng = ctx.createGain();
            n.buffer = noise;
            f.type = 'bandpass';
            f.frequency.setValueAtTime(900, t);
            f.frequency.exponentialRampToValueAtTime(2600, t + dur);
            ng.gain.setValueAtTime(0.10, t);
            ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
            n.connect(f); f.connect(ng); ng.connect(g);
            n.start(t); n.stop(t + dur);
        }
        return { osc: null, duration: dur };
    },
    boss_shockwave: (ctx, t, g, noise) => {
        const dur = 0.5;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(90, t);
        o.frequency.exponentialRampToValueAtTime(35, t + dur);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.18, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(og); og.connect(g);
        o.start(t); o.stop(t + dur);
        if (noise) {
            const n = ctx.createBufferSource();
            const f = ctx.createBiquadFilter();
            const ng = ctx.createGain();
            n.buffer = noise;
            f.type = 'lowpass';
            f.frequency.setValueAtTime(900, t);
            f.frequency.exponentialRampToValueAtTime(90, t + dur);
            ng.gain.setValueAtTime(0.35, t);
            ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
            n.connect(f); f.connect(ng); ng.connect(g);
            n.start(t); n.stop(t + dur);
        }
        return { osc: null, duration: dur };
    },
    boss_dash: (ctx, t, g, noise) => {
        const dur = 0.28;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(620, t + dur);
        g.gain.setValueAtTime(0.11, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        return { osc: o, duration: dur };
    },
    ark_laser: (ctx, t, g) => {
        const dur = 0.32;
        [110, 220, 880].forEach((freq) => {
            const o = ctx.createOscillator();
            const og = ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(freq, t);
            o.frequency.linearRampToValueAtTime(freq * 1.4, t + dur);
            og.gain.setValueAtTime(0.055, t);
            og.gain.exponentialRampToValueAtTime(0.001, t + dur);
            o.connect(og); og.connect(g);
            o.start(t); o.stop(t + dur);
        });
        return { osc: null, duration: dur };
    },
    ark_fighter: (ctx, t, g) => {
        const dur = 0.65;
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(260, t);
        o.frequency.exponentialRampToValueAtTime(1250, t + dur);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        return { osc: o, duration: dur };
    },
    ark_summon: (ctx, t, g, noise) => {
        const dur = 0.55;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(70, t);
        o.frequency.exponentialRampToValueAtTime(420, t + dur);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.12, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(og); og.connect(g);
        o.start(t); o.stop(t + dur);
        return { osc: null, duration: dur };
    },
    ark_rotary: (ctx, t, g) => {
        const dur = 0.18;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(260, t);
        o.frequency.linearRampToValueAtTime(360, t + dur);
        g.gain.setValueAtTime(0.055, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        return { osc: o, duration: dur };
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
                const volume = 0.10;
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
        g.gain.setValueAtTime(0.7, t);
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
        g.gain.setValueAtTime(1.7, t);
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
            const volume = i === 2 ? 0.9 : 0.6;
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
        const dur = 0.2;
        const o1 = ctx.createOscillator();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(600, t);
        o1.frequency.linearRampToValueAtTime(1800, t + dur);

        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(609, t);
        o2.frequency.linearRampToValueAtTime(1827, t + dur);

        g.gain.setValueAtTime(0.07, t);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o1.connect(g); o2.connect(g);
        o1.start(t); o1.stop(t + dur);
        o2.start(t); o2.stop(t + dur);
        return { osc: null, duration: dur };
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
        g.gain.setValueAtTime(0.2, t);
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
    lc_engine: (ctx, t, g) => {
        const dur = 1.5;
        const o1 = ctx.createOscillator();
        o1.type = 'sawtooth';
        o1.frequency.setValueAtTime(60, t);
        o1.frequency.exponentialRampToValueAtTime(120, t + dur);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(0, t);
        g1.gain.linearRampToValueAtTime(0.04, t + 0.5);
        g1.gain.linearRampToValueAtTime(0, t + dur);
        
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(400, t);
        o2.frequency.exponentialRampToValueAtTime(600, t + dur);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.02, t + 0.5);
        g2.gain.linearRampToValueAtTime(0, t + dur);

        o1.connect(g1); g1.connect(g);
        o2.connect(g2); g2.connect(g);
        o1.start(t); o1.stop(t + dur);
        o2.start(t); o2.stop(t + dur);
        return { osc: null, duration: dur };
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
    coin: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(1200, t);
        o.frequency.setValueAtTime(1600, t + 0.1);
        g.gain.setValueAtTime(0.08, t);
        g.gain.setValueAtTime(0.08, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        return { osc: o, duration: 0.45 };
    },
    coin_cyber: (ctx, t, g) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(400, t);
        o.frequency.exponentialRampToValueAtTime(3200, t + 0.15);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        return { osc: o, duration: 0.3 };
    },
    point: (ctx, t, g) => {
        const dur = 0.1;
        const o1 = ctx.createOscillator();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(600, t);
        o1.frequency.linearRampToValueAtTime(1800, t + dur);
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(609, t);
        o2.frequency.linearRampToValueAtTime(1827, t + dur);
        g.gain.setValueAtTime(0.05, t);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o1.connect(g); o2.connect(g);
        o1.start(t); o1.stop(t + dur);
        o2.start(t); o2.stop(t + dur);
        return { osc: null, duration: dur };
    },
};

const PCM_SE_CONFIG = {
    gravity: { duration: 1.2 },
    shoot: { duration: 0.1 },
    laser: { duration: 0.15 },
    homing: { duration: 0.15, variants: 3 },
    warning: { duration: 5.4 },
    explode_small: { duration: 0.4, variants: 3 },
    explode_medium: { duration: 2.0, variants: 2 },
    explode_large: { duration: 5.0, variants: 2 },
    target_ping: { duration: 0.05 },
    launch: { duration: 1.5 },
    powerup: { duration: 0.2 },
    damage: { duration: 0.2 },
    invincible: { duration: 0.5 },
    boss_hit: { duration: 0.18, variants: 4 },
    enemy_hit: { duration: 0.12, variants: 3 },
    boss_laser: { duration: 0.22 },
    boss_3way: { duration: 0.12 },
    boss_cross: { duration: 0.16 },
    boss_homing: { duration: 0.35 },
    boss_shockwave: { duration: 0.5 },
    boss_dash: { duration: 0.28 },
    ark_laser: { duration: 0.32 },
    ark_fighter: { duration: 0.65 },
    ark_summon: { duration: 0.55 },
    ark_rotary: { duration: 0.18 },
    lc_engine: { duration: 1.5 },
    select: { duration: 0.05 },
    warp: { duration: 1.2 },
    warp_in: { duration: 2.2 },
    coin: { duration: 0.45 },
    coin_cyber: { duration: 0.3 },
    point: { duration: 0.1 }
};

// --- 2. メインのオーディオシステム (Web Audio API リファクタリング版) ---

const AudioSys = {
    ctx: null,
    noiseBuffer: null,
    seBuffers: {},
    seBuffersReady: false,
    seBuffersPreparing: false,
    activeNodes: [],
    lastPlayed: {},
    isUnlocking: false,
    _lifecycleHooksInstalled: false,
    keepAliveNode: null,

    // BGM管理用プロパティ
    bgmBuffers: {},       // デコード済みのAudioBufferをキャッシュ
    bgmSource: null,      // 現在再生中のAudioBufferSourceNode
    bgmGain: null,        // BGM用のGainNode（フェード・音量制御）
    currentBgmRawKey: null,  // 再生中のBGMキー
    currentBgmUrl: null,     // 再生中の完全なURL
    bgmVolume: 1.0,       // BGMの基本音量
    bgmStartTime: 0,      // BGM再生開始時刻 (ctx.currentTime)
    bgmOffset: 0,         // 一時停止時の再生位置（秒）
    isBgmPaused: false,   // ポーズ状態フラグ
    isBgmFadingOut: false, // フェードアウト実行中フラグ

    reset() {
        this.stopBGM();
        if (!this.ctx) {
            this.init();
        } else {
            this.resume(false);
        }
        console.log("Audio System Soft Reset.");
    },

    init() {
        if (!this.ctx) {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) {
                    this.ctx = new AC({ sampleRate: 44100 });
                    this.createNoise();
                    this.prepareSEBuffers();
                }
            } catch (e) {
                console.error("Audio init error:", e);
            }
        }
        this.installLifecycleHooks();
    },

    async ensureAudioReady(fromUserGesture = false) {
        if (!this.ctx) this.init();
        if (!this.ctx) return false;

        try {
            if (this.ctx.state !== "running") {
                if (!fromUserGesture) return false;
                await this.ctx.resume().catch(() => { });
            }
            if (this.ctx.state === "running" && fromUserGesture) {
                this._unlockAudio();
            }
            return this.ctx.state === "running";
        } catch (e) {
            return false;
        }
    },

    _unlockAudio() {
        if (!this.ctx || this.isUnlocking) return;
        if (this.ctx.state !== "running") return;
        if (this.ctx.state === "running" && this.keepAliveNode) return;

        this.isUnlocking = true;
        try {
            if (!this.keepAliveNode) {
                const silentBuffer = this.ctx.createBuffer(1, 44100, 44100);
                this.keepAliveNode = this.ctx.createBufferSource();
                this.keepAliveNode.buffer = silentBuffer;
                this.keepAliveNode.loop = true;
                const lowGain = this.ctx.createGain();
                lowGain.gain.value = 0.01;
                this.keepAliveNode.connect(lowGain);
                lowGain.connect(this.ctx.destination);
                this.keepAliveNode.start(0);
            }

            const buffer = this.ctx.createBuffer(1, 1, 22050);
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.ctx.destination);
            source.start(0);

            this.isUnlocking = false;
        } catch (e) {
            this.isUnlocking = false;
        }
    },

    async resume(fromUserGesture = false) {
        return await this.ensureAudioReady(fromUserGesture);
    },

    createNoiseBufferForContext(targetCtx, seconds = 2) {
        const bSize = Math.max(1, Math.floor(targetCtx.sampleRate * seconds));
        const buf = targetCtx.createBuffer(1, bSize, targetCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buf;
    },

    createNoise() {
        if (!this.ctx) return;
        this.noiseBuffer = this.createNoiseBufferForContext(this.ctx, 2);
    },

    connectSEOutput(inputNode, x = null, y = null) {
        if (!this.ctx) return inputNode;

        let outputNode = inputNode;
        if (x !== null && y !== null && typeof player !== 'undefined' && typeof width !== 'undefined' && this.ctx.createStereoPanner) {
            const dx = x - player.x;
            const camScale = (typeof cameraScale !== 'undefined') ? cameraScale : 1.0;
            const panLimit = (width / camScale) * 0.45;
            const panner = this.ctx.createStereoPanner();
            panner.pan.value = Math.max(-1.0, Math.min(1.0, dx / panLimit));
            inputNode.connect(panner);
            outputNode = panner;
        }

        outputNode.connect(this.ctx.destination);
        return outputNode;
    },

    async prepareSEBuffers() {
        if (!this.ctx || this.seBuffersPreparing || this.seBuffersReady) return;

        const OfflineAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OfflineAC) return;

        this.seBuffersPreparing = true;
        const renderedBuffers = {};

        try {
            for (const [name, config] of Object.entries(PCM_SE_CONFIG)) {
                if (!SE_LIBRARY[name]) continue;

                const variants = Math.max(1, config.variants || 1);
                renderedBuffers[name] = [];

                for (let i = 0; i < variants; i++) {
                    const buffer = await this.renderSEBuffer(name, config.duration, OfflineAC);
                    if (buffer) renderedBuffers[name].push(buffer);
                }

                if (renderedBuffers[name].length === 0) {
                    delete renderedBuffers[name];
                }
            }

            this.seBuffers = renderedBuffers;
            this.seBuffersReady = true;
        } catch (e) {
            console.warn("SE PCM cache build failed:", e);
        } finally {
            this.seBuffersPreparing = false;
        }
    },

    async renderSEBuffer(name, duration, OfflineAC) {
        const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
        const renderDuration = Math.max(0.05, duration + 0.05);
        const frameCount = Math.ceil(sampleRate * renderDuration);
        const offlineCtx = new OfflineAC(1, frameCount, sampleRate);
        const g = offlineCtx.createGain();
        g.connect(offlineCtx.destination);

        try {
            const noise = this.createNoiseBufferForContext(offlineCtx, Math.max(2, renderDuration));
            const effect = SE_LIBRARY[name](offlineCtx, 0, g, noise, 1.0);

            if (effect && effect.osc) {
                effect.osc.connect(g);
                effect.osc.start(0);
                effect.osc.stop(effect.duration);
            }

            return await offlineCtx.startRendering();
        } catch (e) {
            console.warn(`SE PCM render failed: ${name}`, e);
            return null;
        }
    },

    playCachedSE(name, masterGain, outputNode = masterGain) {
        const variants = this.seBuffers[name];
        if (!variants || variants.length === 0) return false;

        const source = this.ctx.createBufferSource();
        source.buffer = variants[Math.floor(Math.random() * variants.length)];
        source.connect(masterGain);
        source.start(this.ctx.currentTime);

        const cleanupTime = Math.max(2000, source.buffer.duration * 1000 + 100);
        this.registerNode(name, masterGain, cleanupTime, outputNode);
        return true;
    },

    installLifecycleHooks() {
        if (this._lifecycleHooksInstalled) return;
        this._lifecycleHooksInstalled = true;

        if (this.ctx) {
            this.ctx.onstatechange = () => {
                // 【削除】interrupted 時に非同期で復帰を試みるとiOSで永久ロックされるため何もしない
            };
        }

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                // 背景移行時にAudioContextを一時停止させる
                if (this.ctx && this.ctx.state === 'running') {
                    this.ctx.suspend().catch(()=>{});
                }
            }
            // 【削除】復帰時 (!document.hidden) の非同期 resume 呼び出しを削除（次のタップイベントに任せる）
        });

        // 完全同期ジェスチャーハンドラ (async/await不使用)
        const resumeFromGestureSync = () => {
            if (this.ctx && this.ctx.state !== "running") {
                this.ctx.resume().catch(() => {});
                return;
            }

            if (this.ctx && this.ctx.state === "running") {
                this._unlockAudio();
            }
        };

        // キャプチャフェーズ(capture: true)で登録し、他のボタン(ポーズ解除など)の処理より先に確実に実行させる
        window.addEventListener("touchstart", resumeFromGestureSync, { passive: true, capture: true });
        window.addEventListener("touchend", resumeFromGestureSync, { passive: true, capture: true });
        window.addEventListener("click", resumeFromGestureSync, { passive: true, capture: true });
        window.addEventListener("keydown", resumeFromGestureSync, { passive: true, capture: true });
    },

    registerNode(type, node, durationMs, disconnectNode = node) {
        if (ONE_SHOT_SE.includes(type)) {
            setTimeout(() => {
                try { disconnectNode.disconnect(); } catch (e) { }
            }, durationMs);
            return;
        }

        const nodeRef = { type, node, disconnectNode };
        this.activeNodes.push(nodeRef);

        setTimeout(() => {
            const index = this.activeNodes.indexOf(nodeRef);
            if (index > -1) {
                try { disconnectNode.disconnect(); } catch (e) { }
                this.activeNodes.splice(index, 1);
            }
        }, durationMs);
    },

    playSE: function(name, x = null, y = null, customParam = 1.0) {
        if (!this.ctx || this.isMuted) return;
        
        if (!this.ctx) this.init();
        // ★修正: `type` になっていた部分をすべて引数である `name` に統一しました
        if (!this.ctx || !SE_LIBRARY[name]) return;
        if (document.hidden) return;

        if (this.ctx.state !== "running") {
            this.ensureAudioReady(false).catch(() => {});
            return;
        }

        const realNow = performance.now();
        if (this.lastPlayed[name] && realNow - this.lastPlayed[name] < 50) return;
        this.lastPlayed[name] = realNow;

        const masterGain = this.ctx.createGain();
        masterGain.gain.value = 2.5 * getSEVolumeMultiplier(name);

        // --- 距離の計算 ---
        if (x !== null && y !== null && typeof player !== 'undefined' && typeof width !== 'undefined') {
            const dx = x - player.x;
            const dy = y - player.y;
            const dist = Math.hypot(dx, dy);
            
            const camScale = (typeof cameraScale !== 'undefined') ? cameraScale : 1.0;
            const screenDiag = Math.hypot(width / camScale, height / camScale);
            const maxDist = screenDiag * 1.2; 

            let volMult = 1.0 - (dist / maxDist);
            volMult = Math.max(0.4, Math.min(1.0, volMult));
            masterGain.gain.value *= Math.pow(volMult, 0.6); 
        }

        const outputNode = this.connectSEOutput(masterGain, x, y);

        if (this.seBuffersReady && customParam === 1.0 && this.playCachedSE(name, masterGain, outputNode)) {
            return;
        }

        const t = this.ctx.currentTime;
        const g = this.ctx.createGain();
        g.connect(masterGain);

        try {
            // ==========================================
            // ★最重要修正: ここで customParam をシンセ関数に渡す！
            // ==========================================
            const effect = SE_LIBRARY[name](this.ctx, t, g, this.noiseBuffer, customParam);
            
            if (effect.osc) {
                effect.osc.connect(g);
                effect.osc.start(t);
                effect.osc.stop(t + effect.duration);
            }
            const cleanupTime = Math.max(2000, effect.duration * 1000 + 500);
            this.registerNode(name, g, cleanupTime, outputNode);
        } catch (e) { 
            console.error("SE Error:", e);
        }
    },

    stopSE(targetType = null) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.activeNodes = this.activeNodes.filter(item => {
            if (!targetType || item.type === targetType) {
                this.fadeAndDisconnect(item.node, item.disconnectNode, t);
                return false;
            }
            return true;
        });
    },

    fadeAndDisconnect(gainNode, disconnectNode, time) {
        try {
            gainNode.gain.cancelScheduledValues(time);
            gainNode.gain.setValueAtTime(gainNode.gain.value, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            setTimeout(() => {
                try { (disconnectNode || gainNode).disconnect(); } catch (e) { }
            }, 100);
        } catch (e) { }
    },

    getBgmPath(key, idx) {
        if (key === "stage") {
            if (BGM_FILES.stages && BGM_FILES.stages.length > 0) {
                // 配列の長さを超えた場合は最初に戻るように剰余(%)を使用
                return BGM_FILES.stages[idx % BGM_FILES.stages.length];
            }
            return "";
        }
        return BGM_FILES[key] || "";
    },

    // BGMデータをネットワークから取得してデコードする
    async loadBGM(url) {
        if (!this.ctx) this.init();
        if (this.bgmBuffers[url]) return this.bgmBuffers[url];

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.bgmBuffers[url] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.error("BGM Load/Decode Error:", e);
            return null;
        }
    },

    // 指定されたバッファを使ってソースノードを構築し再生する
    _startBgmNode(buffer, key, offset = 0) {
        if (!this.ctx) return;
        
        this.bgmSource = this.ctx.createBufferSource();
        this.bgmSource.buffer = buffer;
        const source = this.bgmSource;

        // ループ判定のロジックを継承
        const isOST = (typeof gameState !== "undefined" && gameState === "OST");
        const noLoopKeys = ["ending", "clear", "all_clear", "name"];
        source.loop = !(isOST || noLoopKeys.includes(key));

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmVolume;

        source.connect(this.bgmGain);
        this.bgmGain.connect(this.ctx.destination);

        // オフセット位置から再生
        source.start(0, offset);
        
        // 再生開始基準時間を記録（オフセット分を引いて計算）
        this.bgmStartTime = this.ctx.currentTime - offset;
        this.isBgmFadingOut = false;

        // 再生終了時の処理（ループしない曲やOST用）
        source.onended = () => {
            const isCurrentSource = this.bgmSource === source;

            if (isCurrentSource) {
                this.bgmSource = null;
            }

            if (!isCurrentSource || this.isBgmPaused || this.isBgmFadingOut || source.loop) {
                return;
            }

            if (typeof gameState !== "undefined" && gameState === "OST" && typeof window.playNextOST === "function") {
                window.playNextOST();
            }
        };
    },

    async playBGM(key, idx = 0) {
        if (!this.ctx) this.init();
        if (this.ctx.state !== "running") await this.ensureAudioReady(true);

        const src = this.getBgmPath(key, idx);
        if (!src) {
            this.stopBGM();
            return;
        }

        const nextFull = new URL(src, window.location.href).href;

        // すでに同じ曲が再生中で、ポーズ中でもない場合は何もしない
        if (this.currentBgmUrl === nextFull && !this.isBgmPaused && !this.isBgmFadingOut) {
            return;
        }

        // 次の曲への意図を記録（複数回非同期で呼ばれた場合の競合防止）
        this.currentBgmRawKey = key;
        this.currentBgmUrl = nextFull;

        const buffer = await this.loadBGM(nextFull);
        if (!buffer) return;

        // ロード中に別の曲が要求されていたら中断
        if (this.currentBgmUrl !== nextFull) return;

        // 既存のBGMを完全に停止
        this.stopBGM(false); // URLやKeyは消さない

        this.isBgmPaused = false;
        this._startBgmNode(buffer, key, 0);
    },

    stopBGM(clearCurrentInfo = true) {
        if (this.bgmSource) {
            // ★追加：停止させる前に onended イベントを無効化し、意図しない曲送りを防ぐ
            this.bgmSource.onended = null; 
            
            try { this.bgmSource.stop(); } catch(e){}
            try { this.bgmSource.disconnect(); } catch(e){}
            this.bgmSource = null;
        }
        if (this.bgmGain) {
            try { this.bgmGain.disconnect(); } catch(e){}
            this.bgmGain = null;
        }
        
        this.isBgmPaused = false;
        this.bgmOffset = 0;

        if (clearCurrentInfo) {
            this.currentBgmUrl = null;
            this.currentBgmRawKey = null;
        }
    },

    pauseBGM() {
        if (this.bgmSource && !this.isBgmPaused) {
            // 現在の再生位置(経過秒数)を保存
            this.bgmOffset = this.ctx.currentTime - this.bgmStartTime;
            
            this.bgmSource.onended = null;
            try { this.bgmSource.stop(); } catch(e){}
            try { this.bgmSource.disconnect(); } catch(e){}
            this.bgmSource = null;
            
            this.isBgmPaused = true;
        }
    },

    async resumeBGM(fromUserGesture = false) {
        await this.ensureAudioReady(fromUserGesture);

        if (this.isBgmPaused && this.currentBgmUrl) {
            const buffer = this.bgmBuffers[this.currentBgmUrl];
            if (buffer) {
                this.isBgmPaused = false;
                // バッファの長さを超えていた場合の安全策（ループ処理用）
                let offset = this.bgmOffset % buffer.duration;
                this._startBgmNode(buffer, this.currentBgmRawKey, offset);
            }
        }
    },

    fadeOutBGM() {
        return new Promise((resolve) => {
            if (!this.bgmGain || !this.bgmSource || this.isBgmPaused) {
                resolve();
                return;
            }

            this.isBgmFadingOut = true;
            const t = this.ctx.currentTime;
            
            // AudioParamを使って滑らかにフェードアウト（1.5秒かけて音量を0へ）
            this.bgmGain.gain.cancelScheduledValues(t);
            this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, t);
            this.bgmGain.gain.linearRampToValueAtTime(0, t + 1.5);

            setTimeout(() => {
                this.stopBGM(true);
                resolve();
            }, 1500);
        });
    },

    forceWakeUp: function() {
        if (!this.ctx) return;
        try {
            if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
                this.ctx.resume().catch(() => {});
            }
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(0);
            osc.stop(this.ctx.currentTime + 0.1);
        } catch (e) {
            console.warn("AudioContext wake up failed:", e);
        }
    },
};

window.AudioSys = AudioSys;
