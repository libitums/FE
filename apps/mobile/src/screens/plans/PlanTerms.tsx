import type { ReactNode } from "@lynx-js/react";

import type { AppPlatform } from "../../lib/app-version";
import type { LegalDocument } from "../../lib/legal-document.contract";
import { useUiCopy } from "../../lib/ui-copy";
import type { PlanCardView, PlanPeriod } from "./plans-model";
import { plansTestIds as ids } from "./plans.contract";

import "./plans.css";

export type PlanTermsProps = {
  /** 고른 카드 — 없으면 고지 문장 없이 링크만. */
  readonly card: PlanCardView | undefined;
  readonly period: PlanPeriod;
  readonly platform: AppPlatform | null;
  readonly onOpenLegal?: (document: LegalDocument) => void;
  /** 구독 중 바꿈의 문장(ADR-0160) — 고지 앞에 섭니다. 없으면 null. */
  readonly changeLine?: string | null;
  readonly theme?: "light" | "dark";
};

function TermsLink({
  testId,
  label,
  theme,
  onTap,
}: {
  readonly testId: string;
  readonly label: string;
  readonly theme: "light" | "dark";
  readonly onTap: () => void;
}): ReactNode {
  return (
    <text
      className={`plans-terms-link plans-terms-link-${theme}`}
      data-testid={testId}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="link"
      accessibility-label={label}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      {label}
    </text>
  );
}

/**
 * 구독 구매 단추 아래의 고지(App Store 3.1.2 · Play 구독 정책) — 고른 요금제 이름 · 가격과 기간 · 결제 계정 · 자동 갱신 ·
 * 24시간 전 해지 · 해지 자리, 그리고 이용약관 · 개인정보처리방침 링크. 가격은 카드와 같은 글(스토어 가격, 없으면 임시 가격 · 안내)입니다.
 */
export function PlanTerms({
  card,
  period,
  platform,
  onOpenLegal,
  changeLine = null,
  theme = "light",
}: PlanTermsProps): ReactNode {
  const copy = useUiCopy().plans;
  const terms = copy.terms;
  const store = terms.stores[platform ?? "unknown"];
  const price =
    card === undefined || card.price === null
      ? copy.priceInStore
      : period === "monthly"
        ? copy.perMonth(card.price)
        : copy.perYear(card.price);

  return (
    <view className="plans-terms" data-testid={ids.terms}>
      {changeLine === null ? null : (
        <text className={`plans-terms-text plans-terms-text-${theme}`}>{changeLine}</text>
      )}
      {card === undefined ? null : (
        <text className={`plans-terms-text plans-terms-text-${theme}`}>
          {terms.disclosure(copy.names[card.id], price, store)}
        </text>
      )}
      <view className="plans-terms-links">
        <TermsLink
          testId={ids.termsOfUse}
          label={terms.termsOfUse}
          theme={theme}
          onTap={() => onOpenLegal?.("terms-of-use")}
        />
        <text
          className={`plans-terms-text plans-terms-text-${theme}`}
          accessibility-element={false}
        >
          ·
        </text>
        <TermsLink
          testId={ids.privacyPolicy}
          label={terms.privacyPolicy}
          theme={theme}
          onTap={() => onOpenLegal?.("privacy-policy")}
        />
      </view>
    </view>
  );
}
