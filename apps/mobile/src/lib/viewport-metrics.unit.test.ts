import { describe, expect, test, vi } from "vitest";

import { fontScaleFrom, viewportWidthFrom } from "./viewport-metrics";

// `unit` 계층: globalProps에서 화면 크기 값을 읽는 순수 함수의 입출력만 봅니다.

describe("viewport-metrics", () => {
  test("V1. 둘 다 있으면 그 값을 읽는다", () => {
    const props = { fontScale: 1.35, viewportWidth: 402 };
    expect(fontScaleFrom(props)).toBe(1.35);
    expect(viewportWidthFrom(props)).toBe(402);
  });

  test("V2. 없는 쪽은 null이고 있는 쪽은 값이다", () => {
    for (const absent of [undefined, null, "x", {}]) {
      expect(fontScaleFrom(absent)).toBeNull();
      expect(viewportWidthFrom(absent)).toBeNull();
    }
    expect(fontScaleFrom({ fontScale: 1.5 })).toBe(1.5);
    expect(viewportWidthFrom({ fontScale: 1.5 })).toBeNull();
    expect(viewportWidthFrom({ viewportWidth: 375 })).toBe(375);
    expect(fontScaleFrom({ viewportWidth: 375 })).toBeNull();
  });

  test.each([["2"], [Number.NaN], [Number.POSITIVE_INFINITY], [0], [-1], [true], [{}]])(
    "V3. 틀린 값 %s는 null이고 던지지 않는다",
    (value) => {
      expect(fontScaleFrom({ fontScale: value })).toBeNull();
      expect(viewportWidthFrom({ viewportWidth: value })).toBeNull();
    },
  );

  // Android 메인 스레드의 globalProps는 `Reflect.get`이 던지는 엔진 값입니다(`app-version` AV5).
  test("V4. Reflect.get이 던지는 환경에서도 값을 읽는다", () => {
    const spy = vi.spyOn(Reflect, "get").mockImplementation(() => {
      throw new TypeError("not an object");
    });
    // `expect`도 안에서 `Reflect.get`을 쓰므로 읽기만 가로챈 채로 하고 비교는 되돌린 뒤에 합니다.
    let read: readonly (number | null)[] | Error;
    try {
      read = [fontScaleFrom({ fontScale: 1.2 }), viewportWidthFrom({ viewportWidth: 360 })];
    } catch (error) {
      read = error as Error;
    } finally {
      spy.mockRestore();
    }
    expect(read).toEqual([1.2, 360]);
  });
});
