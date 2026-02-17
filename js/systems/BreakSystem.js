class BreakSystem {
    constructor() {
        this.maxGauge = 0;
        this.currentGauge = 0;
        this.isBroken = false;
        this.breakTimer = null;
    }

    init(maxGauge) {
        this.maxGauge = maxGauge;
        this.currentGauge = maxGauge;
        this.isBroken = false;
    }

    applyBreakDamage(amount) {
        if (this.isBroken || this.maxGauge <= 0) return false;
        this.currentGauge = Math.max(0, this.currentGauge - amount);
        EventsCenter.emit(GameEvents.BREAK_CHANGED, {
            current: this.currentGauge,
            max: this.maxGauge,
            isBroken: this.isBroken
        });
        if (this.currentGauge <= 0) {
            this.triggerBreak();
            return true;
        }
        return false;
    }

    triggerBreak() {
        this.isBroken = true;
        EventsCenter.emit(GameEvents.BOSS_BREAK, { isBroken: true });
    }

    endBreak() {
        this.isBroken = false;
        this.currentGauge = this.maxGauge;
        EventsCenter.emit(GameEvents.BOSS_BREAK, { isBroken: false });
        EventsCenter.emit(GameEvents.BREAK_CHANGED, {
            current: this.currentGauge,
            max: this.maxGauge,
            isBroken: false
        });
    }

    getPercent() {
        return this.maxGauge > 0 ? this.currentGauge / this.maxGauge : 0;
    }
}
