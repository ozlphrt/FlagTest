# PERFORMANCE_LOG — v1.01

Target: 60 FPS under load.

v1.01
- Geometry: RoundedBoxGeometry tiles (radius 0.12, 3 segments), thinner height (0.35).
- Materials: Top face uses world flag textures (flagcdn w320), rotated 90° CCW; sides/bottom neutral.
- Layout: Data-driven presets, placeholder “canonical_turtle” (rectangular layers totaling 144).
- Spacing: X touching (1.0), Z slightly increased (1.35), Y layers touching (0.35).
- Helpers: AxesHelper, GridHelper, HUD for world coords; OrbitControls.
- Perf note: Higher-res textures and rounded geometry still run smoothly on modern GPUs.


