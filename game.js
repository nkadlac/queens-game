/* ========================================
   QUEENS ULTIMATE - GAME LOGIC
   ======================================== */

// Game state
const state = {
    currentLevel: 0,
    puzzles: [],
    board: [],
    moveHistory: [],
    timer: 0,
    timerInterval: null,
    timerStarted: false,
    isPaused: true,
    gameStarted: false,
    hintsUsed: 0,
    hintCooldown: false,
    theme: 'light',
    isDragging: false,
    didDragMove: false,  // Track if mouse moved during drag
    // Hint tracking
    activeHint: null,  // { type, cells, highlightedElements }
    hintCooldownInterval: null
};

// DOM elements
const elements = {
    board: document.getElementById('board'),
    boardWrapper: document.getElementById('board-wrapper'),
    pauseOverlay: document.getElementById('pause-overlay'),
    pausePlayBtn: document.getElementById('pause-play-btn'),
    startGameBtn: document.getElementById('start-game-btn'),
    timer: document.getElementById('timer'),
    hintsUsed: document.getElementById('hints-used'),
    levelIndicator: document.getElementById('level-indicator'),
    todayDate: document.getElementById('today-date'),
    pauseBtn: document.getElementById('pause-btn'),
    undoBtn: document.getElementById('undo-btn'),
    resetBtn: document.getElementById('reset-btn'),
    hintBtn: document.getElementById('hint-btn'),
    hintCooldown: document.getElementById('hint-cooldown'),
    hintTooltip: document.getElementById('hint-tooltip'),
    hintReason: document.getElementById('hint-reason'),
    themeBtn: document.getElementById('theme-btn'),
    themeMenu: document.getElementById('theme-menu'),
    levelModal: document.getElementById('level-modal'),
    victoryModal: document.getElementById('victory-modal'),
    modalProgress: document.getElementById('modal-progress'),
    modalTime: document.getElementById('modal-time'),
    nextLevel: document.getElementById('next-level'),
    continueBtn: document.getElementById('continue-btn'),
    finalTime: document.getElementById('final-time'),
    hintsCount: document.getElementById('hints-count'),
    flawlessBadge: document.getElementById('flawless-badge'),
    shareBtn: document.getElementById('share-btn'),
    playAgainBtn: document.getElementById('play-again-btn')
};

// Cell states
const CELL_EMPTY = 0;
const CELL_QUEEN = 1;
const CELL_MARKER = 2;

/* ========================================
   INITIALIZATION
   ======================================== */

function init() {
    // Load saved theme
    const savedTheme = localStorage.getItem('queensTheme') || 'light';
    setTheme(savedTheme);

    // Set today's date
    const today = new Date();
    elements.todayDate.textContent = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    // Get puzzles for today
    state.puzzles = getPuzzlesForDate(today);

    // Load first level
    loadLevel(0);

    // Set up event listeners
    setupEventListeners();

    // Show overlay with start button (game starts paused)
    elements.pauseOverlay.classList.add('visible');
}

function setupEventListeners() {
    // Control buttons
    elements.pauseBtn.addEventListener('click', togglePause);
    elements.pausePlayBtn.addEventListener('click', resumeGame);
    elements.startGameBtn.addEventListener('click', startGame);
    elements.undoBtn.addEventListener('click', undo);
    elements.resetBtn.addEventListener('click', resetLevel);
    elements.hintBtn.addEventListener('click', showHint);

    // Theme
    elements.themeBtn.addEventListener('click', toggleThemeMenu);
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
            elements.themeMenu.classList.add('hidden');
        });
    });

    // Close theme menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.themeBtn.contains(e.target) && !elements.themeMenu.contains(e.target)) {
            elements.themeMenu.classList.add('hidden');
        }
    });

    // Auto-pause when tab loses focus
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && !state.isPaused && state.gameStarted) {
            pauseGame();
        }
    });

    // Modal buttons
    elements.continueBtn.addEventListener('click', () => {
        elements.levelModal.classList.add('hidden');
        loadLevel(state.currentLevel + 1);
    });

    elements.shareBtn.addEventListener('click', shareResults);
    elements.playAgainBtn.addEventListener('click', () => {
        elements.victoryModal.classList.add('hidden');
    });
}

/* ========================================
   LEVEL MANAGEMENT
   ======================================== */

function loadLevel(levelIndex) {
    state.currentLevel = levelIndex;
    const puzzle = state.puzzles[levelIndex];

    // Clear any active hint from previous level
    clearActiveHint();
    if (state.hintCooldownInterval) {
        clearInterval(state.hintCooldownInterval);
        state.hintCooldownInterval = null;
        state.hintCooldown = false;
        elements.hintBtn.disabled = false;
        elements.hintCooldown.classList.add('hidden');
    }

    // Initialize board state
    state.board = Array(puzzle.size).fill(null).map(() =>
        Array(puzzle.size).fill(CELL_EMPTY)
    );
    state.moveHistory = [];

    // Update UI
    elements.levelIndicator.textContent = `Level ${levelIndex + 1} of 3`;

    // Render the board
    renderBoard(puzzle);
}

