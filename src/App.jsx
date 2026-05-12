import { useMemo, useState } from 'react';
import { clearWinners, loadSettings, loadWinners, saveSettings as persistSettings } from './lib/storage.js';
import LaunchScreen from './components/LaunchScreen.jsx';
import GameModeSelect from './components/GameModeSelect.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import WinnerScreen from './components/WinnerScreen.jsx';

const initialLaunch = {
  licenseKey: '',
  watermarkName: 'Ultimate Flag Battle',
  apiKey: '',
  videoId: '',
  testMode: false
};

export default function App() {
  const [screen, setScreen] = useState('launch');
  const [launch, setLaunch] = useState(initialLaunch);
  const [mode, setMode] = useState(null);
  const [settings, setSettings] = useState(() => loadSettings());
  const [winners, setWinners] = useState(() => loadWinners());
  const [winner, setWinner] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);

  const mergedSettings = useMemo(() => ({
    ...settings,
    watermarkText: launch.watermarkName || settings.watermarkText
  }), [settings, launch.watermarkName]);

  function updateSettings(next) {
    const resolved = typeof next === 'function' ? next(settings) : next;
    setSettings(resolved);
    persistSettings(resolved);
  }

  function handleLaunch(payload) {
    setLaunch(payload);
    updateSettings({ ...settings, watermarkText: payload.watermarkName || settings.watermarkText });
    setScreen('modes');
  }

  function startMode(nextMode) {
    setMode(nextMode);
    setWinner(null);
    setScreen('game');
  }

  function handleWinner(champion, savedWinners) {
    setWinner(champion);
    setWinners(savedWinners);
    setScreen('winner');
  }

  function newRound() {
    setRoundNumber((value) => value + 1);
    setWinner(null);
    setScreen(mode ? 'game' : 'modes');
  }

  function clearHistory() {
    setWinners(clearWinners());
  }

  return (
    <div className="min-h-screen overflow-hidden text-slate-100">
      {screen === 'launch' && <LaunchScreen initial={launch} onLaunch={handleLaunch} />}
      {screen === 'modes' && <GameModeSelect onSelect={startMode} onBack={() => setScreen('launch')} />}
      {screen === 'game' && (
        <GameCanvas
          key={`${mode}-${roundNumber}`}
          mode={mode}
          launch={launch}
          settings={mergedSettings}
          setSettings={updateSettings}
          winners={winners}
          roundNumber={roundNumber}
          onWinner={handleWinner}
          onBackToModes={() => setScreen('modes')}
          onNewRound={newRound}
          onClearWinners={clearHistory}
        />
      )}
      {screen === 'winner' && (
        <WinnerScreen
          winner={winner}
          mode={mode}
          winners={winners}
          onNewRound={newRound}
          onModes={() => setScreen('modes')}
          onClearWinners={clearHistory}
        />
      )}
    </div>
  );
}
