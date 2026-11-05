// 활동 안내 층(ADR-0104 D3)이 활동 화면의 `LearningShell`에 「위가 덮였다」를 알리는 컨텍스트입니다. 층 밖이면
// `undefined`(속성 없음), 층 안이면 안내가 떠 있는지(true · false)입니다 — 닫힐 때 `false`를 써서 복원을 보장합니다.

import { createContext } from "@lynx-js/react";

export const LearningGuideObscuredContext = createContext<boolean | undefined>(undefined);
