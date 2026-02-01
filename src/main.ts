import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import GUI from 'lil-gui';
import { canonicalTurtleMasks } from './layouts/canonical_turtle_mask';
import { dragonMasks } from './layouts/preset_dragon';
import { fortressMasks } from './layouts/preset_fortress';
import { pyramidMasks } from './layouts/preset_pyramid';
import { bridgeMasks } from './layouts/preset_bridge';
import { crabMasks } from './layouts/preset_crab';
import { UN193_ISO2 } from './data/un193';
import { continentOf, type Continent } from './data/continents';

// -----------------------------------------------------------------------------
// Constants & Configuration
// -----------------------------------------------------------------------------
const TILE = {
	width: 2.4,
	height: 0.5,
	depth: 1.7,
	spacingX: 2.6,
	spacingZ: 1.9,
	layerStepY: 0.5
};

const physicsParams = { snapDown: true };
const antiOverlapParams = { enabled: true, delta: 0.1 };
const hoverParams = { eligibleLift: 0.0, lightIntensity: 1.0, lightDistance: 30, lightHeight: 1.15, shininessBoost: 32, lightColor: '#ffffff' };
const varietyParams = { autoPreset: true, randomQuarterRotations: true, jitterEnabled: false, jitterAmount: 0.25, strictNoOverlap: true, staggerTriadX: true, staggerAmountX: 0.33, staggerTriadZ: true, staggerAmountZ: 0.33 };
const stagedParams = { enabled: false, perTileMs: 60, dropHeight: 6, dropMs: 140, autoAdvance: true, layerPauseMs: 200 };
const globalDropParams = { enabled: true, height: 20, totalMs: 3000 };
const markersState = { visible: false, size: 6, color: '#00ffff' };

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Vec3 = THREE.Vector3;
type TileRecord = { mesh: THREE.Mesh, topMat: THREE.MeshPhongMaterial, iso: string };
type PresetGenerator = () => Vec3[];

// -----------------------------------------------------------------------------
// Global State
// -----------------------------------------------------------------------------
let tileRecords: TileRecord[] = [];
let levelIndex = 1;
let levelPureAchieved = false;
let modalOpen = false;
let isoLabelsEnabled = true;
let continentEdgesEnabled = false;
let displayIsoOnly = false;
let continentsEnabled = false;
let countriesEnabled = false;
let interactionLockUntil = 0;
let autoSeedOnLoad = true;
let currentPreset: string = 'canonical_turtle';
let gameMode: 'mahjong' | 'pipes' = 'pipes';
let showEmptyBase = false;
const tracksState = { visible: false };
let lastPositions: Vec3[] = [];
let lastHover: THREE.Mesh | null = null;
let pointerActive = false;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const selected: Array<{ mesh: THREE.Mesh, time: number }> = [];

const randomState = {
	seed: 98597,
	mirrorX: false,
	mirrorZ: false,
	rotate180: false
};

const tilesGroup = new THREE.Group();
const trackLabelsGroup = new THREE.Group();
const handLabelGroup = new THREE.Group();
const tracksGroup = new THREE.Group();
const markersGroup = new THREE.Group();
const LayoutRegistry: Record<string, PresetGenerator> = {};

// Cache & Loaders
const textureCache = new Map<string, { tex: THREE.Texture, refs: number }>();
const sharedTexLoader = new THREE.TextureLoader();
sharedTexLoader.setCrossOrigin('anonymous');
const countryNameCache = new Map<string, string>();
let regionNames: Intl.DisplayNames | null = null;
try { regionNames = new (Intl as any).DisplayNames(['en'], { type: 'region' }); } catch { }

