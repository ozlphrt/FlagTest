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

// Coordinate system declaration (Right-handed, Y-up)
THREE.Object3D.DEFAULT_UP.set(0, 1, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x0b0f14, 1);
document.body.appendChild(renderer.domElement);

// Scene and Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
// Disable interactive camera controls
controls.enabled = false;
controls.enableZoom = false;
controls.enableRotate = false;
controls.enablePan = false;
function applyCameraActionPreset() {
	camera.position.set(-0.1354, 6.43418, 6.671806);
	camera.up.set(0, 1, 0);
	controls.target.set(-0.06957, -0.14135, -0.06806);
	camera.fov = 55;
	camera.updateProjectionMatrix();
	controls.update();
}
applyCameraActionPreset();
// Control auto seeding before any references
let autoSeedOnLoad = true;

function syncCamParams() {
	camParams.posX = camera.position.x;
	camParams.posY = camera.position.y;
	camParams.posZ = camera.position.z;
	camParams.tarX = controls.target.x;
	camParams.tarY = controls.target.y;
	camParams.tarZ = controls.target.z;
	camParams.fov = camera.fov;
	camParams.distance = camera.position.distanceTo(controls.target);
}

controls.addEventListener('change', syncCamParams);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x334466, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(10, 20, 10);
dir.castShadow = true;
scene.add(dir);
// Ambient light ensures materials are visible even if other lights are occluded
const amb = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(amb);
// Hover light - accentuates eligible tile when hovered
const hoverLight = new THREE.PointLight(0xffffff, 0, 8, 2);
hoverLight.castShadow = false;
scene.add(hoverLight);

// Helpers
const axes = new THREE.AxesHelper(4);
axes.visible = true;

// Base (ground) — dark green, editable via GUI
const baseGeo = new THREE.PlaneGeometry(500, 500);
const baseMat = new THREE.MeshLambertMaterial({ color: 0x3e603e });
const base = new THREE.Mesh(baseGeo, baseMat);
base.rotation.x = -Math.PI / 2;
base.position.y = 0; // Ground at Y=0
base.receiveShadow = true;
scene.add(base);

// Track guides group (for Pipes)
const tracksGroup = new THREE.Group();
scene.add(tracksGroup);
const tracksState = { visible: false };

// Track labels
const trackLabelsGroup = new THREE.Group();
scene.add(trackLabelsGroup);
// Hand tile label group
const handLabelGroup = new THREE.Group();
scene.add(handLabelGroup);
// Level state: when all piles are 100% pure, switch to next level visuals
let levelPureAchieved = false; // first level visual change (remove edges)
let levelIndex = 1;
let modalOpen = false;
let isoLabelsEnabled = true; // controls showing a label for the hand tile
let continentEdgesEnabled = true; // panel toggle for continent edge colors
let displayIsoOnly = false;  // when true, show ISO code instead of full name

function clearTracks() {
    while (tracksGroup.children.length) tracksGroup.remove(tracksGroup.children[0]);
}

function getTrackBases(): number[] {
    const continents: Continent[] = ['Africa','Americas','Asia','Europe','Oceania'];
    const gapX = TILE.spacingX * 1.3;
    const startX = -gapX * (continents.length - 1) / 2;
    const bases: number[] = [];
    for (let i = 0; i < continents.length; i++) bases.push(startX + i * gapX);
    return bases;
}

function buildTracks() {
    clearTracks();
    if (!tracksState.visible) return;
    const bases = getTrackBases();
    const baseZ = 0;
    const levels = 12;
    const y0 = TILE.height * 0.5;
    for (let i = 0; i < bases.length; i++) {
        const x = bases[i];
        const h = levels * TILE.layerStepY + TILE.height;
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(TILE.width * 0.4, h, TILE.depth * 0.4),
            new THREE.MeshBasicMaterial({ color: 0x5c6f7b, transparent: true, opacity: 0.35 })
        );
        rail.position.set(x, y0 + h * 0.5 - TILE.height * 0.5, baseZ);
        rail.renderOrder = 1;
        tracksGroup.add(rail);
        // Add a label-like thin plate at the top
        const plate = new THREE.Mesh(
            new THREE.BoxGeometry(TILE.width * 1.1, TILE.height * 0.2, TILE.depth * 0.8),
            new THREE.MeshBasicMaterial({ color: 0x8aaec7, transparent: true, opacity: 0.25 })
        );
        plate.position.set(x, rail.position.y + h * 0.52, baseZ);
        tracksGroup.add(plate);
    }
}

// Unique ISO assignment pool (ensures each flag used only once) — placed before populateTracksWithTiles
let uniqueIsoPool: string[] = [];
let uniqueIsoIndex = 0;
function resetUniqueIsoPool(seed: number) {
    uniqueIsoPool = [...UN193_ISO2];
    const r = mulberry32(seed + 4242);
    for (let i = uniqueIsoPool.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [uniqueIsoPool[i], uniqueIsoPool[j]] = [uniqueIsoPool[j], uniqueIsoPool[i]];
    }
    uniqueIsoIndex = 0;
}
function nextUniqueISO(): string {
    if (uniqueIsoIndex >= uniqueIsoPool.length) resetUniqueIsoPool(Math.floor(Date.now()));
    return uniqueIsoPool[uniqueIsoIndex++];
}

function populateTracksWithTiles(levels = 10) {
    // Remove previously spawned tiles but keep guides
    clearTiles();
    // Build balanced per-continent ISO pool (exactly 10 per continent)
    const balancedPool = buildBalancedIsoPool(randomState.seed, 10);
    const bases = getTrackBases();
    const baseZ = 0;
    const y0 = TILE.height * 0.5;
    // Build all slot positions, then shuffle order for random distribution
    const slots: THREE.Vector3[] = [];
    for (const x of bases) {
        for (let l = 0; l < levels; l++) {
            const y = y0 + l * TILE.layerStepY;
            slots.push(new THREE.Vector3(x, y, baseZ));
        }
    }
    const rng = mulberry32(randomState.seed + 1337);
    for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = slots[i]; slots[i] = slots[j]; slots[j] = tmp;
    }
    // Assign unique ISOs in randomized order
    for (let i = 0; i < slots.length; i++) {
        const pos = slots[i];
        const iso = balancedPool[i];
        createTileAt(pos, iso);
    }
    // Fallback: if nothing was created, drop a visible test tile at origin
    if (tileRecords.length === 0) {
        const test = new THREE.Mesh(
            new THREE.BoxGeometry(TILE.width, TILE.height, TILE.depth),
            new THREE.MeshPhongMaterial({ color: 0xff00ff })
        );
        test.position.set(0, TILE.height * 0.5, 0);
        tilesGroup.add(test);
        console.warn('Fallback test tile spawned: no tiles were created during populateTracksWithTiles');
    } else {
        console.info(`Tiles spawned: ${tileRecords.length}`);
    }
    updateTrackLabels();
    spawnOutsideTile(levels);
}

function spawnOutsideTile(levels: number) {
    // Place an extra tile outside the five piles, to the left of the leftmost pile
    const bases = getTrackBases();
    if (!bases.length) return;
    // Center X between leftmost and rightmost piles
    const handX = (bases[0] + bases[bases.length - 1]) * 0.5;
    // In front of piles on +Z, sitting on the base
    const handZ = TILE.depth * 2.2;
    const y = TILE.height * 0.5;
    // Choose a random remaining ISO not already used in piles
    const used = new Set<string>();
    for (const r of tileRecords) used.add(r.iso);
    const remaining = UN193_ISO2.filter(c => !used.has(c));
    const rng = mulberry32(randomState.seed + 101 + Math.floor((performance.now() % 100000)));
    const iso = remaining.length ? remaining[Math.floor(rng() * remaining.length)] : UN193_ISO2[Math.floor(rng() * UN193_ISO2.length)];
    const hand = createTileAt(new THREE.Vector3(handX, y, handZ), iso);
    (hand.mesh.userData as any).hand = true;
    hand.mesh.scale.set(1.1, 1.1, 1.1);
    setTimeout(() => updateHandLabelFromCurrentHand(), 0);
}

function updateTrackLabels() {
    // clear old labels
    while (trackLabelsGroup.children.length) trackLabelsGroup.remove(trackLabelsGroup.children[0]);
    const bases = getTrackBases();
    const baseZ = 0;
    const thresholdX = TILE.spacingX * 0.6;
    let allPure = true;
    for (const x of bases) {
        const counts: Record<Continent, number> = { Africa:0, Americas:0, Asia:0, Europe:0, Oceania:0, Unknown:0 } as any;
        let total = 0;
        for (const rec of tileRecords) {
            const p = rec.mesh.position;
            if (Math.abs(p.x - x) <= thresholdX && Math.abs(p.z - baseZ) <= TILE.spacingZ * 0.6) {
                const c = continentOf(rec.iso);
                counts[c] = (counts[c] ?? 0) + 1;
                total += 1;
            }
        }
        // pick majority (ignore Unknown)
        let best: Continent | 'None' = 'None';
        let bestN = -1;
        (['Africa','Americas','Asia','Europe','Oceania'] as Continent[]).forEach(c => { if ((counts as any)[c] > bestN) { bestN = (counts as any)[c]; best = c; } });
        const purity = (bestN > 0 && total > 0) ? Math.round((bestN / total) * 100) : 0;
        let label: THREE.Mesh;
        if (bestN > 0 && total > 0) {
            // From level 5 onward, never reveal continent names (show purity only)
            if (levelIndex >= 5) {
                label = makeTextLabel(`${purity}%`);
            } else if (purity >= 40) {
                label = makeTextLabel(best as string, `${purity}%`);
            } else {
                // Below 40%: show only purity, no continent name
                label = makeTextLabel(`${purity}%`);
            }
        } else {
            label = makeTextLabel('?');
        }
        label.position.set(x, 0.03, baseZ + TILE.depth * 0.8);
        trackLabelsGroup.add(label);
        if (!(bestN > 0 && total > 0 && purity === 100)) allPure = false;
    }
    if (allPure && !modalOpen) {
        if (levelIndex === 1) {
            levelPureAchieved = true;
            removeSideColors();
            continentEdgesEnabled = false; // Level 2 starts without edges
            showLevelUpModal(
                "Level Up! 🐢 You conquered the continents!",
                "Round 2: no edge hints. Your inner cartographer is on call.",
                () => {
                    // advance to level 2
                    randomState.seed = Math.floor(Date.now() % 100000);
                    repopulatePilesRandomUnique();
                    interactionLockUntil = Date.now();
                    levelIndex = 2;
                    updateLevelBadge();
                }
            );
        } else if (levelIndex === 2) {
            showLevelUpModal(
                "Brilliant! 🎉",
                "Next challenge: country codes. ISO you can do it.",
                () => {
                    // proceed to next randomized level as well
                    randomState.seed = Math.floor(Date.now() % 100000);
                    repopulatePilesRandomUnique();
                    interactionLockUntil = Date.now();
                    levelIndex = 3;
                    updateLevelBadge();
                }
            );
        } else if (levelIndex === 3) {
            showLevelUpModal(
                "Legendary! 🧠",
                "No ISO codes this time. Pure memory mode.",
                () => {
                    // From level 3 onward, show ISO codes only (no full names)
                    isoLabelsEnabled = true;
                    displayIsoOnly = true;
                    randomState.seed = Math.floor(Date.now() % 100000);
                    repopulatePilesRandomUnique();
                    interactionLockUntil = Date.now();
                    levelIndex = 4;
                    updateLevelBadge();
                }
            );
        } else if (levelIndex === 4) {
            showLevelUpModal(
                "Telepath Mode ✨",
                "No names. No codes. Only vibes. Good luck!",
                () => {
                    // Level 5+ — hide labels entirely
                    isoLabelsEnabled = false;
                    displayIsoOnly = false;
                    randomState.seed = Math.floor(Date.now() % 100000);
                    repopulatePilesRandomUnique();
                    interactionLockUntil = Date.now();
                    levelIndex = 5;
                    updateLevelBadge();
                }
            );
        } else if (levelIndex === 5) {
            showLevelUpModal(
                "Map Whisperer 🗺️",
                "Level 5 cleared! Continents? Shh. Only percentages shall speak.",
                () => {
                    // Keep labels hidden for hand tile; pile labels show purity only (enforced above)
                    isoLabelsEnabled = false;
                    displayIsoOnly = false;
                    randomState.seed = Math.floor(Date.now() % 100000);
                    repopulatePilesRandomUnique();
                    interactionLockUntil = Date.now();
                    levelIndex = 6;
                    updateLevelBadge();
                }
            );
        }
    }
}

