import { ArrowLeft, Bomb, Crosshair, Shield, Trophy, UsersRound } from 'lucide-react';

const modes = [
  {
    id: 'circle',
    title: 'Circle Battle',
    icon: Shield,
    gradient: 'from-cyan-500 to-fuchsia-500',
    description: 'Flags spawn inside a rotating circular arena with a small gap. Push rivals through the opening and survive as the last country.',
    features: ['Rotating circle arena', 'Gap elimination', 'Shields', 'Boom power-up', 'Big flag power-up', 'Propeller obstacle']
  },
  {
    id: 'shooting',
    title: 'Shooting Battle',
    icon: Crosshair,
    gradient: 'from-rose-500 to-orange-500',
    description: 'A dark combat arena where flags grab weapons, auto-target enemies, fire bullets, shake the screen, and fight by health bars.',
    features: ['Random weapon pickups', 'Auto-targeting', 'Bullet effects', 'Health bars', 'Explosion animation', 'Last survivor winner']
  },
  {
    id: 'team',
    title: 'Team War Battle',
    icon: UsersRound,
    gradient: 'from-emerald-400 to-sky-500',
    description: 'Two teams battle for a central capture zone. Viewers join with A/B commands, build control, and call missile strikes.',
    features: ['Team vs team', 'Objective meter', 'Territory capture', 'Missile power-up', 'Team colors', 'Winning team screen']
  }
];

export default function GameModeSelect({ onSelect, onBack }) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <button className="ghost-button mb-8 inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-bold" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-black uppercase tracking-[.26em] text-cyan-200">Choose the arena</p>
          <h1 className="gradient-text text-4xl font-black tracking-tight md:text-6xl">GAME MODE SELECT</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">Pick one battle mode. You can return here after every winner screen.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                className="group neon-card min-h-[520px] rounded-[2rem] p-6 text-left transition hover:-translate-y-1 hover:border-cyan-300/40"
                onClick={() => onSelect(mode.id)}
              >
                <div className={`mb-5 inline-flex rounded-[1.35rem] bg-gradient-to-br ${mode.gradient} p-4 text-white shadow-neon`}>
                  <Icon size={34} />
                </div>
                <h2 className="text-3xl font-black">{mode.title}</h2>
                <p className="mt-4 min-h-24 text-slate-300">{mode.description}</p>
                <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                <ul className="space-y-3">
                  {mode.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm font-bold text-slate-200">
                      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-neon" /> {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3">
                  <span className="font-black uppercase tracking-[.14em] text-slate-300">Start Mode</span>
                  {mode.id === 'shooting' ? <Bomb className="text-rose-300" /> : <Trophy className="text-yellow-300" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
