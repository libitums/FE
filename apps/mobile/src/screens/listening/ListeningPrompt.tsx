import type { ReactNode } from "@lynx-js/react";

import { ListenPlaybackRow } from "../../components/ListenPlaybackControls";
import type { ListenAudioControl } from "../../components/use-listen-audio";
import type { LearningDensity } from "../../lib/learning-density";
import type { SessionOptions } from "../../lib/session-options";
import { listeningPromptScale } from "./listening";
import type { ListeningBeforeAnswer } from "./listening-questions";

import "./listening-prompt.css";

// 이 컴포넌트는 문항의 **제시 채널**이고, 제시 방식이 바뀌면 통째로 교체되는 자리입니다.
//
// 2026-09-27에 통째로 갈렸습니다(Figma 53-14231). 알약 하나짜리 컨트롤이 **동그란 둘**이
// 되고, 대본이 **큰 글자 + 로마자 한 줄**이 됩니다. 그 셋이 카드 안에 세로로 섭니다.
//
// **컨트롤이 둘이 된 근거가 ADR-0017 D3 개정입니다.** 일시정지가 없던 동안 다시듣기와
// 재생은 같은 일(`play`를 다시 부르기)이었고, 그래서 컨트롤도 하나였습니다. 일시정지가
// 열리면서 둘이 **다른 일**을 하게 됐습니다 — 하나는 그 자리에서 멈추고 잇고, 다른
// 하나는 처음부터 다시 텁니다.
//
// **이 컴포넌트는 표시만 합니다.** 재생 상태 · 자동 재생 · 조작은 화면의
// `useListenAudio`가 주인이고(학습 껍데기가 배치를 바꿀 때 무대 내용을 다시 세워도
// 소리가 끊기지 않게 하려는 것입니다), 여기에는 `playback` 묶음 하나로 내려옵니다.
// `NativeModules`도 직접 만지지 않습니다(ADR-0017 D3) — 접점은 `lib/audio.ts` 하나입니다.
//
// **`<audio>`·`<video>`를 렌더하지 않습니다.** 판정 환경(Pod 4.0.1)에 미등록이라
// 렌더하면 페이지 전체가 죽습니다 — 소리는 네이티브 모듈이 냅니다.

export type ListeningPromptProps = {
  text: string;
  romanization: string;
  /** 대본을 보일지(`show-transcript`)만 읽습니다. */
  sessionOptions: SessionOptions;
  /** 판정이 나서 대본을 열어 보일 때 true — 설정이 꺼져 있어도 대본이 섭니다. */
  revealed: boolean;
  /** 재생 상태와 조작을 묶어 받습니다 — 주인은 화면의 `useListenAudio`입니다. */
  playback: ListenAudioControl;
  /** 대본이 가려진 동안에도 로마자 줄만 참고로 세울 때 true입니다(문항이 정합니다). */
  romanizationHint?: boolean;
  /** 답하기 전 대본 자리에 무엇을 세우는가입니다. `romanizationHint`를 대신할 갈래 값입니다. */
  beforeAnswer?: ListeningBeforeAnswer;
  /** 문항의 밀도입니다(글자 단계와 카드 여백이 갈립니다). */
  density?: LearningDensity;
};

export function ListeningPrompt({
  text,
  romanization,
  sessionOptions,
  revealed,
  playback,
  romanizationHint = false,
}: ListeningPromptProps): ReactNode {
  const scale = listeningPromptScale(text);
  const transcriptShown = sessionOptions["show-transcript"] || revealed;

  return (
    <view className="listening-prompt">
      {/* **DOM 순서 = 낭독 순서입니다.** 제시문이 먼저, 컨트롤이 뒤입니다 — 보조기술
          사용자가 「무엇을 들을 것인가」를 먼저 만나고 그 다음 「어떻게 들을 것인가」를
          만납니다. 시각 순서도 같습니다(Figma 53-14231): 큰 글자가 위, 동그란 둘이
          아래입니다. 그래서 `order`로 뒤집을 일이 없습니다.

          **대본은 CSS로 숨기지 않고 렌더를 거릅니다.** jsdom은 스타일을 계산하지 않아
          `display:none`은 ui 계층이 원리적으로 못 보고, 숨긴 `<text>`는 보조기술
          정지점으로 남습니다 — 「보이지 않는다」가 거짓이 됩니다. 로마자 줄도 같은
          가림을 받습니다: 그것도 소리를 글자로 옮긴 것이라 대본입니다. */}
      {transcriptShown ? (
        // 크기 단계가 문장 길이에서 나옵니다 — 긴 문장을 큰 글자로 두면 카드가 늘어나
        // 아래 보기를 화면 밖으로 밉니다. 로마자 줄도 같은 단계를 받습니다: 둘의 크기
        // 차이가 유지돼야 한글이 주인공이라는 것이 읽힙니다.
        <view className={`listening-prompt-script listening-prompt-scale-${scale}`}>
          <text className="listening-prompt-text" data-testid="listening-prompt-text">
            {text}
          </text>
          <text
            className="listening-prompt-romanization"
            data-testid="listening-prompt-romanization"
          >
            {romanization}
          </text>
        </view>
      ) : romanizationHint ? (
        // 답하기 전 참고 줄입니다 — 한글 대본은 가린 채 로마자 한 줄만 섭니다. 크기 단계는 대본과 같습니다.
        <view className={`listening-prompt-script listening-prompt-scale-${scale}`}>
          <text
            className="listening-prompt-romanization listening-prompt-romanization-hint"
            data-testid="listening-prompt-romanization"
          >
            {romanization}
          </text>
        </view>
      ) : null}

      {/* 컨트롤 줄 — 다시듣기(작음) · 재생/일시정지(큼, 줄 한가운데) · 「천천히」(속도 재생을 지원할 때만)입니다.
          줄의 모양과 이름은 `ListenPlaybackRow`가 집니다. */}
      <ListenPlaybackRow control={playback} testIdPrefix="listening-prompt" />
    </view>
  );
}
