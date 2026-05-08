// ==========================================
// BOSS AI
// ==========================================

const BOSS_PROJECTILE_SPEED_MULT = 1.15;
const BOSS_ANGER_MAX_BONUS = 0.9;
const BATTLESHIP_PROJECTILE_SPEED_MULT = 1.05;
const BOSS_REACTOR_DEAD_COLOR = '#050505';
const BOSS_CORE_HP_RATIO = 0.25;
const BATTLESHIP_CORE_HP_RATIO = 0.10;

function initBossReactors(e) {
    if (!e || !e.variant || !Number.isFinite(e.maxHp)) return;
    const sides = Math.max(1, e.variant.sides || 1);
    if (Array.isArray(e.reactors) && e.reactors.length === sides) return;

    const coreHpRatio = e.type === 'battleship' ? BATTLESHIP_CORE_HP_RATIO : BOSS_CORE_HP_RATIO;
    const coreHp = e.maxHp * coreHpRatio;
    const reactorTotalHp = e.maxHp - coreHp;
    const hpPerReactor = reactorTotalHp / sides;
    e.reactors = Array.from({ length: sides }, (_, index) => ({
        index,
        hp: hpPerReactor,
        maxHp: hpPerReactor,
        destroyed: false,
        flashTimer: 0
    }));
    e.coreHp = coreHp;
    e.coreMaxHp = e.coreHp;
    e.coreExposed = false;
    e.coreFlashTimer = 0;
    e.coreAttackTimer = 0;
    e.hp = e.maxHp;
}

function getBossReactorLayout(e) {
    const isBattleship = e && e.type === 'battleship';
    return isBattleship
        ? { baseRadius: 90, moduleOffset: 12, moduleScale: 0.8, reactorLocalY: -1, radius: 18 }
        : { baseRadius: 45, moduleOffset: 5, moduleScale: 0.5, reactorLocalY: -1, radius: 12 };
}

function getBossReactorWorldPosition(e, index) {
    const sides = Math.max(1, (e.variant && e.variant.sides) || 1);
    const layout = getBossReactorLayout(e);
    const shipScale = e.scale * G_SCALE * (e.type === 'battleship' ? 1.5 : 1);
    const localY = -layout.baseRadius + layout.moduleOffset + (layout.reactorLocalY * layout.moduleScale);
    const localAngle = (Math.PI * 2 / sides) * index - Math.PI / 2;
    const angle = localAngle + (e.angle || 0);

    return {
        x: e.x + Math.cos(angle) * Math.abs(localY) * shipScale,
        y: e.y + Math.sin(angle) * Math.abs(localY) * shipScale,
        radius: layout.radius * shipScale
    };
}

function syncBossHpFromReactors(e) {
    if (!e || !Array.isArray(e.reactors)) return;
    const reactorHp = e.reactors.reduce((sum, reactor) => sum + Math.max(0, reactor.hp), 0);
    e.hp = reactorHp + Math.max(0, e.coreHp || 0);
}

function getBossCoreWorldPosition(e) {
    const shipScale = (e.scale || 1) * G_SCALE * (e.type === 'battleship' ? 1.5 : 1);
    return {
        x: e.x,
        y: e.y,
        radius: (e.type === 'battleship' ? 30 : 18) * shipScale
    };
}

function areAllBossReactorsDestroyed(e) {
    return !!(e && Array.isArray(e.reactors) && e.reactors.length > 0 && e.reactors.every(reactor => reactor.destroyed));
}

function isBossReactorOperationalForShot(e, shotIndex, shotCount) {
    if (!e || !Array.isArray(e.reactors) || e.reactors.length === 0) return true;
    const safeShotCount = Math.max(1, shotCount || e.reactors.length);
    const reactorIndex = Math.round((shotIndex / safeShotCount) * e.reactors.length) % e.reactors.length;
    const reactor = e.reactors[reactorIndex];
    return !(reactor && reactor.destroyed);
}

function exposeBossCore(e) {
    if (!e || e.coreExposed) return;
    e.coreExposed = true;
    e.coreAttackTimer = 0;
    e.coreFlashTimer = 18;

    const core = getBossCoreWorldPosition(e);
    if (typeof spawnRingObj === 'function') {
        spawnRingObj({ x: core.x, y: core.y, r: core.radius * 2.3, color: e.color || '#ff3344', life: 0.75, lineWidth: 5 });
    }
    if (typeof createExplosion === 'function') createExplosion(core.x, core.y, e.color || '#ff3344', 12);
    if (typeof distortGrid === 'function') distortGrid(core.x, core.y, 120, core.radius * 8);
}

function damageBossCore(e, damage, hitX, hitY) {
    if (!e || !e.coreExposed || e.coreHp <= 0) return false;

    e.coreHp = Math.max(0, (e.coreHp || 0) - damage);
    e.coreFlashTimer = 8;
    e.flashTimer = 5;

    if (typeof spawnParticleObj === 'function') {
        const core = getBossCoreWorldPosition(e);
        const burstCount = e.type === 'battleship' ? 34 : 24;
        for (let i = 0; i < burstCount; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = (4 + Math.random() * 14) * SPEED_SCALE;
            const originMix = Math.random();
            spawnParticleObj({
                x: hitX * originMix + core.x * (1 - originMix) + (Math.random() - 0.5) * core.radius * 0.8,
                y: hitY * originMix + core.y * (1 - originMix) + (Math.random() - 0.5) * core.radius * 0.8,
                vx: Math.cos(a) * spd + e.vx * 0.15,
                vy: Math.sin(a) * spd + e.vy * 0.15,
                color: Math.random() > 0.45 ? '#ffffff' : (Math.random() > 0.35 ? '#ff3344' : (e.color || '#ff3344')),
                life: 0.28 + Math.random() * 0.55,
                size: (1.5 + Math.random() * 3.6) * G_SCALE
            });
        }
        for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = (1.5 + Math.random() * 5) * SPEED_SCALE;
            spawnParticleObj({
                x: core.x + Math.cos(a) * core.radius * 0.5,
                y: core.y + Math.sin(a) * core.radius * 0.5,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                color: '#ff1028',
                life: 0.55 + Math.random() * 0.55,
                size: (3.0 + Math.random() * 3.5) * G_SCALE
            });
        }
    }
    if (typeof spawnRingObj === 'function') {
        const core = getBossCoreWorldPosition(e);
        spawnRingObj({ x: core.x, y: core.y, r: core.radius * 0.9, color: '#ffffff', life: 0.18, lineWidth: 4 });
        spawnRingObj({ x: core.x, y: core.y, r: core.radius * 1.8, color: '#ff3344', life: 0.3, lineWidth: 3 });
    }

    syncBossHpFromReactors(e);
    if (e.coreHp <= 0) e.hp = 0;
    return true;
}