function makeTextLabel(text: string, sub?: string): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#e6edf3';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (sub) {
        // Two-line layout: main + subtitle
        let fontMain = 36;
        ctx.font = `${fontMain}px Segoe UI, Arial`;
        // shrink if too wide
        const maxWMain = canvas.width - 32;
        while (ctx.measureText(text).width > maxWMain && fontMain > 16) {
            fontMain -= 2; ctx.font = `${fontMain}px Segoe UI, Arial`;
        }
        ctx.fillText(text, canvas.width/2, canvas.height * 0.40);
        let fontSub = 26;
        ctx.font = `${fontSub}px Segoe UI, Arial`;
        const maxWSub = canvas.width - 32;
        while (ctx.measureText(sub).width > maxWSub && fontSub > 14) {
            fontSub -= 2; ctx.font = `${fontSub}px Segoe UI, Arial`;
        }
        ctx.fillText(sub, canvas.width/2, canvas.height * 0.72);
    } else {
        // Single-line: auto-fit long names (e.g., Bosnia & Herzegovina)
        let font = 36;
        ctx.font = `${font}px Segoe UI, Arial`;
        const maxW = canvas.width - 32;
        while (ctx.measureText(text).width > maxW && font > 14) {
            font -= 2; ctx.font = `${font}px Segoe UI, Arial`;
        }
        ctx.fillText(text, canvas.width/2, canvas.height/2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Avoid haloing on transparent edges
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const aspect = canvas.width / canvas.height;
    const w = TILE.width * 3.0; const h = w / aspect;
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI/2; // lie on base
    mesh.renderOrder = 10; // draw on top
    return mesh;
}

// HUD
const hud = document.createElement('div');
hud.className = 'hud';
hud.textContent = 'X: 0.00 | Y: 0.00 | Z: 0.00';
Object.assign(hud.style, {
	position: 'fixed', left: '12px', bottom: '12px', padding: '8px 10px',
	background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
	borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
	fontSize: '12px', lineHeight: '1.4', color: '#e6edf3', fontFamily: 'ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial'
} as CSSStyleDeclaration);
document.body.appendChild(hud);
const badge = document.createElement('div');
badge.className = 'badge';
badge.textContent = 'Mahjong 3D — v1.01';
Object.assign(badge.style, {
	position: 'fixed', right: '12px', top: '12px', padding: '6px 8px',
	background: 'rgba(0,0,0,0.5)', borderRadius: '6px',
	fontSize: '11px', color: '#9fb3c8'
} as CSSStyleDeclaration);
document.body.appendChild(badge);
// Hide overlays per request
(hud.style as any).display = 'none';
(badge.style as any).display = 'none';

// Level indicator (bottom-right)
let levelBadge: HTMLDivElement | null = null;
function ensureLevelBadge() {
    if (levelBadge) return;
    levelBadge = document.createElement('div');
    Object.assign(levelBadge.style, {
        position: 'fixed', right: '12px', bottom: '12px', padding: '6px 10px',
        background: 'rgba(0,0,0,0.55)', color: '#e6edf3', borderRadius: '8px',
        fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', zIndex: '999'
    } as CSSStyleDeclaration);
    document.body.appendChild(levelBadge);
}
function updateLevelBadge() {
    ensureLevelBadge();
    if (!levelBadge) return;
    levelBadge.textContent = `Level ${levelIndex}`;
}

// Tile specs
const TILE = {
	width: 1.0,
	height: 0.35,
	depth: 1.4,
	spacingX: 1.12,
	spacingZ: 1.52,
	layerStepY: 0.35
};

const boxGeo = new RoundedBoxGeometry(TILE.width, TILE.height, TILE.depth, 3, 0.12);
const sideMat = new THREE.MeshPhongMaterial({ color: 0xe9eef2, specular: 0x222222, shininess: 28 });
const bottomMat = new THREE.MeshPhongMaterial({ color: 0xd0d7de, specular: 0x111111, shininess: 18 });

const tilesGroup = new THREE.Group();
scene.add(tilesGroup);
type GameMode = 'mahjong' | 'pipes';
let gameMode: GameMode = 'pipes';
let showEmptyBase = false;
let currentPreset: 'prototype_turtle' | 'canonical_turtle' = 'canonical_turtle';
let lastPositions: Vec3[] = [];
type TileRecord = { mesh: THREE.Mesh, topMat: THREE.MeshPhongMaterial, iso: string };
let tileRecords: TileRecord[] = [];
const selectParams = { color: '#3399ff' };
let selected: TileRecord[] = [];
// Shared texture cache to avoid reloading and to dispose textures correctly
const textureCache = new Map<string, { tex: THREE.Texture, refs: number }>();
const sharedTexLoader = new THREE.TextureLoader();
sharedTexLoader.setCrossOrigin('anonymous');
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
        tex.rotation = Math.PI / 2;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        textureCache.set(iso, { tex, refs: 1 });
    }
    return new THREE.MeshPhongMaterial({ map: tex, specular: 0x222222, shininess: 30 });
}

// Test-only: color-code sides by continent
const continentSideMatCache = new Map<string, THREE.MeshPhongMaterial>();
const continentSideColors: Record<Continent, number> = {
    Africa: 0xffa500,     // orange
    Americas: 0x1e90ff,   // dodger blue
    Asia: 0xff4d4d,       // red-ish
    Europe: 0x32cd32,     // lime green
    Oceania: 0x9370db,    // medium purple
    Unknown: 0x888888
} as any;
function getContinentSideMaterial(iso: string): THREE.MeshPhongMaterial {
    const cont = continentOf(iso);
    const key = cont as string;
    const cached = continentSideMatCache.get(key);
    if (cached) return cached;
    const mat = new THREE.MeshPhongMaterial({
        color: continentSideColors[cont],
        specular: 0x222222,
        shininess: sideMat.shininess
    });
    continentSideMatCache.set(key, mat);
    return mat;
}

// Layout markers (for inspection)
const markersGroup = new THREE.Group();
scene.add(markersGroup);
let markersPoints: THREE.Points | null = null;
const markersState = {
	visible: false,
	size: 6,
	color: '#00ffff'
};

// Randomization state for layout transforms and flag assignment
const randomState = {
	seed: 98597,
	mirrorX: false,
	mirrorZ: false,
	rotate180: false
};
// Physics/debug flags available before any function uses them
const physicsParams = { snapDown: true };
// Anti-perfect-overlap (introduce slight lateral stagger so no 100% overlap)
const antiOverlapParams = { enabled: true, delta: 0.1 }; // delta in units of spacingX
// Hover highlight style: light-up for eligible
const hoverParams = {
	eligibleLift: 0.0,
	lightIntensity: 1.0,
	lightDistance: 30,
	lightHeight: 1.15,
	shininessBoost: 32,
	lightColor: '#ffffff'
};
// Initialize hover light defaults from params
hoverLight.intensity = 0; // off until hover
hoverLight.distance = hoverParams.lightDistance;
hoverLight.color = new THREE.Color(hoverParams.lightColor as any);
// Variety controls
const varietyParams = {
	autoPreset: true,
	randomQuarterRotations: true,
	jitterEnabled: false,
	jitterAmount: 0.25, // steps of spacing
	strictNoOverlap: true,
	// Triad stagger breaks alignment across all adjacent layers: [-a, 0, +a] repeating
	staggerTriadX: true,
	staggerAmountX: 0.33,
	staggerTriadZ: true,
	staggerAmountZ: 0.33
};
// Staged debug drop
const stagedParams = { enabled: false, perTileMs: 60, dropHeight: 6, dropMs: 140, autoAdvance: true, layerPauseMs: 200 };
// Global drop of all tiles at start (complete within totalMs)
const globalDropParams = { enabled: true, height: 20, totalMs: 3000 };
// Auto-seed at load for more variety (toggle via GUI if needed)
// autoSeedOnLoad is declared earlier

type StagedLayerEntry = { pos: Vec3, index: number };
type StagedState = { active: boolean, layer: number, layers: StagedLayerEntry[][], iso: string[], keyHandler: ((e: KeyboardEvent) => void) | null };
let stagedState: StagedState = { active: false, layer: 0, layers: [], iso: [], keyHandler: null };

