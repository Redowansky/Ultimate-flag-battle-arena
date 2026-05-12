import { useState } from 'react';
import { ChevronDown, RotateCcw, Save, Settings, Volume2, VolumeX } from 'lucide-react';
import { defaultSettings, resetSettings } from '../lib/storage.js';

const themes = ['Sky Blue', 'Dark Space', 'Sunset', 'Deep Ocean', 'Forest Green', 'Neon Purple', 'Fire Red'];
const schemes = ['Rainbow', 'Fire', 'Ocean', 'Neon', 'Gold', 'Monochrome'];

export default function SettingsPanel({ settings, setSettings, onNewRound, onSpawnDefaults }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function reset() {
    setSettings(resetSettings());
  }

  return (
    <aside className="neon-panel rounded-[1.5rem]">
      <button className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setOpen((value) => !value)}>
        <span className="inline-flex items-center gap-2 text-lg font-black"><Settings size={20} /> Settings / Controls</span>
        <ChevronDown className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="max-h-[70vh] space-y-5 overflow-auto border-t border-white/10 p-4">
          <Section title="Watermark">
            <Input label="Watermark text" value={settings.watermarkText} onChange={(value) => update('watermarkText', value)} />
            <Range label="Size" min="12" max="64" step="1" value={settings.watermarkSize} onChange={(value) => update('watermarkSize', Number(value))} />
            <Range label="Opacity" min="0.05" max="1" step="0.05" value={settings.watermarkOpacity} onChange={(value) => update('watermarkOpacity', Number(value))} />
            <Input label="Color" type="color" value={settings.watermarkColor} onChange={(value) => update('watermarkColor', value)} />
            <ToggleGrid items={[
              ['watermarkBold', 'Bold'], ['watermarkItalic', 'Italic'], ['watermarkOutline', 'Outline'], ['watermarkShadow', 'Shadow']
            ]} settings={settings} update={update} />
          </Section>

          <Section title="Arena">
            <Range label="Circle gap size" min="25" max="120" step="1" value={settings.gapSize} onChange={(value) => update('gapSize', Number(value))} />
            <Range label="Rotation speed" min="0" max="0.04" step="0.001" value={settings.rotationSpeed} onChange={(value) => update('rotationSpeed', Number(value))} />
            <Range label="Flag speed" min="0.6" max="5" step="0.1" value={settings.flagSpeed} onChange={(value) => update('flagSpeed', Number(value))} />
            <Range label="Auto-spawn count" min="4" max="64" step="1" value={settings.autoSpawnCount} onChange={(value) => update('autoSpawnCount', Number(value))} />
            <Range label="Spawn interval ms" min="1000" max="10000" step="500" value={settings.spawnInterval} onChange={(value) => update('spawnInterval', Number(value))} />
            <button className="ghost-button w-full rounded-xl px-3 py-2 font-bold" onClick={onSpawnDefaults}>Spawn default countries</button>
          </Section>

          <Section title="Timed rounds">
            <label className="flex items-center justify-between rounded-xl bg-white/[.04] px-3 py-2 text-sm font-bold">
              Enable timed rounds
              <input type="checkbox" checked={settings.timedRounds} onChange={(event) => update('timedRounds', event.target.checked)} />
            </label>
            <Select label="Round duration" value={settings.roundDuration} onChange={(value) => update('roundDuration', Number(value))} options={[
              [60, '1m'], [180, '3m'], [300, '5m'], [600, '10m']
            ]} />
          </Section>

          <Section title="Window and UI">
            <Select label="Window mode" value={settings.windowMode} onChange={(value) => update('windowMode', value)} options={[[ 'landscape', 'Landscape mode' ], [ 'mobile', 'Mobile mode' ]]} />
            <Select label="UI theme" value={settings.theme} onChange={(value) => update('theme', value)} options={themes.map((t) => [t, t])} />
            <Select label="Circle color scheme" value={settings.circleScheme} onChange={(value) => update('circleScheme', value)} options={schemes.map((t) => [t, t])} />
            <Range label="HUD opacity" min="0.2" max="1" step="0.05" value={settings.hudOpacity} onChange={(value) => update('hudOpacity', Number(value))} />
            <Input label="Accent color" type="color" value={settings.accentColor} onChange={(value) => update('accentColor', value)} />
            <Select label="Info boxes" value={settings.infoBoxes} onChange={(value) => update('infoBoxes', value)} options={[
              ['both', 'Both'], ['join', 'How to Join only'], ['winners', 'Last Winners only'], ['hide', 'Hide all']
            ]} />
          </Section>

          <Section title="Team War">
            <Input label="Team A name" value={settings.teamAName} onChange={(value) => update('teamAName', value)} />
            <Input label="Team A color" type="color" value={settings.teamAColor} onChange={(value) => update('teamAColor', value)} />
            <Input label="Team B name" value={settings.teamBName} onChange={(value) => update('teamBName', value)} />
            <Input label="Team B color" type="color" value={settings.teamBColor} onChange={(value) => update('teamBColor', value)} />
          </Section>

          <div className="grid gap-2 sm:grid-cols-2">
            <button className="neon-button rounded-xl px-3 py-3" onClick={save}><Save size={16} className="inline" /> {saved ? 'Saved' : 'Save Settings'}</button>
            <button className="ghost-button rounded-xl px-3 py-3 font-bold" onClick={reset}><RotateCcw size={16} className="inline" /> Reset Default</button>
            <button className="ghost-button rounded-xl px-3 py-3 font-bold" onClick={onNewRound}>New Round</button>
            <button className="ghost-button rounded-xl px-3 py-3 font-bold" onClick={() => update('muted', !settings.muted)}>
              {settings.muted ? <VolumeX size={16} className="inline" /> : <Volume2 size={16} className="inline" />} {settings.muted ? 'Muted' : 'Sound On'}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }) {
  return <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-3"><h3 className="mb-3 text-sm font-black uppercase tracking-[.18em] text-cyan-200">{title}</h3><div className="space-y-3">{children}</div></section>;
}

function Input({ label, value, onChange, type = 'text' }) {
  return <label className="block text-sm"><span className="mb-1 block font-bold text-slate-300">{label}</span><input type={type} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 outline-none focus:border-cyan-300" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Range({ label, value, onChange, ...props }) {
  return <label className="block text-sm"><span className="mb-1 flex justify-between font-bold text-slate-300"><span>{label}</span><span>{value}</span></span><input className="range w-full" type="range" value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="block text-sm"><span className="mb-1 block font-bold text-slate-300">{label}</span><select className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 outline-none focus:border-cyan-300" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([val, name]) => <option key={val} value={val}>{name}</option>)}</select></label>;
}

function ToggleGrid({ items, settings, update }) {
  return <div className="grid grid-cols-2 gap-2">{items.map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-xl bg-white/[.04] px-3 py-2 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={(event) => update(key, event.target.checked)} /></label>)}</div>;
}

export { defaultSettings };
