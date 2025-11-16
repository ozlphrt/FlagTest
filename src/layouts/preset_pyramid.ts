import type { LayerMask } from './canonical_turtle_mask';

// Pyramid — 144 tiles (approximate), many rows narrowing steadily
export const pyramidMasks: LayerMask[] = [
	// 48 (6 rows: 6,8,10,10,8,6)
	{ layerIndex: 0, offsetX: 0, offsetZ: 0, mask: [
		'        XXXXXX        ',
		'      XXXXXXXX        ',
		'     XXXXXXXXXX       ',
		'     XXXXXXXXXX       ',
		'      XXXXXXXX        ',
		'        XXXXXX        '
	]},
	// 40 (6 rows: 5,7,9,9,7,5)
	{ layerIndex: 1, offsetX: 0.5, offsetZ: 0, mask: [
		'         XXXXX        ',
		'       XXXXXXX        ',
		'      XXXXXXXXX       ',
		'      XXXXXXXXX       ',
		'       XXXXXXX        ',
		'         XXXXX        '
	]},
	// 28 (5 rows: 4,6,8,6,4)
	{ layerIndex: 2, offsetX: 0, offsetZ: 0, mask: [
		'         XXXX         ',
		'        XXXXXX        ',
		'       XXXXXXXX       ',
		'        XXXXXX        ',
		'         XXXX         '
	]},
	// 18 (4 rows: 3,5,5,3)
	{ layerIndex: 3, offsetX: 0.5, offsetZ: 0, mask: [
		'          XXX         ',
		'         XXXXX        ',
		'         XXXXX        ',
		'          XXX         '
	]},
	// 8 (3 rows: 2,4,2)
	{ layerIndex: 4, offsetX: 0, offsetZ: 0, mask: [
		'           XX         ',
		'         XXXX         ',
		'           XX         '
	]},
	// 2 (1 row: 2)
	{ layerIndex: 5, offsetX: 0, offsetZ: 0, mask: [
		'           XX         '
	]}
];


