// 약관 화면의 임시 입력값 자리입니다(「임시 입력값의 이음매」 —
// docs/conventions/code.md).
//
// ⚠ 영어 초안 — 법무 검토 전(2026-09-29). 화면에는 표시하지 않습니다.

import type { TermsSection } from "./terms.contract";

// **무엇이 임시인가** — 아래 넷의 `title`과 `paragraphs` 본문 문구뿐입니다. `id`와
// 절이 넷·절마다 문단 둘이라는 분량은 임시가 아닙니다(ADR-0022의 스크롤이 실제로
// 걸려야 합니다).
//
// **무엇이 임시가 아닌가** — `TermsSection`의 필드 셋(`id`·`title`·`paragraphs`)과
// 분량 하한(절 4 · 문단 8 · 문단마다 문장 2 이상 · 본문 전체 600자 이상)입니다.
//
// **무엇이 막고 있나** — 실제 법무 문구가 아직 없습니다(범위 밖). 외부 링크·
// 웹뷰를 두지 않고 여기서는 자리표(placeholder) 본문을 대신 채웁니다.
//
// **진짜가 오는 날 무엇만 바뀌나** — 이 표의 `title`·`paragraphs` 문구뿐입니다.
// 절 수·문단 수·형태·화면·결선은 안 바뀝니다.
const termsSectionTable: readonly TermsSection[] = [
  {
    id: "collected",
    title: "Information we collect",
    paragraphs: [
      "This app collects only the minimum information needed to provide the service. During onboarding, we ask for your name, learning language, and learning goal and use them to build your study plan. We don't ask for any other sensitive information.",
      "We also collect usage records created while you study, such as correct and incorrect answers and study time. These records are used as reference data to recommend what to study next.",
    ],
  },
  {
    id: "usage",
    title: "How we use information",
    paragraphs: [
      "We use the information we collect only to show you content that suits you. We don't sell or hand over information to other companies for advertising or marketing, and we don't share it with partners without your separate consent.",
      "Your study records are used to calculate your progress and choose the questions you'll solve next. Unless you ask us to, we don't reuse your study records for any other purpose.",
    ],
  },
  {
    id: "retention",
    title: "Storage and deletion",
    paragraphs: [
      "We keep the information we collect safely while you use the service. If you ask to delete your account, we delete your information except what the law requires us to keep for a set period.",
      "Information whose retention period has ended is destroyed so that it can't be recovered. Any records left on paper are shredded or incinerated.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "If you have questions about how your personal information is handled, you can contact our customer center. We accept inquiries through the Contact menu in the app or by email.",
      "A staff member reviews each inquiry and replies on business days. If you're not satisfied with the outcome, you can contact the relevant authorities.",
    ],
  },
];

export function termsSections(): readonly TermsSection[] {
  return termsSectionTable;
}
