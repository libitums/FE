import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import play from "@libitums/icons/lynx/play";
import stop from "@libitums/icons/lynx/stop";
import { color } from "@libitums/design-tokens";

import { playbackStateAfterPlay } from "./listening";
import type { ListeningPlaybackState } from "./listening";
import { playAudio, stopAudio } from "../../lib/audio";

import "./listening-prompt.css";

// LIB-223 (ui): 계약(.agent-harness/work/lib-223/spec.md §9.5 「ListeningPrompt의 새
// 모양」 · §9.6 「호출 지점과 시점」)의 속성 전부를 채운다.
//
// 이 컴포넌트는 문항의 **제시 채널**이고, 제시 방식이 바뀌면 통째로 교체되는 자리다
// (§1.7.2 교체 이음매 2/2). ADR-0017이 호스트의 오디오 재생 능력을 열면서 이 자리가
// **대본 + 재생 조작** 둘을 지게 됐다.
//
// **대본(`listening-prompt-text`)은 그대로 남는다** (계약 §9.5(a)). 자산은 15개 있다
// (`apps/ios/Host/audio/<audioSource>.m4a`). 다만 그 15개는 `tooling/audio/generate.sh`가
// macOS `say`로 만든 **기계 음성이라 판정용이지 컨텐츠가 아니다** — *소리가 나는가*는
// 판정되지만 *무엇을 들려줄 것인가*는 아직 정해지지 않았다. 실제 문항 오디오의 공급
// 경로는 여전히 미결정이다 (`docs/adr/README.md` 보류 표 「오디오 자산의 출처·형식」
// — 닫히지 않는 행이다). 게다가 **개발 루프(Explorer)에는 이 모듈이 없어 소리가
// 나지 않고** (ADR-0017 「대가」) 테스트 환경도 마찬가지다. 그래서 대본은 **실제
// 컨텐츠가 정해지는 날 걷는 임시 채널**이다. 그날 감출지 접을지 정한다 — 이음매
// 두 자리는 그대로다.
//
// **재생 호출의 소유자가 이 컴포넌트다** (계약 §9.5(b)의 판정). 오디오를 아는
// 컴포넌트가 하나로 남고, effect의 dep이 `audioSource` 하나여서 *문항이 바뀌면 멈추고
// 다시 튼다*가 구조로 보장된다. `ListeningScreen`이 소유하는 안은 이음매가 화면으로
// 번져서 버렸다.
//
// **`NativeModules`를 직접 만지지 않는다** (ADR-0017 D3). 접점은 `lib/audio.ts` 하나이고
// 그 파일이 모듈 부재 · 늦게 온 완료 · 중복 완료를 전부 흡수한다.
//
// **`<audio>`·`<video>`를 렌더하지 않는다.** 판정 환경(Pod 4.0.1)에 미등록이라 렌더하면
// 페이지 전체가 죽는다 — 소리는 네이티브 모듈이 낸다.

// 계약 §9.5(d)의 Record 셋. `ListeningChoice.tsx`의 형태 그대로다.
//
// 아이콘 모양이 **색과 독립인 채널**이다 (WCAG 1.4.1 · design §6.5-b: 두 상태의 색
// 상호 대비가 1.00이고 갈리는 것은 삼각형↔정사각형과 낱말뿐이다). 리터럴을 적지 않고
// 패키지 모듈을 가져온다 (ADR-0014 D6). 전체 index를 import하지 않는다 — 819개가
// 번들에 들어간다.
//
// **`pause`(❚❚)를 쓰지 않는다.** 파일은 있지만 ADR-0017 D3이 일시정지를 제외했고,
// ❚❚를 그리면 *누르면 이어서 재생된다*를 약속한다. 다시 누르면 **처음부터** 난다.
const playbackIconByState: Record<ListeningPlaybackState, string> = {
  idle: play,
  playing: stop,
};

// **`accessibility-label`과 보이는 문구가 같은 문자열이다** — 음성 제어 불일치가
// 생기지 않는다 (계약 §9.5(d)). 상태가 라벨 접미사로 붙지 않는다: 이 버튼은 상태가
// 갈리는 것이 아니라 **하는 일이 갈린다** (`듣기`와 `멈춤`은 서로 다른 이름이다).
//
// 세 번째 채널이기도 하다 — 아이콘이 크기를 못 받아 안 보여도 낱말이 상태를 남긴다
// (design §6.5-b(c) · `docs/e2e/design-token-rendering.md`의 선례).
const playbackLabelByState: Record<ListeningPlaybackState, string> = {
  idle: "듣기",
  playing: "멈춤",
};

// design §2.3 · §6.5 — **두 상태가 같은 토큰 상수다.** 색이 상태 채널이 되는 순간
// 회색조에서 두 상태가 뭉친다 (§6.5-b). 흰 라벨/아이콘이 `brand-strong` 면 위에서
// 5.46:1이다.
//
// 색은 CSS가 아니라 `current-color` 속성으로 넘긴다 — Lynx `<svg>`가 CSS `color`를
// 읽지 않는다 (ADR-0014 D2). 하이픈 키라 대괄호 표기다.
const playbackIconColorByState: Record<ListeningPlaybackState, string> = {
  idle: color.fg["neutral-inverted"],
  playing: color.fg["neutral-inverted"],
};

export type ListeningPromptProps = {
  text: string;
  audioSource: string;
};