function mulberry32(seed: number) {
	let t = seed >>> 0;
	return function() {
		t += 0x6D2B79F5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

// Registry
type Vec3 = THREE.Vector3;
type PresetGenerator = () => Vec3[];
const LayoutRegistry: Record<string, PresetGenerator> = {};
function registerPreset(name: string, fn: PresetGenerator) { LayoutRegistry[name] = fn; }
function getPreset(name: string): PresetGenerator | undefined { return LayoutRegistry[name]; }

function validatePositions(positions: Vec3[], expected = 144): Vec3[] {
	const count = positions.length;
	if (count !== expected) console.warn(`Layout count != ${expected}, got ${count}`);
	const keys = new Set<string>();
	for (const v of positions) {
		const key = `${v.x.toFixed(4)}|${v.y.toFixed(4)}|${v.z.toFixed(4)}`;
		if (keys.has(key)) console.warn('Duplicate tile position detected at', key);
		keys.add(key);
	}
	return positions;
}

function positionsFromMask(maskLines: string[], layerIndex: number, offsets?: { offsetX?: number; offsetZ?: number }): Vec3[] {
	if (!Array.isArray(maskLines) || maskLines.length === 0) return [];
	const rows = maskLines.length;
	const cols = Math.max(...maskLines.map(line => line.length));
	const positions: Vec3[] = [];
	// Ground layer 0 on the base: bottom of layer 0 touches Y=0
	// yCenter = TILE.height/2 + layerIndex * layerStepY
	const y = (TILE.height * 0.5) + (layerIndex * TILE.layerStepY);
	const offX = (offsets?.offsetX ?? 0) * TILE.spacingX;
	const offZ = (offsets?.offsetZ ?? 0) * TILE.spacingZ;
	const xStart = -((cols - 1) / 2) * TILE.spacingX + offX;
	const zStart = -((rows - 1) / 2) * TILE.spacingZ + offZ;
	for (let r = 0; r < rows; r++) {
		const line = maskLines[r].padEnd(cols, ' ');
		for (let c = 0; c < cols; c++) {
			if (line[c] !== ' ') {
				const x = xStart + c * TILE.spacingX;
				const z = zStart + r * TILE.spacingZ;
				positions.push(new THREE.Vector3(x, y, z));
			}
		}
	}
	return positions;
}

function flattenPositions(layersMasks: { layerIndex: number; mask: string[]; offsetX?: number; offsetZ?: number }[]): Vec3[] {
	const out: Vec3[] = [];
	for (const { layerIndex, mask, offsetX, offsetZ } of layersMasks) {
		out.push(...positionsFromMask(mask, layerIndex, { offsetX, offsetZ }));
	}
	return out;
}

function clearTiles() {
	// Decrement texture refs and remove meshes; do not dispose shared boxGeo/sideMat/bottomMat
	for (const rec of tileRecords) {
		decrefTexture(rec.iso);
		tilesGroup.remove(rec.mesh);
		const mats = rec.mesh.material as THREE.Material[];
		// dispose only the unique top material; skip shared side/bottom
		(mats[2] as THREE.Material).dispose();
	}
	// Clean up group children array fully
	while (tilesGroup.children.length) tilesGroup.remove(tilesGroup.children[0]);
	tileRecords = [];
}

function buildTiles(presetName = currentPreset) {
    if (gameMode === 'pipes') {
        buildPipesGame();
        return;
    }
    // Auto-pick preset by seed if enabled
    if (varietyParams.autoPreset) {
        const choices = ['canonical_turtle', 'dragon', 'fortress', 'pyramid', 'bridge', 'crab', 'turtle_proc', 'prototype_turtle'];
        const rngPick = mulberry32(randomState.seed);
        currentPreset = choices[Math.floor(rngPick() * choices.length)] as any;
    }
    const generator = getPreset(presetName);
    if (!generator) {
        console.error(`Layout preset not found: ${presetName}`);
        return;
    }
    let positions = generator();

    // Apply random geometric transforms (mirror/rotate) in X/Z
    const sx = (randomState.mirrorX ? -1 : 1) * (randomState.rotate180 ? -1 : 1);
    const sz = (randomState.mirrorZ ? -1 : 1) * (randomState.rotate180 ? -1 : 1);
    // Optional random 90° steps rotation
    let rotSteps = 0;
    if (varietyParams.randomQuarterRotations) {
        const r = mulberry32(randomState.seed + 12345);
        rotSteps = Math.floor(r() * 4); // 0..3
    }
    positions = positions.map(p => {
        let x = p.x, z = p.z;
        // apply 90° steps around Y
        for (let s = 0; s < rotSteps; s++) {
            const nx = z;
            const nz = -x;
            x = nx; z = nz;
        }
        return new THREE.Vector3(x * sx, p.y, z * sz);
    });

    // Inter-layer X stagger (triad pattern) to avoid red-axis alignment across adjacent layers
    if (varietyParams.staggerTriadX && varietyParams.staggerAmountX !== 0) {
        const y0 = TILE.height * 0.5;
        positions = positions.map(p => {
            const layer = Math.round((p.y - y0) / TILE.layerStepY);
            const tri = (layer % 3) - 1; // -1,0,+1 repeating
            const stagger = tri * (varietyParams.staggerAmountX * TILE.spacingX);
            return new THREE.Vector3(p.x + stagger, p.y, p.z);
        });
    }
    // Inter-layer Z stagger (triad pattern) to avoid blue-axis alignment across adjacent layers
    if (varietyParams.staggerTriadZ && varietyParams.staggerAmountZ !== 0) {
        const y0 = TILE.height * 0.5;
        positions = positions.map(p => {
            const layer = Math.round((p.y - y0) / TILE.layerStepY);
            const tri = (layer % 3) - 1; // -1,0,+1 repeating
            const stagger = tri * (varietyParams.staggerAmountZ * TILE.spacingZ);
            return new THREE.Vector3(p.x, p.y, p.z + stagger);
        });
    }

    if (physicsParams.snapDown) {
        positions = snapDownPositions(positions);
    }
    // Apply small stagger so no two tiles align 100% directly above
    if (antiOverlapParams.enabled && !varietyParams.strictNoOverlap) {
        positions = applyStaggerOffsets(positions);
        // Re-run snap-down to settle after lateral nudges
        if (physicsParams.snapDown) positions = snapDownPositions(positions);
    }
    // Per-layer jitter offsets
    if (varietyParams.jitterEnabled && varietyParams.jitterAmount > 0 && !varietyParams.strictNoOverlap) {
        const rngJ = mulberry32(randomState.seed + 54321);
        // compute layer count
        const y0 = TILE.height * 0.5;
        // Compute safe per-axis jitter scales so tiles never overlap
        const maxJitterX = Math.max(0, (TILE.spacingX - TILE.width) / (2 * TILE.spacingX));
        const maxJitterZ = Math.max(0, (TILE.spacingZ - TILE.depth) / (2 * TILE.spacingZ));
        const safeJitterX = Math.min(varietyParams.jitterAmount, maxJitterX);
        const safeJitterZ = Math.min(varietyParams.jitterAmount, maxJitterZ);
        const layerToJitter = new Map<number, { jx: number, jz: number }>();
        for (const p of positions) {
            const layer = Math.round((p.y - y0) / TILE.layerStepY);
            if (!layerToJitter.has(layer)) {
                const jx = (rngJ() * 2 - 1) * safeJitterX * TILE.spacingX;
                const jz = (rngJ() * 2 - 1) * safeJitterZ * TILE.spacingZ;
                layerToJitter.set(layer, { jx, jz });
            }
        }
        positions = positions.map(p => {
            const layer = Math.round((p.y - y0) / TILE.layerStepY);
            const jit = layerToJitter.get(layer)!;
            return new THREE.Vector3(p.x + jit.jx, p.y, p.z + jit.jz);
        });
        // resolve any residual overlaps within each layer
        positions = resolveInLayerOverlaps(positions);
        // settle again
        if (physicsParams.snapDown) positions = snapDownPositions(positions);
    }
    // Strict mode: snap to grid to guarantee no lateral overlaps
    if (varietyParams.strictNoOverlap) {
        positions = resolveInLayerOverlaps(positions);
        if (physicsParams.snapDown) positions = snapDownPositions(positions);
    }
    lastPositions = positions;

    // Build a solvable assignment of flags (paired) using seeded RNG
    const rng = mulberry32(randomState.seed);
    const isoAssignment = buildSolvableAssignment(positions, rng);

    // Staged debug path
    if (stagedParams.enabled) {
        startStagedBuild(positions, isoAssignment);
        updateLayoutMarkers();
        return;
    }

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    function createFlagMaterial(iso: string) {
        // flagcdn higher-res raster; CORS-friendly
        const cached = textureCache.get(iso);
        let tex: THREE.Texture;
        if (cached) {
            cached.refs += 1;
            tex = cached.tex;
        } else {
            const url = `https://flagcdn.com/w320/${iso}.png`;
            tex = loader.load(url);
            tex.colorSpace = THREE.SRGBColorSpace;
            // Rotate 90 degrees CCW around center
            tex.center.set(0.5, 0.5);
            tex.rotation = Math.PI / 2;
            // Improve sampling quality
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            textureCache.set(iso, { tex, refs: 1 });
        }
        const mat = new THREE.MeshPhongMaterial({ map: tex, specular: 0x222222, shininess: 30 });
        return mat;
    }

    if (globalDropParams.enabled) {
        const totalMs = globalDropParams.totalMs;
        const n = positions.length;
        // Visible pop duration for each tile; remaining time is used for staggering
        const d = Math.min(400, Math.max(150, Math.floor(totalMs * 0.2)));
        const span = Math.max(0, totalMs - d);
        // Group indices by layer
        const y0 = TILE.height * 0.5;
        const grouped = new Map<number, number[]>();
        for (let i = 0; i < n; i++) {
            const layer = Math.round((positions[i].y - y0) / TILE.layerStepY);
            const arr = grouped.get(layer);
            if (arr) arr.push(i); else grouped.set(layer, [i]);
        }
        // Order layers from top-most to bottom (highest index to lowest)
        const layers = Array.from(grouped.keys()).sort((a, b) => b - a);
        const winLen = layers.length > 0 ? span / layers.length : span;
        let layerPos = 0;
        const rngJ = mulberry32(randomState.seed + 9002);
        for (const layer of layers) {
            const indices = grouped.get(layer)!;
            // Shuffle indices within the layer
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(rngJ() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            const winStart = Math.floor(layerPos * winLen);
            const jitterFrac = 0.1; // up to 10% jitter inside window
            const count = indices.length;
            for (let k = 0; k < count; k++) {
                const idx = indices[k];
                const base = (count > 1) ? (k / (count - 1)) : 0;
                const jitter = (rngJ() * 2 - 1) * jitterFrac / Math.max(1, count);
                const offset = Math.max(0, Math.min(1, base + jitter));
                const startDelay = Math.min(span, Math.floor(winStart + offset * (winLen)));
                const p = positions[idx];
                const iso = isoAssignment[idx];
                spawnTileWithDropGeneral(p, iso, globalDropParams.height, d, startDelay);
            }
            layerPos += 1;
        }
    } else {
        for (let i = 0; i < positions.length; i++) {
            const p = positions[i];
            const iso = isoAssignment[i];
            const topMat = createFlagMaterial(iso);
            // BoxGeometry groups order: +x, -x, +y(top), -y(bottom), +z, -z
            const materials = [
                sideMat, // +x
                sideMat, // -x
                topMat,  // +y (flag)
                bottomMat, // -y
                sideMat, // +z
                sideMat  // -z
            ];
            const tile = new THREE.Mesh(boxGeo, materials);
            tile.position.copy(p);
            tile.castShadow = true;
            tile.receiveShadow = true;
            // attach iso for debug
            (tile.userData as any).iso = iso;
            tilesGroup.add(tile);
            tileRecords.push({ mesh: tile, topMat, iso });
        }
    }

    updateLayoutMarkers();
}

// Preset: prototype_turtle
registerPreset('prototype_turtle', () => {
	const layers = [
		{ w: 12, h: 4 }, // 48
		{ w: 10, h: 4 }, // 40
		{ w: 7,  h: 4 }, // 28
		{ w: 6,  h: 3 }, // 18
		{ w: 4,  h: 2 }, // 8
		{ w: 2,  h: 1 }  // 2
	];
	const positions: Vec3[] = [];
	for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
		const { w, h } = layers[layerIndex];
		const y = (layerIndex + 0.5) * TILE.layerStepY;
		const xStart = -((w - 1) / 2) * TILE.spacingX;
		const zStart = -((h - 1) / 2) * TILE.spacingZ;
		for (let zi = 0; zi < h; zi++) {
			for (let xi = 0; xi < w; xi++) {
				const x = xStart + xi * TILE.spacingX;
				const z = zStart + zi * TILE.spacingZ;
				positions.push(new THREE.Vector3(x, y, z));
			}
		}
	}
	return validatePositions(positions, 144);
});

// Preset: canonical_turtle (placeholder rectangular masks totaling 144)
registerPreset('canonical_turtle', () => {
	const positions = flattenPositions(canonicalTurtleMasks);
	return validatePositions(positions, 144);
});

registerPreset('dragon', () => validatePositions(flattenPositions(dragonMasks), 144));
registerPreset('fortress', () => validatePositions(flattenPositions(fortressMasks), 144));
registerPreset('pyramid', () => validatePositions(flattenPositions(pyramidMasks), 144));
registerPreset('bridge', () => validatePositions(flattenPositions(bridgeMasks), 144));
registerPreset('crab', () => validatePositions(flattenPositions(crabMasks), 144));
registerPreset('turtle_proc', () => validatePositions(flattenPositions(buildProceduralTurtleMasks(randomState.seed)), 144));

console.info('Boot: building piles...');
buildPipesGame();
console.info('Scene children:', scene.children.length, 'tiles:', tilesGroup.children.length);
updateLevelBadge();

// Debug GUI (dat.gui-style) for gaps
const gui = new GUI({ title: 'Debug' });
gui.close();
let guiVisible = false;
function setGuiVisible(v: boolean) {
    guiVisible = v;
    (gui.domElement as HTMLElement).style.display = v ? '' : 'none';
}
setGuiVisible(false);
window.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+Shift+Alt+D toggles the debug panel
    if ((e.key === 'd' || e.key === 'D') && e.ctrlKey && e.shiftKey && e.altKey) {
        e.preventDefault();
        setGuiVisible(!guiVisible);
    }
});

