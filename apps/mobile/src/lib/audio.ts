// 오디오 재생 접점입니다. 호스트 앱의 네이티브 모듈 하나(`AudioPlaybackModule`)를
// 감쌉니다. 접점은 모듈마다 파일 하나입니다(ADR-0017 D3) — 화면이 `NativeModules`를
// 직접 만지지 않습니다.
//
// **메서드는 둘뿐입니다** (`play` · `stop`). 일시정지 · 재개 · 시크 · 배속 · 볼륨 ·
// 페이드 · 동시 재생 · **재생 상태 조회** · 배경 재생 · 잠금화면 컨트롤 · 오디오 세션
// 카테고리 조작 · 녹음 · 재생목록 · 프리로드 · 캐시는 **하나도 넓히지 않습니다**
// (ADR-0017 D3). 넓혀야 할 것 같으면 구현하지 말고 보고합니다.
//
// **다시듣기는 메서드가 아닙니다** — `play`를 다시 부르는 것입니다. 그래서 이
// 파일에 `replay`라는 이름이 없습니다.
//
// **재생 상태를 이 파일이 들고 있지 않습니다.** 상태의 주인은 `ListeningPrompt`의
// `useState` 하나입니다. 여기에도 두면 진실이 둘이 되고, 어긋나는 순간을 판정할
// 수단이 없습니다 — `play`·`stop`만 두기로 한 결정의 근거가 이것입니다.
//
// **재생 상태 대신 세대(generation) 하나를 듭니다.** 이것은 상태가 아니라 **콜백의
// 유효기간**입니다 — 어느 재생이 「지금 것」인지만 가리고, 재생 중인지 아닌지를
// 답하지 않습니다. 조회 API가 아니므로 위 제외 목록을 넓히지 않습니다.

/** 호스트가 `AudioPlaybackModule`이라는 이름으로 등록합니다. */
interface AudioPlaybackModule {
  play(source: string, done: (result: unknown) => void): void;
  stop(): void;
}

/**
 * 재생 **요청 한 번의 결과**입니다. 재생 상태 조회가 아닙니다.
 * boolean이 아니라 union인 이유는 `isPlaying: true`가 호출자마다 다른 뜻으로
 * 읽히기 때문입니다.
 */
export type AudioPlayOutcome = "started" | "unavailable";

// **`storage.ts`·`accessibility.ts`와 같은 형태입니다 — `typeof` 가드 + `null` 정규화.**
//
// `ui`·`integration` 테스트 환경에는 `NativeModules` 전역이 **아예 없습니다**
// (`hasOwnProperty`가 `false`입니다). 가드 없이 맨 식별자 접근을 하면
// **`ReferenceError: NativeModules is not defined`** 가 납니다. 이 파일은 **화면이
// 렌더될 때마다 불립니다** — 가드가 없으면 `ui`·`integration`이 통째로 죽습니다.
// `storage.ts`도 지금은 같은 형태입니다.
//
// 메인 스레드에서는 `globalThis.NativeModules`가 `undefined`로 세팅되므로, 이 가드는
// 「호스트가 아닌 곳」과 「메인 스레드」를 같은 경로로 보냅니다. 어느 쪽이든 **조용히
// 재생하지 않는 것이 정상 동작**입니다.
//
// **세 export가 모두 이 함수 하나를 지나갑니다.** 없을 때 조용한 것이 세 자리에
// 흩어져 있으면 한 자리만 고칠 수 있습니다.
//
// `typeof NativeModules === "undefined"`는 전역이 **없을 때**만 막습니다. `typeof null`은
// `"object"`라 전역 자체가 `null`이면 이 가드를 통과하고, 바로 아래의 색인 접근
// (`NativeModules["…"]`)에서 TypeError가 납니다. 아래 `NativeModules === null` 줄이 그
// 사각을 막습니다.
//
// **이 방어의 근거는 관찰이 아닙니다.** 전역이 `null`로 세팅되는 경로는 확인되지
// 않았습니다 — `@lynx-js/types@4.1.0`의 `declare global { var NativeModules: INativeModules }`
// 선언에 `null`이 없고, `apps/**`에 `NativeModules =` 대입이 0건이며, iOS Pod 네이티브
// 소스가 벤더링돼 있지 않아 실제 등록 코드를 확인할 수 없습니다. 이 줄이 있는 이유는
// 관찰이 아니라 **위 가드가 자기가 막는다고 주장하는 값(전역이 없거나 비정상인 경우)의
// 부분집합만 실제로 막는다는 논리적 사실**입니다 — `typeof` 가드는 "없음"만 잡고
// "있는데 `null`"은 놓칩니다.
//
// 아래 `module ?? undefined`(모듈 값의 `null` 정규화)는 Pod 소스와
// 실기 관찰로 근거가 섰습니다. 이 줄은 그렇지 않습니다 — 같은 파일 안에서 근거의
// 종류가 갈립니다.
function nativeModule(): AudioPlaybackModule | undefined {
  if (typeof NativeModules === "undefined") {
    return undefined;
  }
  if (NativeModules === null) {
    return undefined;
  }
  const module = (NativeModules as Record<string, unknown>)["AudioPlaybackModule"] as
    | AudioPlaybackModule
    | undefined;
  // registerModule이 아직 안 끝났을 때는 `undefined`가 아니라 `null`이 관찰됩니다.
  // 캐스팅만 믿으면 이 축이 새나가므로 여기서 `undefined`로 정규화합니다.
  return module ?? undefined;
}

