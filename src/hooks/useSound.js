export function useSound(settings) {
  const play = (kind = 'tick') => {
    if (settings.muted) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const profile = {
      spawn: [520, 0.035],
      eliminate: [140, 0.07],
      boom: [78, 0.12],
      winner: [740, 0.22],
      shoot: [320, 0.025],
      power: [900, 0.045]
    }[kind] || [440, 0.04];
    osc.type = kind === 'boom' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(profile[0], ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, profile[0] * 0.55), ctx.currentTime + profile[1]);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + profile[1]);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + profile[1]);
    window.setTimeout(() => ctx.close(), 500);
  };
  return play;
}