// Layout folder (preset switch + markers)
const layoutFolder = gui.addFolder('Layout');
layoutFolder.add({ preset: currentPreset }, 'preset', ['canonical_turtle', 'dragon', 'fortress', 'pyramid', 'bridge', 'crab', 'turtle_proc', 'prototype_turtle'])
	.name('Preset')
	.onChange((val: 'canonical_turtle' | 'prototype_turtle') => {
		currentPreset = val as any;
		clearTiles();
		buildTiles();
	});
layoutFolder.add(markersState, 'visible').name('Show Markers').onChange(() => {
	updateLayoutMarkers();
});
layoutFolder.add(markersState, 'size', 1, 20, 1).name('Marker Size').onChange(() => {
	updateLayoutMarkers();
});
layoutFolder.addColor(markersState, 'color').name('Marker Color').onChange(() => {
	updateLayoutMarkers();
});
layoutFolder.add(randomState, 'seed', 0, 100000, 1).name('Seed').onFinishChange(() => {
	clearTiles();
	buildTiles();
});
layoutFolder.add(randomState, 'mirrorX').name('Mirror X').onChange(() => {
	clearTiles();
	buildTiles();
});
layoutFolder.add(randomState, 'mirrorZ').name('Mirror Z').onChange(() => {
	clearTiles();
	buildTiles();
});
layoutFolder.add(randomState, 'rotate180').name('Rotate 180°').onChange(() => {
	clearTiles();
	buildTiles();
});
layoutFolder.add({ Reseed: () => { randomState.seed = Math.floor(Date.now() % 100000); clearTiles(); buildTiles(); }}, 'Reseed').name('Reseed & Rebuild');
layoutFolder.add({ AutoSeedOnLoad: () => { autoSeedOnLoad = !autoSeedOnLoad; } }, 'AutoSeedOnLoad').name('Toggle Auto-Seed On Load');
layoutFolder.add(physicsParams, 'snapDown').name('Snap-Down Physics').onChange(() => {
	clearTiles();
	buildTiles();
});
layoutFolder.add(antiOverlapParams, 'enabled').name('Anti-Perfect-Overlap').onChange(() => {
	clearTiles();
	buildTiles();
});
layoutFolder.add(antiOverlapParams, 'delta', 0.0, 0.4, 0.01).name('Stagger Δ (X)').onFinishChange(() => {
	clearTiles();
	buildTiles();
});
// Variety controls
layoutFolder.add(varietyParams, 'autoPreset').name('Auto Preset (seeded)').onChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(varietyParams, 'randomQuarterRotations').name('Random 0/90/180/270').onChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(varietyParams, 'jitterEnabled').name('Per-Layer Jitter').onChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(varietyParams, 'jitterAmount', 0.0, 0.5, 0.01).name('Jitter Amount').onFinishChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(varietyParams, 'strictNoOverlap').name('No Overlap (strict)').onChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(stagedParams, 'enabled').name('Staged Drop (Space to next)').onChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add({ Next_Layer: () => dropNextLayer() }, 'Next_Layer').name('Next Layer ▶');
layoutFolder.add(stagedParams, 'perTileMs', 0, 250, 5).name('Per-Tile Delay (ms)');
layoutFolder.add(stagedParams, 'dropHeight', 0, 20, 0.5).name('Drop Height');
layoutFolder.add(stagedParams, 'dropMs', 60, 1000, 10).name('Drop Duration (ms)');
layoutFolder.add(varietyParams, 'staggerTriadX').name('Stagger Triad (X)').onChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(varietyParams, 'staggerAmountX', 0.0, 1.0, 0.05).name('Stagger Amount (X steps)').onFinishChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(varietyParams, 'staggerTriadZ').name('Stagger Triad (Z)').onChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add(varietyParams, 'staggerAmountZ', 0.0, 1.0, 0.05).name('Stagger Amount (Z steps)').onFinishChange(() => { clearTiles(); buildTiles(); });
layoutFolder.add({ empty: showEmptyBase }, 'empty').name('Show Empty Base').onChange((v: boolean) => {
	showEmptyBase = v;
	clearTiles();
	if (!showEmptyBase) { clearTracks(); buildTiles(); } else { clearTracks(); populateTracksWithTiles(10); }
});
layoutFolder.open(false);
const spacingFolder = gui.addFolder('Gaps (tile center spacing)');
spacingFolder.add(TILE, 'spacingX', 0.9, 2.0, 0.01).name('Red (X)').onChange(() => {
	clearTiles();
	buildTiles();
});
spacingFolder.add(TILE, 'spacingZ', 0.9, 2.0, 0.01).name('Blue (Z)').onChange(() => {
	clearTiles();
	buildTiles();
});
spacingFolder.add(TILE, 'layerStepY', 0.3, 1.0, 0.01).name('Green (Y)').onChange(() => {
	clearTiles();
	buildTiles();
});
spacingFolder.open(false);

// Copy-to-clipboard: snapshot all GUI values (current and future-safe)
function snapshotGUI(root: GUI) {
	const snapshot: Record<string, unknown> = {};

	function isFolder(node: unknown): node is GUI {
		return node instanceof GUI;
	}

	function controllerLabel(ctrl: any): string {
		// Try name/title, fall back to property
		return ctrl?._title ?? ctrl?._name ?? ctrl?.property ?? 'unnamed';
	}

	function nodeTitle(node: any): string {
		// Folder title if available
		return node?._title ?? node?.title ?? 'folder';
	}

	function collect(node: any, path: string[]) {
		const children = node?.children ?? [];
		for (const child of children) {
			if (isFolder(child)) {
				collect(child, [...path, nodeTitle(child)]);
			} else {
				// Controller
				const key = [...path, controllerLabel(child)].join(' / ');
				let value: unknown;
				try {
					value = child?.getValue ? child.getValue() : (child?.object ? child.object[child.property] : undefined);
				} catch {
					value = undefined;
				}
				snapshot[key] = value;
			}
		}
	}

	collect(root, ['GUI']);
	return snapshot;
}

async function copySnapshotToClipboard() {
	// Ensure live-linked values (e.g., camera) are up-to-date before snapshot
	try { syncCamParams(); } catch {}
	const payload = {
		meta: {
			app: 'Mahjong 3D',
			version: 'v1.01',
			timestamp: new Date().toISOString()
		},
		values: snapshotGUI(gui)
	};
	const text = JSON.stringify(payload, null, 2);
	try {
		await navigator.clipboard.writeText(text);
		console.info('GUI snapshot copied to clipboard.');
	} catch {
		// Fallback
		const ta = document.createElement('textarea');
		ta.value = text;
		document.body.appendChild(ta);
		ta.select();
		document.execCommand('copy');
		document.body.removeChild(ta);
		console.info('GUI snapshot copied to clipboard (fallback).');
	}
}

const actions = { 'Save to Clipboard': copySnapshotToClipboard };

// Helpers folder
const helpersFolder = gui.addFolder('Helpers');
helpersFolder.add(axes, 'visible').name('Axes Helper').listen();
helpersFolder.add(tracksState, 'visible').name('Track Guides').onChange(() => {
    if (tracksState.visible) { buildTracks(); updateTrackLabels(); } else { clearTracks(); }
});
const vizParams = { continentEdges: true };
helpersFolder.add(vizParams, 'continentEdges').name('Show Continent Edge Colors').onChange((v: boolean) => {
    continentEdgesEnabled = v;
    applyContinentEdgeColors();
});
helpersFolder.open(false);

// Base folder (color wheel)
const baseFolder = gui.addFolder('Base');
const baseParams = { color: '#3e603e' };
baseFolder.addColor(baseParams, 'color').name('Base Color').onChange((val: string) => {
	baseMat.color.set(val);
});
baseFolder.open(false);

