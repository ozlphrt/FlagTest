# FlagTest — v1.1.0

## Release Links
- **Repository**: https://github.com/ozlphrt/FlagTest
- **Release**: https://github.com/ozlphrt/FlagTest/releases/tag/v1.0.0
- **Tree**: https://github.com/ozlphrt/FlagTest/tree/v1.0.0
- **Demo**: https://ozlphrt.github.io/FlagTest/

This project is a WebGL/Three.js prototype for a 3D Mahjong Solitaire experience with 144 tiles in a classic turtle-style stacked layout.

## Scope (current)
- 3D scene with `OrbitControls`.
- Right-handed, Y-up coordinate system (units in meters).
- Visual debug: `AxesHelper`, `GridHelper`, and on-screen world coordinates.
- Programmatic 144-tile turtle-style stacked layout (prototype geometry; to be validated against a canonical “standard turtle”).

## Out of scope (current)
- Full game logic (matching, shuffling rules by sets).
- Tile face textures and authentic set distributions.
- UI/UX beyond a basic HUD.

## Acceptance Criteria (for v0.1.0)
1) Scene renders 144 tiles in a stacked turtle-like layout.
2) Coordinate system explicitly declared and debug helpers visible.
3) Camera is initialized with `OrbitControls` and stable defaults.
4) On-screen HUD shows world coordinates under cursor raycast.

## Next Versions
- v1.1.0: Redesign for PWA / Mobile-First (Portrait), five-pillar layout, and threshold logic.
- v1.2.0: Authentic tile faces and distribution rules.
- v1.3.0: Performance profiling and framerate logging.

## Task List
- [x] Create documentation skeleton per project rules.
- [x] Add prototype 3D scene (Three.js) with camera + controls.
- [x] Implement 144-tile turtle-style stacked layout generator.
- [x] Add coordinate system helpers (Axes, Grid, HUD).
- [x] Redesign for PWA / Mobile-First (Portrait).
- [x] Implement five-pillar (left) + hand (right) layout.
- [x] Implement 30% threshold for continent reveal.
- [x] Add Settings button with "Unhide" toggle.
- [x] White tile aesthetic.
- [ ] Add authentic tile faces and distribution rules.
- [ ] Performance profiling and framerate logging.
