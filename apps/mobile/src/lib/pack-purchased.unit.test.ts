import { expect, test } from "vitest";

import { packPurchasedOf } from "./purchase-intent";

// `unit` 계층(PK-U1 · PK-U2, ADR-0063 2026-11-19): 엽전 팩 결제 성공 이벤트 — 금액 · 통화는 스토어 상품에서만(임시 추천 가격 아님).

const offers = [
  { productId: "duru.coins.1200.v1", price: "$4.99", amount: 4.99, currency: "USD" },
  { productId: "duru.coins.500.v1", price: "$1.99", amount: null, currency: null },
];

test("PK-U1 스토어 금액 · 통화 · 거래 id를 싣는다(금액은 10진 문자열)", () => {
  expect(
    packPurchasedOf({
      surface: "chat",
      productId: "duru.coins.1200.v1",
      offers,
      transactionId: "GPA.1234-5678",
    }),
  ).toEqual({
    name: "pack_purchased",
    surface: "chat",
    product: "duru.coins.1200.v1",
    price: "4.99",
    currency: "USD",
    transactionId: "GPA.1234-5678",
  });
});

test("PK-U2 스토어 금액을 모르면 빈 문자열(Airbridge로는 나가지 않음), 거래 id가 없으면 빈 문자열", () => {
  expect(
    packPurchasedOf({
      surface: "learning",
      productId: "duru.coins.500.v1",
      offers,
      transactionId: null,
    }),
  ).toMatchObject({ price: "", currency: "", transactionId: "" });
  expect(
    packPurchasedOf({
      surface: "learning",
      productId: "duru.coins.3000.v1",
      offers: null,
      transactionId: null,
    }),
  ).toMatchObject({ price: "", currency: "" });
});
