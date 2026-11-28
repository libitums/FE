// 메신저 첫 입장 안내(사용자 결정 2026-11-13) — 하단 탭 NEW 배지 · 덕수쌤 목록 카드 · 덕수쌤 방 코치마크의 판정과 기기 기록.
// 판정은 순수, 기록은 기기 저장소의 계정별 칸(`lib/guide-records` — 사용자 결정 2026-11-27, 읽기 · 쓰기 실패는 조용히 — 본 것으로
// 치지 않습니다).

import { currentGuideOwner, readGuideRecord, writeGuideRecord } from "../../lib/guide-records";
import { isStorageAvailable } from "../../lib/storage";
import type { ChatRoomSummary } from "./chat-source.contract";
import type { ComposerKeyboard } from "./keyboard-plan";
import type { MessengerAccess } from "./messenger-access";

/**
 * `keyboard` — 입력 줄 아래 키보드 토글의 두 갈래(내 언어로 휴대폰 키보드 · 한국어로 Hangul keys)를 차례로 가리키는 단계(ADR-0190).
 * `sample` — 사진 단추를 가리키고, 누르면 예시 스냅샷을 무료로 한 장 받는 단계(ADR-0146 추가).
 */
export type GuideStep = "keyboard" | "ideas" | "media" | "sample" | "voice";
/**
 * `snapshot` — 예시 스냅샷 단계를 봤는가(안내를 이미 본 사람에게 그 단계만 따로 한 번 보이려고 따로 적습니다).
 * `keyboard` — 키보드 단계를 봤는가(ADR-0190). 기존 기록(`guide-seen` 배열)이 아니라 따로 둔 키에 적습니다.
 */
export type GuidePart = "list" | "room" | "snapshot" | "voice" | "keyboard";
/** 키보드 단계 안의 두 화면 — 휴대폰 키보드(먼저, 높이를 잼) → Hangul keys. */
export type KeyboardGuideStage = "phone" | "hangul";

/** 안내를 맡는 인물 방입니다(서버 모드 인물 표의 덕수쌤). 없으면 안내가 서지 않습니다. */
export const GUIDE_ROOM_ID = "duksu";
/** 기록 키의 앞부분 — 실제 칸은 뒤에 `.<계정>`(로그인은 사용자 id, 비회원은 guest). 앞부분만 있는 키는 업데이트 전 기기 기록입니다. */
export const messengerTabVisitedStorageKey = "libitum.messenger.tab-visited";
export const messengerGuideSeenStorageKey = "libitum.messenger.guide-seen";
export const messengerKeyboardGuideSeenStorageKey = "libitum.messenger.keyboard-guide-seen";

/** 메신저 탭에 처음 들어가기 전이거나 안 연 새 친구가 있으면 NEW. */
export function messengerTabBadge(input: { visited: boolean; newFriend: boolean }): "new" | null {
  return !input.visited || input.newFriend ? "new" : null;
}

/** 열 수 있는 계정의 열린 방 가운데 아직 안 연 새 친구(isNew)가 있나 — 손님 · 시험 계정 아님은 방을 못 열어 늘 false. */
export function hasNewFriend(rooms: readonly ChatRoomSummary[], access: MessengerAccess): boolean {
  return access !== "sign-in" && rooms.some((room) => room.isNew && room.access.kind === "open");
}

/**
 * 방 안내의 단계 — 새 사용자는 keyboard · ideas, 서버가 예시 스냅샷 · 음성을 제안하면 sample · voice가 붙습니다. 안내를 이미 본 사람은
 * 키보드 단계를 아직 안 봤으면 그것만(ADR-0190), 제안되고 안 본 예시 단계가 있으면 그것도. 그 밖에는 빈 목록(안내 없음).
 */
export function roomGuideSteps(input: {
  readonly roomSeen: boolean;
  readonly snapshotSeen: boolean;
  readonly offered: boolean;
  /** 예시 음성 단계(스냅샷 다음) — 봤는가 · 서버가 제안하는가. 없으면 서지 않습니다. */
  readonly voiceSeen?: boolean;
  readonly voiceOffered?: boolean;
  /** 키보드 단계를 봤는가(ADR-0190). */
  readonly keyboardSeen?: boolean;
  /** 입력 줄 아래 키보드 토글이 서는 방인가 — 아니면 가리킬 곳이 없어 키보드 단계가 빠집니다. 기본은 섬. */
  readonly toggle?: boolean;
}): readonly GuideStep[] {
  const samples: GuideStep[] = [];
  if (input.offered && !input.snapshotSeen) samples.push("sample");
  if (input.voiceOffered === true && input.voiceSeen !== true) samples.push("voice");
  const keyboard: GuideStep[] =
    input.toggle !== false && input.keyboardSeen !== true ? ["keyboard"] : [];
  return input.roomSeen ? [...keyboard, ...samples] : [...keyboard, "ideas", ...samples];
}

/** 키보드 단계에서 Next — 휴대폰 키보드 다음은 Hangul keys, 그다음은 단계 끝. */
export function keyboardGuideNext(stage: KeyboardGuideStage): KeyboardGuideStage | "done" {
  return stage === "phone" ? "hangul" : "done";
}

