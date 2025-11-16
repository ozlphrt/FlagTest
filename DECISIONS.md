# DECISIONS — v0.1.0

2025-11-16 / v1.01

Decision: Start with a prototype turtle-style stacked layout totaling 144 tiles, implemented via concentric shrinking rectangles per layer. This is not guaranteed to match a canonical “standard turtle” and will be replaced in a future version.
Reason: Unblock 3D scaffolding, camera, coordinate verification, and HUD. Establish baseline for picking and rules.
Rollback: Replace generator with a canonical coordinate table and add validation tests.

Added in v1.01:
- Switched to RoundedBoxGeometry with thinner tiles and touching layers (Y).
- Adjusted spacing to have tiles touch on X, slightly spaced on Z.
- Applied world flags as top textures (rotated 90° CCW) using flagcdn.