function renderBoard(puzzle) {
    elements.board.innerHTML = '';
    elements.board.style.gridTemplateColumns = `repeat(${puzzle.size}, 1fr)`;

    // Set grid size CSS variable for pause overlay grid lines
    elements.boardWrapper.style.setProperty('--grid-size', puzzle.size);

    for (let row = 0; row < puzzle.size; row++) {
        for (let col = 0; col < puzzle.size; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.region = puzzle.regions[row][col];

            // Add region boundary borders
            const currentRegion = puzzle.regions[row][col];

            // Check top neighbor (or edge)
            if (row === 0 || puzzle.regions[row - 1][col] !== currentRegion) {
                cell.classList.add('border-top');
            }
            // Check right neighbor (or edge)
            if (col === puzzle.size - 1 || puzzle.regions[row][col + 1] !== currentRegion) {
                cell.classList.add('border-right');
            }
            // Check bottom neighbor (or edge)
            if (row === puzzle.size - 1 || puzzle.regions[row + 1][col] !== currentRegion) {
                cell.classList.add('border-bottom');
            }
            // Check left neighbor (or edge)
            if (col === 0 || puzzle.regions[row][col - 1] !== currentRegion) {
                cell.classList.add('border-left');
            }

            // Add corner classes for border-radius
            if (row === 0 && col === 0) cell.classList.add('corner-top-left');
            if (row === 0 && col === puzzle.size - 1) cell.classList.add('corner-top-right');
            if (row === puzzle.size - 1 && col === 0) cell.classList.add('corner-bottom-left');
            if (row === puzzle.size - 1 && col === puzzle.size - 1) cell.classList.add('corner-bottom-right');

            // Click to cycle states
            cell.addEventListener('click', () => handleCellClick(row, col));

            // Drag to mark cells
            cell.addEventListener('mousedown', (e) => handleDragStart(row, col, e));
            cell.addEventListener('mouseenter', () => handleDragOver(row, col));
            cell.addEventListener('touchstart', (e) => handleTouchStart(row, col, e));
            cell.addEventListener('touchmove', (e) => handleTouchMove(e));

            elements.board.appendChild(cell);
        }
    }

    // Global mouse up to end dragging
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
}

/* ========================================
   DRAG TO MARK
   ======================================== */

function handleDragStart(row, col, e) {
    if (state.isPaused) return;

    // Only start drag on empty cells
    if (state.board[row][col] === CELL_EMPTY) {
        e.preventDefault(); // Prevent text selection
        state.isDragging = true;
        state.didDragMove = false;
        state.dragStartCell = { row, col };
    }
}

function handleDragOver(row, col) {
    if (!state.isDragging || state.isPaused) return;

    // Check if we moved to a different cell
    if (state.dragStartCell && (row !== state.dragStartCell.row || col !== state.dragStartCell.col)) {
        // First move - mark the start cell too
        if (!state.didDragMove && state.board[state.dragStartCell.row][state.dragStartCell.col] === CELL_EMPTY) {
            markCell(state.dragStartCell.row, state.dragStartCell.col);
        }
        state.didDragMove = true;
    }

    // Only mark empty cells while dragging
    if (state.didDragMove && state.board[row][col] === CELL_EMPTY) {
        markCell(row, col);
    }
}

function handleDragEnd() {
    state.isDragging = false;
}

function handleTouchStart(row, col, e) {
    if (state.isPaused) return;

    if (state.board[row][col] === CELL_EMPTY) {
        state.isDragging = true;
        state.didDragMove = false;
        state.dragStartCell = { row, col };
    }
}

function handleTouchMove(e) {
    if (!state.isDragging || state.isPaused) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element && element.classList.contains('cell')) {
        const row = parseInt(element.dataset.row);
        const col = parseInt(element.dataset.col);

        // Check if we moved to a different cell
        if (state.dragStartCell && (row !== state.dragStartCell.row || col !== state.dragStartCell.col)) {
            // First move - mark the start cell too
            if (!state.didDragMove && state.board[state.dragStartCell.row][state.dragStartCell.col] === CELL_EMPTY) {
                markCell(state.dragStartCell.row, state.dragStartCell.col);
            }
            state.didDragMove = true;
        }

        if (state.didDragMove && state.board[row][col] === CELL_EMPTY) {
            markCell(row, col);
        }
    }
}

function markCell(row, col) {
    // Save to history for undo
    state.moveHistory.push({ row, col, prevState: CELL_EMPTY });

    // Mark the cell
    state.board[row][col] = CELL_MARKER;
    updateCellDisplay(row, col);

    // Check if hint was completed
    checkHintCompletion();
}

/* ========================================
   GAME LOGIC
   ======================================== */

