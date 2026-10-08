// 화면의 행동을 GA4 이벤트로 보냅니다. 무엇이 어떤 이벤트가 되는지는 analytics-events.ts가 정하고,
// 여기는 DOM에서 값을 읽어 넘기고 결과를 gtag에 전달합니다. gtag가 없으면(측정 ID 없이 빌드했으면) 아무 일도 하지 않습니다.

import type { AnalyticsEvent } from "./analytics.contract";
import { clickEventOf, faqEventOf, sectionEventOf, sectionThresholdOf } from "./analytics-events";

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

function send(event: AnalyticsEvent | null) {
  if (event) (window as { gtag?: Gtag }).gtag?.("event", event.name, event.params);
}

export function initAnalytics() {
  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a");
    send(
      clickEventOf(
        link
          ? {
              store: link.dataset.store,
              hash: link.hash,
              inLanguageMenu: link.closest(".lang-menu") !== null,
              hreflang: link.hreflang,
            }
          : null,
      ),
    );
  });

  for (const item of document.querySelectorAll<HTMLDetailsElement>("[data-faq-id]")) {
    item.addEventListener("toggle", () => {
      send(faqEventOf({ faqId: item.dataset.faqId, open: item.open }));
    });
  }

  // 섹션마다 처음 화면에 들어올 때 한 번만 보냅니다. 임계값은 섹션 길이에 따라 다르므로 관찰자도 섹션마다 둡니다.
  for (const section of document.querySelectorAll("main section[id]")) {
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const event = sectionEventOf({
            id: entry.target.id,
            isIntersecting: entry.isIntersecting,
          });
          if (!event) continue;
          send(event);
          seen.disconnect();
        }
      },
      {
        threshold: sectionThresholdOf({
          sectionHeight: (section as HTMLElement).offsetHeight,
          viewportHeight: window.innerHeight,
        }),
      },
    );
    seen.observe(section);
  }
}
