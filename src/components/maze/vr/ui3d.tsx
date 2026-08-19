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
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[width + radius, height + radius, 0.02]} />
        <meshStandardMaterial color={UI.panelEdge} roughness={0.9} />
      </mesh>
      <mesh>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.85} />
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
          <meshStandardMaterial color={hover ? UI.accent : color} roughness={0.7} />
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

export function Slider3D({ value, min, max, step = 1, width = 1.2, onChange }: SliderProps) {
  const [dragging, setDragging] = useState(false);
  const t = (value - min) / (max - min);
  const handleX = -width / 2 + t * width;

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
        <meshStandardMaterial color="#e3ded3" roughness={0.9} />
      </mesh>
      <mesh position={[-width / 2 + (t * width) / 2, 0, 0.012]} raycast={() => null}>
        <boxGeometry args={[Math.max(0.001, t * width), 0.11, 0.01]} />
        <meshStandardMaterial color={UI.accentSoft} roughness={0.8} />
      </mesh>
      <mesh position={[handleX, 0, 0.03]} raycast={() => null}>
        <cylinderGeometry args={[0.055, 0.055, 0.04, 20]} />
        <meshStandardMaterial color={UI.accent} roughness={0.5} />
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
      <Label position={[-0.75, 0.11, 0.02]} anchorX="left" size={0.058} color={UI.inkSoft}>
        {label}
      </Label>
      <Label position={[0.75, 0.11, 0.02]} anchorX="right" size={0.058} color={UI.ink}>
        {valueText}
      </Label>
      <group position={[0, -0.04, 0.02]}>
        <Slider3D value={value} min={min} max={max} step={step ?? 1} width={1.5} onChange={onChange} />
      </group>
    </group>
  );
}
