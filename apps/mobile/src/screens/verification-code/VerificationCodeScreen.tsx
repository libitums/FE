import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { CompactNumericInput } from "@libitums/ui-lynx/compact-numeric-input";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { announce } from "../../lib/accessibility";
import { authFailureMessage } from "../../lib/auth-failure";
import { useScreenBack } from "../../lib/use-back-handler";
import {
  canSubmitVerificationCode,
  formatVerificationCountdown,
  isVerificationCodeBusy,
  isVerificationCodeComplete,
  verificationCodeFrom,
  verificationCodeLength,
  verificationCodeValidSeconds,
} from "./verification-code";
import type {
  VerificationCodeScreenProps,
  VerificationCodeStatus,
} from "./verification-code.contract";

import "./verification-code-screen.css";

// 완성 판정은 `verificationCodeFrom`·`isVerificationCodeComplete`가 집니다.
// `Continue`에 `disabled` trait을 붙이지 않습니다(ADR-0016 D10) — 미완성은
// `data-complete`로만 냅니다.
//
// 2026-09-21 디자인 반영: 머리는 로그인과 같은 형태입니다 — 좌상단 RoundButton
// 뒤로가기 → 제목 · 안내(caption) → 로그인에서 입력한 번호(label-l). 그 아래 한
// 자리 칸 넷(CompactNumericInput) → 5분 카운트다운 → 「Didn't receive the
// code?」 + Resend → Continue → 순서로 섭니다. 칸마다 숫자 하나만 받으므로
// (input-filter) 옛 TextField의 오류 채널은 없습니다.
const digitIndexes = Array.from({ length: verificationCodeLength }, (_, index) => index);

function digitSelector(index: number): string {
  return `.verification-code-screen-digit-${index} .ui-lynx-compact-numeric-input`;
}

// 숫자를 넣으면 다음 칸으로 포커스를 옮깁니다. 칸 컴포넌트가 포커스 API를 내지
// 않아 화면이 SelectorQuery로 네이티브 input의 focus를 부릅니다.
function focusDigit(index: number) {
  "background only";
  if (index >= verificationCodeLength) return;
  // 포커스 이동은 편의입니다 — 네이티브가 없는 곳(테스트 환경의 SelectorQuery는
  // invoke를 구현하지 않습니다)에서 실패해도 입력 자체는 그대로 됩니다.
  try {
    lynx.createSelectorQuery().select(digitSelector(index)).invoke({ method: "focus" }).exec();
  } catch {
    // 포커스를 옮기지 못해도 입력을 막지 않습니다.
  }
}

