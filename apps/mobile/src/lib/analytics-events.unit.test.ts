import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import type {
  AnalyticsCaptureClient,
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsEventSinks,
} from "./analytics.contract";
import {
  analyticsCaptureFrom,
  analyticsEventSinksFrom,
  noAnalyticsEventSinks,
  noAnalyticsSession,
} from "./analytics-events";
import { learnerProfileSavedEvent } from "./learner-profile";

const sinkKeys = [
  "entryEventSink",
  "notificationEventSink",
  "settingsEventSink",
  "episodeIntroEventSink",
] as const satisfies readonly (keyof AnalyticsEventSinks)[];

// 메신저 · 비주얼 노벨 · 전화 이벤트는 지웠습니다(sink 넷, 이름 36).
const events: readonly AnalyticsEvent[] = [
  { name: "entry_screen_viewed", screen: "onboarding" },
  { name: "entry_login_method_selected", method: "phone" },
  { name: "entry_completed" },
  { name: "entry_returning_learner_entered", method: "google" },
  { name: "entry_path_selected", path: "basics" },
  { name: "entry_basics_step_completed", step: "ready" },
  { name: "entry_basics_skipped", step: "compose" },
  { name: "app_update_required_shown", platform: "android", build: "6", minBuild: "7" },
  { name: "notifications_opened" },
  { name: "notification_item_tapped", notificationId: "n-1", target: "roleplay-list" },
  { name: "notification_item_deleted", notificationId: "n-2", target: "roleplay-list" },
  { name: "push_notification_opened", target: "journey-map" },
  { name: "settings_opened" },
  { name: "profile_opened" },
  { name: "language_settings_opened" },
  { name: "notification_settings_opened" },
  { name: "feedback_opened" },
  { name: "feedback_submitted", rating: "5", hasMessage: true },
  { name: "legal_document_opened", document: "privacy-policy", source: "settings" },
  { name: "legal_document_opened", document: "terms-of-use", source: "login" },
  { name: "session_option_changed", option: "auto-play-audio", value: false },
  { name: "episode_intro_viewed", episodeId: "tutorial" },
  { name: "episode_intro_skipped", episodeId: "tutorial" },
  { name: "episode_intro_continued", episodeId: "tutorial", hasPrologue: true },
  { name: "episode_intro_exited", episodeId: "tutorial", stage: "prologue" },
  {
    name: "episode_survey_answered",
    episodeId: "tutorial",
    rating: "4",
    reasons: "",
    hasMessage: false,
  },
  { name: "episode_survey_skipped", episodeId: "tutorial" },
  { name: "episode_prologue_completed", episodeId: "tutorial", prologueKind: "cuts" },
];

function withoutName(event: AnalyticsEvent): Record<string, unknown> {
  const { name: _name, ...rest } = event;
  return rest;
}

describe("episode_content_refreshed", () => {
  test("AE-R1. 이름은 그대로, properties는 name만 뺀 일곱 필드다", () => {
    const event = {
      name: "episode_content_refreshed",
      manifest: "updated",
      fetchedCount: "1",
      lockedCount: "3",
      failedCount: "2",
      lockReasons: "client-too-old,decode-failed",
      failReasons: "http,network",
      persisted: true,
    } as const satisfies AnalyticsEvent;

    expect(analyticsCaptureFrom(event)).toStrictEqual({
      event: "episode_content_refreshed",
      properties: {
        manifest: "updated",
        fetchedCount: "1",
        lockedCount: "3",
        failedCount: "2",
        lockReasons: "client-too-old,decode-failed",
        failReasons: "http,network",
        persisted: true,
      },
    });
  });
});

