import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { TextField } from "@libitums/ui-lynx/text-field";

import {
  initialVerificationCode,
  isVerificationCodeComplete,
  isVerificationCodeRejected,
  verificationCodeFrom,
  verificationCodeLength,
} from "./verification-code";
import type { VerificationCodeScreenProps } from "./verification-code.contract";

import "./verification-code-screen.css";

// LIB-261 (ui-implementation): 계약(.agent-harness/work/lib-261/spec.md §0.3 D-c ·
// §2.5 · §4.2~§4.5)과 design.md §6(권고안 B)의 값을 채운다.
//
// 입력값 정규화·완성 판정은 `verificationCodeFrom`·`isVerificationCodeComplete`가
// 진다 — 이 화면은 그 결과를 상태에 두기만 한다(§2.5). `확인`에 `disabled` trait을
// 붙이지 않는다(ADR-0016 D10) — 미완성은 `data-complete`로만 낸다.
//
// LIB-261 (ui-implementation r0.3, C-1 · §0.10 (2)): 상태는 **원값**(raw)을 든다 —
// `default-value`가 네이티브에서 일회성이라(§2.6) 정규화 결과를 칸에 되쓸 수
// 없으므로, 정규화·완성·어긋남 판정은 매 렌더 원값에서 파생한다.
// `isVerificationCodeRejected`가 참이면(칸이 찼는데 완성이 아니다) `supporting`을
// 오류로 낸다 — helper와 자리를 공유하므로 오류가 helper를 대체한다(§2.6).
export function VerificationCodeScreen({
  onSubmit,
  onExit,
}: VerificationCodeScreenProps): ReactNode {
  const [rawCode, setRawCode] = useState(initialVerificationCode);
  const code = verificationCodeFrom(rawCode);
  const complete = isVerificationCodeComplete(code);
  const rejected = isVerificationCodeRejected(rawCode);

  function handleInput(value: string) {
    setRawCode(value);
  }

  function handleSubmit() {
    if (!complete) {
      return;
    }
    onSubmit();
  }

  return (
    <view className="verification-code-screen">
      <view className="verification-code-screen-header">
        <view
          className="verification-code-screen-exit"
          data-testid="verification-code-screen-exit"
          accessibility-element={true}
          accessibility-label="로그인으로"
          accessibility-traits="button"
          bindtap={onExit}
        >
          <text className="verification-code-screen-exit-label">로그인으로</text>
        </view>
        <text
          className="verification-code-screen-title"
          data-testid="verification-code-screen-title"
          accessibility-traits="header"
        >
          코드 검증
        </text>
      </view>

      <scroll-view
        className="verification-code-screen-scroll"
        data-testid="verification-code-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="verification-code-screen-content">
          <text
            className="verification-code-screen-description"
            data-testid="verification-code-screen-description"
          >
            문자로 받은 4자리 코드를 입력하세요.
          </text>

          <view
            className="verification-code-screen-input"
            data-testid="verification-code-screen-input"
          >
            <TextField
              label="인증 코드"
              purpose="telephone"
              counter={{ maxLength: verificationCodeLength }}
              supporting={
                rejected
                  ? {
                      kind: "error",
                      message: "숫자가 아닌 문자를 지우고 숫자 4자리만 입력하세요.",
                    }
                  : { kind: "helper", message: "숫자 4자리" }
              }
              defaultValue={initialVerificationCode}
              bindinput={handleInput}
            />
          </view>
        </view>
      </scroll-view>

      <view
        className="verification-code-screen-submit"
        data-testid="verification-code-screen-submit"
        data-complete={complete ? "true" : "false"}
        accessibility-element={true}
        accessibility-label="확인"
        accessibility-traits="button"
        bindtap={handleSubmit}
      >
        <text className="verification-code-screen-submit-label">확인</text>
      </view>
    </view>
  );
}
