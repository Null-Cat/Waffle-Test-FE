import { useEffect, useRef, useState } from "react";
import { EraserIcon, UndoIcon, ResetIcon, HintIcon, ExitIcon } from "./SVGs";
import "./Game.css";

interface PlayerAction {
  cell: HTMLButtonElement;
  value: number | null;
}

interface SolveAPIResponse {
  message: string;
  board: number[][] | null;
}

interface GameBoardAPIResponse {
  id: number;
  value: number[][];
  difficulty: string | null;
}

interface HintAPIResponse {
  parentCellIndex: number;
  innerCellIndex: number;
  hint: number;
}

const Game = () => {
  const baseAPIURL = "https://waffle-api.philipwhite.dev/";
  const defaultStarterHints = 5;

  const [boardID, setBoardID] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<string>("");
  const [unsolvedBoard, setUnsolvedBoard] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<HTMLButtonElement | null>(
    null
  );
  const [actionHistory, setActionHistory] = useState<PlayerAction[]>([]);
  const [timer, setTimer] = useState(0);
  const [hintCount, setHintCount] = useState(defaultStarterHints);
  const [gameFinished, setGameFinished] = useState(true);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [timeFinished, setTimeFinished] = useState<Date | null>(null);

  const hintCounterRef = useRef<HTMLDivElement>(null);

  /**
   * Handles the click event on a cell button.
   *
   * @param e - The React mouse event from the clicked button
   * @remarks This function passes the clicked button element to the selectInnerCell function
   */
  const handleCellClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    selectInnerCell(e.currentTarget);
  };

  /**
   * Handles the undo action in the game.
   *
   * Reverts the last action performed by restoring the previous value of the cell,
   * removing any error indicators, and updating the selection state.
   *
   * If there's a previous action in the history after undoing, the cell from that action
   * will be selected. Otherwise, board highlighting is cleared and no cell is selected.
   *
   * @returns {void}
   */
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

  /**
   * Handles user input of a number on the selected cell in the game grid.
   *
   * @param number - The number to enter in the selected cell (0 represents clearing the cell)
   *
   * @remarks
   * This function:
   * - Updates the selected cell with the new number if the cell is not locked
   * - Only updates if the number is different from the current value
   * - Adds the previous state to action history for undo functionality
   * - Maintains selection on the cell after updating
   * - Checks if the board is complete after each input
   * - Triggers game completion flow when the board is filled correctly
   *
   * @requires selectedCell - A DOM element reference to the currently selected cell
   * @requires setActionHistory - State setter function for tracking changes
   * @requires selectInnerCell - Function to handle cell selection UI
   * @requires configureOverlay - Function to control the game overlay
   * @requires handleGameFinish - Function to process game completion
   */
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

      // Submit the board to the server if the game is finished
      const isBoardComplete = Array.from(
        document.querySelectorAll(".cell-button")
      ).every((cellButton) => {
        const cellValue = cellButton.innerHTML;
        return !cellButton.hasAttribute("error") && cellValue !== "";
      });
      if (isBoardComplete) {
        configureOverlay(true, true, false);
        handleGameFinish();
      }
    }
  };

  /**
   * Handles the game exit action by resetting the game state to its initial values.
   * This includes:
   * - Configuring the overlay
   * - Marking the game as finished
   * - Resetting the timer and time tracking
   * - Clearing the board ID, unsolved board, and difficulty settings
   * - Filling the grid with zeros (9x9 empty grid)
   */
  const handleGameExit = () => {
    configureOverlay(true, false, true);
    setGameFinished(true);
    setTimer(0);
    setTimeStarted(null);
    setBoardID(0);
    setUnsolvedBoard([]);
    setDifficulty("");
    fillGrid(Array.from({ length: 9 }, () => Array(9).fill(0)));
  };

  /**
   * Handles the game completion process.
   *
   * This function is triggered when a player finishes a game.
   * 1. Records the timestamp when the game was finished
   * 2. Updates the game state to finished
   * 3. Sends the completed board data to the server for validation
   * 4. Handles the response:
   *    - If successful, displays the success overlay
   *    - If the board is incorrect, logs an error message
   *
   * @remarks
   * This function makes an API call to the backend for board validation.
   *
   * @returns {void}
   */
  const handleGameFinish = () => {
    setTimeFinished(new Date());
    setGameFinished(true);
    fetch(`${baseAPIURL}/solve`, {
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
          configureOverlay(true, false, false, true);
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

  /**
   * Initiates a new game by resetting game state and fetching a new puzzle board.
   *
   * This function resets all game-related state variables, fetches a new Sudoku board from the server
   * based on the specified difficulty, and updates the UI accordingly.
   *
   * @param difficulty - The difficulty level of the puzzle to fetch. Defaults to "any".
   *                    If "any" is specified, a random puzzle of any difficulty is fetched.
   *                    Otherwise, a daily puzzle of the specified difficulty is fetched.
   *
   * @remarks
   * This function performs the following operations:
   * - Resets cell selection and board highlighting
   * - Resets timer and game history
   * - Shows loading overlay
   * - Fetches a new puzzle from the server
   * - Updates the game state with the new puzzle data
   * - Hides the loading overlay
   */
  const handleGameStart = (difficulty: string = "any") => {
    setSelectedCell(null);
    clearBoardHighlighting(true);
    setTimeStarted(new Date());
    setTimeFinished(null);
    setTimer(0);
    setHintCount(defaultStarterHints);
    setActionHistory([]);
    let url = new URL(`${baseAPIURL}/random`);
    if (difficulty !== "any") {
      url = new URL(`${baseAPIURL}/daily`);
      url.searchParams.append("difficulty", difficulty);
    }
    configureOverlay(true, true, false);
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          configureOverlay(true, false, true);
          return response.json().then((data) => {
            console.error("Error fetching board:", data.message);
            return;
          });
        }
        return response.json();
      })
      .then((data: GameBoardAPIResponse) => {
        setBoardID(data.id);
        setDifficulty(
          difficulty === "any" ? data.difficulty || "Err" : difficulty
        );
        setUnsolvedBoard(data.value);
        fillGrid(data.value);
        configureOverlay(false, false, false);
        setGameFinished(false);
      })
      .catch((error) => {
        console.error("Error fetching board:", error);
        configureOverlay(true, false, true);
      });
  };

  /**
   * Handles the user request for a hint in the game.
   *
   * If the user has no hints left (hintCount <= 0), applies a horizontal shaking animation
   * to the hint counter element to indicate that no hints are available.
   *
   * If hints are available, decrements the hint count and makes an API request to get a hint.
   * Upon successful response, the hint value is placed in the specified cell, the cell is locked,
   * the unsolved board state is updated, and the cell is selected.
   *
   * @throws Will log an error to the console if the hint fetch request fails.
   *
   * @remarks
   * - Modifies game unsolvedBoard
   */
  const handleHint = () => {
    if (hintCount <= 0) {
      hintCounterRef.current?.setAttribute("horizontal-shaking", "");
      const handleAnimationEnd = () => {
        hintCounterRef.current?.removeAttribute("horizontal-shaking");
      };
      hintCounterRef.current?.addEventListener(
        "animationend",
        handleAnimationEnd
      );
      return;
    }
    setHintCount(hintCount - 1);
    fetch(`${baseAPIURL}/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        boardID: boardID,
        board: getBoardState(),
      }),
    })
      .then((response) => response.json())
      .then((data: HintAPIResponse) => {
        if (data) {
          const { parentCellIndex, innerCellIndex, hint } = data;
          const cellButton = getInnerCellButton(
            parentCellIndex,
            innerCellIndex
          );
          if (cellButton) {
            cellButton.innerHTML = hint.toString();
            cellButton.setAttribute("data-locked", "");
            setUnsolvedBoard(getBoardState(false));
            selectInnerCell(cellButton);
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching hint:", error);
      });
  };

  /**
   * Handles the selection of a cell in the Sudoku board.
   *
   * 1. Sets the selected cell in state
   * 2. Clears previous highlighting from the board
   * 3. Highlights the selected cell
   * 4. Highlights related cells:
   *    - Cells in the same 3x3 box
   *    - Cells in the same row
   *    - Cells in the same column
   *    - Cells with the same number
   * 5. Checks for and removes error markers on cells that no longer have conflicts
   * 6. Highlights error cells (duplicate numbers in the same row, column, or 3x3 box)
   *
   * @param innerCellToSelect - The HTML button element representing the cell to be selected
   *
   * @remarks
   * This function uses DOM manipulation to apply visual highlighting by setting attributes
   * on elements. It relies on the following attributes:
   * - "selected": For the currently selected cell
   * - "selected-related": For cells related to the selection (same row/column/box)
   * - "selected-related-number": For cells with the same number as the selected cell
   * - "error": For cells with duplicate numbers that violate Sudoku rules
   */
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
    const amountOfCellsInParentCell = 9;

    for (let i = 0; i < amountOfCellsInParentCell; i++) {
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
        const amountOfCellsInParentCell = 9;

        // Check row
        for (
          let rowIndex = 0;
          rowIndex < amountOfCellsInParentCell && !hasDuplicate;
          rowIndex++
        ) {
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
          columnIndex < amountOfCellsInParentCell && !hasDuplicate;
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
        const boxSize = 3;
        const boxStartRow = Math.floor(cellRow / boxSize) * boxSize;
        const boxStartCol = Math.floor(cellCol / boxSize) * boxSize;

        for (
          let rowIndex = boxStartRow;
          rowIndex < boxStartRow + boxSize && !hasDuplicate;
          rowIndex++
        ) {
          for (
            let columnIndex = boxStartCol;
            columnIndex < boxStartCol + boxSize && !hasDuplicate;
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

  /**
   * Calculates the position of a cell within a nested grid structure.
   *
   * @param cell - The HTML element representing a cell in the grid
   * @returns An object containing the following position information:
   *   - parentCellIndex: Index of the parent cell (0-based)
   *   - innerCellIndex: Index of the inner cell within its parent (0-based)
   *   - parentRow: Row coordinate of the parent cell in the outer grid
   *   - parentCol: Column coordinate of the parent cell in the outer grid
   *   - innerRow: Row coordinate of the cell within its parent grid
   *   - innerCol: Column coordinate of the cell within its parent grid
   *   - innerRowIndex: Global row coordinate of the cell across the entire grid
   *   - innerColIndex: Global column coordinate of the cell across the entire grid
   */
  const getCellPosition = (cell: HTMLElement) => {
    const parentCellIndex =
      parseInt(
        cell.parentElement?.parentElement?.getAttribute("data-index") || "0"
      ) - 1;
    const innerCellIndex = parseInt(cell.getAttribute("data-index") || "0") - 1;

    const boxSize = 3;
    const parentRow = Math.floor(parentCellIndex / boxSize);
    const parentCol = parentCellIndex % boxSize;
    const innerRow = Math.floor(innerCellIndex / boxSize);
    const innerCol = innerCellIndex % boxSize;

    const innerRowIndex = parentRow * boxSize + innerRow;
    const innerColIndex = parentCol * boxSize + innerCol;

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

  /**
   * Removes highlighting attributes from all cells on the game board.
   *
   * This function clears the "selected", "selected-related", and "selected-related-number"
   * attributes from all inner cell elements. Optionally, it can also clear the "error"
   * attribute if specified.
   *
   * @param clearError - Whether to clear the "error" attribute from cells.
   * Defaults to false.
   */
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

  /**
   * Formats a time value in seconds to a string representation in "MM:SS" format.
   *
   * @param time - The time value in seconds to format
   * @returns A string in the format "MM:SS" where minutes and seconds are both two digits with leading zeros if necessary
   *
   * @example
   * // Returns "02:05"
   * formatTime(125);
   *
   * @example
   * // Returns "00:09"
   * formatTime(9);
   */
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  /**
   * Traverses through the 9x9 grid organized as a 3x3 grid of 3x3 cells.
   *
   * This function iterates through each button element in the grid and applies the provided callback
   * to each one, passing the button element along with its calculated row and column position
   * in the overall 9x9 grid.
   *
   * The grid structure is expected to have the following DOM hierarchy:
   * - Elements with class "cell" (3x3 grid of these)
   * - Elements with class "inner-cell" within each cell (3x3 grid of these)
   * - A button element as the first child of each inner-cell
   *
   * @param callback - Function to execute for each button in the grid
   * @param callback.innerButton - The button element being processed
   * @param callback.row - The row index (0-8) of the button in the overall grid
   * @param callback.col - The column index (0-8) of the button in the overall grid
   */
  const traverseBoard = (
    callback: (innerButton: HTMLButtonElement, row: number, col: number) => void
  ) => {
    const boxSize = 3;
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell, index) => {
      const innerCells = cell.querySelectorAll(".inner-cell");
      innerCells.forEach((innerCell, innerIndex) => {
        const row =
          Math.floor(index / boxSize) * boxSize +
          Math.floor(innerIndex / boxSize);
        const col = (index % boxSize) * boxSize + (innerIndex % boxSize);
        callback(innerCell.children[0] as HTMLButtonElement, row, col);
      });
    });
  };

  /**
   * Retrieves a button element from a nested grid structure based on x and y coordinates.
   *
   * @param x - The x-coordinate in the overall grid.
   * @param y - The y-coordinate in the overall grid.
   *
   * @returns The button element at the specified coordinates, or null if the cell doesn't exist.
   *
   * @remarks
   * This function navigates a 2-level nested grid structure where:
   * - The outer grid consists of cells with class "cell" arranged in a 3×3 grid.
   * - Each cell contains inner cells with class "inner-cell" also arranged in a 3×3 grid.
   * - Each inner cell contains a button as its first child.
   *
   * The coordinates (x,y) refer to the position in the flattened 9×9 grid of inner cells.
   */
  const getInnerCellButton = (x: number, y: number) => {
    const boxSize = 3;
    const cells = document.querySelectorAll(".cell");
    const cellIndex =
      Math.floor(x / boxSize) * boxSize + Math.floor(y / boxSize);
    const innerCellIndex = (x % boxSize) * boxSize + (y % boxSize);
    const cell = cells[cellIndex];
    if (cell) {
      const innerCells = cell.querySelectorAll(".inner-cell");
      return innerCells[innerCellIndex].children[0] as HTMLButtonElement;
    }
    return null;
  };

  /**
   * Retrieves the position of the currently selected cell in a nested grid structure.
   *
   * @returns An object containing the parent cell index and inner cell index if a cell is selected,
   *          or null if no cell is currently selected.
   * @returns {Object|null} The position object or null
   * @returns {number} position.parentCellIndex - The zero-based index of the parent cell
   * @returns {number} position.innerCellIndex - The zero-based index of the inner cell
   */
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

  /**
   * Converts the selected cell position from parent/inner cell indices to an X/Y coordinate system.
   * Uses a box size of 3 for calculations.
   *
   * @returns An object containing x and y coordinates of the selected cell, or null if no cell is selected.
   * @returns {Object|null} position - The X/Y position
   * @returns {number} position.x - The X coordinate in the flattened grid
   * @returns {number} position.y - The Y coordinate in the flattened grid
   */
  const getSelectedCellPositionXY = () => {
    const boxSize = 3;
    const position = getSelectedCellPosition();
    if (position) {
      const { parentCellIndex, innerCellIndex } = position;
      const x =
        Math.floor(parentCellIndex / boxSize) * boxSize +
        Math.floor(innerCellIndex / boxSize);
      const y =
        (parentCellIndex % boxSize) * boxSize + (innerCellIndex % boxSize);
      return { x, y };
    }
    return null;
  };

  /**
   * Populates the game board with values from a 2D grid.
   *
   * @param grid - A 2D array of numbers representing the game board values
   * @remarks
   * - For non-zero values in the grid, the corresponding UI element is marked as "locked"
   *   and displays the value
   * - For zero values, the corresponding UI element remains empty
   * - Uses the traverseBoard helper to iterate through all board positions
   */
  const fillGrid = (grid: number[][]) => {
    traverseBoard((innerButton, row, col) => {
      const value = grid[row][col];
      if (value !== 0) {
        innerButton.setAttribute("data-locked", "");
        innerButton.innerHTML = value.toString();
      } else {
        innerButton.removeAttribute("data-locked");
        innerButton.innerHTML = "";
      }
    });
  };

  /**
   * Retrieves the current state of the game board as a 2D array of numbers.
   *
   * @param includeUserInput - Whether to include user-inputted values in the board state.
   *                           If false, only includes values that are locked (indicated by the
   *                           'data-locked' attribute). Defaults to true.
   *
   * @returns A 9x9 2D array representing the game board, where:
   *          - 0 represents an empty cell
   *          - 1-9 represent the numbers in filled cells
   *          - User-inputted values may be excluded based on the includeUserInput parameter
   */
  const getBoardState = (includeUserInput: boolean = true) => {
    const amountOfCellsInParentCell = 9;
    const boardState: number[][] = Array.from(
      { length: amountOfCellsInParentCell },
      () => Array(9).fill(0)
    );
    traverseBoard((innerButton, row, col) => {
      const shouldIncludeValue =
        includeUserInput || innerButton.hasAttribute("data-locked");
      const cellContent = innerButton.innerHTML;
      boardState[row][col] =
        shouldIncludeValue && cellContent ? parseInt(cellContent) : 0;
    });
    return boardState;
  };

  // TODO: Write documentation once leaderboard is implemented
  const configureOverlay = (
    showOverlay: boolean = false,
    showLoadingOverlay: boolean = false,
    showStartOverlay: boolean = false,
    showGameFinishedOverlay: boolean = false
  ) => {
    const overlay = document.querySelector(".overlay") as HTMLElement;
    const loadingOverlay = document.querySelector(
      ".overlay-loading"
    ) as HTMLElement;
    const startOverlay = document.querySelector(
      ".start-overlay"
    ) as HTMLElement;
    const gameFinishedOverlay = document.querySelector(
      ".game-finished-overlay"
    ) as HTMLElement;
    if (overlay && loadingOverlay && startOverlay) {
      overlay.style.display = showOverlay ? "flex" : "none";
      loadingOverlay.style.display = showLoadingOverlay ? "flex" : "none";
      startOverlay.style.display = showStartOverlay ? "flex" : "none";
      gameFinishedOverlay.style.display = showGameFinishedOverlay
        ? "flex"
        : "none";
    }
  };

  // Time tracking counter
  // This effect updates the timer every second once the game has started
  // This is calculated by subtracting the timeStarted from the current time
  // and dividing by 1000 to convert milliseconds to seconds
  useEffect(() => {
    if (!gameFinished) {
      const interval = setInterval(() => {
        setTimer(
          Math.floor((Date.now() - (timeStarted?.getTime() || 0)) / 1000)
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameFinished, timeStarted]);

  // Handle keyboard input
  // This effect listens for keydown events and handles number input, backspace, delete, and undo actions
  // It also handles arrow key navigation between cells
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key >= "1" && key <= "9") {
        handleNumberInput(parseInt(key));
      } else if (key === "Backspace" || key === "Delete") {
        handleNumberInput(0);
      } else if (key === "Escape") {
        handleGameExit();
      } else if (key === "h") {
        handleHint();
      } else if (key === "z" && (event.ctrlKey || event.metaKey)) {
        handleUndoAction();
      } else if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "ArrowLeft" ||
        key === "ArrowRight"
      ) {
        event.preventDefault();
        if (!selectedCell) {
          const firstButton = document.querySelector(
            ".cell-button"
          ) as HTMLButtonElement;
          if (firstButton) {
            selectInnerCell(firstButton);
          }
        }
        const position = getSelectedCellPositionXY();

        if (position) {
          let { x, y } = position;

          // Calculate the new position based on arrow key
          const amountOfCellsInParentCellZeroIndexed = 8;
          if (key === "ArrowUp")
            x = x - 1 < 0 ? amountOfCellsInParentCellZeroIndexed : x - 1;
          if (key === "ArrowDown")
            x = x + 1 > amountOfCellsInParentCellZeroIndexed ? 0 : x + 1;
          if (key === "ArrowLeft")
            y = y - 1 < 0 ? amountOfCellsInParentCellZeroIndexed : y - 1;
          if (key === "ArrowRight")
            y = y + 1 > amountOfCellsInParentCellZeroIndexed ? 0 : y + 1;

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
      <div className="game-header">
        <p>{`#${boardID.toString().padStart(4, "0")}`}</p>
        <div className="timer">
          <p className="timer-display">{formatTime(timer)}</p>
        </div>
        <p className="board-difficulty">{difficulty}</p>
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
          <div className="hint-button-container">
            <button className="input-button button-hint" onClick={handleHint}>
              <span className="hint-icon">
                <HintIcon />
              </span>
            </button>
            <div className="hint-counter" ref={hintCounterRef}>
              {hintCount}
            </div>
          </div>
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
          <button className="input-button button-exit" onClick={handleGameExit}>
            <span className="exit-icon">
              <ExitIcon />
            </span>
          </button>
        </div>
      </div>
      <div className="overlay">
        <div className="overlay-loading">
          <img className="throbber" src="/waffle.png" alt="Loading..." />
          <div className="loading-text">
            <h2>Baking...</h2>
          </div>
        </div>
        <div className="start-overlay">
          <h1>Welcome to Phil's Waffle Sudoku</h1>
          <h2>Daily Challenges</h2>
          <p>Climb the Daily Leaderboard</p>
          <div className="start-daily-buttons">
            <button
              className="input-button start-button"
              onClick={() => handleGameStart("Easy")}
            >
              Easy
            </button>
            <button
              className="input-button start-button"
              onClick={() => handleGameStart("Medium")}
            >
              Medium
            </button>
            <button
              className="input-button start-button"
              onClick={() => handleGameStart("Hard")}
            >
              Hard
            </button>
          </div>
          <h2>Random</h2>
          <p>Play a random board of random difficulty</p>
          <button
            className="input-button start-button"
            onClick={() => handleGameStart()}
          >
            Cook me a Board
          </button>
        </div>
        <div className="game-finished-overlay">
          <h1>Congratulations!</h1>
          <h2>You have completed the board</h2>
          <p>
            {`Time taken: ${formatTime(
              Math.floor(
                ((timeFinished?.getTime() || 0) -
                  (timeStarted?.getTime() || 0)) /
                  1000
              )
            )}`}
          </p>
          <button
            className="input-button start-button"
            onClick={() => configureOverlay(true, false, true)}
          >
            Return to the Kitchen
          </button>
        </div>
      </div>
    </div>
  );
};

export default Game;
