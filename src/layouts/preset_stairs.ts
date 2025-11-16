import type { LayerMask } from './canonical_turtle_mask';

// Stairs — 144 tiles (approximate): stepped silhouette both in X and Z
export const stairsMasks: LayerMask[] = [
	// 48
	{ layerIndex: 0, offsetX: 0, offsetZ: 0, mask: [
		'      XXXXXXXXXXXX      ',
		'     XXXXXXXXXXXXXX     ',
		'     XXXXXXXXXXXXXX     ',
		'      XXXXXXXXXXXX      '
	]},
	// 40
	{ layerIndex: 1, offsetX: 0, offsetZ: 0, mask: [
		'       XXXXXXXXXX       ',
		'      XXXXXXXXXXXX      ',
		'      XXXXXXXXXXXX      ',
		'       XXXXXXXXXX       '
	]},
	// 28
	{ layerIndex: 2, offsetX: 0.5, offsetZ: 0, mask: [
		'        XXXXXXXX        ',
		'       XXXXXXXXXX       ',
		'       XXXXXXXXXX       ',
		'        XXXXXXXX        '
	]},
	// 18
	{ layerIndex: 3, offsetX: 0.5, offsetZ: 0.5, mask: [
		'         XXXXXX         ',
		'        XXXXXXXXXX      ',
		'         XXXXXX         '
	]},
	// 8
	{ layerIndex: 4, offsetX: 0, offsetZ: 0.5, mask: [
		'          XXXX          ',
		'          XXXX          '
	]},
	// 2
	{ layerIndex: 5, offsetX: 0, offsetZ: 0, mask: [
		'           XX           '
	]}
];


