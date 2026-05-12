import { useState } from 'react';
import { Gamepad2, KeyRound, RadioTower, TestTube2, PlayCircle } from 'lucide-react';

export default function LaunchScreen({ initial, onLaunch }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError('');
  }

  function submit(testMode = false) {
    if (!form.licenseKey.trim()) {
      setError('Please enter a license key.');
      return;
    }
    onLaunch({ ...form, testMode });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute left-[8%] top-[14%] h-36 w-36 rounded-full bg-cyan-500 blur-3xl" />
        <div className="absolute right-[10%] top-[18%] h-44 w-44 rounded-full bg-fuchsia-600 blur-3xl" />
        <div className="absolute bottom-[10%] left-[36%] h-48 w-48 rounded-full bg-rose-500 blur-3xl" />
      </div>

      <section className="neon-panel relative z-10 grid w-full max-w-6xl gap-8 rounded-[2rem] p-6 md:grid-cols-[1.08fr_.92fr] md:p-10">
        <div className="flex flex-col justify-between gap-8 rounded-[1.5rem] border border-cyan-300/15 bg-slate-950/30 p-7">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-bold uppercase tracking-[.18em] text-cyan-200">
              <RadioTower size={16} /> Interactive Live Stream Game
            </div>
            <h1 className="text-5xl font-black leading-none tracking-tight md:text-7xl">
              <span className="gradient-text">ULTIMATE</span><br />FLAG BATTLE
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Launch a neon arena where viewers type country names, flag emojis, and power commands to make flags fight live on screen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {['Circle Battle', 'Shooting Battle', 'Team War'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <div className="text-2xl">{item === 'Circle Battle' ? '⭕' : item === 'Shooting Battle' ? '⚡' : '🚩'}</div>
                <p className="mt-2 text-sm font-extrabold uppercase tracking-wide text-slate-100">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="neon-card rounded-[1.5rem] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-200"><Gamepad2 /></div>
            <div>
              <h2 className="text-2xl font-black">Launch Control</h2>
              <p className="text-sm text-slate-400">Demo license accepts any non-empty key.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field icon={<KeyRound size={18} />} label="License Key" value={form.licenseKey} onChange={(value) => update('licenseKey', value)} placeholder="Enter demo license" />
            <Field label="Channel / Watermark Name" value={form.watermarkName} onChange={(value) => update('watermarkName', value)} placeholder="Your Channel Name" />
            <Field icon={<PlayCircle size={18} />} label="YouTube API Key" value={form.apiKey} onChange={(value) => update('apiKey', value)} placeholder="AIza…" />
            <Field label="Live Video ID" value={form.videoId} onChange={(value) => update('videoId', value)} placeholder="Example: dQw4w9WgXcQ" />
          </div>

          {error && <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200">{error}</div>}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="neon-button rounded-2xl px-5 py-4" onClick={() => submit(false)}>Launch Game</button>
            <button className="ghost-button rounded-2xl px-5 py-4 font-extrabold" onClick={() => submit(true)}>
              <span className="inline-flex items-center justify-center gap-2"><TestTube2 size={18} /> Test Mode – No YouTube</span>
            </button>
          </div>
          <p className="mt-5 text-center text-xs uppercase tracking-[.16em] text-slate-500">© 2026 Ultimate Flag Battle Arena. Original livestream game UI.</p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, icon }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold uppercase tracking-[.14em] text-slate-300">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 focus-within:border-cyan-300/70">
        {icon && <span className="text-cyan-200">{icon}</span>}
        <input
          className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-600"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}