function handleCellClick(row, col) {
    // Ignore click if we were dragging (moved to other cells)
    if (state.didDragMove) {
        state.didDragMove = false;
        return;
    }
    if (state.isPaused) return;

    // Get current cell state
    const currentState = state.board[row][col];

    // Cycle through states: empty -> marker -> queen -> empty
    // (Marker first encourages elimination before placement)
    let newState;
    if (currentState === CELL_EMPTY) {
        newState = CELL_MARKER;
    } else if (currentState === CELL_MARKER) {
        newState = CELL_QUEEN;
    } else {
        newState = CELL_EMPTY;
    }

    // Prepare history entry
    const historyEntry = {
        row,
        col,
        prevState: currentState,
        autoMarked: [],    // Cells that were auto-marked
        autoUnmarked: []   // Cells that were auto-unmarked
    };

    // Update state
    state.board[row][col] = newState;

    // Update cell display
    updateCellDisplay(row, col);

    // Clear any previous conflict highlights
    clearConflicts();

    // Check for conflicts
    if (newState === CELL_QUEEN) {
        const conflicts = checkConflicts(row, col);
        if (conflicts.length > 0) {
            highlightConflicts([{ row, col }, ...conflicts]);
        }
    }

    // Auto-mark cells attacked by newly placed queen
    if (newState === CELL_QUEEN) {
        historyEntry.autoMarked = autoMarkAttackedCells(row, col);
    }

    // Auto-remove marks when queen is removed (if not attacked by other queens)
    if (currentState === CELL_QUEEN && newState !== CELL_QUEEN) {
        historyEntry.autoUnmarked = autoRemoveMarks(row, col);
    }

    // Save to history for undo
    state.moveHistory.push(historyEntry);

    // Check if hint was completed
    checkHintCompletion();

    // Check for win
    if (checkWin()) {
        handleLevelComplete();
    }
}

function autoMarkAttackedCells(queenRow, queenCol) {
    const puzzle = state.puzzles[state.currentLevel];
    const size = puzzle.size;
    const queenRegion = puzzle.regions[queenRow][queenCol];
    const markedCells = [];

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            // Skip the queen's own cell
            if (r === queenRow && c === queenCol) continue;

            // Skip cells that already have content
            if (state.board[r][c] !== CELL_EMPTY) continue;

            // Check if this cell is attacked by the queen
            const sameRow = r === queenRow;
            const sameCol = c === queenCol;
            const sameRegion = puzzle.regions[r][c] === queenRegion;
            const isAdjacent = Math.abs(r - queenRow) <= 1 && Math.abs(c - queenCol) <= 1;

            if (sameRow || sameCol || sameRegion || isAdjacent) {
                // Mark this cell and track it
                markedCells.push({ row: r, col: c });
                state.board[r][c] = CELL_MARKER;
                updateCellDisplay(r, c);
            }
        }
    }

    return markedCells;
}

function autoRemoveMarks(removedQueenRow, removedQueenCol) {
    const puzzle = state.puzzles[state.currentLevel];
    const size = puzzle.size;
    const removedQueenRegion = puzzle.regions[removedQueenRow][removedQueenCol];
    const unmarkedCells = [];

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            // Only process markers
            if (state.board[r][c] !== CELL_MARKER) continue;

            // Check if this cell was attacked by the removed queen
            const sameRow = r === removedQueenRow;
            const sameCol = c === removedQueenCol;
            const sameRegion = puzzle.regions[r][c] === removedQueenRegion;
            const isAdjacent = Math.abs(r - removedQueenRow) <= 1 && Math.abs(c - removedQueenCol) <= 1;

            if (sameRow || sameCol || sameRegion || isAdjacent) {
                // Check if still attacked by any other queen
                if (!isAttackedByAnyQueen(r, c)) {
                    unmarkedCells.push({ row: r, col: c });
                    state.board[r][c] = CELL_EMPTY;
                    updateCellDisplay(r, c);
                }
            }
        }
    }

    return unmarkedCells;
}

function isAttackedByAnyQueen(row, col) {
    const puzzle = state.puzzles[state.currentLevel];
    const size = puzzle.size;
    const cellRegion = puzzle.regions[row][col];

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (state.board[r][c] !== CELL_QUEEN) continue;

            const sameRow = r === row;
            const sameCol = c === col;
            const sameRegion = puzzle.regions[r][c] === cellRegion;
            const isAdjacent = Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1;

            if (sameRow || sameCol || sameRegion || isAdjacent) {
                return true;
            }
        }
    }
    return false;
}

function updateCellDisplay(row, col) {
    const puzzle = state.puzzles[state.currentLevel];
    const cellIndex = row * puzzle.size + col;
    const cell = elements.board.children[cellIndex];
    const cellState = state.board[row][col];

    cell.classList.remove('queen', 'marker', 'hint');

    if (cellState === CELL_QUEEN) {
        cell.classList.add('queen');
    } else if (cellState === CELL_MARKER) {
        cell.classList.add('marker');
    }
}

function checkConflicts(row, col) {
    const conflicts = [];
    const puzzle = state.puzzles[state.currentLevel];
    const size = puzzle.size;
    const region = puzzle.regions[row][col];

    // Check row
    for (let c = 0; c < size; c++) {
        if (c !== col && state.board[row][c] === CELL_QUEEN) {
            conflicts.push({ row, col: c });
        }
    }

    // Check column
    for (let r = 0; r < size; r++) {
        if (r !== row && state.board[r][col] === CELL_QUEEN) {
            conflicts.push({ row: r, col });
        }
    }

    // Check region
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if ((r !== row || c !== col) &&
                puzzle.regions[r][c] === region &&
                state.board[r][c] === CELL_QUEEN) {
                conflicts.push({ row: r, col: c });
            }
        }
    }

    // Check adjacent cells (including diagonals)
    const adjacentOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of adjacentOffsets) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (state.board[nr][nc] === CELL_QUEEN) {
                conflicts.push({ row: nr, col: nc });
            }
        }
    }

    return conflicts;
}

function highlightConflicts(cells) {
    const puzzle = state.puzzles[state.currentLevel];
    cells.forEach(({ row, col }) => {
        const cellIndex = row * puzzle.size + col;
        const cell = elements.board.children[cellIndex];
        cell.classList.add('conflict');
    });
}

