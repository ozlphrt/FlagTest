# COORDINATE_CONVENTIONS — v0.1.0

Global standard:
- Handedness: right-handed
- Up axis: Y-up
- Units: meters
- Origin: center of world grid

Three.js enforcement:
```js
const coordinateSystem = { handedness:'right', up:'Y', origin:'center', units:'meters' };
```

Space declarations & matrix traces:
- All transforms must declare source and target spaces.
- Typical trace:
```
vec_ndc = projection * view * model * vec_local
```

Verification:
- `AxesHelper`, `GridHelper`, and object origins are visible by default.
- Mouse HUD shows world coordinates at raycast hit (if any).


