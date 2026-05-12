export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const rand = (min, max) => Math.random() * (max - min) + min;
export const pick = (items) => items[Math.floor(Math.random() * items.length)];
export const hypot = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

export function createParticle(x, y, color = '#38bdf8') {
  return {
    id: crypto.randomUUID(),
    x,
    y,
    vx: rand(-3.5, 3.5),
    vy: rand(-3.5, 3.5),
    life: rand(24, 52),
    maxLife: 52,
    size: rand(2, 6),
    color
  };
}

export function collideCircles(a, b, damp = 0.92) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.01;
  const minDist = a.radius + b.radius;
  if (dist >= minDist) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const tx = -ny;
  const ty = nx;
  const dpTanA = a.vx * tx + a.vy * ty;
  const dpTanB = b.vx * tx + b.vy * ty;
  const dpNormA = a.vx * nx + a.vy * ny;
  const dpNormB = b.vx * nx + b.vy * ny;

  a.vx = (tx * dpTanA + nx * dpNormB) * damp;
  a.vy = (ty * dpTanA + ny * dpNormB) * damp;
  b.vx = (tx * dpTanB + nx * dpNormA) * damp;
  b.vy = (ty * dpTanB + ny * dpNormA) * damp;
  return true;
}

export function bounceInsideRect(entity, width, height, margin = 20) {
  if (entity.x - entity.radius < margin) {
    entity.x = margin + entity.radius;
    entity.vx = Math.abs(entity.vx);
  }
  if (entity.x + entity.radius > width - margin) {
    entity.x = width - margin - entity.radius;
    entity.vx = -Math.abs(entity.vx);
  }
  if (entity.y - entity.radius < margin) {
    entity.y = margin + entity.radius;
    entity.vy = Math.abs(entity.vy);
  }
  if (entity.y + entity.radius > height - margin) {
    entity.y = height - margin - entity.radius;
    entity.vy = -Math.abs(entity.vy);
  }
}

export function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawFlagAvatar(ctx, flag, options = {}) {
  const {
    showHealth = false,
    teamColor = '#38bdf8',
    alpha = 1,
    fontScale = 1,
    selected = false
  } = options;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = flag.shield ? '#67e8f9' : teamColor;
  ctx.shadowBlur = selected ? 26 : 14;
  ctx.fillStyle = 'rgba(15,23,42,.92)';
  ctx.strokeStyle = flag.shield ? '#67e8f9' : teamColor;
  ctx.lineWidth = flag.shield ? 5 : 3;
  ctx.beginPath();
  ctx.arc(flag.x, flag.y, flag.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (flag.bigUntil && flag.bigUntil > performance.now()) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(flag.x, flag.y, flag.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.font = `${Math.max(24, flag.radius * 1.15 * fontScale)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(flag.emoji, flag.x, flag.y - 2);

  ctx.font = `700 ${Math.max(10, flag.radius * 0.32)}px Inter, system-ui`;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = 'rgba(2,6,23,.9)';
  ctx.lineWidth = 4;
  const label = flag.name.length > 13 ? `${flag.name.slice(0, 12)}…` : flag.name;
  ctx.strokeText(label, flag.x, flag.y + flag.radius + 14);
  ctx.fillText(label, flag.x, flag.y + flag.radius + 14);

  if (flag.username) {
    ctx.font = `600 ${Math.max(9, flag.radius * 0.24)}px Inter, system-ui`;
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(`@${flag.username.slice(0, 12)}`, flag.x, flag.y + flag.radius + 28);
  }

  if (showHealth) {
    const barW = flag.radius * 1.7;
    const barY = flag.y - flag.radius - 14;
    ctx.fillStyle = 'rgba(15,23,42,.82)';
    drawRoundRect(ctx, flag.x - barW / 2, barY, barW, 6, 4);
    ctx.fill();
    ctx.fillStyle = flag.health > 42 ? '#22c55e' : flag.health > 18 ? '#fbbf24' : '#fb7185';
    drawRoundRect(ctx, flag.x - barW / 2, barY, barW * clamp(flag.health / 100, 0, 1), 6, 4);
    ctx.fill();
  }

  ctx.restore();
}

export function drawParticles(ctx, particles) {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function stepParticles(particles) {
  return particles
    .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vx: p.vx * 0.98, vy: p.vy * 0.98, life: p.life - 1 }))
    .filter((p) => p.life > 0);
}

export function spawnFlag(country, width, height, username, team = null, baseSpeed = 2.2) {
  const radius = rand(24, 32);
  const angle = rand(0, Math.PI * 2);
  const speed = rand(baseSpeed * 0.6, baseSpeed * 1.25);
  return {
    id: crypto.randomUUID(),
    code: country.code,
    name: country.name,
    emoji: country.emoji,
    flagUrl: country.flagUrl,
    username,
    team,
    x: rand(width * 0.25, width * 0.75),
    y: rand(height * 0.24, height * 0.76),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    baseRadius: radius,
    health: 100,
    shield: false,
    speedUntil: 0,
    bigUntil: 0,
    weaponUntil: 0,
    alive: true,
    score: 0
  };
}
