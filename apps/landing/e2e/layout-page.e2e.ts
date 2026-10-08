import { expect, test } from "@playwright/test";
import { box, heroTravel, narrow, open, scrollTo, wide } from "./layout.support";

// 레이아웃 단언(전체): 머리 · 히어로 · 섹션 간격. 공용 도구는 layout.support.ts.

test.describe("머리", () => {
  for (const viewport of [wide, narrow]) {
    test(`L-HD1 ${viewport.width}px: 머리의 요소가 겹치지 않고 한 줄 안에 있다`, async ({
      page,
    }) => {
      await open(page, viewport);
      const items = await page
        .locator("#site-header a, #site-header summary")
        .evaluateAll((nodes) =>
          nodes
            // 닫힌 언어 메뉴의 링크는 사각형만 남아 있으므로 렌더되는 것만 셉니다.
            .filter((node) => node.checkVisibility())
            .map((node) => node.getBoundingClientRect())
            .filter((r) => r.width > 0)
            .map((r) => ({ left: r.left, top: r.top, right: r.right, height: r.height })),
        );
      expect(items).toHaveLength(viewport.width === 1440 ? 7 : 3);
      for (let a = 0; a < items.length; a += 1) {
        for (let b = a + 1; b < items.length; b += 1) {
          const x = items[a];
          const y = items[b];
          if (!x || !y) throw new Error("범위 밖");
          expect(
            x.right <= y.left + 0.5 || y.right <= x.left + 0.5,
            `${a}번과 ${b}번이 가로로 겹침`,
          ).toBe(true);
        }
      }
      const inner = await box(page.locator("#site-header .site-header__inner"));
      for (const item of items) {
        expect(item.left).toBeGreaterThanOrEqual(inner.left);
        expect(item.right).toBeLessThanOrEqual(inner.right);
      }
      const centers = items.map((item) => item.top + item.height / 2);
      expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
    });

    test(`L-HD2 ${viewport.width}px: 히어로가 풀리는 지점에서 머리가 배경을 얻는다`, async ({
      page,
    }) => {
      await open(page, viewport);
      const header = page.locator("#site-header");
      const travel = await heroTravel(page);
      await scrollTo(page, travel - 1);
      await expect(header).not.toHaveClass(/is-solid/);
      await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await scrollTo(page, travel + 1);
      await expect(header).toHaveClass(/is-solid/);
      await expect(header).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    });

    test(`L-HR1 ${viewport.width}px: 히어로의 두 문장이 같은 자리에서 교대한다`, async ({
      page,
    }) => {
      await open(page, viewport);
      const a = page.locator(".hero__line--a");
      const b = page.locator(".hero__line--b");
      await expect(a).toHaveCSS("opacity", "1");
      await expect(b).toHaveCSS("opacity", "0");
      await scrollTo(page, await heroTravel(page));
      await expect(a).toHaveCSS("opacity", "0");
      await expect(b).toHaveCSS("opacity", "1");
      // 이동 연출(transform)과 무관한 배치 자리를 비교합니다.
      const aBottom = await a.evaluate(
        (node) => (node as HTMLElement).offsetTop + (node as HTMLElement).offsetHeight,
      );
      const bBottom = await b.evaluate(
        (node) => (node as HTMLElement).offsetTop + (node as HTMLElement).offsetHeight,
      );
      expect(Math.abs(aBottom - bBottom)).toBeLessThanOrEqual(2);
    });
  }
});

test.describe("섹션", () => {
  for (const viewport of [wide, narrow]) {
    test(`L-SC1 ${viewport.width}px: 여덟 섹션이 세로로 겹치지 않고 차례로 놓인다`, async ({
      page,
    }) => {
      await open(page, viewport);
      const boxes = await page.locator("main > section").evaluateAll((nodes) =>
        nodes.map((node) => {
          const { top, bottom } = node.getBoundingClientRect();
          return { top, bottom };
        }),
      );
      expect(boxes).toHaveLength(8);
      for (let index = 1; index < boxes.length; index += 1) {
        const previous = boxes[index - 1];
        const next = boxes[index];
        if (!previous || !next) throw new Error("범위 밖");
        expect(next.top, `${index}번째 섹션`).toBeGreaterThanOrEqual(previous.bottom - 1);
      }
      expect(boxes[0]?.top ?? 99).toBeLessThanOrEqual(1);
    });

    test(`L-SC2 ${viewport.width}px: 섹션마다 위아래 안쪽 여백이 있다`, async ({ page }) => {
      await open(page, viewport);
      const selectors = [
        "#manifesto",
        "#journey",
        "#words",
        "#faq",
        'section[aria-labelledby="closing-quote"]',
        "#download",
        viewport.width === 1440 ? ".features__stage" : "#ways",
      ];
      for (const selector of selectors) {
        const pads = await page.locator(selector).evaluate((node) => {
          const computed = getComputedStyle(node);
          return {
            top: Number.parseFloat(computed.paddingTop),
            bottom: Number.parseFloat(computed.paddingBottom),
          };
        });
        expect(pads.top, `${selector} 위`).toBeGreaterThan(0);
        expect(pads.bottom, `${selector} 아래`).toBeGreaterThan(0);
        if (selector === ".features__stage") expect(pads.top).toBeGreaterThanOrEqual(64);
      }
    });
  }
});
