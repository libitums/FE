import { act, fireEvent, screen } from "@lynx-js/react/testing-library";
import { expect, test } from "vitest";

import { fixtureRoom, mountChat, seedOf } from "./chat-ui.test-support";
import type { ChatFixtureSeed } from "./chat-source.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(SU-UI13 ~ UI14): 생년 시트가 처음 보이는 자리(ADR-0125 개정 2026-11-27). 맨 위 올해 줄에서 열면
// 대충 누른 탭이 0세로 저장됐습니다 — 고른 연도가 없으면 목록 가운데에서, 있으면 그 연도에서 엽니다.

const thisYear = new Date().getFullYear();
const unasked = (seed: ChatFixtureSeed): ChatFixtureSeed => ({ rooms: seed.rooms });
const listOf = (year: number) => screen.getByTestId(ids.birthYearOption(year)).parentElement;
const selectedOf = (year: number) =>
  screen.getByTestId(ids.birthYearOption(year)).getAttribute("data-selected");

test("SU-UI13 생년을 묻지 않았으면 시트는 고른 것 없이 목록 가운데(50년 전)에서 열린다", () => {
  mountChat({ seed: unasked(seedOf(fixtureRoom("mina"))) });
  // 가운데 줄(올해 - 50)이 칸 가운데 오도록 그 두 줄 위(인덱스 48)가 칸 맨 위입니다.
  expect(listOf(thisYear)?.getAttribute("initial-scroll-to-index")).toBe("48");
  // 자리만 옮길 뿐 값을 미리 채우지 않습니다(COPPA 중립 연령 확인) — 어느 줄도 골라져 있지 않습니다.
  expect(selectedOf(thisYear)).toBe("false");
  expect(selectedOf(thisYear - 50)).toBe("false");
});

test("SU-UI14 이미 정한 생년을 고치려고 열면 그 연도에서 열린다(막힌 줄의 Change birth year)", () => {
  mountChat({
    seed: {
      ...seedOf(fixtureRoom("mina", { inputBlock: { kind: "age-restricted" } })),
      birthYear: { kind: "set", year: 2012 },
    },
  });
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.blockedChangeYear), {});
  });
  expect(listOf(2012)?.getAttribute("initial-scroll-to-index")).toBe(String(thisYear - 2012 - 2));
  expect(selectedOf(2012)).toBe("true");
});
