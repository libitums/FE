// 낱말 말하기의 안내 줄을 화면 안으로 끌어옵니다. 인식을 쓸 수 없게 되면 그 까닭이 이 줄에 서는데, 작은 화면
// (360×640)에서는 그림 카드 · 파형 아래로 밀려 접힌 아래에 남았습니다 — 사용자는 까닭 없이 Skip 하나만 봤습니다.
// 껍데기의 합친 스크롤(`scrollCard`) 안이라 `scrollIntoView`가 그 스크롤을 움직입니다. `invoke`는 ID 선택자만 받습니다.
// 부르는 때는 안내 줄의 `layoutchange`입니다 — 국면 효과에서 부르면 글자가 높이를 갖기 전이라 빈 칸까지만 내려갔습니다
// (2026-11-23 에뮬레이터, 두 줄 중 하나도 보이지 않음).

/** 안내 줄의 id입니다. `data-testid`와 같은 문자열입니다. */
export const speakWordHintId = "speak-word-hint";

/** 안내 줄을 화면 아래 끝까지 끌어옵니다. 못 옮겨도 던지지 않습니다 — 손으로 내려 볼 수 있습니다. */
export function revealSpeakWordHint(): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${speakWordHintId}`)
      .invoke({
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "end", behavior: "smooth" } },
      })
      .exec();
  } catch {
    // 못 옮겨도 안내 줄은 아래로 내려 읽을 수 있습니다.
  }
}
