class WaveManager {
    constructor(scene) {
        this.scene = scene;
        this.areas = [];
        this.currentAreaIndex = 0;
        this.currentWaveInArea = 0;
        this.waveActive = false;
        this.enemiesAlive = 0;
        this.totalEnemiesDefeated = 0;
        this.allAreasComplete = false;
    }

    init(stageData, enemiesData) {
        this.areas = [];
        this.currentAreaIndex = 0;
        this.currentWaveInArea = 0;
        this.waveActive = false;
        this.enemiesAlive = 0;
        this.totalEnemiesDefeated = 0;
        this.allAreasComplete = false;

        if (stageData.areas && stageData.areas.length > 0) {
            // New multi-area format
            stageData.areas.forEach(area => {
                const areaWaves = area.waves.map(waveStr => {
                    return waveStr.split(',').map(entry => {
                        const [id, countStr] = entry.trim().split(':');
                        const enemyDef = enemiesData.find(e => e.id === id);
                        return { id, count: parseInt(countStr, 10), def: enemyDef };
                    }).filter(e => e.def);
                }).filter(w => w.length > 0);

                this.areas.push({
                    bgTheme: area.bgTheme || 'city',
                    layout: area.layout || 'open',
                    waves: areaWaves,
                    areaName: area.areaName || ''
                });
            });
        } else {
            // Legacy flat format: convert wave1-wave4 into single area
            const waves = [];
            for (let i = 1; i <= 4; i++) {
                const waveStr = stageData[`wave${i}`];
                if (!waveStr || waveStr === '') continue;
                const entries = waveStr.split(',').map(entry => {
                    const [id, countStr] = entry.trim().split(':');
                    const enemyDef = enemiesData.find(e => e.id === id);
                    return { id, count: parseInt(countStr, 10), def: enemyDef };
                }).filter(e => e.def);
                if (entries.length > 0) waves.push(entries);
            }
            this.areas.push({
                bgTheme: 'city',
                layout: 'open',
                waves: waves,
                areaName: ''
            });
        }
    }

    getCurrentArea() {
        return this.areas[this.currentAreaIndex] || null;
    }

    getTotalAreas() {
        return this.areas.length;
    }

    getTotalWavesInCurrentArea() {
        const area = this.getCurrentArea();
        return area ? area.waves.length : 0;
    }

    startNextWaveInArea() {
        const area = this.getCurrentArea();
        if (!area) return null;
        if (this.currentWaveInArea >= area.waves.length) {
            return null;
        }

        const wave = area.waves[this.currentWaveInArea];
        this.waveActive = true;
        this.enemiesAlive = wave.reduce((sum, e) => sum + e.count, 0);

        EventsCenter.emit(GameEvents.WAVE_STARTED, {
            waveIndex: this.currentWaveInArea,
            totalWaves: area.waves.length,
            areaIndex: this.currentAreaIndex,
            totalAreas: this.areas.length
        });

        this.currentWaveInArea++;
        return wave;
    }

    advanceToNextArea() {
        this.currentAreaIndex++;
        this.currentWaveInArea = 0;
        if (this.currentAreaIndex >= this.areas.length) {
            this.allAreasComplete = true;
            EventsCenter.emit(GameEvents.STAGE_CLEARED);
            return false;
        }
        const area = this.getCurrentArea();
        EventsCenter.emit(GameEvents.AREA_STARTED, {
            areaIndex: this.currentAreaIndex,
            totalAreas: this.areas.length,
            bgTheme: area.bgTheme,
            layout: area.layout,
            areaName: area.areaName
        });
        return true;
    }

    onEnemyDefeated() {
        this.enemiesAlive--;
        this.totalEnemiesDefeated++;
        EventsCenter.emit(GameEvents.ENEMY_DEFEATED, {
            remaining: this.enemiesAlive,
            totalDefeated: this.totalEnemiesDefeated
        });

        if (this.enemiesAlive <= 0 && this.waveActive) {
            this.waveActive = false;
            const area = this.getCurrentArea();
            if (area && this.currentWaveInArea >= area.waves.length) {
                // All waves in this area cleared
                EventsCenter.emit(GameEvents.AREA_CLEARED, {
                    areaIndex: this.currentAreaIndex,
                    totalAreas: this.areas.length
                });
            } else {
                // More waves in this area
                EventsCenter.emit(GameEvents.WAVE_CLEARED, {
                    waveIndex: this.currentWaveInArea - 1,
                    totalWaves: area ? area.waves.length : 0
                });
            }
        }
    }

    isWaveActive() {
        return this.waveActive;
    }

    isAreaComplete() {
        const area = this.getCurrentArea();
        return area && this.currentWaveInArea >= area.waves.length && this.enemiesAlive <= 0;
    }

    isComplete() {
        return this.allAreasComplete;
    }

    getProgress() {
        const area = this.getCurrentArea();
        return {
            currentArea: this.currentAreaIndex + 1,
            totalAreas: this.areas.length,
            currentWave: this.currentWaveInArea,
            totalWaves: area ? area.waves.length : 0,
            enemiesAlive: this.enemiesAlive
        };
    }
}
