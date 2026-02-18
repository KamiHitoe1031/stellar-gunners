class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.staticGroup = scene.physics.add.staticGroup();
        this.obstacles = [];
    }

    generateForArea(layoutName) {
        this.clearAll();
        const layout = AREA_LAYOUTS[layoutName];
        if (!layout || layout.count === 0) return;

        const margin = 120;
        const playerZone = {
            x: FIELD_WIDTH / 2 - 80,
            y: FIELD_HEIGHT / 2 - 80,
            w: 160, h: 160
        };

        for (let i = 0; i < layout.count; i++) {
            const type = layout.types[i % layout.types.length];
            const config = OBSTACLE_TYPES[type];
            if (!config) continue;

            let x, y, attempts = 0;
            let valid = false;

            while (attempts < 50 && !valid) {
                x = margin + Math.random() * (FIELD_WIDTH - margin * 2);
                y = margin + Math.random() * (FIELD_HEIGHT - margin * 2);
                valid = !this._overlapsZone(x, y, config, playerZone) &&
                        !this._overlapsSiblings(x, y, config);
                attempts++;
            }

            if (!valid) continue;

            const textureKey = `obstacle_${type}`;
            const obstacle = new Obstacle(this.scene, x, y, textureKey, type);
            this.staticGroup.add(obstacle);
            this.obstacles.push(obstacle);
        }
    }

    _overlapsZone(x, y, config, zone) {
        const hw = config.width / 2;
        const hh = config.height / 2;
        return !(x + hw < zone.x || x - hw > zone.x + zone.w ||
                 y + hh < zone.y || y - hh > zone.y + zone.h);
    }

    _overlapsSiblings(x, y, config) {
        const hw = config.width / 2 + 20; // extra padding
        const hh = config.height / 2 + 20;
        for (const obs of this.obstacles) {
            if (!obs.active) continue;
            const oc = OBSTACLE_TYPES[obs.obstacleType] || { width: 32, height: 32 };
            const ohw = oc.width / 2 + 20;
            const ohh = oc.height / 2 + 20;
            if (Math.abs(x - obs.x) < hw + ohw && Math.abs(y - obs.y) < hh + ohh) {
                return true;
            }
        }
        return false;
    }

    getStaticGroup() {
        return this.staticGroup;
    }

    clearAll() {
        this.obstacles = [];
        // clear(true, true) removes from scene and destroys children in one pass
        // Do NOT manually destroy obstacles before this - double-destroy causes
        // body.size access on already-destroyed physics bodies
        this.staticGroup.clear(true, true);
    }
}
