// 테스트 지원 — 학습 문항 안내의 「본 것」 저장소 대역입니다. 제품 코드는 import하지 않습니다
// (번들에 들어가지 않습니다). 쓰는 파일의 `afterEach`가 `vi.unstubAllGlobals()`를 부릅니다.

import { vi } from "vitest";

import { learningItemGuideKinds } from "./learning-item-guide";
import type { LearningItemGuideKind } from "./learning-item-guide.contract";

export const guideSeenKey = "libitum.learning-item-guides.seen";

/** 안내 루트(종류 여섯)만 고르는 선택자입니다 — 제목 · 설명 testid는 포함하지 않습니다. */
export const guideRootSelector = learningItemGuideKinds
  .map((kind) => `[data-testid="learning-item-guide-${kind}"]`)
  .join(",");

/** 지금 문서에 서 있는 안내 루트들입니다. */
export const guideRoots = (): Element[] => Array.from(document.querySelectorAll(guideRootSelector));

export type GuideStorageDouble = {
  readonly store: Map<string, string>;
  readonly get: ReturnType<typeof vi.fn>;
  readonly set: ReturnType<typeof vi.fn>;
  readonly remove: ReturnType<typeof vi.fn>;
  /** 안내 키에 쓴 값들입니다(쓴 순서). */
  readonly guideWrites: () => string[];
  /** 안내 키에 지금 든 값을 파싱합니다. 키가 없으면 `undefined`, 파싱 실패면 원문입니다. */
  readonly savedKinds: () => unknown;
};

export type GuideStorageOptions = {
  /** 안내 키에 미리 심는 원문 값입니다. 생략하면 키가 없습니다(안 본 설치). */
  readonly raw?: string;
  /** 안내 키에 미리 심는 「본 종류」입니다. */
  readonly seen?: readonly LearningItemGuideKind[];
  /** 쓰기가 던지는 대역입니다. */
  readonly setThrows?: boolean;
  /** 같은 `NativeModules`에 함께 둘 다른 호스트 모듈 대역(효과음 · 음성 · 쓰기 등)입니다. */
  readonly modules?: Record<string, unknown>;
  /** 심을 다른 키들입니다(세션 등). */
  readonly entries?: Record<string, string>;
};

/** `NativeModules.StorageModule` 대역을 세웁니다. */
export function stubGuideStorage(options: GuideStorageOptions = {}): GuideStorageDouble {
  const store = new Map<string, string>(Object.entries(options.entries ?? {}));
  if (options.raw !== undefined) store.set(guideSeenKey, options.raw);
  else if (options.seen !== undefined) store.set(guideSeenKey, JSON.stringify(options.seen));
  const get = vi.fn((key: string) => store.get(key) ?? null);
  const set = vi.fn((key: string, value: string) => {
    if (options.setThrows === true) throw new Error("storage write failed");
    store.set(key, value);
  });
  const remove = vi.fn((key: string) => void store.delete(key));
  vi.stubGlobal("NativeModules", {
    ...options.modules,
    StorageModule: { get, set, remove },
  });
  return {
    store,
    get,
    set,
    remove,
    guideWrites: () =>
      set.mock.calls.filter(([key]) => key === guideSeenKey).map(([, value]) => String(value)),
    savedKinds: () => {
      const raw = store.get(guideSeenKey);
      if (raw === undefined) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
  };
}
