// 대화방의 스토리 인용 그림 주소 해석기(ADR-0178 D5) — 결선이 버킷 상대 경로를 주소로 바꾸는 함수를 내려줍니다. 없으면 그림 없이 글만.

import { createContext } from "@lynx-js/react";

export const StoryImageContext = createContext<(path: string) => string | null>(() => null);