// -----------------------------------------------------------------------------
// Scene Setup
// -----------------------------------------------------------------------------
THREE.Object3D.DEFAULT_UP.set(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x0b0f14, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03; // Heavy inertia (hard to stop)
controls.rotateSpeed = 0.3;    // High resistance (hard to start)
controls.enabled = true;

const hemi = new THREE.HemisphereLight(0xffffff, 0x334466, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(10, 20, 10);
dir.castShadow = true;
scene.add(dir);
const amb = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(amb);
// hoverLight removed

const baseGeo = new THREE.PlaneGeometry(500, 500);
const baseMatFloor = new THREE.MeshLambertMaterial({ color: 0x3e603e });
const floor = new THREE.Mesh(baseGeo, baseMatFloor);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

scene.add(tilesGroup);
scene.add(tracksGroup);
scene.add(trackLabelsGroup);
scene.add(handLabelGroup);
scene.add(markersGroup);

// Axes removed as per request
// scene.add(new THREE.AxesHelper(4)); // Removed

// Tile Geometry & Shared Materials
const boxGeo = new RoundedBoxGeometry(TILE.width, TILE.height, TILE.depth, 3, 0.25);
const sideMat = new THREE.MeshPhongMaterial({ color: 0xe9eef2, specular: 0x222222, shininess: 28 });
const bottomMat = new THREE.MeshPhongMaterial({ color: 0xd0d7de, specular: 0x222222, shininess: 18 });

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function mulberry32(seed: number) {
	let t = seed >>> 0;
	return function () {
		t += 0x6D2B79F5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function clamp(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }

function hashIso(iso: string): number {
	let h = 0;
	for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
	return h;
}

function registerPreset(name: string, fn: PresetGenerator) { LayoutRegistry[name] = fn; }
function getPreset(name: string): PresetGenerator | undefined { return LayoutRegistry[name]; }

// -----------------------------------------------------------------------------
// Resource Management
// -----------------------------------------------------------------------------
function decrefTexture(iso: string) {
	const entry = textureCache.get(iso);
	if (!entry) return;
	entry.refs -= 1;
	if (entry.refs <= 0) {
		entry.tex.dispose();
		textureCache.delete(iso);
	}
}

function getOrCreateFlagMaterial(iso: string) {
	const cached = textureCache.get(iso);
	let tex: THREE.Texture;
	if (cached) {
		cached.refs += 1; tex = cached.tex;
	} else {
		const url = `https://flagcdn.com/w320/${iso}.png`;
		tex = sharedTexLoader.load(url);
		tex.colorSpace = THREE.SRGBColorSpace;
		tex.center.set(0.5, 0.5);
		tex.rotation = 0;
		tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
		tex.generateMipmaps = true;
		tex.minFilter = THREE.LinearMipmapLinearFilter;
		tex.magFilter = THREE.LinearFilter;
		textureCache.set(iso, { tex, refs: 1 });
	}
	return new THREE.MeshPhongMaterial({ map: tex, specular: 0x222222, shininess: 30 });
}

function getContinentSideMaterial(iso: string): THREE.MeshPhongMaterial {
	const cont = continentOf(iso);
	let color = 0xe9eef2;
	switch (cont) {
		case 'Africa': color = 0xffde59; break; // Yellow
		case 'Americas': color = 0xff5757; break; // Red
		case 'Asia': color = 0x7ed957; break; // Green
		case 'Europe': color = 0x5ce1e6; break; // Cyan
		case 'Oceania': color = 0xcb6ce6; break; // Purple
	}
	return new THREE.MeshPhongMaterial({ color, specular: 0x222222, shininess: 28 });
}

// -----------------------------------------------------------------------------
// HUD & Badge UI
// -----------------------------------------------------------------------------
const hud = document.createElement('div');
hud.className = 'hud';
Object.assign(hud.style, {
	position: 'fixed', left: '12px', bottom: '12px', padding: '8px 10px',
	background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
	borderRadius: '8px', color: '#e6edf3', display: 'none'
});
document.body.appendChild(hud);

function updateHUD(intersect?: THREE.Intersection) {
	if (intersect) {
		const { x, y, z } = intersect.point;
		hud.textContent = `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Z: ${z.toFixed(2)}`;
	} else {
		hud.textContent = `X: 0.00 | Y: 0.00 | Z: 0.00`;
	}
}

function ensureLevelBadge() {
	let lb = document.getElementById('level-badge');
	if (lb) return lb;
	lb = document.createElement('div');
	lb.id = 'level-badge';
	Object.assign(lb.style, {
		position: 'fixed', right: '12px', bottom: '12px', padding: '6px 10px',
		background: 'rgba(0,0,0,0.55)', color: '#e6edf3', borderRadius: '8px'
	});
	document.body.appendChild(lb);
	return lb;
}

function updateLevelBadge() {
	const lb = ensureLevelBadge();
	lb.textContent = `Level ${levelIndex}`;
}

function makeTextLabel(text: string, sub?: string): THREE.Mesh {
	const canvas = document.createElement('canvas');
	canvas.width = 512; canvas.height = 96;
	const ctx = canvas.getContext('2d')!;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#e6edf3';
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	if (sub) {
		let fontMain = 36; ctx.font = `${fontMain}px Segoe UI, Arial`;
		const maxWMain = canvas.width - 32;
		while (ctx.measureText(text).width > maxWMain && fontMain > 16) { fontMain -= 2; ctx.font = `${fontMain}px Segoe UI, Arial`; }
		ctx.fillText(text, canvas.width / 2, canvas.height * 0.40);
		let fontSub = 26; ctx.font = `${fontSub}px Segoe UI, Arial`;
		const maxWSub = canvas.width - 32;
		while (ctx.measureText(sub).width > maxWSub && fontSub > 14) { fontSub -= 2; ctx.font = `${fontSub}px Segoe UI, Arial`; }
		ctx.fillText(sub, canvas.width / 2, canvas.height * 0.72);
	} else {
		let font = 36; ctx.font = `${font}px Segoe UI, Arial`;
		const maxW = canvas.width - 32;
		while (ctx.measureText(text).width > maxW && font > 14) { font -= 2; ctx.font = `${font}px Segoe UI, Arial`; }
		ctx.fillText(text, canvas.width / 2, canvas.height / 2);
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.generateMipmaps = false;
	tex.minFilter = THREE.LinearFilter;
	tex.magFilter = THREE.LinearFilter;
	const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
	const aspect = canvas.width / canvas.height;
	const w = TILE.width * 3.0; const h = w / aspect;
	const geo = new THREE.PlaneGeometry(w, h);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.rotation.x = -Math.PI / 2;
	mesh.renderOrder = 10;
	return mesh;
}

// -----------------------------------------------------------------------------
// Layout & Physics
// -----------------------------------------------------------------------------
function snapDownPositions(input: Vec3[]): Vec3[] {
	if (!input.length) return input;
	const tiles = input.map(v => v.clone()).sort((a, b) => a.y - b.y);
	const baseCenterY = TILE.height * 0.5;
	const halfX = TILE.spacingX * 0.5, halfZ = TILE.spacingZ * 0.5;
	const eps = 1e-3;
	let changed = false;
	for (let i = 0; i < tiles.length; i++) {
		const t = tiles[i]; let supportY = baseCenterY;
		for (let j = 0; j < i; j++) {
			const b = tiles[j];
			if (Math.abs(t.x - b.x) <= (halfX + eps) && Math.abs(t.z - b.z) <= (halfZ + eps)) {
				const candidate = b.y + TILE.layerStepY;
				if (candidate > supportY) supportY = candidate;
			}
		}
		if (Math.abs(t.y - supportY) > eps) { t.y = supportY; changed = true; }
	}
	if (changed) tiles.sort((a, b) => a.y - b.y);
	return tiles;
}

function applyStaggerOffsets(input: Vec3[]): Vec3[] {
	const byColumn = new Map<string, Vec3[]>();
	for (const v of input) {
		const k = `${Math.round(v.x * 1000)}|${Math.round(v.z * 1000)}`;
		if (!byColumn.has(k)) byColumn.set(k, []);
		byColumn.get(k)!.push(v);
	}
	const out: Vec3[] = [];
	const dx = antiOverlapParams.delta * TILE.spacingX;
	for (const group of byColumn.values()) {
		group.sort((a, b) => a.y - b.y);
		for (let i = 0; i < group.length; i++) {
			const p = group[i].clone();
			if (i > 0) p.x += ((i % 2 === 1) ? 1 : -1) * dx;
			out.push(p);
		}
	}
	return out;
}

function resolveInLayerOverlaps(input: Vec3[]): Vec3[] {
	const y0 = TILE.height * 0.5;
	const layerMap = new Map<number, Vec3[]>();
	for (const p of input) {
		const l = Math.round((p.y - y0) / TILE.layerStepY);
		if (!layerMap.has(l)) layerMap.set(l, []);
		layerMap.get(l)!.push(p);
	}
	const hw = TILE.width, hd = TILE.depth;
	for (const pts of layerMap.values()) {
		for (let iter = 0; iter < 6; iter++) {
			let moved = false;
			for (let i = 0; i < pts.length; i++) {
				for (let j = i + 1; j < pts.length; j++) {
					const a = pts[i], b = pts[j];
					const dx = b.x - a.x, dz = b.z - a.z;
					const ox = hw - Math.abs(dx), oz = hd - Math.abs(dz);
					if (ox > 0 && oz > 0) {
						if (ox < oz) { const push = ox / 2 + 1e-4; const s = dx >= 0 ? 1 : -1; a.x -= s * push; b.x += s * push; }
						else { const push = oz / 2 + 1e-4; const s = dz >= 0 ? 1 : -1; a.z -= s * push; b.z += s * push; }
						moved = true;
					}
				}
			}
			if (!moved) break;
		}
	}
	return input;
}

// -----------------------------------------------------------------------------
// Tile Handling
// -----------------------------------------------------------------------------
function clearTiles() {
	for (const rec of tileRecords) {
		decrefTexture(rec.iso);
		tilesGroup.remove(rec.mesh);
		if (Array.isArray(rec.mesh.material)) { (rec.mesh.material[2] as THREE.Material).dispose(); }
	}
	while (tilesGroup.children.length) tilesGroup.remove(tilesGroup.children[0]);
	tileRecords = [];
}

function createTileAt(p: Vec3, iso: string): TileRecord {
	const topMat = getOrCreateFlagMaterial(iso);
	const sideMatToUse = continentEdgesEnabled ? getContinentSideMaterial(iso) : sideMat;
	const materials = [sideMatToUse, sideMatToUse, topMat, bottomMat, sideMatToUse, sideMatToUse];
	const tile = new THREE.Mesh(boxGeo, materials);
	tile.position.copy(p);
	tile.castShadow = true; tile.receiveShadow = true;
	tile.userData.iso = iso;
	tilesGroup.add(tile);
	const rec = { mesh: tile, topMat, iso };
	tileRecords.push(rec);
	return rec;
}

function buildSolvableAssignment(positions: Vec3[], rng: () => number): string[] {
	const n = positions.length, pairCount = Math.floor(n / 2);
	const isoPool = [...UN193_ISO2];
	for (let i = isoPool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[isoPool[i], isoPool[j]] = [isoPool[j], isoPool[i]]; }
	const pairIsoList: string[] = [];
	for (let i = 0; i < pairCount; i++) pairIsoList.push(isoPool[i % isoPool.length]);

	for (let attempt = 0; attempt < 30; attempt++) {
		const assigned: (string | null)[] = new Array(n).fill(null);
		const remaining = new Set<number>(Array.from({ length: n }, (_, i) => i));
		const halfX = TILE.spacingX * 0.5, halfZ = TILE.spacingZ * 0.5;

		const isFreeAt = (idx: number, alive: Set<number>) => {
			const p = positions[idx];
			for (const j of alive) {
				if (j === idx) continue;
				const q = positions[j];
				if (q.y >= p.y + TILE.layerStepY - 1e-3 && Math.abs(p.x - q.x) <= halfX && Math.abs(p.z - q.z) <= halfZ) return false;
			}
			let hasLeft = false, hasRight = false;
			for (const j of alive) {
				if (j === idx || Math.abs(positions[j].y - p.y) > TILE.layerStepY * 0.25 || Math.abs(p.z - positions[j].z) > halfZ) continue;
				const qx = positions[j].x;
				if (qx < p.x && Math.abs(p.x - qx) <= TILE.spacingX - 1e-3) hasLeft = true;
				if (qx > p.x && Math.abs(p.x - qx) <= TILE.spacingX - 1e-3) hasRight = true;
			}
			return !(hasLeft && hasRight);
		};

		let ok = true;
		for (let k = 0; k < pairCount; k++) {
			const free: number[] = [];
			for (const idx of remaining) if (isFreeAt(idx, remaining)) free.push(idx);
			if (free.length < 2) { ok = false; break; }
			const a = free[Math.floor(rng() * free.length)];
			let b = a; for (let g = 0; g < 10 && b === a; g++) b = free[Math.floor(rng() * free.length)];
			if (a === b) { ok = false; break; }
			assigned[a] = assigned[b] = pairIsoList[k];
			remaining.delete(a); remaining.delete(b);
		}
		if (ok && assigned.every(v => v !== null)) return assigned as string[];
		for (let t = 0; t < 5; t++) rng();
	}
	return Array.from({ length: n }, (_, i) => pairIsoList[Math.floor(i / 2) % pairIsoList.length]);
}

// -----------------------------------------------------------------------------
// Gameplay Logic
// -----------------------------------------------------------------------------
async function resolveCountryName(iso: string): Promise<string> {
	const code = (iso || '').toUpperCase();
	if (countryNameCache.has(code)) return countryNameCache.get(code)!;
	try {
		const n = regionNames?.of(code);
		if (n) { countryNameCache.set(code, n); return n; }
	} catch { }
	return fetch(`https://restcountries.com/v3.1/alpha/${code}`)
		.then(r => r.ok ? r.json() : null)
		.then(data => {
			const name = (Array.isArray(data) && data[0]?.name?.common) ? data[0].name.common : code;
			countryNameCache.set(code, name); return name;
		}).catch(() => code);
}

function buildBalancedIsoPool(seed: number, perCount: number): string[] {
	const buckets: Record<string, string[]> = {};
	for (const iso of UN193_ISO2) {
		const c = continentOf(iso); if (c === 'Unknown') continue;
		if (!buckets[c]) buckets[c] = []; buckets[c].push(iso);
	}
	const out: string[] = [];
	const conts: Continent[] = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
	conts.forEach((c, idx) => {
		const arr = buckets[c] || []; const r = mulberry32(seed + idx * 1000);
		for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
		out.push(...arr.slice(0, perCount));
	});
	const rAll = mulberry32(seed + 999);
	for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rAll() * (i + 1));[out[i], out[j]] = [out[j], out[i]]; }
	return out;
}

function clearTracks() { while (tracksGroup.children.length) tracksGroup.remove(tracksGroup.children[0]); }
function getTrackBases() { const px = TILE.spacingX * 0.8; return [px, px, px, px, px]; }
function getTrackBasesZ() { const sz = TILE.spacingZ * 1.25, startZ = -TILE.spacingZ * 2.5; return [0, 1, 2, 3, 4].map(i => startZ + i * sz); }

function buildTracks() {
	clearTracks(); if (!tracksState.visible) return;
	const bases = getTrackBases(), basesZ = getTrackBasesZ(), levels = 12, y0 = TILE.height * 0.5;
	for (let i = 0; i < bases.length; i++) {
		const h = levels * TILE.layerStepY + TILE.height;
		const rail = new THREE.Mesh(new THREE.BoxGeometry(TILE.width * 0.4, h, TILE.depth * 0.4), new THREE.MeshBasicMaterial({ color: 0x5c6f7b, transparent: true, opacity: 0.35 }));
		rail.position.set(bases[i], y0 + h * 0.5 - TILE.height * 0.5, basesZ[i]);
		tracksGroup.add(rail);
	}
}


function populateTracksWithTiles(levels = 10) {
	clearTiles();
	const pool = buildBalancedIsoPool(randomState.seed, levels);
	const bases = getTrackBases();
	const basesZ = getTrackBasesZ();
	const y0 = TILE.height * 0.5;

	// Distribute pool into pillars such that no pillar has > 30% of any continent
	const numPillars = bases.length;
	const maxCount = Math.ceil(levels * 0.3); // 30% tolerance
	let assignment: string[][] = [];
	let success = false;
	const rng = mulberry32(randomState.seed + 555);

	// Attempt to solve assignment
	for (let attempt = 0; attempt < 100; attempt++) {
		// Shuffle pool
		const current = [...pool];
		for (let i = current.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[current[i], current[j]] = [current[j], current[i]];
		}

		const parts: string[][] = Array.from({ length: numPillars }, () => []);
		const counts: Record<string, number>[] = Array.from({ length: numPillars }, () => ({}));
		let ok = true;

		// Fill layer by layer to keep balance
		for (let l = 0; l < levels; l++) {
			for (let p = 0; p < numPillars; p++) {
				// Find a valid candidate in restricted window to ensure randomness? 
				// Just linear search in shuffled 'current' is fine since it's already shuffled.
				let pickIdx = -1;
				for (let k = 0; k < current.length; k++) {
					const c = continentOf(current[k]);
					if ((counts[p][c] || 0) < maxCount) {
						pickIdx = k;
						break;
					}
				}
				if (pickIdx === -1) { ok = false; break; }

				const iso = current[pickIdx];
				current.splice(pickIdx, 1);
				parts[p].push(iso);
				counts[p][continentOf(iso)] = (counts[p][continentOf(iso)] || 0) + 1;
			}
			if (!ok) break;
		}

		if (ok) {
			assignment = parts;
			success = true;
			break;
		}
	}

	// If strict solve failed (unlikely), fallback to simple chunking
	if (!success) {
		console.warn('Constraint shuffle failed, falling back to random');
		const current = [...pool]; // reshuffle needed? just take as is
		for (let i = 0; i < numPillars; i++) {
			assignment.push(current.slice(i * levels, (i + 1) * levels));
		}
	}

	// Spawn tiles
	for (let i = 0; i < numPillars; i++) {
		const x = bases[i];
		const baseZ = basesZ[i];
		for (let l = 0; l < levels; l++) {
			createTileAt(new THREE.Vector3(x, y0 + l * TILE.layerStepY, baseZ), assignment[i][l]);
		}
	}

	updateTrackLabels();
	spawnOutsideTile(levels);
}

function spawnOutsideTile(levels: number) {
	const hX = -TILE.spacingX * 1.5, y = TILE.height * 0.5;
	const used = new Set(tileRecords.map(r => r.iso));
	const rem = UN193_ISO2.filter(c => !used.has(c));
	const rng = mulberry32(randomState.seed + Math.floor(performance.now()));
	const iso = rem.length ? rem[Math.floor(rng() * rem.length)] : UN193_ISO2[Math.floor(rng() * UN193_ISO2.length)];
	const hand = createTileAt(new THREE.Vector3(hX, y, 0), iso);
	hand.mesh.userData.hand = true; hand.mesh.scale.set(1.1, 1.1, 1.1);
	setTimeout(() => updateHandLabelFromCurrentHand(), 0);
}

function updateTrackLabels() {
	while (trackLabelsGroup.children.length) trackLabelsGroup.remove(trackLabelsGroup.children[0]);
	const bases = getTrackBases(), basesZ = getTrackBasesZ();

	// Initialize counters for 5 pillars
	const pillars = bases.map(() => ({ total: 0, counts: {} as Record<string, number> }));
	let allPure = true;

	// Assign every tile to its closest pillar (Robust Stats)
	for (const r of tileRecords) {
		if (r.mesh.userData.hand) continue; // Skip hand tile

		let bestDist = 1e9, bestPillar = -1;
		for (let i = 0; i < bases.length; i++) {
			const dx = r.mesh.position.x - bases[i];
			const dz = r.mesh.position.z - basesZ[i];
			const d = dx * dx + dz * dz; // squared dist is enough
			if (d < bestDist) { bestDist = d; bestPillar = i; }
		}

		if (bestPillar !== -1) {
			const c = continentOf(r.iso);
			pillars[bestPillar].counts[c] = (pillars[bestPillar].counts[c] || 0) + 1;
			pillars[bestPillar].total++;
		}
	}

	// Render Labels
	for (let i = 0; i < pillars.length; i++) {
		const { total, counts } = pillars[i];
		let best: Continent | 'None' = 'None', bestN = 0;
		if (total > 0) {
			(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'] as Continent[]).forEach(c => {
				const n = counts[c] || 0;
				if (n > bestN) { bestN = n; best = c; }
			});
		}

		const purity = (bestN > 0 && total > 0) ? Math.round((bestN / total) * 100) : 0;
		// Logic: Show name if >40% or if cheat enabled. Always show %.
		const labelText = (purity >= 40 || continentsEnabled) ? (best as string) : '?';
		const label = makeTextLabel(labelText, `${purity}%`);

		// Position label
		label.position.set(bases[i] - TILE.width * 1.0, 0.03, basesZ[i]);
		label.rotation.x = -Math.PI / 2;
		trackLabelsGroup.add(label);

		if (purity !== 100) allPure = false;
	}

	if (allPure && !modalOpen && tileRecords.length > 0) handleLevelUp();
}


// Timer State
let startTime = 0;
let gameActive = false;
const timerDiv = document.createElement('div');
Object.assign(timerDiv.style, {
	position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
	color: 'white', fontSize: '48px', fontFamily: 'monospace', fontWeight: 'bold',
	textShadow: '0 2px 4px rgba(0,0,0,0.8)', pointerEvents: 'none', zIndex: '1000'
});
timerDiv.innerText = '00:00';
document.body.appendChild(timerDiv);

// Version Tag
const versionDiv = document.createElement('div');
Object.assign(versionDiv.style, {
	position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
	color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontFamily: 'sans-serif',
	pointerEvents: 'none', zIndex: '1000'
});
versionDiv.innerText = 'v1.2.1 (NoCache)';
document.body.appendChild(versionDiv);

function updateTimer() {
	if (!gameActive) return;
	const elapsed = Math.floor((Date.now() - startTime) / 1000);
	const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
	const s = (elapsed % 60).toString().padStart(2, '0');
	timerDiv.innerText = `${m}:${s}`;
}

function handleLevelUp() {
	gameActive = false;
	const titles = ["Turtle Conquered!", "Map Master!", "ISO Legend!", "Telepath Mode!", "Map Whisperer!"];
	const subs = ["Round 2: No edge hints.", "Next: Country codes.", "Next: Pure memory mode.", "Next: Only vibes.", "Master clear!"];

	const finalTime = timerDiv.innerText;
	showLevelUpModal(
		titles[levelIndex - 1] || "Victory!",
		`Time: ${finalTime}<br>${subs[levelIndex - 1] || "All pillars completed!"}`,
		() => {
			levelIndex++; randomState.seed = Math.floor(Date.now());
			if (levelIndex === 4) { displayIsoOnly = true; isoLabelsEnabled = true; }
			if (levelIndex >= 5) { isoLabelsEnabled = false; }
			repopulatePilesRandomUnique(); updateLevelBadge();
		}
	);
}

function updateHandLabelFromCurrentHand() {
	while (handLabelGroup.children.length) handLabelGroup.remove(handLabelGroup.children[0]);
	if (!continentsEnabled && !countriesEnabled && !isoLabelsEnabled) return;
	const hand = tileRecords.find(r => r.mesh.userData.hand);
	if (!hand) return;
	resolveCountryName(hand.iso).then(name => {
		const cont = continentOf(hand.iso);
		let text = '';
		if (isoLabelsEnabled) text = hand.iso.toUpperCase();
		if (countriesEnabled) text = name;
		if (countriesEnabled && continentsEnabled) text = `${name} (${cont})`;
		else if (continentsEnabled && !countriesEnabled) text = cont;

		if (!text) return;

		const label = makeTextLabel(text);
		label.position.set(hand.mesh.position.x, 0.03, hand.mesh.position.z + TILE.depth * 0.8);
		handLabelGroup.add(label);
	});
}

function createSettingsUI() {
	const btn = document.createElement('div');
	btn.id = 'settings-btn';
	btn.innerHTML = '⚙️';
	Object.assign(btn.style, {
		position: 'fixed', left: '20px', bottom: '20px',
		width: '44px', height: '44px', background: 'rgba(0,0,0,0.5)',
		borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
		fontSize: '24px', cursor: 'pointer', zIndex: '1000', backdropFilter: 'blur(5px)'
	});
	document.body.appendChild(btn);

	const menu = document.createElement('div');
	menu.id = 'settings-menu';
	Object.assign(menu.style, {
		position: 'fixed', left: '20px', bottom: '74px',
		background: 'rgba(20,24,28,0.9)', padding: '15px', borderRadius: '12px',
		display: 'none', flexDirection: 'column', gap: '15px',
		boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: '1000', color: 'white'
	});

	// Toggles helper
	const addToggle = (label: string, id: string, onChange: (checked: boolean) => void, initial = false) => {
		const wrap = document.createElement('label');
		Object.assign(wrap.style, { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' });
		wrap.innerHTML = `<span>${label}</span><input type="checkbox" id="${id}" ${initial ? 'checked' : ''}>`;
		menu.appendChild(wrap);
		wrap.querySelector('input')!.onchange = (e) => onChange((e.target as HTMLInputElement).checked);
	};

	addToggle('Continents', 'cont-toggle', (v) => { continentsEnabled = v; updateTrackLabels(); updateHandLabelFromCurrentHand(); }, continentsEnabled);
	addToggle('Countries', 'count-toggle', (v) => { countriesEnabled = v; updateTrackLabels(); updateHandLabelFromCurrentHand(); }, countriesEnabled);
	addToggle('Camera Lock', 'cam-lock', (v) => { controls.enabled = !v; });

	document.body.appendChild(menu);
	btn.onclick = () => { menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'; };
}

// -----------------------------------------------------------------------------
// Scene Controls & Interaction
// -----------------------------------------------------------------------------

function applyCameraActionPreset() {
	// Max zoom optimized with portrait support and Extra Padding (safety factor 9.0)
	const isPortrait = camera.aspect < 0.8; // Stricter portrait check
	// Base Y for Landscape (wide aspect) ~11.5
	// If portrait, we need to cover specific Width with padding.
	const y = isPortrait ? 9.0 / camera.aspect : 11.5;

	camera.position.set(-0.6, y, 2.0);
	controls.target.set(-0.6, 1.0, 0);

	// Apply Limits
	controls.minAzimuthAngle = -Math.PI / 9; // -20 deg
	controls.maxAzimuthAngle = Math.PI / 9;  // +20 deg
	controls.minPolarAngle = 0;              // Top down
	controls.maxPolarAngle = Math.PI / 4;    // 45 deg max trim
	controls.enablePan = false;

	camera.fov = 60;
	camera.updateProjectionMatrix();
	controls.update();
}

function isTileFree(mesh: THREE.Mesh): boolean {
	const p = mesh.position, hx = TILE.spacingX * 0.5, hz = TILE.spacingZ * 0.5, ay = p.y + TILE.layerStepY - 1e-3;
	for (const r of tileRecords) if (r.mesh !== mesh && r.mesh.position.y >= ay && Math.abs(p.x - r.mesh.position.x) <= hx && Math.abs(p.z - r.mesh.position.z) <= hz) return false;
	let left = false, right = false;
	for (const r of tileRecords) {
		if (r.mesh === mesh || Math.abs(r.mesh.position.y - p.y) > TILE.layerStepY * 0.25 || Math.abs(p.z - r.mesh.position.z) > hz) continue;
		const ox = r.mesh.position.x;
		if (ox < p.x && Math.abs(p.x - ox) <= TILE.spacingX - 1e-3) left = true;
		if (ox > p.x && Math.abs(p.x - ox) <= TILE.spacingX - 1e-3) right = true;
	}
	return !(left && right);
}

function setHover(mesh: THREE.Mesh | null) {
	if (lastHover && lastHover !== mesh) {
		const top = (lastHover.material as THREE.Material[])[2] as THREE.MeshPhongMaterial;
		top.emissive?.setHex(0x000000); top.specular.setHex(0x222222); top.shininess = 30;
		lastHover = null;
	}
	if (!mesh) return;
	const top = (mesh.material as THREE.Material[])[2] as THREE.MeshPhongMaterial;
	if (isTileFree(mesh)) {
		top.emissive.setHex(0x333333); top.specular.setHex(0xffffff); top.shininess = 60;
	}
	lastHover = mesh;
}

window.addEventListener('pointermove', (e) => {
	const rect = renderer.domElement.getBoundingClientRect();
	mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(tilesGroup.children)[0];
	setHover(hit ? hit.object as THREE.Mesh : null);
});

window.addEventListener('pointerdown', (e) => {
	if (Date.now() < interactionLockUntil) return;

	// CRITICAL FIX: Update mouse coordinates!
	const rect = renderer.domElement.getBoundingClientRect();
	mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));

	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(tilesGroup.children)[0];
	if (!hit) return;
	const mesh = hit.object as THREE.Mesh;
	if (gameMode === 'pipes') handlePileInteraction(mesh);
});

// FORCE UNREGISTER SERVICE WORKER (Fix Sticky Cache)
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.getRegistrations().then(function (registrations) {
		for (let registration of registrations) {
			registration.unregister();
			console.log('Service Worker Unregistered to force update');
		}
	});
}

window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	applyCameraActionPreset(); // Re-calc for aspect ratio
});

