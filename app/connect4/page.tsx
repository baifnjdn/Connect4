"use client";

import React, { useCallback, useReducer, useState } from "react";
import Link from "next/link";

const ROWS = 6;
const COLS = 7;

type Cell = 0 | 1 | 2; // 0 = empty, 1 = player 1 (yellow), 2 = player 2 (red)
type Board = Cell[][];

type GameState = {
  board: Board;
  currentPlayer: 1 | 2;
  winner: 1 | 2 | null;
  draw: boolean;
  lastMove: { row: number; col: number } | null;
  moveCount: number;
};

type Action = { type: "DROP"; col: number } | { type: "RESTART" };

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

/** Drops a piece into the column. Returns the row it landed in, or -1 if full. */
function dropPiece(board: Board, col: number, player: 1 | 2): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) {
      board[row][col] = player;
      return row;
    }
  }
  return -1;
}

/** Check for 4-in-a-row from the most recently placed piece. */
function checkWin(
  board: Board,
  row: number,
  col: number,
  player: 1 | 2,
): boolean {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    // positive direction
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
      } else {
        break;
      }
    }
    // negative direction
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
      } else {
        break;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

function isBoardFull(board: Board): boolean {
  return board[0].every((cell) => cell !== 0);
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "DROP": {
      if (state.winner || state.draw) return state;

      const newBoard: Board = state.board.map((row) => [...row]);
      const landedRow = dropPiece(newBoard, action.col, state.currentPlayer);

      if (landedRow === -1) return state; // column full — no change

      const nextMoveCount = state.moveCount + 1;
      const lastMove = { row: landedRow, col: action.col };

      if (checkWin(newBoard, landedRow, action.col, state.currentPlayer)) {
        return {
          ...state,
          board: newBoard,
          winner: state.currentPlayer,
          lastMove,
          moveCount: nextMoveCount,
        };
      }

      if (isBoardFull(newBoard)) {
        return {
          ...state,
          board: newBoard,
          draw: true,
          lastMove,
          moveCount: nextMoveCount,
        };
      }

      return {
        ...state,
        board: newBoard,
        currentPlayer: state.currentPlayer === 1 ? 2 : 1,
        lastMove,
        moveCount: nextMoveCount,
      };
    }
    case "RESTART":
      return {
        board: createEmptyBoard(),
        currentPlayer: 1,
        winner: null,
        draw: false,
        lastMove: null,
        moveCount: 0,
      };
  }
}

const initialState: GameState = {
  board: createEmptyBoard(),
  currentPlayer: 1,
  winner: null,
  draw: false,
  lastMove: null,
  moveCount: 0,
};

export default function Connect4Page() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { board, currentPlayer, winner, draw, lastMove, moveCount } = state;
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const handleColumnClick = useCallback(
    (col: number) => dispatch({ type: "DROP", col }),
    [],
  );

  const handleRestart = useCallback(() => dispatch({ type: "RESTART" }), []);

  const titleText = winner
    ? `Player ${winner} Wins!`
    : draw
      ? "It's a Draw!"
      : `Player ${currentPlayer}'s Turn`;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Link
        href="/"
        className="absolute left-8 top-8 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        ← Home
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">{titleText}</h1>

      <div className="relative overflow-hidden rounded-xl bg-blue-700 p-4 shadow-lg">
        {/* Column highlight — translucent rectangle over the full column */}
        {hoveredCol !== null &&
          !winner &&
          !draw &&
          board[0][hoveredCol] === 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 left-[calc(1rem-0.125rem+var(--col)*3.25rem)] h-[calc(6*3rem+5*0.25rem+2rem)] w-13 rounded-lg bg-white/30 transition-opacity sm:left-[calc(1rem-0.125rem+var(--col)*3.75rem)] sm:h-[calc(6*3.5rem+5*0.25rem+2rem)] sm:w-15"
              style={{ "--col": hoveredCol } as React.CSSProperties}
            />
          )}
        <div className="flex flex-col gap-1">
          {board.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((cell, colIdx) => {
                const isClickable = !winner && !draw && board[0][colIdx] === 0;
                const isLastMove =
                  lastMove?.row === rowIdx && lastMove?.col === colIdx;

                return (
                  <button
                    key={colIdx}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => handleColumnClick(colIdx)}
                    onMouseEnter={() => setHoveredCol(colIdx)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={[
                      "flex size-12 items-center justify-center rounded-full border-2 transition-all sm:size-14",
                      isClickable
                        ? "cursor-pointer border-blue-400 bg-white/90"
                        : "cursor-default border-blue-400 bg-white/70",
                    ].join(" ")}
                    aria-label={
                      cell === 0
                        ? `Column ${colIdx + 1}, empty`
                        : `Column ${colIdx + 1}, Player ${cell}`
                    }
                  >
                    {cell !== 0 && (
                      <div
                        key={isLastMove ? `drop-${moveCount}` : undefined}
                        style={
                          isLastMove
                            ? ({
                                "--drop-from": `${2.5 + rowIdx * 3.25}rem`,
                              } as React.CSSProperties)
                            : undefined
                        }
                        className={[
                          "size-3/4 rounded-full shadow-inner",
                          cell === 1 ? "bg-yellow-400" : "bg-red-500",
                          isLastMove ? "animate-drop-in" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {(winner || draw) && (
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white shadow transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Restart Game
        </button>
      )}
    </main>
  );
}
