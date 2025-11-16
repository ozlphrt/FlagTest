import type { LayerMask } from './canonical_turtle_mask';

// Dragon — 144 tiles (approximate), longer middle with tapered ends and small horns
export const dragonMasks: LayerMask[] = [
	// 48
	{ layerIndex: 0, offsetX: 0, offsetZ: 0, mask: [
		'      XXXXXXXXXX      ',
		'    XXXXXXXXXXXXXX    ',
		'   XXXXXXXXXXXXXXXX   ',
		'    XXXXXXXXXXXXXX    ',
		'      XXXXXXXXXX      '
	]},
	// 40
	{ layerIndex: 1, offsetX: 0, offsetZ: 0, mask: [
		'       XXXXXXXX       ',
		'     XXXXXXXXXXXX     ',
		'     XXXXXXXXXXXX     ',
		'       XXXXXXXX       '
	]},
	// 28
	{ layerIndex: 2, offsetX: 0.5, offsetZ: 0, mask: [
		'        XXXXXX        ',
		'       XXXXXXXX       ',
		'       XXXXXXXX       ',
		'        XXXXXX        '
	]},
	// 18
	{ layerIndex: 3, offsetX: 0.5, offsetZ: 0.5, mask: [
		'         XXXX         ',
		'      XXXXXXXXXX      ',
		'         XXXX         '
	]},
	// 8
	{ layerIndex: 4, offsetX: 0, offsetZ: 0.5, mask: [
		'         XXXX         ',
		'         XXXX         '
	]},
	// 2
	{ layerIndex: 5, offsetX: 0, offsetZ: 0, mask: [
		'          XX          '
	]}
];


