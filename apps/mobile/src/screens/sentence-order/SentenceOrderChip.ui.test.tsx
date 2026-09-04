import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SentenceOrderChip } from "./SentenceOrderChip";

// `ui` 계층: 렌더 결과와 상호작용만 본다 (ADR-0006 D4). 계산된 스타일을 볼 수 없으므로
// `toHaveClass` · `toHaveStyle` · `toBeVisible`을 쓰지 않는다. 상태는 전부 속성으로
// 관찰한다 (「관찰 채널 넷」).
//
// 계약: .agent-harness/work/lib-229/spec.md §1.8(d) 표 · §3.2 · §2.1~§2.3.
// 이 컴포넌트는 상태를 갖지 않는다 — props에서만 파생한다 (§1.8(b)).
//
// 놓임/안 놓임은 두 값 — `placedOrdinal === null`(창고) / `placedOrdinal`이 수(문장 줄).
// 판정은 이 컴포넌트에 붙지 않는다 — 조각은 정오를 모른다(§1.8(d)).

// ------------------------------------------------------------- 채널 1: 상태 `data-*`

// 창고(placedOrdinal === null)에서 data-placed가 "none"이다. 조건부로 속성을 빼지
// 않는다 — "속성을 붙이는 것을 잊었다"와 "놓이지 않았다"가 구별되어야 한다(§1.8(d)).
test("창고에 있으면 data-placed가 none이다 · 이름 텍스트가 text와 같다", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={null} onTap={() => {}} />);

  const root = screen.getByTestId("sentence-order-chip-0");
  expect(root).toHaveAttribute("data-placed", "none");
  expect(root).toHaveTextContent("밥을");
});

// 배치되면 data-placed가 1-based 자리 번호 문자열이다.
test("배치되면 data-placed가 놓인 자리(1-based) 문자열이다", () => {
  render(<SentenceOrderChip index={1} text="먹었다" placedOrdinal={2} onTap={() => {}} />);

  expect(screen.getByTestId("sentence-order-chip-1")).toHaveAttribute("data-placed", "2");
});

// ------------------------------------------------------------- 채널 2: `accessibility-*`

// 창고에서는 접미사가 없다 — 라벨이 text와 정확히 같다(ADR-0016 D3: 비선택은 이름만).
test("창고에 있으면 accessibility-label이 text와 정확히 같다 — 접미사 없음", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={null} onTap={() => {}} />);

  expect(screen.getByTestId("sentence-order-chip-0")).toHaveAttribute(
    "accessibility-label",
    "밥을",
  );
});

// 배치되면 접미사 ", N번째"가 붙는다. 구분자는 쉼표 + 공백(ADR-0016 D3).
test("배치되면 accessibility-label에 ', N번째' 접미사가 붙는다", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={2} onTap={() => {}} />);

  expect(screen.getByTestId("sentence-order-chip-0")).toHaveAttribute(
    "accessibility-label",
    "밥을, 2번째",
  );
});

// 두 상태 다 조작 단위의 이름·역할이 붙는다. `disabled`로 바뀌지 않는다(ADR-0016 D10 —
// 채점 뒤 조각은 다음 문항에서 다시 눌린다).
for (const placedOrdinal of [null, 1, 2] as const) {
  test(`조작 단위에 element·traits가 붙는다 — placedOrdinal=${String(placedOrdinal)}`, () => {
    render(
      <SentenceOrderChip index={0} text="밥을" placedOrdinal={placedOrdinal} onTap={() => {}} />,
    );

    const root = screen.getByTestId("sentence-order-chip-0");
    expect(root).toHaveAttribute("accessibility-element", "true");
    expect(root).toHaveAttribute("accessibility-traits", "button");
  });
}

// ADR-0016 D3: 상태는 라벨 접미사이고 `accessibility-value`를 쓰지 않는다.
for (const placedOrdinal of [null, 1, 2] as const) {
  test(`accessibility-value를 쓰지 않는다 — placedOrdinal=${String(placedOrdinal)}`, () => {
    render(
      <SentenceOrderChip index={0} text="밥을" placedOrdinal={placedOrdinal} onTap={() => {}} />,
    );

    expect(screen.getByTestId("sentence-order-chip-0")).not.toHaveAttribute("accessibility-value");
  });
}

// ------------------------------------------------------------- 채널 3: 보이는 자리 번호

// 창고에서는 자리 번호 래퍼가 렌더되지 않는다(§1.8(d): "placedOrdinal !== null일 때만
// 렌더된다").
test("창고에 있으면 자리 번호가 텍스트에 없다", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={null} onTap={() => {}} />);

  const root = screen.getByTestId("sentence-order-chip-0");
  expect(root).not.toHaveTextContent("1");
  expect(root).not.toHaveTextContent("2");
});

