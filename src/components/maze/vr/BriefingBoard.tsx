import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { DIR_LABEL, pathToSteps, type Maze } from "@/lib/maze";
import { drawMazeMap } from "@/lib/mazeTexture";
import { Button3D, Label, Panel, UI } from "./ui3d";
import { useFacePlayer } from "./facePlayer";

interface Props {
  maze: Maze;
  level: number;
  secondsLeft: number;
  onReady: () => void;
  onQuit: () => void;
}

/** A grabbable map board the player studies before the run. */
export function BriefingBoard({ maze, level, secondsLeft, onReady, onQuit }: Props) {
  const group = useRef<THREE.Group>(null);
  const grab = useRef<{ hand: THREE.Object3D; offset: THREE.Matrix4 } | null>(null);
  const touched = useRef(false);
  const [held, setHeld] = useState(false);

  useFacePlayer(group, { distance: 1.6, height: 1.45, skipRef: touched });

  const left = useXRInputSourceState("controller", "left");
  const right = useXRInputSourceState("controller", "right");


  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(drawMazeMap(maze));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [maze]);

  useEffect(() => () => texture.dispose(), [texture]);

  const steps = useMemo(() => pathToSteps(maze.path), [maze]);
  const stepText = steps.map((s) => `${s.count} × ${DIR_LABEL[s.dir]}`).join("   ·   ");

  const startGrab = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const board = group.current;
    if (!board) return;
    const hands = [left?.object, right?.object].filter(Boolean) as THREE.Object3D[];
    if (!hands.length) return;
    const point = e.point;
    const hand = hands.reduce((best, h) =>
      h.getWorldPosition(new THREE.Vector3()).distanceTo(point) <
      best.getWorldPosition(new THREE.Vector3()).distanceTo(point)
        ? h
        : best,
    );
    const offset = new THREE.Matrix4()
      .copy(hand.matrixWorld)
      .invert()
      .multiply(board.matrixWorld);
    grab.current = { hand, offset };
    setHeld(true);
  };

  const endGrab = () => {
    grab.current = null;
    setHeld(false);
  };

  useFrame(() => {
    const board = group.current;
    const g = grab.current;
    if (!board || !g) return;
    const world = new THREE.Matrix4().copy(g.hand.matrixWorld).multiply(g.offset);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    world.decompose(pos, quat, scale);
    board.position.copy(pos);
    board.quaternion.copy(quat);
  });

  const urgent = secondsLeft <= 5;

  return (
    <group ref={group} position={[0, 1.45, -1.5]} rotation={[-0.18, 0, 0]} scale={0.85}>
      <Panel width={1.5} height={1.05} color={held ? "#fbf7ef" : UI.panel}>
        <mesh
          position={[0, 0.06, 0.012]}
          onPointerDown={startGrab}
          onPointerUp={endGrab}
          onPointerLeave={endGrab}
        >
          <planeGeometry args={[0.86, 0.86]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>

        <Label position={[-0.7, 0.44, 0.02]} anchorX="left" size={0.055} color={UI.inkSoft}>
          {`Level ${level}`}
        </Label>
        <Label
          position={[0.7, 0.44, 0.02]}
          anchorX="right"
          size={0.075}
          color={urgent ? UI.danger : UI.accent}
        >
          {`${Math.max(0, Math.ceil(secondsLeft))}s`}
        </Label>

        <Label
          position={[0, -0.4, 0.02]}
          size={0.045}
          color={UI.ink}
          maxWidth={1.35}
        >
          {stepText}
        </Label>
      </Panel>

      <Button3D
        label="Ready"
        onClick={onReady}
        width={0.6}
        height={0.16}
        position={[0.42, -0.66, 0.02]}
        color={UI.accentSoft}
      />
      <Button3D
        label="Quit"
        onClick={onQuit}
        width={0.45}
        height={0.16}
        position={[-0.42, -0.66, 0.02]}
      />
      <Label position={[0, -0.86, 0.02]} size={0.04} color={UI.inkSoft}>
        Grab the board with a trigger to move it
      </Label>
    </group>
  );
}

export default BriefingBoard;