describe("analyticsCaptureFrom", () => {
  test("AE1: 표가 이름 27개 · 모양 28개를 다 덮는다", () => {
    expect(events).toHaveLength(28);
    expect(new Set(events.map((e) => e.name)).size).toBe(27);
  });

  test.each(events.map((e, i) => [`${i + 1}. ${e.name}`, e] as const))(
    "AE1: %s — 이름은 그대로, properties는 name만 뺀 나머지",
    (_label, event) => {
      const capture = analyticsCaptureFrom(event);
      expect(capture.event).toBe<AnalyticsEventName>(event.name);
      expect(capture.properties).toStrictEqual(withoutName(event));
    },
  );

  test("AE1: entry_returning_learner_entered는 method만 속성으로 싣는다", () => {
    expect(
      analyticsCaptureFrom({ name: "entry_returning_learner_entered", method: "google" }),
    ).toStrictEqual({
      event: "entry_returning_learner_entered",
      properties: { method: "google" },
    });
  });

  test("AE2: 입력을 고치지 않는다", () => {
    const event = Object.freeze({
      name: "session_option_changed",
      option: "auto-play-audio",
      value: true,
    } as const);
    const before = structuredClone(event);
    expect(() => analyticsCaptureFrom(event)).not.toThrow();
    expect(event).toStrictEqual(before);
  });

  test("AE2: properties에 name 키가 없다", () => {
    for (const event of events) {
      expect(Object.keys(analyticsCaptureFrom(event).properties)).not.toContain("name");
    }
  });

  test("AE2: 키 순서를 보존하고 키를 더하지 않는다", () => {
    const capture = analyticsCaptureFrom({
      name: "roleplay_story_completed",
      episodeId: "u01-water",
      correctCount: "2",
      judgedCount: "3",
      skippedCount: "0",
    });
    expect(Object.keys(capture.properties)).toStrictEqual([
      "episodeId",
      "correctCount",
      "judgedCount",
      "skippedCount",
    ]);
  });
});

describe("학습자 프로필 이벤트", () => {
  const emma = { name: "Emma", countryCode: "DE" } as const;
  const profileEvents: readonly AnalyticsEvent[] = [
    learnerProfileSavedEvent("signup", null),
    learnerProfileSavedEvent("settings", emma),
    { name: "learner_profile_opened" },
  ];

  test("AE-L. 저장 · 열림 이벤트의 properties는 entry · change뿐이다 (값이 새지 않는다)", () => {
    const keysOf = (event: AnalyticsEvent): string[] =>
      Object.keys(analyticsCaptureFrom(event).properties).sort();

    expect(keysOf(profileEvents[0]!)).toEqual(["change", "entry"]);
    expect(keysOf(profileEvents[1]!)).toEqual(["change", "entry"]);
    expect(keysOf(profileEvents[2]!)).toEqual([]);
  });

  test("AE-L. 이름은 그대로 capture 이름이 되고 직렬화에 이름 · 나라 코드가 없다", () => {
    expect(profileEvents.map((event) => analyticsCaptureFrom(event).event)).toEqual([
      "learner_profile_saved",
      "learner_profile_saved",
      "learner_profile_opened",
    ]);
    expect(JSON.stringify(profileEvents.map(analyticsCaptureFrom))).not.toMatch(/Emma|"DE"/);
  });

  test("AE-L. 저장을 내는 두 sink(진입 · 설정) 모두 capture를 정확히 1회 부른다", () => {
    const { client, capture } = fakeClient();
    const sinks = analyticsEventSinksFrom(client);

    for (const sink of [sinks.entryEventSink, sinks.settingsEventSink]) {
      capture.mockClear();
      (sink as unknown as (event: AnalyticsEvent) => void)(profileEvents[0]!);
      expect(capture).toHaveBeenCalledTimes(1);
      expect(capture).toHaveBeenCalledWith("learner_profile_saved", {
        entry: "signup",
        change: "created",
      });
    }
  });
});