function damageBossReactor(e, reactor, damage, hitX, hitY) {
    if (!e || !reactor || reactor.destroyed) return false;

    reactor.hp -= damage;
    reactor.flashTimer = 6;
    e.flashTimer = 4;

    if (reactor.hp <= 0) {
        reactor.hp = 0;
        reactor.destroyed = true;
        if (typeof createExplosion === 'function') {
            createExplosion(hitX, hitY, '#f22', 10);
            createExplosion(hitX, hitY, '#fd0', 4);
        }
        if (typeof spawnRingObj === 'function') {
            spawnRingObj({ x: hitX, y: hitY, r: 12 * G_SCALE, color: '#fd0', life: 0.28 });
            spawnRingObj({ x: hitX, y: hitY, r: 22 * G_SCALE, color: '#f22', life: 0.55 });
        }
        for (let i = 0; i < 22; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = (2 + Math.random() * 8) * SPEED_SCALE;
            spawnParticleObj({
                x: hitX,
                y: hitY,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                color: Math.random() > 0.35 ? '#ff3344' : '#f6de00',
                life: 0.45 + Math.random() * 0.55,
                size: (1.6 + Math.random() * 2.8) * G_SCALE
            });
        }
        for (let i = 0; i < 84; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = (5 + Math.random() * 16) * SPEED_SCALE;
            const sparkColor = Math.random() > 0.42 ? '#ffffff' : (Math.random() > 0.35 ? '#ffee88' : (e.color || '#ff3344'));
            spawnParticleObj({
                x: hitX + (Math.random() - 0.5) * 16 * G_SCALE,
                y: hitY + (Math.random() - 0.5) * 16 * G_SCALE,
                vx: e.vx * 0.25 + Math.cos(a) * spd,
                vy: e.vy * 0.25 + Math.sin(a) * spd,
                color: sparkColor,
                life: 0.42 + Math.random() * 0.68,
                size: (1.9 + Math.random() * 3.4) * G_SCALE
            });
        }
        reactor.sparkTimer = 0;
        reactor.counterLaserTimer = -reactor.index * 11;
    }

    if (areAllBossReactorsDestroyed(e)) exposeBossCore(e);
    syncBossHpFromReactors(e);
    if (e.hp <= 0) e.hp = 0;
    return true;
}

function updateBossReactorSparks(e) {
    if (!e || !Array.isArray(e.reactors) || e.isDying || e.isDead || e.isSpawning) return;

    for (const reactor of e.reactors) {
        if (!reactor.destroyed) continue;
        reactor.sparkTimer = (reactor.sparkTimer || 0) + 1;
        updateDestroyedReactorCounterLaser(e, reactor);
        const interval = e.type === 'battleship' ? 1 : 2;
        if (reactor.sparkTimer % interval !== 0) continue;

        const pos = getBossReactorWorldPosition(e, reactor.index);
        const count = e.type === 'battleship' ? 15 : 12;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = (3.5 + Math.random() * 12.5) * SPEED_SCALE;
            const sparkColor = Math.random() > 0.38 ? '#ffffff' : (Math.random() > 0.35 ? '#ffee88' : (e.color || '#ff3344'));
            spawnParticleObj({
                x: pos.x + (Math.random() - 0.5) * pos.radius * 1.35,
                y: pos.y + (Math.random() - 0.5) * pos.radius * 1.35,
                vx: e.vx * 0.2 + Math.cos(a) * spd,
                vy: e.vy * 0.2 + Math.sin(a) * spd,
                color: sparkColor,
                life: 0.3 + Math.random() * 0.52,
                size: (1.6 + Math.random() * 2.9) * G_SCALE
            });
        }
        if (reactor.sparkTimer % (e.type === 'battleship' ? 4 : 6) === 0 && typeof spawnRingObj === 'function') {
            spawnRingObj({ x: pos.x, y: pos.y, r: pos.radius * 0.35, color: '#ffffff', life: 0.22, lineWidth: 4 });
            spawnRingObj({ x: pos.x, y: pos.y, r: pos.radius * 0.75, color: e.color || '#ff3344', life: 0.28, lineWidth: 4 });
        }
    }
}

function updateDestroyedReactorCounterLaser(e, reactor) {
    if (!e || e.type !== 'battleship' || !reactor || !reactor.destroyed) return;
    if (gameState !== 'PLAYING' && gameState !== 'DYING') return;

    reactor.counterLaserTimer = (reactor.counterLaserTimer || 0) + 1;
    const interval = 150;
    const warningFrame = interval - 26;
    const phase = ((reactor.counterLaserTimer % interval) + interval) % interval;
    const pos = getBossReactorWorldPosition(e, reactor.index);

    if (phase === warningFrame && typeof spawnRingObj === 'function') {
        spawnRingObj({ x: pos.x, y: pos.y, r: pos.radius * 1.05, color: '#ff3344', life: 0.36, lineWidth: 4 });
        spawnRingObj({ x: pos.x, y: pos.y, r: pos.radius * 1.85, color: '#ffffff', life: 0.28, lineWidth: 2 });
    }

    if (phase !== 0) return;

    const shotAngle = Math.atan2(player.y - pos.y, player.x - pos.x);
    const bulletSpd = 19 * SPEED_SCALE * BATTLESHIP_PROJECTILE_SPEED_MULT;
    for (let i = -1; i <= 1; i++) {
        const a = shotAngle + i * 0.11;
        spawnEnemyBulletObj({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(a) * bulletSpd,
            vy: Math.sin(a) * bulletSpd,
            life: 170,
            color: '#ff3344',
            isLaserMissile: true
        });
    }

    if (typeof spawnRingObj === 'function') {
        spawnRingObj({ x: pos.x, y: pos.y, r: pos.radius * 1.3, color: '#ff3344', life: 0.24, lineWidth: 4 });
    }
    if (typeof distortGrid === 'function') distortGrid(pos.x, pos.y, 36, pos.radius * 3.2);
    if (typeof AudioSys !== 'undefined' && isOnScreen(e)) AudioSys.playSE('ark_laser', pos.x, pos.y);
}

function hitBossReactorAtPoint(e, x, y, damage) {
    if (!e || (e.type !== 'boss' && e.type !== 'battleship')) return false;
    initBossReactors(e);
    if (!Array.isArray(e.reactors)) return false;

    if (e.coreExposed) {
        const core = getBossCoreWorldPosition(e);
        const cdx = x - core.x;
        const cdy = y - core.y;
        if (cdx * cdx + cdy * cdy <= core.radius * core.radius) {
            return damageBossCore(e, damage, x, y);
        }
    }

    for (const reactor of e.reactors) {
        if (reactor.destroyed) continue;
        const pos = getBossReactorWorldPosition(e, reactor.index);
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy <= pos.radius * pos.radius) {
            return damageBossReactor(e, reactor, damage, pos.x, pos.y);
        }
    }
    return false;
}

function damageBossReactorsInRadius(e, x, y, radius, damage) {
    if (!e || (e.type !== 'boss' && e.type !== 'battleship')) return false;
    initBossReactors(e);
    if (!Array.isArray(e.reactors)) return false;

    const hitReactors = [];
    for (const reactor of e.reactors) {
        if (reactor.destroyed) continue;
        const pos = getBossReactorWorldPosition(e, reactor.index);
        const hitRadius = radius + pos.radius;
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
            hitReactors.push({ reactor, pos });
        }
    }

    if (hitReactors.length === 0 && e.coreExposed) {
        const core = getBossCoreWorldPosition(e);
        const hitRadius = radius + core.radius;
        const dx = x - core.x;
        const dy = y - core.y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
            return damageBossCore(e, damage, core.x, core.y);
        }
    }

    if (hitReactors.length === 0) return false;

    const distributedDamage = damage / hitReactors.length;
    hitReactors.forEach(({ reactor, pos }) => {
        damageBossReactor(e, reactor, distributedDamage, pos.x, pos.y);
    });
    return true;
}

