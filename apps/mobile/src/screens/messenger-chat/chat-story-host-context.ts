// 대화방 스토리 인용 판의 결선(ADR-0178 D5 개정 ⟨판⟩) — 받은 스토리 목록 · 열기 · 사진 서명을 판에 내립니다. 없으면 판은 인용만으로 그리고 누를 수 없습니다.

import { createContext } from "@lynx-js/react";

import type { ChatStoryHost } from "./chat-story-thumb.contract";

export const ChatStoryHostContext = createContext<ChatStoryHost | null>(null);
