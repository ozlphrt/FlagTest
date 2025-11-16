# Mahjong 3D — v1.01

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
5) All code is runnable via a single `index.html` without a build step.

## Next Versions
- v0.2.0: Replace layout with canonical “standard turtle” coordinates and add validation tests.
- v0.3.0: Tile picking, highlighting, and match-eligibility rules.
- v0.4.0: Texture atlas for authentic tile faces and proper set distribution.


