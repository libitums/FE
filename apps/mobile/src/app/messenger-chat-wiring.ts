// 메신저 탭의 결선입니다(messenger-chat-ui spec §7.1 · §11). 대화 출처는 앱 프로세스 싱글턴이고(1단계 가짜 —
// 로그아웃 · 계정 삭제와 무관), 이동 콜백은 `dispatch`를 화면 밖에 둡니다. 배경 전용 라이브러리를 값으로 가져오지 않습니다.

import type { Dispatch } from "@lynx-js/react";

import {
  createFixtureChatSource,
  type FixtureChatSource,
} from "../screens/messenger-chat/chat-fixture-source";
import type { ChatSource } from "../screens/messenger-chat/chat-source.contract";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

export type MessengerChatWiring = {
  readonly source: ChatSource;
  readonly onOpenChatRoom: (roomId: string) => void;
  readonly onExitChatRoom: () => void;
  readonly onGoToJourney: () => void;
};

type ImageUrlOf = (relativePath: string) => string | null;

let singleton: FixtureChatSource | null = null;
let latestImageUrlOf: ImageUrlOf | null = null;

/**
 * 앱이 쓰는 대화 출처입니다. 처음 부를 때 만들고 이후 같은 것을 돌려줍니다.
 *
 * 그림 해석기는 **부를 때마다 최신으로 갈아 끼웁니다**. 앱은 에피소드 콘텐츠가 읽히기 전 첫 렌더에서(`noEpisodeContent`의
 * `() => null`) 결선을 한 번 지나므로, 처음 받은 해석기를 쥐면 아바타 그림이 영영 풀리지 않습니다(device-findings-1 D3).
 */
export function messengerChatSource(imageUrlOf: ImageUrlOf): ChatSource {
  const replaced = latestImageUrlOf !== null && latestImageUrlOf !== imageUrlOf;
  latestImageUrlOf = imageUrlOf;
  if (singleton === null) {
    singleton = createFixtureChatSource({
      imageUrlOf: (relativePath) => latestImageUrlOf?.(relativePath) ?? null,
    });
  } else if (replaced) {
    singleton.refreshImages();
  }
  return singleton;
}

/** 테스트가 케이스 사이에 출처를 처음 씨앗으로 되돌립니다. */
export function resetMessengerChatSourceForTests(): void {
  singleton?.dispose();
  singleton = null;
  latestImageUrlOf = null;
}

export type MessengerChatWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly imageUrlOf: (relativePath: string) => string | null;
};

export function messengerChatWiring(args: MessengerChatWiringArgs): {
  readonly messengerChat: MessengerChatWiring;
} {
  return {
    messengerChat: {
      source: messengerChatSource(args.imageUrlOf),
      onOpenChatRoom: (roomId) => {
        args.dispatch({ type: "push", screen: { name: "messenger-chat", roomId } });
      },
      onExitChatRoom: () => {
        args.dispatch({ type: "back" });
      },
      onGoToJourney: () => {
        for (const action of tabRootActions("journey")) args.dispatch(action);
      },
    },
  };
}
