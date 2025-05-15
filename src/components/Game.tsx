import { useState } from "react";
import "./Game.css";

const Game = () => {
  const [selectedCell, setSelectedCell] = useState<HTMLButtonElement | null>(
    null
  );
  const handleCellClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedCell) {
      selectedCell.removeAttribute("selected");
    }
    setSelectedCell(e.currentTarget);
    e.currentTarget.setAttribute("selected", "");
    console.log(
      `Cell ${
        (e.currentTarget.parentNode?.parentNode as HTMLElement)?.dataset.index
      } inner cell ${e.currentTarget.dataset.index} clicked`
    );
  };

  return (
    <div className="game">
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
                >
                  {innerCellIndex + 1}
                </button>
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
              className="input-button"
              onClick={() => {
                if (selectedCell) {
                  selectedCell.innerText = (index + 1).toString();
                }
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          className="input-button"
          onClick={() => {
            if (selectedCell) {
              selectedCell.innerText = "";
            }
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default Game;
