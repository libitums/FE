import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "./back-handler";
import { useLayerBack, useScreenBack } from "./use-back-handler";

// `ui` 계층: 등록 훅이 컴포넌트 수명에 맞춰 스택을 드나드는지 봅니다. 스택은 실물입니다.
// 뒤로가기는 `backHandlers.runTop()`으로 흉내 냅니다.

afterEach(() => {
  cleanup();
  // 해제의 증거: 정리 뒤 스택이 비어 있어야 다음 케이스로 새지 않습니다.
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function ScreenProbe({ handler }: { handler: (() => void) | null }) {
  useScreenBack(handler);
  return <view />;
}

function LayerProbe({ handler }: { handler: (() => void) | null }) {
  useLayerBack(handler);
  return <view />;
}

function Pair({ screen, layer }: { screen: () => void; layer: () => void }) {
  useScreenBack(screen);
  return <LayerProbe handler={layer} />;
}

test("[UH1] useScreenBack(fn) 마운트 → runTop()이 fn을 부르고, 언마운트 뒤에는 false", () => {
  const fn = vi.fn<() => void>();
  const view = render(<ScreenProbe handler={fn} />);

  expect(backHandlers.runTop()).toBe(true);
  expect(fn).toHaveBeenCalledTimes(1);

  view.unmount();
  expect(backHandlers.runTop()).toBe(false);
  expect(fn).toHaveBeenCalledTimes(1);
});

test("[UH2] 리렌더로 함수가 바뀌면 최신 함수가 불린다", () => {
  const first = vi.fn<() => void>();
  const second = vi.fn<() => void>();
  const view = render(<ScreenProbe handler={first} />);

  act(() => {
    view.rerender(<ScreenProbe handler={second} />);
  });
  expect(backHandlers.runTop()).toBe(true);

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

test("[UH3] fn → null → fn 전환이 등록을 뺐다가 다시 넣는다", () => {
  const fn = vi.fn<() => void>();
  const view = render(<ScreenProbe handler={fn} />);

  act(() => {
    view.rerender(<ScreenProbe handler={null} />);
  });
  expect(backHandlers.runTop()).toBe(false);
  expect(fn).not.toHaveBeenCalled();

  act(() => {
    view.rerender(<ScreenProbe handler={fn} />);
  });
  expect(backHandlers.runTop()).toBe(true);
  expect(fn).toHaveBeenCalledTimes(1);
});

test("[UH4] 부모 useScreenBack + 같은 렌더의 자식 useLayerBack → 자식(층)이 불린다", () => {
  const screenFn = vi.fn<() => void>();
  const layerFn = vi.fn<() => void>();
  render(<Pair screen={screenFn} layer={layerFn} />);

  expect(backHandlers.runTop()).toBe(true);

  expect(layerFn).toHaveBeenCalledTimes(1);
  expect(screenFn).not.toHaveBeenCalled();
});