// Tiles folder (material + colors)
const tilesFolder = gui.addFolder('Tiles');
const tilesParams = {
	sideColor: '#e9eef2',
	bottomColor: '#d0d7de',
	specular: '#222222',
	shininess: 28
};
tilesFolder.addColor(tilesParams, 'sideColor').name('Side Color').onChange((val: string) => {
	sideMat.color.set(val);
});
tilesFolder.addColor(tilesParams, 'bottomColor').name('Bottom Color').onChange((val: string) => {
	bottomMat.color.set(val);
});
tilesFolder.addColor(tilesParams, 'specular').name('Specular').onChange((val: string) => {
	sideMat.specular.set(val);
	bottomMat.specular.set(val);
});
tilesFolder.add(tilesParams, 'shininess', 0, 100, 1).name('Shininess').onChange((val: number) => {
	sideMat.shininess = val;
	// Keep bottom slightly less shiny for contrast
	bottomMat.shininess = Math.max(0, val - 10);
});
tilesFolder.open(false);

// Highlight folder (hover colors)
const highlightFolder = gui.addFolder('Highlight');
function refreshHoverStyle() {
	if (lastHover) {
		const mesh = lastHover;
		lastHover = null;
		setHover(mesh);
	}
}
highlightFolder.add(hoverParams, 'eligibleLift', 0.0, 1.0, 0.01).name('Eligible Lift').onChange(refreshHoverStyle);
highlightFolder.add(hoverParams, 'shininessBoost', 0, 100, 1).name('Shininess Boost').onChange(refreshHoverStyle);
highlightFolder.add(hoverParams, 'lightIntensity', 0.0, 3.0, 0.05).name('Light Intensity').onChange(refreshHoverStyle);
highlightFolder.add(hoverParams, 'lightDistance', 1, 30, 1).name('Light Distance').onChange(() => {
	hoverLight.distance = hoverParams.lightDistance;
	refreshHoverStyle();
});
highlightFolder.add(hoverParams, 'lightHeight', 0.0, 2.0, 0.05).name('Light Height').onChange(refreshHoverStyle);
highlightFolder.addColor(hoverParams, 'lightColor').name('Light Color').onChange(() => {
	hoverLight.color = new THREE.Color(hoverParams.lightColor as any);
	refreshHoverStyle();
});
highlightFolder.open(false);

// Place snapshot action at the bottom of the panel
// (Defer adding until after all other folders/controllers are created)

// Camera folder: quick reset to Action preset
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add({ Reset: () => applyCameraActionPreset() }, 'Reset').name('Reset: Action Preset');

// Camera attributes (position, target, fov)
const camParams = {
	posX: camera.position.x,
	posY: camera.position.y,
	posZ: camera.position.z,
	tarX: controls.target.x,
	tarY: controls.target.y,
	tarZ: controls.target.z,
	fov: camera.fov,
	distance: camera.position.distanceTo(controls.target)
};
cameraFolder.add(camParams, 'posX', -100, 100, 0.1).name('Pos X').listen().onChange((v: number) => { camera.position.x = v; controls.update(); });
cameraFolder.add(camParams, 'posY', -100, 100, 0.1).name('Pos Y').listen().onChange((v: number) => { camera.position.y = v; controls.update(); });
cameraFolder.add(camParams, 'posZ', -100, 100, 0.1).name('Pos Z').listen().onChange((v: number) => { camera.position.z = v; controls.update(); });
cameraFolder.add(camParams, 'tarX', -100, 100, 0.1).name('Target X').listen().onChange((v: number) => { controls.target.x = v; controls.update(); });
cameraFolder.add(camParams, 'tarY', -100, 100, 0.1).name('Target Y').listen().onChange((v: number) => { controls.target.y = v; controls.update(); });
cameraFolder.add(camParams, 'tarZ', -100, 100, 0.1).name('Target Z').listen().onChange((v: number) => { controls.target.z = v; controls.update(); });
cameraFolder.add(camParams, 'fov', 20, 90, 1).name('FOV').listen().onChange((v: number) => { camera.fov = v; camera.updateProjectionMatrix(); });
cameraFolder.add(camParams, 'distance', 2, 200, 0.1).name('Distance').listen().onChange((v: number) => {
	// Move camera along its view direction to match requested distance
	const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
	camera.position.copy(new THREE.Vector3().addVectors(controls.target, dir.multiplyScalar(v)));
	controls.update();
});
cameraFolder.open(false);

// Finally append the Save action so it appears at the very bottom
gui.add(actions, 'Save to Clipboard').name('Save to Clipboard');

// Staged drop (debug) helpers
function startStagedBuild(positions: Vec3[], isoAssignment: string[]) {
	// group positions by layer index
	const y0 = TILE.height * 0.5;
	const grouped = new Map<number, StagedLayerEntry[]>();
	for (let i = 0; i < positions.length; i++) {
		const p = positions[i];
		const layer = Math.round((p.y - y0) / TILE.layerStepY);
		const arr = grouped.get(layer);
		const entry = { pos: p, index: i };
		if (arr) arr.push(entry); else grouped.set(layer, [entry]);
	}
	const layers: StagedLayerEntry[][] = Array.from(grouped.entries()).sort((a,b) => a[0]-b[0]).map(([,v]) => v);
	stagedState = { active: true, layer: 0, layers, iso: isoAssignment, keyHandler: null };

	// attach key handler for space to advance layer
	if (!stagedParams.autoAdvance) {
		if (stagedState.keyHandler) document.removeEventListener('keydown', stagedState.keyHandler);
		stagedState.keyHandler = (e: KeyboardEvent) => {
		 if (e.code === 'Space') {
			 e.preventDefault();
			 dropNextLayer();
		 }
		};
		document.addEventListener('keydown', stagedState.keyHandler);
	}

	// start with first layer automatically
	setTimeout(dropNextLayer, 0);
}

function dropNextLayer() {
	if (!stagedState.active) return;
	if (stagedState.layer >= stagedState.layers.length) {
		// done
		if (stagedState.keyHandler) document.removeEventListener('keydown', stagedState.keyHandler);
		stagedState.active = false;
		return;
	}
	const entries = stagedState.layers[stagedState.layer];
	let t = 0;
	for (const entry of entries) {
		setTimeout(() => spawnTileWithDrop(entry.index, entry.pos, stagedState.iso[entry.index]), t);
		t += stagedParams.perTileMs;
	}
	stagedState.layer += 1;
	// Auto-advance to next layer after the current one finishes dropping
	if (stagedParams.autoAdvance) {
		const total = t + stagedParams.dropMs + stagedParams.layerPauseMs;
		setTimeout(() => dropNextLayer(), total);
	}
}

function spawnTileWithDrop(index: number, p: Vec3, iso: string) {
	// material creation mirrors buildTiles path
	const cached = textureCache.get(iso);
	let tex: THREE.Texture;
	if (cached) { cached.refs += 1; tex = cached.tex; }
	else {
		const url = `https://flagcdn.com/w320/${iso}.png`;
		tex = sharedTexLoader.load(url);
		tex.colorSpace = THREE.SRGBColorSpace;
		tex.center.set(0.5, 0.5);
		tex.rotation = Math.PI / 2;
		tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
		tex.generateMipmaps = true;
		tex.minFilter = THREE.LinearMipmapLinearFilter;
		tex.magFilter = THREE.LinearFilter;
		textureCache.set(iso, { tex, refs: 1 });
	}
	const topMat = new THREE.MeshPhongMaterial({ map: tex, specular: 0x222222, shininess: 30, transparent: false, opacity: 1.0 });
	const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
	const tile = new THREE.Mesh(boxGeo, materials);
	// Bouncy pop-in at final position
	tile.position.copy(p);
	tile.scale.set(0.0, 0.0, 0.0);
	tile.castShadow = true;
	tile.receiveShadow = true;
	( tile.userData as any ).iso = iso;
	tilesGroup.add(tile);
	tileRecords.push({ mesh: tile, topMat, iso });

	const start = performance.now();
	const dur = stagedParams.dropMs;
	function step(now: number) {
		const t = Math.min(1, (now - start) / dur);
		const c1 = 1.70158, c3 = c1 + 1;
		const s = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); // easeBackOut
		tile.scale.setScalar(s);
		// add a subtle Y pop (up then settle)
		const popH = TILE.height * 0.6;
		const yOff = popH * Math.sin(t * Math.PI);
		tile.position.y = p.y + yOff;
		if (t < 1) requestAnimationFrame(step);
	}
	requestAnimationFrame(step);
}

// General drop for non-staged case (all tiles at once)
function spawnTileWithDropGeneral(p: Vec3, iso: string, height: number, ms: number, delayMs = 0) {
	const cached = textureCache.get(iso);
	let tex: THREE.Texture;
	if (cached) { cached.refs += 1; tex = cached.tex; }
	else {
		const url = `https://flagcdn.com/w320/${iso}.png`;
		tex = sharedTexLoader.load(url);
		tex.colorSpace = THREE.SRGBColorSpace;
		tex.center.set(0.5, 0.5);
		tex.rotation = Math.PI / 2;
		tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
		tex.generateMipmaps = true;
		tex.minFilter = THREE.LinearMipmapLinearFilter;
		tex.magFilter = THREE.LinearFilter;
		textureCache.set(iso, { tex, refs: 1 });
	}
	const topMat = new THREE.MeshPhongMaterial({ map: tex, specular: 0x222222, shininess: 30, transparent: false, opacity: 1.0 });
	const materials = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
	const tile = new THREE.Mesh(boxGeo, materials);
	// Bouncy pop-in at final position
	tile.position.copy(p);
	tile.scale.set(0.0, 0.0, 0.0);
	tile.castShadow = true;
	tile.receiveShadow = true;
	( tile.userData as any ).iso = iso;
	tilesGroup.add(tile);
	tileRecords.push({ mesh: tile, topMat, iso });

	const begin = () => {
		const start = performance.now();
		function step(now: number) {
			const t = Math.min(1, (now - start) / ms);
			const c1 = 1.70158, c3 = c1 + 1;
			const s = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); // easeBackOut
			tile.scale.setScalar(s);
			const popH = TILE.height * 0.6;
			const yOff = popH * Math.sin(t * Math.PI);
			tile.position.y = p.y + yOff;
			if (t < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	};
	if (delayMs > 0) setTimeout(begin, delayMs); else begin();
}

function updateLayoutMarkers() {
	// Clear old markers
	if (markersPoints) {
		markersGroup.remove(markersPoints);
		// @ts-ignore
		markersPoints.geometry?.dispose?.();
		// @ts-ignore
		markersPoints.material?.dispose?.();
		markersPoints = null;
	}
	if (!markersState.visible || !lastPositions.length) return;

	const geom = new THREE.BufferGeometry();
	const positionsArray = new Float32Array(lastPositions.length * 3);
	for (let i = 0; i < lastPositions.length; i++) {
		const p = lastPositions[i];
		positionsArray[i * 3 + 0] = p.x;
		positionsArray[i * 3 + 1] = p.y + TILE.height * 0.51; // slightly above tile
		positionsArray[i * 3 + 2] = p.z;
	}
	geom.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));

	const mat = new THREE.PointsMaterial({
		color: new THREE.Color(markersState.color),
		size: markersState.size,
		sizeAttenuation: false,
		depthTest: true
	});
	markersPoints = new THREE.Points(geom, mat);
	markersGroup.add(markersPoints);
}