// **지금 유효한 재생의 세대입니다.** 단조 증가하고 되돌아가지 않습니다.
//
// `playAudio`가 갱신하고(새 재생이 이전 것을 대체합니다), `stopAudio`가
// 갱신하고(멈춘 재생의 완료는 오지 않습니다), **완료를 한 번 올린 뒤에도
// 갱신합니다**(전달한 세대는 소멸합니다). 콜백은 자기가 태어난 세대와 이 값을
// 비교해 다르면 조용히 사라집니다.
//
// 초기값이 0이고 어떤 콜백도 0으로 태어나지 않습니다 — 첫 재생이 이미 1입니다.
let currentGeneration = 0;

/**
 * 호스트에 이 모듈이 있는가입니다. 없으면 `false`이고 부수효과가 없습니다.
 *
 * **화면은 이것을 부르지 않습니다** — 가용 여부로 UI를 가르지 않습니다.
 * 소비자는 `unit` 테스트와 사람이고, `storage.ts`의 `isStorageAvailable`과 같은
 * 자리입니다.
 */
export function isAudioAvailable(): boolean {
  return nativeModule() !== undefined;
}

/**
 * `source`를 **처음부터** 재생하도록 호스트에 넘깁니다. 던지지 않습니다.
 *
 * 모듈이 없으면 아무 일도 하지 않고 `"unavailable"`을 돌려줍니다 — `onFinished`도
 * 부르지 않습니다. 늦게 온 완료 신호는 버리고(세대), 전달한 완료는 **한 번만**
 * 올라갑니다.
 */
export function playAudio(source: string, onFinished: () => void): AudioPlayOutcome {
  const host = nativeModule();
  if (host === undefined) {
    return "unavailable";
  }

  currentGeneration += 1;
  const generation = currentGeneration;

  // **`stop`을 먼저 부르지 않습니다.** 새 `play`가 이전 것을 대체합니다(ADR-0017 D3)
  // — 여기서 멈추면 대체 규약을 우회하는 셈이라, 네이티브 `stop`이 두 번 불리게
  // 됩니다. 이전 재생의 콜백은 위의 세대 갱신 하나로 이미 무효가 됩니다.
  host.play(source, () => {
    if (generation !== currentGeneration) {
      // 늦게 온 이전 재생의 완료 신호입니다. 여러 번 와도 여기서 전부 버려집니다.
      return;
    }
    // **전달한 세대는 소멸합니다** — 같은 콜백이 두 번 도착해도 위로는 한 번만
    // 올라갑니다.
    currentGeneration += 1;
    onFinished();
  });

  return "started";
}

/**
 * 재생 중인 것을 멈춥니다. 모듈이 없어도 던지지 않습니다.
 *
 * **`onFinished`를 부르지 않습니다** — 멈춘 것과 끝난 것은 다르고, 멈춘 쪽은 부른
 * 자리가 이미 압니다.
 */
export function stopAudio(): void {
  const host = nativeModule();
  if (host === undefined) {
    return;
  }

  // 세대를 먼저 갱신합니다 — 대기 중인 `onFinished`가 이 줄 하나로 무효가 됩니다.
  currentGeneration += 1;
  host.stop();
}