export function VerificationCodeScreen({
  phoneNumber,
  onVerifyCode,
  onResendCode,
  onExit,
}: VerificationCodeScreenProps): ReactNode {
  const [digits, setDigits] = useState<readonly string[]>(() => digitIndexes.map(() => ""));
  const code = verificationCodeFrom(digits.join(""));
  const complete = isVerificationCodeComplete(code);

  // 검증 · 재전송의 화면 로컬 상태입니다.
  const [status, setStatus] = useState<VerificationCodeStatus>({ kind: "idle" });
  const busy = isVerificationCodeBusy(status);
  // 보이는 뒤로 버튼과 시스템 뒤로가기가 같은 함수입니다 — 요청 중에는 무동작입니다.
  const handleBack = () => {
    if (busy) return;
    onExit();
  };
  useScreenBack(handleBack);

  // 남은 초입니다. `round`는 재전송 회차이고, 칸을 다시 마운트하는 `key`로만 씁니다.
  const [remaining, setRemaining] = useState(verificationCodeValidSeconds);
  const [round, setRound] = useState(0);
  // 요청 중에 막힌 입력의 회차입니다. 칸은 네이티브 입력이라 막아도 친 숫자가 화면에 남으므로,
  // 막을 때마다 칸을 지금 값으로 다시 마운트해 보이는 코드와 보낼 코드를 맞춥니다.
  const [restoredRound, setRestoredRound] = useState(0);

  // 0에 닿으면 타이머를 걸지 않습니다 — 다 센 뒤에도 매초 깨우지 않으려고 1초짜리
  // setTimeout을 남은 초마다 새로 겁니다.
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => {
      setRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  // 실패했을 때만, 그 실패 하나당 정확히 한 번 발화합니다 — `status`는 매
  // `setStatus` 호출마다 새 객체라 같은 실패로 다시 렌더돼도 다시 불리지
  // 않습니다.
  useEffect(() => {
    if (status.kind === "failed") {
      announce(authFailureMessage(status.reason));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 재전송은 회차 · 남은 초 · 입력을 한자리에서 되돌립니다(성공했을 때만 — 탭 즉시가
  // 아니라 응답이 `sent`로 온 뒤에 되돌립니다).
  async function handleResend() {
    if (isVerificationCodeBusy(status)) {
      return;
    }
    setStatus({ kind: "resending" });
    const result = await onResendCode(phoneNumber);
    if (result.status === "sent") {
      setRound((value) => value + 1);
      setRemaining(verificationCodeValidSeconds);
      setDigits(digitIndexes.map(() => ""));
      setStatus({ kind: "idle" });
    } else {
      setStatus({ kind: "failed", reason: result.reason });
    }
  }

  // 요청 중(`verifying` · `resending`)에는 칸 입력도 무동작입니다.
  function handleDigit(index: number, value: string) {
    if (isVerificationCodeBusy(status)) {
      setRestoredRound((prev) => prev + 1);
      return;
    }
    setDigits((current) => current.map((digit, at) => (at === index ? value : digit)));
    if (value) focusDigit(index + 1);
    if (status.kind === "failed") {
      setStatus({ kind: "idle" });
    }
  }

  async function handleSubmit() {
    if (!canSubmitVerificationCode(code, status)) {
      return;
    }
    setStatus({ kind: "verifying" });
    const outcome = await onVerifyCode({ phone: phoneNumber, code });
    if (outcome.status === "verified") {
      setStatus({ kind: "idle" });
    } else {
      setStatus({ kind: "failed", reason: outcome.reason });
    }
  }

  return (
    <view className="verification-code-screen">
      <view className="verification-code-screen-header" data-testid="verification-code-screen-exit">
        <RoundButton
          accessibilityLabel="Back"
          icon={arrowLeft}
          variant="neutral"
          size="xl"
          bindtap={handleBack}
        />
      </view>

      <scroll-view
        className="verification-code-screen-scroll"
        data-testid="verification-code-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="verification-code-screen-content">
          <view className="verification-code-screen-heading">
            <text
              className="verification-code-screen-title"
              data-testid="verification-code-screen-title"
              accessibility-traits="header"
            >
              Verification code OTP
            </text>
            <view className="verification-code-screen-sent">
              <text
                className="verification-code-screen-description"
                data-testid="verification-code-screen-description"
              >
                A verification code has been sent to
              </text>
              <text
                className="verification-code-screen-phone"
                data-testid="verification-code-screen-phone"
              >
                {phoneNumber.display}
              </text>
            </view>
          </view>

          {/* 재전송하면 `round`가 바뀌며 칸이 새로 마운트됩니다. 칸은 값을 스스로 들고 있어
              (비제어) 다시 마운트하지 않으면 지운 것이 화면에 남습니다. */}
          <view
            key={`${round}-${restoredRound}`}
            className="verification-code-screen-input"
            data-testid="verification-code-screen-input"
          >
            {digitIndexes.map((index) => (
              <view
                key={index}
                className={`verification-code-screen-digit verification-code-screen-digit-${index}`}
              >
                <CompactNumericInput
                  accessibilityLabel={`Digit ${index + 1} of ${verificationCodeLength}`}
                  size="s"
                  defaultValue={digits[index]}
                  error={status.kind === "failed" && status.reason === "invalid-code"}
                  bindinput={(value) => handleDigit(index, value)}
                />
              </view>
            ))}
          </view>

          {status.kind === "failed" ? (
            <text
              className="verification-code-screen-error"
              data-testid="verification-code-screen-error"
            >
              {authFailureMessage(status.reason)}
            </text>
          ) : null}

          <view className="verification-code-screen-timing">
            <text
              className="verification-code-screen-timer"
              data-testid="verification-code-screen-timer"
            >
              {formatVerificationCountdown(remaining)}
            </text>

            <view className="verification-code-screen-resend">
              <text className="verification-code-screen-resend-hint">Didn't receive the code?</text>
              <view data-testid="verification-code-screen-resend">
                <Button
                  label="Resend"
                  variant="text"
                  size="s"
                  loading={status.kind === "resending"}
                  bindtap={() => void handleResend()}
                />
              </view>
            </view>
          </view>

          <view
            className="verification-code-screen-submit"
            data-testid="verification-code-screen-submit"
            data-complete={complete ? "true" : "false"}
            data-status={status.kind}
          >
            <Button
              label="Continue"
              variant="brand"
              size="xl"
              width="fill"
              icon={arrowRight}
              iconPosition="trailing"
              loading={status.kind === "verifying"}
              bindtap={() => void handleSubmit()}
            />
          </view>
        </view>
      </scroll-view>
    </view>
  );
}