function handlePileInteraction(clicked: THREE.Mesh) {
	const bases = getTrackBases(), basesZ = getTrackBasesZ();

	// 1. Identify which pillar column (Index) was clicked
	let bIdx = -1, minD = 1e9;
	for (let i = 0; i < bases.length; i++) {
		const dx = clicked.position.x - bases[i];
		const dz = clicked.position.z - basesZ[i];
		const d = dx * dx + dz * dz;
		if (d < minD) { minD = d; bIdx = i; }
	}
	if (bIdx === -1) return;

	// 2. Robustly gather ALL tiles belonging to this pillar
	//    (Using same Nearest-Neighbor logic as stats to ensure consistency)
	const pillar: TileRecord[] = [];
	for (const r of tileRecords) {
		if (r.mesh.userData.hand) continue;
		// Find closest base for this tile
		let tIdx = -1, tMinD = 1e9;
		for (let k = 0; k < bases.length; k++) {
			const dx = r.mesh.position.x - bases[k];
			const dz = r.mesh.position.z - basesZ[k];
			const d = dx * dx + dz * dz;
			if (d < tMinD) { tMinD = d; tIdx = k; }
		}
		// If tile belongs to clicked pillar
		if (tIdx === bIdx) pillar.push(r);
	}

	// Sort by Y to get stack order
	pillar.sort((a, b) => a.mesh.position.y - b.mesh.position.y);

	const hand = tileRecords.find(r => r.mesh.userData.hand);
	if (!pillar.length || !hand) return;

	// Start timer on first interaction if not active
	if (!gameActive && levelIndex > 0) { startTime = Date.now(); gameActive = true; }

	interactionLockUntil = Date.now() + 500;

	const top = pillar[pillar.length - 1];
	const bottom = pillar[0];
	const handPos = hand.mesh.position.clone();
	const bottomPos = bottom.mesh.position.clone(); // Target for Hand

	// Cycle Logic:
	// 1. Hand -> Bottom
	// 2. Pillar[0...N-2] -> Shift Up
	// 3. Top -> Hand

	const animateMove = (m: THREE.Mesh, to: Vec3) => {
		const s = m.position.clone(), start = performance.now();
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / 300); m.position.lerpVectors(s, to, t);
			if (t < 1) requestAnimationFrame(step);
			else {
				if (m.userData.hand) m.scale.set(1.1, 1.1, 1.1); else m.scale.set(1, 1, 1);
			}
		};
		requestAnimationFrame(step);
	};

	// Hand moves to Bottom position
	animateMove(hand.mesh, bottomPos);

	// Pillar items shift up
	for (let i = 0; i < pillar.length - 1; i++) {
		// P[i] moves to P[i+1] position
		const nextPos = pillar[i + 1].mesh.position.clone();
		animateMove(pillar[i].mesh, nextPos);
	}

	// Top moves to Hand position
	animateMove(top.mesh, handPos);

	// Update State
	hand.mesh.userData.hand = false;
	top.mesh.userData.hand = true;

	setTimeout(() => { updateTrackLabels(); updateHandLabelFromCurrentHand(); interactionLockUntil = 0; }, 350);
}

