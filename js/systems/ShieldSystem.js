class ShieldSystem {
    constructor() {
        this.maxShield = 0;
        this.currentShield = 0;
    }

    init(partyMembers) {
        this.maxShield = partyMembers.reduce((sum, m) => sum + (m.shield || 0), 0);
        this.currentShield = this.maxShield;
    }

    applyDamage(damage) {
        let remainingDamage = damage;
        if (this.currentShield > 0) {
            const absorbed = Math.min(this.currentShield, remainingDamage);
            this.currentShield -= absorbed;
            remainingDamage -= absorbed;
            EventsCenter.emit(GameEvents.SHIELD_CHANGED, {
                current: this.currentShield,
                max: this.maxShield
            });
        }
        return remainingDamage;
    }

    heal(amount) {
        this.currentShield = Math.min(this.maxShield, this.currentShield + amount);
        EventsCenter.emit(GameEvents.SHIELD_CHANGED, {
            current: this.currentShield,
            max: this.maxShield
        });
    }

    getPercent() {
        return this.maxShield > 0 ? this.currentShield / this.maxShield : 0;
    }
}
