import { useEffect, useRef } from 'react';
import { createParticle, collideCircles, clamp, drawFlagAvatar, drawParticles, normalizeVector, pick, rand, spawnFlag, stepParticles } from '../lib/physics.js';
import { randomCountries } from '../data/countryData.js';
import { saveWinner } from '../lib/storage.js';
import { useSound } from '../hooks/useSound.js';

const schemeColors = {
  Rainbow: ['#38bdf8', '#a855f7', '#fb7185', '#fbbf24', '#22c55e'],
  Fire: ['#fb7185', '#f97316', '#fbbf24'],
  Ocean: ['#0ea5e9', '#06b6d4', '#22d3ee'],
  Neon: ['#22d3ee', '#d946ef', '#84cc16'],
  Gold: ['#f59e0b', '#fde68a', '#facc15'],
  Monochrome: ['#cbd5e1', '#64748b', '#f8fafc']
};

export default function CircleBattle({ settings, roundNumber, externalCommand, setStats, setEliminations, onWinner }) {
  const canvasRef = useRef(null);
  const state = useRef({
    flags: [],
    particles: [],
    eliminations: [],
    commandId: null,
    angle: 0,
    winnerSent: false,
    spawnVotes: {},
    lastSpawn: 0,
    startedAt: performance.now(),
    shake: 0,
    powerUps: []
  });
  const play = useSound(settings);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let resizeObserver = null;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    if (state.current.flags.length === 0) {
      state.current.flags = randomCountries(settings.autoSpawnCount).map((country) => spawnFlag(country, parent.clientWidth, parent.clientHeight, 'Arena', null, settings.flagSpeed));
    }

    const draw = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const center = { x: width / 2, y: height / 2 };
      const arenaRadius = Math.min(width, height) * 0.42;
      const gapAngle = clamp(settings.gapSize / 35, 0.55, 3.0);
      const colors = schemeColors[settings.circleScheme] || schemeColors.Rainbow;
      state.current.angle += settings.rotationSpeed;
      state.current.particles = stepParticles(state.current.particles);
      state.current.shake *= 0.86;

      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(rand(-state.current.shake, state.current.shake), rand(-state.current.shake, state.current.shake));
      drawBackground(ctx, width, height, settings);
      drawWatermark(ctx, width, height, settings);
      drawArena(ctx, center, arenaRadius, state.current.angle, gapAngle, colors);
      drawPropeller(ctx, center, state.current.angle * 2.1, arenaRadius * 0.3);
      drawPowerUps(ctx, state.current.powerUps);

      const now = performance.now();
      if (now - state.current.lastSpawn > settings.spawnInterval && state.current.flags.length < Math.max(6, settings.autoSpawnCount * 1.2)) {
        state.current.lastSpawn = now;
        if (Math.random() < 0.32) state.current.powerUps.push(createPowerUp(width, height, center, arenaRadius));
      }

      for (let i = 0; i < state.current.flags.length; i += 1) {
        const flag = state.current.flags[i];
        applyTimedEffects(flag, now);
        flag.x += flag.vx;
        flag.y += flag.vy;

        const dx = flag.x - center.x;
        const dy = flag.y - center.y;
        const dist = Math.hypot(dx, dy) || 1;
        const theta = Math.atan2(dy, dx);
        const relative = normalizeAngle(theta - state.current.angle);
        const inGap = Math.abs(relative) < gapAngle / 2;

        if (dist + flag.radius > arenaRadius) {
          if (inGap && dist > arenaRadius + flag.radius * 0.35) {
            eliminateFlag(flag, i, 'gap');
            i -= 1;
            continue;
          }
          const normal = normalizeVector(dx, dy);
          flag.x = center.x + normal.x * (arenaRadius - flag.radius);
          flag.y = center.y + normal.y * (arenaRadius - flag.radius);
          const dot = flag.vx * normal.x + flag.vy * normal.y;
          flag.vx -= 2 * dot * normal.x;
          flag.vy -= 2 * dot * normal.y;
          flag.vx *= 0.96;
          flag.vy *= 0.96;
        }

        for (let j = i + 1; j < state.current.flags.length; j += 1) collideCircles(flag, state.current.flags[j], 0.94);
        handlePowerUpPickup(flag, now);
        drawFlagAvatar(ctx, flag, { teamColor: colors[i % colors.length] });
      }

      drawParticles(ctx, state.current.particles);
      drawFloatingTexts(ctx, state.current.eliminations);
      state.current.eliminations = state.current.eliminations.map((e) => ({ ...e, y: e.y - 0.7, life: e.life - 1 })).filter((e) => e.life > 0);
      ctx.restore();

      const alive = state.current.flags.length;
      setStats({ alive, eliminated: state.current.eliminatedCount || 0, total: alive + (state.current.eliminatedCount || 0) });

      if (settings.timedRounds && !state.current.winnerSent && performance.now() - state.current.startedAt > settings.roundDuration * 1000 && alive > 0) {
        finishWithWinner(pick(state.current.flags), 'time');
      }
      if (!state.current.winnerSent && alive === 1) finishWithWinner(state.current.flags[0], 'last');
      raf = requestAnimationFrame(draw);
    };

    function eliminateFlag(flag, index, reason) {
      if (flag.shield) {
        flag.shield = false;
        const back = normalizeVector(flag.x - parent.clientWidth / 2, flag.y - parent.clientHeight / 2);
        flag.vx = -back.x * Math.max(2.5, settings.flagSpeed);
        flag.vy = -back.y * Math.max(2.5, settings.flagSpeed);
        addExplosion(flag.x, flag.y, '#67e8f9', 14);
        play('power');
        return;
      }
      state.current.flags.splice(index, 1);
      state.current.eliminatedCount = (state.current.eliminatedCount || 0) + 1;
      setEliminations((current) => [`${flag.emoji} ${flag.name} left through the ${reason}`, ...current].slice(0, 14));
      state.current.eliminations.push({ id: crypto.randomUUID(), text: `${flag.name} eliminated`, x: flag.x, y: flag.y, life: 72 });
      addExplosion(flag.x, flag.y, '#fb7185', 28);
      state.current.shake = 8;
      play('eliminate');
    }

    function addExplosion(x, y, color, count) {
      for (let i = 0; i < count; i += 1) state.current.particles.push(createParticle(x, y, color));
    }

    function handlePowerUpPickup(flag, now) {
      state.current.powerUps = state.current.powerUps.filter((power) => {
        if (Math.hypot(flag.x - power.x, flag.y - power.y) > flag.radius + 16) return true;
        applyPower(power.type, flag);
        play('power');
        return false;
      });
    }

    function applyPower(power, target = pick(state.current.flags)) {
      if (!target) return;
      if (power === 'shield') target.shield = true;
      if (power === 'big') {
        target.radius = target.baseRadius * 1.55;
        target.bigUntil = performance.now() + 9000;
      }
      if (power === 'speed') {
        const n = normalizeVector(target.vx, target.vy);
        target.vx = n.x * settings.flagSpeed * 2.2;
        target.vy = n.y * settings.flagSpeed * 2.2;
        target.speedUntil = performance.now() + 7000;
      }
      if (power === 'boom') {
        addExplosion(target.x, target.y, '#f97316', 50);
        state.current.shake = 16;
        state.current.flags.forEach((flag) => {
          if (flag.id === target.id) return;
          const d = Math.hypot(flag.x - target.x, flag.y - target.y) || 1;
          if (d < 190) {
            const force = (190 - d) / 190 * 10;
            flag.vx += ((flag.x - target.x) / d) * force;
            flag.vy += ((flag.y - target.y) / d) * force;
          }
        });
        play('boom');
      }
    }

    function finishWithWinner(flag, reason) {
      state.current.winnerSent = true;
      const champion = { ...flag, id: crypto.randomUUID(), mode: 'Circle Battle', reason, createdAt: Date.now() };
      const saved = saveWinner(champion);
      play('winner');
      window.setTimeout(() => onWinner(champion, saved), 500);
    }

    draw();
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
    };
  }, [settings, setStats, setEliminations, onWinner, play]);

  useEffect(() => {
    const entry = externalCommand;
    if (!entry || entry.id === state.current.commandId) return;
    state.current.commandId = entry.id;
    const parsed = entry.parsed;
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!parent || !parsed || parsed.type === 'unknown') return;

    if (parsed.type === 'country') {
      const existing = state.current.flags.find((flag) => flag.code === parsed.country.code && flag.username === entry.author);
      const key = `${entry.author}-${parsed.country.code}`;
      state.current.spawnVotes[key] = (state.current.spawnVotes[key] || 0) + 1;
      if (existing) {
        existing.score += 1;
        if (state.current.spawnVotes[key] % 5 === 0) {
          existing.radius = existing.baseRadius * 1.55;
          existing.bigUntil = performance.now() + 9000;
        }
      } else {
        state.current.flags.push(spawnFlag(parsed.country, parent.clientWidth, parent.clientHeight, entry.author, null, settings.flagSpeed));
      }
      return;
    }

    if (parsed.type === 'power') {
      const target = state.current.flags.find((flag) => flag.username === entry.author) || pick(state.current.flags);
      if (!target) return;
      if (parsed.power === 'shield') target.shield = true;
      if (parsed.power === 'big') {
        target.radius = target.baseRadius * 1.55;
        target.bigUntil = performance.now() + 9000;
      }
      if (parsed.power === 'speed') {
        const n = normalizeVector(target.vx, target.vy);
        target.vx = n.x * settings.flagSpeed * 2.2;
        target.vy = n.y * settings.flagSpeed * 2.2;
        target.speedUntil = performance.now() + 7000;
      }
      if (parsed.power === 'boom') {
        state.current.shake = 18;
        for (let i = 0; i < 55; i += 1) state.current.particles.push(createParticle(target.x, target.y, '#f97316'));
        state.current.flags.forEach((flag) => {
          if (flag.id === target.id) return;
          const d = Math.hypot(flag.x - target.x, flag.y - target.y) || 1;
          if (d < 210) {
            const force = (210 - d) / 210 * 11;
            flag.vx += ((flag.x - target.x) / d) * force;
            flag.vy += ((flag.y - target.y) / d) * force;
          }
        });
      }
    }
  }, [externalCommand, settings.flagSpeed]);

  return <canvas ref={canvasRef} aria-label="Circle Battle canvas" />;
}

