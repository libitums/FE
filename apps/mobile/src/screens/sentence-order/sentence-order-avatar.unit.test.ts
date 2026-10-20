import { expect, test } from "vitest";

import { dialogueAvatarNameOf } from "./sentence-order-avatar";

// `unit` 계층: 대화 조립 아바타의 이름 고르기만 봅니다 — 상대는 에피소드 상대 이름이 있으면 그 이름, 없으면
// 이름 없음(아바타가 중립 자리표시 그림을 그립니다), 나는 학습자 이름이 있으면 그 이름, 없으면 문구표의 대체 이름입니다.

const meFallback = "You";

test("AN1. 상대 이름이 있으면 앞뒤 공백을 걷은 그 이름이다", () => {
  expect(dialogueAvatarNameOf("counterpart", { counterpart: "  편의점 점원 " }, meFallback)).toBe(
    "편의점 점원",
  );
});

test("AN2. 상대 이름이 없거나 공백뿐이면 이름이 없다 — 중립 자리표시 아바타로 섭니다", () => {
  expect(dialogueAvatarNameOf("counterpart", undefined, meFallback)).toBeUndefined();
  expect(dialogueAvatarNameOf("counterpart", {}, meFallback)).toBeUndefined();
  expect(dialogueAvatarNameOf("counterpart", { counterpart: "   " }, meFallback)).toBeUndefined();
});

test("AN3. 학습자 이름이 있으면 앞뒤 공백을 걷은 그 이름이다", () => {
  expect(dialogueAvatarNameOf("me", { me: " Sehyun " }, meFallback)).toBe("Sehyun");
});

test("AN4. 학습자 이름이 없거나 공백뿐이면 문구표의 대체 이름이다", () => {
  expect(dialogueAvatarNameOf("me", undefined, meFallback)).toBe("You");
  expect(dialogueAvatarNameOf("me", { counterpart: "점원" }, meFallback)).toBe("You");
  expect(dialogueAvatarNameOf("me", { me: "  " }, meFallback)).toBe("You");
});

test("AN5. 한 화자의 이름이 다른 화자 아바타로 새지 않는다", () => {
  expect(dialogueAvatarNameOf("counterpart", { me: "Sehyun" }, meFallback)).toBeUndefined();
});