function clearConflicts() {
    document.querySelectorAll('.cell.conflict').forEach(cell => {
        cell.classList.remove('conflict');
    });
}

function checkWin() {
    const puzzle = state.puzzles[state.currentLevel];
    const size = puzzle.size;

    // Count queens
    let queenCount = 0;
    const queensInRows = new Set();
    const queensInCols = new Set();
    const queensInRegions = new Set();

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (state.board[r][c] === CELL_QUEEN) {
                queenCount++;
                queensInRows.add(r);
                queensInCols.add(c);
                queensInRegions.add(puzzle.regions[r][c]);

                // Check for adjacent queens
                const conflicts = checkConflicts(r, c);
                if (conflicts.length > 0) {
                    return false;
                }
            }
        }
    }

    // Must have exactly 'size' queens, one in each row, column, and region
    return queenCount === size &&
           queensInRows.size === size &&
           queensInCols.size === size &&
           queensInRegions.size === size;
}

function handleLevelComplete() {
    if (state.currentLevel < 2) {
        // Show level complete modal
        const completedLevel = state.currentLevel + 1;
        elements.modalProgress.textContent = `Level ${completedLevel} of 3 Complete!`;
        elements.modalTime.textContent = formatTime(state.timer);
        elements.nextLevel.textContent = state.currentLevel + 2;
        elements.levelModal.classList.remove('hidden');
    } else {
        // Game complete!
        stopTimer();
        showVictory();
    }
}

function showVictory() {
    elements.finalTime.textContent = formatTime(state.timer);

    if (state.hintsUsed === 0) {
        elements.flawlessBadge.classList.remove('hidden');
        elements.hintsCount.textContent = '';
    } else {
        elements.flawlessBadge.classList.add('hidden');
        elements.hintsCount.textContent = `Hints used: ${state.hintsUsed}`;
    }

    elements.victoryModal.classList.remove('hidden');
}

/* ========================================
   TIMER
   ======================================== */

