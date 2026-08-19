import type { Maze } from "./maze";

export const MAP_COLORS = {
  paper: "#f4f1ea",
  ink: "#2f3538",
  accent: "#e0662b",
  muted: "#98a1a7",
};

/** Draws a top-down map with the solution path onto a canvas (browser only). */
export function drawMazeMap(maze: Maze, px = 768): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  const pad = px * 0.06;
  const cell = (px - pad * 2) / Math.max(maze.cols, maze.rows);

  ctx.fillStyle = MAP_COLORS.paper;
  ctx.fillRect(0, 0, px, px);

  const cx = (col: number) => pad + col * cell + cell / 2;
  const cy = (row: number) => pad + row * cell + cell / 2;

  // solution path
  ctx.strokeStyle = MAP_COLORS.accent;
  ctx.lineWidth = Math.max(4, cell * 0.26);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  maze.path.forEach((p, i) => {
    const x = cx(p.col);
    const y = cy(p.row);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // walls
  ctx.strokeStyle = MAP_COLORS.ink;
  ctx.lineWidth = Math.max(2, cell * 0.09);
  ctx.lineCap = "square";
  ctx.beginPath();
  for (const rowCells of maze.cells) {
    for (const c of rowCells) {
      const x = pad + c.col * cell;
      const y = pad + c.row * cell;
      if (c.walls.N) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell, y);
      }
      if (c.walls.W) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cell);
      }
      if (c.walls.S) {
        ctx.moveTo(x, y + cell);
        ctx.lineTo(x + cell, y + cell);
      }
      if (c.walls.E) {
        ctx.moveTo(x + cell, y);
        ctx.lineTo(x + cell, y + cell);
      }
    }
  }
  ctx.stroke();

  // start + goal
  ctx.fillStyle = MAP_COLORS.muted;
  ctx.beginPath();
  ctx.arc(cx(maze.start.col), cy(maze.start.row), cell * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = MAP_COLORS.accent;
  ctx.beginPath();
  ctx.arc(cx(maze.goal.col), cy(maze.goal.row), cell * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // north marker
  ctx.fillStyle = MAP_COLORS.ink;
  ctx.font = `600 ${Math.round(px * 0.045)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("N", px / 2, pad * 0.85);

  return canvas;
}
