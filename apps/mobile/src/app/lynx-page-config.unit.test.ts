import { expect, test } from "vitest";

import { LYNX_PAGE_CONFIG, withPageConfig } from "../../lynx-page-config";

// 자판 빠른 입력 누락(ADR-0112 개정 ⟨여러 손가락⟩): 호스트는 page config에 enableMultiTouch가 없으면 꺼진 것으로 보고,
// 한 손가락이 닿아 있는 동안 둘째 손가락의 touchstart를 JS에 보내지 않습니다 — 겹친 둘째 키가 통째로 사라집니다.

test("[MT-U1] page config는 여러 손가락 터치와 그 짝(touches 호환)을 켠다", () => {
  expect(LYNX_PAGE_CONFIG).toEqual({
    enableMultiTouch: true,
    enableMultiTouchParamsCompatible: true,
  });
});

test("[MT-U2] 템플릿 config에 더하면 기존 키는 남고 두 값이 켜진다", () => {
  const config = { lepusStrict: true, enableA11y: true, enableMultiTouch: false };
  const result = withPageConfig(config);
  expect(result).toEqual({
    lepusStrict: true,
    enableA11y: true,
    enableMultiTouch: true,
    enableMultiTouchParamsCompatible: true,
  });
  // 인코딩 훅은 받은 객체를 그대로 이어 넘기므로 같은 객체를 고쳐야 합니다.
  expect(result).toBe(config);
});
