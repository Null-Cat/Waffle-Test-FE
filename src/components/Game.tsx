import { useEffect, useState } from "react";
import { EraserIcon, UndoIcon, ResetIcon } from "./SVGs";
import "./Game.css";

interface PlayerAction {
  cell: HTMLButtonElement;
  value: number | null;
}

interface SolveAPIResponse {
  message: string;
  board: number[][] | null;
}

const Game = () => {
  const [boardID, setBoardID] = useState<number>(0);
  const [unsolvedBoard, setUnsolvedBoard] = useState<number[][]>([]);
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
        selectedCell.innerText = number === 0 ? "" : number.toString();
      }
      selectInnerCell(selectedCell);
    }
  };

  const handleGameFinish = () => {
    setTimeFinished(new Date());
    setGameFinished(true);
    fetch("http://localhost:3000/solved", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        boardID: boardID,
        board: getBoardState(),
      }),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Board has been solved");
          return;
        }
        return response.json();
      })
      .then((responseJSON: SolveAPIResponse) => {
        if (responseJSON && responseJSON.message === "Board not solved") {
          console.error("Board not solved");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const handleGameStart = () => {
    setTimeStarted(new Date());
    setTimeFinished(null);
    setGameFinished(false);
    setTimer(0);
    setActionHistory([]);
    const url = new URL("http://localhost:3000/board");
    url.searchParams.append("difficulty", "MEDIUM");

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        setBoardID(data.id);
        setUnsolvedBoard(data.value);
        fillGrid(data.value);
      })
      .catch((error) => {
        console.error("Error fetching board:", error);
      });
  };

  const selectInnerCell = (innerCellToSelect: HTMLButtonElement) => {
    setSelectedCell(innerCellToSelect);

    // Remove Previous Highlighting
    clearBoardHighlighting();

    // Highlight the selected cell
    innerCellToSelect.setAttribute("selected", "");

    // Highlight the parent cell (cells in the same 3x3 box)
    const parentCell = innerCellToSelect.parentElement?.parentElement;
    if (parentCell) {
      Array.from(parentCell.children).forEach((innerCell: Element) => {
        if (innerCell === innerCellToSelect.parentElement) return;
        innerCell.children[0].setAttribute("selected-related", "");
      });
    }

    const { innerRowIndex, innerColIndex } = getCellPosition(innerCellToSelect);

    for (let i = 0; i < 9; i++) {
      // Highlight the row
      const rowButton = getInnerCellButton(innerRowIndex, i);
      if (rowButton && rowButton !== innerCellToSelect) {
        rowButton.setAttribute("selected-related", "");
      }

      // Highlight the column
      const colButton = getInnerCellButton(i, innerColIndex);
      if (colButton && colButton !== innerCellToSelect) {
        colButton.setAttribute("selected-related", "");
      }
    }

    // Highlight all cells with the same number
    if (innerCellToSelect.innerText) {
      const selectedValue = innerCellToSelect.innerText;
      traverseBoard((innerButton) => {
        if (
          innerButton !== innerCellToSelect &&
          innerButton.innerHTML === selectedValue
        ) {
          innerButton.setAttribute("selected-related-number", "");
        }
      });
    }

    // Check if errors need to be cleared
    document
      .querySelectorAll("[selected][error], [selected-related][error]")
      .forEach((errorCell) => {
        const cellValue = errorCell.innerHTML;

        if (!cellValue) {
          errorCell.removeAttribute("error");
          return;
        }

        const { innerRowIndex: cellRow, innerColIndex: cellCol } =
          getCellPosition(errorCell as HTMLElement);

        if (cellRow === -1 || cellCol === -1) return;

        const board = getBoardState();
        const cellValueInt = parseInt(cellValue);

        let hasDuplicate = false;

        // Check row
        for (let rowIndex = 0; rowIndex < 9 && !hasDuplicate; rowIndex++) {
          if (
            rowIndex !== cellCol &&
            board[cellRow][rowIndex] === cellValueInt
          ) {
            hasDuplicate = true;
          }
        }

        // Check column
        for (
          let columnIndex = 0;
          columnIndex < 9 && !hasDuplicate;
          columnIndex++
        ) {
          if (
            columnIndex !== cellRow &&
            board[columnIndex][cellCol] === cellValueInt
          ) {
            hasDuplicate = true;
          }
        }

        // Check 3x3 box
        const boxStartRow = Math.floor(cellRow / 3) * 3;
        const boxStartCol = Math.floor(cellCol / 3) * 3;

        for (
          let rowIndex = boxStartRow;
          rowIndex < boxStartRow + 3 && !hasDuplicate;
          rowIndex++
        ) {
          for (
            let columnIndex = boxStartCol;
            columnIndex < boxStartCol + 3 && !hasDuplicate;
            columnIndex++
          ) {
            if (
              (rowIndex !== cellRow || columnIndex !== cellCol) &&
              board[rowIndex][columnIndex] === cellValueInt
            ) {
              hasDuplicate = true;
            }
          }
        }

        // If no duplicated numbers, remove the error attribute
        if (!hasDuplicate) {
          errorCell.removeAttribute("error");
        }
      });

    // Highlight Same Number in the same cell aka Errors
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

  const getCellPosition = (cell: HTMLElement) => {
    const parentCellIndex =
      parseInt(
        cell.parentElement?.parentElement?.getAttribute("data-index") || "0"
      ) - 1;
    const innerCellIndex = parseInt(cell.getAttribute("data-index") || "0") - 1;

    const parentRow = Math.floor(parentCellIndex / 3);
    const parentCol = parentCellIndex % 3;
    const innerRow = Math.floor(innerCellIndex / 3);
    const innerCol = innerCellIndex % 3;

    const innerRowIndex = parentRow * 3 + innerRow;
    const innerColIndex = parentCol * 3 + innerCol;

    return {
      parentCellIndex,
      innerCellIndex,
      parentRow,
      parentCol,
      innerRow,
      innerCol,
      innerRowIndex,
      innerColIndex,
    };
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

  const traverseBoard = (
    callback: (innerButton: HTMLButtonElement, row: number, col: number) => void
  ) => {
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell, index) => {
      const innerCells = cell.querySelectorAll(".inner-cell");
      innerCells.forEach((innerCell, innerIndex) => {
        const row = Math.floor(index / 3) * 3 + Math.floor(innerIndex / 3);
        const col = (index % 3) * 3 + (innerIndex % 3);
        callback(innerCell.children[0] as HTMLButtonElement, row, col);
      });
    });
  };

  const getInnerCellButton = (x: number, y: number) => {
    const cells = document.querySelectorAll(".cell");
    const cellIndex = Math.floor(x / 3) * 3 + Math.floor(y / 3);
    const innerCellIndex = (x % 3) * 3 + (y % 3);
    const cell = cells[cellIndex];
    if (cell) {
      const innerCells = cell.querySelectorAll(".inner-cell");
      return innerCells[innerCellIndex].children[0] as HTMLButtonElement;
    }
    return null;
  };

  const getSelectedCellPosition = () => {
    if (selectedCell) {
      const parentCellIndex =
        parseInt(
          selectedCell.parentElement?.parentElement?.getAttribute(
            "data-index"
          ) || "0"
        ) - 1;
      const innerCellIndex =
        parseInt(selectedCell.getAttribute("data-index") || "0") - 1;
      return { parentCellIndex, innerCellIndex };
    }
    return null;
  };

  const getSelectedCellPositionXY = () => {
    const position = getSelectedCellPosition();
    if (position) {
      const { parentCellIndex, innerCellIndex } = position;
      const x =
        Math.floor(parentCellIndex / 3) * 3 + Math.floor(innerCellIndex / 3);
      const y = (parentCellIndex % 3) * 3 + (innerCellIndex % 3);
      return { x, y };
    }
    return null;
  };

  const fillGrid = (grid: number[][]) => {
    traverseBoard((innerButton, row, col) => {
      const value = grid[row][col];
      if (value !== 0) {
        innerButton.setAttribute("data-locked", "");
        innerButton.innerHTML = value.toString();
      } else {
        innerButton.innerHTML = "";
      }
    });
  };

  const getBoardState = () => {
    const boardState: number[][] = Array.from({ length: 9 }, () =>
      Array(9).fill(0)
    );
    traverseBoard((innerButton, row, col) => {
      const value = parseInt(innerButton.innerHTML || "0");
      boardState[row][col] = value;
    });
    return boardState;
  };

  useEffect(() => {
    if (!gameFinished) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameFinished]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key >= "1" && key <= "9") {
        handleNumberInput(parseInt(key));
      } else if (key === "Backspace" || key === "Delete") {
        handleNumberInput(0);
      } else if (key === "z" && (event.ctrlKey || event.metaKey)) {
        handleUndoAction();
      } else if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "ArrowLeft" ||
        key === "ArrowRight"
      ) {
        event.preventDefault();
        const position = getSelectedCellPositionXY();

        if (position) {
          let { x, y } = position;

          // Calculate the new position based on arrow key
          if (key === "ArrowUp") x = x - 1 < 0 ? 8 : x - 1;
          if (key === "ArrowDown") x = x + 1 > 8 ? 0 : x + 1;
          if (key === "ArrowLeft") y = y - 1 < 0 ? 8 : y - 1;
          if (key === "ArrowRight") y = y + 1 > 8 ? 0 : y + 1;

          // Get the button at the new position
          const button = getInnerCellButton(x, y);

          // Select the new cell if a button was found
          if (button) {
            selectInnerCell(button);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

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
                handleNumberInput(0);
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
              fillGrid(unsolvedBoard);
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
