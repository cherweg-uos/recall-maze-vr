import type { Maze } from "@/lib/maze";

interface Props {
  maze: Maze;
  size?: number;
  /** show the solution path */
  showPath?: boolean;
}

export function BriefingMap({ maze, size = 360, showPath = true }: Props) {
  const pad = 8;
  const cell = (size - pad * 2) / Math.max(maze.cols, maze.rows);
  const w = cell * maze.cols + pad * 2;
  const h = cell * maze.rows + pad * 2;

  const cx = (col: number) => pad + col * cell + cell / 2;
  const cy = (row: number) => pad + row * cell + cell / 2;

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const rowCells of maze.cells) {
    for (const c of rowCells) {
      const x = pad + c.col * cell;
      const y = pad + c.row * cell;
      if (c.walls.N) lines.push({ x1: x, y1: y, x2: x + cell, y2: y });
      if (c.walls.W) lines.push({ x1: x, y1: y, x2: x, y2: y + cell });
      if (c.walls.S) lines.push({ x1: x, y1: y + cell, x2: x + cell, y2: y + cell });
      if (c.walls.E) lines.push({ x1: x + cell, y1: y, x2: x + cell, y2: y + cell });
    }
  }

  const points = maze.path.map((p) => `${cx(p.col)},${cy(p.row)}`).join(" ");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      className="max-w-[420px] rounded-xl border border-border bg-card"
      role="img"
      aria-label="Top-down map of the maze with the route to follow"
    >
      {showPath && (
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-accent-strong)"
          strokeWidth={Math.max(3, cell * 0.22)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      )}

      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="var(--color-foreground)"
          strokeWidth={2}
          strokeLinecap="square"
        />
      ))}

      <circle
        cx={cx(maze.start.col)}
        cy={cy(maze.start.row)}
        r={cell * 0.18}
        fill="var(--color-muted-foreground)"
      />
      <circle
        cx={cx(maze.goal.col)}
        cy={cy(maze.goal.row)}
        r={cell * 0.22}
        fill="var(--color-accent-strong)"
      />
    </svg>
  );
}
