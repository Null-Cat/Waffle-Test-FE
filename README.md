# Waffle Test Submission Frontend

![Waffle Sudoku Logo](/public/waffle.png)

A Sudoku game built with React and TypeScript.

## 🎮 Key Features

### Game Modes

- **Daily Challenges**: Play the daily puzzle in Easy, Medium, or Hard difficulty
- **Random Puzzles**: Generate random Sudoku boards for unlimited play

### Gameplay Features

- **Timer**: Track your solving speed with an integrated timer
- **Hints System**: Use hints when you're stuck (limited quantity per game)
- **Smart Highlighting**:
  - Row, column, and box highlighting for better visibility
  - Error detection and highlighting for rule violations
  - Same-number highlighting across the board
- **Input Options**:
  - On-screen number pad
  - Full keyboard support
  - Arrow key navigation between cells

### Quality of Life

- **Undo Function**: Revert mistakes with the undo button or Ctrl+Z
- **Reset Board**: Start over without losing the current puzzle
- **Eraser Tool**: Quickly remove numbers from cells or Backspace

### UI/UX

- **Responsive Design**: Works on both desktop and mobile devices
- **Visual Feedback**: Animations for locked cells, hints, and errors
- **How to Play Guide**: Built-in instructions for new players

## 🎲 How to Play

1. Select a daily challenge difficulty or a random puzzle
2. Fill the 9×9 grid with numbers 1-9
3. Each row, column, and 3×3 box must contain all numbers 1-9 without repetition
4. Use hints if you get stuck
5. Complete the puzzle as quickly as possible!

## 💻 Technical Details

Built with:

- React 19
- TypeScript
- Vite

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The game connects to a backend API for puzzle generation, hint requests, and solution verification.
