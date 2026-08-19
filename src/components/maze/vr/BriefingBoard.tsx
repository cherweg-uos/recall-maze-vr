import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DIR_LABEL, pathToSteps, type Maze } from "@/lib/maze";
import { drawMazeMap } from "@/lib/mazeTexture";
import { Anchored, Button3D, Label, Panel, UI, useGrabbable } from "./ui3d";

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
  const { held, handlers } = useGrabbable(group);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(drawMazeMap(maze));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [maze]);

  useEffect(() => () => texture.dispose(), [texture]);

  const steps = useMemo(() => pathToSteps(maze.path), [maze]);
  const stepText = steps.map((s) => `${s.count} × ${DIR_LABEL[s.dir]}`).join("   ·   ");

  const urgent = secondsLeft <= 5;

  return (
    <Anchored distance={1.7} height={1.5}>
      <group ref={group}>
        <Panel width={1.7} height={1.9} color={held ? "#fbf7ef" : UI.panel}>
          {/* grab bar */}
          <mesh position={[0, 1.0, 0]} {...handlers}>
            <boxGeometry args={[0.9, 0.07, 0.04]} />
            <meshStandardMaterial color={held ? UI.accent : UI.panelEdge} roughness={0.8} />
          </mesh>

          <Label position={[-0.78, 0.82, 0.02]} anchorX="left" size={0.055} color={UI.inkSoft}>
            {`Level ${level}`}
          </Label>
          <Label
            position={[0.78, 0.82, 0.02]}
            anchorX="right"
            size={0.08}
            color={urgent ? UI.danger : UI.accent}
          >
            {`${Math.max(0, Math.ceil(secondsLeft))}s`}
          </Label>

          <mesh position={[0, 0.24, 0.012]} {...handlers}>
            <planeGeometry args={[1.05, 1.05]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>

          <Label position={[0, -0.42, 0.02]} size={0.05} color={UI.ink} maxWidth={1.55}>
            {stepText}
          </Label>

          <Button3D
            label="Ready"
            onClick={onReady}
            width={0.62}
            height={0.17}
            position={[0.42, -0.76, 0.03]}
            color={UI.accentSoft}
          />
          <Button3D
            label="Quit"
            onClick={onQuit}
            width={0.5}
            height={0.17}
            position={[-0.42, -0.76, 0.03]}
          />
        </Panel>
        <Label position={[0, -1.08, 0.02]} size={0.04} color={UI.inkSoft}>
          Grab the bar or the map with a trigger to move the board
        </Label>
      </group>
    </Anchored>
  );
}

export default BriefingBoard;
