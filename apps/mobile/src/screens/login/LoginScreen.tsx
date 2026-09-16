import type { ReactNode } from "@lynx-js/react";

import { TextField } from "@libitums/ui-lynx/text-field";

import { entryLoginMethods } from "../../lib/entry-flow";
import { loginMethodLabel } from "./login";
import type { LoginScreenProps } from "./login.contract";

import "./login-screen.css";

// LIB-261 (ui-implementation): 계약(.agent-harness/work/lib-261/spec.md §2.5-1 ·
// §2.6 · §4.2~§4.5)과 design.md §5의 값을 채운다.
//
// 액션 행이 없다(§4.2) — 수단이 넷이라 하나만 고정할 수 없다. `phone`은 흐름 안의
// 제출 행(브랜드 면)으로, 나머지 셋은 경계 + 흰 면 행으로 선다(design §5.1·§5.4).
// 전화번호 입력값은 어디에도 저장·전송되지 않는다(§0.5 A6) — 이 화면은 값을
// 들고 있지 않는다.
const secondaryMethods = entryLoginMethods.filter((method) => method !== "phone");

export function LoginScreen({ onSelectMethod }: LoginScreenProps): ReactNode {
  return (
    <view className="login-screen">
      <text
        className="login-screen-title"
        data-testid="login-screen-title"
        accessibility-traits="header"
      >
        로그인
      </text>

      <scroll-view
        className="login-screen-scroll"
        data-testid="login-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="login-screen-content">
          <view className="login-screen-phone-field" data-testid="login-screen-phone-field">
            <TextField
              label="전화번호"
              placeholder="01012345678"
              purpose="telephone"
              availability="enabled"
            />
          </view>

          {/* `phone`은 나머지 셋과 같은 조작 단위이지만 시각은 제출 행(브랜드 면)이다
              (design §5.1 · §5.4). `entryLoginMethods`의 첫 항목이라 DOM 순서가
              곧 어휘 순서다(LG-U1). */}
          <view
            className="login-screen-submit"
            data-testid="login-screen-method-phone"
            accessibility-element={true}
            accessibility-label={loginMethodLabel("phone")}
            accessibility-traits="button"
            bindtap={() => onSelectMethod("phone")}
          >
            <text className="login-screen-submit-label">{loginMethodLabel("phone")}</text>
          </view>

          <view className="login-screen-methods">
            {secondaryMethods.map((method) => (
              <view
                key={method}
                className="login-screen-method"
                data-testid={`login-screen-method-${method}`}
                accessibility-element={true}
                accessibility-label={loginMethodLabel(method)}
                accessibility-traits="button"
                bindtap={() => onSelectMethod(method)}
              >
                <text className="login-screen-method-label">{loginMethodLabel(method)}</text>
              </view>
            ))}
          </view>
        </view>
      </scroll-view>
    </view>
  );
}
