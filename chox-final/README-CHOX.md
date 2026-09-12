# Chox + FreeTube

This project combines the Chox browser frontend with the supplied FreeTube development source.

## What is included

- Chox browser UI
- Chox search frontend/backend files
- FreeTube source under `freetube/`
- Electron desktop shell
- Chox Video button that starts the supplied FreeTube development app
- Secure Electron preload bridge
- FreeTube's original license and attribution files

## Run Chox

Requirements:
- Node.js
- npm
- pnpm

From this folder:

```bash
npm install
npm start
```

The first time Chox Video is opened, the desktop shell starts FreeTube's own development process:

```bash
pnpm --dir freetube dev
```

You should install FreeTube's dependencies first if needed:

```bash
cd freetube
pnpm install
cd ..
```

## Build FreeTube

```bash
pnpm --dir freetube install
pnpm --dir freetube build
```

## Important architecture note

FreeTube is a full Vue/Electron application. It is not safe or practical to paste its renderer into the Chox HTML file. This integration keeps the actual FreeTube source intact and uses Electron to start it from Chox.

The Chox web version/GitHub Pages version cannot run the Electron FreeTube integration. The desktop Chox build is required for the integration.

## License

FreeTube is licensed under GNU AGPL-3.0-or-later. Keep the FreeTube `LICENSE`, copyright notices, and required attribution when redistributing this combined project.
