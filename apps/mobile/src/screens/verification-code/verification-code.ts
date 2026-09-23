// 코드 검증 순수 로직을 소유합니다. 판정은 이 모듈이 지고, 화면은 결과를 상태에
// 둡니다 — native `maxlength`와 키패드가 대부분을 막지만 막는 것과 판정하는 것은
// 다릅니다.

export const verificationCodeLength = 4;

export const initialVerificationCode = "";

// 숫자가 아닌 문자를 버리고 앞 `verificationCodeLength`자만 남깁니다. native
// `maxlength`와 키패드가 대부분을 막지만, 막는 것과 판정하는 것은 다릅니다.
export function verificationCodeFrom(value: string): string {
  return value.replace(/\D/g, "").slice(0, verificationCodeLength);
}

// 길이가 정확히 `verificationCodeLength`일 때만 참입니다 — 검증이 아니라 「입력이
// 끝났는가」만 판정합니다(서버가 없어 옳고 그름을 가리지 않습니다).
export function isVerificationCodeComplete(code: string): boolean {
  return code.length === verificationCodeLength;
}

// 원값이 `verificationCodeLength`만큼 찼는데도 완성이 아닐 때 참입니다 — 버려진
// 문자가 있어서 `확인`이 무동작인 상태를 가리킵니다. 세는 단위는
// `Array.from(value).length`(코드 포인트, `TextField` 카운터와 같은 규칙)이고,
// 입력을 정규화하지 않습니다. 발동 조건은 「막다른 자리」입니다 — 원값이 버려질
// 문자를 하나라도 담고 있다는 사실이 아니라, 칸이 다 찼는데도(원값 코드 포인트
// 수가 `verificationCodeLength` 이상) 정규화 결과가 완성이 아니라는 사실만
// 봅니다. 그래서 아직 치는 중인 값(짧은 원값)이나 버려졌어도 결국 완성인 값
// (`1*234`·`12345`)은 거짓입니다.
export function isVerificationCodeRejected(value: string): boolean {
  const isFilled = Array.from(value).length >= verificationCodeLength;
  return isFilled && !isVerificationCodeComplete(verificationCodeFrom(value));
}

// 코드 유효 시간(초)입니다. 2026-09-21 디자인 반영: 코드 칸 아래 5분 카운트다운을
// 보이고, Resend를 누르면 처음부터 다시 셉니다. 서버가 없어 만료돼도 입력을 막지
// 않습니다.
export const verificationCodeValidSeconds = 5 * 60;

// 남은 초를 `MM:SS`로 적습니다. 음수는 0으로 봅니다.
export function formatVerificationCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
