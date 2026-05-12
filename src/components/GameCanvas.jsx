import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RadioTower, Send, Trash2 } from 'lucide-react';
import SettingsPanel from './SettingsPanel.jsx';
import CircleBattle from './CircleBattle.jsx';
import ShootingBattle from './ShootingBattle.jsx';
import TeamWarBattle from './TeamWarBattle.jsx';
import { parseChatCommand } from '../lib/chatParser.js';
import { countries, randomCountries } from '../data/countryData.js';
import { startYouTubePolling } from '../lib/youtubeChat.js';

const modeLabels = {
  circle: 'Circle Battle',
  shooting: 'Shooting Battle',
  team: 'Team War Battle'
};

export default function GameCanvas({
  mode,
  launch,
  settings,
  setSettings,
  winners,
  roundNumber,
  onWinner,
  onBackToModes,
  onNewRound,
  onClearWinners
}) {
  const [manual, setManual] = useState('');
  const [commands, setCommands] = useState([]);
  const [eliminations, setEliminations] = useState([]);
  const [status, setStatus] = useState(launch.testMode ? 'Test mode active. Manual commands enabled.' : 'Preparing YouTube live chat…');
  const [chatError, setChatError] = useState('');
  const [externalCommand, setExternalCommand] = useState(null);
  const [stats, setStats] = useState({ alive: 0, eliminated: 0, total: 0 });

  const parserMode = mode === 'team' ? 'team' : mode;

  const ingestText = useCallback((text, author = 'Host') => {
    const parsed = parseChatCommand(text, parserMode);
    const entry = {
      id: crypto.randomUUID(),
      text,
      author,
      parsed,
      createdAt: Date.now()
    };
    setCommands((current) => [entry, ...current].slice(0, 18));
    setExternalCommand(entry);
  }, [parserMode]);

  useEffect(() => {
    if (launch.testMode) return undefined;
    if (!launch.apiKey || !launch.videoId) {
      setStatus('Missing YouTube API key or live video ID. Use test mode or return to launch.');
      return undefined;
    }
    return startYouTubePolling({
      apiKey: launch.apiKey,
      videoId: launch.videoId,
      onStatus: setStatus,
      onError: (message) => {
        setChatError(message);
        setStatus('YouTube retry in progress…');
      },
      onMessage: (message) => ingestText(message.text, message.author)
    });
  }, [launch.apiKey, launch.videoId, launch.testMode, ingestText]);

  function submitManual(event) {
    event.preventDefault();
    if (!manual.trim()) return;
    ingestText(manual.trim(), 'Manual');
    setManual('');
  }

  function spawnDefaults() {
    randomCountries(settings.autoSpawnCount).forEach((country, index) => {
      window.setTimeout(() => ingestText(mode === 'team' ? `${index % 2 === 0 ? 'A' : 'B'} ${country.name}` : country.name, 'Arena'), index * 70);
    });
  }

  const battleProps = {
    settings,
    roundNumber,
    externalCommand,
    commands,
    setStats,
    setEliminations: (value) => setEliminations(typeof value === 'function' ? value : value),
    onWinner,
    onSpawnDefaultRequest: spawnDefaults
  };

  const showJoin = settings.infoBoxes === 'both' || settings.infoBoxes === 'join';
  const showWinners = settings.infoBoxes === 'both' || settings.infoBoxes === 'winners';

  const tickerItems = useMemo(() => {
    const commandItems = commands.slice(0, 8).map((item) => `${item.author}: ${item.text}`);
    const elimItems = eliminations.slice(0, 8).map((item) => `ELIMINATED: ${item}`);
    return [...commandItems, ...elimItems, 'Type your country name to join', 'Power commands: shield · boom · big · speed'].filter(Boolean);
  }, [commands, eliminations]);

  return (
    <main className={`min-h-screen px-3 py-3 md:px-5 md:py-5 ${settings.windowMode === 'mobile' ? 'max-w-[520px] mx-auto' : ''}`} style={{ '--accent': settings.accentColor }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <button className="ghost-button rounded-2xl px-4 py-2 font-bold" onClick={onBackToModes}><ArrowLeft size={17} className="inline" /> Modes</button>
        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-300">
          <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-cyan-200"><RadioTower size={14} className="inline" /> {launch.testMode ? 'Test Mode' : 'YouTube Live'}</span>
          <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2">{status}</span>
        </div>
      </div>
      {chatError && <div className="mb-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200">{chatError}</div>}

      <div className="grid gap-3 xl:grid-cols-[260px_1fr_300px]">
        {showJoin && <InfoBox title="How to Join">
          <p>Type your country name.</p>
          <p>Use a flag emoji: 🇧🇩 🇮🇳 🇧🇷</p>
          <p>Power commands: shield, boom, big, speed.</p>
          <p>Team War: <b>A Bangladesh</b> or <b>B India</b>.</p>
          <p>Type 5 times for a temporary big flag.</p>
        </InfoBox>}

        <section className="min-w-0">
          <Hud stats={stats} roundNumber={roundNumber} mode={modeLabels[mode]} settings={settings} />
          <div className={`relative overflow-hidden rounded-[1.5rem] border border-cyan-300/20 bg-black/35 shadow-neon ${settings.windowMode === 'mobile' ? 'h-[74vh]' : 'h-[min(72vh,760px)] min-h-[520px]'}`}>
            {mode === 'circle' && <CircleBattle {...battleProps} />}
            {mode === 'shooting' && <ShootingBattle {...battleProps} />}
            {mode === 'team' && <TeamWarBattle {...battleProps} />}
          </div>

          <form className="mt-3 flex gap-2" onSubmit={submitManual}>
            <input className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 outline-none focus:border-cyan-300" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Manual command: Bangladesh, 🇧🇩, shield, boom, A India…" />
            <button className="neon-button rounded-2xl px-5" type="submit"><Send size={18} /></button>
          </form>

          <Ticker items={tickerItems} />
        </section>

        <aside className="space-y-3">
          {showWinners && <InfoBox title="Last Winners">
            {winners.length ? winners.slice(0, 10).map((winner, index) => (
              <div key={`${winner.id}-${index}`} className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-3 py-2">
                <span className="text-2xl">{winner.emoji || '🏆'}</span>
                <span className="min-w-0"><b className="block truncate">{winner.name}</b><span className="text-xs uppercase tracking-wide text-slate-500">{winner.mode}</span></span>
              </div>
            )) : <p>No winners yet.</p>}
            <button className="ghost-button mt-2 rounded-xl px-3 py-2 text-xs font-bold" onClick={onClearWinners}><Trash2 size={14} className="inline" /> Clear history</button>
          </InfoBox>}

          <InfoBox title="Country Support">
            <div className="max-h-40 overflow-auto text-xs leading-6 text-slate-300">
              {countries.slice(0, 100).map((country) => <span key={country.code} className="mr-2 whitespace-nowrap">{country.emoji} {country.name}</span>)}
            </div>
          </InfoBox>

          <SettingsPanel settings={settings} setSettings={setSettings} onNewRound={onNewRound} onSpawnDefaults={spawnDefaults} />
        </aside>
      </div>
    </main>
  );
}

function Hud({ stats, roundNumber, mode, settings }) {
  const items = [
    ['Flags Alive', stats.alive],
    ['Round Number', roundNumber],
    ['Eliminated', stats.eliminated],
    ['Current Mode', mode]
  ];
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4" style={{ opacity: settings.hudOpacity }}>
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[.16em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-black text-slate-50">{value}</p>
        </div>
      ))}
    </div>
  );
}

function InfoBox({ title, children }) {
  return <aside className="neon-panel rounded-[1.5rem] p-4 text-sm text-slate-300"><h3 className="mb-3 text-base font-black uppercase tracking-[.18em] text-cyan-200">{title}</h3><div className="space-y-2">{children}</div></aside>;
}

function Ticker({ items }) {
  const loop = items.length ? [...items, ...items] : ['Waiting for chat commands…', 'Waiting for chat commands…'];
  return (
    <div className="ticker-mask mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 py-3">
      <div className="ticker-track flex w-max gap-8 whitespace-nowrap px-4 text-sm font-bold text-slate-300">
        {loop.map((item, index) => <span key={`${item}-${index}`}>⚡ {item}</span>)}
      </div>
    </div>
  );
}
