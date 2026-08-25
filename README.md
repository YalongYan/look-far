# look-far

20-20-20 eye rest reminder. The packaged app is named **远方**.

Every 20 minutes of screen time, look at something 6 meters away for 20 seconds. It lives in the menu bar / system tray and shows a dark fullscreen overlay when it is time to rest.

## Features

- Menu bar countdown (updates every second)
- Dark fullscreen break overlay with countdown
- Pause / resume without resetting remaining time
- Reset, start break now, skip current break
- Work / break duration, schedule, meal-time skip, sound

## Develop

Requires Node.js 20+.

```bash
yarn
yarn dev
```

The app appears in the macOS menu bar (or Windows tray). Click the icon to open settings.

## Package

```bash
yarn run pack
```

Installers are written to `release/`:

- `远方-1.0.0-mac-arm64.dmg` — Apple Silicon
- `远方-1.0.0-mac-x64.dmg` — Intel Mac
- `远方-1.0.0-win-x64-setup.exe` — Windows x64
