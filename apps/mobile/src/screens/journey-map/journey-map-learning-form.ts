// 스텝→학습형 배정표를 소유합니다 — `learningFormByStep`과 조회 함수
// `learningFormForStep`입니다. 실제 배정이 오기 전까지 다섯 키 전부가 `"listening"`을
// 가리키는 임시 값입니다.

import type { LearningForm } from "../../lib/learning-form";
import type { JourneyStepId } from "./journey-map-units";

// 스텝→학습형 표입니다. export하지 않는 모듈 내부 상수이고 나가는 것은 아래 함수
// 하나뿐입니다 — `stepStatusSuffix`·`stepOpensSheet`·`lib/answer-result.ts`와 같은
// 형태입니다. 표를 내보내면 다음 사람이 직접 색인해 자기 답을 짓습니다.
//
// ⚠ **오른쪽 다섯 값은 배정이 아니라 2026-09-05 데이터의 전사(轉寫)입니다.**
// 「이 스텝이 듣기로 정해졌다」가 아니라 「오늘 이 스텝에 있는 문항이 듣기 문항뿐이다」를
// 적은 것입니다 — `listeningQuestionsByStep`(`listening.ts`)이 다섯 키 전부에 문항
// 셋을 갖고, `sentenceOrderQuestionsByStep`(`sentence-order.ts`) ·
// `wordChoiceQuestionsByStep`(`word-choice.ts`)은 다섯 키가 다 빈 배열입니다. 그래서
// 이 값에서 동작 변화가 0입니다.
//
// **왜 빈 채로 둘 수 없나** — `LearningForm` union에 빈 값(`""`도 `null`도)이 없고
// `Record`가 다섯 키를 전부 요구합니다. 두 문항 표가 쓴 「빈 배열 + 사유 주석」을 이
// 자리는 쓸 수 없습니다.
//
// **무엇이 막고 있나** — 실제 배정은 컨텐츠 판단이고 아직 열려 있습니다. **문항
// 값과 같은 시점에 옵니다** — 문항 없이 배정만 옮기면 그 스텝이 문항 0개인 화면을
// 엽니다.
//
// **값이 오는 날 무엇만 바뀌나** — **이 표의 오른쪽 다섯 개**와 그 스텝의 문항 배열
// 둘뿐입니다. **형태는 한 글자도 안 바뀝니다.** 어긋나면 교차 불변식이 먼저 빨개져
// 옮길 문항을 함께 옮기라고 말합니다.
//
// 문화는 다섯 키 전부에 서사를 갖지만 그 값은 임시라 배정 근거가 못 됩니다 —
// 문항 표 셋과 성질이 다릅니다.
//
// **정의역은 「일반 유닛의 스텝 전부」입니다.** 특별 유닛은 기본 학습형을 돌지 않아
// 이 표의 정의역 밖이고, 스텝을 갖지 않으므로 원리적으로 키가 될 수 없습니다.
// `JourneyStepId`가 곧 그 정의역이라 이 `Record`가 그대로 정의역을 집니다 — 표를
// 좁히는 코드가 따로 없는 것이 판정입니다.
const learningFormByStep: Record<JourneyStepId, LearningForm> = {
  greeting: "listening",
  introduction: "listening",
  ordering: "listening",
  appointment: "listening",
  directions: "listening",
};

// 던지지 않는 총함수입니다 — `Record`가 다섯 키를 전부 덮는 것을 tsc가 지므로 방어
// 분기도 `undefined` 반환도 없습니다. `sentenceOrderQuestionsForStep`이 쓴 것과 같은
// 문장입니다. 새 스텝이 늘면 위 `Record`가 `TS2741`로 섭니다.
export function learningFormForStep(id: JourneyStepId): LearningForm {
  return learningFormByStep[id];
}