function hitBossReactorOnSegment(e, x1, y1, x2, y2, damage) {
    if (!e || (e.type !== 'boss' && e.type !== 'battleship')) return null;
    initBossReactors(e);
    if (!Array.isArray(e.reactors)) return null;

    const sx = x2 - x1;
    const sy = y2 - y1;
    const lenSq = sx * sx + sy * sy || 1;
    let best = null;

    if (e.coreExposed) {
        const core = getBossCoreWorldPosition(e);
        const t = Math.max(0, Math.min(1, ((core.x - x1) * sx + (core.y - y1) * sy) / lenSq));
        const hx = x1 + sx * t;
        const hy = y1 + sy * t;
        const dx = core.x - hx;
        const dy = core.y - hy;
        if (dx * dx + dy * dy <= core.radius * core.radius) {
            const distAlong = Math.sqrt((hx - x1) * (hx - x1) + (hy - y1) * (hy - y1));
            damageBossCore(e, damage, hx, hy);
            return { reactor: null, core: true, x: hx, y: hy, distAlong };
        }
    }

    for (const reactor of e.reactors) {
        if (reactor.destroyed) continue;
        const pos = getBossReactorWorldPosition(e, reactor.index);
        const t = Math.max(0, Math.min(1, ((pos.x - x1) * sx + (pos.y - y1) * sy) / lenSq));
        const hx = x1 + sx * t;
        const hy = y1 + sy * t;
        const dx = pos.x - hx;
        const dy = pos.y - hy;
        if (dx * dx + dy * dy <= pos.radius * pos.radius) {
            const distAlong = Math.sqrt((hx - x1) * (hx - x1) + (hy - y1) * (hy - y1));
            if (!best || distAlong < best.distAlong) {
                best = { reactor, x: hx, y: hy, distAlong };
            }
        }
    }

    if (!best) return null;
    damageBossReactor(e, best.reactor, damage, best.x, best.y);
    return best;
}

function getBossHomingLaserShotCount() {
    if (stage <= 2) return 2;
    if (stage <= 4) return 3;
    return 3;
}

function isBossHomingLaserShotFrame(timer, shotCount, attackFrames) {
    for (let i = 1; i <= shotCount; i++) {
        const shotFrame = Math.round((attackFrames / (shotCount + 1)) * i);
        if (timer === shotFrame) return true;
    }
    return false;
}

function updateBossCombatMovement(e, options = {}) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1.0;

    const orbitDir = e.orbitDir || 1;
    const desiredRadius = options.desiredRadius || 360;
    const radiusTolerance = options.radiusTolerance || 95;
    const approachAccel = options.approachAccel || 0.024;
    const strafeAccel = options.strafeAccel || 0.045;
    const retreatAccel = options.retreatAccel || 0.02;
    const friction = options.friction || 0.972;
    const maxSpeed = options.maxSpeed || (e.speed * 2.2);
    const margin = options.margin || 110;
    const radiusCorrectionAccel = options.radiusCorrectionAccel || 0.0009;

    let moveNx = dx / dist;
    let moveNy = dy / dist;

    const holdPosition = !!options.holdPosition;
    const forceApproach = !!options.forceApproach;
    const brakePosition = !!options.brakePosition;

    if (holdPosition) {
        const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
        const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
        if (clampedX !== e.x || clampedY !== e.y) {
            e.orbitDir = -(e.orbitDir || 1);
        }
        e.vx = 0;
        e.vy = 0;
        e.x = clampedX;
        e.y = clampedY;
        return;
    }

    if (brakePosition) {
        const brakeFriction = options.brakeFriction || 0.94;
        e.vx *= brakeFriction;
        e.vy *= brakeFriction;
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;

        const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
        const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
        if (clampedX !== e.x || clampedY !== e.y) {
            e.orbitDir = -(e.orbitDir || 1);
            if (clampedX !== e.x) e.vx = 0;
            if (clampedY !== e.y) e.vy = 0;
        }
        e.x = clampedX;
        e.y = clampedY;
        return;
    }

    const tx = -moveNy * orbitDir;
    const ty = moveNx * orbitDir;
    const radiusError = dist - desiredRadius;
    const radiusCorrection = Math.max(-1, Math.min(1, radiusError / Math.max(1, radiusTolerance))) * radiusCorrectionAccel;

    e.vx += moveNx * radiusCorrection * SPEED_SCALE * gameSpeed;
    e.vy += moveNy * radiusCorrection * SPEED_SCALE * gameSpeed;

    if (forceApproach || dist > desiredRadius + radiusTolerance) {
        e.vx += moveNx * approachAccel * SPEED_SCALE * gameSpeed;
        e.vy += moveNy * approachAccel * SPEED_SCALE * gameSpeed;
    } else if (dist < desiredRadius - radiusTolerance) {
        e.vx -= moveNx * retreatAccel * SPEED_SCALE * gameSpeed;
        e.vy -= moveNy * retreatAccel * SPEED_SCALE * gameSpeed;
    }

    e.vx += tx * strafeAccel * SPEED_SCALE * gameSpeed;
    e.vy += ty * strafeAccel * SPEED_SCALE * gameSpeed;

    e.vx *= friction;
    e.vy *= friction;

    const currentSpeed = Math.hypot(e.vx, e.vy) || 0.001;
    if (currentSpeed > maxSpeed) {
        e.vx = (e.vx / currentSpeed) * maxSpeed;
        e.vy = (e.vy / currentSpeed) * maxSpeed;
    }

    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
    const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
    if (clampedX !== e.x || clampedY !== e.y) {
        e.orbitDir = -orbitDir;
        if (clampedX !== e.x) e.vx *= -0.45;
        if (clampedY !== e.y) e.vy *= -0.45;
    }
    e.x = clampedX;
    e.y = clampedY;
}

function getBossMovementPatternStage(e) {
    if (stage === 9 && e.variant && typeof BOSS_VARIANTS !== 'undefined') {
        const idx = BOSS_VARIANTS.findIndex(v => v && v.name === e.variant.name);
        if (idx >= 0) return idx + 1;
    }
    return stage;
}

function getBossMovementPatternKey(e) {
    const patternStage = getBossMovementPatternStage(e);
    if (patternStage === 1 || patternStage === 5) return 'A';
    if (patternStage === 2 || patternStage === 6) return 'B';
    if (patternStage === 3 || patternStage === 7) return 'C';
    if (patternStage === 4 || patternStage === 8) return 'D';
    return 'C';
}

function shouldBossUseGravity(e, enableGravity) {
    if (!enableGravity || stage < 5) return false;
    const patternStage = getBossMovementPatternStage(e);
    if (stage === 9 && patternStage <= 4) return false;
    return ((e.gravityCycleIndex || 0) % 2) === 0;
}

function clampBossMovement(e, margin = 95) {
    const clampedX = Math.max(margin, Math.min(worldSize - margin, e.x));
    const clampedY = Math.max(margin, Math.min(worldSize - margin, e.y));
    if (clampedX !== e.x || clampedY !== e.y) {
        e.orbitDir = -(e.orbitDir || 1);
        if (clampedX !== e.x) e.vx *= -0.45;
        if (clampedY !== e.y) e.vy *= -0.45;
    }
    e.x = clampedX;
    e.y = clampedY;
}

function limitBossMovementSpeed(e, maxSpeed) {
    const currentSpeed = Math.hypot(e.vx, e.vy) || 0.001;
    if (currentSpeed > maxSpeed) {
        e.vx = (e.vx / currentSpeed) * maxSpeed;
        e.vy = (e.vy / currentSpeed) * maxSpeed;
    }
}

