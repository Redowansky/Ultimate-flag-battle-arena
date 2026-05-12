import { findCountry, countryByEmoji } from '../data/countryData.js';

const powerWords = ['shield', 'boom', 'big', 'speed', 'missile'];

export function parseChatCommand(raw = '', mode = 'circle') {
  const text = raw.trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  const exactPower = powerWords.find((word) => lower === word || lower.includes(`!${word}`));
  if (exactPower) return { type: 'power', power: exactPower, raw: text };

  const teamMatch = text.match(/^([ab])\s+(.+)$/i);
  if (mode === 'team' && teamMatch) {
    const country = countryByEmoji(teamMatch[2]) || findCountry(teamMatch[2]);
    if (country) return { type: 'country', country, team: teamMatch[1].toUpperCase(), raw: text };
  }

  const emojiCountry = countryByEmoji(text);
  if (emojiCountry) return { type: 'country', country: emojiCountry, raw: text };

  const country = findCountry(text);
  if (country) return { type: 'country', country, raw: text };

  return { type: 'unknown', raw: text };
}
