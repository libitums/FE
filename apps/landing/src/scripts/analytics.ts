// 화면의 행동을 GA4 이벤트로 보냅니다. gtag가 없으면(측정 ID 없이 빌드했으면) 아무 일도 하지 않습니다.

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

function track(name: string, params: Record<string, string>) {
  (window as { gtag?: Gtag }).gtag?.("event", name, params);
}

export function initAnalytics() {
  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a");
    if (!link) return;
    if (link.dataset.store) track("download_click", { store: link.dataset.store });
    else if (link.hash === "#download") track("cta_click", { location: "header" });
    else if (link.closest(".lang-menu")) track("language_switch", { to: link.hreflang });
  });

  for (const item of document.querySelectorAll<HTMLDetailsElement>("[data-faq-id]")) {
    item.addEventListener("toggle", () => {
      if (item.open) track("faq_open", { question: item.dataset.faqId ?? "" });
    });
  }

  // 섹션마다 처음 화면에 들어올 때 한 번만 보냅니다.
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        track("section_view", { section: entry.target.id });
        seen.unobserve(entry.target);
      }
    },
    { threshold: 0.3 },
  );
  for (const section of document.querySelectorAll("main section[id]")) seen.observe(section);
}
