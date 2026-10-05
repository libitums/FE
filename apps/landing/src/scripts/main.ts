// 스크롤 연출과 탭 전환입니다. 이 스크립트가 없어도 문구와 첫 목업은 모두 보입니다.

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

root.classList.add("js");
if (!reducedMotion) root.classList.add("is-enhanced");

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** `value`가 `from`에서 `to`로 가는 동안 0에서 1로 부드럽게 오릅니다. */
const ramp = (value: number, from: number, to: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

function required<T extends Element = HTMLElement>(parent: ParentNode, selector: string): T {
  const found = parent.querySelector<T>(selector);
  if (!found) throw new Error(`요소가 없습니다: ${selector}`);
  return found;
}

/** 장면 줄을 화살표로 한 화면만큼 넘깁니다. 손가락 · 휠 가로 스크롤은 그대로 됩니다. */
function initRail() {
  const rail = required(document, "#journey-rail");
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-rail]")) {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.rail);
      rail.scrollBy({
        left: direction * rail.clientWidth * 0.8,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    });
  }
}

function initScroll() {
  const header = required(document, "#site-header");
  const hero = required(document, ".hero");
  const panels = [...hero.querySelectorAll<HTMLElement>(".hero__panel")];
  const lineA = required(hero, ".hero__line--a");
  const lineB = required(hero, ".hero__line--b");
  const cue = required(hero, ".hero__cue");
  const sentences = [...document.querySelectorAll<HTMLElement>("[data-lit]")];
  const features = required(document, ".features");
  const featureItems = [...features.querySelectorAll<HTMLElement>(".feature")];
  const navLinks = [...header.querySelectorAll<HTMLAnchorElement>(".site-nav a")];
  const navTargets = navLinks.map((link) => required(document, link.hash));
  let queued = false;

  const update = () => {
    queued = false;
    const viewport = window.innerHeight;
    const travel = hero.offsetHeight - viewport;
    // 히어로가 화면에 붙어 있는 동안만 머리가 투명합니다. 붙음이 풀리면 위쪽의 어두운 띠가
    // 머리 밑에서 벗어나므로, 그때부터는 배경을 줍니다.
    header.classList.toggle("is-solid", window.scrollY > Math.max(0, travel));

    // 화면 위쪽 3분의 1 지점을 지난 마지막 섹션을 지금 보는 곳으로 표시합니다.
    const active = navTargets.findLastIndex(
      (target) => target.getBoundingClientRect().top < viewport / 3,
    );
    navLinks.forEach((link, index) => {
      if (index === active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });

    if (reducedMotion) return;

    const progress = travel > 0 ? clamp01(window.scrollY / travel) : 1;
    panels[1]?.style.setProperty("--lit", ramp(progress, 0.08, 0.36).toFixed(3));
    panels[2]?.style.setProperty("--lit", ramp(progress, 0.36, 0.64).toFixed(3));
    for (const panel of panels) {
      panel.style.setProperty("--zoom", (1.08 - 0.08 * progress).toFixed(3));
    }
    lineA.style.setProperty("--show", (1 - ramp(progress, 0.5, 0.62)).toFixed(3));
    lineB.style.setProperty("--show", ramp(progress, 0.64, 0.78).toFixed(3));
    cue.style.opacity = String(0.85 * (1 - ramp(progress, 0, 0.12)));

    // Features: 구간을 지나는 정도에 따라 네 묶음 가운데 하나를 고릅니다.
    const featureTravel = features.offsetHeight - viewport;
    const featureProgress = clamp01(-features.getBoundingClientRect().top / featureTravel);
    const activeFeature = Math.min(
      featureItems.length - 1,
      Math.floor(featureProgress * featureItems.length),
    );
    featureItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeFeature);
    });

    for (const sentence of sentences) {
      const lit = sentence.getBoundingClientRect().top < viewport * 0.62;
      sentence.classList.toggle("is-lit", lit);
    }
  };

  const request = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
}

/** 언어 메뉴를 바깥 누름과 Escape로 닫습니다. 여닫기 자체는 <details>가 합니다. */
function initLanguageMenu() {
  const menu = required<HTMLDetailsElement>(document, ".lang-menu");
  document.addEventListener("click", (event) => {
    if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !menu.open) return;
    menu.open = false;
    required(menu, "summary").focus();
  });
}

initLanguageMenu();
initRail();
initScroll();