// 배치되면 자리 번호가 보이는 텍스트로도 나온다 — design §4.3-a가 채택한 값을 계약이
// 확정했다(§1.8(d): "자리 번호를 「보이는 채널」로도 낸다").
test("배치되면 자리 번호가 보이는 텍스트로 나온다", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={2} onTap={() => {}} />);

  expect(screen.getByTestId("sentence-order-chip-0")).toHaveTextContent("2");
});

// 자리 번호 래퍼는 가려진다 — 가림은 자손을 가진 래퍼가 진다(§1.8(d) · §5.2). 자손 없는
// `<text>`에 가림을 걸면 무동작이라 래퍼가 하나 는다.
test("배치되면 자리 번호 래퍼가 accessibility-elements-hidden=true다", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={2} onTap={() => {}} />);

  const slot = screen
    .getByTestId("sentence-order-chip-0")
    .querySelector<HTMLElement>(".sentence-order-chip-slot");

  expect(slot).not.toBeNull();
  expect(slot).toHaveTextContent("2");
  expect(slot).toHaveAttribute("accessibility-elements-hidden", "true");
});

// 이름을 지는 요소(라벨)는 가리지 않는다 — 접근성 속성이 없다(ADR-0016 D5).
for (const placedOrdinal of [null, 1, 2] as const) {
  test(`이름 <text>에는 접근성 속성이 없다 — placedOrdinal=${String(placedOrdinal)}`, () => {
    render(
      <SentenceOrderChip index={0} text="밥을" placedOrdinal={placedOrdinal} onTap={() => {}} />,
    );

    const label = screen
      .getByTestId("sentence-order-chip-0")
      .querySelector<HTMLElement>(".sentence-order-chip-label");

    expect(label).not.toBeNull();
    expect(label).toHaveTextContent("밥을");
    expect(label).not.toHaveAttribute("accessibility-element");
    expect(label).not.toHaveAttribute("accessibility-label");
  });
}

// DOM 순서는 번호 → 이름이다(§1.8(d) 마지막 항목).
test("배치되면 DOM 순서가 번호 → 이름이다", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={2} onTap={() => {}} />);

  const root = screen.getByTestId("sentence-order-chip-0");
  const slot = root.querySelector<HTMLElement>(".sentence-order-chip-slot");
  const label = root.querySelector<HTMLElement>(".sentence-order-chip-label");

  expect(slot).not.toBeNull();
  expect(label).not.toBeNull();
  // eslint-disable-next-line no-bitwise
  expect(slot!.compareDocumentPosition(label!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

// ------------------------------------------------------------- 상호작용

// tap하면 onTap이 index로 정확히 한 번 불린다. 배치와 해제 둘 다 같은 콜백이다 — 어느
// 쪽인지는 컴포넌트가 아니라 리듀서가 정한다(§1.6(a)).
test("tap하면 onTap이 index로 정확히 한 번 불린다", () => {
  const onTap = vi.fn<(index: number) => void>();
  render(<SentenceOrderChip index={2} text="먹었다" placedOrdinal={null} onTap={onTap} />);

  fireEvent.tap(screen.getByTestId("sentence-order-chip-2"), {});

  expect(onTap).toHaveBeenCalledTimes(1);
  expect(onTap).toHaveBeenCalledWith(2);
});

// 0번 조각 — **0은 falsy다.** truthy 분기가 들어오면 0번 조각만 조용히 죽는다.
test("0번 조각을 tap해도 onTap이 0으로 불린다 — 0은 falsy다", () => {
  const onTap = vi.fn<(index: number) => void>();
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={null} onTap={onTap} />);

  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});

  expect(onTap).toHaveBeenCalledTimes(1);
  expect(onTap).toHaveBeenCalledWith(0);
});

// 이미 배치된 조각도 tap을 위로 올린다 — 배치/해제 판정은 리듀서의 일이지 컴포넌트의
// 일이 아니다(§1.6(a): "컴포넌트에 두 번째 게이트를 두지 않는다").
test("배치된 조각도 tap하면 onTap이 불린다 — 판정은 리듀서의 일이다", () => {
  const onTap = vi.fn<(index: number) => void>();
  render(<SentenceOrderChip index={1} text="먹었다" placedOrdinal={2} onTap={onTap} />);

  fireEvent.tap(screen.getByTestId("sentence-order-chip-1"), {});

  expect(onTap).toHaveBeenCalledTimes(1);
  expect(onTap).toHaveBeenCalledWith(1);
});

// 이 컴포넌트는 상태를 갖지 않는다 — tap해도 렌더된 data-placed는 그대로다.
test("tap해도 렌더된 data-placed는 그대로다 — 컴포넌트는 상태를 갖지 않는다", () => {
  render(<SentenceOrderChip index={0} text="밥을" placedOrdinal={null} onTap={() => {}} />);

  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});

  expect(screen.getByTestId("sentence-order-chip-0")).toHaveAttribute("data-placed", "none");
});
