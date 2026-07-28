# Jump Together Online Engine

## Overview
This project is a production-style multiplayer 2D platformer engine built with Node.js, Express, Socket.IO, and the Canvas API. It includes a room system, authoritative server movement, a lightweight custom physics loop, and a browser-based client.

## Run locally
1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. Open the browser at `http://localhost:3000`

## Features implemented
- WebSocket-based room creation and joining
- Multiplayer lobby and start flow
- Authoritative server tick loop
- Custom platform physics and jumping
- Desktop keyboard controls
- Canvas renderer for players and platforms

## Next steps
- Add mobile joystick input
- Add animations, particles, checkpoints, and hazards
- Add Docker, Railway, and GitHub Actions deployment files
