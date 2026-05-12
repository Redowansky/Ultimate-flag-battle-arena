import { useEffect, useRef } from 'react';
import { bounceInsideRect, collideCircles, createParticle, drawFlagAvatar, drawParticles, drawRoundRect, normalizeVector, pick, rand, spawnFlag, stepParticles } from '../lib/physics.js';
import { randomCountries } from '../data/countryData.js';
import { saveWinner } from '../lib/storage.js';
import { useSound } from '../hooks/useSound.js';

export default function TeamWarBattle({ settings, roundNumber, externalCommand, setStats, setEliminations, onWinner }) {
  const canvasRef = useRef(null);
  const state = useRef({
    flags: [], particles: [], missiles: [], commandId: null, winnerSent: false,
    controlA: 0, controlB: 0, eliminatedCount: 0, startedAt: performance.now(), shake: 0
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
      state.current.flags = randomCountries(Math.min(settings.autoSpawnCount, 24)).map((country, index) => spawnTeamFlag(country, parent.clientWidth, parent.clientHeight, index % 2 === 0 ? 'A' : 'B', 'Arena', settings.flagSpeed));
    }

    const loop = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const now = performance.now();
      const objective = { x: width / 2, y: height / 2, radius: Math.min(width, height) * 0.18 };
      state.current.particles = stepParticles(state.current.particles);
      state.current.shake *= 0.84;

      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(rand(-state.current.shake, state.current.shake), rand(-state.current.shake, state.current.shake));
      drawWarBackground(ctx, width, height, settings);
      drawWatermark(ctx, width, height, settings);
      drawObjective(ctx, objective, settings, state.current.controlA, state.current.controlB);
      drawScoreboard(ctx, width, settings, state.current.controlA, state.current.controlB);

      let inA = 0;
      let inB = 0;
      state.current.flags.forEach((flag, index) => {
        if (flag.speedUntil && now > flag.speedUntil) flag.speedUntil = 0;
        if (flag.bigUntil && now > flag.bigUntil) { flag.radius = flag.baseRadius; flag.bigUntil = 0; }
        steerToObjective(flag, objective, settings.flagSpeed);
        flag.x += flag.vx;
        flag.y += flag.vy;
        bounceInsideRect(flag, width, height, 18);
        for (let j = index + 1; j < state.current.flags.length; j += 1) collideCircles(flag, state.current.flags[j], 0.88);
        if (Math.hypot(flag.x - objective.x, flag.y - objective.y) < objective.radius) flag.team === 'A' ? inA++ : inB++;
        drawFlagAvatar(ctx, flag, { showHealth: true, teamColor: flag.team === 'A' ? settings.teamAColor : settings.teamBColor });
      });

      const delta = Math.max(0, Math.abs(inA - inB)) * 0.055;
      if (inA > inB) state.current.controlA = Math.min(100, state.current.controlA + delta);
      if (inB > inA) state.current.controlB = Math.min(100, state.current.controlB + delta);

      stepMissiles(ctx, state.current, settings);
      drawParticles(ctx, state.current.particles);
      ctx.restore();
      const alive = state.current.flags.length;
      setStats({ alive, eliminated: state.current.eliminatedCount, total: alive + state.current.eliminatedCount });

      if (!state.current.winnerSent && state.current.controlA >= 100) finishTeamWinner('A');
      if (!state.current.winnerSent && state.current.controlB >= 100) finishTeamWinner('B');
      if (settings.timedRounds && !state.current.winnerSent && now - state.current.startedAt > settings.roundDuration * 1000) {
        finishTeamWinner(state.current.controlA >= state.current.controlB ? 'A' : 'B');
      }
      raf = requestAnimationFrame(loop);
    };

    function finishTeamWinner(team) {
      state.current.winnerSent = true;
      const champion = {
        id: crypto.randomUUID(),
        type: 'team',
        name: team === 'A' ? settings.teamAName : settings.teamBName,
        emoji: team === 'A' ? '🔵' : '🔴',
        mode: 'Team War Battle',
        score: Math.round(team === 'A' ? state.current.controlA : state.current.controlB),
        createdAt: Date.now()
      };
      const saved = saveWinner(champion);
      play('winner');
      window.setTimeout(() => onWinner(champion, saved), 600);
    }

    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [settings, setStats, onWinner, play]);

  useEffect(() => {
    const entry = externalCommand;
    if (!entry || entry.id === state.current.commandId) return;
    state.current.commandId = entry.id;
    const parsed = entry.parsed;
    const parent = canvasRef.current?.parentElement;
    if (!parent || !parsed || parsed.type === 'unknown') return;

    if (parsed.type === 'country') {
      const team = parsed.team || (Math.random() > 0.5 ? 'A' : 'B');
      const existing = state.current.flags.find((flag) => flag.code === parsed.country.code && flag.username === entry.author && flag.team === team);
      if (existing) { existing.health = Math.min(120, existing.health + 10); return; }
      state.current.flags.push(spawnTeamFlag(parsed.country, parent.clientWidth, parent.clientHeight, team, entry.author, settings.flagSpeed));
    }

    if (parsed.type === 'power') {
      if (parsed.power === 'missile' || parsed.power === 'boom') {
        const team = Math.random() > 0.5 ? 'A' : 'B';
        const targetTeam = team === 'A' ? 'B' : 'A';
        const target = pick(state.current.flags.filter((flag) => flag.team === targetTeam));
        if (target) state.current.missiles.push({ id: crypto.randomUUID(), x: target.x + rand(-220, 220), y: -40, tx: target.x, ty: target.y, team, life: 130 });
      } else {
        const target = state.current.flags.find((flag) => flag.username === entry.author) || pick(state.current.flags);
        if (!target) return;
        if (parsed.power === 'shield') target.health = Math.min(150, target.health + 35);
        if (parsed.power === 'big') { target.radius = target.baseRadius * 1.45; target.bigUntil = performance.now() + 9000; }
        if (parsed.power === 'speed') { const n = normalizeVector(target.vx, target.vy); target.vx = n.x * settings.flagSpeed * 2.4; target.vy = n.y * settings.flagSpeed * 2.4; target.speedUntil = performance.now() + 7000; }
      }
    }
  }, [externalCommand, settings.flagSpeed]);

  return <canvas ref={canvasRef} aria-label="Team War Battle canvas" />;
}