// -----------------------------------------------------------------------------
// Initialization & Boot
// -----------------------------------------------------------------------------
function buildPipesGame() {
	clearTracks();
	populateTracksWithTiles(10);
	startTime = Date.now();
	gameActive = true;
}

function repopulatePilesRandomUnique() {
	populateTracksWithTiles(10);
	startTime = Date.now();
	gameActive = true;
}

function showLevelUpModal(title: string, subtitle: string, onOk: () => void) {
	modalOpen = true; const m = document.createElement('div');
	Object.assign(m.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '9999' });
	m.innerHTML = `<div style="background:#1a1f24; padding:30px; border-radius:15px; text-align:center; color:white; min-width:300px;">
		<h2>${title}</h2><p>${subtitle}</p><button id="modal-ok" style="padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer;">OK</button>
	</div>`;
	document.body.appendChild(m);
	document.getElementById('modal-ok')!.onclick = () => { m.remove(); modalOpen = false; onOk(); };
}

const gui = new GUI({ title: 'Debug' });
const modeObj = { gameMode };
gui.add(modeObj, 'gameMode', ['mahjong', 'pipes']).onChange((v: any) => {
	gameMode = v;
	clearTiles();
	if (gameMode === 'pipes') buildPipesGame();
});
gui.add(tracksState, 'visible').name('Track Guides').onChange(() => {
	if (tracksState.visible) { buildTracks(); updateTrackLabels(); } else { clearTracks(); }
});
gui.show(false);

createSettingsUI();
applyCameraActionPreset();
buildPipesGame();
updateLevelBadge();

function animateLoop() { requestAnimationFrame(animateLoop); controls.update(); updateTimer(); renderer.render(scene, camera); }
animateLoop();
