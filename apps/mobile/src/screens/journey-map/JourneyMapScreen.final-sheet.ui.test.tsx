import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { CATALOG_INTRO_KEY } from "../../lib/catalog-progress";
import { catalogUnitDomId } from "./catalog-map";
import { catalogLessonKeys, catalogProps, mapScreen } from "./JourneyMapScreen.test-support";

// `ui` 계층: 최종 테스트의 말풍선이 **스페셜 표식(124)의 아래 모서리** 밑에 서는지 봅니다. 레슨 원(100)으로
// 재면 꼬리가 표식에 파고들어 유닛과 너무 가깝습니다. 재는 값은 이 파일이 정하고(대역), 모르는 선택자는
// 못 잰 것으로 답합니다.

type Rect = { top: number; height: number; left?: number; width?: number };

function stubRects(table: Record<string, Rect>): void {
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: {
            method: string;
            success?: (res: unknown) => void;
            fail?: (res: unknown) => void;
          }) => ({
            exec: () => {
              if (options.method !== "boundingClientRect") return;
              const rect = table[selector];
              if (rect === undefined) options.fail?.({ code: 5 });
              else options.success?.(rect);
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
}

function sheetTop(): string | null {
  return screen.getByTestId("step-sheet-panel").parentElement?.getAttribute("style") ?? null;
}

afterEach(() => {
  vi.restoreAllMocks();
});

const unitTop = 300;
const table = (unitKey: string): Record<string, Rect> => ({
  [`#${catalogUnitDomId("u01-water", unitKey)}`]: { top: unitTop, height: 164 },
  "#journey-map-screen-scroll": { top: 60, height: 800 },
  "#journey-map-screen": { top: 0, height: 900 },
});
const progress = { "u01-water": [CATALOG_INTRO_KEY, ...catalogLessonKeys] };

test("FS3. 최종 테스트의 말풍선은 스페셜 표식(124) 아래 모서리에서 간격 8만큼 띄워 선다", () => {
  stubRects(table("RP"));
  render(mapScreen({ catalog: catalogProps({ progress }) }));

  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-special-unit-catalog-unit-u01-water-RP"), {
      detail: { y: unitTop + 10 },
    });
  });

  // 300 + 124 + 8입니다. 레슨 원으로 재면 300 + 100 + 8 = 408이라 꼬리가 표식에 파고듭니다.
  expect(sheetTop()).toContain(`${unitTop + 124 + 8}px`);
});

test("FS4. 레슨 유닛의 말풍선은 그대로 레슨 원(100) 아래 모서리에서 선다", () => {
  stubRects(table("S1"));
  render(
    mapScreen({
      catalog: catalogProps({ progress: { "u01-water": [CATALOG_INTRO_KEY] } }),
    }),
  );

  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-catalog-unit-u01-water-S1"), {
      detail: { y: unitTop + 10 },
    });
  });

  expect(sheetTop()).toContain(`${unitTop + 100 + 8}px`);
});
