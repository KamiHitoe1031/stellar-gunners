class RulesScene extends Phaser.Scene {
    constructor() {
        super('RulesScene');
    }

    init() {
        this.currentPage = 0;
        this.pageObjects = [];
    }

    create() {
        const cx = GAME_WIDTH / 2;
        this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0d20);

        this.pages = [
            { title: '基本操作', draw: (g) => this.drawControlsPage(g) },
            { title: 'パーティ編成', draw: (g) => this.drawPartyPage(g) },
            { title: '属性相性', draw: (g) => this.drawAttributePage(g) },
            { title: '戦闘システム', draw: (g) => this.drawCombatPage(g) },
            { title: 'スキル & ULT', draw: (g) => this.drawSkillPage(g) },
            { title: 'ウェーブ & エリア', draw: (g) => this.drawWavePage(g) },
            { title: '装備 & 強化', draw: (g) => this.drawEquipPage(g) },
            { title: '評価 & 報酬', draw: (g) => this.drawRewardPage(g) },
        ];

        // Close button
        const closeBtn = this.add.text(GAME_WIDTH - 30, 15, '✕', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ff6666',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Nav buttons
        this.prevBtn = this.add.text(30, GAME_HEIGHT / 2, '◀', {
            fontSize: '32px', fontFamily: 'Arial', color: '#4488ff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.prevBtn.on('pointerdown', () => this.changePage(-1));

        this.nextBtn = this.add.text(GAME_WIDTH - 30, GAME_HEIGHT / 2, '▶', {
            fontSize: '32px', fontFamily: 'Arial', color: '#4488ff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.nextBtn.on('pointerdown', () => this.changePage(1));

        // Page indicator
        this.indicators = [];
        const indStart = cx - (this.pages.length * 12);
        for (let i = 0; i < this.pages.length; i++) {
            const dot = this.add.circle(indStart + i * 24, GAME_HEIGHT - 25, 5, 0x446688);
            this.indicators.push(dot);
        }

        // Page title
        this.pageTitle = this.add.text(cx, 35, '', {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        this.showPage(0);
    }

    changePage(dir) {
        const next = this.currentPage + dir;
        if (next < 0 || next >= this.pages.length) return;
        this.showPage(next);
    }

    showPage(index) {
        // Clean previous
        this.pageObjects.forEach(o => { if (o && o.destroy) o.destroy(); });
        this.pageObjects = [];
        this.currentPage = index;

        // Update indicators
        this.indicators.forEach((dot, i) => {
            dot.setFillStyle(i === index ? 0x4488ff : 0x334466);
        });

        // Update nav visibility
        this.prevBtn.setAlpha(index > 0 ? 1 : 0.2);
        this.nextBtn.setAlpha(index < this.pages.length - 1 ? 1 : 0.2);

        // Title
        this.pageTitle.setText(`${index + 1}/${this.pages.length}  ${this.pages[index].title}`);

        // Draw page content
        const g = this.add.graphics();
        this.pageObjects.push(g);
        this.pages[index].draw(g);
    }

    _addText(x, y, text, style = {}) {
        const t = this.add.text(x, y, text, {
            fontSize: style.fontSize || '13px',
            fontFamily: 'Arial',
            color: style.color || '#cccccc',
            stroke: style.stroke || '#000000',
            strokeThickness: style.strokeThickness || 1,
            wordWrap: style.wordWrap ? { width: style.wordWrap } : undefined,
            align: style.align || 'left',
            lineSpacing: style.lineSpacing || 2,
        });
        if (style.origin) t.setOrigin(...style.origin);
        this.pageObjects.push(t);
        return t;
    }

    _addKeyBox(g, x, y, w, h, label, active = false) {
        g.fillStyle(active ? 0x4488ff : 0x2a2a44, 1);
        g.fillRoundedRect(x, y, w, h, 6);
        g.lineStyle(2, active ? 0x66aaff : 0x445566, 1);
        g.strokeRoundedRect(x, y, w, h, 6);
        this._addText(x + w / 2, y + h / 2, label, {
            fontSize: '14px', color: active ? '#ffffff' : '#aaaacc',
            origin: [0.5, 0.5]
        });
    }

    // ==================== Page 1: Controls ====================
    drawControlsPage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 90;

        this._addText(cx, vy, '移動', { fontSize: '16px', color: '#88ccff', origin: [0.5, 0] });

        // WASD keys
        const kx = cx - 120, ky = vy + 35;
        this._addKeyBox(g, kx, ky, 44, 38, 'W', true);
        this._addKeyBox(g, kx - 48, ky + 42, 44, 38, 'A', true);
        this._addKeyBox(g, kx, ky + 42, 44, 38, 'S', true);
        this._addKeyBox(g, kx + 48, ky + 42, 44, 38, 'D', true);

        this._addText(cx - 120 + 22, ky + 95, 'または矢印キー', {
            fontSize: '11px', color: '#888888', origin: [0.5, 0]
        });

        // Auto-aim
        const ax = cx + 80;
        this._addText(ax, vy + 35, 'オートエイム射撃', {
            fontSize: '15px', color: '#ffcc44', origin: [0.5, 0]
        });
        this._addText(ax, vy + 58, '最も近い敵に自動で照準・発射\nリロードは自動', {
            fontSize: '12px', color: '#aaaaaa', origin: [0.5, 0], align: 'center'
        });

        // Target icon
        g.lineStyle(2, 0xff4444, 0.8);
        g.strokeCircle(ax, vy + 110, 20);
        g.lineBetween(ax - 25, vy + 110, ax + 25, vy + 110);
        g.lineBetween(ax, vy + 85, ax, vy + 135);

        // Dodge
        const dy = 240;
        this._addText(cx, dy, '緊急回避', { fontSize: '16px', color: '#88ccff', origin: [0.5, 0] });
        this._addKeyBox(g, cx - 60, dy + 30, 120, 38, 'SPACE', true);
        this._addText(cx, dy + 80, `回避中は無敵 (${DODGE_DURATION}ms) / クールダウン ${DODGE_COOLDOWN / 1000}秒`, {
            fontSize: '12px', color: '#aaaaaa', origin: [0.5, 0]
        });

        // Character switch
        const sy = 340;
        this._addText(cx, sy, 'キャラ切替', { fontSize: '16px', color: '#88ccff', origin: [0.5, 0] });
        this._addKeyBox(g, cx - 80, sy + 30, 44, 38, '1');
        this._addKeyBox(g, cx - 28, sy + 30, 44, 38, '2');
        this._addKeyBox(g, cx + 24, sy + 30, 44, 38, '3');

        this._addText(cx, sy + 80, 'パーティメンバーを即座に切替', {
            fontSize: '12px', color: '#aaaaaa', origin: [0.5, 0]
        });

        // Bottom description
        this._addText(cx, GAME_HEIGHT - 70, '操作はシンプル！移動して敵を避けながら、オートエイムで攻撃しよう。\nスキルと回避を使いこなすのが勝利のカギ。', {
            fontSize: '13px', color: '#cccccc', origin: [0.5, 0], align: 'center', wordWrap: 700
        });
    }

    // ==================== Page 2: Party ====================
    drawPartyPage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 90;

        this._addText(cx, vy, '3人パーティで戦闘', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        // 3 character slots
        const slotW = 120, slotH = 150, gap = 30;
        const startX = cx - (slotW * 1.5 + gap);
        const labels = ['操作キャラ', 'サブ1', 'サブ2'];
        const colors = [0x4488ff, 0x446688, 0x446688];

        for (let i = 0; i < 3; i++) {
            const sx = startX + i * (slotW + gap);
            const sy = vy + 35;
            g.fillStyle(0x1a1a33, 1);
            g.fillRoundedRect(sx, sy, slotW, slotH, 8);
            g.lineStyle(2, colors[i], 1);
            g.strokeRoundedRect(sx, sy, slotW, slotH, 8);

            // Character icon placeholder
            const iconKey = `icon_chr_0${i + 1}`;
            if (this.textures.exists(iconKey)) {
                const icon = this.add.image(sx + slotW / 2, sy + 55, iconKey);
                icon.setDisplaySize(60, 60);
                this.pageObjects.push(icon);
            } else {
                g.fillStyle(ATTRIBUTE_COLORS[['bio', 'psychic', 'machine'][i]], 0.5);
                g.fillCircle(sx + slotW / 2, sy + 55, 30);
            }

            this._addText(sx + slotW / 2, sy + 95, labels[i], {
                fontSize: '12px', color: i === 0 ? '#88ccff' : '#888888',
                origin: [0.5, 0]
            });

            this._addKeyBox(g, sx + slotW / 2 - 15, sy + 118, 30, 24, `${i + 1}`, i === 0);
        }

        // Arrows between slots
        g.lineStyle(2, 0x4488ff, 0.6);
        const arrow1x = startX + slotW + gap / 2;
        const arrow2x = arrow1x + slotW + gap;
        const arrowY = vy + 35 + slotH / 2;
        g.lineBetween(arrow1x - 8, arrowY, arrow1x + 8, arrowY);
        g.lineBetween(arrow2x - 8, arrowY, arrow2x + 8, arrowY);

        // Description
        const dy = 300;
        this._addText(cx, dy, '操作中のキャラが倒れると自動で次のキャラに切替', {
            fontSize: '13px', color: '#ffcc44', origin: [0.5, 0]
        });

        this._addText(cx, dy + 30, 'サブキャラクターの特徴:', {
            fontSize: '14px', color: '#ffffff', origin: [0.5, 0]
        });

        const features = [
            '- 操作キャラの後方に自動追従',
            '- 射撃レート70%で自動攻撃',
            '- 敵の攻撃対象にはならない',
        ];
        features.forEach((f, i) => {
            this._addText(cx, dy + 55 + i * 22, f, {
                fontSize: '12px', color: '#aaaaaa', origin: [0.5, 0]
            });
        });

        this._addText(cx, GAME_HEIGHT - 55, '3人のキャラをうまく編成して有利に戦おう！', {
            fontSize: '13px', color: '#cccccc', origin: [0.5, 0]
        });
    }

    // ==================== Page 3: Attributes ====================
    drawAttributePage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 80;

        this._addText(cx, vy, '属性相性で大ダメージ！', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        // Triangle: bio → psychic → machine → bio
        const triCx = cx - 100, triCy = 230;
        const triR = 90;
        const attrs3 = [
            { name: '生体', color: 0xff4444, angle: -Math.PI / 2 },
            { name: '霊脳', color: 0x44cc44, angle: -Math.PI / 2 + (2 * Math.PI / 3) },
            { name: '機械', color: 0x4488ff, angle: -Math.PI / 2 + (4 * Math.PI / 3) },
        ];

        // Draw triangle
        const triPts = attrs3.map(a => ({
            x: triCx + Math.cos(a.angle) * triR,
            y: triCy + Math.sin(a.angle) * triR
        }));

        // Advantage arrows (clockwise)
        for (let i = 0; i < 3; i++) {
            const from = triPts[i];
            const to = triPts[(i + 1) % 3];
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            g.lineStyle(3, 0x44ff44, 0.7);
            g.lineBetween(from.x, from.y, to.x, to.y);
            this._addText(mx + 8, my - 8, '×1.3', {
                fontSize: '11px', color: '#44ff44', origin: [0.5, 0.5]
            });
        }

        // Attribute nodes
        attrs3.forEach((a, i) => {
            const pt = triPts[i];
            g.fillStyle(a.color, 0.8);
            g.fillCircle(pt.x, pt.y, 28);
            g.lineStyle(2, 0xffffff, 0.3);
            g.strokeCircle(pt.x, pt.y, 28);
            this._addText(pt.x, pt.y, a.name, {
                fontSize: '13px', color: '#ffffff', origin: [0.5, 0.5]
            });
        });

        // Corrosion ↔ Immunity
        const dualCx = cx + 140, dualCy = 220;
        const dualAttrs = [
            { name: '侵蝕', color: 0xaa44dd, y: dualCy - 45 },
            { name: '防疫', color: 0xddcc44, y: dualCy + 45 },
        ];

        g.lineStyle(3, 0xff8844, 0.7);
        g.lineBetween(dualCx, dualCy - 20, dualCx, dualCy + 20);
        this._addText(dualCx + 20, dualCy, '×1.3', {
            fontSize: '11px', color: '#ff8844', origin: [0.5, 0.5]
        });

        dualAttrs.forEach(a => {
            g.fillStyle(a.color, 0.8);
            g.fillCircle(dualCx, a.y, 28);
            g.lineStyle(2, 0xffffff, 0.3);
            g.strokeCircle(dualCx, a.y, 28);
            this._addText(dualCx, a.y, a.name, {
                fontSize: '13px', color: '#ffffff', origin: [0.5, 0.5]
            });
        });

        this._addText(dualCx, dualCy + 85, '相互有利', {
            fontSize: '11px', color: '#ff8844', origin: [0.5, 0]
        });

        // Legend
        const ly = 350;
        this._addText(cx, ly, '有利属性: ダメージ ×1.3    不利属性: ダメージ ×0.7', {
            fontSize: '13px', color: '#ffffff', origin: [0.5, 0]
        });

        this._addText(cx, GAME_HEIGHT - 70, '敵の属性を確認して、有利なキャラで挑もう！\n編成画面でステージの推奨属性をチェック。', {
            fontSize: '13px', color: '#cccccc', origin: [0.5, 0], align: 'center', wordWrap: 700
        });
    }

    // ==================== Page 4: Combat System ====================
    drawCombatPage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 85;

        this._addText(cx, vy, 'ダメージはシールド→HPの順に受ける', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        // Shield bar
        const barX = cx - 200, barY = vy + 50, barW = 400, barH = 28;
        g.fillStyle(0x222244, 1);
        g.fillRoundedRect(barX, barY, barW, barH, 6);
        g.fillStyle(0x44ccff, 0.8);
        g.fillRoundedRect(barX + 2, barY + 2, barW * 0.6, barH - 4, 4);
        this._addText(barX - 5, barY + barH / 2, 'Shield', {
            fontSize: '12px', color: '#44ccff', origin: [1, 0.5]
        });
        this._addText(barX + barW / 2, barY + barH / 2, '240 / 400', {
            fontSize: '12px', color: '#ffffff', origin: [0.5, 0.5]
        });

        // HP bar
        const hpY = barY + 40;
        g.fillStyle(0x222244, 1);
        g.fillRoundedRect(barX, hpY, barW, barH, 6);
        g.fillStyle(0x44ff44, 0.8);
        g.fillRoundedRect(barX + 2, hpY + 2, barW * 0.85, barH - 4, 4);
        this._addText(barX - 5, hpY + barH / 2, 'HP', {
            fontSize: '12px', color: '#44ff44', origin: [1, 0.5]
        });
        this._addText(barX + barW / 2, hpY + barH / 2, '850 / 1000', {
            fontSize: '12px', color: '#ffffff', origin: [0.5, 0.5]
        });

        // Arrow showing order
        g.lineStyle(2, 0xffcc44, 0.8);
        g.lineBetween(cx + 220, barY + barH / 2, cx + 220, hpY + barH / 2);
        this._addText(cx + 240, (barY + hpY + barH) / 2, '①→②', {
            fontSize: '12px', color: '#ffcc44', origin: [0.5, 0.5]
        });

        // Break gauge
        const bky = 235;
        this._addText(cx, bky, 'ブレイクシステム (ボス戦)', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        const brkY = bky + 35;
        g.fillStyle(0x222244, 1);
        g.fillRoundedRect(barX, brkY, barW, barH, 6);
        g.fillStyle(0xffaa00, 0.8);
        g.fillRoundedRect(barX + 2, brkY + 2, barW * 0.7, barH - 4, 4);
        this._addText(barX - 5, brkY + barH / 2, 'Break', {
            fontSize: '12px', color: '#ffaa00', origin: [1, 0.5]
        });

        const bkDesc = [
            'ブレイクゲージが0になるとボスが「ブレイク」状態に',
            `ブレイク中: ${BREAK_DURATION / 1000}秒間行動停止、被ダメ ×${BREAK_DAMAGE_BONUS}`,
            'Breakerタイプのキャラはブレイク効率が高い',
        ];
        bkDesc.forEach((t, i) => {
            this._addText(cx, brkY + 40 + i * 22, t, {
                fontSize: '12px', color: '#aaaaaa', origin: [0.5, 0]
            });
        });

        // Damage formula note
        this._addText(cx, GAME_HEIGHT - 80, 'ダメージ = (ATK × スキル倍率) × 属性相性 × (1 - DEF/(DEF+200)) × 乱数\n会心時: 追加でCritDmg%倍率', {
            fontSize: '12px', color: '#888888', origin: [0.5, 0], align: 'center', wordWrap: 700
        });
    }

    // ==================== Page 5: Skills & ULT ====================
    drawSkillPage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 85;

        this._addText(cx, vy, 'スキルで戦況を変えろ！', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        // Skill slots
        const skills = [
            { key: 'Q', name: 'スキル1', desc: '攻撃/回復系\nCD: 8〜12秒', color: 0x4488ff },
            { key: 'E', name: 'スキル2', desc: '支援/範囲系\nCD: 15〜20秒', color: 0x44cc88 },
            { key: 'R', name: '必殺技(ULT)', desc: 'ゲージ消費\n超強力な大技', color: 0xffcc00 },
        ];

        const slotW = 200, slotH = 120, gap = 20;
        const startX = cx - (slotW * 1.5 + gap);

        skills.forEach((sk, i) => {
            const sx = startX + i * (slotW + gap);
            const sy = vy + 40;

            g.fillStyle(0x1a1a33, 1);
            g.fillRoundedRect(sx, sy, slotW, slotH, 8);
            g.lineStyle(2, sk.color, 0.7);
            g.strokeRoundedRect(sx, sy, slotW, slotH, 8);

            this._addKeyBox(g, sx + 10, sy + 10, 40, 32, sk.key, true);
            this._addText(sx + 60, sy + 15, sk.name, {
                fontSize: '15px', color: '#ffffff'
            });
            this._addText(sx + 15, sy + 55, sk.desc, {
                fontSize: '11px', color: '#aaaaaa', lineSpacing: 4
            });
        });

        // ULT gauge explanation
        const uy = 270;
        this._addText(cx, uy, 'ULTゲージの溜め方', {
            fontSize: '15px', color: '#ffcc00', origin: [0.5, 0]
        });

        // ULT gauge bar
        const ugY = uy + 30;
        g.fillStyle(0x222244, 1);
        g.fillRoundedRect(cx - 200, ugY, 400, 20, 4);
        g.fillStyle(0xffcc00, 0.7);
        g.fillRoundedRect(cx - 198, ugY + 2, 280, 16, 3);
        this._addText(cx, ugY + 10, `700 / ${ULT_GAUGE_MAX}`, {
            fontSize: '11px', color: '#ffffff', origin: [0.5, 0.5]
        });

        const ultSources = [
            `敵に攻撃ヒット: +${ULT_CHARGE_ON_DEAL}`,
            `被ダメージ: +${ULT_CHARGE_ON_RECEIVE}`,
            `敵撃破: +${ULT_CHARGE_ON_KILL}`,
        ];
        ultSources.forEach((t, i) => {
            this._addText(cx, ugY + 30 + i * 22, t, {
                fontSize: '12px', color: '#ccaa44', origin: [0.5, 0]
            });
        });

        // Type-based skill hint
        this._addText(cx, GAME_HEIGHT - 70, 'タイプごとにスキルの特性が異なる:\n火力=高ダメージ  医療=回復  防御=シールド  補助=バフ  強襲=ブレイク', {
            fontSize: '12px', color: '#cccccc', origin: [0.5, 0], align: 'center', wordWrap: 700
        });
    }

    // ==================== Page 6: Waves & Areas ====================
    drawWavePage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 85;

        this._addText(cx, vy, 'ウェーブ制＋エリア移動', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        // Flow diagram
        const flowY = vy + 50;
        const boxes = [
            { label: 'Wave 1\n敵出現', x: 100, color: 0x884444 },
            { label: 'Wave 2\n敵出現', x: 260, color: 0x884444 },
            { label: 'エリア\nクリア', x: 420, color: 0x448844 },
            { label: 'ポータル\n出現', x: 560, color: 0x00ccaa },
            { label: '次エリア\nへ移動', x: 700, color: 0x4488ff },
        ];

        boxes.forEach((b, i) => {
            g.fillStyle(b.color, 0.5);
            g.fillRoundedRect(b.x - 55, flowY, 110, 55, 6);
            g.lineStyle(1, 0x666666, 0.5);
            g.strokeRoundedRect(b.x - 55, flowY, 110, 55, 6);
            this._addText(b.x, flowY + 28, b.label, {
                fontSize: '11px', color: '#ffffff', origin: [0.5, 0.5], align: 'center'
            });

            // Arrow
            if (i < boxes.length - 1) {
                const nx = boxes[i + 1].x;
                g.lineStyle(2, 0x666666, 0.6);
                g.lineBetween(b.x + 55, flowY + 28, nx - 58, flowY + 28);
            }
        });

        // Portal visual
        const py = 230;
        this._addText(cx, py, 'ポータルの見つけ方', {
            fontSize: '15px', color: '#00ccaa', origin: [0.5, 0]
        });

        // Draw portal
        g.fillStyle(0x00ffcc, 0.15);
        g.fillCircle(cx, py + 80, 50);
        g.fillStyle(0x00ffcc, 0.4);
        g.fillCircle(cx, py + 80, 30);
        g.lineStyle(3, 0x00ffcc, 0.8);
        g.strokeCircle(cx, py + 80, 30);

        this._addText(cx, py + 40, 'NEXT AREA ▶', {
            fontSize: '14px', color: '#00ffcc', origin: [0.5, 0]
        });

        // Guide arrow
        this._addText(cx - 100, py + 65, '▲', {
            fontSize: '20px', color: '#00ffcc', origin: [0.5, 0.5]
        });
        this._addText(cx - 100, py + 85, '方向矢印が\n頭上に表示', {
            fontSize: '10px', color: '#88cccc', origin: [0.5, 0], align: 'center'
        });

        const hints = [
            '全敵を倒すと次ウェーブ、最終ウェーブ後にポータル出現',
            'ポータルに触れると次エリアへ（12秒で自動遷移）',
            '最終エリアをクリアするとステージクリア！',
        ];
        hints.forEach((t, i) => {
            this._addText(cx, 370 + i * 22, t, {
                fontSize: '12px', color: '#aaaaaa', origin: [0.5, 0]
            });
        });
    }

    // ==================== Page 7: Equipment ====================
    drawEquipPage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 85;

        this._addText(cx, vy, '装備でキャラを強化', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        // Weapon types
        const wtY = vy + 40;
        this._addText(cx, wtY, '武器タイプ', {
            fontSize: '14px', color: '#ffcc44', origin: [0.5, 0]
        });

        const weapons = [
            { name: 'ピストル', stat: '射速5.0 / 弾12' },
            { name: 'アサルト', stat: '射速6.0 / 弾30' },
            { name: 'ショットガン', stat: '散弾5発 / 弾6' },
            { name: 'スナイパー', stat: '貫通 / 弾5' },
            { name: 'ランチャー', stat: '爆発範囲 / 弾3' },
        ];

        weapons.forEach((w, i) => {
            const wx = 80 + (i % 3) * 240;
            const wy = wtY + 25 + Math.floor(i / 3) * 45;
            g.fillStyle(0x1a1a33, 1);
            g.fillRoundedRect(wx, wy, 220, 38, 5);
            g.lineStyle(1, 0x334466, 1);
            g.strokeRoundedRect(wx, wy, 220, 38, 5);
            this._addText(wx + 10, wy + 8, w.name, { fontSize: '12px', color: '#ffffff' });
            this._addText(wx + 10, wy + 23, w.stat, { fontSize: '10px', color: '#888888' });
        });

        // Enhancement systems
        const ey = 260;
        this._addText(cx, ey, '強化システム一覧', {
            fontSize: '14px', color: '#ffcc44', origin: [0.5, 0]
        });

        const systems = [
            { name: 'キャラ強化', desc: 'クレジットでレベルアップ\nステータス全体が成長', color: 0x4488ff },
            { name: '武器強化', desc: '武器のATKを強化\n装備でキャラに反映', color: 0xff8844 },
            { name: '量子変換炉', desc: '不要装備を分解→素材化\n素材から新装備を再構成', color: 0xaa44dd },
        ];

        systems.forEach((s, i) => {
            const sx = 80 + i * 230;
            const sy = ey + 30;
            g.fillStyle(0x1a1a33, 1);
            g.fillRoundedRect(sx, sy, 210, 80, 6);
            g.lineStyle(2, s.color, 0.6);
            g.strokeRoundedRect(sx, sy, 210, 80, 6);
            this._addText(sx + 105, sy + 12, s.name, {
                fontSize: '13px', color: '#ffffff', origin: [0.5, 0]
            });
            this._addText(sx + 10, sy + 35, s.desc, {
                fontSize: '10px', color: '#aaaaaa', lineSpacing: 4
            });
        });

        this._addText(cx, GAME_HEIGHT - 55, 'メニューの「強化」「量子変換炉」から装備を管理しよう', {
            fontSize: '13px', color: '#cccccc', origin: [0.5, 0]
        });
    }

    // ==================== Page 8: Rewards ====================
    drawRewardPage(g) {
        const cx = GAME_WIDTH / 2;
        const vy = 85;

        this._addText(cx, vy, 'クリア評価と報酬', {
            fontSize: '16px', color: '#88ccff', origin: [0.5, 0]
        });

        // Stars
        const starY = vy + 45;
        const starDescs = [
            { stars: '★☆☆', cond: 'ステージクリア', color: '#cc8844' },
            { stars: '★★☆', cond: '+ パーティ全員生存', color: '#cccc44' },
            { stars: '★★★', cond: '+ 制限時間以内にクリア', color: '#ffcc00' },
        ];

        starDescs.forEach((s, i) => {
            const sy = starY + i * 50;
            g.fillStyle(0x1a1a33, 1);
            g.fillRoundedRect(cx - 250, sy, 500, 42, 6);
            this._addText(cx - 230, sy + 12, s.stars, {
                fontSize: '18px', color: s.color
            });
            this._addText(cx - 160, sy + 10, s.cond, {
                fontSize: '14px', color: '#ffffff'
            });
        });

        // Rewards
        const ry = 270;
        this._addText(cx, ry, '報酬の種類', {
            fontSize: '14px', color: '#ffcc44', origin: [0.5, 0]
        });

        const rewards = [
            { name: 'クレジット', desc: 'キャラ/武器強化の通貨', icon: '¢', color: '#ffcc44' },
            { name: 'ジェム', desc: '初回クリアボーナス (貴重)', icon: '◆', color: '#44ccff' },
            { name: '武器ドロップ', desc: 'ランダムで武器を獲得', icon: '⚔', color: '#ff8844' },
        ];

        rewards.forEach((r, i) => {
            const rx = 100 + i * 220;
            const ry2 = ry + 30;
            g.fillStyle(0x1a1a33, 1);
            g.fillRoundedRect(rx, ry2, 200, 70, 6);
            g.lineStyle(1, 0x334466, 1);
            g.strokeRoundedRect(rx, ry2, 200, 70, 6);
            this._addText(rx + 15, ry2 + 10, r.icon, {
                fontSize: '20px', color: r.color
            });
            this._addText(rx + 45, ry2 + 10, r.name, {
                fontSize: '13px', color: '#ffffff'
            });
            this._addText(rx + 45, ry2 + 32, r.desc, {
                fontSize: '11px', color: '#888888'
            });
        });

        // First clear bonus
        const fy = 400;
        g.fillStyle(0x2a1a33, 1);
        g.fillRoundedRect(cx - 200, fy, 400, 45, 6);
        g.lineStyle(2, 0xaa44ff, 0.6);
        g.strokeRoundedRect(cx - 200, fy, 400, 45, 6);
        this._addText(cx, fy + 12, '初回クリアボーナス', {
            fontSize: '14px', color: '#cc88ff', origin: [0.5, 0]
        });
        this._addText(cx, fy + 30, 'ステージ初クリア時にジェムが貰える（1回限り）', {
            fontSize: '11px', color: '#aaaaaa', origin: [0.5, 0]
        });

        this._addText(cx, GAME_HEIGHT - 55, '高評価を目指して繰り返し挑戦しよう！', {
            fontSize: '13px', color: '#cccccc', origin: [0.5, 0]
        });
    }
}
