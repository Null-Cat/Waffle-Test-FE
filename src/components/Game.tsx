import { useEffect, useState } from "react";
import { EraserIcon, UndoIcon, ResetIcon } from "./SVGs";
import "./Game.css";

interface PlayerAction {
  cell: HTMLButtonElement;
  value: number | null;
}

const Game = () => {
  const testData = {
    newboard: {
      grids: [
        {
          value: [
            [8, 0, 0, 6, 2, 7, 5, 9, 3],
            [2, 5, 0, 4, 0, 9, 0, 0, 6],
            [0, 0, 7, 0, 0, 0, 4, 0, 0],
            [1, 0, 5, 3, 8, 6, 0, 4, 2],
            [6, 0, 2, 9, 0, 0, 1, 0, 8],
            [4, 0, 0, 0, 7, 2, 0, 0, 0],
            [5, 0, 4, 8, 0, 0, 0, 0, 0],
            [7, 1, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 6, 0, 0, 1, 8, 0, 0],
          ],
          solution: [
            [8, 4, 1, 6, 2, 7, 5, 9, 3],
            [2, 5, 3, 4, 1, 9, 7, 8, 6],
            [9, 6, 7, 5, 3, 8, 4, 2, 1],
            [1, 7, 5, 3, 8, 6, 9, 4, 2],
            [6, 3, 2, 9, 4, 5, 1, 7, 8],
            [4, 8, 9, 1, 7, 2, 3, 6, 5],
            [5, 9, 4, 8, 6, 3, 2, 1, 7],
            [7, 1, 8, 2, 5, 4, 6, 3, 9],
            [3, 2, 6, 7, 9, 1, 8, 5, 4],
          ],
          difficulty: "Medium",
        },
      ],
      results: 1,
      message: "All Ok",
    },
  };
  const [selectedCell, setSelectedCell] = useState<HTMLButtonElement | null>(
    null
  );
  const [actionHistory, setActionHistory] = useState<PlayerAction[]>([]);
  const [timer, setTimer] = useState(0);
  const [gameFinished, setGameFinished] = useState(true);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [timeFinished, setTimeFinished] = useState<Date | null>(null);

  const handleCellClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    selectInnerCell(e.currentTarget);
  };

  const handleUndoAction = () => {
    if (actionHistory.length > 0) {
      const lastAction = actionHistory[actionHistory.length - 1];
      const cell = lastAction.cell;
      const value = lastAction.value;

      if (cell && !cell.hasAttribute("data-locked")) {
        cell.innerText = value ? value.toString() : "";
        setActionHistory((prevHistory) => prevHistory.slice(0, -1));
        cell.removeAttribute("error");
        if (actionHistory[actionHistory.length - 2]) {
          selectInnerCell(actionHistory[actionHistory.length - 2].cell);
        } else {
          clearBoardHighlighting(true);
          setSelectedCell(null);
        }
      }
    }
  };

  const handleNumberInput = (number: number) => {
    if (selectedCell && !selectedCell.hasAttribute("data-locked")) {
      const previousValue = selectedCell.innerText
        ? parseInt(selectedCell.innerText)
        : null;

      if (previousValue !== number) {
        setActionHistory((prevHistory) => [
          ...prevHistory,
          { cell: selectedCell, value: previousValue },
        ]);
        selectedCell.innerText = number.toString();
      }
      selectInnerCell(selectedCell);
    }
  };

  const handleGameFinish = () => {
    setTimeFinished(new Date());
    setGameFinished(true);
  };

  const handleGameStart = () => {
    setTimeStarted(new Date());
    setTimeFinished(null);
    setGameFinished(false);
    setTimer(0);
    fillGrid(testData.newboard.grids[0].value);
  };

  const selectInnerCell = (innerCellToSelect: HTMLButtonElement) => {
    setSelectedCell(innerCellToSelect);

    const cells = document.querySelectorAll(".cell");
    // Remove Previous Highlighting
    if (selectedCell) {
      clearBoardHighlighting();
    }

    // Highlight the selected cell
    innerCellToSelect.setAttribute("selected", "");

    // Highlight the parent cell
    const parentCell = innerCellToSelect.parentElement?.parentElement;
    if (parentCell) {
      Array.from(parentCell.children).forEach((innerCell: Element) => {
        if (innerCell === innerCellToSelect.parentElement) return;
        innerCell.children[0].setAttribute("selected-related", "");
      });
    }

    // Highlight the row and column inner cells
    const parentCellIndex =
      parseInt(
        innerCellToSelect.parentElement?.parentElement?.getAttribute(
          "data-index"
        ) || "0"
      ) - 1;
    const innerCellIndex =
      parseInt(innerCellToSelect.getAttribute("data-index") || "0") - 1;

    const parentRow = Math.floor(parentCellIndex / 3);
    const parentCol = parentCellIndex % 3;
    const innerRow = Math.floor(innerCellIndex / 3);
    const innerCol = innerCellIndex % 3;

    const innerRowIndex = parentRow * 3 + innerRow;
    const innerColIndex = parentCol * 3 + innerCol;

    cells.forEach((cell, cellIndex) => {
      if (cellIndex === parentCellIndex) return;

      const innerCells = cell.querySelectorAll(".inner-cell");
      innerCells.forEach((innerCell, innerCellIndex) => {
        if (innerCell.children[0] === innerCellToSelect) return;

        const row =
          Math.floor(cellIndex / 3) * 3 + Math.floor(innerCellIndex / 3);
        const col = (cellIndex % 3) * 3 + (innerCellIndex % 3);

        if (row === innerRowIndex || col === innerColIndex) {
          innerCell.children[0].setAttribute("selected-related", "");
        }
      });
    });

    // Highlight Same Number
    if (innerCellToSelect.innerText) {
      const selectedValue = innerCellToSelect.innerText;
      cells.forEach((cell) => {
        const innerCells = cell.querySelectorAll(".inner-cell");
        innerCells.forEach((innerCell) => {
          if (innerCell.children[0] !== innerCellToSelect) {
            if (innerCell.children[0].innerHTML === selectedValue) {
              innerCell.children[0].setAttribute("selected-related-number", "");
            }
          }
        });
      });
    }

    const highlightedCellNumbers = Array.from(
      document.querySelectorAll("[selected], [selected-related]")
    )
      .map((cell) => {
        if (cell === innerCellToSelect) return "";
        return cell.innerHTML;
      })
      .filter((cell) => cell);
    if (highlightedCellNumbers.includes(innerCellToSelect.innerHTML)) {
      Array.from(
        document.querySelectorAll("[selected], [selected-related]")
      ).forEach((cell) => {
        if (cell.innerHTML === innerCellToSelect.innerHTML) {
          cell.setAttribute("error", "");
        }
      });
    }
  };

  const clearBoardHighlighting = (clearError: boolean = false) => {
    const cells = document.querySelectorAll(".cell");
    Array.from(cells).forEach((cell) => {
      const innerCells = cell.querySelectorAll(".inner-cell");
      innerCells.forEach((innerCell) => {
        innerCell.children[0].removeAttribute("selected");
        innerCell.children[0].removeAttribute("selected-related");
        innerCell.children[0].removeAttribute("selected-related-number");
        if (clearError) innerCell.children[0].removeAttribute("error");
      });
    });
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const fillGrid = (grid: number[][]) => {
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell, index) => {
      const innerCells = cell.querySelectorAll(".inner-cell");
      innerCells.forEach((innerCell, innerIndex) => {
        const row = Math.floor(index / 3) * 3 + Math.floor(innerIndex / 3);
        const col = (index % 3) * 3 + (innerIndex % 3);
        const value = grid[row][col];
        if (value !== 0) {
          innerCell.children[0].setAttribute("data-locked", "");
          innerCell.children[0].innerHTML = value.toString();
        } else {
          innerCell.children[0].innerHTML = "";
        }
      });
    });
  };

  useEffect(() => {
    if (!gameFinished) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameFinished]);

  return (
    <div className="game">
      <div className="timer">
        <p className="timer-display">{formatTime(timer)}</p>
        <button className="start-button" onClick={handleGameStart}>
          Start
        </button>
        <button className="finish-button" onClick={handleGameFinish}>
          Finish
        </button>
      </div>
      <div className="game-board">
        {Array.from({ length: 9 }, (_, cellIndex) => (
          <div
            className="cell"
            key={`cell-${cellIndex}`}
            data-index={cellIndex + 1}
            style={{
              // Equal borders for all cells
              borderRight: "2px solid #000",
              borderBottom: "2px solid #000",
              borderLeft: cellIndex % 3 === 0 ? "2px solid #000" : "none",
              borderTop: cellIndex < 3 ? "2px solid #000" : "none",
            }}
          >
            {Array.from({ length: 9 }, (_, innerCellIndex) => (
              <div
                className="inner-cell"
                key={`inner-cell-${cellIndex}-${innerCellIndex}`}
                data-index={innerCellIndex + 1}
                style={{
                  // Equal borders for all inner cells
                  borderRight: "1px solid var(--color-tone-4)",
                  borderBottom: "1px solid var(--color-tone-4)",
                  borderLeft:
                    innerCellIndex % 3 === 0
                      ? "1px solid var(--color-tone-4)"
                      : "none",
                  borderTop:
                    innerCellIndex < 3
                      ? "1px solid var(--color-tone-4)"
                      : "none",
                }}
              >
                <button
                  className="cell-button"
                  onClick={handleCellClick}
                  data-index={innerCellIndex + 1}
                ></button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="game-inputs">
        <div className="game-inputs-row">
          {Array.from({ length: 9 }, (_, index) => (
            <button
              key={`input-${index}`}
              className="input-button button-number"
              onClick={() => handleNumberInput(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="game-inputs-special">
          <button
            className="input-button button-undo"
            onClick={handleUndoAction}
          >
            <span className="undo-icon">
              <UndoIcon />
            </span>
          </button>
          <button
            className="input-button button-erase"
            onClick={() => {
              if (selectedCell && !selectedCell.hasAttribute("data-locked")) {
                selectedCell.innerText = "";
              }
            }}
          >
            <span className="erase-icon">
              <EraserIcon />
            </span>
          </button>
          <button
            className="input-button button-reset-board"
            onClick={() => {
              fillGrid(testData.newboard.grids[0].value);
              clearBoardHighlighting(true);
              setActionHistory([]);
              setSelectedCell(null);
            }}
          >
            <span className="reset-icon">
              <ResetIcon />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Game;