function startTimer() {
    state.timerStarted = true;
    state.timerInterval = setInterval(() => {
        if (!state.isPaused) {
            state.timer++;
            elements.timer.textContent = formatTime(state.timer);
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/* ========================================
   CONTROLS
   ======================================== */

function startGame() {
    state.gameStarted = true;
    state.isPaused = false;

    // Hide start button, keep play button hidden for now
    elements.startGameBtn.classList.add('hidden');
    elements.pauseOverlay.classList.remove('visible');

    // Start the timer
    startTimer();

    // Update pause button state
    const iconPause = elements.pauseBtn.querySelector('.icon-pause');
    const iconPlay = elements.pauseBtn.querySelector('.icon-play');
    const label = elements.pauseBtn.querySelector('span');

    iconPause.classList.remove('hidden');
    iconPlay.classList.add('hidden');
    label.textContent = 'Pause';
}

function togglePause() {
    if (!state.gameStarted) return; // Can't toggle pause before game starts

    if (state.isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function pauseGame() {
    if (state.isPaused) return; // Already paused
    state.isPaused = true;

    const iconPause = elements.pauseBtn.querySelector('.icon-pause');
    const iconPlay = elements.pauseBtn.querySelector('.icon-play');
    const label = elements.pauseBtn.querySelector('span');

    // Show play button (not start button) when pausing during game
    elements.startGameBtn.classList.add('hidden');
    elements.pausePlayBtn.classList.remove('hidden');
    elements.pauseOverlay.classList.add('visible');
    iconPause.classList.add('hidden');
    iconPlay.classList.remove('hidden');
    label.textContent = 'Resume';
}

function resumeGame() {
    if (!state.isPaused) return; // Already running
    state.isPaused = false;

    const iconPause = elements.pauseBtn.querySelector('.icon-pause');
    const iconPlay = elements.pauseBtn.querySelector('.icon-play');
    const label = elements.pauseBtn.querySelector('span');

    // Hide play button when resuming
    elements.pausePlayBtn.classList.add('hidden');
    elements.pauseOverlay.classList.remove('visible');
    iconPause.classList.remove('hidden');
    iconPlay.classList.add('hidden');
    label.textContent = 'Pause';
}

function undo() {
    if (state.moveHistory.length === 0 || state.isPaused) return;

    const lastMove = state.moveHistory.pop();

    // Restore the main cell
    state.board[lastMove.row][lastMove.col] = lastMove.prevState;
    updateCellDisplay(lastMove.row, lastMove.col);

    // Restore auto-marked cells (set them back to empty)
    if (lastMove.autoMarked) {
        for (const cell of lastMove.autoMarked) {
            state.board[cell.row][cell.col] = CELL_EMPTY;
            updateCellDisplay(cell.row, cell.col);
        }
    }

    // Restore auto-unmarked cells (set them back to marker)
    if (lastMove.autoUnmarked) {
        for (const cell of lastMove.autoUnmarked) {
            state.board[cell.row][cell.col] = CELL_MARKER;
            updateCellDisplay(cell.row, cell.col);
        }
    }

    clearConflicts();
}

function resetLevel() {
    if (state.isPaused) return;

    const puzzle = state.puzzles[state.currentLevel];

    // Clear the board
    for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
            state.board[r][c] = CELL_EMPTY;
            updateCellDisplay(r, c);
        }
    }

    state.moveHistory = [];
    clearConflicts();
    clearActiveHint();
    // Note: Timer keeps running as per requirements
}

function showHint() {
    if (state.hintCooldown || state.isPaused) return;

    const puzzle = state.puzzles[state.currentLevel];
    const size = puzzle.size;

    // Find a valid cell for the next queen
    const hint = findBestHint(puzzle, size);

    if (hint) {
        // Clear any existing hint first
        clearActiveHint();

        const highlightedElements = [];

        if (hint.type === 'eliminate') {
            // Elimination hint - highlight multiple cells with striped pattern
            for (const cellData of hint.cells) {
                const cellIndex = cellData.row * size + cellData.col;
                const cell = elements.board.children[cellIndex];
                cell.classList.add('hint-eliminate');
                highlightedElements.push(cell);
            }

            // Position tooltip near the first cell
            if (hint.reason && hint.cells.length > 0) {
                elements.hintReason.textContent = hint.reason;
                const firstCell = elements.board.children[hint.cells[0].row * size + hint.cells[0].col];
                positionHintTooltip(firstCell, hint.cells[0].row, hint.cells[0].col, size);
            }

            // Store active hint for tracking
            state.activeHint = {
                type: 'eliminate',
                cells: hint.cells.map(c => ({ row: c.row, col: c.col })),
                highlightedElements
            };
        } else {
            // Queen placement hint - highlight single cell
            const cellIndex = hint.row * size + hint.col;
            const cell = elements.board.children[cellIndex];
            cell.classList.add('hint');
            highlightedElements.push(cell);

            // Show the reason tooltip with smart positioning
            if (hint.reason) {
                elements.hintReason.textContent = hint.reason;
                positionHintTooltip(cell, hint.row, hint.col, size);
            }

            // Store active hint for tracking
            state.activeHint = {
                type: 'queen',
                cells: [{ row: hint.row, col: hint.col }],
                highlightedElements
            };
        }

        // Track hint usage
        state.hintsUsed++;
        elements.hintsUsed.textContent = state.hintsUsed;

        // Start cooldown (hint stays visible until cooldown ends or player completes it)
        startHintCooldown();
    }
}

function clearActiveHint() {
    if (state.activeHint) {
        for (const cell of state.activeHint.highlightedElements) {
            cell.classList.remove('hint', 'hint-eliminate');
        }
        elements.hintTooltip.classList.remove('visible');
        state.activeHint = null;
    }
}

function checkHintCompletion() {
    if (!state.activeHint) return;

    const hint = state.activeHint;
    let completed = false;

    if (hint.type === 'eliminate') {
        // Check if all hinted cells are now marked with X
        completed = hint.cells.every(c => state.board[c.row][c.col] === CELL_MARKER);
    } else {
        // Check if the hinted cell has a queen
        completed = hint.cells.every(c => state.board[c.row][c.col] === CELL_QUEEN);
    }

    if (completed) {
        clearActiveHint();
    }
}

function positionHintTooltip(cell, row, col, size) {
    const tooltip = elements.hintTooltip;
    const board = elements.board;

    // Remove old position classes
    tooltip.classList.remove('pos-top', 'pos-bottom', 'pos-left', 'pos-right', 'hidden');

    // Get cell position relative to board wrapper
    const cellRect = cell.getBoundingClientRect();
    const wrapperRect = elements.boardWrapper.getBoundingClientRect();

    // Calculate cell center relative to wrapper
    const cellCenterX = cellRect.left - wrapperRect.left + cellRect.width / 2;
    const cellCenterY = cellRect.top - wrapperRect.top + cellRect.height / 2;

    // Determine available space in each direction
    const spaceTop = row;
    const spaceBottom = size - 1 - row;
    const spaceLeft = col;
    const spaceRight = size - 1 - col;

    // Choose best position: prefer bottom/top, then left/right
    let position;
    if (spaceBottom >= spaceTop && spaceBottom >= 1) {
        position = 'bottom';
    } else if (spaceTop >= 1) {
        position = 'top';
    } else if (spaceRight >= spaceLeft) {
        position = 'right';
    } else {
        position = 'left';
    }

    tooltip.classList.add(`pos-${position}`);

    // Make visible to measure dimensions
    tooltip.style.visibility = 'hidden';
    tooltip.classList.add('visible');

    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;

    // Calculate position
    let left, top;
    const gap = 12; // Gap between cell and tooltip

    switch (position) {
        case 'bottom':
            left = cellCenterX - tooltipWidth / 2;
            top = cellRect.bottom - wrapperRect.top + gap;
            break;
        case 'top':
            left = cellCenterX - tooltipWidth / 2;
            top = cellRect.top - wrapperRect.top - tooltipHeight - gap;
            break;
        case 'right':
            left = cellRect.right - wrapperRect.left + gap;
            top = cellCenterY - tooltipHeight / 2;
            break;
        case 'left':
            left = cellRect.left - wrapperRect.left - tooltipWidth - gap;
            top = cellCenterY - tooltipHeight / 2;
            break;
    }

    // Store original ideal position before clamping
    const idealLeft = left;
    const idealTop = top;

    // Clamp to stay within board wrapper bounds (with some padding)
    const padding = 4;
    const maxLeft = wrapperRect.width - tooltipWidth - padding;
    const maxTop = wrapperRect.height - tooltipHeight - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    // Calculate arrow offset to point at cell center
    let arrowOffset;
    if (position === 'bottom' || position === 'top') {
        // Arrow is horizontal, calculate offset from left edge of tooltip
        const cellCenterInTooltip = cellCenterX - left;
        // Clamp arrow to stay within tooltip bounds (with margin for arrow size)
        arrowOffset = Math.max(16, Math.min(cellCenterInTooltip, tooltipWidth - 16));
        tooltip.style.setProperty('--arrow-offset', `${arrowOffset}px`);
    } else {
        // Arrow is vertical, calculate offset from top edge of tooltip
        const cellCenterInTooltip = cellCenterY - top;
        // Clamp arrow to stay within tooltip bounds
        arrowOffset = Math.max(16, Math.min(cellCenterInTooltip, tooltipHeight - 16));
        tooltip.style.setProperty('--arrow-offset', `${arrowOffset}px`);
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = 'visible';
}

function findBestHint(puzzle, size) {
    // Find rows, columns, and regions that don't have queens yet
    const rowsWithQueens = new Set();
    const colsWithQueens = new Set();
    const regionsWithQueens = new Set();

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (state.board[r][c] === CELL_QUEEN) {
                rowsWithQueens.add(r);
                colsWithQueens.add(c);
                regionsWithQueens.add(puzzle.regions[r][c]);
            }
        }
    }

    // Helper to check if two cells are adjacent
    function areAdjacent(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
    }

    // Helper to check if a cell is valid for a queen (basic constraints only)
    function isBasicValidCell(r, c) {
        if (rowsWithQueens.has(r)) return false;
        if (colsWithQueens.has(c)) return false;
        if (regionsWithQueens.has(puzzle.regions[r][c])) return false;
        if (state.board[r][c] === CELL_QUEEN) return false;

        // Check adjacency to existing queens
        const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const [dr, dc] of offsets) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (state.board[nr][nc] === CELL_QUEEN) {
                    return false;
                }
            }
        }
        return true;
    }

    // Get all basically valid cells
    let validCells = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (isBasicValidCell(r, c)) {
                validCells.push({ row: r, col: c, region: puzzle.regions[r][c] });
            }
        }
    }

    if (validCells.length === 0) return null;

    // Group valid cells by region (needed for adjacency elimination)
    function groupByRegion(cells) {
        const grouped = {};
        for (const cell of cells) {
            if (!grouped[cell.region]) grouped[cell.region] = [];
            grouped[cell.region].push(cell);
        }
        return grouped;
    }

    // ADVANCED DEDUCTION 1: Region claims row/column
    // If ALL valid cells of a region are in the same row/column, that region "claims" it
    // Other cells in that row/column can be eliminated
    let regionCells = groupByRegion(validCells);
    const eliminatedCells = new Set();
    const eliminationReasons = new Map();
    const eliminationGroups = []; // Track groups of cells to eliminate together

    // Check for regions that claim a row or column
    for (const regionStr in regionCells) {
        const region = parseInt(regionStr);
        if (regionsWithQueens.has(region)) continue;

        const cells = regionCells[region];
        if (cells.length === 0) continue;

        // Check if all cells are in the same row
        const allSameRow = cells.every(c => c.row === cells[0].row);
        if (allSameRow) {
            const claimedRow = cells[0].row;
            const cellsToEliminate = [];
            // Eliminate other cells in this row that aren't in this region
            for (const cell of validCells) {
                if (cell.row === claimedRow && cell.region !== region) {
                    const cellKey = `${cell.row},${cell.col}`;
                    eliminatedCells.add(cellKey);
                    cellsToEliminate.push(cell);
                    eliminationReasons.set(cellKey, {
                        type: 'row-claim',
                        claimingRegion: region,
                        claimedRow: claimedRow
                    });
                }
            }
            if (cellsToEliminate.length > 0) {
                eliminationGroups.push({
                    type: 'row-claim',
                    cells: cellsToEliminate,
                    reason: `This region claims this row - mark other cells with X`
                });
            }
        }

        // Check if all cells are in the same column
        const allSameCol = cells.every(c => c.col === cells[0].col);
        if (allSameCol) {
            const claimedCol = cells[0].col;
            const cellsToEliminate = [];
            // Eliminate other cells in this column that aren't in this region
            for (const cell of validCells) {
                if (cell.col === claimedCol && cell.region !== region) {
                    const cellKey = `${cell.row},${cell.col}`;
                    eliminatedCells.add(cellKey);
                    cellsToEliminate.push(cell);
                    eliminationReasons.set(cellKey, {
                        type: 'col-claim',
                        claimingRegion: region,
                        claimedCol: claimedCol
                    });
                }
            }
            if (cellsToEliminate.length > 0) {
                eliminationGroups.push({
                    type: 'col-claim',
                    cells: cellsToEliminate,
                    reason: `This region claims this column - mark other cells with X`
                });
            }
        }
    }

    // ADVANCED DEDUCTION 2: Adjacency elimination
    // If ALL valid cells of region R are adjacent to cell C, then C cannot have a queen
    // (because wherever R's queen goes, it will block C)
    for (const cell of validCells) {
        const cellKey = `${cell.row},${cell.col}`;
        if (eliminatedCells.has(cellKey)) continue; // Already eliminated

        // Check each other region
        for (const regionStr in regionCells) {
            const region = parseInt(regionStr);
            if (region === cell.region) continue; // Skip own region
            if (regionsWithQueens.has(region)) continue; // Skip regions with queens

            const regionValidCells = regionCells[region];
            if (regionValidCells.length === 0) continue;

            // Check if ALL cells in this region are adjacent to our cell
            const allAdjacent = regionValidCells.every(rc =>
                areAdjacent(cell.row, cell.col, rc.row, rc.col)
            );

            if (allAdjacent) {
                eliminatedCells.add(cellKey);
                eliminationReasons.set(cellKey, {
                    type: 'adjacency',
                    blockingRegion: region,
                    blockingCells: regionValidCells
                });
                eliminationGroups.push({
                    type: 'adjacency',
                    cells: [cell],
                    reason: `Adjacent to all options in another region - mark with X`
                });
                break; // Found a reason to eliminate, no need to check more regions
            }
        }
    }

    // Filter out eliminated cells
    const refinedValidCells = validCells.filter(c => !eliminatedCells.has(`${c.row},${c.col}`));

    // FIRST: Check if elimination narrowed down a region/row/col to 1 option
    // This is more helpful than just showing elimination hints
    if (eliminatedCells.size > 0 && refinedValidCells.length > 0) {
        const refinedRegionCells = groupByRegion(refinedValidCells);

        // Check if any region now has only 1 option
        for (const regionStr in refinedRegionCells) {
            const region = parseInt(regionStr);
            if (!regionsWithQueens.has(region) && refinedRegionCells[region].length === 1) {
                const cell = refinedRegionCells[region][0];
                // Find what was eliminated to explain why
                const eliminatedInRegion = validCells.filter(c =>
                    c.region === region && eliminatedCells.has(`${c.row},${c.col}`)
                );
                if (eliminatedInRegion.length > 0) {
                    const reason = eliminationReasons.get(`${eliminatedInRegion[0].row},${eliminatedInRegion[0].col}`);
                    if (reason.type === 'row-claim') {
                        return {
                            type: 'queen',
                            row: cell.row,
                            col: cell.col,
                            reason: "Another region claims this row"
                        };
                    } else if (reason.type === 'col-claim') {
                        return {
                            type: 'queen',
                            row: cell.row,
                            col: cell.col,
                            reason: "Another region claims this column"
                        };
                    } else {
                        return {
                            type: 'queen',
                            row: cell.row,
                            col: cell.col,
                            reason: "Other spots blocked by adjacent region"
                        };
                    }
                }
            }
        }

        // Also check rows and columns for forced moves after elimination
        const refinedRowCells = {};
        const refinedColCells = {};
        for (const cell of refinedValidCells) {
            if (!refinedRowCells[cell.row]) refinedRowCells[cell.row] = [];
            refinedRowCells[cell.row].push(cell);
            if (!refinedColCells[cell.col]) refinedColCells[cell.col] = [];
            refinedColCells[cell.col].push(cell);
        }

        for (const rowStr in refinedRowCells) {
            const row = parseInt(rowStr);
            if (!rowsWithQueens.has(row) && refinedRowCells[row].length === 1) {
                const cell = refinedRowCells[row][0];
                return {
                    type: 'queen',
                    row: cell.row,
                    col: cell.col,
                    reason: "Only valid spot left in this row after elimination"
                };
            }
        }

        for (const colStr in refinedColCells) {
            const col = parseInt(colStr);
            if (!colsWithQueens.has(col) && refinedColCells[col].length === 1) {
                const cell = refinedColCells[col][0];
                return {
                    type: 'queen',
                    row: cell.row,
                    col: cell.col,
                    reason: "Only valid spot left in this column after elimination"
                };
            }
        }
    }

    // SECOND: If we found cells to eliminate but no forced move, show elimination hint
    if (eliminationGroups.length > 0) {
        const group = eliminationGroups[0];
        return {
            type: 'eliminate',
            cells: group.cells,
            reason: group.reason
        };
    }

    // Use refined cells for further analysis
    validCells = refinedValidCells.length > 0 ? refinedValidCells : validCells;

    // Group valid cells by region, row, and column
    regionCells = {};
    const rowCells = {};
    const colCells = {};

    for (const cell of validCells) {
        if (!regionCells[cell.region]) regionCells[cell.region] = [];
        regionCells[cell.region].push(cell);

        if (!rowCells[cell.row]) rowCells[cell.row] = [];
        rowCells[cell.row].push(cell);

        if (!colCells[cell.col]) colCells[cell.col] = [];
        colCells[cell.col].push(cell);
    }

    // PRIORITY 1: Only valid cell in a region
    for (const region in regionCells) {
        if (!regionsWithQueens.has(parseInt(region)) && regionCells[region].length === 1) {
            const cell = regionCells[region][0];
            return {
                type: 'queen',
                row: cell.row,
                col: cell.col,
                reason: "Only valid spot in this color region"
            };
        }
    }

    // PRIORITY 2: Only valid cell in a row
    for (const row in rowCells) {
        if (!rowsWithQueens.has(parseInt(row)) && rowCells[row].length === 1) {
            const cell = rowCells[row][0];
            return {
                type: 'queen',
                row: cell.row,
                col: cell.col,
                reason: "Only valid spot in this row"
            };
        }
    }

    // PRIORITY 3: Only valid cell in a column
    for (const col in colCells) {
        if (!colsWithQueens.has(parseInt(col)) && colCells[col].length === 1) {
            const cell = colCells[col][0];
            return {
                type: 'queen',
                row: cell.row,
                col: cell.col,
                reason: "Only valid spot in this column"
            };
        }
    }

    // PRIORITY 4: Elimination logic - find cells where NOT placing a queen
    // would make it impossible to fill some row/column/region
    for (const cell of validCells) {
        // Simulate: if we mark this cell as X (not a queen), what happens?
        const remainingInRegion = regionCells[cell.region].filter(c => c !== cell);
        const remainingInRow = rowCells[cell.row].filter(c => c !== cell);
        const remainingInCol = colCells[cell.col].filter(c => c !== cell);

        // If removing this cell leaves NO options for its region, it must be a queen
        if (!regionsWithQueens.has(cell.region) && remainingInRegion.length === 0) {
            return {
                type: 'queen',
                row: cell.row,
                col: cell.col,
                reason: "Must be here - no other spot works for this region"
            };
        }

        // Same for row
        if (!rowsWithQueens.has(cell.row) && remainingInRow.length === 0) {
            return {
                type: 'queen',
                row: cell.row,
                col: cell.col,
                reason: "Must be here - no other spot works for this row"
            };
        }

        // Same for column
        if (!colsWithQueens.has(cell.col) && remainingInCol.length === 0) {
            return {
                type: 'queen',
                row: cell.row,
                col: cell.col,
                reason: "Must be here - no other spot works for this column"
            };
        }
    }

    // PRIORITY 5: Look for cells that are forced by intersection of constraints
    // A cell is forced if it's the only one that satisfies multiple constraints
    for (const cell of validCells) {
        const rowAlts = rowCells[cell.row]?.length || 0;
        const colAlts = colCells[cell.col]?.length || 0;
        const regionAlts = regionCells[cell.region]?.length || 0;

        // Check if this cell is at intersection where row has 2, column has 2,
        // and they only overlap at this cell
        if (rowAlts === 2 && colAlts === 2) {
            const rowOther = rowCells[cell.row].find(c => c !== cell);
            const colOther = colCells[cell.col].find(c => c !== cell);
            // If the other row option and other column option are different cells,
            // and they conflict with each other, this cell is forced
            if (rowOther && colOther && rowOther !== colOther) {
                // Check if rowOther and colOther would conflict
                if (rowOther.col === colOther.col ||
                    rowOther.region === colOther.region ||
                    (Math.abs(rowOther.row - colOther.row) <= 1 &&
                     Math.abs(rowOther.col - colOther.col) <= 1)) {
                    return {
                        type: 'queen',
                        row: cell.row,
                        col: cell.col,
                        reason: "Row and column constraints intersect here"
                    };
                }
            }
        }
    }

    // PRIORITY 6: If no logical deduction found, suggest using X marks
    // Find the most constrained area to help narrow down
    let bestCell = null;
    let minOptions = Infinity;

    // Find the region/row/column with fewest options (but more than 1)
    for (const region in regionCells) {
        if (!regionsWithQueens.has(parseInt(region))) {
            const count = regionCells[region].length;
            if (count > 1 && count < minOptions) {
                minOptions = count;
                bestCell = regionCells[region][0];
            }
        }
    }

    if (bestCell && minOptions <= 3) {
        return {
            type: 'queen',
            row: bestCell.row,
            col: bestCell.col,
            reason: `Try marking X's to narrow down this region (${minOptions} options)`
        };
    }

    // Fallback: just pick a valid cell
    if (validCells.length > 0) {
        return {
            type: 'queen',
            row: validCells[0].row,
            col: validCells[0].col,
            reason: "Try placing a queen here and see what follows"
        };
    }

    return null;
}

