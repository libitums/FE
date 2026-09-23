// 학습형 어휘의 정본입니다. 기본 학습형 여섯(docs/screens.md 「학습의 세 유형」 표)
// 가운데 **화면을 가진 넷**만 담습니다 — 분류가 아니라 「지금 열 수 있는 학습 화면」의
// 어휘입니다.
//
// `screens/`가 아니라 `lib/`인 근거는 `docs/conventions/code.md` 「import」의 승격
// 조건 둘을 다 만족하기 때문입니다 — 값 넷이 각각 화면 하나를 가리켜 어느 한
// 화면의 것이 아니고, 타입 이름이 가리키는 화면이 없습니다. `AnswerResult`가
// `lib/`로 올라온 것과 같은 저울이고, `JourneyStepId`가 올라가지 않는 것과 갈리는
// 자리입니다.
//
// **타입 하나짜리 모듈입니다.** `learningFormLabel`은 아직 만들지 않습니다 —
// 소비자가 생기지 않았습니다. 값 export가 0건이라 이 모듈에는 `*.unit.test.ts`가
// 붙지 않고, 타입이 지켜지는지는 `tsc`가 집니다.

/** 기본 학습형 중 **화면을 가진 것**입니다. `docs/screens.md` 「학습의 세 유형」의 이름과 1:1입니다. */
export type LearningForm = "listening" | "sentence-order" | "word-choice" | "culture";