function updateBossEvadeSide(e, interval = 54) {
    if (!e.evadeSide) e.evadeSide = Math.random() < 0.5 ? -1 : 1;
    e.evadeSideTimer = (e.evadeSideTimer || 0) + 1;
    if (e.evadeSideTimer >= interval) {
        e.evadeSide *= -1;
        e.evadeSideTimer = 0;
    }
    return e.evadeSide;
}

function updateBossPatternAMovement(e, options = {}) {
    const dy = player.y - e.y;
    const absDy = Math.abs(dy);
    const dirToPlayerY = dy === 0 ? (e.orbitDir || 1) : Math.sign(dy);
    const desiredRadius = options.desiredRadius || 360;
    const radiusTolerance = options.radiusTolerance || 95;
    const accel = (options.isPressurePhase ? 0.17 : 0.11) * options.angerFactor * options.movementSpeedMult;
    const retreatAccel = (options.isPressurePhase ? 0.13 : 0.1) * options.angerFactor * options.movementSpeedMult;
    const maxSpeed = e.speed * (options.isPressurePhase ? 6.2 : 4.8) * options.angerFactor * options.movementSpeedMult;

    const evadeDir = updateBossEvadeSide(e, 46);
    e.vx += (e.orbitDir || 1) * 0.09 * SPEED_SCALE * gameSpeed;
    e.vx += evadeDir * 0.11 * options.angerFactor * options.movementSpeedMult * SPEED_SCALE * gameSpeed;

    if (options.isChargePhase) {
        e.vy *= 0.92;
    } else if (absDy > desiredRadius + radiusTolerance) {
        e.vy += dirToPlayerY * accel * SPEED_SCALE * gameSpeed;
    } else if (absDy < desiredRadius - radiusTolerance) {
        e.vy -= dirToPlayerY * retreatAccel * SPEED_SCALE * gameSpeed;
    } else {
        e.vy *= 0.94;
    }

    e.vx *= 0.985;
    e.vy *= 0.985;
    limitBossMovementSpeed(e, maxSpeed);
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    clampBossMovement(e, options.margin || 95);
}

function updateBossPatternBMovement(e, options = {}) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const evadeDir = updateBossEvadeSide(e, 34);
    const wiggle = evadeDir * 260;
    const dodge = evadeDir * 0.16;
    const axisAccel = (options.isPressurePhase ? 0.3 : 0.2) * options.angerFactor * options.movementSpeedMult;
    const maxSpeed = e.speed * (options.isPressurePhase ? 8.0 : 6.2) * options.angerFactor * options.movementSpeedMult;

    if (options.isChargePhase) {
        e.vx *= 0.92;
        e.vy *= 0.92;
    } else if (absDy >= absDx) {
        const targetX = player.x + wiggle;
        const moveX = targetX - e.x;
        e.vx += Math.max(-1, Math.min(1, moveX / 145)) * axisAccel * SPEED_SCALE * gameSpeed;
        e.vx += dodge * options.angerFactor * options.movementSpeedMult * SPEED_SCALE * gameSpeed;
        e.vy *= 0.94;
    } else {
        const targetY = player.y + wiggle;
        const moveY = targetY - e.y;
        e.vy += Math.max(-1, Math.min(1, moveY / 145)) * axisAccel * SPEED_SCALE * gameSpeed;
        e.vx += dodge * 0.9 * options.angerFactor * options.movementSpeedMult * SPEED_SCALE * gameSpeed;
        e.vx *= 0.96;
    }

    e.vx *= 0.985;
    e.vy *= 0.985;
    limitBossMovementSpeed(e, maxSpeed);
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;
    clampBossMovement(e, options.margin || 95);
}

function updateBossPatternDMovement(e, options = {}) {
    e.attackDashCooldown = Math.max(0, (e.attackDashCooldown || 0) - 1);
    e.attackDashTimer = Math.max(0, e.attackDashTimer || 0);

    if (!options.isChargePhase && options.isPressurePhase && e.attackDashTimer <= 0 && e.attackDashCooldown <= 0) {
        e.attackDashTimer = 28;
        e.attackDashCooldown = 150 + Math.floor(Math.random() * 90);
        if (typeof AudioSys !== 'undefined' && isOnScreen(e)) AudioSys.playSE('boss_dash', e.x, e.y);
    }

    if (e.attackDashTimer > 0) {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy) || 1.0;
        const dashAccel = 0.42 * options.angerFactor * options.movementSpeedMult;
        const maxSpeed = e.speed * 11.0 * options.angerFactor * options.movementSpeedMult;
        e.vx += (dx / dist) * dashAccel * SPEED_SCALE * gameSpeed;
        e.vy += (dy / dist) * dashAccel * SPEED_SCALE * gameSpeed;
        e.vx *= 0.99;
        e.vy *= 0.99;
        limitBossMovementSpeed(e, maxSpeed);
        e.x += e.vx * gameSpeed;
        e.y += e.vy * gameSpeed;
        e.attackDashTimer--;
        clampBossMovement(e, options.margin || 95);
        return;
    }

    updateBossCombatMovement(e, {
        ...options,
        strafeAccel: options.strafeAccel * 1.12,
        maxSpeed: options.maxSpeed * 1.05
    });
}

function updateBossStageMovement(e, options = {}) {
    const pattern = getBossMovementPatternKey(e);
    if (pattern === 'A') {
        updateBossPatternAMovement(e, options);
    } else if (pattern === 'B') {
        updateBossPatternBMovement(e, options);
    } else if (pattern === 'D') {
        updateBossPatternDMovement(e, options);
    } else {
        updateBossCombatMovement(e, options);
    }
}

function updateBossCoreAttack(e, bulletSpeedMult, angerFactor) {
    e.coreAttackTimer = (e.coreAttackTimer || 0) + 1;
    const sides = Math.max(3, (e.variant && e.variant.sides) || 6);
    const variation = sides % 3;
    const chargeFrames = variation === 0 ? 38 : (variation === 1 ? 46 : 42);
    const volleyGap = variation === 0 ? 14 : (variation === 1 ? 20 : 17);
    const volleyCount = Math.max(1, Math.min(6, Number.isFinite(stage) ? stage : 1));
    const spread = (0.16 + Math.min(0.12, sides * 0.008)) * (e.type === 'battleship' ? 1.2 : 1.0);
    const speedBoost = 1 + Math.min(0.22, (sides - 3) * 0.025);

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const aim = Math.atan2(dy, dx);
    let diff = aim - (e.angle || 0);
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    e.angle += diff * 0.16 * gameSpeed * Math.min(2.0, angerFactor);

    const timer = e.coreAttackTimer;
    const volleyIndex = (timer - chargeFrames) / volleyGap;
    const isVolley = timer >= chargeFrames &&
        Number.isInteger(volleyIndex) &&
        volleyIndex >= 0 &&
        volleyIndex < volleyCount;

    if (timer < chargeFrames) {
        if (timer % 5 === 0 && typeof spawnParticleObj === 'function') {
            const core = getBossCoreWorldPosition(e);
            const a = Math.random() * Math.PI * 2;
            const dist = core.radius * (1.2 + Math.random() * 1.8);
            spawnParticleObj({
                x: core.x + Math.cos(a) * dist,
                y: core.y + Math.sin(a) * dist,
                vx: -Math.cos(a) * 4 * SPEED_SCALE,
                vy: -Math.sin(a) * 4 * SPEED_SCALE,
                color: Math.random() > 0.35 ? (e.color || '#ff3344') : '#ff3344',
                life: 0.35 + Math.random() * 0.25,
                size: (1.7 + Math.random() * 2.2) * G_SCALE
            });
        }
        return;
    }

    if (isVolley) {
        const core = getBossCoreWorldPosition(e);
        const shotAngle = Math.atan2(player.y - core.y, player.x - core.x);
        const offsets = [-spread, 0, spread];
        const bulletSpd = 26 * 0.8 * speedBoost * SPEED_SCALE * bulletSpeedMult;

        offsets.forEach(offset => {
            const a = shotAngle + offset;
            spawnEnemyBulletObj({
                x: core.x,
                y: core.y,
                vx: Math.cos(a) * bulletSpd,
                vy: Math.sin(a) * bulletSpd,
                life: BULLET_CONFIG.BOSS_LASER.LIFE,
                isLaserMissile: true,
                isCoreLaser: true,
                color: e.color || '#ff3344'
            });
        });

        if (typeof spawnRingObj === 'function') {
            spawnRingObj({ x: core.x, y: core.y, r: core.radius * 1.6, color: e.color || '#ff3344', life: 0.25, lineWidth: 4 });
        }
        if (typeof AudioSys !== 'undefined' && isOnScreen(e)) AudioSys.playSE('boss_laser', core.x, core.y);
        if (typeof distortGrid === 'function') distortGrid(core.x, core.y, 45, core.radius * 4);
    }

    if (timer >= chargeFrames + volleyGap * Math.max(0, volleyCount - 1) + 52) {
        e.coreAttackTimer = 0;
    }
}

