export type StatusIndicatorStatus = "completed" | "in-progress" | "needs-retry" | "locked";

export type StatusIndicatorProps = {
  status: StatusIndicatorStatus;
  label: string;
  contextLabel?: string;
  /** 보조기술이 읽는 상태 이름을 바꿉니다. 없으면 `statusIndicatorNames`(한국어)를 씁니다 —
   *  화면 문구가 다른 언어일 때 상태 이름도 그 언어로 맞추려는 자리입니다. */
  statusName?: string;
};

export const statusIndicatorNames: Record<StatusIndicatorStatus, string> = {
  completed: "Completed",
  "in-progress": "In progress",
  "needs-retry": "Try again",
  locked: "Locked",
};
export function getStatusIndicatorLabel(props: StatusIndicatorProps): string {
  const statusName = props.statusName?.trim() || statusIndicatorNames[props.status];
  const labels = [props.contextLabel, props.label];
  if (props.label !== statusName) labels.push(statusName);
  return labels.filter((label): label is string => Boolean(label)).join(", ");
}
