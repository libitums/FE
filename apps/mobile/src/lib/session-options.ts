import type { UiCopy } from "./ui-copy.contract";

// 세션 옵션 어휘 자리입니다.
//
// 화면 폴더가 아니라 `lib/`에 두는 근거는 `code.md` 「import」의 승격 조건입니다 —
// 소유가 흐려지면 `src/lib/`로 승격합니다. `SessionOptions`가 가리키는 것은 세션이지
// 설정 화면이 아니고, 설정이 쓰고 듣기가 읽습니다. `lib/answer-result.ts`가 같은
// 근거로 올라온 선례입니다. 이 모듈은 타입과 순수 함수뿐입니다 — UI를 import하지
// 않습니다.

export type SessionOptionKey = "auto-play-audio" | "show-transcript";
export type SessionOptions = Readonly<Record<SessionOptionKey, boolean>>;

export const sessionOptionKeys: readonly SessionOptionKey[] = [
  "auto-play-audio",
  "show-transcript",
];

// 자동 재생은 켜짐, 대본은 꺼짐이 초기값입니다 — 문항마다 진짜 음성이 붙어서 소리만으로
// 풀 수 있고, 대본이 처음부터 보이면 정답이 드러납니다(사용자 결정 2026-10-21 「답한 뒤에만
// 보임」). 판정이 난 뒤에는 화면이 대본을 열어 보여 줍니다. 설정의 「대본 표시」를 켜면
// 처음부터 보입니다.
export const initialSessionOptions: SessionOptions = {
  "auto-play-audio": true,
  "show-transcript": false,
};

export function sessionOptionLabel(key: SessionOptionKey, copy: UiCopy): string {
  return copy.settings.sessionOption[key];
}

export function sessionOptionStateLabel(value: boolean, copy: UiCopy): string {
  return value ? copy.settings.optionState.on : copy.settings.optionState.off;
}

// 구분자는 쉼표 + 공백입니다(ADR-0016 D3).
export function sessionOptionAccessibilityLabel(
  key: SessionOptionKey,
  value: boolean,
  copy: UiCopy,
): string {
  return `${sessionOptionLabel(key, copy)}, ${sessionOptionStateLabel(value, copy)}`;
}

// 입력을 바꾸지 않고 새 객체를 돌려줍니다. 값이 안 바뀌는 경우가 없으므로(토글)
// 「같은 참조」 규약은 두지 않습니다.
export function toggleSessionOption(
  options: SessionOptions,
  key: SessionOptionKey,
): SessionOptions {
  return { ...options, [key]: !options[key] };
}