describe("AN1 분석 계약의 크기", () => {
  const removedNames = [
    "messenger_unit_opened",
    "messenger_unit_completed",
    "messenger_unit_exited_incomplete",
    "visual_novel_unit_opened",
    "visual_novel_unit_completed",
    "visual_novel_unit_exited_incomplete",
    "visual_novel_unit_replay_started",
    "phone_call_unit_opened",
  ];

  // ⟨ADR-0086⟩ `app_update_required_shown`, ⟨ADR-0088 D6⟩ 막간 이야기 다섯이 더해져 44이다.
  // ⟨ADR-0029 「D3 목적 구분」⟩ 엽전 출시 · 메신저 · 새 친구 · 영역 · 마일스톤 열넷이 더해져 60이다.
  // ⟨ADR-0143⟩ 연속 학습 보상 `streak_reward_collected`가 더해져 61이다.
  // ⟨ADR-0144⟩ 요금제 `plans_viewed` · `plan_selected`가 더해져 63이다.
  // ⟨ADR-0146 앱 연결⟩ 사진 · 음성 결과 `chat_media_completed`가 더해져 64다.
  // ⟨ADR-0159⟩ 온보딩 `onboarding_step_viewed` · `onboarding_started`가 더해져 67이다.
  // ⟨ADR-0160⟩ 하나의 상점 탭 전환 `shop_tab_switched`가 더해져 68이다.
  // ⟨ADR-0162⟩ 추천 친구 `suggested_friend_viewed` · `suggested_friend_added` · `early_access_tapped`가 더해져 71이다.
  // ⟨ADR-0162 D5⟩ 먼저 만나기 결과 `early_access_completed`가 더해져 72다.
  // ⟨ADR-0063 2026-11-19⟩ 엽전 팩 결제 `pack_purchased`가 더해져 73이다.
  // ⟨ADR-0164⟩ 추천 친구 프로필 열기 `suggested_friend_opened`가 더해져 74다(PostHog만).
  // ⟨ADR-0166⟩ 비회원 로그인 권유 `chat_sign_in_prompt_closed`가 더해져 75다.
  // ⟨ADR-0169⟩ 더보기 · Letters · 단어장 · Letters 추천 이벤트 열이 더해져 85다.
  // ⟨ADR-0170⟩ 주간 순위 `ranking_opened` · `ranking_board_switched` · `ranking_own_row_viewed` · `chat_words_earned` ·
  // `ranking_hide_toggled`가 더해져 90이다.
  // ⟨ADR-0169 즐겨찾기 개정⟩ 단어 별 `wordbook_star_toggled` · 걸러보기 `wordbook_filter_switched`가 더해져 92다.
  // ⟨ADR-0174⟩ 가입 보상 `signup_reward_card_shown` · `signup_reward_card_tapped` · `signup_reward_shown`이 더해져 95다.
  // ⟨ADR-0175⟩ 푸시 캠페인 보상 `push_reward_claimed` · `push_reward_failed`가 더해져 97이다.
  // ⟨ADR-0176⟩ 입장 선택 `entry_path_selected` · `entry_basics_step_completed` · `entry_basics_skipped`가 더해져 100이다.
  // ⟨ADR-0178 D8⟩ 친구 스토리 `friend_story_row_viewed` · `friend_story_viewed` · `friend_story_replied` · `friend_story_word_saved`가
  // 더해져 104이고, 보기 닫힘 `friend_story_closed`(감사 A4)가 더해져 105다(PostHog만).
  // ⟨ADR-0189⟩ 다시 듣기 `sentence_audio_replayed` · 칩 소리 `choice_chip_sound_played`가 더해져 107이다(PostHog만).
  // ⟨ADR-0190⟩ 방 안내 키보드 단계 `messenger_guide_keyboard`가 더해져 108이다(PostHog만).
  // ⟨ADR-0195⟩ 채팅 답할 문장 추천 `chat_suggestion_shown` · `chat_suggestion_tapped`가 더해져 110이다(PostHog만).
  // ⟨ADR-0197⟩ 채팅 알림 권한 카드 `chat_push_ask_shown` · `chat_push_ask_tapped` · `chat_push_ask_answered`가 더해져 113이다(PostHog만).
  // ⟨ADR-0196⟩ Chat Plus 첫 구독 보너스 `subscription_bonus_shown`이 더해져 114다(PostHog만).
  // ⟨ADR-0117 2026-11-25⟩ 「새 메시지 ↓」 알약 누름 `chat_new_messages_jumped`가 더해져 115다(PostHog만).
  // ⟨ADR-0194 D7 · ADR-0191⟩ 내 스토리 여덟이 더해져 123이다(PostHog만).
  // ⟨ADR-0199⟩ 내 스토리 사진 `my_story_photo_picked` · `my_story_review_requested`가 더해져 125다(PostHog만).
  test("AN1. 이벤트 이름은 125개이고 지운 여덟이 없다", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/analytics-event-names.ts"), "utf8");
    const names = [...source.matchAll(/^\s+\| "([a-z_]+)"/gm)].map((match) => match[1]);
    expect(names).toHaveLength(125);
    expect(names).toContain("subscription_bonus_shown");
    expect(names).toContain("chat_new_messages_jumped");
    expect(names).toContain("chat_suggestion_shown");
    expect(names).toContain("chat_suggestion_tapped");
    expect(names).toContain("chat_push_ask_shown");
    expect(names).toContain("chat_push_ask_tapped");
    expect(names).toContain("chat_push_ask_answered");
    expect(names).toContain("sentence_audio_replayed");
    expect(names).toContain("choice_chip_sound_played");
    expect(names).toContain("messenger_guide_keyboard");
    for (const name of [
      "my_story_create_opened",
      "my_story_guide_closed",
      "my_story_posted",
      "my_story_post_failed",
      "my_story_viewed",
      "my_story_chat_opened",
      "my_story_deleted",
      "my_story_keep_toggled",
      "my_story_photo_picked",
      "my_story_review_requested",
    ])
      expect(names).toContain(name);
    expect(names).toContain("friend_story_closed");
    expect(names).toContain("friend_story_row_viewed");
    expect(names).toContain("friend_story_viewed");
    expect(names).toContain("friend_story_replied");
    expect(names).toContain("friend_story_word_saved");
    expect(names).toContain("entry_path_selected");
    expect(names).toContain("entry_basics_step_completed");
    expect(names).toContain("entry_basics_skipped");
    expect(names).toContain("push_reward_claimed");
    expect(names).toContain("wordbook_star_toggled");
    expect(names).toContain("wordbook_filter_switched");
    expect(names).toContain("signup_reward_shown");
    expect(names).toContain("chat_sign_in_prompt_closed");
    expect(names).toContain("suggested_friend_opened");
    expect(names).toContain("pack_purchased");
    expect(names).toContain("early_access_completed");
    expect(names).toContain("suggested_friend_viewed");
    expect(names).toContain("suggested_friend_added");
    expect(names).toContain("early_access_tapped");
    expect(names).toContain("onboarding_step_viewed");
    expect(names).toContain("onboarding_started");
    expect(names).toContain("shop_tab_switched");
    expect(names).toContain("chat_media_completed");
    expect(names).toContain("plans_viewed");
    expect(names).toContain("plan_selected");
    expect(names).toContain("streak_reward_collected");
    expect(names).toContain("surface_session_ended");
    expect(names).toContain("download_settings_opened");
    expect(names).toContain("episode_story_skipped");
    expect(names).toContain("episode_listen_item_answered");
    expect(names).toContain("app_update_required_shown");
    expect(names).toContain("episode_item_answered");
    for (const name of removedNames) expect(names).not.toContain(name);
  });

  test("AN1. 만들어 내는 sink는 entry · notification · settings · episodeIntro 넷뿐이다", () => {
    const { client } = fakeClient();
    expect(Object.keys(analyticsEventSinksFrom(client)).sort()).toEqual([
      "entryEventSink",
      "episodeIntroEventSink",
      "notificationEventSink",
      "settingsEventSink",
    ]);
  });
});

