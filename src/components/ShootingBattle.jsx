import { useEffect, useRef } from 'react';
import { bounceInsideRect, collideCircles, createParticle, drawFlagAvatar, drawParticles, drawRoundRect, normalizeVector, pick, rand, spawnFlag, stepParticles } from '../lib/physics.js';
import { randomCountries } from '../data/countryData.js';
import { saveWinner } from '../lib/storage.js';
import { useSound } from '../hooks/useSound.js';

export default function ShootingBattle({ settings, roundNumber, externalCommand, setStats, setEliminations, onWinner }) {
  const canvasRef = useRef(null);
  const state = useRef({
    flags: [], bullets: [], particles: [], weapon: null, commandId: null, winnerSent: false,
    lastWeapon: 0, eliminatedCount: 0, startedAt: performance.now(), shake: 0, lastShot: {}
  });
  const play = useSound(settings);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let raf = 0;
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
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    if (state.current.flags.length === 0) {
      state.current.flags = randomCountries(Math.min(settings.autoSpawnCount, 24)).map((country) => ({
        ...spawnFlag(country, parent.clientWidth, parent.clientHeight, 'Arena', null, settings.flagSpeed),
        radius: 27,
        baseRadius: 27,
        health: 100
      }));
    }

    const loop = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const now = performance.now();
      state.current.shake *= 0.84;
      state.current.particles = stepParticles(state.current.particles);

      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(rand(-state.current.shake, state.current.shake), rand(-state.current.shake, state.current.shake));
      drawCombatBackground(ctx, width, height, settings);
      drawWatermark(ctx, width, height, settings);
      drawBorders(ctx, width, height);

      if (!state.current.weapon || now - state.current.lastWeapon > 7000) {
        state.current.weapon = { id: crypto.randomUUID(), x: rand(70, width - 70), y: rand(80, height - 80), spin: 0 };
        state.current.lastWeapon = now;
      }
      drawWeapon(ctx, state.current.weapon);

      state.current.flags.forEach((flag, index) => {
        flag.x += flag.vx;
        flag.y += flag.vy;
        if (flag.speedUntil && now > flag.speedUntil) flag.speedUntil = 0;
        if (flag.bigUntil && now > flag.bigUntil) { flag.radius = flag.baseRadius; flag.bigUntil = 0; }
        bounceInsideRect(flag, width, height, 22);
        for (let j = index + 1; j < state.current.flags.length; j += 1) collideCircles(flag, state.current.flags[j], 0.9);

        if (state.current.weapon && Math.hypot(flag.x - state.current.weapon.x, flag.y - state.current.weapon.y) < flag.radius + 20) {
          flag.weaponUntil = now + 12000;
          state.current.weapon = null;
          play('power');
          for (let i = 0; i < 18; i += 1) state.current.particles.push(createParticle(flag.x, flag.y, '#fbbf24'));
        }

        if (flag.weaponUntil && flag.weaponUntil > now) autoShoot(flag, now);
        drawFlagAvatar(ctx, flag, { showHealth: true, teamColor: flag.weaponUntil > now ? '#fbbf24' : settings.accentColor });
      });

      state.current.bullets = state.current.bullets.map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx, y: bullet.y + bullet.vy, life: bullet.life - 1 })).filter((bullet) => {
        if (bullet.life <= 0 || bullet.x < -20 || bullet.y < -20 || bullet.x > width + 20 || bullet.y > height + 20) return false;
        const target = state.current.flags.find((flag) => flag.id !== bullet.owner && Math.hypot(flag.x - bullet.x, flag.y - bullet.y) < flag.radius + 5);
        if (target) {
          target.health -= bullet.damage;
          target.vx += bullet.vx * 0.08;
          target.vy += bullet.vy * 0.08;
          for (let i = 0; i < 8; i += 1) state.current.particles.push(createParticle(target.x, target.y, '#fb7185'));
          if (target.health <= 0) eliminate(target);
          return false;
        }
        drawBullet(ctx, bullet);
        return true;
      });

      drawParticles(ctx, state.current.particles);
      ctx.restore();
      const alive = state.current.flags.length;
      setStats({ alive, eliminated: state.current.eliminatedCount, total: alive + state.current.eliminatedCount });

      if (settings.timedRounds && !state.current.winnerSent && now - state.current.startedAt > settings.roundDuration * 1000 && alive > 0) finishWithWinner(pick(state.current.flags));
      if (!state.current.winnerSent && alive === 1) finishWithWinner(state.current.flags[0]);
      raf = requestAnimationFrame(loop);
    };

    function autoShoot(flag, now) {
      const last = state.current.lastShot[flag.id] || 0;
      if (now - last < 620) return;
      const enemies = state.current.flags.filter((enemy) => enemy.id !== flag.id);
      if (!enemies.length) return;
      const target = enemies.sort((a, b) => Math.hypot(a.x - flag.x, a.y - flag.y) - Math.hypot(b.x - flag.x, b.y - flag.y))[0];
      const dir = normalizeVector(target.x - flag.x, target.y - flag.y);
      state.current.bullets.push({ id: crypto.randomUUID(), owner: flag.id, x: flag.x + dir.x * flag.radius, y: flag.y + dir.y * flag.radius, vx: dir.x * 8, vy: dir.y * 8, life: 95, damage: 14 });
      state.current.lastShot[flag.id] = now;
      play('shoot');
    }

    function eliminate(flag) {
      state.current.flags = state.current.flags.filter((item) => item.id !== flag.id);
      state.current.eliminatedCount += 1;
      setEliminations((current) => [`${flag.emoji} ${flag.name} was destroyed`, ...current].slice(0, 14));
      state.current.shake = 10;
      for (let i = 0; i < 30; i += 1) state.current.particles.push(createParticle(flag.x, flag.y, '#fb7185'));
      play('eliminate');
    }

    function finishWithWinner(flag) {
      state.current.winnerSent = true;
      const champion = { ...flag, id: crypto.randomUUID(), mode: 'Shooting Battle', createdAt: Date.now() };
      const saved = saveWinner(champion);
      play('winner');
      window.setTimeout(() => onWinner(champion, saved), 500);
    }

    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [settings, setStats, setEliminations, onWinner, play]);

  useEffect(() => {
    const entry = externalCommand;
    if (!entry || entry.id === state.current.commandId) return;
    state.current.commandId = entry.id;
    const parsed = entry.parsed;
    const parent = canvasRef.current?.parentElement;
    if (!parent || !parsed || parsed.type === 'unknown') return;

    if (parsed.type === 'country') {
      const existing = state.current.flags.find((flag) => flag.code === parsed.country.code && flag.username === entry.author);
      if (existing) { existing.health = Math.min(100, existing.health + 12); return; }
      state.current.flags.push(spawnFlag(parsed.country, parent.clientWidth, parent.clientHeight, entry.author, null, settings.flagSpeed));
    }

    if (parsed.type === 'power') {
      const target = state.current.flags.find((flag) => flag.username === entry.author) || pick(state.current.flags);
      if (!target) return;
      if (parsed.power === 'shield') target.health = Math.min(150, target.health + 35);
      if (parsed.power === 'big') { target.radius = target.baseRadius * 1.45; target.bigUntil = performance.now() + 9000; }
      if (parsed.power === 'speed') { const n = normalizeVector(target.vx, target.vy); target.vx = n.x * settings.flagSpeed * 2.2; target.vy = n.y * settings.flagSpeed * 2.2; target.speedUntil = performance.now() + 7000; }
      if (parsed.power === 'boom') {
        target.weaponUntil = performance.now() + 10000;
        for (let i = 0; i < 35; i += 1) state.current.particles.push(createParticle(target.x, target.y, '#f97316'));
      }
    }
  }, [externalCommand, settings.flagSpeed]);

  return <canvas ref={canvasRef} aria-label="Shooting Battle canvas" />;
}

