import type { ReactNode } from "@lynx-js/react";

import type { CatalogFinalScreenProps } from "./catalog-final.contract";

import "./catalog-final-screen.css";

// 카탈로그 에피소드의 최종 테스트 화면입니다 — 상대 대사에 타일을 놓아 대답을 만듭니다.
export function CatalogFinalScreen(_props: CatalogFinalScreenProps): ReactNode {
  return <view className="catalog-final-screen" data-testid="catalog-final-screen" />;
}
