import { expect, test } from "@playwright/test";
import { box, narrow, open, scrollTo, settled, style, wide } from "./layout.support";

// 레이아웃 단언(본문): Features · Story 줄 · Phrases/FAQ 두 단 · 휴대폰 틀. 공용 도구는 layout.support.ts.

test.describe("Features", () => {
  test("L-FT1 넓은 화면에서는 머무는 무대에 글(왼쪽)과 미디어(오른쪽)가 같은 줄로 놓인다", async ({
    page,
  }) => {
    await open(page, wide);
    const stage = page.locator(".features__stage");
    expect(await style(stage, "position")).toBe("sticky");

    const active = page.locator(".feature.is-active");
    await expect(active).toHaveCount(1);
    const text = await box(active.locator(".feature__text"));
    const media = await box(active.locator(".feature__media"));
    expect(text.right).toBeLessThanOrEqual(media.left + 1);
    expect(text.top).toBeLessThan(media.bottom);
    expect(media.top).toBeLessThan(text.bottom);
    // 미디어 열은 화면 높이에서 나온 폭(높이의 0.8배)을 가진다.
    expect(Math.abs(media.width - media.height * 0.8)).toBeLessThanOrEqual(1);

    const inactive = page.locator(".feature:not(.is-active) .feature__text");
    await expect(inactive).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      // 연출이 켜지는 순간 350ms 전환이 있어 안정되기를 기다립니다.
      await expect.poll(() => style(inactive.nth(index), "opacity")).toBe("0");
    }

    const { height, innerHeight } = await page.evaluate(() => ({
      height: document.querySelector<HTMLElement>(".features")?.offsetHeight ?? 0,
      innerHeight: window.innerHeight,
    }));
    expect(height).toBeGreaterThanOrEqual(3 * innerHeight);
  });

  test("L-FT2 구간의 60% 지점에서는 셋째 묶음이 켜지고 무대가 화면 위에 붙어 있다", async ({
    page,
  }) => {
    await open(page, wide);
    const { top, travel } = await page.evaluate(() => {
      const features = document.querySelector<HTMLElement>(".features");
      if (!features) throw new Error("features 없음");
      return {
        top: features.getBoundingClientRect().top + window.scrollY,
        travel: features.offsetHeight - window.innerHeight,
      };
    });
    await scrollTo(page, top + 0.6 * travel);
    await expect
      .poll(() =>
        page
          .locator(".feature")
          .evaluateAll((nodes) =>
            nodes.flatMap((node, index) => (node.classList.contains("is-active") ? [index] : [])),
          ),
      )
      .toEqual([2]);
    const stage = await box(page.locator(".features__stage"));
    expect(Math.abs(stage.top)).toBeLessThanOrEqual(1);
  });

  test("L-FT3 좁은 화면에서는 네 묶음이 글 아래 미디어로 쌓이고 모두 보인다", async ({ page }) => {
    await open(page, narrow);
    expect(await style(page.locator(".features__stage"), "position")).toBe("static");
    const features = page.locator(".feature");
    await expect(features).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      const text = features.nth(index).locator(".feature__text");
      const media = features.nth(index).locator(".feature__media");
      const t = await box(text);
      const m = await box(media);
      expect(t.bottom, `묶음 ${index}`).toBeLessThanOrEqual(m.top + 1);
      expect(Math.abs(t.left - m.left), `묶음 ${index}`).toBeLessThanOrEqual(1);
      expect(m.height, `묶음 ${index}`).toBeGreaterThan(0);
      expect(await style(text, "opacity"), `묶음 ${index}`).toBe("1");
      expect(await style(media, "opacity"), `묶음 ${index}`).toBe("1");
    }
  });
});

test.describe("Story 줄", () => {
  test("L-ST1 넓은 화면: 장면 폭 320, 줄은 가로로 넘기고 화살표 두 개가 44px 이상이다", async ({
    page,
  }) => {
    await open(page, wide);
    const first = await box(page.locator("#journey-rail > li").first());
    expect(Math.abs(first.width - 320)).toBeLessThanOrEqual(1);
    const { scrollWidth, clientWidth } = await page
      .locator("#journey-rail")
      .evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    const buttons = page.locator(".rail-buttons");
    await expect(buttons).toBeVisible();
    const each = buttons.locator("button");
    await expect(each).toHaveCount(2);
    for (let index = 0; index < 2; index += 1) {
      const b = await box(each.nth(index));
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("L-ST2 좁은 화면: 장면 폭이 화면의 72%이고 화살표는 숨는다", async ({ page }) => {
    await open(page, narrow);
    const first = await box(page.locator("#journey-rail > li").first());
    expect(Math.abs(first.width - 390 * 0.72)).toBeLessThanOrEqual(1);
    const { scrollWidth, clientWidth } = await page
      .locator("#journey-rail")
      .evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    await expect(page.locator(".rail-buttons")).toBeHidden();
  });

  test("L-ST3 화살표를 누르면 줄이 오른쪽으로 갔다가 처음으로 돌아온다", async ({ page }) => {
    await open(page, wide);
    const rail = page.locator("#journey-rail");
    const read = () => rail.evaluate((node) => node.scrollLeft);
    await page.locator('[data-rail="1"]').click();
    await expect.poll(read).toBeGreaterThan(0);
    // 부드러운 이동이 끝나기를 기다린 뒤 되돌립니다.
    await settled(read);
    await page.locator('[data-rail="-1"]').click();
    await expect.poll(read).toBe(0);
  });
});

for (const [id, name, head, list] of [
  ["PH", "Phrases", ".words__head", ".words__list"],
  ["FQ", "FAQ", ".faq__head", ".faq__list"],
] as const) {
  test.describe(name, () => {
    test(`L-${id}1 넓은 화면: 제목이 왼쪽, 목록이 오른쪽의 두 단이다`, async ({ page }) => {
      await open(page, wide);
      const h = await box(page.locator(head));
      const l = await box(page.locator(list));
      expect(h.width).toBeGreaterThan(0);
      expect(l.width).toBeGreaterThan(0);
      expect(h.right).toBeLessThanOrEqual(l.left + 1);
    });

    test(`L-${id}2 좁은 화면: 제목 아래에 목록이 한 단으로 온다`, async ({ page }) => {
      await open(page, narrow);
      const h = await box(page.locator(head));
      const l = await box(page.locator(list));
      expect(h.bottom).toBeLessThanOrEqual(l.top + 1);
      expect(Math.abs(h.left - l.left)).toBeLessThanOrEqual(1);
    });
  });
}

for (const [id, viewport] of [
  ["PM1", wide],
  ["PM2", narrow],
] as const) {
  test(`L-${id} ${viewport.width}px: 휴대폰이 미디어 틀 안에서 잘리지 않는다`, async ({ page }) => {
    await open(page, viewport);
    const medias = page.locator(".feature__media");
    await expect(medias).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      const m = await box(medias.nth(index));
      const p = await box(medias.nth(index).locator(".phone"));
      expect(p.width, `묶음 ${index}`).toBeGreaterThan(0);
      expect(p.left, `묶음 ${index} 왼쪽`).toBeGreaterThanOrEqual(m.left - 1);
      expect(p.right, `묶음 ${index} 오른쪽`).toBeLessThanOrEqual(m.right + 1);
      expect(p.top, `묶음 ${index} 위`).toBeGreaterThanOrEqual(m.top - 1);
      expect(p.bottom, `묶음 ${index} 아래`).toBeLessThanOrEqual(m.bottom + 1);
    }
  });
}
