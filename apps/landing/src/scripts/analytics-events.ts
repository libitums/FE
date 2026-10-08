// 화면의 행동을 GA4 이벤트로 옮기는 순수 함수입니다. DOM이 아니라 거기서 읽은 값만 받습니다.

import type {
  ClickEventOf,
  FaqEventOf,
  SectionEventOf,
  SectionThresholdOf,
} from "./analytics.contract";

/** 눌린 링크 → 이벤트. 우선순위: 스토어 링크 → 머리의 받기 버튼 → 언어 메뉴. */
export const clickEventOf: ClickEventOf = (link) => {
  if (!link) return null;
  if (link.store) return { name: "download_click", params: { store: link.store } };
  if (link.hash === "#download") return { name: "cta_click", params: { location: "header" } };
  if (link.inLanguageMenu) return { name: "language_switch", params: { to: link.hreflang } };
  return null;
};

/** FAQ 항목이 열릴 때만 보냅니다. */
export const faqEventOf: FaqEventOf = (toggle) =>
  toggle.open ? { name: "faq_open", params: { question: toggle.faqId ?? "" } } : null;

/** 섹션이 보이기 시작할 때 보냅니다. 「한 번만」은 부르는 쪽(unobserve)이 집니다. */
export const sectionEventOf: SectionEventOf = (section) =>
  section.isIntersecting && section.id !== ""
    ? { name: "section_view", params: { section: section.id } }
    : null;

/** 섹션이 「보였다」가 되는 비율입니다. 긴 섹션은 화면의 30%를 채웠을 때로 낮춥니다. */
export const sectionThresholdOf: SectionThresholdOf = ({ sectionHeight, viewportHeight }) => {
  const base = 0.3;
  if (!(sectionHeight > 0) || !(viewportHeight > 0)) return base;
  return Math.min(base, (base * viewportHeight) / sectionHeight);
};
