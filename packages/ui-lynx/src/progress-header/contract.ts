export type ProgressHeaderMotion = "standard" | "reduced";

export type ProgressHeaderProps = {
  title: string;
  activity: string;
  progress: number;
  exitAccessibilityLabel: string;
  motion?: ProgressHeaderMotion;
  onExit: () => void;
};

export type ProgressHeaderProgress = {
  value: number;
  percentageLabel: string;
  fillPercent: number | null;
};

export function getProgressHeaderProgress(progress: number): ProgressHeaderProgress {
  const value = Number.isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress));

  return {
    value,
    percentageLabel: `${value}%`,
    fillPercent: value === 0 ? null : value,
  };
}