function updateBossAI(e, options = {}) {
    updateBossReactorSparks(e);

    const enableGravity = options.enableGravity !== false;
    const movementSpeedMult = options.movementSpeedMult || 1.0;
    const bulletSpeedMult = (options.bulletSpeedMult || 1.0) * BOSS_PROJECTILE_SPEED_MULT;

    // =========================================================
    // 1. 出現演出 (Spawn Sequence)
    // =========================================================
    if (e.isSpawning) {
        e.spawnTimer++;
        // 出現位置へ強制固定
        e.x = e.spawnX;
        e.y = e.spawnY;
        e.vx = 0; e.vy = 0;

        // 出現完了時の初期化処理
        if (e.spawnTimer >= e.spawnMax) {
            e.isSpawning = false;
            e.attackPattern = 0;  // 最初の攻撃パターン
            e.aliveTimer = 0;     // ★生存タイマーを0リセット
            e.orbitDir = Math.random() < 0.5 ? -1 : 1;
        }
        return; // 出現中はこれ以上の処理をしない
    }

    // ★生存タイマーを加算 (1フレーム = 1/60秒)
    // これを使って「怒りモード」や「自爆」を判定します
    e.aliveTimer = (e.aliveTimer || 0) + 1;

    // =========================================================
    // ★追加仕様：メルトダウン（暴走自爆）シーケンス
    // =========================================================
    // 出現から2分 (60fps * 120秒 = 7200フレーム) を経過した場合
    if (e.aliveTimer > 7200) {

        // --- 1. 見た目の変化 ---
        e.color = '#ff0000'; // 全身を赤く変色（危険信号）
        e.angle += 0.5 * gameSpeed; // 制御不能な超高速回転

        // --- 2. 挙動の変化 ---
        // プレイヤーを追わず、その場で激しく振動（暴走状態）
        e.vx *= 0.8;
        e.vy *= 0.8; // 減速して停止
        e.x += (Math.random() - 0.5) * 15 * gameSpeed; // ガタガタ震える
        e.y += (Math.random() - 0.5) * 15 * gameSpeed;

        // --- 3. 攻撃：全方位発狂弾幕 ---
        // 4フレームごとの超高速連射
        if (frame % 4 === 0) {
            const sides = 16; // 16方向へ同時発射
            const spd = 12 * SPEED_SCALE * BOSS_PROJECTILE_SPEED_MULT;

            for (let i = 0; i < sides; i++) {
                // 回転に合わせて発射角度をずらす（スパイラル状に広がる）
                const a = e.angle + (Math.PI * 2 / sides) * i;

                spawnEnemyBulletObj({
                    x: e.x, y: e.y,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    life: 150,
                    color: '#f00',       // 弾の色も赤
                    isLaserMissile: true // 当たり判定の大きい弾を使用
                });
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('shoot');    // 発射音
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 80, 100); // 空間を歪ませる演出
        }

        // --- 4. 結末：自爆 ---
        // 暴走開始から5秒後 (7200 + 300 = 7500フレーム)
        if (e.aliveTimer > 7500) {
            e.hp = 0; // HPを0にする（updateEnemies側で爆発演出と撃破処理が行われる）

            // 自爆時の特大エフェクト（断末魔）
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 500, 500);
            if (typeof createExplosion === 'function') createExplosion(e.x, e.y, '#f00', 50);
        }

        // ★重要：ここでreturnし、通常の移動・攻撃ロジックを実行させない
        return;
    }


    // =========================================================
    // 以下、通常時のAIロジック（怒りモード含む）
    // =========================================================

    // --- A. 怒りモード係数 (Anger Factor) の計算 ---
    // 30秒(1800F)経過後から、ボスの性能が徐々に上がり始める
    let angerFactor = 1.0;
    if (e.aliveTimer > 1800) {
        // 時間経過で 1.0 -> 1.9 まで上昇
        angerFactor = 1.0 + Math.min(BOSS_ANGER_MAX_BONUS, (e.aliveTimer - 1800) * 0.0007);
    }

    if (e.orbitDir === undefined) {
        e.orbitDir = Math.random() < 0.5 ? -1 : 1;
    }

    // --- B. 移動ロジック ---
    // 座標がNaNにならないよう安全策
    if (!Number.isFinite(e.x)) e.x = e.spawnX || worldSize / 2;
    if (!Number.isFinite(e.y)) e.y = e.spawnY || worldSize / 2;

    const cycle = e.fireTimer || 0;
    const isPressurePhase = cycle < 140;
    const isGravityEnabledForStage = shouldBossUseGravity(e, enableGravity);
    const isChargePhase = isGravityEnabledForStage && cycle >= 140 && cycle < 260;
    const isIPhoneView = typeof currentResolution !== 'undefined' &&
        currentResolution.key &&
        currentResolution.key.includes('iPhone');
    const desiredBossRadius = isIPhoneView ? 300 : 360;
    const bossRadiusTolerance = isIPhoneView ? 85 : 110;

    updateBossStageMovement(e, {
        desiredRadius: desiredBossRadius,
        radiusTolerance: bossRadiusTolerance,
        isPressurePhase,
        isChargePhase,
        angerFactor,
        movementSpeedMult,
        approachAccel: (isPressurePhase ? 0.12 : 0.085) * angerFactor * movementSpeedMult,
        strafeAccel: (isPressurePhase ? 0.2 : 0.14) * angerFactor * movementSpeedMult,
        retreatAccel: (isPressurePhase ? 0.08 : 0.1) * angerFactor * movementSpeedMult,
        radiusCorrectionAccel: (isPressurePhase ? 0.12 : 0.08) * angerFactor * movementSpeedMult,
        friction: 0.99,
        maxSpeed: e.speed * (isPressurePhase ? 7.0 : 5.8) * angerFactor * movementSpeedMult,
        margin: 95,
        holdPosition: false,
        brakePosition: isChargePhase,
        brakeFriction: 0.94
    });

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1.0;

    if (e.coreExposed) {
        updateBossCoreAttack(e, bulletSpeedMult, angerFactor);
        return;
    }

    // --- C. 攻撃サイクル ---
    e.fireTimer++;

    // ==========================================
    // ★修正: 重力（吸い込み）時間を倍にするため、サイクル全体を延長
    // ==========================================
    const maxCycle = 360;     // サイクル全体を延長
    const brakeStart = 140;   // メイン攻撃終了
    const gravityEnd = 260;   // ★重力攻撃終了（140〜260Fの「120フレーム＝2秒間」吸い込む）
    const fireTime = 300;     // 必殺技発射
    const restartTime = 330;  // クールダウン開始

    // ----------------------------------------------------
    // [フェーズ1] メイン攻撃 (0 ~ 139F)
    // ----------------------------------------------------
    if (e.fireTimer < brakeStart) {

        // パターン0: ホーミングレーザー
        if (e.attackPattern === 0) {
            e.angle += 0.035 * gameSpeed * Math.min(angerFactor, 1.35);
            const shotCount = getBossHomingLaserShotCount();
            if (isBossHomingLaserShotFrame(e.fireTimer, shotCount, brakeStart)) {
                const sides = e.variant.sides;
                const startSpd = 10.0 * SPEED_SCALE * bulletSpeedMult;
                const targetSpd = 25.0 * SPEED_SCALE * bulletSpeedMult;
                for (let i = 0; i < sides; i++) {
                    if (!isBossReactorOperationalForShot(e, i, sides)) continue;
                    const a = e.angle + (Math.PI * 2 / sides) * i;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 45, y: e.y + Math.sin(a) * 45,
                        vx: Math.cos(a) * startSpd, vy: Math.sin(a) * startSpd,
                        life: BULLET_CONFIG.BOSS_LASER.LIFE,
                        isLaserMissile: true,
                        isBossHomingLaser: true,
                        lockTimer: 38,
                        accelTimer: 26,
                        turnRate: 0.035 * angerFactor,
                        targetSpeed: targetSpd,
                        accelRate: 0.75 * SPEED_SCALE * bulletSpeedMult,
                        color: e.color
                    });
                }
                if (isOnScreen(e) && typeof AudioSys !== 'undefined') AudioSys.playSE('boss_laser', e.x, e.y);
            }
        }
        // パターン1: 自機狙い3WAY
        else if (e.attackPattern === 1) {
            const targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - e.angle;
            // 最短回転方向の計算
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            e.angle += diff * 0.1 * gameSpeed * angerFactor; // 怒ると照準合わせが速くなる

            if (e.fireTimer % 20 === 0) {
                const bulletSpd = 22.5 * SPEED_SCALE * bulletSpeedMult;
                for (let i = -1; i <= 1; i++) {
                    const a = e.angle + i * 0.15;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 50, y: e.y + Math.sin(a) * 50,
                        vx: Math.cos(a) * bulletSpd, vy: Math.sin(a) * bulletSpd,
                        life: 300, color: '#ffaa00'
                    });
                }
                if (isOnScreen(e) && typeof AudioSys !== 'undefined') AudioSys.playSE('boss_3way', e.x, e.y);
            }
        }
        // パターン2: 十字回転クロスファイア
        else if (e.attackPattern === 2) {
            e.angle -= 0.08 * gameSpeed * angerFactor; // 怒ると逆回転も速くなる
            if (e.fireTimer % 12 === 0) {
                const bulletSpd = 10 * SPEED_SCALE * bulletSpeedMult;
                for (let i = 0; i < 4; i++) {
                    const a = e.angle + (Math.PI / 2) * i;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40,
                        vx: Math.cos(a) * bulletSpd, vy: Math.sin(a) * bulletSpd,
                        life: 180, color: '#ff00ff', isLaserMissile: true
                    });
                }
                if (isOnScreen(e) && e.fireTimer % 24 === 0 && typeof AudioSys !== 'undefined') AudioSys.playSE('boss_cross', e.x, e.y);
            }
        }
    }
    // ----------------------------------------------------
    // [フェーズ1.5 & 2] 減速・重力場・溜め演出 (140 ~ 299F)
    // ----------------------------------------------------
    else if (e.fireTimer >= brakeStart && e.fireTimer < fireTime) {

        // 回転を徐々に止める
        const ratio = 1.0 - (e.fireTimer - brakeStart) / (fireTime - brakeStart);
        e.angle += Math.pow(ratio, 1.5) * 0.1;

        const gravityRatio = 1.0;

        if (isGravityEnabledForStage && e.fireTimer < gravityEnd) {

            if (e.fireTimer === brakeStart + 1) {
                if (typeof AudioSys !== 'undefined') AudioSys.playSE('gravity_boss', e.x, e.y, gravityRatio);
            }

            const pullDx = e.x - player.x;
            const pullDy = e.y - player.y;
            const pullDist = Math.hypot(pullDx, pullDy) || 0.001;

            const maxPullDist = 1700;

            if (pullDist < maxPullDist) {
                const pullStrength = 7.5 * SPEED_SCALE * gameSpeed * Math.min(angerFactor, 1.6) * gravityRatio;
                const force = pullStrength * (1 - pullDist / maxPullDist);
                player.x += (pullDx / pullDist) * force;
                player.y += (pullDy / pullDist) * force;
            }

            if (frame % 6 === 0 && typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, -80 * gravityRatio, 800 * gravityRatio);
            }

            const particleCount = Math.max(1, Math.round(8 * gravityRatio));
            for (let i = 0; i < particleCount; i++) {
                const pAngle = Math.random() * Math.PI * 2;
                const pDist = 200 + Math.random() * 1000;
                const pColor = Math.random() > 0.5 ? e.color : '#ffffff';
                const pSpeed = (12 + Math.random() * 18) * SPEED_SCALE;
                const swirlAngle = pAngle + 0.2;

                spawnParticleObj({
                    x: e.x + Math.cos(pAngle) * pDist,
                    y: e.y + Math.sin(pAngle) * pDist,
                    vx: -Math.cos(swirlAngle) * pSpeed,
                    vy: -Math.sin(swirlAngle) * pSpeed,
                    color: pColor,
                    life: 1.5 + Math.random(),
                    size: Math.max(2.0, (2.5 + Math.random() * 2.0) * gravityRatio)
                });
            }
        } else if (!enableGravity && frame % 3 === 0) {
            const ang = Math.random() * Math.PI * 2;
            const dist = 70 + Math.random() * 30;
            spawnParticleObj({
                x: e.x + Math.cos(ang) * dist,
                y: e.y + Math.sin(ang) * dist,
                vx: -Math.cos(ang) * 5,
                vy: -Math.sin(ang) * 5,
                color: '#fff',
                life: 0.2,
                size: 2.5
            });
        }
    }
    // ----------------------------------------------------
    // [フェーズ3] 必殺技発射
    // ----------------------------------------------------
    else if (e.fireTimer >= fireTime && e.fireTimer < restartTime) {
        const isHomingAttack = e.attackPattern === 0 || stage < 4;
        const homingVolleyCount = stage >= 6 ? 3 : 1;
        const homingVolleyIndex = Math.floor((e.fireTimer - fireTime) / 14);
        const isHomingVolleyTime = isHomingAttack &&
            homingVolleyIndex >= 0 &&
            homingVolleyIndex < homingVolleyCount &&
            e.fireTimer === fireTime + homingVolleyIndex * 14;

        if (e.fireTimer === fireTime || isHomingVolleyTime) {

            // 必殺A: ホーミングミサイル (Pattern 0 または 低ステージ)
            if (isHomingAttack) {
                const sides = e.variant.sides;
                const volleyOffset = homingVolleyIndex <= 0 ? 0 : (Math.PI / sides) * homingVolleyIndex;
                for (let i = 0; i < sides; i++) {
                    if (!isBossReactorOperationalForShot(e, i, sides)) continue;
                    const a = e.angle + volleyOffset + (Math.PI * 2 / sides) * i;
                    spawnEnemyBulletObj({
                        x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60,
                        vx: Math.cos(a) * (BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE * bulletSpeedMult),
                        vy: Math.sin(a) * (BULLET_CONFIG.BOSS_HOMING.SPEED * SPEED_SCALE * bulletSpeedMult),
                        life: BULLET_CONFIG.BOSS_HOMING.LIFE,
                        isMissile: true, color: e.color, trail: []
                    });
                }
                if (isOnScreen(e) && typeof AudioSys !== 'undefined') AudioSys.playSE('boss_homing', e.x, e.y);
            }
            // 必殺B: 衝撃波リング (高ステージ)
            else if (e.fireTimer === fireTime) {
                const ringCount = 12;
                for (let i = 0; i < ringCount; i++) {
                    const a = (Math.PI * 2 / ringCount) * i;
                    const spd = 12 * SPEED_SCALE * bulletSpeedMult;
                    spawnEnemyBulletObj({
                        x: e.x, y: e.y,
                        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                        life: 250, color: e.color,
                        isShockwave: true, baseScale: 0.8, scaleSpeed: 0.02
                    });
                }
                if (isOnScreen(e) && typeof AudioSys !== 'undefined') AudioSys.playSE('boss_shockwave', e.x, e.y);
            }
            spawnRingObj({ x: e.x, y: e.y, r: 20, color: '#fff', life: 1.0 });
            spawnRingObj({ x: e.x, y: e.y, r: 100, color: e.color, life: 0.8 });
            if (typeof distortGrid === 'function') distortGrid(e.x, e.y, 150, 250);
        }
    }
    // ----------------------------------------------------
    // [フェーズ4] クールダウン
    // ----------------------------------------------------
    else if (e.fireTimer >= restartTime) {
        // 次の動き出しに向けて少し回転
        const ratio = (e.fireTimer - restartTime) / (maxCycle - restartTime);
        e.angle += Math.pow(ratio, 2) * 0.1;
    }

    // --- サイクル完了・次パターンの抽選 ---
    if (e.fireTimer >= maxCycle) {
        e.fireTimer = 0;
        e.gravityCycleIndex = (e.gravityCycleIndex || 0) + 1;
        // ステージ進行度に応じて攻撃パターンの種類を増やす
        if (stage <= 2) {
            e.attackPattern = 0;
        } else if (stage <= 5) {
            e.attackPattern = Math.random() < 0.5 ? 0 : 1;
        } else {
            const r = Math.random();
            if (r < 0.33) e.attackPattern = 0;
            else if (r < 0.66) e.attackPattern = 1;
            else e.attackPattern = 2;
        }
    }
}

