export type StatusIndicatorStatus = "completed" | "in-progress" | "needs-retry" | "locked";

export type StatusIndicatorProps = {
  status: StatusIndicatorStatus;
  label: string;
  contextLabel?: string;
};

export const statusIndicatorNames: Record<StatusIndicatorStatus, string> = {
  completed: "완료",
  "in-progress": "진행 중",
  "needs-retry": "다시 시도",
  locked: "잠김",
};
export function getStatusIndicatorLabel(props: StatusIndicatorProps): string {
  const statusName = statusIndicatorNames[props.status];
  const labels = [props.contextLabel, props.label];
  if (props.label !== statusName) labels.push(statusName);
  return labels.filter((label): label is string => Boolean(label)).join(", ");
}
