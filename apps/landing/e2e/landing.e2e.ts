import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const paths = ["/", "/ko/"] as const;

for (const path of paths) {
  test.describe(path, () => {
    test("가로로 넘치지 않고 콘솔 오류가 없다", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(String(error)));
      for (const width of [390, 1000, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
      }
      expect(errors).toEqual([]);
    });

    test("제목은 h1 하나에서 시작해 단계를 건너뛰지 않는다", async ({ page }) => {
      await page.goto(path);
      const levels = await page
        .locator("h1, h2, h3, h4, h5, h6")
        .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));
      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      levels.reduce((previous, level) => {
        expect(level - previous).toBeLessThanOrEqual(1);
        return level;
      }, 0);
    });

    test("FAQ는 키보드로 여닫고, 닫힌 답으로 포커스가 새지 않는다", async ({ page }) => {
      // 부드러운 스크롤이 끝나기를 기다리지 않도록 끕니다.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      const items = page.getByTestId("faq-item");
      await expect(items).toHaveCount(7);
      const first = items.nth(0).locator("summary");
      await first.focus();
      // 포커스를 받은 요소는 화면 안으로 와야 합니다(먼 섹션을 늦게 그리는 최적화가 이것을 깨뜨리면 안 됩니다).
      await expect(first).toBeInViewport();
      await page.keyboard.press("Enter");
      await expect(items.nth(0)).toHaveAttribute("open", "");
      await expect(items.nth(0).getByTestId("faq-answer")).toBeVisible();
      await page.keyboard.press("Space");
      await expect(items.nth(0)).not.toHaveAttribute("open", "");
      await expect(items.getByTestId("faq-answer").locator("a, button, input")).toHaveCount(0);
    });

    test("포커스 표시는 외곽선과 밝은 띠 두 색이다", async ({ page }) => {
      await page.goto(path);
      const brand = page.locator(".site-header .brand");
      await brand.focus();
      // 마우스 없이 준 포커스가 :focus-visible로 잡히도록 키 입력을 한 번 보냅니다.
      await page.keyboard.press("Shift");
      const style = await brand.evaluate((node) => {
        const computed = getComputedStyle(node);
        return { width: computed.outlineWidth, shadow: computed.boxShadow };
      });
      expect(style.width).toBe("3px");
      expect(style.shadow).not.toBe("none");
    });

    test("장면 줄은 포커스를 받고 화살표 키로 넘어간다", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      const rail = page.locator("#journey-rail");
      await rail.focus();
      await expect(rail).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => rail.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    });

    test("WCAG 2.1 A · AA 자동 검사 위반이 없다", async ({ page, browserName }) => {
      // 스크롤 연출이 꺼진 상태(모든 문구가 제 색으로 보이는 상태)를 봅니다.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      // WebKit에서는 axe가 어두운 구간의 큰 제목 글자색을 #000으로 잘못 읽습니다(계산된 color는 흰색입니다).
      // 대비는 엔진과 무관한 값이라 chromium · firefox의 검사에 맡깁니다.
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .disableRules(browserName === "webkit" ? ["color-contrast"] : [])
        .analyze();
      expect(
        result.violations.map(
          (violation) =>
            `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`,
        ),
      ).toEqual([]);
    });
  });

  test.describe(`${path} — 스크립트 없음`, () => {
    test.use({ javaScriptEnabled: false });

    test("FAQ 질문과 답이 모두 HTML에 있고 눌러서 열린다", async ({ page }) => {
      await page.goto(path);
      const items = page.getByTestId("faq-item");
      await expect(items).toHaveCount(7);
      for (const answer of await items.getByTestId("faq-answer").allTextContents()) {
        expect(answer.trim().length).toBeGreaterThan(0);
      }
      await items.nth(6).locator("summary").click();
      await expect(items.nth(6).getByTestId("faq-answer")).toBeVisible();
    });
  });
}

test("서체를 다른 호스트에서 받지 않고, 두 서체가 실제로 실린다", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") external.push(url.hostname);
  });
  await page.goto("/ko/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
  const loaded = await page.evaluate(() => ({
    jost: document.fonts.check('700 32px "Jost Variable"', "Duru"),
    pretendard: document.fonts.check('700 32px "Pretendard Variable"', "이야기"),
  }));
  expect(loaded).toEqual({ jost: true, pretendard: true });
});

test.describe("넓은 화면의 머리", () => {
  test.skip(({ isMobile }) => isMobile, "좁은 화면에서는 섹션 메뉴가 없습니다.");

  test("1000px에서 메뉴 넷 · 언어 메뉴 · 버튼이 한 줄이다", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto("/");
    const tops = await page
      .locator(".site-nav a, .lang-menu summary, .site-header .button")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return Math.round(rect.top + rect.height / 2);
        }),
      );
    expect(tops).toHaveLength(6);
    expect(new Set(tops).size).toBe(1);
  });

  test("FAQ 메뉴가 그 섹션으로 가고 지금 보는 곳으로 표시된다", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const link = page.locator('.site-nav a[href="#faq"]');
    await link.click();
    await expect(page.locator("#faq")).toBeInViewport();
    await expect(link).toHaveAttribute("aria-current", "true");
  });

  test("언어 메뉴로 다른 언어 홈에 가고, Escape로 닫힌다", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const menu = page.locator(".lang-menu");
    await menu.locator("summary").click();
    await page.keyboard.press("Escape");
    await expect(menu).not.toHaveAttribute("open", "");
    await menu.locator("summary").click();
    await menu.locator('a[hreflang="ko"]').click();
    await expect(page).toHaveURL(/\/ko\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  });

  test("히어로가 붙어 있는 동안은 머리가 투명하고, 풀리면 배경을 갖는다", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const header = page.locator("#site-header");
    await expect(header).not.toHaveClass(/is-solid/);
    await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".hero");
      window.scrollTo({
        top: (hero?.offsetHeight ?? 0) - window.innerHeight + 40,
        behavior: "instant",
      });
    });
    await expect(header).toHaveClass(/is-solid/);
  });
});

test.describe("없는 주소", () => {
  test("404로 응답하고 색인에서 빠지며 홈으로 돌아갈 수 있다", async ({ page }) => {
    const response = await page.goto("/no-such-page/");
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator("script")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveCount(1);
    await page.getByTestId("not-found-home").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#hero-title")).toBeVisible();
  });

  test("WCAG 2.1 A · AA 자동 검사 위반이 없다", async ({ page }) => {
    await page.goto("/no-such-page/");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
