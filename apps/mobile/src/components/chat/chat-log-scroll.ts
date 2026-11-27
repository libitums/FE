// 대화 로그를 옮기는 호출들입니다(백그라운드) — 끝으로 · 한 줄이 보이게. 못 옮기면 조용히 둡니다(테스트 환경 · 요소 없음 — 부가 동작).

/** 줄의 요소 id — 메시지 id(`#` · `~`가 섞임)를 선택자로 쓸 수 있는 글자로 바꿉니다. */
export function chatLineElementId(lineId: string): string {
  return `chat-line-${lineId.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export function scrollToEnd(id: string, smooth: boolean): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${id}`)
      .invoke({ method: "scrollTo", params: { offset: 1_000_000, smooth } })
      .exec();
  } catch {
    // 끝 맞춤은 부가 동작입니다.
  }
}

/** 그 줄이 로그 가운데에 보이게 옮깁니다 — 움직임 줄이기면 점프. */
export function scrollLineIntoView(lineId: string, smooth: boolean): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${chatLineElementId(lineId)}`)
      .invoke({
        method: "scrollIntoView",
        params: {
          scrollIntoViewOptions: {
            block: "center",
            inline: "start",
            behavior: smooth ? "smooth" : "none",
          },
        },
      })
      .exec();
  } catch {
    // 줄 보이기는 부가 동작입니다.
  }
}
