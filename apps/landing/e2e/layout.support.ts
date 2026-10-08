import { expect, type Locator, type Page } from "@playwright/test";

// 레이아웃 e2e의 공용 측정 도구입니다. 폭을 테스트가 직접 정하고, 스크롤 연출이 켜진 상태
// (reducedMotion 기본)를 봅니다. 스크롤은 `behavior: "instant"`로 옮기고, 전환(opacity · 클래스)은
// toHaveCSS · poll로 안정되기를 기다립니다.

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export const wide = { width: 1440, height: 900 } as const;
export const narrow = { width: 390, height: 844 } as const;

export async function open(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // 연출이 켜졌는지(스크립트가 돌았는지) 확인합니다.
  await expect(page.locator("html")).toHaveClass(/is-enhanced/);
}

export const box = (locator: Locator): Promise<Box> =>
  locator.evaluate((node) => {
    const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
    return { left, top, right, bottom, width, height };
  });

export const scrollTo = (page: Page, top: number) =>
  page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);

/** 히어로가 붙어 있는 구간의 길이입니다. */
export const heroTravel = (page: Page) =>
  page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(".hero");
    if (!hero) throw new Error("hero 없음");
    return hero.offsetHeight - window.innerHeight;
  });

/** 값이 두 번 연속 같아질 때까지 기다립니다(부드러운 스크롤이 끝나기). */
export async function settled(read: () => Promise<number>): Promise<void> {
  let previous = Number.NaN;
  await expect
    .poll(async () => {
      const current = await read();
      const same = current === previous;
      previous = current;
      return same;
    })
    .toBe(true);
}
