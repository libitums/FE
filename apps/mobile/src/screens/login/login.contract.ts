// LIB-261 specification 계약. 구현·JSX를 두지 않는다. 변경하려면 specification
// 재고정이 필요하다.
//
// 계약: .agent-harness/work/lib-261/spec.md §1(컴포넌트 트리) · §4.5(testid
// 카탈로그). 이 파일은 `logic-scaffold`가 최종본으로 둔다 — 뒤 단계가 타입을 다시
// 정의하지 않는다.
//
// `login.ts`(순수 로직)와 `loginMethodLabel`의 이름·시그니처는 `logic-scaffold`가
// 초안 §9.2 할당 표의 빈틈(로그인 수단 라벨을 낼 자리가 없던 것)을 메우려고
// 처음 채웠고, 계약 보정 r0.1(§0.8(2) · §2.5-1)이 그 이름·시그니처를 그대로
// 확정했다 — `screens/login/login.ts`는 이제 계약이 소유하는 자리다.

import type { EntryLoginMethod } from "../../lib/entry-flow";

export type LoginScreenProps = {
  readonly onSelectMethod: (method: EntryLoginMethod) => void;
};

export type LoginTestId =
  | "login-screen-scroll"
  | "login-screen-title"
  | "login-screen-phone-field"
  | `login-screen-method-${EntryLoginMethod}`;
