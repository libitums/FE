import {
  useCallback,
  useEffect,
  useLynxGlobalEventListener,
  useRef,
  useState,
} from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { ContentLanguage } from "../lib/episode-content";
import { onUiLanguageSaved } from "../lib/ui-language";
import { LanguageDownloadSheet } from "../screens/language-download/LanguageDownloadSheet";
import type { LanguageDownloadState } from "../screens/language-download/language-download.contract";
import type { LanguageDownloadPort } from "./language-download-port";
import { contentSyncEventName } from "./use-episode-content-refresh";

type Shown = { readonly state: LanguageDownloadState; readonly visible: boolean };

/**
 * 앱 언어를 바꾸면(설정 · 처음 언어 선택 · 로그인 뒤 언어 복원) 그 언어의 번역 파일을 바로 받는 시트입니다(ADR-0102 개정
 * ⟨언어 바꿈 받기⟩). 받을 것이 없으면 아무것도 띄우지 않습니다 — 카탈로그는 이미 그 언어 표로 다시 그려집니다. 오프라인이면
 * 「연결되면 받습니다」를 띄우고 연결이 돌아온 호스트 신호에 조용히 받습니다. 받은 뒤 카탈로그를 다시 읽어 재시작 없이
 * 입힙니다(포트). 포트가 없으면(테스트 · Explorer) 아무것도 하지 않습니다.
 */
export function useLanguageDownload(port: LanguageDownloadPort | undefined): ReactNode {
  const [shown, setShown] = useState<Shown | null>(null);
  // 연결이 돌아오면 받을 언어(오프라인 · 실패) — 받는 중이거나 받을 것이 없으면 `null`입니다.
  const pending = useRef<ContentLanguage | null>(null);
  // 언어를 또 바꾸면 앞 받기의 결과로 시트를 바꾸지 않습니다.
  const generation = useRef(0);
  const running = useRef(false);

  const start = useCallback(
    (language: ContentLanguage, silent: boolean) => {
      "background only";
      if (port === undefined) return;
      generation.current += 1;
      const mine = generation.current;
      const plan = port.plan(language);
      if (plan === null) {
        pending.current = null;
        setShown(null);
        return;
      }
      if (port.offline()) {
        pending.current = language;
        setShown(silent ? null : { state: { kind: "offline" }, visible: true });
        return;
      }
      pending.current = null;
      running.current = true;
      setShown({ state: { kind: "downloading", done: 0, ...plan }, visible: !silent });
      void port
        .run(language, (done, total) => {
          if (generation.current !== mine) return;
          setShown((previous) =>
            previous?.state.kind === "downloading"
              ? { ...previous, state: { ...previous.state, done, total } }
              : previous,
          );
        })
        .then((report) => {
          running.current = false;
          if (generation.current !== mine) return;
          if (report.failed === 0) {
            setShown(null);
            return;
          }
          pending.current = language;
          setShown(silent ? null : { state: { kind: "failed" }, visible: true });
        });
    },
    [port],
  );

  useEffect(
    () =>
      onUiLanguageSaved((language) => {
        if (language === "en") {
          generation.current += 1;
          pending.current = null;
          setShown(null);
          return;
        }
        start(language, false);
      }),
    [start],
  );
  // 연결이 돌아오거나 앱이 앞으로 오면(호스트 신호) 미뤄 둔 언어를 조용히 받습니다.
  useLynxGlobalEventListener(contentSyncEventName, () => {
    "background only";
    const language = pending.current;
    if (language !== null && !running.current) start(language, true);
  });

  if (shown === null || !shown.visible) return null;
  const close = () => setShown(null);
  return (
    <LanguageDownloadSheet
      state={shown.state}
      onHide={() =>
        setShown((previous) => (previous === null ? null : { ...previous, visible: false }))
      }
      onRetry={() => {
        const language = pending.current;
        if (language !== null) start(language, false);
      }}
      onClose={close}
    />
  );
}
