// 롤플레이 목록 화면의 순수 로직입니다.

import type { Motion } from "@libitums/ui-lynx/motion";

import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  PremiumRoleplayItem,
  PremiumRoleplayLock,
  RoleplayCardLayout,
  RoleplayEpisodeId,
  RoleplayItem,
  RoleplaySection,
  RoleplayUnitForm,
} from "./roleplay-list.contract";

export function roleplayFormLabel(form: RoleplayUnitForm, copy: UiCopy): string {
  return copy.roleplay.form[form];
}

/** 카드 둘째 줄입니다 — 형태 낱말에 대사 수를 덧붙입니다. */
export function roleplayItemSubtitle(item: RoleplayItem, copy: UiCopy): string {
  return `${roleplayFormLabel(item.form, copy)} · ${copy.roleplayStory.lineCount(item.lineCount)}`;
}

// 잠긴 항목은 이름 뒤에 상태를 붙입니다 — 구분자와 낱말은 문구표의 `common.locked`이고
// 여정 스텝의 잠김과 같습니다(ADR-0016 D3).
export function roleplayItemAccessibilityLabel(
  item: RoleplayItem,
  locked: boolean,
  copy: UiCopy,
): string {
  const name = `${item.title}, ${roleplayItemSubtitle(item, copy)}`;
  return locked ? copy.common.locked(name) : name;
}

export function findRoleplaySection(
  sections: readonly RoleplaySection[],
  episodeId: RoleplayEpisodeId,
): RoleplaySection | undefined {
  return sections.find((section) => section.episodeId === episodeId);
}

/** 구획 머리의 접근성 이름입니다. 잠긴 에피소드는 여는 조건까지 말합니다. */
export function roleplaySectionAccessibilityLabel(section: RoleplaySection, copy: UiCopy): string {
  const name = `${section.label} ${section.title}`;
  return section.unlocked ? name : copy.roleplay.lockedSection(name);
}

/**
 * 결제 롤플레이가 막혀 있는 까닭입니다. 에피소드가 먼저입니다 — 에피소드를 끝내지
 * 않았으면 결제 여부와 무관하게 에피소드 잠김입니다. 결제 롤플레이는 「그 에피소드를
 * 끝낸 사람이 더 연습하는 자리」라, 끝내기 전에 결제를 권하지 않습니다.
 */
export function premiumRoleplayLock(section: RoleplaySection): PremiumRoleplayLock {
  return section.unlocked ? "payment" : "episode";
}

export function premiumRoleplayAccessibilityLabel(
  item: PremiumRoleplayItem,
  lock: PremiumRoleplayLock,
  copy: UiCopy,
): string {
  return `${item.title}, ${item.situation}, ${copy.roleplay.premiumLock[lock]}`;
}

/** 결제 잠김 카드를 눌렀을 때 뜨는 안내의 본문입니다. */
export function premiumRoleplayNotice(item: PremiumRoleplayItem, copy: UiCopy): string {
  return copy.roleplay.premiumNotice(item.title);
}

// 롤플레이 카드 루트의 클래스를 만드는 순수 함수입니다. 잠긴 카드는 눌림 반응에서 빠지도록
// 상태 클래스를 달고, 동작 줄이기면 끝에 reduced 표지가 붙습니다.
export function roleplayCardClassName(input: {
  readonly layout: RoleplayCardLayout;
  readonly locked: boolean;
  readonly motion: Motion;
}): string {
  const base = `roleplay-card roleplay-card-${input.layout}`;
  const withLock = input.locked ? `${base} roleplay-card-locked` : base;
  return input.motion === "reduced" ? `${withLock} roleplay-card-motion-reduced` : withLock;
}

// 눌림 막은 동작 줄이기에서 열린 카드에만 그립니다 — 줄이지 않는 대신 막으로 눌림을 알립니다.
export function hasRoleplayCardPressedShade(locked: boolean, motion: Motion): boolean {
  return motion === "reduced" && !locked;
}
