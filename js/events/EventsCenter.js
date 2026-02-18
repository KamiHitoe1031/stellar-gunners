const EventsCenter = new Phaser.Events.EventEmitter();

const GameEvents = {
    DAMAGE_DEALT: 'damage-dealt',
    SHIELD_CHANGED: 'shield-changed',
    HP_CHANGED: 'hp-changed',
    BREAK_CHANGED: 'break-changed',
    SKILL_USED: 'skill-used',
    WAVE_CLEARED: 'wave-cleared',
    WAVE_STARTED: 'wave-started',
    STAGE_CLEARED: 'stage-cleared',
    GAME_OVER: 'game-over',
    SCORE_UPDATED: 'score-updated',
    CHAR_SWITCHED: 'char-switched',
    ENEMY_DEFEATED: 'enemy-defeated',
    BOSS_PHASE_CHANGE: 'boss-phase-change',
    BOSS_BREAK: 'boss-break',
    BOSS_SPAWNED: 'boss-spawned',
    PAUSE_TOGGLE: 'pause-toggle',
    AREA_CLEARED: 'area-cleared',
    AREA_TRANSITION: 'area-transition',
    AREA_STARTED: 'area-started'
};
