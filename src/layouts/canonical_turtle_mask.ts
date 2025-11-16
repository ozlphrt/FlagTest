// Placeholder canonical Turtle layout masks (rectangular layers summing to 144).
// Replace with vetted per-layer masks later.
// Each non-space char denotes a tile.

export type LayerMask = {
	layerIndex: number;
	mask: string[];
	// Optional offsets in units of TILE spacing (can be fractional, e.g., 0.5)
	offsetX?: number;
	offsetZ?: number;
};

export const canonicalTurtleMasks: LayerMask[] = [
	// Layer 0 (base) — 48 tiles across 6 rows: 6,8,10,10,8,6
	{ layerIndex: 0, offsetX: 0, offsetZ: 0, mask: [
		'        XXXXXX        ', // 6
		'      XXXXXXXX        ', // 8
		'     XXXXXXXXXX       ', // 10
		'     XXXXXXXXXX       ', // 10
		'      XXXXXXXX        ', // 8
		'        XXXXXX        '  // 6
	]},
	// Layer 1 — 40 tiles across 6 rows: 4,8,8,8,8,4
	{ layerIndex: 1, offsetX: 0, offsetZ: 0, mask: [
		'         XXXX         ', // 4
		'      XXXXXXXX        ', // 8
		'      XXXXXXXX        ', // 8
		'      XXXXXXXX        ', // 8
		'      XXXXXXXX        ', // 8
		'         XXXX         '  // 4
	]},
	// Layer 2 — 28 tiles across 5 rows: 4,6,8,6,4 (slight X overhang)
	{ layerIndex: 2, offsetX: 0.5, offsetZ: 0, mask: [
		'         XXXX         ', // 4
		'        XXXXXX        ', // 6
		'       XXXXXXXX       ', // 8
		'        XXXXXX        ', // 6
		'         XXXX         '  // 4
	]},
	// Layer 3 — 18 tiles across 4 rows: 3,6,6,3 (X overhang only)
	{ layerIndex: 3, offsetX: 0.5, offsetZ: 0, mask: [
		'          XXX         ', // 3
		'        XXXXXX        ', // 6
		'        XXXXXX        ', // 6
		'          XXX         '  // 3
	]},
	// Layer 4 — 8 tiles across 3 rows: 2,4,2
	{ layerIndex: 4, offsetX: 0, offsetZ: 0, mask: [
		'           XX         ', // 2
		'         XXXX         ', // 4
		'           XX         '  // 2
	]},
	// Layer 5 — 2 tiles: 2
	{ layerIndex: 5, offsetX: 0, offsetZ: 0, mask: [
		'           XX         '  // 2
	]}
];


