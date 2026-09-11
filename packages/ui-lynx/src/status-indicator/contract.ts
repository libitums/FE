export type StatusIndicatorStatus = "completed" | "in-progress" | "needs-retry" | "locked";

export type StatusIndicatorProps = {
  status: StatusIndicatorStatus;
  label: string;
  contextLabel?: string;
};
