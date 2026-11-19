import { describe, expect, test } from "vitest";

import { emitCompanionEvent } from "../../lib/companion-events";
import { profileOpenedEvent, voicePlayedEvent } from "./friend-profile-events";

// `unit` 계층(FE-U1 ~ U2): 프로필 시트 이벤트(ADR-0162 2026-11-19 추가) — 이름 · 속성 모양, 공통 속성(일수)이 붙어 나간다.

describe("프로필 이벤트", () => {
  test("FE-U1 friend_profile_opened { characterId, source } — 줄 · 친구 찾기 · 방", () => {
    for (const source of ["row", "directory", "room"] as const) {
      expect(profileOpenedEvent("seoyeon", source)).toEqual({
        name: "friend_profile_opened",
        surface: "chat",
        characterId: "seoyeon",
        source,
      });
    }
  });

  test("FE-U2 friend_voice_sample_played { characterId } — sink로 한 번, 일수가 붙는다", () => {
    const sent: unknown[] = [];
    emitCompanionEvent(
      (event) => void sent.push(event),
      voicePlayedEvent("haejun"),
      () => "3",
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({
      name: "friend_voice_sample_played",
      surface: "chat",
      characterId: "haejun",
      daysSinceFirstOpen: "3",
    });
  });
});
