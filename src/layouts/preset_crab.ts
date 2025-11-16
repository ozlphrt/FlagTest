import type { LayerMask } from './canonical_turtle_mask';

// Crab — 144 tiles (approximate): wide “claws” on sides and narrow middle
export const crabMasks: LayerMask[] = [
	// 48
	{ layerIndex: 0, offsetX: 0, offsetZ: 0, mask: [
		' XXXXXXX   XXXXXXXXX    ',
		' XXXXXXXXXXXXXXXXXXXX   ',
		' XXXXXXXXXXXXXXXXXXXX   ',
		' XXXXXXX   XXXXXXXXX    '
	]},
	// 40
	{ layerIndex: 1, offsetX: 0, offsetZ: 0, mask: [
		'  XXXXX     XXXXXXX     ',
		'  XXXXXXXXXXXXXXXX      ',
		'  XXXXXXXXXXXXXXXX      ',
		'  XXXXX     XXXXXXX     '
	]},
	// 28
	{ layerIndex: 2, offsetX: 0.5, offsetZ: 0, mask: [
		'   XXXX       XXXX      ',
		'   XXXXXXXXXXXX         ',
		'   XXXXXXXXXXXX         ',
		'   XXXX       XXXX      '
	]},
	// 18
	{ layerIndex: 3, offsetX: 0.5, offsetZ: 0, mask: [
		'    XXX       XXX       ',
		'    XXXXXXXXXX          ',
		'    XXX       XXX       '
	]},
	// 8
	{ layerIndex: 4, offsetX: 0, offsetZ: 0, mask: [
		'     XXXX               ',
		'     XXXX               '
	]},
	// 2
	{ layerIndex: 5, offsetX: 0, offsetZ: 0, mask: [
		'      XX                '
	]}
];


