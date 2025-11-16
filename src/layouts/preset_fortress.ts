import type { LayerMask } from './canonical_turtle_mask';

// Fortress/Castle — 144 tiles (approximate), blocky with battlement-like top rows
export const fortressMasks: LayerMask[] = [
	// 48
	{ layerIndex: 0, offsetX: 0, offsetZ: 0, mask: [
		'     XXXXXXXXXXXX     ',
		'     XXXXXXXXXXXX     ',
		'     XXXXXXXXXXXX     ',
		'     XXXXXXXXXXXX     '
	]},
	// 40
	{ layerIndex: 1, offsetX: 0, offsetZ: 0, mask: [
		'      XXXXXXXXXX      ',
		'    XXXXXXXXXXXXXX    ',
		'    XXXXXXXXXXXXXX    ',
		'      XXXXXXXXXX      '
	]},
	// 28
	{ layerIndex: 2, offsetX: 0, offsetZ: 0, mask: [
		'       XXXXXXXX       ',
		'       XXXXXXXX       ',
		'       XXXXXXXX       ',
		'       XXXXXXXX       '
	]},
	// 18
	{ layerIndex: 3, offsetX: 0.5, offsetZ: 0, mask: [
		'        XXXXXX        ',
		'      XXXXXXXXXX      ',
		'        XXXXXX        '
	]},
	// 8
	{ layerIndex: 4, offsetX: 0.5, offsetZ: 0, mask: [
		'         XXXX         ',
		'         XXXX         '
	]},
	// 2
	{ layerIndex: 5, offsetX: 0, offsetZ: 0, mask: [
		'          XX          '
	]}
];


