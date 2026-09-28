import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import refresh from "@libitums/icons/lynx/refresh";
import { color } from "@libitums/design-tokens";

import { listeningPromptScale, playbackActionFor, playbackStateAfterPlay } from "./listening";
import type { ListeningPlaybackAction, ListeningPlaybackState } from "./listening";
import { pauseAudio, playAudio, resumeAudio, stopAudio } from "../../lib/audio";
import type { SessionOptions } from "../../lib/session-options";

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
// **`NativeModules`를 직접 만지지 않습니다**(ADR-0017 D3). 접점은 `lib/audio.ts`
// 하나이고 그 파일이 모듈 부재 · 늦게 온 완료 · 중복 완료를 전부 흡수합니다.
//
// **`<audio>`·`<video>`를 렌더하지 않습니다.** 판정 환경(Pod 4.0.1)에 미등록이라
// 렌더하면 페이지 전체가 죽습니다 — 소리는 네이티브 모듈이 냅니다.

// 아이콘 모양이 **색과 독립인 채널**입니다(WCAG 1.4.1). 리터럴을 적지 않고 패키지
// 모듈을 가져옵니다(ADR-0014 D6). 전체 index를 import하지 않습니다 — 819개가 번들에
// 들어갑니다.
//
// **이제 `pause`(❚❚)를 씁니다.** 안 쓰던 근거는 *"❚❚를 그리면 누르면 이어서 재생된다를
// 약속하는데 다시 누르면 처음부터 난다"* 였습니다. 그 약속이 이제 참입니다.
const playbackIconByAction: Record<ListeningPlaybackAction, string> = {
  pause,
  resume: play,
  play,
};

// **보이는 낱말이 없으므로 이름은 `accessibility-label`이 혼자 집니다.** 동그란 아이콘
// 버튼이라 라벨 자리가 없습니다 — 그래서 아이콘이 크기를 못 받아 안 보이면 남는 채널이
// 이름 하나뿐입니다. 그 위험을 아이콘 상자를 크게(48) 잡는 것으로 갚습니다.
//
// 상태가 라벨 접미사로 붙지 않습니다: 이 버튼은 상태가 갈리는 것이 아니라 **하는 일이
// 갈립니다**(`듣기`·`이어 듣기`·`멈춤`은 서로 다른 이름입니다).
const playbackLabelByAction: Record<ListeningPlaybackAction, string> = {
  pause: "멈춤",
  resume: "이어 듣기",
  play: "듣기",
};

export type ListeningPromptProps = {
  text: string;
  romanization: string;
  audioSource: string;
  sessionOptions: SessionOptions;
};

export function ListeningPrompt({
  text,
  romanization,
  audioSource,
  sessionOptions,
}: ListeningPromptProps): ReactNode {
  // **재생 상태의 주인은 이 `useState` 하나입니다.** `lib/audio.ts`에도 두면 진실이
  // 둘이 되고 어긋나는 순간을 판정할 수단이 없습니다 — ADR-0017 D3이 상태 조회 API를
  // 거부한 그 근거입니다.
  const [playback, setPlayback] = useState<ListeningPlaybackState>("idle");

  useEffect(() => {
    // 문항이 화면에 뜨면 재생합니다 — **자동 재생**입니다. 화면 정체성이 듣기이고,
    // 수동 재생만 두면 문항마다 첫 조작이 언제나 `듣기` 탭이라 완료까지의 탭 수가
    // 문항 수만큼 늡니다.
    //
    // **`playbackStateAfterPlay`를 지납니다.** 삼항으로 다시 쓰면 전이의 정본이 둘이
    // 되고 `unit`이 보던 자리가 사라집니다. `"unavailable"` → `"idle"`이 **모듈이 없을
    // 때 「멈춤」에 영구히 갇히는 것**을 막는 유일한 자리입니다.
    if (sessionOptions["auto-play-audio"]) {
      setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));
    }

    // **cleanup 하나가 넷을 집니다** — 문항 변경 · 완료 · 출구 둘 · 탭 전환입니다.
    // 각각 손으로 이으면 다섯째 경로가 생겼을 때 조용히 빠지고, 그러면 화면을 떠나도
    // 소리가 계속 납니다.
    return () => stopAudio();

    // **dep은 `audioSource` 하나입니다.** `text`가 바뀔 때 다시 트는 것은 「문항마다
    // 처음부터 다시 튼다」가 아니라 「리렌더마다 다시 튼다」이고, 그 둘은 다릅니다.
  }, [audioSource]);

  const action = playbackActionFor(playback);
  const scale = listeningPromptScale(text);

  // 세 갈래가 전부입니다. 갈래를 컴포넌트 안 삼항이 아니라 `playbackActionFor`가
  // 정하므로, 상태가 늘면 `tsc`가 그 함수를 가리킵니다.
  const handlePlaybackTap = (): void => {
    switch (action) {
      case "pause":
        pauseAudio();
        setPlayback("paused");
        return;
      case "resume":
        resumeAudio();
        setPlayback("playing");
        return;
      case "play":
        setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));
    }
  };

  // **다시듣기는 언제나 「처음부터」입니다.** 메서드가 아니라 `play`를 다시 부르는
  // 것이고(ADR-0017 D3), 그래서 재생 중이든 멈춰 뒀든 같은 일을 합니다.
  const handleReplayTap = (): void => {
    setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));
  };

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
      {sessionOptions["show-transcript"] ? (
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
      ) : null}

      {/* 컨트롤 둘. 다시듣기가 왼쪽 · 작고, 재생/일시정지가 **줄 한가운데** · 큽니다 —
          크기와 자리가 둘 중 어느 것이 주된 조작인지를 말합니다(Figma 53-14231에서
          재생의 중심이 카드 중심과 같습니다). */}
      <view className="listening-prompt-controls">
        <view
          className="listening-prompt-replay"
          data-testid="listening-prompt-replay"
          accessibility-element={true}
          accessibility-label="처음부터 듣기"
          accessibility-traits="button"
          bindtap={handleReplayTap}
        >
          {/* 아이콘은 장식이 아니라 **유일한 보이는 채널**입니다. 그래도 접근성 속성을
              붙이지 않습니다 — 이름은 감싼 상자가 지고(ADR-0016 D5), `<svg>`에 붙이면
              정지점이 둘이 됩니다. */}
          <svg
            className="listening-prompt-replay-icon"
            data-testid="listening-prompt-replay-icon"
            content={refresh}
            current-color={color.fg.neutral}
          />
        </view>
        <view
          className="listening-prompt-playback"
          data-testid="listening-prompt-playback"
          // **언제나 렌더됩니다.** 모듈이 없다고 숨기지 않습니다 — 숨기면 「없는 환경」과
          // 「빠뜨린 구현」이 구별되지 않습니다. `disabled`도 두지 않습니다
          // (ADR-0016 D10): 모듈 부재는 영구 불가가 아니라 「이 환경에 아직 없음」입니다.
          accessibility-element={true}
          accessibility-label={playbackLabelByAction[action]}
          accessibility-traits="button"
          bindtap={handlePlaybackTap}
        >
          <svg
            className="listening-prompt-playback-icon"
            data-testid="listening-prompt-playback-icon"
            content={playbackIconByAction[action]}
            current-color={color.fg.neutral}
          />
        </view>
        {/* 다시듣기와 마주 보는 빈 자리입니다 — 같은 폭을 져야 재생이 줄 한가운데
            섭니다. 보이는 것이 없으므로 접근성 트리에 올리지 않습니다. */}
        <view className="listening-prompt-controls-spacer" />
      </view>
    </view>
  );
}