// Snap-down: ensure each (x,z) column forms a tight stack resting on base
function snapDownPositions(input: Vec3[]): Vec3[] {
	if (!input.length) return input;
	// Sort ascending by y so lower tiles stabilize first
	const tiles = input.map(v => v.clone()).sort((a, b) => a.y - b.y);
	const baseCenterY = TILE.height * 0.5;
	const halfX = TILE.spacingX * 0.5;
	const halfZ = TILE.spacingZ * 0.5;
	const eps = 1e-3;

	let changed = false;
	for (let i = 0; i < tiles.length; i++) {
		const t = tiles[i];
		// Find best support below: base or any tile whose XZ footprint overlaps
		let supportY = baseCenterY;
		for (let j = 0; j < i; j++) {
			const b = tiles[j];
			const overlapsX = Math.abs(t.x - b.x) <= (halfX + eps);
			const overlapsZ = Math.abs(t.z - b.z) <= (halfZ + eps);
			if (overlapsX && overlapsZ) {
				const candidate = b.y + TILE.layerStepY;
				if (candidate > supportY) supportY = candidate;
			}
		}
		if (Math.abs(t.y - supportY) > eps) {
			t.y = supportY;
			changed = true;
		}
	}
	// If any moved, resort by y to keep order consistent (single pass generally sufficient for 144)
	if (changed) tiles.sort((a, b) => a.y - b.y);
	return tiles;
}

function applyStaggerOffsets(input: Vec3[]): Vec3[] {
	if (!input.length) return input;
	const eps = 1e-3;
	const byColumn = new Map<string, Vec3[]>();
	function keyFor(v: Vec3): string {
		const rx = Math.round(v.x * 1000) / 1000;
		const rz = Math.round(v.z * 1000) / 1000;
		return `${rx}|${rz}`;
	}
	for (const v of input) {
		const k = keyFor(v);
		const arr = byColumn.get(k);
		if (arr) arr.push(v); else byColumn.set(k, [v]);
	}
	const out: Vec3[] = [];
	const dx = antiOverlapParams.delta * TILE.spacingX;
	for (const group of byColumn.values()) {
		// Base remains; higher levels alternate +/- dx
		group.sort((a, b) => a.y - b.y);
		for (let i = 0; i < group.length; i++) {
			const p = group[i].clone();
			if (i > 0) {
				const sign = (i % 2 === 1) ? 1 : -1;
				p.x += sign * dx;
			}
			out.push(p);
		}
	}
	// Keep others (that were not in any multi-tile column) — map covered all via grouping
	return out;
}

// Procedural turtle masks (seeded)
type LayerMaskDef = { layerIndex: number; mask: string[], offsetX?: number, offsetZ?: number };
function buildProceduralTurtleMasks(seed: number): LayerMaskDef[] {
	const rng = mulberry32(seed + 777);
	// targets per layer to keep total 144
	const targets = [48, 40, 28, 18, 8, 2];
	const rowsPerLayer = [6, 6, 5, 3, 3, 1];
	const minMax: Array<[number, number]> = [
		[6, 10], // L0 row width
		[4, 10], // L1
		[4, 8],  // L2
		[3, 10], // L3
		[2, 4],  // L4
		[2, 2]   // L5
	];
	const masks: LayerMaskDef[] = [];
	for (let layer = 0; layer < targets.length; layer++) {
		const rows = rowsPerLayer[layer];
		const [wmin, wmax] = minMax[layer];
		const widths = symmetricRowWidths(rows, wmin, wmax, targets[layer], rng);
		const maxW = Math.max(...widths);
		const lines: string[] = [];
		for (let r = 0; r < rows; r++) {
			const w = widths[r];
			const padL = Math.floor((maxW - w) / 2);
			const padR = maxW - w - padL;
			lines.push(' '.repeat(padL) + 'X'.repeat(w) + ' '.repeat(padR));
		}
		const offX = (layer % 2 === 0 ? 0.0 : 0.5);
		const offZ = (layer % 3 === 0 ? 0.0 : 0.5);
		masks.push({ layerIndex: layer, mask: lines, offsetX: offX, offsetZ: offZ });
	}
	return masks;
}

function symmetricRowWidths(rows: number, wmin: number, wmax: number, target: number, rng: () => number): number[] {
	// Build symmetric widths e.g., [a,b,c,c,b,a] or odd with center
	const arr = new Array<number>(rows);
	const half = Math.floor(rows / 2);
	const isOdd = rows % 2 === 1;
	// Start with mid width
	let base = Math.min(wmax, Math.max(wmin, Math.round(target / rows)));
	// Fill symmetric with small random variation
	let sum = 0;
	for (let i = 0; i < half; i++) {
		const delta = Math.round((rng() * 2 - 1) * 2);
		const w = clamp(base + delta, wmin, wmax);
		arr[i] = w;
		arr[rows - 1 - i] = w;
		sum += 2 * w;
	}
	if (isOdd) {
		const delta = Math.round((rng() * 2 - 1) * 2);
		const w = clamp(base + delta, wmin, wmax);
		arr[half] = w;
		sum += w;
	}
	// Adjust to hit exact target
	while (sum !== target) {
		if (sum < target) {
			// increment smallest pairs
			for (let i = 0; i < half && sum < target; i++) {
				if (arr[i] < wmax) { arr[i]++; arr[rows - 1 - i]++; sum += 2; }
			}
			if (isOdd && sum < target && arr[half] < wmax) { arr[half]++; sum++; }
		} else {
			// decrement largest pairs
			for (let i = 0; i < half && sum > target; i++) {
				if (arr[i] > wmin) { arr[i]--; arr[rows - 1 - i]--; sum -= 2; }
			}
			if (isOdd && sum > target && arr[half] > wmin) { arr[half]--; sum--; }
		}
		// fail-safe
		let possibleMin = (isOdd ? arr[half] : 0);
	}
	return arr;
}

function clamp(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }

// Final overlap resolver within each layer: pushes pairs apart along least-penetration axis
function resolveInLayerOverlaps(input: Vec3[]): Vec3[] {
	if (!input.length) return input;
	const y0 = TILE.height * 0.5;
	const layerToPoints = new Map<number, Vec3[]>();
	for (const p of input) {
		const layer = Math.round((p.y - y0) / TILE.layerStepY);
		const arr = layerToPoints.get(layer);
		if (arr) arr.push(p); else layerToPoints.set(layer, [p]);
	}

	const halfW = TILE.width * 0.5, halfD = TILE.depth * 0.5;
	const maxIter = 6;
	for (const pts of layerToPoints.values()) {
		for (let iter = 0; iter < maxIter; iter++) {
			let moved = false;
			for (let i = 0; i < pts.length; i++) {
				for (let j = i + 1; j < pts.length; j++) {
					const a = pts[i], b = pts[j];
					const dx = b.x - a.x;
					const dz = b.z - a.z;
					const overlapX = (halfW + halfW) - Math.abs(dx);
					const overlapZ = (halfD + halfD) - Math.abs(dz);
					if (overlapX > 0 && overlapZ > 0) {
						// Push apart along smaller overlap axis
						if (overlapX < overlapZ) {
							const push = overlapX / 2 + 1e-4;
							const sx = dx >= 0 ? 1 : -1;
							a.x -= sx * push;
							b.x += sx * push;
						} else {
							const push = overlapZ / 2 + 1e-4;
							const sz = dz >= 0 ? 1 : -1;
							a.z -= sz * push;
							b.z += sz * push;
						}
						moved = true;
					}
				}
			}
			if (!moved) break;
		}
	}
	return input;
}

// Snap any positions to the center of the spacing grid (to avoid drift)
function snapToGrid(input: Vec3[]): Vec3[] {
	const out: Vec3[] = [];
	const sx = TILE.spacingX;
	const sz = TILE.spacingZ;
	for (const p of input) {
		const gx = Math.round(p.x / sx) * sx;
		const gz = Math.round(p.z / sz) * sz;
		out.push(new THREE.Vector3(gx, p.y, gz));
	}
	return out;
}

// Expand positions radially until no per-layer overlaps remain (safety net)
function ensureNoOverlap(input: Vec3[]): Vec3[] {
	const y0 = TILE.height * 0.5;
	const halfW = TILE.width * 0.5, halfD = TILE.depth * 0.5;
	function hasOverlap(pts: Vec3[]): boolean {
		const map = new Map<number, Vec3[]>();
		for (const p of pts) {
			const layer = Math.round((p.y - y0) / TILE.layerStepY);
			const arr = map.get(layer);
			if (arr) arr.push(p); else map.set(layer, [p]);
		}
		for (const ps of map.values()) {
			for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
				const a = ps[i], b = ps[j];
				if (Math.abs(a.x - b.x) < (halfW + halfW) && Math.abs(a.z - b.z) < (halfD + halfD)) {
					return true;
				}
			}
		}
		return false;
	}
	let pts = input.map(p => p.clone());
	let iter = 0;
	while (iter < 20 && hasOverlap(pts)) {
		const scale = 1.03; // 3% radial expansion
		for (const p of pts) {
			p.x *= scale;
			p.z *= scale;
		}
		iter++;
	}
	return pts;
}

// Map continent to a drop direction vector on XZ plane (unit-ish)
function getDropDirection(cont: Continent, iso: string): { x: number, z: number } {
	switch (cont) {
		case 'Americas': return { x: -1, z: 0 };         // from West
		case 'Europe':   return { x: 0,  z: -1 };        // from South
		case 'Asia':     return { x: 1,  z: 0 };         // from East
		case 'Africa':   return { x: 0,  z: 1 };         // from North
		case 'Oceania':  return { x: Math.SQRT1_2, z: Math.SQRT1_2 }; // diagonal
		default: {
			// Fallback: pseudo-randomize by iso so groups spread across 5 directions
			const h = hashIso(iso) % 5;
			return [
				{ x: -1, z: 0 },
				{ x: 1,  z: 0 },
				{ x: 0,  z: -1 },
				{ x: 0,  z: 1 },
				{ x: Math.SQRT1_2, z: Math.SQRT1_2 }
			][h];
		}
	}
}

