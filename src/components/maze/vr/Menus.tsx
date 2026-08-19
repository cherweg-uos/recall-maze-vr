import { Button3D, Label, Panel, SliderRow, UI } from "./ui3d";
import {
  MAX_LEVEL,
  MIN_LEVEL,
  SETTING_RANGES,
  briefingSeconds,
  formatClock,
  formatSeconds,
  mazeSeconds,
  type GameSettings,
  type HighscoreEntry,
} from "@/lib/gameSettings";
import { levelConfig } from "@/lib/maze";

const PANEL_POS: [number, number, number] = [0, 1.45, -2.6];

export function MenuRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#b3bbc0" roughness={1} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
        <Label position={[0, 0.52, 0.02]} size={0.045} color={UI.inkSoft} maxWidth={1.3}>
          Study the route, then walk it from memory
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
        <Button3D
          label="Back"
          onClick={onBack}
          width={0.55}
          height={0.18}
          position={[-0.42, -0.4, 0.03]}
        />
      </Panel>
    </group>
  );
}

type TimeKey = "briefingBase" | "briefingPerLevel" | "mazeBase" | "mazePerLevel";

export function SettingsPanel({
  settings,
  onChange,
  onBack,
}: {
  settings: GameSettings;
  onChange: (s: GameSettings) => void;
  onBack: () => void;
}) {
  const rows: TimeKey[] = ["briefingBase", "briefingPerLevel", "mazeBase", "mazePerLevel"];
  const snap = settings.turnStyle === "snap";
  return (
    <group position={PANEL_POS}>
      <Panel width={1.9} height={2.15}>
        <Label position={[0, 0.94, 0.02]} size={0.1}>
          Settings
        </Label>
        {rows.map((key, i) => {
          const r = SETTING_RANGES[key];
          return (
            <SliderRow
              key={key}
              position={[0, 0.7 - i * 0.24, 0.02]}
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
        <Label position={[0, -0.2, 0.02]} size={0.045} color={UI.inkSoft} maxWidth={1.7}>
          {`At level 10: ${formatSeconds(briefingSeconds(10, settings))} to study, ${formatSeconds(
            mazeSeconds(10, settings),
          )} to escape`}
        </Label>

        <Label position={[-0.75, -0.35, 0.02]} anchorX="left" size={0.058} color={UI.inkSoft}>
          Turning
        </Label>
        <Button3D
          label="Snap"
          onClick={() => onChange({ ...settings, turnStyle: "snap" })}
          width={0.5}
          height={0.15}
          size={0.055}
          position={[-0.35, -0.52, 0.03]}
          color={snap ? UI.accentSoft : "#e9e4d9"}
        />
        <Button3D
          label="Smooth"
          onClick={() => onChange({ ...settings, turnStyle: "smooth" })}
          width={0.5}
          height={0.15}
          size={0.055}
          position={[0.35, -0.52, 0.03]}
          color={snap ? "#e9e4d9" : UI.accentSoft}
        />

        {snap ? (
          <group>
            <Label position={[-0.75, -0.72, 0.02]} anchorX="left" size={0.05} color={UI.inkSoft}>
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
                position={[-0.45 + i * 0.45, -0.88, 0.03]}
                color={settings.snapDegrees === deg ? UI.accentSoft : "#e9e4d9"}
              />
            ))}
          </group>
        ) : (
          <SliderRow
            position={[0, -0.8, 0.02]}
            label="Turn speed"
            valueText={`${settings.smoothDegPerSec}°/s`}
            value={settings.smoothDegPerSec}
            min={SMOOTH_TURN_RANGE.min}
            max={SMOOTH_TURN_RANGE.max}
            step={SMOOTH_TURN_RANGE.step}
            onChange={(v) => onChange({ ...settings, smoothDegPerSec: v })}
          />
        )}

        <Button3D
          label="Back"
          onClick={onBack}
          width={0.6}
          height={0.18}
          position={[0, -1.0, 0.03]}
        />
      </Panel>
    </group>
  );
}


export function HighscoresPanel({
  scores,
  onBack,
}: {
  scores: HighscoreEntry[];
  onBack: () => void;
}) {
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
        <Button3D
          label="Back"
          onClick={onBack}
          width={0.6}
          height={0.18}
          position={[0, -0.68, 0.03]}
        />
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
        <Button3D
          label="Back to title"
          onClick={onTitle}
          width={0.85}
          height={0.19}
          position={[0, -0.4, 0.03]}
        />
      </Panel>
    </group>
  );
}
