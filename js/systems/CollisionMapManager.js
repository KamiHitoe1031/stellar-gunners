class CollisionMapManager {
    constructor(scene) {
        this.scene = scene;
        this.grid = null;
        this.staticGroup = null;
        this.wallBodies = [];
        this.debugGraphics = null;
    }

    loadGrid(collisionData, areaIndex) {
        if (!collisionData || !collisionData.areas) return false;
        const areaData = collisionData.areas[areaIndex];
        if (!areaData || !areaData.grid) return false;
        this.grid = areaData.grid;
        return true;
    }

    createColliders() {
        this.clearAll();
        if (!this.grid) return;

        this.staticGroup = this.scene.physics.add.staticGroup();
        const merged = this.mergeWallRects(this.grid);

        merged.forEach(rect => {
            const x = rect.col * COLLISION_CELL_WIDTH + (rect.w * COLLISION_CELL_WIDTH) / 2;
            const y = rect.row * COLLISION_CELL_HEIGHT + (rect.h * COLLISION_CELL_HEIGHT) / 2;
            const w = rect.w * COLLISION_CELL_WIDTH;
            const h = rect.h * COLLISION_CELL_HEIGHT;

            // Invisible wall (visual comes from background image)
            const wall = this.scene.add.rectangle(x, y, w, h, 0x000000, 0);
            this.scene.physics.add.existing(wall, true);
            wall.body.setSize(w, h);
            this.staticGroup.add(wall);
            this.wallBodies.push(wall);
        });
    }

    mergeWallRects(grid) {
        const visited = Array.from({ length: COLLISION_GRID_ROWS }, () =>
            Array(COLLISION_GRID_COLS).fill(false)
        );
        const rects = [];

        for (let r = 0; r < COLLISION_GRID_ROWS; r++) {
            for (let c = 0; c < COLLISION_GRID_COLS; c++) {
                if (grid[r][c] === CELL_WALL && !visited[r][c]) {
                    // Expand right
                    let w = 0;
                    while (c + w < COLLISION_GRID_COLS &&
                           grid[r][c + w] === CELL_WALL &&
                           !visited[r][c + w]) {
                        w++;
                    }
                    // Expand down with same width
                    let h = 1;
                    let canExpand = true;
                    while (r + h < COLLISION_GRID_ROWS && canExpand) {
                        for (let cc = c; cc < c + w; cc++) {
                            if (grid[r + h][cc] !== CELL_WALL || visited[r + h][cc]) {
                                canExpand = false;
                                break;
                            }
                        }
                        if (canExpand) h++;
                    }
                    // Mark visited
                    for (let rr = r; rr < r + h; rr++) {
                        for (let cc = c; cc < c + w; cc++) {
                            visited[rr][cc] = true;
                        }
                    }
                    rects.push({ row: r, col: c, w, h });
                }
            }
        }
        return rects;
    }

    isWalkable(worldX, worldY) {
        if (!this.grid) return true;
        const col = Math.floor(worldX / COLLISION_CELL_WIDTH);
        const row = Math.floor(worldY / COLLISION_CELL_HEIGHT);
        if (row < 0 || row >= COLLISION_GRID_ROWS || col < 0 || col >= COLLISION_GRID_COLS) {
            return false;
        }
        return this.grid[row][col] === CELL_WALKABLE;
    }

    getWalkableSpawnPoint(edge) {
        if (!this.grid) return null;

        let cells;
        switch (edge) {
            case 'top':
                cells = [];
                for (let c = 0; c < COLLISION_GRID_COLS; c++) {
                    if (this.grid[0][c] === CELL_WALKABLE) cells.push({ r: 0, c });
                }
                break;
            case 'bottom':
                cells = [];
                for (let c = 0; c < COLLISION_GRID_COLS; c++) {
                    if (this.grid[COLLISION_GRID_ROWS - 1][c] === CELL_WALKABLE) cells.push({ r: COLLISION_GRID_ROWS - 1, c });
                }
                break;
            case 'left':
                cells = [];
                for (let r = 0; r < COLLISION_GRID_ROWS; r++) {
                    if (this.grid[r][0] === CELL_WALKABLE) cells.push({ r, c: 0 });
                }
                break;
            case 'right':
                cells = [];
                for (let r = 0; r < COLLISION_GRID_ROWS; r++) {
                    if (this.grid[r][COLLISION_GRID_COLS - 1] === CELL_WALKABLE) cells.push({ r, c: COLLISION_GRID_COLS - 1 });
                }
                break;
            default:
                return null;
        }

        if (cells.length === 0) return null;

        const cell = cells[Math.floor(Math.random() * cells.length)];
        return {
            x: cell.c * COLLISION_CELL_WIDTH + COLLISION_CELL_WIDTH / 2,
            y: cell.r * COLLISION_CELL_HEIGHT + COLLISION_CELL_HEIGHT / 2
        };
    }

    getStaticGroup() {
        return this.staticGroup;
    }

    clearAll() {
        this.wallBodies.forEach(w => {
            if (w && w.destroy) w.destroy();
        });
        this.wallBodies = [];
        if (this.staticGroup) {
            this.staticGroup.clear(true, true);
            this.staticGroup = null;
        }
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = null;
        }
        this.grid = null;
    }

    drawDebug() {
        if (!this.grid) return;
        if (this.debugGraphics) this.debugGraphics.destroy();
        this.debugGraphics = this.scene.add.graphics().setDepth(200).setAlpha(0.3);

        for (let r = 0; r < COLLISION_GRID_ROWS; r++) {
            for (let c = 0; c < COLLISION_GRID_COLS; c++) {
                if (this.grid[r][c] === CELL_WALL) {
                    this.debugGraphics.fillStyle(0xff0000, 0.3);
                } else {
                    this.debugGraphics.fillStyle(0x00ff00, 0.1);
                }
                this.debugGraphics.fillRect(
                    c * COLLISION_CELL_WIDTH,
                    r * COLLISION_CELL_HEIGHT,
                    COLLISION_CELL_WIDTH,
                    COLLISION_CELL_HEIGHT
                );
            }
        }

        // Grid lines
        this.debugGraphics.lineStyle(1, 0xffffff, 0.15);
        for (let c = 0; c <= COLLISION_GRID_COLS; c++) {
            this.debugGraphics.lineBetween(c * COLLISION_CELL_WIDTH, 0, c * COLLISION_CELL_WIDTH, FIELD_HEIGHT);
        }
        for (let r = 0; r <= COLLISION_GRID_ROWS; r++) {
            this.debugGraphics.lineBetween(0, r * COLLISION_CELL_HEIGHT, FIELD_WIDTH, r * COLLISION_CELL_HEIGHT);
        }
    }
}
