// Android 상태바 아이콘 표지의 값입니다. 호스트 `StatusBarIcons`가 트리의 dataset에서
// 읽습니다. 로직 없이 상수만 둡니다.

/** 표지의 값입니다. 호스트 `StatusBarIcons.LIGHT_ICONS`와 같은 문자열이어야 합니다. */
export type StatusBarIconMarker = "light-icons";

/** `data-statusbar` 속성에 넣는 값입니다. 속성 이름은 호스트 `StatusBarIcons.DATASET_KEY`("statusbar")와 짝입니다. */
export const lightStatusBarIcons: StatusBarIconMarker = "light-icons";
