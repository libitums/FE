export type BottomNavigatorPreset = "default" | "long-label" | "all-items";

type BottomNavigatorStoryItemDataBase = {
  readonly id: string;
  readonly accessibilityLabel: string;
  readonly icon: "house" | "map" | "user-group" | "settings" | "notification";
  readonly badge?:
    | { readonly kind: "dot"; readonly accessibilityLabel: string }
    | { readonly kind: "count"; readonly count: number };
};

export type BottomNavigatorStoryItemData = BottomNavigatorStoryItemDataBase &
  (
    | { readonly availability: "enabled"; readonly disabledReason?: never }
    | { readonly availability: "disabled"; readonly disabledReason: string }
  );

export type BottomNavigatorInitData = {
  readonly preset: BottomNavigatorPreset;
  readonly selectedId: string;
  readonly disabledLast: boolean;
  readonly viewportWidth: 320 | 390;
  readonly items: readonly BottomNavigatorStoryItemData[];
};

export type BottomNavigatorStoryActionEnvelope = {
  readonly channel: "STORYBOOK_ACTION";
  readonly name: "onSelect";
  readonly args: readonly [id: string];
};

export function normalizeBottomNavigatorStoryArgs(_input: unknown): BottomNavigatorInitData {
  const args =
    _input !== null && typeof _input === "object" ? (_input as Record<string, unknown>) : {};
  const preset: BottomNavigatorPreset =
    args.preset === "long-label" || args.preset === "all-items" ? args.preset : "default";
  const disabledLast = args.disabledLast === true;
  const viewportWidth = args.viewportWidth === 320 ? 320 : 390;
  const longLabel = "새로운 학습 여정을 살펴보는 매우 긴 목적지 이름";
  const items: BottomNavigatorStoryItemData[] = [
    {
      id: "home",
      accessibilityLabel: preset === "long-label" ? longLabel : "홈",
      icon: "house",
      availability: "enabled",
    },
    {
      id: "journey",
      accessibilityLabel: "여정",
      icon: "map",
      availability: "enabled",
      badge: { kind: "dot", accessibilityLabel: "새 소식 있음" },
    },
    {
      id: "roleplay",
      accessibilityLabel: "롤플레이",
      icon: "user-group",
      availability: "enabled",
      badge: { kind: "count", count: 108 },
    },
    { id: "settings", accessibilityLabel: "설정", icon: "settings", availability: "enabled" },
  ];
  if (preset === "all-items") {
    items.push({
      id: "notifications",
      accessibilityLabel: "알림",
      icon: "notification",
      availability: "enabled",
    });
  }
  if (disabledLast) {
    const last = items.at(-1)!;
    items[items.length - 1] = {
      ...last,
      availability: "disabled",
      disabledReason: "로그인 후 사용 가능",
    };
  }
  const requestedId = typeof args.selectedId === "string" ? args.selectedId : "home";
  const selectedId = items.some(
    (item) => item.id === requestedId && item.availability === "enabled",
  )
    ? requestedId
    : "home";

  return { preset, selectedId, disabledLast, viewportWidth, items };
}

export function dispatchBottomNavigatorStorySelect(
  data: BottomNavigatorInitData,
  id: string,
  bridge: (envelope: BottomNavigatorStoryActionEnvelope) => void,
): boolean {
  const item = data.items.find((candidate) => candidate.id === id);
  if (!item || item.availability === "disabled") return false;
  bridge({ channel: "STORYBOOK_ACTION", name: "onSelect", args: [id] });
  return true;
}
