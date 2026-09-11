# Chox Video integration

This rebuild adds a Chox-branded video section to the existing Chox browser.

## Included
- Chox Video home screen
- Video search using the existing `/api/search` endpoint
- YouTube result detection
- Direct `youtube-nocookie.com` embedded playback
- Local history, favorites, and subscription storage
- Responsive sidebar and video-card UI
- Existing Chox tabs/search/browser preserved

## Important
This is a FreeTube-inspired integration, not a copy of FreeTube source code. No proxy or network-filter bypass is included. Video playback depends on the video provider and the network where Chox is being used.

## Run
```bash
npm install
npm start
```
The existing `BRAVE_API_KEY` environment variable is still required by the Chox server.