export function ListeningPrompt({ text, audioSource }: ListeningPromptProps): ReactNode {
  // **재생 상태의 주인은 이 `useState` 하나다** (계약 §9.5). `lib/audio.ts`에도 두면
  // 진실이 둘이 되고 어긋나는 순간을 판정할 수단이 없다 — ADR-0017 D3이 상태 조회
  // API를 거부한 그 근거다.
  //
  // 초기값이 `"idle"`이다. 마운트 effect가 `playAudio`의 결과로 곧바로 덮는다.
  const [playback, setPlayback] = useState<ListeningPlaybackState>("idle");

  useEffect(() => {
    // 계약 §9.6-1 「문항이 화면에 뜨면 재생한다」 — **자동 재생**이다. 화면 정체성이
    // 듣기이고, 수동 재생만 두면 문항마다 첫 조작이 언제나 `듣기` 탭이라 완료까지의
    // 탭 수가 문항 수만큼 는다. 예고 없는 소리는 화면 진입 한 번뿐이고 그 뒤의 재생은
    // 전부 `시작`·`다음`을 누른 직후다.
    //
    // **`playbackStateAfterPlay`를 지난다** (계약 §9.5(c)). 삼항으로 다시 쓰면 전이의
    // 정본이 둘이 되고 `unit`이 보던 자리가 사라진다. `"unavailable"` → `"idle"`이
    // **모듈이 없을 때 「멈춤」에 영구히 갇히는 것**을 막는 유일한 자리다
    // (design §2.6의 「고장이 정상인 척한다」).
    setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));

    // 계약 §9.6-2·6·7·8 — **cleanup 하나가 넷을 진다.** 문항 변경 · 완료 · 출구 둘 ·
    // 탭 전환을 각각 손으로 이으면 다섯째 경로가 생겼을 때 조용히 빠지고, 그러면
    // 화면을 떠나도 소리가 계속 난다.
    return () => stopAudio();

    // **dep은 `audioSource` 하나다.** `text`가 바뀔 때 다시 트는 것은 「문항마다 처음부터
    // 다시 튼다」가 아니라 「리렌더마다 다시 튼다」이고, 그 둘은 다르다.
  }, [audioSource]);

  const handleTap = (): void => {
    if (playback === "playing") {
      // 계약 §9.6-4 — **`stop`만 부른다.** 여기서 `play`를 함께 부르면 대체 규약을
      // 우회하는 셈이고 네이티브 세대 관리와 어긋난다.
      stopAudio();
      setPlayback("idle");
      return;
    }
    // 계약 §9.6-3 — **다시듣기는 메서드가 아니라 `play`를 다시 부르는 것이다**
    // (ADR-0017 D3). 그래서 `stop` 뒤 `play`가 아니라 `play` 하나다.
    setPlayback(playbackStateAfterPlay(playAudio(audioSource, () => setPlayback("idle"))));
  };

  return (
    <view className="listening-prompt">
      {/* **DOM 순서 = 낭독 순서다** (계약 §9.5(d)). 재생 조작이 대본보다 앞에 온다 —
          보조기술 사용자가 대본이 낭독되기 **전에** 다시 들을 수단을 먼저 만난다.
          이것은 시각이 아니라 접근성 계약이라 design이 `order`로 뒤집지 않는다. */}
      <view
        className="listening-prompt-playback"
        data-testid="listening-prompt-playback"
        // **언제나 렌더된다.** 모듈이 없다고 숨기지 않는다 — 숨기면 「없는 환경」과
        // 「빠뜨린 구현」이 구별되지 않는다 (계약 §9.3 · design §2.6).
        accessibility-element={true}
        accessibility-label={playbackLabelByState[playback]}
        accessibility-traits="button"
        // `disabled`를 두지 않는다 (ADR-0016 D10). 모듈 부재는 **영구 불가가 아니라
        // 「이 환경에 아직 없음」**이다. 누르면 아무 일도 일어나지 않고, 그것이 정상
        // 동작이다 (ADR-0017 D3 · `storage.ts` 선례).
        bindtap={handleTap}
      >
        {/* 아이콘은 장식이다 — 라벨 `<text>`가 보이는 이름을 진다 (ADR-0016 D5).
            `<svg>`는 자손이 없으므로 래퍼 가림(`listening-choice-mark`)이 필요 없고
            자신에게만 붙는다 (계약 §9.5(d)). 조작 단위 하나 = 접근성 요소 하나다. */}
        <svg
          className="listening-prompt-playback-icon"
          data-testid="listening-prompt-playback-icon"
          content={playbackIconByState[playback]}
          current-color={playbackIconColorByState[playback]}
          accessibility-elements-hidden={true}
        />
        {/* 보이는 이름을 지므로 가리지 않는다. `data-testid`도 붙이지 않는다 —
            루트에 대한 `toHaveTextContent`로 읽힌다 (계약 §9.8). */}
        <text className="listening-prompt-playback-label">{playbackLabelByState[playback]}</text>
      </view>

      {/* 보이는 이름을 지는 요소는 가리지 않는다 — 접근성 속성을 붙이지 않는다
          (ADR-0016 D5 · 계약 §1.7). 조작 단위가 아니므로 accessibility-element도
          붙지 않는다. **속성은 한 글자도 안 바뀌고 자리만 뒤로 갔다** (§9.5(d)). */}
      <text className="listening-prompt-text" data-testid="listening-prompt-text">
        {text}
      </text>
    </view>
  );
}
