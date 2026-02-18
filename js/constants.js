const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const ATTRIBUTE_CHART = {
    bio:       { strongVs: 'psychic',  weakVs: 'machine' },
    psychic:   { strongVs: 'machine',  weakVs: 'bio' },
    machine:   { strongVs: 'bio',      weakVs: 'psychic' },
    corrosion: { strongVs: 'immunity', weakVs: 'immunity' },
    immunity:  { strongVs: 'corrosion', weakVs: 'corrosion' }
};

const ATTRIBUTE_COLORS = {
    bio:       0xff4444,
    psychic:   0x44cc44,
    machine:   0x4488ff,
    corrosion: 0xaa44dd,
    immunity:  0xddcc44
};

const ATTRIBUTE_NAMES = {
    bio:       '生体',
    psychic:   '霊脳',
    machine:   '機械',
    corrosion: '侵蝕',
    immunity:  '防疫'
};

const TYPE_NAMES = {
    dps:     '火力',
    support: '補助',
    tank:    '防御',
    medic:   '医療',
    breaker: '強襲'
};

const WEAPON_CONFIGS = {
    pistol:         { range: 250, fireRate: 5.0,  magazineSize: 12, reloadTime: 1200, spreadAngle: 3,  bulletSpeed: 500 },
    assault_rifle:  { range: 300, fireRate: 6.0,  magazineSize: 30, reloadTime: 1800, spreadAngle: 5,  bulletSpeed: 450 },
    shotgun:        { range: 150, fireRate: 1.2,  magazineSize: 6,  reloadTime: 2000, spreadAngle: 25, bulletSpeed: 400, pelletsPerShot: 5 },
    sniper_rifle:   { range: 450, fireRate: 0.8,  magazineSize: 5,  reloadTime: 2500, spreadAngle: 0,  bulletSpeed: 700, piercing: true },
    launcher:       { range: 280, fireRate: 0.6,  magazineSize: 3,  reloadTime: 3000, spreadAngle: 0,  bulletSpeed: 300, explosionRadius: 60 }
};

const ADVANTAGE_MULTIPLIER = 1.3;
const DISADVANTAGE_MULTIPLIER = 0.7;

const TYPE_BONUS = {
    dps:     { atkMult: 1.15 },
    support: {},
    tank:    { defMult: 1.20, shieldMult: 1.20 },
    medic:   {},
    breaker: { breakMult: 1.30 }
};

const BREAK_DURATION = 5000;
const BREAK_DAMAGE_BONUS = 1.5;

const SAVE_KEY = 'stellar_gunners_save';

const FIELD_WIDTH = 1200;
const FIELD_HEIGHT = 900;

// ULT system
const ULT_GAUGE_MAX = 1000;
const ULT_CHARGE_ON_DEAL = 8;      // per hit dealt
const ULT_CHARGE_ON_RECEIVE = 15;  // per hit received
const ULT_CHARGE_ON_KILL = 50;     // per enemy killed

// Dodge system
const DODGE_COOLDOWN = 3000;        // ms
const DODGE_DURATION = 300;         // ms of invincibility
const DODGE_SPEED_MULT = 3.0;      // speed multiplier during dodge
const DODGE_DISTANCE = 120;         // pixels traveled

// Area system
const AREA_TRANSITION_DELAY = 2000;   // ms after area clear before portal
const AREA_TRANSITION_FADE = 800;     // ms for fade in/out

// Obstacle types
const OBSTACLE_TYPES = {
    wall:      { width: 64, height: 16, destructible: false },
    barricade: { width: 48, height: 12, destructible: true, hp: 300 },
    pillar:    { width: 24, height: 24, destructible: false },
    crate:     { width: 32, height: 32, destructible: true, hp: 150 }
};

// Area layout templates
const AREA_LAYOUTS = {
    open:     { count: 0,  types: [] },
    sparse:   { count: 4,  types: ['crate', 'barricade'] },
    moderate: { count: 8,  types: ['wall', 'barricade', 'pillar'] },
    corridor: { count: 12, types: ['wall', 'wall', 'pillar'] },
    pillars:  { count: 6,  types: ['pillar'] },
    arena:    { count: 4,  types: ['pillar', 'pillar'] },
    bunker:   { count: 10, types: ['wall', 'barricade', 'crate'] }
};

// Animation frame counts and speeds
const ANIM_FRAMES = { idle: 3, walk: 4, fire: 2, hit: 1, death: 3 };
const ANIM_FPS = { idle: 4, walk: 8, fire: 12, hit: 10, death: 6 };