describe("noAnalyticsEventSinks / noAnalyticsSession", () => {
  test("AE3: 네 sink가 모두 null이다 — no-op 함수가 아니다", () => {
    expect(Object.keys(noAnalyticsEventSinks).sort()).toStrictEqual([...sinkKeys].sort());
    for (const key of sinkKeys) {
      expect(noAnalyticsEventSinks[key]).toBeNull();
    }
  });

  test("AE3: noAnalyticsSession은 sink 넷 null + user null이다(identify 자리 없음)", () => {
    expect(noAnalyticsSession).toStrictEqual({ sinks: noAnalyticsEventSinks, user: null });
  });
});

function fakeClient() {
  const capture = vi.fn<AnalyticsCaptureClient["capture"]>();
  const identify = vi.fn<AnalyticsCaptureClient["identify"]>();
  const client: AnalyticsCaptureClient = { capture, identify };
  return { client, capture, identify };
}

describe("analyticsEventSinksFrom", () => {
  test("AE4: null 클라이언트는 넷 모두 null이다", () => {
    const sinks = analyticsEventSinksFrom(null);
    expect(sinks).toStrictEqual(noAnalyticsEventSinks);
    for (const key of sinkKeys) {
      expect(sinks[key]).toBeNull();
    }
  });

  test("AE5: 네 sink가 이벤트 하나당 capture를 정확히 1회 부른다", () => {
    const { client, capture, identify } = fakeClient();
    const sinks = analyticsEventSinksFrom(client);
    const named = (name: AnalyticsEvent["name"]): AnalyticsEvent =>
      events.find((event) => event.name === name)!;
    const bySink: readonly (readonly [unknown, AnalyticsEvent])[] = [
      [sinks.entryEventSink, named("entry_screen_viewed")],
      [sinks.notificationEventSink, named("notifications_opened")],
      [sinks.settingsEventSink, named("settings_opened")],
      [sinks.episodeIntroEventSink, named("episode_intro_viewed")],
    ];
    for (const [sink, event] of bySink) {
      expect(sink).toBeTypeOf("function");
      capture.mockClear();
      (sink as (e: AnalyticsEvent) => void)(event);
      const expected = analyticsCaptureFrom(event);
      expect(capture).toHaveBeenCalledTimes(1);
      expect(capture).toHaveBeenCalledWith(expected.event, expected.properties);
    }
    expect(identify).not.toHaveBeenCalled();
  });

  test("AE6: capture가 던져도 sink는 던지지 않는다", () => {
    const client: AnalyticsCaptureClient = {
      capture: () => {
        throw new Error("boom");
      },
      identify: () => undefined,
    };
    const sinks = analyticsEventSinksFrom(client);
    const sink = sinks.settingsEventSink as unknown as (e: AnalyticsEvent) => void;
    expect(sink).toBeTypeOf("function");
    expect(() => sink({ name: "settings_opened" })).not.toThrow();
  });
});

describe("episode_update_splash_closed", () => {
  const event = {
    name: "episode_update_splash_closed",
    outcome: "timed-out",
    waitMs: "3000",
    splashMs: "5400",
    episodeCount: "2",
    replacedCount: "1",
  } as const satisfies AnalyticsEvent;
  const properties = {
    outcome: "timed-out",
    waitMs: "3000",
    splashMs: "5400",
    episodeCount: "2",
    replacedCount: "1",
  };

  test("EV1. 이름은 그대로, properties는 name만 뺀 다섯 필드다", () => {
    expect(analyticsCaptureFrom(event)).toStrictEqual({
      event: "episode_update_splash_closed",
      properties,
    });
  });

  test("EV1. episodeIntroEventSink가 이 이벤트를 capture 한 번으로 보낸다", () => {
    const { client, capture } = fakeClient();
    const sink = analyticsEventSinksFrom(client).episodeIntroEventSink as unknown as (
      e: AnalyticsEvent,
    ) => void;

    sink(event);

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("episode_update_splash_closed", properties);
  });
});
