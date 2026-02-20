class CollisionMapManager {
    constructor(scene) {
        this.scene = scene;
        this.grid = null;
        this.staticGroup = null;
        this.wallBodies = [];
        this.debugGraphics = null;
        this.connectedCells = null; // Set of "r,c" strings connected to center
    }

    loadGrid(collisionData, areaIndex) {
        if (!collisionData || !collisionData.areas) return false;
        const areaData = collisionData.areas[areaIndex];
        if (!areaData || !areaData.grid) return false;
        this.grid = areaData.grid;

        // Fix isolated walkable cells: convert to walls
        this._fixIsolatedCells();

        return true;
    }

    /**
     * BFS flood-fill from center to find all connected walkable cells.
     * Any walkable cell NOT connected to center is converted to wall.
     */
    _fixIsolatedCells() {
        if (!this.grid) return;

        const centerR = Math.floor(COLLISION_GRID_ROWS / 2);
        const centerC = Math.floor(COLLISION_GRID_COLS / 2);

        // Find a walkable center cell (search outward from center if needed)
        let startR = centerR, startC = centerC;
        if (this.grid[startR][startC] !== CELL_WALKABLE) {
            let found = false;
            for (let radius = 1; radius < Math.max(COLLISION_GRID_ROWS, COLLISION_GRID_COLS) && !found; radius++) {
                for (let dr = -radius; dr <= radius && !found; dr++) {
                    for (let dc = -radius; dc <= radius && !found; dc++) {
                        const r = centerR + dr, c = centerC + dc;
                        if (r >= 0 && r < COLLISION_GRID_ROWS && c >= 0 && c < COLLISION_GRID_COLS) {
                            if (this.grid[r][c] === CELL_WALKABLE) {
                                startR = r; startC = c; found = true;
                            }
                        }
                    }
                }
            }
        }

        // BFS flood fill from center
        this.connectedCells = new Set();
        const queue = [[startR, startC]];
        const visited = new Set();
        visited.add(`${startR},${startC}`);

        while (queue.length > 0) {
            const [r, c] = queue.shift();
            if (this.grid[r][c] === CELL_WALKABLE) {
                this.connectedCells.add(`${r},${c}`);
            }
            for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const nr = r + dr, nc = c + dc;
                const key = `${nr},${nc}`;
                if (nr >= 0 && nr < COLLISION_GRID_ROWS && nc >= 0 && nc < COLLISION_GRID_COLS
                    && !visited.has(key) && this.grid[nr][nc] === CELL_WALKABLE) {
                    visited.add(key);
                    queue.push([nr, nc]);
                }
            }
        }

        // Convert isolated walkable cells to walls
        let fixedCount = 0;
        for (let r = 0; r < COLLISION_GRID_ROWS; r++) {
            for (let c = 0; c < COLLISION_GRID_COLS; c++) {
                if (this.grid[r][c] === CELL_WALKABLE && !this.connectedCells.has(`${r},${c}`)) {
                    this.grid[r][c] = CELL_WALL;
                    fixedCount++;
                }
            }
        }
        if (fixedCount > 0) {
            console.log(`CollisionMapManager: fixed ${fixedCount} isolated cells → walls`);
        }
    }

    createColliders() {
        // Clear previous colliders but keep grid
        this.wallBodies.forEach(w => { if (w && w.destroy) w.destroy(); });
        this.wallBodies = [];
        if (this.staticGroup) {
            this.staticGroup.clear(true, true);
            this.staticGroup = null;
        }
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

    /**
     * Returns a walkable spawn point on the given edge that is connected to center.
     * Tries all 4 edges if the requested one has no valid cells.
     */
    getWalkableSpawnPoint(preferredEdge) {
        if (!this.grid) return null;

        const edgeOrder = [preferredEdge];
        const allEdges = ['top', 'right', 'bottom', 'left'];
        for (const e of allEdges) {
            if (e !== preferredEdge) edgeOrder.push(e);
        }

        for (const edge of edgeOrder) {
            const cells = this._getConnectedEdgeCells(edge);
            if (cells.length > 0) {
                const cell = cells[Math.floor(Math.random() * cells.length)];
                return {
                    x: cell.c * COLLISION_CELL_WIDTH + COLLISION_CELL_WIDTH / 2,
                    y: cell.r * COLLISION_CELL_HEIGHT + COLLISION_CELL_HEIGHT / 2
                };
            }
        }

        // Last resort: return center
        return {
            x: FIELD_WIDTH / 2,
            y: FIELD_HEIGHT / 2
        };
    }

    _getConnectedEdgeCells(edge) {
        const cells = [];
        switch (edge) {
            case 'top':
                for (let c = 0; c < COLLISION_GRID_COLS; c++) {
                    if (this.grid[0][c] === CELL_WALKABLE && this.connectedCells.has(`0,${c}`)) {
                        cells.push({ r: 0, c });
                    }
                }
                break;
            case 'bottom':
                for (let c = 0; c < COLLISION_GRID_COLS; c++) {
                    if (this.grid[COLLISION_GRID_ROWS - 1][c] === CELL_WALKABLE && this.connectedCells.has(`${COLLISION_GRID_ROWS - 1},${c}`)) {
                        cells.push({ r: COLLISION_GRID_ROWS - 1, c });
                    }
                }
                break;
            case 'left':
                for (let r = 0; r < COLLISION_GRID_ROWS; r++) {
                    if (this.grid[r][0] === CELL_WALKABLE && this.connectedCells.has(`${r},0`)) {
                        cells.push({ r, c: 0 });
                    }
                }
                break;
            case 'right':
                for (let r = 0; r < COLLISION_GRID_ROWS; r++) {
                    if (this.grid[r][COLLISION_GRID_COLS - 1] === CELL_WALKABLE && this.connectedCells.has(`${r},${COLLISION_GRID_COLS - 1}`)) {
                        cells.push({ r, c: COLLISION_GRID_COLS - 1 });
                    }
                }
                break;
        }
        return cells;
    }

    /**
     * Find nearest walkable position connected to center, from given world coords.
     */
    getNearestWalkablePosition(worldX, worldY) {
        if (!this.grid || !this.connectedCells) return { x: worldX, y: worldY };

        const col = Math.max(0, Math.min(COLLISION_GRID_COLS - 1, Math.floor(worldX / COLLISION_CELL_WIDTH)));
        const row = Math.max(0, Math.min(COLLISION_GRID_ROWS - 1, Math.floor(worldY / COLLISION_CELL_HEIGHT)));

        if (this.connectedCells.has(`${row},${col}`)) {
            return { x: worldX, y: worldY }; // Already in good position
        }

        // BFS outward to find nearest connected cell
        let bestDist = Infinity;
        let bestR = row, bestC = col;
        for (const key of this.connectedCells) {
            const [r, c] = key.split(',').map(Number);
            const dist = Math.abs(r - row) + Math.abs(c - col);
            if (dist < bestDist) {
                bestDist = dist;
                bestR = r;
                bestC = c;
            }
        }

        return {
            x: bestC * COLLISION_CELL_WIDTH + COLLISION_CELL_WIDTH / 2,
            y: bestR * COLLISION_CELL_HEIGHT + COLLISION_CELL_HEIGHT / 2
        };
    }

    hasGrid() {
        return this.grid !== null;
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
        this.connectedCells = null;
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