function spawnTeamFlag(country, width, height, team, username, speed) {
  const flag = spawnFlag(country, width, height, username, team, speed);
  flag.x = team === 'A' ? rand(50, width * 0.35) : rand(width * 0.65, width - 50);
  flag.y = rand(70, height - 70);
  flag.health = 100;
  return flag;
}

function steerToObjective(flag, objective, speed) {
  const dir = normalizeVector(objective.x - flag.x, objective.y - flag.y);
  const aggression = flag.team === 'A' ? 0.014 : 0.014;
  flag.vx += dir.x * speed * aggression;
  flag.vy += dir.y * speed * aggression;
  const max = flag.speedUntil ? speed * 2.2 : speed * 1.25;
  const current = Math.hypot(flag.vx, flag.vy) || 1;
  if (current > max) { flag.vx = (flag.vx / current) * max; flag.vy = (flag.vy / current) * max; }
}

function stepMissiles(ctx, state, settings) {
  state.missiles = state.missiles.map((missile) => {
    const dir = normalizeVector(missile.tx - missile.x, missile.ty - missile.y);
    return { ...missile, x: missile.x + dir.x * 8, y: missile.y + dir.y * 8, life: missile.life - 1 };
  }).filter((missile) => {
    drawMissile(ctx, missile, settings);
    if (missile.life <= 0 || Math.hypot(missile.x - missile.tx, missile.y - missile.ty) < 12) {
      state.shake = 16;
      for (let i = 0; i < 44; i += 1) state.particles.push(createParticle(missile.tx, missile.ty, '#f97316'));
      const enemyTeam = missile.team === 'A' ? 'B' : 'A';
      state.flags.forEach((flag) => {
        if (flag.team !== enemyTeam) return;
        const distance = Math.hypot(flag.x - missile.tx, flag.y - missile.ty);
        if (distance < 145) {
          flag.health -= (145 - distance) * 0.36;
          const away = normalizeVector(flag.x - missile.tx, flag.y - missile.ty);
          flag.vx += away.x * 8;
          flag.vy += away.y * 8;
        }
      });
      const before = state.flags.length;
      state.flags = state.flags.filter((flag) => flag.health > 0);
      state.eliminatedCount += before - state.flags.length;
      return false;
    }
    return true;
  });
}

