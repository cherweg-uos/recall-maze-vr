import { Suspense, useState } from "react";
import { Button3D, Label, Panel, SliderRow, UI } from "./ui3d";
import { StoneFloor } from "./StoneFloor";

import {
  FAKE_GOAL_RANGE,
  MAX_LEVEL,
  MIN_LEVEL,
  SETTING_RANGES,
  SHAPE_RANGES,
  SMOOTH_TURN_RANGE,
  SNAP_ANGLES,
  briefingSeconds,
  formatClock,
  formatSeconds,
  mazeSeconds,
  type GameSettings,
  type HighscoreEntry,
  type ShapeKey,
} from "@/lib/gameSettings";
import { levelConfig } from "@/lib/maze";

/** Panels render at the origin of a FacingAnchor, which puts them in front of the player. */
const PANEL_POS: [number, number, number] = [0, 0, 0];

export function MenuRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#6f6a63" roughness={1} />
      </mesh>
      <Suspense fallback={null}>
        <StoneFloor width={44} depth={44} centerX={0} centerZ={0} seed={7} />
      </Suspense>
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.56, 64]} />
        <meshBasicMaterial color={UI.accentSoft} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}


export function TitlePanel({
  onStart,
  onLevelSelect,
  onSettings,
  onHighscores,
  onExit,
}: {
  onStart: () => void;
  onLevelSelect: () => void;
  onSettings: () => void;
  onHighscores: () => void;
  onExit: () => void;
}) {
  const items: [string, () => void][] = [
    ["Start", onStart],
    ["Level select", onLevelSelect],
    ["Settings", onSettings],
    ["Highscores", onHighscores],
    ["Exit", onExit],
  ];
  return (
    <group position={PANEL_POS}>
      <Panel width={1.5} height={1.75}>
        <Label position={[0, 0.68, 0.02]} size={0.13}>
          Maze Recall
        </Label>
        <Label position={[0, 0.52, 0.02]} size={0.07} color={UI.danger} maxWidth={1.3}>
          Study the route, then walk it from memory. Don't leave the Path!
        </Label>
        {items.map(([label, fn], i) => (
          <Button3D
            key={label}
            label={label}
            onClick={fn}
            width={1.15}
            height={0.19}
            position={[0, 0.28 - i * 0.24, 0.03]}
            color={i === 0 ? UI.accentSoft : "#e9e4d9"}
          />
        ))}
      </Panel>
    </group>
  );
}

