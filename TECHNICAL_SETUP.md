# TECHNICAL_SETUP — v0.1.0

## Requirements
- Modern browser with ES Modules support.
- No build step required; we use CDN ES modules.

## Run Locally
1. Open `index.html` in a browser (or serve with a simple HTTP server to avoid CORS on some systems).
2. Verify you see a 3D scene with stacked tiles and debug HUD.

## Libraries
- Three.js (CDN)
- three/examples `OrbitControls` (CDN)

## Notes
- Coordinate system is right-handed, Y-up. Units are meters.
- See `COORDINATE_CONVENTIONS.md` for details.


