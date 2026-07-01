"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

/** All 69 possible 4-cell windows on a 6×7 board (precomputed for performance). */
function buildWindows(): [number, number][][] {
  const windows: [number, number][][] = [];
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      windows.push([
        [r, c],
        [r, c + 1],
        [r, c + 2],
        [r, c + 3],
      ]);
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      windows.push([
        [r, c],
        [r + 1, c],
        [r + 2, c],
        [r + 3, c],
      ]);
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      windows.push([
        [r, c],
        [r + 1, c + 1],
        [r + 2, c + 2],
        [r + 3, c + 3],
      ]);
    }
  }
  // Diagonal down-left
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      windows.push([
        [r, c],
        [r + 1, c - 1],
        [r + 2, c - 2],
        [r + 3, c - 3],
      ]);
    }
  }
  return windows;
}

const ALL_WINDOWS = buildWindows();

/** Score a single 4-cell window for the given player. */
function scoreWindow(
  board: Board,
  window: [number, number][],
  player: 1 | 2,
): number {
  let aiCount = 0;
  let oppCount = 0;
  for (const [r, c] of window) {
    const cell = board[r][c];
    if (cell === player) aiCount++;
    else if (cell !== 0) oppCount++;
  }
  // More offensive
  if (aiCount > 0 && oppCount > 0) return 0;
  if (aiCount === 4) return 20000;
  if (aiCount === 3) return 200;
  if (aiCount === 2) return 20;
  if (aiCount === 1) return 2;
  if (oppCount === 4) return -10000;
  if (oppCount === 3) return -100;
  if (oppCount === 2) return -10;
  if (oppCount === 1) return -1;
  return 0;
}

/** Heuristic evaluation: sum of all window scores from AI's perspective. */
function evaluateBoard(board: Board, aiPlayer: 1 | 2): number {
  let score = 0;
  for (const w of ALL_WINDOWS) {
    score += scoreWindow(board, w, aiPlayer);
  }
  return score;
}

/** Column order for better alpha-beta pruning: center-first. */
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

function getOrderedMoves(board: Board): number[] {
  return COLUMN_ORDER.filter((col) => board[0][col] === 0);
}