function hashIso(iso: string): number {
	let h = 0;
	for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
	return h;
}
// ---------------------
// Solvable assignment
// ---------------------
function buildSolvableAssignment(positions: Vec3[], rng: () => number): string[] {
	const n = positions.length;
	const pairCount = Math.floor(n / 2);

	// Create a pool of ISO codes repeated for each pair
	const isoPool = [...UN193_ISO2];
	// Fisher-Yates shuffle with rng
	for (let i = isoPool.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[isoPool[i], isoPool[j]] = [isoPool[j], isoPool[i]];
	}
	const pairIsoList: string[] = [];
	for (let i = 0; i < pairCount; i++) {
		pairIsoList.push(isoPool[i % isoPool.length]);
	}

	// Try multiple attempts in case we get stuck
	for (let attempt = 0; attempt < 30; attempt++) {
		const assigned: (string | null)[] = new Array(n).fill(null);
		const remaining = new Set<number>(Array.from({ length: n }, (_, i) => i));

		// Precompute adjacency helpers
		const halfX = TILE.spacingX * 0.5, halfZ = TILE.spacingZ * 0.5, eps = 1e-3;
		function isFreeIndex(idx: number, alive: Set<number>): boolean {
			const p = positions[idx];
			// Blocked above?
			for (const j of alive) {
				if (j === idx) continue;
				const q = positions[j];
				if (q.y + 1e-3 >= p.y + TILE.layerStepY - 1e-3) {
					const overlapsX = Math.abs(p.x - q.x) <= halfX;
					const overlapsZ = Math.abs(p.z - q.z) <= halfZ;
					if (overlapsX && overlapsZ) return false;
				}
			}
			// Check same-layer neighbors
			let hasLeft = false, hasRight = false;
			for (const j of alive) {
				if (j === idx) continue;
				const q = positions[j];
				if (Math.abs(q.y - p.y) > TILE.layerStepY * 0.25) continue;
				if (Math.abs(p.z - q.z) > halfZ) continue;
				if (q.x < p.x && Math.abs(p.x - q.x) <= TILE.spacingX - eps) hasLeft = true;
				if (q.x > p.x && Math.abs(p.x - q.x) <= TILE.spacingX - eps) hasRight = true;
				if (hasLeft && hasRight) break;
			}
			return !(hasLeft && hasRight);
		}

		let ok = true;
		for (let k = 0; k < pairCount; k++) {
			// collect all free indices
			const free: number[] = [];
			for (const idx of remaining) {
				if (isFreeIndex(idx, remaining)) free.push(idx);
			}
			if (free.length < 2) { ok = false; break; }
			// pick two distinct free indices
			const aIdx = free[Math.floor(rng() * free.length)];
			let bIdx = aIdx;
			for (let guard = 0; guard < 10 && bIdx === aIdx; guard++) {
				bIdx = free[Math.floor(rng() * free.length)];
			}
			if (aIdx === bIdx) { ok = false; break; }

			const iso = pairIsoList[k];
			assigned[aIdx] = iso;
			assigned[bIdx] = iso;
			// simulate removing the pair
			remaining.delete(aIdx);
			remaining.delete(bIdx);
		}
		if (ok && assigned.every(v => v !== null)) {
			return assigned as string[];
		}
		// tweak rng seed drift by calling it a few times
		for (let t = 0; t < 5; t++) rng();
	}

	// Fallback: simple paired shuffle (not guaranteed solvable)
	console.warn('Solvable assignment failed after attempts; using fallback random pairing.');
	const fallbackIso: string[] = [];
	const isoPairs: string[] = [];
	for (let i = 0; i < pairCount; i++) {
		isoPairs.push(isoPool[i % isoPool.length], isoPool[i % isoPool.length]);
	}
	// shuffle isoPairs
	for (let i = isoPairs.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[isoPairs[i], isoPairs[j]] = [isoPairs[j], isoPairs[i]];
	}
	for (let i = 0; i < n; i++) fallbackIso[i] = isoPairs[i];
	return fallbackIso;
}

function decrefTexture(iso: string) {
	const entry = textureCache.get(iso);
	if (!entry) return;
	entry.refs -= 1;
	if (entry.refs <= 0) {
		entry.tex.dispose();
		textureCache.delete(iso);
	}
}
// Raycast + HUD
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let lastHover: THREE.Mesh | null = null;
let pointerActive = false;
// Interaction lock to prevent overlapping animations
let interactionLockUntil = 0;
function isInteractionLocked(): boolean { return Date.now() < interactionLockUntil; }

function isTileFree(mesh: THREE.Mesh): boolean {
	// Approximate Mahjong-solitaire rule:
	// 1) No tile overlapping above (within XZ footprint, at y >= this.y + (layerStepY - epsilon))
	// 2) Has at least one free long side (no neighbor to left OR right at same layer with Z overlap)
	const my = mesh.position.y;
	const mx = mesh.position.x;
	const mz = mesh.position.z;
	const halfX = TILE.spacingX * 0.5;
	const halfZ = TILE.spacingZ * 0.5;
	const aboveY = my + TILE.layerStepY - 1e-3;
	let blockedAbove = false;
	for (const rec of tileRecords) {
		const o = rec.mesh.position;
		if (o.y + 1e-3 >= aboveY) {
			const overlapsX = Math.abs(mx - o.x) <= halfX;
			const overlapsZ = Math.abs(mz - o.z) <= halfZ;
			if (overlapsX && overlapsZ) { blockedAbove = true; break; }
		}
	}
	if (blockedAbove) return false;

	// Same-layer neighbors (within small Y tolerance)
	const sameYtol = TILE.layerStepY * 0.25;
	let hasLeft = false, hasRight = false;
	for (const rec of tileRecords) {
		const o = rec.mesh.position;
		if (Math.abs(o.y - my) > sameYtol) continue;
		const zOverlap = Math.abs(mz - o.z) <= halfZ;
		if (!zOverlap) continue;
		if (o.x < mx && Math.abs(mx - o.x) <= TILE.spacingX - 1e-3) hasLeft = true;
		if (o.x > mx && Math.abs(mx - o.x) <= TILE.spacingX - 1e-3) hasRight = true;
		if (hasLeft && hasRight) break;
	}
	return !(hasLeft && hasRight);
}

function setHover(mesh: THREE.Mesh | null) {
	// Clear previous hover
	if (lastHover && lastHover !== mesh) {
		const mats = lastHover.material as THREE.Material[];
		if (Array.isArray(mats)) {
			const top = mats[2] as THREE.MeshPhongMaterial;
			// keep selected emissive
			const sel = selected.find(s => s.mesh === lastHover);
			if (!sel) {
				top.emissive?.setHex(0x000000);
				top.opacity = 1.0;
				top.transparent = false;
				// restore original specular/shine if stored
				const ud = lastHover.userData as any;
				if (ud && ud._origSpec) top.specular.copy(ud._origSpec);
				if (ud && ud._origShine != null) top.shininess = ud._origShine;
			}
		}
		hoverLight.intensity = 0;
		lastHover = null;
	}
	if (!mesh) return;
	const mats = mesh.material as THREE.Material[];
	if (!Array.isArray(mats)) return;
	const top = mats[2] as THREE.MeshPhongMaterial;
	// don't override selection color
	if (selected.find(s => s.mesh === mesh)) { lastHover = mesh; return; }
	const free = isTileFree(mesh);
	if (free) {
		const k = hoverParams.eligibleLift;
		top.emissive = new THREE.Color(k, k, k); // subtle white lift
		top.opacity = 1.0;
		top.transparent = false;
		// store originals and boost specular/shine
		const ud = mesh.userData as any;
		if (!ud._origSpec) ud._origSpec = top.specular.clone();
		if (ud._origShine == null) ud._origShine = top.shininess;
		top.specular.setHex(0xffffff);
		top.shininess = ud._origShine + hoverParams.shininessBoost;
		// position hover light slightly above the tile
		hoverLight.position.set(mesh.position.x, mesh.position.y + TILE.height * 1.2 + hoverParams.lightHeight, mesh.position.z);
		hoverLight.distance = hoverParams.lightDistance;
		hoverLight.intensity = hoverParams.lightIntensity;
	} else {
		top.emissive?.setHex(0x000000);
		// restore specular/shine if altered
		const ud = mesh.userData as any;
		if (ud && ud._origSpec) top.specular.copy(ud._origSpec);
		if (ud && ud._origShine != null) top.shininess = ud._origShine;
		hoverLight.intensity = 0;
		top.opacity = 1.0;
		top.transparent = false;
	}
	lastHover = mesh;
}
function updateHUD(intersect?: THREE.Intersection) {
	if (intersect) {
		const { x, y, z } = intersect.point;
		hud.textContent = `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Z: ${z.toFixed(2)}`;
	} else {
		hud.textContent = `X: 0.00 | Y: 0.00 | Z: 0.00`;
	}
}
window.addEventListener('pointermove', (event: PointerEvent) => {
	const rect = renderer.domElement.getBoundingClientRect();
	const px = (event.clientX - rect.left) / rect.width;
	const py = (event.clientY - rect.top) / rect.height;
	mouse.set(px * 2 - 1, -(py * 2 - 1));
	pointerActive = true;
}, { passive: true });

window.addEventListener('pointerdown', (event: PointerEvent) => {
    if (isInteractionLocked()) return;
    // pick
    const rect = renderer.domElement.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    mouse.set(px * 2 - 1, -(py * 2 - 1));
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(tilesGroup.children, true)[0];
    if (!hit) return;
    const mesh = hit.object as THREE.Mesh;
    const rec = tileRecords.find(r => r.mesh === mesh);
    if (!rec) return;
    // In pipes mode: treat any click on a tile as a pile interaction (raise/insert/promote)
    if (gameMode === 'pipes') {
        // lock interaction for the duration of animations; hard release in case animation path fails
        interactionLockUntil = Date.now() + 500;
        setTimeout(() => { interactionLockUntil = Date.now(); }, 600);
        // brief visual feedback
        const mats = mesh.material as THREE.Material[];
        if (Array.isArray(mats)) {
            const top = mats[2] as THREE.MeshPhongMaterial;
            top.emissive = new THREE.Color(0x2244ff);
            setTimeout(() => top.emissive?.setHex(0x000000), 120);
        }
        handlePileInteraction(mesh);
        return;
    }
});

