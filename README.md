# Queens Ultimate

A constraint-satisfaction puzzle game inspired by LinkedIn Queens. Place queens on the board so that each row, column, and colored region contains exactly one queen, with no two queens touching—even diagonally.

## How to Play

1. **Goal**: Place one queen in each row, column, and colored region
2. **Rules**:
   - No two queens can be in the same row
   - No two queens can be in the same column
   - No two queens can be in the same colored region
   - No two queens can touch each other (including diagonally)

3. **Controls**:
   - **Single click**: Cycle through empty → X mark → Queen → empty
   - **Click and drag**: Mark multiple cells with X
   - **Hint button**: Get a logical hint with explanation

## Features

- **3 Difficulty Levels**: Progress through 6x6, 7x7, and 8x8 grids
- **Smart Hint System**: Educational hints that explain the logic behind each move
  - Identifies forced moves ("Only valid spot in this region")
  - Detects elimination patterns ("This region claims this column")
  - Highlights multiple cells when elimination is needed
- **Auto-marking**: Placing a queen automatically marks attacked cells with X
- **Drag-to-mark**: Click and drag to quickly mark multiple cells
- **Undo**: Revert moves including auto-marked cells
- **Daily Puzzles**: Deterministic puzzle selection based on date
- **Themes**: Light, Dark, and High Contrast modes
- **Timer & Stats**: Track your time, moves, and hints used

## Running Locally

Simply open `index.html` in a web browser. No build step or server required.

```bash
# Clone the repository
git clone git@github.com:nkadlac/queens-game.git

# Open in browser
open index.html
```

## File Structure

```
queens/
├── index.html    # Game structure and UI
├── styles.css    # Styling and themes
├── game.js       # Game logic and hint system
└── puzzles.js    # Puzzle data (verified unique solutions)
```

## Hint System Logic

The hint system uses several deduction techniques, prioritized by clarity:

1. **Only valid cell**: When a region, row, or column has exactly one valid spot
2. **Region claims row/column**: When all valid cells of a region are in the same row/column
3. **Adjacency elimination**: When all options for one region are adjacent to a cell
4. **Constraint intersection**: When multiple constraints force a specific cell

## License

MIT