/** Minimax with alpha-beta pruning. Mutates board in-place (undoes each move). */
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: 1 | 2,
): number {
  const validCols = getOrderedMoves(board);
  if (depth === 0 || validCols.length === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  const currentPlayer: 1 | 2 = maximizing ? aiPlayer : aiPlayer === 1 ? 2 : 1;

  if (maximizing) {
    let maxScore = -Infinity;
    for (const col of validCols) {
      const row = dropPiece(board, col, currentPlayer);
      if (row === -1) continue;

      // Check if this move wins the game immediately for the active player
      if (checkWin(board, row, col, currentPlayer)) {
        board[row][col] = 0; // undo
        return 100000 * 7 ** depth;
      }

      const score = minimax(board, depth - 1, alpha, beta, false, aiPlayer);
      board[row][col] = 0; // undo
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const col of validCols) {
      const row = dropPiece(board, col, currentPlayer);
      if (row === -1) continue;

      // Check if this move wins the game immediately for the active player
      if (checkWin(board, row, col, currentPlayer)) {
        board[row][col] = 0; // undo
        return -100000 * 7 ** depth;
      }

      const score = minimax(board, depth - 1, alpha, beta, true, aiPlayer);
      board[row][col] = 0; // undo
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (alpha >= beta) break;
    }
    return minScore;
  }
}

function getDepth(difficulty: string): [number, number] {
  switch (difficulty) {
    case "easy":
      return [2, 0.3];
    case "medium":
      return [4, 0.2];
    case "hard":
      return [6, 0.1];
    case "impossible":
      return [10, 0];
    default:
      return [2, 0.3];
  }
}

/** Returns the best column for the AI to play. */
function getBestMove(
  board: Board,
  aiPlayer: 1 | 2,
  difficulty: string,
): number {
  const validCols = getOrderedMoves(board);
  if (validCols.length === 0) return -1;

  // 1. Safety check: If the AI can win in 1 move, play it immediately
  for (const col of validCols) {
    const row = dropPiece(board, col, aiPlayer);
    if (row !== -1) {
      const won = checkWin(board, row, col, aiPlayer);
      board[row][col] = 0; // undo
      if (won) {
        return col;
      }
    }
  }

  // 2. Otherwise, run minimax search to find the best move
  const [depth, error] = getDepth(difficulty);

  let bestCol = validCols[0];
  let bestScore = -Infinity;
  let secondBestCol = validCols[0];
  let secondBestScore = -Infinity;

  for (const col of validCols) {
    const row = dropPiece(board, col, aiPlayer);
    if (row !== -1) {
      const score = minimax(
        board,
        depth - 1,
        -Infinity,
        Infinity,
        false,
        aiPlayer,
      );
      board[row][col] = 0; // undo
      if (score > bestScore) {
        secondBestScore = bestScore;
        secondBestCol = bestCol;

        bestScore = score;
        bestCol = col;
      } else if (score > secondBestScore) {
        secondBestScore = score;
        secondBestCol = col;
      }
    }
  }
  // simulate people making "mistakes"
  // const errorTriggerd = Math.random() < error;
  // console.log(errorTriggerd);
  // console.log(secondBestCol);
  // console.log(bestCol);
  // if (errorTriggerd) {
  //   return secondBestCol;
  // } else {
  //   return bestCol;
  // }
  return Math.random() > error ? bestCol : secondBestCol;
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

function Connect4Game() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "pvp";
  const difficulty = searchParams.get("difficulty") || "medium";

  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { board, currentPlayer, winner, draw, lastMove, moveCount } = state;
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI is thinking when it's Player 2's turn in PvAI mode and the game is still active
  const isAIThinking =
    mode === "pvai" && currentPlayer === 2 && !winner && !draw;

  // AI auto-play via effect: fires after board updates to AI's turn
  useEffect(() => {
    if (!isAIThinking) return;

    aiTimeoutRef.current = setTimeout(() => {
      const aiCol = getBestMove(board, 2, difficulty);
      if (aiCol !== -1) {
        dispatch({ type: "DROP", col: aiCol });
      }
    }, 600);

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [isAIThinking, board, difficulty]);

  const handleColumnClick = useCallback(
    (col: number) => {
      if (isAIThinking) return;
      dispatch({ type: "DROP", col });
    },
    [isAIThinking],
  );

  const handleRestart = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    dispatch({ type: "RESTART" });
  }, []);

  const p1name = mode === "pvp" ? "Player 1" : "Player";
  const p2name = mode === "pvp" ? "Player 2" : "AI";

  const currentPlayerName = currentPlayer == 1 ? p1name : p2name;

  const titleText = winner
    ? `${currentPlayerName} Wins!`
    : draw
      ? "It's a Draw!"
      : `${currentPlayerName}'s Turn`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
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
          !isAIThinking &&
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
                const isCellAvailable =
                  !winner && !draw && board[0][colIdx] === 0;
                const canClick = isCellAvailable && !isAIThinking;
                const isLastMove =
                  lastMove?.row === rowIdx && lastMove?.col === colIdx;

                return (
                  <button
                    key={colIdx}
                    type="button"
                    disabled={!canClick}
                    onClick={() => handleColumnClick(colIdx)}
                    onMouseEnter={() => setHoveredCol(colIdx)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={[
                      "flex size-12 items-center justify-center rounded-full border-2 transition-all sm:size-14",
                      isCellAvailable
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

export default function Connect4Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-8">
          <p className="text-lg text-gray-500">Loading…</p>
        </main>
      }
    >
      <Connect4Game />
    </Suspense>
  );
}
