// 그림 문항의 로드 상태를 문항마다 들고 있는 훅입니다. 문항이 바뀔 때마다 `loading`에서 다시 시작하고,
// 그림의 `load` · `error` 이벤트나 시간 초과가 `wordChoicePictureStateAfter`로 끝 상태에 보냅니다.
//
// 시간 초과를 두는 까닭: 그림 요소의 `error` 이벤트가 실패마다 오는지 기기에서 확인된 적이 없습니다. 이벤트가
// 영영 안 오는 경우를 타이머가 끝내서, 보기가 잠긴 채로 막히는 일이 없습니다.

import { useEffect, useState } from "@lynx-js/react";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import {
  wordChoicePictureLabel,
  wordChoicePictureStateAfter,
  wordChoicePictureTimeoutMs,
} from "./word-choice-picture";
import type { WordChoicePictureEvent, WordChoicePictureState } from "./word-choice-picture";
import type { WordChoiceQuestion } from "./word-choice-questions";

type PictureEntry = { readonly index: number; readonly state: WordChoicePictureState };

const noop = (): void => undefined;

export function useWordChoicePicture(
  question: WordChoiceQuestion | null | undefined,
  questionIndex: number,
): {
  readonly state: WordChoicePictureState;
  readonly onLoad: () => void;
  readonly onError: () => void;
} {
  const copy = useUiCopy();
  const hasPicture = question?.picture !== undefined;
  const [entry, setEntry] = useState<PictureEntry>({ index: questionIndex, state: "loading" });
  // 다른 문항 몫의 상태는 읽지 않습니다 — 문항이 바뀌면 곧바로 `loading`입니다.
  const state = entry.index === questionIndex ? entry.state : "loading";

  const send = (event: WordChoicePictureEvent): void => {
    setEntry((current) => {
      const before = current.index === questionIndex ? current.state : "loading";
      const next = wordChoicePictureStateAfter(before, event);
      return current.index === questionIndex && before === next
        ? current
        : { index: questionIndex, state: next };
    });
  };

  // 로딩이 끝나지 않으면 시간이 끝냅니다. 끝 상태가 되거나 문항이 바뀌면 타이머를 치웁니다.
  useEffect(() => {
    if (!hasPicture || state !== "loading") return;
    const timer = setTimeout(() => send("timeout"), wordChoicePictureTimeoutMs);
    return () => clearTimeout(timer);
  }, [hasPicture, questionIndex, state]);

  // 실패로 바뀌는 순간 한 번 낭독합니다(그림 이름이 그 사실을 말합니다).
  useEffect(() => {
    if (!hasPicture || state !== "failed" || question == null) return;
    announce(wordChoicePictureLabel(question.prompt, "failed", copy));
  }, [hasPicture, questionIndex, state]);

  if (!hasPicture) {
    return { state: "loaded", onLoad: noop, onError: noop };
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
