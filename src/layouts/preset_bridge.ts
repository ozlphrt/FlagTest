import type { LayerMask } from './canonical_turtle_mask';

// Bridge — 144 tiles (approximate): long base with gaps, arched middle layers
export const bridgeMasks: LayerMask[] = [
	// 48
	{ layerIndex: 0, offsetX: 0, offsetZ: 0, mask: [
		'  XXXXX  XXXXXX  XXXXX  ', // gaps under the "arch"
		'  XXXXXXXXXXXXXXXX      ',
		'  XXXXXXXXXXXXXXXX      ',
		'  XXXXX  XXXXXX  XXXXX  '
	]},
	// 40
	{ layerIndex: 1, offsetX: 0, offsetZ: 0, mask: [
		'    XXXX  XXXX  XXXX    ',
		'    XXXXXXXXXXXXXX      ',
		'    XXXXXXXXXXXXXX      ',
		'    XXXX  XXXX  XXXX    '
	]},
	// 28
	{ layerIndex: 2, offsetX: 0.5, offsetZ: 0, mask: [
		'      XXXX    XXXX      ',
		'      XXXXXXXXXX        ',
		'      XXXXXXXXXX        ',
		'      XXXX    XXXX      '
	]},
	// 18
	{ layerIndex: 3, offsetX: 0.5, offsetZ: 0, mask: [
		'        XXX  XXX        ',
		'        XXXXXXXXXX      ',
		'        XXX  XXX        '
	]},
	// 8
	{ layerIndex: 4, offsetX: 0, offsetZ: 0, mask: [
		'         XXXX           ',
		'         XXXX           '
	]},
	// 2
	{ layerIndex: 5, offsetX: 0, offsetZ: 0, mask: [
		'          XX            '
	]}
];