function applyTimedEffects(flag, now) {
  if (flag.bigUntil && now > flag.bigUntil) {
    flag.radius = flag.baseRadius;
    flag.bigUntil = 0;
  }
  if (flag.speedUntil && now > flag.speedUntil) {
    const n = normalizeVector(flag.vx, flag.vy);
    flag.vx = n.x * 2.1;
    flag.vy = n.y * 2.1;
    flag.speedUntil = 0;
  }
}

function normalizeAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function createPowerUp(width, height, center, arenaRadius) {
  const types = ['shield', 'boom', 'big', 'speed'];
  const a = rand(0, Math.PI * 2);
  const r = rand(40, arenaRadius * 0.75);
  return { id: crypto.randomUUID(), type: pick(types), x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r, pulse: rand(0, 10) };
}

function drawBackground(ctx, width, height, settings) {
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height));
  gradient.addColorStop(0, 'rgba(15,23,42,.98)');
  gradient.addColorStop(0.5, settings.theme === 'Fire Red' ? 'rgba(76,5,25,.86)' : 'rgba(12,16,44,.92)');
  gradient.addColorStop(1, 'rgba(2,6,23,1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(148,163,184,.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
}

function drawWatermark(ctx, width, height, settings) {
  ctx.save();
  ctx.globalAlpha = settings.watermarkOpacity;
  ctx.font = `${settings.watermarkItalic ? 'italic ' : ''}${settings.watermarkBold ? '900' : '600'} ${settings.watermarkSize}px Inter, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (settings.watermarkShadow) { ctx.shadowColor = settings.accentColor; ctx.shadowBlur = 18; }
  if (settings.watermarkOutline) { ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 5; ctx.strokeText(settings.watermarkText, width / 2, height * 0.1); }
  ctx.fillStyle = settings.watermarkColor;
  ctx.fillText(settings.watermarkText, width / 2, height * 0.1);
  ctx.restore();
}

function drawArena(ctx, center, radius, angle, gapAngle, colors) {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.lineWidth = 15;
  colors.forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    const start = gapAngle / 2 + index * ((Math.PI * 2 - gapAngle) / colors.length);
    const end = gapAngle / 2 + (index + 0.82) * ((Math.PI * 2 - gapAngle) / colors.length);
    ctx.beginPath();
    ctx.arc(0, 0, radius, start, end);
    ctx.stroke();
  });
  ctx.restore();
}

function drawPropeller(ctx, center, angle, length) {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 7;
  for (let i = 0; i < 3; i += 1) {
    ctx.rotate((Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();
  }
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerUps(ctx, powerUps) {
  const icons = { shield: '🛡️', boom: '💥', big: '🔆', speed: '⚡' };
  powerUps.forEach((power) => {
    ctx.save();
    ctx.font = '26px "Apple Color Emoji", "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.fillText(icons[power.type] || '✨', power.x, power.y);
    ctx.restore();
  });
}

function drawFloatingTexts(ctx, texts) {
  texts.forEach((item) => {
    ctx.save();
    ctx.globalAlpha = clamp(item.life / 72, 0, 1);
    ctx.font = '900 18px Inter, system-ui';
    ctx.fillStyle = '#fecdd3';
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.lineWidth = 5;
    ctx.textAlign = 'center';
    ctx.strokeText(item.text, item.x, item.y);
    ctx.fillText(item.text, item.x, item.y);
    ctx.restore();
  });
}