function drawWarBackground(ctx, width, height, settings) {
  const g = ctx.createLinearGradient(0, 0, width, 0);
  g.addColorStop(0, `${settings.teamAColor}26`);
  g.addColorStop(0.5, 'rgba(2,6,23,1)');
  g.addColorStop(1, `${settings.teamBColor}26`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,.05)';
  for (let x = 0; x < width; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
}

function drawWatermark(ctx, width, height, settings) {
  ctx.save();
  ctx.globalAlpha = settings.watermarkOpacity;
  ctx.font = `${settings.watermarkItalic ? 'italic ' : ''}${settings.watermarkBold ? '900' : '600'} ${settings.watermarkSize}px Inter, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (settings.watermarkShadow) { ctx.shadowColor = settings.accentColor; ctx.shadowBlur = 18; }
  if (settings.watermarkOutline) { ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 5; ctx.strokeText(settings.watermarkText, width / 2, 46); }
  ctx.fillStyle = settings.watermarkColor;
  ctx.fillText(settings.watermarkText, width / 2, 46);
  ctx.restore();
}

function drawObjective(ctx, objective, settings, controlA, controlB) {
  ctx.save();
  const total = Math.max(1, controlA + controlB);
  ctx.lineWidth = 15;
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath();
  ctx.arc(objective.x, objective.y, objective.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = settings.teamAColor;
  ctx.shadowColor = settings.teamAColor;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(objective.x, objective.y, objective.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (controlA / 100));
  ctx.stroke();
  ctx.strokeStyle = settings.teamBColor;
  ctx.shadowColor = settings.teamBColor;
  ctx.beginPath();
  ctx.arc(objective.x, objective.y, objective.radius - 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (controlB / 100));
  ctx.stroke();
  ctx.fillStyle = 'rgba(15,23,42,.72)';
  ctx.beginPath();
  ctx.arc(objective.x, objective.y, objective.radius - 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '900 24px Inter, system-ui';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.fillText('CAPTURE ZONE', objective.x, objective.y - 3);
  ctx.font = '700 14px Inter, system-ui';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`${Math.round(controlA)}% vs ${Math.round(controlB)}%`, objective.x, objective.y + 24);
  ctx.restore();
}

function drawScoreboard(ctx, width, settings, controlA, controlB) {
  ctx.save();
  const y = 84;
  drawBar(ctx, 28, y, width / 2 - 48, 18, settings.teamAColor, controlA / 100, settings.teamAName);
  drawBar(ctx, width / 2 + 20, y, width / 2 - 48, 18, settings.teamBColor, controlB / 100, settings.teamBName);
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, color, value, label) {
  ctx.fillStyle = 'rgba(15,23,42,.78)';
  drawRoundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = color;
  drawRoundRect(ctx, x, y, w * value, h, 8);
  ctx.fill();
  ctx.font = '900 12px Inter, system-ui';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 8);
}

function drawMissile(ctx, missile, settings) {
  ctx.save();
  ctx.translate(missile.x, missile.y);
  ctx.rotate(Math.atan2(missile.ty - missile.y, missile.tx - missile.x) + Math.PI / 2);
  ctx.font = '30px "Apple Color Emoji", "Segoe UI Emoji"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 16;
  ctx.fillText('🚀', 0, 0);
  ctx.restore();
}
