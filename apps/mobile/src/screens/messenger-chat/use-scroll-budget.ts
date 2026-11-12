// 판 안 스크롤 칸의 px 높이를 정하는 훅입니다(접근성 C1 · M1). 고정부(스크롤 밖 — 띠 · 단추 줄)와 스크롤 내용을 `layoutchange`로
// 재고, 판 최대 높이(px)에서 고정부를 뺀 만큼만 스크롤 칸에 줍니다. 계산은 scroll-budget(순수)이 지고 여기서는 잰 값만 모읍니다.

import { useRef, useState } from "@lynx-js/react";

import { scrollBodyHeightOf } from "./scroll-budget";

type LayoutDetail = { readonly detail: { readonly height?: number } };
export type LayoutHandler = (event: LayoutDetail) => void;

export type ScrollBudget = {
  /** 스크롤 칸 px 높이. 아직 못 쟀으면 null(높이를 강제하지 않음). */
  readonly height: number | null;
  /** 내용이 남는 높이를 넘어 실제로 스크롤되는가. */
  readonly scrollable: boolean;
  readonly onContentLayout: LayoutHandler;
  /** 고정부 하나의 `layoutchange`입니다. `fixedKeys`에 든 키만 셉니다. */
  readonly onFixedLayout: (key: string) => LayoutHandler;
};

export function useScrollBudget(max: number | null, fixedKeys: readonly string[]): ScrollBudget {
  const [content, setContent] = useState<number | null>(null);
  const [fixed, setFixed] = useState<Readonly<Record<string, number>>>({});
  // 같은 값이면 다시 그리지 않습니다(layoutchange가 되풀이돼도 멈춥니다).
  const handlers = useRef(new Map<string, LayoutHandler>());

  const onContentLayout: LayoutHandler = (event) => {
    "background only";
    const next = event.detail.height;
    if (typeof next === "number") setContent((prev) => (prev === next ? prev : next));
  };

  const onFixedLayout = (key: string): LayoutHandler => {
    const cached = handlers.current.get(key);
    if (cached !== undefined) return cached;
    const handler: LayoutHandler = (event) => {
      "background only";
      const next = event.detail.height;
      if (typeof next !== "number") return;
      setFixed((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
    };
    // oxlint-disable-next-line react/immutability
    handlers.current.set(key, handler);
    return handler;
  };

  const measured = fixedKeys.every((key) => typeof fixed[key] === "number");
  const fixedSum = measured ? fixedKeys.reduce((sum, key) => sum + (fixed[key] ?? 0), 0) : null;
  const height = scrollBodyHeightOf({ max, fixed: fixedSum, content });
  return {
    height,
    scrollable: height !== null && content !== null && height < Math.ceil(content),
    onContentLayout,
    onFixedLayout,
  };
}
