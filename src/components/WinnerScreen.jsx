import { ArrowLeft, PartyPopper, RotateCcw, Trash2, Trophy } from 'lucide-react';

export default function WinnerScreen({ winner, mode, winners, onNewRound, onModes, onClearWinners }) {
  const isTeam = winner?.type === 'team';
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <Confetti />
      <section className="neon-panel pop-in relative z-10 w-full max-w-5xl rounded-[2.3rem] p-6 text-center md:p-10">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-yellow-300/40 bg-yellow-300/10 text-yellow-200 shadow-neon">
          <Trophy size={42} />
        </div>
        <p className="text-sm font-black uppercase tracking-[.32em] text-cyan-200">{mode?.toUpperCase()} Champion</p>
        <h1 className="gradient-text mt-3 text-6xl font-black tracking-tight md:text-8xl">WINNER</h1>

        <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950/50 p-6">
          <div className="text-8xl md:text-9xl">{isTeam ? '🏆' : winner?.emoji || '🏳️'}</div>
          <h2 className="mt-4 text-4xl font-black">{winner?.name || 'No winner'}</h2>
          <p className="mt-2 text-slate-300">
            {isTeam ? `Team score: ${winner?.score ?? 100}%` : winner?.username ? `Spawned by @${winner.username}` : 'Spawned by the arena'}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button className="neon-button rounded-2xl px-5 py-4" onClick={onNewRound}>
            <span className="inline-flex items-center justify-center gap-2"><RotateCcw size={18} /> New Round</span>
          </button>
          <button className="ghost-button rounded-2xl px-5 py-4 font-extrabold" onClick={onModes}>
            <span className="inline-flex items-center justify-center gap-2"><ArrowLeft size={18} /> Back to Game Modes</span>
          </button>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[.03] p-5 text-left">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-black"><PartyPopper size={19} /> Last Winners</h3>
            <button className="ghost-button rounded-xl px-3 py-2 text-xs font-bold" onClick={onClearWinners}><Trash2 size={14} className="inline" /> Clear</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {winners.length ? winners.map((entry, index) => (
              <div key={`${entry.id}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-center">
                <div className="text-3xl">{entry.emoji || '🏆'}</div>
                <p className="mt-1 truncate text-sm font-black">{entry.name}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{entry.mode}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No winner history yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 90 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-sm opacity-80"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${-10 - Math.random() * 20}%`,
            background: ['#38bdf8', '#a855f7', '#fb7185', '#fbbf24', '#22c55e'][i % 5],
            transform: `rotate(${Math.random() * 180}deg)`,
            animation: `fall ${3.2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`
          }}
        />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(120vh) rotate(720deg); } }`}</style>
    </div>
  );
}