function updateBossSpecialAI(e) {
    updateBossAI(e);
}

function updateBattleshipAI(e) {
    updateBossReactorSparks(e);

    // 1. 出現演出
    if (e.isSpawning) {
        e.spawnTimer++;
        if (e.spawnTimer >= e.spawnMax) {
            e.isSpawning = false;
            if (ui.bossContainer) ui.bossContainer.style.display = 'block';
            if (ui.bossNameLabel) {
                ui.bossNameLabel.innerText = "GENESIS-ARK";
                ui.bossNameLabel.style.color = "#0ff";
            }
            if (ui.bossHpBarInline) ui.bossHpBarInline.style.backgroundColor = "#0ff";
            if (ui.bossBarFrame) ui.bossBarFrame.style.borderColor = "#0ff";
        }
        return;
    }

    // --- ★HP割合の計算と発狂モード判定 ---
    const hpPct = e.hp / e.maxHp;
    const isDesperationMode = hpPct <= 0.50;

    e.fireTimer++;

    // 2. 基本移動（追尾）
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 0.1;

    if (isDesperationMode) {
        e.vx *= 0.95; e.vy *= 0.95;
    } else {
        const cycle = e.fireTimer % 1380;
        const isRushing = (cycle >= 900 && cycle < 1200);
        const moveSpeed = isRushing ? e.speed * 2.5 : e.speed;
        const accel = isRushing ? 0.05 : 0.01;
        e.vx += (dx / d) * accel * SPEED_SCALE;
        e.vy += (dy / d) * accel * SPEED_SCALE;
        const cv = Math.hypot(e.vx, e.vy);
        if (cv > moveSpeed) {
            e.vx = (e.vx / cv) * moveSpeed;
            e.vy = (e.vy / cv) * moveSpeed;
        }
    }
    e.x += e.vx * gameSpeed;
    e.y += e.vy * gameSpeed;

    // 3. 旋回・発光演出
    if (isDesperationMode) {
        e.angle += 0.25 * gameSpeed;
        if (ui.bossNameLabel) {
            ui.bossNameLabel.innerText = "CRITICAL: EVENT HORIZON";
            ui.bossNameLabel.style.color = "#f0f";
        }
        if (ui.bossHpBarInline) {
            ui.bossHpBarInline.style.backgroundColor = (frame % 4 < 2) ? "#fff" : "#f0f";
            ui.bossHpBarInline.style.boxShadow = "0 0 15px #f0f";
        }
        if (ui.bossBarFrame) ui.bossBarFrame.style.borderColor = "#f0f";


        // 60フレーム（約1秒）に1回、ワームホールから敵を召喚
        if (frame % 60 === 0) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 400;
            const sx = e.x + Math.cos(spawnAngle) * spawnDist;
            const sy = e.y + Math.sin(spawnAngle) * spawnDist;

            // 境界チェック（画面外すぎる場合はクランプ）
            const targetX = Math.max(100, Math.min(worldSize - 100, sx));
            const targetY = Math.max(100, Math.min(worldSize - 100, sy));

            // ワームホール生成演出
            wormholes.push({ x: targetX, y: targetY, life: 60, maxLife: 60, active: true, spawnSource: 'battleship' });
            if (typeof distortGrid === 'function') distortGrid(targetX, targetY, 150, 300);

            // 0.5秒後に敵を出現させる
            setTimeout(() => {
                if (gameState === 'PLAYING' && isDesperationMode) {
                    const types = ['triangle', 'tadpole', 'dragon', 'asteroid'];
                    const randomType = types[Math.floor(Math.random() * types.length)];

                    // 1. 敵を生成（spawnEnemy内部でステージ10の速度補正 1.72倍 がすでにかかります）
                    spawnEnemy(targetX, targetY, randomType, 1, '#e00', 'battleship');

                    // プールを後ろから検索して「たった今生成された敵」を取得する
                    let newEnemy = null;
                    const pool = enemyPool.pool;
                    for (let i = pool.length - 1; i >= 0; i--) {
                        if (pool[i].active && pool[i].type === randomType) {
                            newEnemy = pool[i];
                            break;
                        }
                    }

                    if (newEnemy) {
                        // ==========================================
                        // ★ 修正：2倍補正を削除し、ステージ10の最高速度にリセット
                        // ==========================================
                        // newEnemy.speed はすでに計算済み（ベース速度 × 0.25 × 1.72）

                        // 登場時の勢い（vx, vy）を現在の進行方向に合わせる
                        const angle = Math.random() * Math.PI * 2;
                        newEnemy.vx = Math.cos(angle) * newEnemy.speed;
                        newEnemy.vy = Math.sin(angle) * newEnemy.speed;

                        newEnemy.color = '#e00'; // 発狂モードの敵として赤色に統一
                    }
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
                }
            }, 500);
        }

    } else {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - e.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const cycle = e.fireTimer % 1380;
        if (cycle >= 900 && cycle < 1200) e.angle += 0.15 * gameSpeed;
        else e.angle += diff * 0.01 * gameSpeed;

        // 150フレームに1回、30%の確率でアステロイドを召喚
        if (frame % 150 === 0 && Math.random() < 0.3) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const sx = e.x + Math.cos(spawnAngle) * 300;
            const sy = e.y + Math.sin(spawnAngle) * 300;

            wormholes.push({ x: sx, y: sy, life: 80, maxLife: 80, active: true, spawnSource: 'battleship' });
            setTimeout(() => {
                if (gameState === 'PLAYING' && !isDesperationMode) {
                    spawnEnemy(sx, sy, 'asteroid', 1, null, 'battleship');
                }
            }, 800);
        }
    }

    // 4. 攻撃ロジック
    if (e.coreExposed) updateBossCoreAttack(e, BATTLESHIP_PROJECTILE_SPEED_MULT, 1.6);

    const cycle = e.fireTimer % 1380;
    const sides = e.variant.sides || 12;

    if (cycle < 300) {
        if (cycle % 60 === 0) {
            for (let j = 0; j < sides; j++) {
                if (!isBossReactorOperationalForShot(e, j, sides)) continue;
                const baseA = e.angle + (Math.PI * 2 / sides) * j;
                const sx = e.x + Math.cos(baseA) * 100, sy = e.y + Math.sin(baseA) * 100;
                for (let i = -1; i <= 1; i++) {
                    const a = baseA + (i * 0.2);
                    spawnEnemyBulletObj({
                        x: sx, y: sy,
                        vx: Math.cos(a) * 24 * SPEED_SCALE * BATTLESHIP_PROJECTILE_SPEED_MULT,
                        vy: Math.sin(a) * 24 * SPEED_SCALE * BATTLESHIP_PROJECTILE_SPEED_MULT,
                        life: 200, color: '#0ff', isLaserMissile: true
                    });
                }
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('ark_laser', e.x, e.y);
            // ==========================================
            // ★追加：全方位レーザー発射時の軽い歪み
            // ==========================================
            if (typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 100, 300);
            }

        }
    }
    // ==========================================
    // ★ 修正：パターン2 ファイター一斉展開＆包囲（ゆっくり）
    // ==========================================
    else if (cycle < 600) {
        if (cycle % 10 === 0 && typeof distortGrid === 'function') {
            distortGrid(e.x, e.y, 250, -15);
        }
        if (cycle === 320 || cycle === 460) {
            const fighterCount = 8;
            const pToBossAngle = Math.atan2(e.y - player.y, e.x - player.x);
            const bossToPlayerAngle = pToBossAngle + Math.PI;

            for (let i = 0; i < fighterCount; i++) {
                const posIdx = i - Math.floor(fighterCount / 2);
                const launchA = bossToPlayerAngle + posIdx * 0.4;

                const fighter = spawnEnemyObj({
                    x: e.x,
                    y: e.y,
                    // ★修正: 初速を 2.5 -> 0.5 に下げて、フワッと射出させる
                    vx: Math.cos(launchA) * 0.25 * SPEED_SCALE,
                    vy: Math.sin(launchA) * 0.25 * SPEED_SCALE,
                    hp: 3,
                    speed: 1.0,
                    color: '#0ff',
                    type: 'fighter',
                    state: 'deploy',
                    scale: 0.8,
                    noDrop: true,
                    spawnSource: 'battleship'
                });

                if (!fighter) continue;

                // fighter特有のパラメータを直接セット
                fighter.burstCount = 0;
                fighter.baseAngle = pToBossAngle;
                fighter.orbitAngleOffset = posIdx;
                fighter.targetRadius = 400;
            }
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('ark_fighter', e.x, e.y);

            // ==========================================
            // ★追加：ファイター射出時の歪み（射出の反動を表現）
            // ==========================================
            if (typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 150, 400);
            }
        }
    }
    // ==========================================
    // ★ 修正：ミサイルから「ワームホール & Phantom召喚」へ変更
    // ==========================================
    else if (cycle < 900) {
        const sub = cycle % 140; // 召喚の間隔を少し調整

        if (sub === 0) {
            // 1. ボスの斜め前方にワームホールを生成する座標を計算
            // ボスの向いている角度(e.angle)から少し横にずらす
            const spawnAngle = e.angle + (Math.random() > 0.5 ? 0.8 : -0.8);
            const spawnDist = 200;
            const sx = e.x + Math.cos(spawnAngle) * spawnDist;
            const sy = e.y + Math.sin(spawnAngle) * spawnDist;

            // 2. ワームホールを設置（life 100で消える設定）
            wormholes.push({
                x: sx,
                y: sy,
                life: 100,
                maxLife: 100,
                active: true,
                spawnSource: 'battleship'
            });
            if (typeof distortGrid === 'function') distortGrid(sx, sy, 100, 200);
            if (typeof AudioSys !== 'undefined') AudioSys.playSE('ark_summon', sx, sy);

            // 3. 少し遅らせて（ワームホールが開ききった頃）Phantomを出現させる
            setTimeout(() => {
                // ゲームが進行中（タイトルに戻っていない）かチェック
                if (gameState === 'PLAYING') {
                    spawnEnemy(sx, sy, 'phantom', 1, null, 'battleship');
                    if (typeof AudioSys !== 'undefined') AudioSys.playSE('launch');
                }
            }, 600); // 0.6秒後に実体化
        }
    }
    else if (cycle < 1200) {
        if (cycle % 10 === 0) {
            const rotaryShotCount = 8;
            for (let i = 0; i < rotaryShotCount; i++) {
                if (!isBossReactorOperationalForShot(e, i, rotaryShotCount)) continue;
                const a = e.angle + (Math.PI * 2 / rotaryShotCount) * i;
                spawnEnemyBulletObj({
                    x: e.x + Math.cos(a) * 80, y: e.y + Math.sin(a) * 80,
                    vx: Math.cos(a) * 4 * BATTLESHIP_PROJECTILE_SPEED_MULT,
                    vy: Math.sin(a) * 4 * BATTLESHIP_PROJECTILE_SPEED_MULT,
                    life: 200, color: '#0ff', isLaserMissile: true
                });
            }

            // ==========================================
            // ★追加：回転連射中の継続的な軽い歪み
            // ==========================================
            if (cycle === 900 && typeof distortGrid === 'function') {
                distortGrid(e.x, e.y, 140, 150);
            }
            if (cycle % 30 === 0 && typeof AudioSys !== 'undefined') AudioSys.playSE('ark_rotary', e.x, e.y);
        }
        if (Math.random() < 0.3) createExplosion(e.x + (Math.random() - 0.5) * 150, e.y + (Math.random() - 0.5) * 150, '#0ff', 5);
    }

}
