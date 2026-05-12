# Ultimate Flag Battle Arena

A polished React + Vite livestream-style country flag battle game with three Canvas-powered modes:

- Circle Battle
- Shooting Battle
- Team War Battle

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## YouTube live chat

On the launch screen, provide:

- YouTube API key
- Live video ID

The app resolves the live chat ID with `videos.list` and polls `liveChat/messages` directly from the browser. For public deployment, restrict your API key to your domain in Google Cloud Console.

## Test mode

Click **Test Mode – No YouTube** and use the manual command input inside the game.

Example commands:

- `Bangladesh`
- `🇧🇩`
- `shield`
- `boom`
- `big`
- `speed`
- `A India`
- `B Brazil`
