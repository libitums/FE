// 그림 문항의 로드 상태를 문항마다 들고 있는 훅입니다. 문항이 바뀔 때마다 `loading`에서 다시 시작하고,
// 그림의 `load` · `error` 이벤트나 시간 초과가 `pictureLoadStateAfter`로 끝 상태에 보냅니다.
//
// 시간 초과를 두는 까닭: 그림 요소의 `error` 이벤트가 실패마다 오는지 기기에서 확인된 적이 없습니다. 이벤트가
// 영영 안 오는 경우를 타이머가 끝내서, 말하기가 잠긴 채로 막히는 일이 없습니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { pictureLoadStateAfter, pictureLoadTimeoutMs } from "../../lib/picture-load";
import type { PictureLoadEvent, PictureLoadState } from "../../lib/picture-load";
import { useUiCopy } from "../../lib/ui-copy";
import { speakWordPictureLabel } from "./speak-word";

type PictureEntry = { readonly index: number; readonly state: PictureLoadState };

export function useSpeakWordPicture(
  questionIndex: number,
  meaning: string | null,
): {
  readonly state: PictureLoadState;
  readonly onLoad: () => void;
  readonly onError: () => void;
} {
  const copy = useUiCopy();
  const hasPicture = meaning !== null;
  const [entry, setEntry] = useState<PictureEntry>({ index: questionIndex, state: "loading" });
  // 다른 문항 몫의 상태는 읽지 않습니다 — 문항이 바뀌면 곧바로 `loading`입니다.
  const state = entry.index === questionIndex ? entry.state : "loading";

  // 가장 나중에 그려진 문항 번호입니다. 걷힌 앞 문항의 핸들러가 뒤늦게 불려도 새 문항 상태를 덮지 않게 합니다.
  const latestIndex = useRef(questionIndex);
  latestIndex.current = questionIndex;

  const send = (event: PictureLoadEvent): void => {
    if (latestIndex.current !== questionIndex) return;
    setEntry((current) => {
      const before = current.index === questionIndex ? current.state : "loading";
      const next = pictureLoadStateAfter(before, event);
      return current.index === questionIndex && before === next
        ? current
        : { index: questionIndex, state: next };
    });
  };

  // 로딩이 끝나지 않으면 시간이 끝냅니다. 끝 상태가 되거나 문항이 바뀌면 타이머를 치웁니다.
  useEffect(() => {
    if (!hasPicture || state !== "loading") return;
    const timer = setTimeout(() => send("timeout"), pictureLoadTimeoutMs);
    return () => clearTimeout(timer);
  }, [hasPicture, questionIndex, state]);

  // 실패로 바뀌는 순간 한 번 낭독합니다(그림 이름이 그 사실을 말합니다).
  useEffect(() => {
    if (meaning === null || state !== "failed") return;
    announce(speakWordPictureLabel(meaning, "failed", copy));
  }, [hasPicture, questionIndex, state]);

  if (!hasPicture) {
    return { state: "loaded", onLoad: () => undefined, onError: () => undefined };
  }
  return {
    state,
    onLoad: () => {
      "background only";
      send("load");
    },
    onError: () => {
      "background only";
      send("error");
    },
  };
}
