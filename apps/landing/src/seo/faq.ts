import type { BuildFaq, FaqCopyKey, FaqId, StoreAvailabilityOf } from "./seo.contract";

export const faqIds = [
  "what",
  "who",
  "different",
  "activities",
  "hangul",
  "language",
  "where",
] as const satisfies readonly FaqId[];

export const storeAvailabilityOf: StoreAvailabilityOf = ({ ios, android }) =>
  ios.trim() !== "" || android.trim() !== "" ? "available" : "coming-soon";

const questionKey: Record<FaqId, FaqCopyKey> = {
  what: "faqWhatQ",
  who: "faqWhoQ",
  different: "faqDifferentQ",
  activities: "faqActivitiesQ",
  hangul: "faqHangulQ",
  language: "faqLanguageQ",
  where: "faqWhereQ",
};

const answerKey: Record<FaqId, FaqCopyKey> = {
  what: "faqWhatA",
  who: "faqWhoA",
  different: "faqDifferentA",
  activities: "faqActivitiesA",
  hangul: "faqHangulA",
  language: "faqLanguageA",
  where: "faqWhereASoon",
};

export const buildFaq: BuildFaq = ({ copy, storeAvailability }) =>
  faqIds.map((id) => {
    const question = copy[questionKey[id]];
    const answer =
      id === "where" && storeAvailability === "available"
        ? copy.faqWhereAAvailable
        : copy[answerKey[id]];
    for (const text of [question, answer]) {
      if (text.trim() === "") throw new Error(`buildFaq: empty text for "${id}".`);
      if (text.includes("<")) throw new Error(`buildFaq: "${id}" must be plain text (no "<").`);
    }
    return { id, question, answer };
  });
