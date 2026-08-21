import { Text } from "@react-three/drei";
import { useState, type ReactNode } from "react";
import type { ThreeEvent } from "@react-three/fiber";

export const UI = {
  panel: "#f4f1ea",
  panelEdge: "#d8d3c8",
  ink: "#2f3538",
  inkSoft: "#6b7478",
  accent: "#e0662b",
  accentSoft: "#f0a882",
  danger: "#b8443a",
};

/** Menu surfaces swallow pointer events so the teleport floor never sees them. */
const stop = (e: ThreeEvent<PointerEvent>) => e.stopPropagation();


export function Panel({
  width,
  height,
  color = UI.panel,
  children,
  radius = 0.06,
  ...props
}: {
  width: number;
  height: number;
  color?: string;
  radius?: number;
  children?: ReactNode;
} & React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[0, 0, -0.012]} onPointerMove={stop} onPointerDown={stop} onPointerUp={stop}>
        <boxGeometry args={[width + radius, height + radius, 0.02]} />
        <meshBasicMaterial color={UI.panelEdge} toneMapped={false} />
      </mesh>
      <mesh onPointerMove={stop} onPointerDown={stop} onPointerUp={stop}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {children}
    </group>
  );
}

export function Label({
  children,
  size = 0.07,
  color = UI.ink,
  anchorX = "center",
  maxWidth,
  ...props
}: {
  children: string;
  size?: number;
  color?: string;
  anchorX?: "center" | "left" | "right";
  maxWidth?: number;
} & React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <Text
        fontSize={size}
        color={color}
        anchorX={anchorX}
        anchorY="middle"
        {...(maxWidth !== undefined ? { maxWidth } : {})}
        outlineWidth={0}
      >
        {children}
      </Text>
    </group>
  );
}

export function Button3D({
  label,
  onClick,
  width = 1.0,
  height = 0.18,
  color = UI.panel,
  textColor = UI.ink,
  size = 0.075,
  ...props
}: {
  label: string;
  onClick: () => void;
  width?: number;
  height?: number;
  color?: string;
  textColor?: string;
  size?: number;
} & React.ComponentProps<"group">) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const scale = down ? 0.97 : hover ? 1.03 : 1;
  return (
    <group {...props}>
      <group scale={scale}>
        <mesh
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHover(true);
          }}
          onPointerOut={() => {
            setHover(false);
            setDown(false);
          }}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setDown(true);
          }}
          onPointerUp={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setDown(false);
            onClick();
          }}
        >
          <boxGeometry args={[width, height, 0.03]} />
          <meshBasicMaterial color={hover ? UI.accent : color} toneMapped={false} />
        </mesh>
        <Text
          position={[0, 0, 0.021]}
          fontSize={size}
          color={hover ? UI.panel : textColor}
          anchorX="center"
          anchorY="middle"
          maxWidth={width * 0.9}
        >
          {label}
        </Text>
      </group>
    </group>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number | undefined;
  width?: number | undefined;
  onChange: (v: number) => void;
}

/** Max ticks we draw before the track would read as a solid bar. */
const MAX_TICKS = 21;

/** Snap positions to draw as ticks, or [] when the step is too fine to be readable. */
function tickPositions(min: number, max: number, step: number): number[] {
  if (!(step > 0) || max <= min) return [];
  const steps = Math.round((max - min) / step);
  if (steps < 1) return [];
  // Coarsen until the tick count fits, but only by whole multiples of the step.
  let stride = 1;
  while (Math.floor(steps / stride) + 1 > MAX_TICKS) stride += 1;
  if (stride > 1 && steps / stride < 2) return [];
  const out: number[] = [];
  for (let i = 0; i <= steps; i += stride) out.push((i * step) / (max - min));
  return out;
}

export function Slider3D({ value, min, max, step = 1, width = 1.2, onChange }: SliderProps) {
  const [dragging, setDragging] = useState(false);
  const t = (value - min) / (max - min);
  const handleX = -width / 2 + t * width;
  const ticks = tickPositions(min, max, step);

  const setFromEvent = (e: ThreeEvent<PointerEvent>) => {
    const local = e.object.worldToLocal(e.point.clone());
    const raw = min + ((local.x + width / 2) / width) * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, snapped)));
  };

  return (
    <group>
      <mesh
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setDragging(true);
          (e.target as Element | undefined)?.setPointerCapture?.(e.pointerId);
          setFromEvent(e);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (!dragging) return;
          e.stopPropagation();
          setFromEvent(e);
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setDragging(false);
          (e.target as Element | undefined)?.releasePointerCapture?.(e.pointerId);
        }}
        onPointerOut={() => setDragging(false)}
      >
        <boxGeometry args={[width, 0.11, 0.02]} />
        <meshBasicMaterial color="#e3ded3" toneMapped={false} />
      </mesh>
      <mesh position={[-width / 2 + (t * width) / 2, 0, 0.012]} raycast={() => null}>
        <boxGeometry args={[Math.max(0.001, t * width), 0.11, 0.01]} />
        <meshBasicMaterial color={UI.accentSoft} toneMapped={false} />
      </mesh>
      {ticks.map((f) => (
        <mesh key={f} position={[-width / 2 + f * width, -0.082, 0.012]} raycast={() => null}>
          <boxGeometry args={[0.008, 0.04, 0.01]} />
          <meshBasicMaterial color={UI.panelEdge} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[handleX, 0, 0.03]} raycast={() => null}>
        <boxGeometry args={[0.055, 0.14, 0.035]} />
        <meshBasicMaterial color={UI.accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function SliderRow({
  label,
  valueText,
  value,
  min,
  max,
  step,
  onChange,
  ...props
}: {
  label: string;
  valueText: string;
} & SliderProps &
  React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <group position={[0, 0.03, 0.02]}>
        <Slider3D value={value} min={min} max={max} step={step ?? 1} width={1.5} onChange={onChange} />
      </group>
      <Label position={[-0.75, -0.1, 0.02]} anchorX="left" size={0.055} color={UI.inkSoft}>
        {label}
      </Label>
      <Label position={[0.75, -0.1, 0.02]} anchorX="right" size={0.055} color={UI.ink}>
        {valueText}
      </Label>
    </group>
  );
}