function handlePileInteraction(clicked: THREE.Mesh) {
    const bases = getTrackBases();
    if (!bases.length) return;
    const baseZ = 0;
    // Identify target pile by closest base X
    let bestX = bases[0];
    let bestD = Number.POSITIVE_INFINITY;
    for (const x of bases) {
        const d = Math.abs(x - clicked.position.x);
        if (d < bestD) { bestD = d; bestX = x; }
    }
    const pileTiles = tileRecords
        .map(r => r.mesh)
        .filter(m => Math.abs(m.position.x - bestX) <= TILE.spacingX * 0.6 && Math.abs(m.position.z - baseZ) <= TILE.spacingZ * 0.6)
        .sort((a,b) => a.position.y - b.position.y);
    if (!pileTiles.length) return;
    // a) elevate pile slightly (enough to fit one tile)
    const raise = TILE.layerStepY;
    animatePileRaise(pileTiles, raise, 160);
    // b) move the single outside tile (hand) to the bottom of this pile
    const hand = getHandTile();
    const bottomTarget = new THREE.Vector3(bestX, TILE.height * 0.5, baseZ);
    if (hand) {
        (hand.userData as any).hand = false;
        hand.scale.set(1.0, 1.0, 1.0);
        animateMoveTo(hand, bottomTarget, 220);
    }
    // c) bring the top tile of that pile to the front on the base (promote to new hand)
    const top = pileTiles[pileTiles.length - 1];
    const basesCenterX = (bases[0] + bases[bases.length - 1]) * 0.5;
    const frontPos = new THREE.Vector3(basesCenterX, TILE.height * 0.5, baseZ + TILE.depth * 2.2);
    animateMoveTo(top, frontPos, 240);
    // mark it as the new hand and scale up slightly once it arrives
    setTimeout(() => {
        (top.userData as any).hand = true;
        top.scale.set(1.1, 1.1, 1.1);
        updateTrackLabels();
        updateHandLabelFromCurrentHand();
        // release interaction lock after animations
        interactionLockUntil = Date.now();
    }, 320);
}

// Helpers for pile interaction (empty-base mode)
function getHandTile(): THREE.Mesh | null {
    for (const r of tileRecords) {
        if ((r.mesh.userData as any).hand) return r.mesh;
    }
    return null;
}

function animatePileRaise(meshes: THREE.Mesh[], dy: number, ms: number) {
    const start = performance.now();
    const from = meshes.map(m => m.position.y);
    function step(now: number) {
        const t = Math.min(1, (now - start) / ms);
        const k = t; // linear ramp
        meshes.forEach((m, i) => { m.position.y = from[i] + dy * k; });
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function animateMoveTo(mesh: THREE.Mesh, to: THREE.Vector3, ms: number) {
    const start = performance.now();
    const from = mesh.position.clone();
    function step(now: number) {
        const t = Math.min(1, (now - start) / ms);
        const k = 1 - (1 - t) * (1 - t);
        mesh.position.lerpVectors(from, to, k);
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function updateHandLabelFromCurrentHand() {
     // Clear previous
     while (handLabelGroup.children.length) handLabelGroup.remove(handLabelGroup.children[0]);
     if (!isoLabelsEnabled) return;
     const hand = getHandTile();
     if (!hand) return;
     const iso: string = (hand.userData as any).iso ?? '';
     if (displayIsoOnly) {
         const current = getHandTile();
         if (!current) return;
         const label = makeTextLabel(iso.toUpperCase());
         const pos = current.position.clone();
         label.position.set(pos.x, 0.03, pos.z + TILE.depth * 0.8);
         handLabelGroup.add(label);
     } else {
         resolveCountryName(iso).then(name => {
             // if hand changed while fetching, refresh again
             const current = getHandTile();
             if (!current) return;
             const label = makeTextLabel(name);
             const pos = current.position.clone();
             label.position.set(pos.x, 0.03, pos.z + TILE.depth * 0.8);
             // clear any older label remnants
             while (handLabelGroup.children.length) handLabelGroup.remove(handLabelGroup.children[0]);
             handLabelGroup.add(label);
         });
     }
 }

// Country name resolution (early to avoid TDZ before first use)
let regionNames: Intl.DisplayNames | null = null;
try { regionNames = new (Intl as any).DisplayNames(['en'], { type: 'region' }); } catch {}
const countryNameCache = new Map<string, string>();
function resolveCountryName(iso: string): Promise<string> {
    const code = (iso || '').toUpperCase();
    if (countryNameCache.has(code)) return Promise.resolve(countryNameCache.get(code)!);
    try {
        const n = regionNames?.of(code);
        if (typeof n === 'string' && n.length > 0) {
            countryNameCache.set(code, n);
            return Promise.resolve(n);
        }
    } catch {}
    return fetch(`https://restcountries.com/v3.1/alpha/${code}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            const name = (Array.isArray(data) && data[0]?.name?.common) ? data[0].name.common as string : code;
            countryNameCache.set(code, name);
            return name;
        })
        .catch(() => code);
}

// Build exactly `perCount` ISO codes per continent, shuffled by seed
function buildBalancedIsoPool(seed: number, perCount: number): string[] {
    const buckets: Record<Continent, string[]> = { Africa: [], Americas: [], Asia: [], Europe: [], Oceania: [], Unknown: [] } as any;
    for (const iso of UN193_ISO2) {
        const cont = continentOf(iso);
        if (cont === 'Unknown') continue;
        buckets[cont].push(iso);
    }
    // Shuffle each bucket deterministically
    const out: string[] = [];
    const conts: Continent[] = ['Africa','Americas','Asia','Europe','Oceania'];
    let salt = 0;
    for (const c of conts) {
        const arr = buckets[c];
        const r = mulberry32(seed + (salt += 12345));
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(r() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        out.push(...arr.slice(0, perCount));
    }
    // Shuffle combined pool so colors are well mixed
    const rAll = mulberry32(seed + 7777);
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rAll() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// Next level: remove side color-coding; set side faces back to neutral sideMat
function removeSideColors() {
    for (const rec of tileRecords) {
        const mats = rec.mesh.material as THREE.Material[];
        if (!Array.isArray(mats)) continue;
        mats[0] = sideMat; // +x
        mats[1] = sideMat; // -x
        // mats[2] top remains
        mats[3] = bottomMat; // bottom stays
        mats[4] = sideMat; // +z
        mats[5] = sideMat; // -z
        rec.mesh.material = mats;
    }
}

// Create a tile (flag top, colored sides by continent)
function createTileAt(p: Vec3, iso: string): TileRecord {
    const topMat = getOrCreateFlagMaterial(iso);
    const sideMatToUse = continentEdgesEnabled ? getContinentSideMaterial(iso) : sideMat;
    const materials = [sideMatToUse, sideMatToUse, topMat, bottomMat, sideMatToUse, sideMatToUse];
    const tile = new THREE.Mesh(boxGeo, materials);
    tile.position.copy(p);
    tile.castShadow = true;
    tile.receiveShadow = true;
    (tile.userData as any).iso = iso;
    tilesGroup.add(tile);
    const rec = { mesh: tile, topMat, iso } as TileRecord;
    tileRecords.push(rec);
    return rec;
}

// ---------------------
// Pipes Game (by continent)
// ---------------------
function buildPipesGame() {
    // For now, use the piles view builder
    clearTracks();
    populateTracksWithTiles(10);
}

type Pipe = { continent: Continent, indices: number[], baseX: number, baseZ: number };
const pipes: Pipe[] = [];
let currentFlagISO: string | null = null;

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
// One-shot render confirmation
setTimeout(() => {
    console.info('Render check: camera', camera.position.toArray(), 'tiles', tilesGroup.children.length);
}, 500);

// Show blocking modal with big message and OK button
let levelUpModal: HTMLDivElement | null = null;
function showLevelUpModal(title: string, subtitle: string, onOk?: () => void) {
    modalOpen = true;
    if (levelUpModal) return; // already showing
    interactionLockUntil = Date.now() + 1e9; // lock until user confirms
    levelUpModal = document.createElement('div');
    const panel = document.createElement('div');
    const h1 = document.createElement('div');
    const h2 = document.createElement('div');
    const btn = document.createElement('button');
    Object.assign(levelUpModal.style, {
        position: 'fixed', left: '0', top: '0', right: '0', bottom: '0',
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '9999'
    } as CSSStyleDeclaration);
    Object.assign(panel.style, {
        background: 'rgba(20,24,28,0.85)', color: '#e6edf3', padding: '28px 36px',
        borderRadius: '14px', boxShadow: '0 12px 28px rgba(0,0,0,0.45)', textAlign: 'center',
        minWidth: '520px', maxWidth: '80%'
    } as CSSStyleDeclaration);
    Object.assign(h1.style, { fontSize: '28px', marginBottom: '10px', fontWeight: '700' } as CSSStyleDeclaration);
    Object.assign(h2.style, { fontSize: '16px', opacity: '0.9', marginBottom: '18px' } as CSSStyleDeclaration);
    Object.assign(btn.style, {
        fontSize: '16px', padding: '10px 18px', borderRadius: '8px', border: '1px solid #3b82f6',
        background: '#2563eb', color: '#fff', cursor: 'pointer'
    } as CSSStyleDeclaration);
    h1.textContent = title;
    h2.textContent = subtitle;
    btn.textContent = 'OK';
    btn.onclick = () => {
        if (levelUpModal) {
            levelUpModal.remove();
            levelUpModal = null;
        }
        if (onOk) onOk(); else repopulatePilesRandomUnique();
        interactionLockUntil = Date.now();
        modalOpen = false;
    };
    panel.appendChild(h1); panel.appendChild(h2); panel.appendChild(btn);
    levelUpModal.appendChild(panel);
    document.body.appendChild(levelUpModal);
}

// Repopulate piles with random unique flags drawn from full 193 set (no balancing)
function repopulatePilesRandomUnique(levels = 10) {
    // Balanced distribution: 10 per continent
    clearTiles();
    const balancedPool = buildBalancedIsoPool(randomState.seed + 24601, 10);
    const bases = getTrackBases();
    const baseZ = 0;
    const y0 = TILE.height * 0.5;
    const slots: THREE.Vector3[] = [];
    for (const x of bases) for (let l = 0; l < levels; l++) slots.push(new THREE.Vector3(x, y0 + l * TILE.layerStepY, baseZ));
    const rng = mulberry32(randomState.seed + 8642);
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = slots[i]; slots[i] = slots[j]; slots[j] = t; }
    for (let i = 0; i < slots.length; i++) createTileAt(slots[i], balancedPool[i]);
    updateTrackLabels();
    spawnOutsideTile(levels);
}

function applyContinentEdgeColors() {
    for (const rec of tileRecords) {
        const mats = rec.mesh.material as THREE.Material[];
        if (!Array.isArray(mats)) continue;
        const useColored = continentEdgesEnabled;
        const edgeMat = useColored ? getContinentSideMaterial(rec.iso) : sideMat;
        mats[0] = edgeMat;
        mats[1] = edgeMat;
        // mats[2] top remains
        mats[3] = bottomMat;
        mats[4] = edgeMat;
        mats[5] = edgeMat;
        rec.mesh.material = mats;
    }
}