/**
 * 키보드 단계에서 입력 칸이 휴대폰 키보드 높이를 알렸을 때 Hangul keys 화면으로 넘길지(ADR-0190 개정 2026-11-24). 휴대폰 키보드
 * 화면에서 이 화면 동안 한 번 올라왔던(`risen`) 키보드가 내려가면(높이 0 — Android 뒤로가기 등) Next와 같은 결과로 넘깁니다.
 */
export function keyboardGuidePhoneHidden(input: {
  readonly stage: KeyboardGuideStage;
  readonly height: number;
  readonly risen: boolean;
}): boolean {
  return input.stage === "phone" && input.risen && input.height <= 0;
}

/** 키보드 단계의 화면이 세울 입력 줄 키보드 — 휴대폰 키보드 화면은 phone, Hangul keys 화면은 learning. */
export function keyboardOfStage(stage: KeyboardGuideStage): ComposerKeyboard {
  return stage === "phone" ? "phone" : "learning";
}

/**
 * 방 안내를 끝낼 때 `messenger_guide_finished`의 part — 새 사용자는 room, 안내를 이미 본 사람은 키보드 단계가 들었으면 keyboard
 * (ADR-0190), 예시 단계만이면 snapshot.
 */
export function finishedRoomPart(input: {
  readonly roomSeen: boolean;
  readonly steps: readonly GuideStep[];
}): "room" | "keyboard" | "snapshot" {
  if (!input.roomSeen) return "room";
  return input.steps.includes("keyboard") ? "keyboard" : "snapshot";
}

/** 알약을 눌러야 끝나는 단계(예시 사진 · 예시 음성) — 「다음」 단추가 없고 아무 데나 눌러도 넘어가지 않습니다. */
export function isSampleStep(step: GuideStep | null): step is "sample" | "voice" {
  return step === "sample" || step === "voice";
}

const PARTS: readonly GuidePart[] = ["list", "room", "snapshot", "voice"]; // keyboard는 따로 둔 키

export function guideSeenFrom(raw: string | null): readonly GuidePart[] {
  if (raw === null || raw === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen: GuidePart[] = [];
  for (const value of parsed as unknown[])
    for (const part of PARTS) if (value === part && !seen.includes(part)) seen.push(part);
  return seen;
}

/** 지금 주인 — 저장소를 못 쓰거나 주인이 없으면(로그인 전) null. */
function ownerNow(): string | null {
  return isStorageAvailable() ? currentGuideOwner() : null;
}

/** 이 안내를 띄울지 — 저장소를 못 쓰거나 주인이 없으면 매번 뜨지 않게 띄우지 않습니다. 키보드 단계는 따로 둔 키(ADR-0190)를 봅니다. */
export function guideUnseen(part: GuidePart): boolean {
  try {
    const owner = ownerNow();
    if (owner === null) return false;
    if (part === "keyboard")
      return readGuideRecord(messengerKeyboardGuideSeenStorageKey, owner) !== "1";
    return !guideSeenFrom(readGuideRecord(messengerGuideSeenStorageKey, owner)).includes(part);
  } catch {
    return false;
  }
}

export function markGuideSeen(part: GuidePart): void {
  try {
    const owner = ownerNow();
    if (owner === null) return;
    // 기존 배열에 넣지 않습니다 — 예전 빌드가 모르는 값을 버리고 다시 적어 기록이 사라지지 않게(ADR-0190).
    if (part === "keyboard") {
      if (readGuideRecord(messengerKeyboardGuideSeenStorageKey, owner) !== "1")
        writeGuideRecord(messengerKeyboardGuideSeenStorageKey, owner, "1");
      return;
    }
    const seen = guideSeenFrom(readGuideRecord(messengerGuideSeenStorageKey, owner));
    if (!seen.includes(part))
      writeGuideRecord(messengerGuideSeenStorageKey, owner, JSON.stringify([...seen, part]));
  } catch {
    // 저장 실패가 화면을 막지 않습니다.
  }
}

/** 메신저 탭에 들어간 적이 있나 — 못 읽거나 주인이 없으면 들어간 것으로(배지가 늘 붙어 있지 않게). */
export function messengerTabVisited(): boolean {
  try {
    const owner = ownerNow();
    return owner === null || readGuideRecord(messengerTabVisitedStorageKey, owner) === "1";
  } catch {
    return true;
  }
}

export function markMessengerTabVisited(): void {
  try {
    const owner = ownerNow();
    if (owner !== null && readGuideRecord(messengerTabVisitedStorageKey, owner) !== "1")
      writeGuideRecord(messengerTabVisitedStorageKey, owner, "1");
  } catch {
    // 저장 실패가 화면을 막지 않습니다.
  }
}

/** 본 안내 기록 포트 — 화면은 이것만 압니다(테스트는 메모리 판). */
export type GuideStore = {
  readonly unseen: (part: GuidePart) => boolean;
  readonly markSeen: (part: GuidePart) => void;
};

export const deviceGuideStore: GuideStore = { unseen: guideUnseen, markSeen: markGuideSeen };

/**
 * 추천 친구 줄(ADR-0162)을 목록 위에 세울지. 떠 있는 덕수쌤 줄은 위치를 재지 않고 원본 첫 줄 자리(머리 바로 아래)에 서므로
 * (ADR-0139 D2), 목록 안내가 떠 있는 동안 추천 줄이 끼면 원본 줄이 밀려 어긋납니다.
 */
export function isSuggestedRowShown(listGuideShown: boolean): boolean {
  return !listGuideShown;
}