function startHintCooldown() {
    state.hintCooldown = true;
    elements.hintBtn.disabled = true;
    let countdown = 10;

    elements.hintCooldown.textContent = countdown;
    elements.hintCooldown.classList.remove('hidden');

    // Clear any existing interval
    if (state.hintCooldownInterval) {
        clearInterval(state.hintCooldownInterval);
    }

    state.hintCooldownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            elements.hintCooldown.textContent = countdown;
        } else {
            clearInterval(state.hintCooldownInterval);
            state.hintCooldownInterval = null;
            state.hintCooldown = false;
            elements.hintBtn.disabled = false;
            elements.hintCooldown.classList.add('hidden');
            // Clear the hint when cooldown ends
            clearActiveHint();
        }
    }, 1000);
}

/* ========================================
   THEME
   ======================================== */

function toggleThemeMenu() {
    elements.themeMenu.classList.toggle('hidden');

    // Update active state
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === state.theme);
    });
}

function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('queensTheme', theme);

    // Update active state in menu
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

/* ========================================
   SHARE
   ======================================== */

function shareResults() {
    const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const flawless = state.hintsUsed === 0 ? ' FLAWLESS!' : '';
    const hintsText = state.hintsUsed > 0 ? `\nHints: ${state.hintsUsed}` : '';

    const text = `Queens Ultimate - ${today}
Time: ${formatTime(state.timer)}${hintsText}${flawless}

Play at queensultimate.com`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            elements.shareBtn.textContent = 'Copied!';
            setTimeout(() => {
                elements.shareBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    Share Results
                `;
            }, 2000);
        });
    }
}

/* ========================================
   START GAME
   ======================================== */

init();