export function LevelSelectPanel({
  level,
  onLevel,
  onStart,
  onBack,
}: {
  level: number;
  onLevel: (v: number) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const cfg = levelConfig(level);
  return (
    <group position={PANEL_POS}>
      <Panel width={1.7} height={1.15}>
        <Label position={[0, 0.42, 0.02]} size={0.1}>
          Level select
        </Label>
        <SliderRow
          position={[0, 0.12, 0.02]}
          label={`Level ${MIN_LEVEL} – ${MAX_LEVEL}`}
          valueText={`${level}`}
          value={level}
          min={MIN_LEVEL}
          max={MAX_LEVEL}
          step={1}
          onChange={onLevel}
        />
        <Label position={[0, -0.13, 0.02]} size={0.05} color={UI.inkSoft}>
          {`${cfg.cols} × ${cfg.rows} grid · about ${cfg.targetLength} steps`}
        </Label>
        <Button3D
          label="Start"
          onClick={onStart}
          width={0.7}
          height={0.18}
          position={[0.4, -0.4, 0.03]}
          color={UI.accentSoft}
        />
        <Button3D label="Back" onClick={onBack} width={0.55} height={0.18} position={[-0.42, -0.4, 0.03]} />
      </Panel>
    </group>
  );
}

type TimeKey = "briefingBase" | "briefingPerLevel" | "mazeBase" | "mazePerLevel";
type Tab = "movement" | "time" | "maze";

const TABS: [Tab, string][] = [
  ["movement", "Movement"],
  ["time", "Time"],
  ["maze", "Maze"],
];

interface TabProps {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
}

function MovementTab({ settings, onChange }: TabProps) {
  const snap = settings.turnStyle === "snap";
  return (
    <group>
      <Label position={[-0.75, 0.66, 0.02]} anchorX="left" size={0.058} color={UI.inkSoft}>
        Turning style
      </Label>
      <Button3D
        label="Snap"
        onClick={() => onChange({ ...settings, turnStyle: "snap" })}
        width={0.5}
        height={0.15}
        size={0.055}
        position={[-0.35, 0.48, 0.03]}
        color={snap ? UI.accentSoft : "#e9e4d9"}
      />
      <Button3D
        label="Smooth"
        onClick={() => onChange({ ...settings, turnStyle: "smooth" })}
        width={0.5}
        height={0.15}
        size={0.055}
        position={[0.35, 0.48, 0.03]}
        color={snap ? "#e9e4d9" : UI.accentSoft}
      />
      {snap ? (
        <group>
          <Label position={[-0.75, 0.26, 0.02]} anchorX="left" size={0.05} color={UI.inkSoft}>
            Snap angle
          </Label>
          {SNAP_ANGLES.map((deg, i) => (
            <Button3D
              key={deg}
              label={`${deg}°`}
              onClick={() => onChange({ ...settings, snapDegrees: deg })}
              width={0.4}
              height={0.15}
              size={0.055}
              position={[-0.45 + i * 0.45, 0.08, 0.03]}
              color={settings.snapDegrees === deg ? UI.accentSoft : "#e9e4d9"}
            />
          ))}
        </group>
      ) : (
        <SliderRow
          position={[0, 0.16, 0.02]}
          label="Turn speed"
          valueText={`${settings.smoothDegPerSec}°/s`}
          value={settings.smoothDegPerSec}
          min={SMOOTH_TURN_RANGE.min}
          max={SMOOTH_TURN_RANGE.max}
          step={SMOOTH_TURN_RANGE.step}
          onChange={(v) => onChange({ ...settings, smoothDegPerSec: v })}
        />
      )}
    </group>
  );
}

function TimeTab({ settings, onChange }: TabProps) {
  const rows: TimeKey[] = ["briefingBase", "briefingPerLevel", "mazeBase", "mazePerLevel"];
  return (
    <group>
      {rows.map((key, i) => {
        const r = SETTING_RANGES[key];
        return (
          <SliderRow
            key={key}
            position={[0, 0.66 - i * 0.24, 0.02]}
            label={r.label}
            valueText={formatSeconds(settings[key])}
            value={settings[key]}
            min={r.min}
            max={r.max}
            step={r.step}
            onChange={(v) => onChange({ ...settings, [key]: v })}
          />
        );
      })}
      <Label position={[0, -0.3, 0.02]} size={0.045} color={UI.inkSoft} maxWidth={1.7}>
        {`At level 10: ${formatSeconds(briefingSeconds(10, settings))} to study, ${formatSeconds(
          mazeSeconds(10, settings),
        )} to escape`}
      </Label>
    </group>
  );
}

function MazeTab({ settings, onChange }: TabProps) {
  const shapeKeys: ShapeKey[] = ["decoyDensity", "branchDepth", "loopiness", "twistiness", "fillCoverage"];
  const fake = settings.fakeGoalsEnabled;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <group>
      <Label position={[-0.75, 0.62, 0.02]} anchorX="left" size={0.058} color={UI.inkSoft}>
        Fake goals
      </Label>
      <Button3D
        label={fake ? "On" : "Off"}
        onClick={() => onChange({ ...settings, fakeGoalsEnabled: !fake })}
        width={0.4}
        height={0.15}
        size={0.055}
        position={[0.55, 0.62, 0.03]}
        color={fake ? UI.accentSoft : "#e9e4d9"}
      />
      {fake && (
        <group>
          <SliderRow
            position={[0, 0.38, 0.02]}
            label="Number of fake goals"
            valueText={`${settings.fakeGoalCount}`}
            value={settings.fakeGoalCount}
            min={FAKE_GOAL_RANGE.min}
            max={FAKE_GOAL_RANGE.max}
            step={FAKE_GOAL_RANGE.step}
            onChange={(v) => onChange({ ...settings, fakeGoalCount: v })}
          />
          <Label position={[-0.75, 0.12, 0.02]} anchorX="left" size={0.05} color={UI.inkSoft}>
            Fake goal colour
          </Label>
          <Button3D
            label="Same"
            onClick={() => onChange({ ...settings, fakeGoalDistinct: false })}
            width={0.42}
            height={0.15}
            size={0.055}
            position={[0.18, 0.12, 0.03]}
            color={settings.fakeGoalDistinct ? "#e9e4d9" : UI.accentSoft}
          />
          <Button3D
            label="Distinct"
            onClick={() => onChange({ ...settings, fakeGoalDistinct: true })}
            width={0.42}
            height={0.15}
            size={0.055}
            position={[0.64, 0.12, 0.03]}
            color={settings.fakeGoalDistinct ? UI.accentSoft : "#e9e4d9"}
          />
        </group>
      )}
      {shapeKeys.map((key, i) => {
        const r = SHAPE_RANGES[key];
        const v = settings.mazeShape[key];
        return (
          <SliderRow
            key={key}
            position={[0, -0.1 - i * 0.24, 0.02]}
            label={r.label}
            valueText={key === "branchDepth" ? `${v} cells` : pct(v)}
            value={v}
            min={r.min}
            max={r.max}
            step={r.step}
            onChange={(nv) => onChange({ ...settings, mazeShape: { ...settings.mazeShape, [key]: nv } })}
          />
        );
      })}
    </group>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  onBack,
}: {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("movement");
  return (
    <group position={PANEL_POS}>
      <Panel width={1.9} height={2.7}>
        <Label position={[0, 1.2, 0.02]} size={0.1}>
          Settings
        </Label>
        {TABS.map(([id, label], i) => (
          <Button3D
            key={id}
            label={label}
            onClick={() => setTab(id)}
            width={0.55}
            height={0.16}
            size={0.055}
            position={[-0.6 + i * 0.6, 1.0, 0.03]}
            color={tab === id ? UI.accentSoft : "#e9e4d9"}
          />
        ))}
        <group position={[0, 0, 0]}>
          {tab === "movement" && <MovementTab settings={settings} onChange={onChange} />}
          {tab === "time" && <TimeTab settings={settings} onChange={onChange} />}
          {tab === "maze" && <MazeTab settings={settings} onChange={onChange} />}
        </group>
        <Button3D label="Back" onClick={onBack} width={0.6} height={0.18} position={[0, -1.2, 0.03]} />
      </Panel>
    </group>
  );
}

export function HighscoresPanel({ scores, onBack }: { scores: HighscoreEntry[]; onBack: () => void }) {
  const rows = scores.slice(0, 10);
  return (
    <group position={PANEL_POS}>
      <Panel width={1.7} height={1.6}>
        <Label position={[0, 0.65, 0.02]} size={0.1}>
          Highscores
        </Label>
        <Label position={[-0.6, 0.48, 0.02]} anchorX="left" size={0.05} color={UI.inkSoft}>
          Level
        </Label>
        <Label position={[0.15, 0.48, 0.02]} anchorX="left" size={0.05} color={UI.inkSoft}>
          Time
        </Label>
        <Label position={[0.62, 0.48, 0.02]} anchorX="right" size={0.05} color={UI.inkSoft}>
          Date
        </Label>
        {rows.length === 0 && (
          <Label position={[0, 0.15, 0.02]} size={0.055} color={UI.inkSoft}>
            No runs completed yet
          </Label>
        )}
        {rows.map((s, i) => (
          <group key={`${s.level}-${s.date}`} position={[0, 0.36 - i * 0.1, 0.02]}>
            <Label position={[-0.6, 0, 0]} anchorX="left" size={0.055}>
              {`${s.level}`}
            </Label>
            <Label position={[0.15, 0, 0]} anchorX="left" size={0.055}>
              {formatClock(s.timeMs)}
            </Label>
            <Label position={[0.62, 0, 0]} anchorX="right" size={0.045} color={UI.inkSoft}>
              {new Date(s.date).toLocaleDateString()}
            </Label>
          </group>
        ))}
        <Button3D label="Back" onClick={onBack} width={0.6} height={0.18} position={[0, -0.68, 0.03]} />
      </Panel>
    </group>
  );
}

export function ResultPanel({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  onTitle,
  danger,
}: {
  title: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  onTitle: () => void;
  danger?: boolean;
}) {
  return (
    <group position={PANEL_POS}>
      <Panel width={1.6} height={1.0}>
        <Label position={[0, 0.3, 0.02]} size={0.12} color={danger ? UI.danger : UI.ink}>
          {title}
        </Label>
        <Label position={[0, 0.1, 0.02]} size={0.055} color={UI.inkSoft} maxWidth={1.4}>
          {subtitle}
        </Label>
        <Button3D
          label={primaryLabel}
          onClick={onPrimary}
          width={0.85}
          height={0.19}
          position={[0, -0.16, 0.03]}
          color={UI.accentSoft}
        />
        <Button3D label="Back to title" onClick={onTitle} width={0.85} height={0.19} position={[0, -0.4, 0.03]} />
      </Panel>
    </group>
  );
}
