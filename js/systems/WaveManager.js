class WaveManager {
    constructor(scene) {
        this.scene = scene;
        this.waves = [];
        this.currentWaveIndex = 0;
        this.waveActive = false;
        this.enemiesAlive = 0;
        this.totalEnemiesDefeated = 0;
        this.allWavesComplete = false;
    }

    init(stageData, enemiesData) {
        this.waves = [];
        this.currentWaveIndex = 0;
        this.waveActive = false;
        this.enemiesAlive = 0;
        this.totalEnemiesDefeated = 0;
        this.allWavesComplete = false;

        for (let i = 1; i <= 4; i++) {
            const waveStr = stageData[`wave${i}`];
            if (!waveStr || waveStr === '') continue;
            const entries = waveStr.split(',').map(entry => {
                const [id, countStr] = entry.trim().split(':');
                const enemyDef = enemiesData.find(e => e.id === id);
                return { id, count: parseInt(countStr, 10), def: enemyDef };
            }).filter(e => e.def);
            if (entries.length > 0) {
                this.waves.push(entries);
            }
        }
    }

    startNextWave() {
        if (this.currentWaveIndex >= this.waves.length) {
            this.allWavesComplete = true;
            EventsCenter.emit(GameEvents.STAGE_CLEARED);
            return null;
        }

        const wave = this.waves[this.currentWaveIndex];
        this.waveActive = true;
        this.enemiesAlive = wave.reduce((sum, e) => sum + e.count, 0);

        EventsCenter.emit(GameEvents.WAVE_STARTED, {
            waveIndex: this.currentWaveIndex,
            totalWaves: this.waves.length
        });

        this.currentWaveIndex++;
        return wave;
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
            EventsCenter.emit(GameEvents.WAVE_CLEARED, {
                waveIndex: this.currentWaveIndex - 1,
                totalWaves: this.waves.length
            });
        }
    }

    isWaveActive() {
        return this.waveActive;
    }

    isComplete() {
        return this.allWavesComplete;
    }

    getProgress() {
        return {
            currentWave: this.currentWaveIndex,
            totalWaves: this.waves.length,
            enemiesAlive: this.enemiesAlive
        };
    }
}
