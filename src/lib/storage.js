export const defaultSettings = {
  watermarkText: 'Ultimate Flag Battle',
  watermarkSize: 28,
  watermarkOpacity: 0.34,
  watermarkColor: '#ffffff',
  watermarkBold: true,
  watermarkItalic: false,
  watermarkOutline: true,
  watermarkShadow: true,
  gapSize: 54,
  rotationSpeed: 0.008,
  flagSpeed: 2.2,
  autoSpawnCount: 16,
  spawnInterval: 3000,
  timedRounds: false,
  roundDuration: 180,
  windowMode: 'landscape',
  theme: 'Neon Purple',
  circleScheme: 'Rainbow',
  hudOpacity: 0.78,
  accentColor: '#38bdf8',
  infoBoxes: 'both',
  muted: true,
  teamAName: 'Team A',
  teamBName: 'Team B',
  teamAColor: '#38bdf8',
  teamBColor: '#fb7185'
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem('ufba-settings');
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings) {
  localStorage.setItem('ufba-settings', JSON.stringify(settings));
}

export function resetSettings() {
  localStorage.removeItem('ufba-settings');
  return defaultSettings;
}

export function loadWinners() {
  try {
    return JSON.parse(localStorage.getItem('ufba-winners') || '[]');
  } catch {
    return [];
  }
}

export function saveWinner(winner) {
  const next = [winner, ...loadWinners()].slice(0, 10);
  localStorage.setItem('ufba-winners', JSON.stringify(next));
  return next;
}

export function clearWinners() {
  localStorage.removeItem('ufba-winners');
  return [];
}