function drawCombatBackground(ctx, width, height) {
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, 'rgba(2,6,23,1)');
  g.addColorStop(0.5, 'rgba(30,27,75,1)');
  g.addColorStop(1, 'rgba(20,6,22,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 120; i += 1) ctx.fillRect((i * 79) % width, (i * 131) % height, 2, 2);
}

function drawWatermark(ctx, width, height, settings) {
  ctx.save();
  ctx.globalAlpha = settings.watermarkOpacity;
  ctx.font = `${settings.watermarkItalic ? 'italic ' : ''}${settings.watermarkBold ? '900' : '600'} ${settings.watermarkSize}px Inter, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (settings.watermarkShadow) { ctx.shadowColor = settings.accentColor; ctx.shadowBlur = 18; }
  if (settings.watermarkOutline) { ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 5; ctx.strokeText(settings.watermarkText, width / 2, 48); }
  ctx.fillStyle = settings.watermarkColor;
  ctx.fillText(settings.watermarkText, width / 2, 48);
  ctx.restore();
}

function drawBorders(ctx, width, height) {
  ctx.strokeStyle = 'rgba(56,189,248,.5)';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 4;
  drawRoundRect(ctx, 18, 18, width - 36, height - 36, 28);
  ctx.stroke();
}

function drawWeapon(ctx, weapon) {
  if (!weapon) return;
  ctx.save();
  ctx.translate(weapon.x, weapon.y);
  ctx.rotate(performance.now() / 300);
  ctx.font = '34px "Apple Color Emoji", "Segoe UI Emoji"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 20;
  ctx.fillText('⚡', 0, 0);
  ctx.restore();
}

function drawBullet(ctx, bullet) {
  ctx.save();
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
