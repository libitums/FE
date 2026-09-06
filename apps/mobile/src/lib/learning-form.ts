// 학습형 어휘의 정본. 기본 학습형 여섯(docs/screens.md:122) 중 **화면을 가진 셋**만
// 담는다 — 분류가 아니라 「지금 열 수 있는 학습 화면」의 어휘다
// (계약 .agent-harness/work/lib-236/spec.md §1.3(c)).
//
// screens/가 아니라 lib/인 근거는 docs/conventions/code.md 「import」의 승격 조건
// 둘을 다 만족하기 때문이다 — 값 셋이 각각 화면 하나를 가리켜 어느 한 화면의 것이
// 아니고, 타입 이름이 가리키는 화면이 없다 (§1.3(a)·(b)). AnswerResult가 lib/로
// 올라온 것과 같은 저울이고, JourneyStepId가 올라가지 않는 것과 갈리는 자리다.
//
// **타입 하나짜리 모듈이다.** learningFormLabel은 이 이슈에서 만들지 않는다 —
// 소비자가 생기지 않았다 (§1.3(e) 보정). 값 export가 0건이라 이 모듈에는
// *.unit.test.ts가 붙지 않고, 타입이 지켜지는지는 tsc가 진다
// (§1.2(a) 보정 · ADR-0006 D4).

/** 기본 학습형 중 **화면을 가진 것**. docs/screens.md 「학습의 세 유형」의 이름과 1:1이다. */
export type LearningForm = "listening" | "sentence-order" | "word-choice";
