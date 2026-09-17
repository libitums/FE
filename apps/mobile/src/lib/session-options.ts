// 세션 옵션 어휘 자리 (D-a · D-b — .agent-harness/work/lib-259/spec.md §2.1).
//
// 화면 폴더가 아니라 lib/에 두는 근거: `code.md` 「import」 — 소유가 흐려지면
// `src/lib/`로 승격한다. `SessionOptions`가 가리키는 것은 세션이지 설정 화면이
// 아니고, 설정이 쓰고 듣기가 읽는다(계약 §2.1). `lib/answer-result.ts`가 같은
// 근거로 올라온 선례다. 이 모듈은 타입과 순수 함수뿐이다 — UI를 import하지 않는다.
//
// LIB-259 (logic): §2.1이 고정한 동작과 값을 채운다. DOM·컴포넌트·저장소를
// 만지지 않는다(순수 함수뿐).

export type SessionOptionKey = "auto-play-audio" | "show-transcript";
export type SessionOptions = Readonly<Record<SessionOptionKey, boolean>>;
export type SessionOptionLabel = "자동 재생" | "대본 표시";
export type SessionOptionStateLabel = "켜짐" | "꺼짐";

export const sessionOptionKeys: readonly SessionOptionKey[] = [
  "auto-play-audio",
  "show-transcript",
];

// 둘 다 켜짐이 초기값이다(§0.3 D-a) — 오늘 동작(자동 재생 함 · 대본 보임)이
// 기본이어야 수용 기준 5·6·7이 동시에 참이 되고, 오늘 번들의 문항 오디오가
// 기계 음성이라 대본을 끄면 문항을 풀 수 없다(대가를 알고 받아들인 값 — 바꾸지
// 않는다).
export const initialSessionOptions: SessionOptions = {
  "auto-play-audio": true,
  "show-transcript": true,
};

// export하지 않는다 — 표를 내보내면 다음 사람이 직접 색인해 자기 답을 짓는다
// (`notifications.ts` 선례, 계약 §2.1). 키가 늘면 `TS2741`로 선다(§3 X1).
const sessionOptionLabels: Record<SessionOptionKey, SessionOptionLabel> = {
  "auto-play-audio": "자동 재생",
  "show-transcript": "대본 표시",
};

export function sessionOptionLabel(key: SessionOptionKey): SessionOptionLabel {
  return sessionOptionLabels[key];
}

export function sessionOptionStateLabel(value: boolean): SessionOptionStateLabel {
  return value ? "켜짐" : "꺼짐";
}

// 구분자는 쉼표 + 공백이다(ADR-0016 D3).
export function sessionOptionAccessibilityLabel(key: SessionOptionKey, value: boolean): string {
  return `${sessionOptionLabel(key)}, ${sessionOptionStateLabel(value)}`;
}

// 입력을 바꾸지 않고 새 객체를 돌려준다. 값이 안 바뀌는 경우가 없으므로(토글)
// 「같은 참조」 규약은 두지 않는다(계약 §2.1).
export function toggleSessionOption(
  options: SessionOptions,
  key: SessionOptionKey,
): SessionOptions {
  return { ...options, [key]: !options[key] };
}
