class EffectSystem {
    constructor(scene) {
        this.scene = scene;
    }

    // --- Hit impact: small burst of particles at bullet impact point ---
    hitImpact(x, y, color) {
        const col = color || 0xffffff;
        // Quick flash circle
        const flash = this.scene.add.image(x, y, 'particle_white')
            .setTint(col).setScale(0.3).setAlpha(0.8).setDepth(70);
        this.scene.tweens.add({
            targets: flash, scale: 1.0, alpha: 0,
            duration: 150, onComplete: () => flash.destroy()
        });

        // 3-5 spark particles flying outward
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 20;
            const spark = this.scene.add.image(x, y, 'particle_spark')
                .setTint(col).setScale(0.4 + Math.random() * 0.4)
                .setAlpha(0.9).setDepth(70).setRotation(angle);
            this.scene.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0, scale: 0.1,
                duration: 200 + Math.random() * 150,
                onComplete: () => spark.destroy()
            });
        }
    }

    // --- Crit spark: bigger, brighter hit with star burst ---
    critSpark(x, y) {
        // Bright flash
        const flash = this.scene.add.image(x, y, 'particle_white')
            .setTint(0xffff00).setScale(0.5).setAlpha(1).setDepth(72);
        this.scene.tweens.add({
            targets: flash, scale: 1.8, alpha: 0,
            duration: 250, onComplete: () => flash.destroy()
        });

        // Star burst
        const star = this.scene.add.image(x, y, 'particle_star')
            .setTint(0xffcc00).setScale(0.8).setAlpha(1).setDepth(72);
        this.scene.tweens.add({
            targets: star, scale: 2.0, alpha: 0, rotation: star.rotation + 1,
            duration: 350, onComplete: () => star.destroy()
        });

        // Outward sparks (more than normal hit)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 25 + Math.random() * 20;
            const spark = this.scene.add.image(x, y, 'particle_spark')
                .setTint(0xffee44).setScale(0.5 + Math.random() * 0.5)
                .setAlpha(1).setDepth(72).setRotation(angle);
            this.scene.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0, scale: 0.1,
                duration: 300 + Math.random() * 200,
                onComplete: () => spark.destroy()
            });
        }
    }

    // --- Explosion: expanding ring + fireball + debris ---
    explosion(x, y, radius) {
        const r = radius || 60;
        const scale = r / 32;

        // Shockwave ring
        const ring = this.scene.add.image(x, y, 'particle_ring')
            .setTint(0xff8800).setScale(0.2).setAlpha(0.9).setDepth(71);
        this.scene.tweens.add({
            targets: ring, scale: scale * 1.5, alpha: 0,
            duration: 400, onComplete: () => ring.destroy()
        });

        // Fireball
        const fire = this.scene.add.image(x, y, 'explosion_circle')
            .setScale(0.3).setAlpha(0.9).setDepth(71);
        this.scene.tweens.add({
            targets: fire, scale: scale, alpha: 0,
            duration: 350, ease: 'Quad.easeOut',
            onComplete: () => fire.destroy()
        });

        // Debris particles
        const debrisCount = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < debrisCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = r * 0.5 + Math.random() * r * 0.6;
            const spark = this.scene.add.image(x, y, 'particle_white')
                .setTint(Math.random() > 0.5 ? 0xff6600 : 0xffcc00)
                .setScale(0.3 + Math.random() * 0.4).setAlpha(1).setDepth(71);
            this.scene.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0, scale: 0.05,
                duration: 300 + Math.random() * 300,
                onComplete: () => spark.destroy()
            });
        }

        // Smoke puffs
        for (let i = 0; i < 3; i++) {
            const ox = (Math.random() - 0.5) * r * 0.6;
            const oy = (Math.random() - 0.5) * r * 0.6;
            const smoke = this.scene.add.image(x + ox, y + oy, 'particle_smoke')
                .setTint(0x444444).setScale(0.4).setAlpha(0.5).setDepth(70);
            this.scene.tweens.add({
                targets: smoke,
                y: smoke.y - 20 - Math.random() * 15,
                scale: 1.2 + Math.random() * 0.5,
                alpha: 0,
                duration: 500 + Math.random() * 300,
                delay: 50 + Math.random() * 100,
                onComplete: () => smoke.destroy()
            });
        }
    }

    // --- Muzzle flash: short burst at fire point ---
    muzzleFlash(x, y, angle) {
        const ox = Math.cos(angle) * 16;
        const oy = Math.sin(angle) * 16;
        const fx = x + ox;
        const fy = y + oy;

        const flash = this.scene.add.image(fx, fy, 'muzzle_flash')
            .setRotation(angle).setScale(0.6).setAlpha(0.9).setDepth(55);
        this.scene.tweens.add({
            targets: flash, scale: 0.2, alpha: 0,
            duration: 80, onComplete: () => flash.destroy()
        });
    }

    // --- Enemy death: burst outward + fade ---
    enemyDeath(x, y, color, size) {
        const col = color || 0xff4444;
        const s = size || 28;
        const scale = s / 28;

        // Flash
        const flash = this.scene.add.image(x, y, 'particle_white')
            .setTint(0xffffff).setScale(0.5 * scale).setAlpha(1).setDepth(71);
        this.scene.tweens.add({
            targets: flash, scale: 2.0 * scale, alpha: 0,
            duration: 200, onComplete: () => flash.destroy()
        });

        // Colored fragments flying outward
        const fragCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < fragCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 * scale + Math.random() * 25 * scale;
            const frag = this.scene.add.image(x, y, 'particle_white')
                .setTint(Math.random() > 0.3 ? col : 0xffffff)
                .setScale(0.2 + Math.random() * 0.3)
                .setAlpha(0.9).setDepth(71);
            this.scene.tweens.add({
                targets: frag,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0, scale: 0.05,
                duration: 250 + Math.random() * 250,
                onComplete: () => frag.destroy()
            });
        }

        // Expanding ring
        const ring = this.scene.add.image(x, y, 'particle_ring')
            .setTint(col).setScale(0.2).setAlpha(0.7).setDepth(70);
        this.scene.tweens.add({
            targets: ring, scale: 1.2 * scale, alpha: 0,
            duration: 350, onComplete: () => ring.destroy()
        });
    }

    // --- Skill activation: attribute-colored burst + star particles ---
    skillActivation(x, y, attribute) {
        const col = ATTRIBUTE_COLORS[attribute] || 0x00ffff;

        // Central burst
        const burst = this.scene.add.image(x, y, 'particle_white')
            .setTint(col).setScale(0.5).setAlpha(0.9).setDepth(72);
        this.scene.tweens.add({
            targets: burst, scale: 2.5, alpha: 0,
            duration: 350, onComplete: () => burst.destroy()
        });

        // Ring
        const ring = this.scene.add.image(x, y, 'particle_ring')
            .setTint(col).setScale(0.3).setAlpha(0.8).setDepth(72);
        this.scene.tweens.add({
            targets: ring, scale: 2.0, alpha: 0,
            duration: 400, onComplete: () => ring.destroy()
        });

        // Star particles spiraling outward
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 30 + Math.random() * 20;
            const star = this.scene.add.image(x, y, 'particle_star')
                .setTint(col).setScale(0.3 + Math.random() * 0.3)
                .setAlpha(0.9).setDepth(72);
            this.scene.tweens.add({
                targets: star,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                rotation: star.rotation + 2,
                alpha: 0, scale: 0.1,
                duration: 350 + Math.random() * 200,
                delay: i * 20,
                onComplete: () => star.destroy()
            });
        }
    }

    // --- ULT activation: big dramatic burst ---
    ultActivation(x, y, attribute) {
        const col = ATTRIBUTE_COLORS[attribute] || 0xffcc00;

        // Large flash
        const flash = this.scene.add.image(x, y, 'particle_white')
            .setTint(0xffffff).setScale(1).setAlpha(1).setDepth(73);
        this.scene.tweens.add({
            targets: flash, scale: 5, alpha: 0,
            duration: 500, onComplete: () => flash.destroy()
        });

        // Colored ring expanding
        const ring = this.scene.add.image(x, y, 'particle_ring')
            .setTint(col).setScale(0.5).setAlpha(1).setDepth(73);
        this.scene.tweens.add({
            targets: ring, scale: 4, alpha: 0,
            duration: 600, onComplete: () => ring.destroy()
        });

        // Star rain
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 50 + Math.random() * 30;
            const star = this.scene.add.image(x, y, 'particle_star')
                .setTint(col).setScale(0.4 + Math.random() * 0.4)
                .setAlpha(1).setDepth(73);
            this.scene.tweens.add({
                targets: star,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                rotation: star.rotation + 3,
                alpha: 0, scale: 0.05,
                duration: 500 + Math.random() * 300,
                delay: i * 15,
                onComplete: () => star.destroy()
            });
        }
    }

    // --- Dodge trail: afterimage streak behind player ---
    dodgeTrail(x, y, dirX, dirY, attribute) {
        const col = ATTRIBUTE_COLORS[attribute] || 0x88ccff;
        // Trail streak opposite to movement direction
        const angle = Math.atan2(dirY, dirX);
        const trail = this.scene.add.image(x, y, 'dodge_trail')
            .setTint(col).setRotation(angle).setScale(1.5, 1.0)
            .setAlpha(0.6).setDepth(45);
        this.scene.tweens.add({
            targets: trail, alpha: 0, scaleX: 0.5,
            duration: 250, onComplete: () => trail.destroy()
        });

        // Speed lines
        for (let i = 0; i < 3; i++) {
            const ox = (Math.random() - 0.5) * 20;
            const oy = (Math.random() - 0.5) * 20;
            const line = this.scene.add.image(x + ox, y + oy, 'particle_spark')
                .setTint(0xaaddff).setScale(0.3, 0.6).setAlpha(0.5)
                .setRotation(angle).setDepth(45);
            this.scene.tweens.add({
                targets: line,
                x: line.x - Math.cos(angle) * 25,
                y: line.y - Math.sin(angle) * 25,
                alpha: 0,
                duration: 200 + Math.random() * 100,
                onComplete: () => line.destroy()
            });
        }
    }

    // --- Shield absorb: blue hex flash ---
    shieldAbsorb(x, y) {
        const hit = this.scene.add.image(x, y, 'shield_hit')
            .setScale(0.5).setAlpha(0.9).setDepth(71);
        this.scene.tweens.add({
            targets: hit, scale: 1.5, alpha: 0,
            duration: 250, onComplete: () => hit.destroy()
        });
    }

    // --- Heal effect: rising green crosses ---
    healEffect(x, y) {
        for (let i = 0; i < 4; i++) {
            const ox = (Math.random() - 0.5) * 30;
            const star = this.scene.add.image(x + ox, y, 'particle_star')
                .setTint(0x44ff88).setScale(0.3 + Math.random() * 0.2)
                .setAlpha(0.8).setDepth(72);
            this.scene.tweens.add({
                targets: star,
                y: y - 25 - Math.random() * 20,
                alpha: 0, scale: 0.1,
                duration: 500 + Math.random() * 300,
                delay: i * 80,
                onComplete: () => star.destroy()
            });
        }
    }

    // --- Buff/debuff aura pulse ---
    buffPulse(x, y, color) {
        const ring = this.scene.add.image(x, y, 'particle_ring')
            .setTint(color || 0xffcc00).setScale(0.3).setAlpha(0.6).setDepth(49);
        this.scene.tweens.add({
            targets: ring, scale: 1.5, alpha: 0,
            duration: 400, onComplete: () => ring.destroy()
        });
    }

    // --- Boss break: dramatic shattering effect ---
    bossBreak(x, y) {
        // Bright flash
        const flash = this.scene.add.image(x, y, 'particle_white')
            .setTint(0xffff00).setScale(1).setAlpha(1).setDepth(73);
        this.scene.tweens.add({
            targets: flash, scale: 4, alpha: 0,
            duration: 400, onComplete: () => flash.destroy()
        });

        // Multiple rings
        for (let i = 0; i < 3; i++) {
            const ring = this.scene.add.image(x, y, 'particle_ring')
                .setTint(0xffff00).setScale(0.3).setAlpha(0.8).setDepth(73);
            this.scene.tweens.add({
                targets: ring, scale: 2.5 + i, alpha: 0,
                duration: 400 + i * 150, delay: i * 80,
                onComplete: () => ring.destroy()
            });
        }

        // Spark shower
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 50;
            const spark = this.scene.add.image(x, y, 'particle_spark')
                .setTint(Math.random() > 0.5 ? 0xffff00 : 0xffaa00)
                .setScale(0.4 + Math.random() * 0.5)
                .setAlpha(1).setDepth(73).setRotation(Math.random() * Math.PI);
            this.scene.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0, scale: 0.05,
                duration: 400 + Math.random() * 400,
                delay: Math.random() * 100,
                onComplete: () => spark.destroy()
            });
        }
    }

    // --- Piercing trail: brief afterimage along bullet path ---
    piercingTrail(x, y, angle, color) {
        const col = color || 0x00ffff;
        const trail = this.scene.add.image(x, y, 'particle_spark')
            .setTint(col).setScale(0.3, 0.8).setRotation(angle)
            .setAlpha(0.5).setDepth(40);
        this.scene.tweens.add({
            targets: trail, alpha: 0, scale: 0.05,
            duration: 150, onComplete: () => trail.destroy()
        });
    }
}
