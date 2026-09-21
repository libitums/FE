export type StatusIndicatorStatus = "completed" | "in-progress" | "needs-retry" | "locked";

export type StatusIndicatorProps = {
  status: StatusIndicatorStatus;
  label: string;
  contextLabel?: string;
  /** 보조기술이 읽는 상태 이름을 바꾼다. 없으면 `statusIndicatorNames`(한국어)를 쓴다 —
   *  화면 문구가 다른 언어일 때 상태 이름도 그 언어로 맞추려는 자리다. */
  statusName?: string;
};

export const statusIndicatorNames: Record<StatusIndicatorStatus, string> = {
  completed: "완료",
  "in-progress": "진행 중",
  "needs-retry": "다시 시도",
  locked: "잠김",
};
export function getStatusIndicatorLabel(props: StatusIndicatorProps): string {
  const statusName = props.statusName?.trim() || statusIndicatorNames[props.status];
  const labels = [props.contextLabel, props.label];
  if (props.label !== statusName) labels.push(statusName);
  return labels.filter((label): label is string => Boolean(label)).join(", ");
}
