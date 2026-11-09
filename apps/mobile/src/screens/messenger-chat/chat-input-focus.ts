// 휴대폰 입력 초점 호출입니다(messenger-chat-ui spec §3.2 · §6.2). SelectorQuery invoke를 try/catch로 감싸,
// 테스트 환경 · 요소 없음 · 네이티브가 모르는 메서드에서도 던지지 않습니다. 모두 부가 동작이라 실패는 조용히 둡니다.

import { PHONE_INPUT_ELEMENT_ID } from "./chat-input-id";

type InvokeFailure = () => void;

function invokeOn(
  selector: string,
  method: string,
  params: Record<string, unknown> | undefined,
  onFail?: InvokeFailure,
): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(selector)
      .invoke({
        method,
        params,
        fail: () => {
          onFail?.();
        },
      })
      .exec();
  } catch {
    // 테스트 환경 · 요소 없음 — 호출하지 못했습니다.
    onFail?.();
  }
}

/** 휴대폰 입력에 초점을 줍니다(키보드가 올라옵니다). */
export function focusPhoneInput(): void {
  "background only";
  invokeOn(`#${PHONE_INPUT_ELEMENT_ID}`, "focus", undefined);
}

/** 휴대폰 입력의 초점을 내립니다(키보드가 내려갑니다). */
export function blurPhoneInput(): void {
  "background only";
  invokeOn(`#${PHONE_INPUT_ELEMENT_ID}`, "blur", undefined);
}

/** 휴대폰 입력의 글을 비웁니다. 못 비우면 `onFail`이 불립니다(입력을 다시 마운트하는 길). */
export function clearPhoneInput(onFail?: InvokeFailure): void {
  "background only";
  invokeOn(`#${PHONE_INPUT_ELEMENT_ID}`, "setValue", { value: "" }, onFail);
}

/**
 * 겹침이 닫힌 뒤 접근성 초점을 연 단추로 돌려 줍니다(AC10). 요소는 test-id를 `id`로도 갖는 **접근성 요소**여야 합니다 —
 * 접근성 요소가 아닌 감싸개에는 Android `ACTION_ACCESSIBILITY_FOCUS`가 듣지 않을 수 있습니다(a11y C1).
 * 메서드 이름은 `@lynx-js/types` 4.1.0에 있습니다(`requestAccessibilityFocus`, Android · iOS). 기기에서 실제로 옮겨지는지는
 * e2e 수동 절차(MC-E7)로만 확인합니다 — 요소가 없거나 모르는 메서드면 조용히 무동작입니다.
 */
export function restoreAccessibilityFocus(testId: string): void {
  "background only";
  invokeOn(`#${testId}`, "requestAccessibilityFocus", undefined);
}

/** 「…」 메뉴가 열릴 때 첫 항목으로 접근성 초점을 보냅니다(a11y M7). 같은 호출이지만 「돌려주기」와 구별해 따로 이름을 둡니다. */
export function requestAccessibilityFocusOn(testId: string): void {
  "background only";
  invokeOn(`#${testId}`, "requestAccessibilityFocus", undefined);
}
