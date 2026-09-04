import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { announce } from "../../lib/accessibility";
import { AssessmentItem } from "./AssessmentItem";
import {
  assessmentAnnouncement,
  assessmentPassCriterion,
  assessmentScreenTitle,
  assessmentVerdictLabel,
  judgeAssessment,
} from "./assessment";
import type { AssessmentVerdict } from "./assessment";
import type { ListeningAnswerResult } from "../listening/listening";

import "./assessment-screen.css";

// LIB-227 (ui): 계약(.agent-harness/work/lib-227/spec.md §1.7 · §1.9 · §3.3)의 속성
// 전부를 채운다. **DOM 순서가 계약이다** — 낭독 순서 = DOM 순서이므로 시각으로 뒤집지
// 않는다.
//
// 이 화면은 상태를 갖지 않는다 — 받은 것을 그리고 나가는 수단 하나를 낸다(계약 §1.3).
// `criterion`·`verdict`를 prop으로 받지 않는다 — `assessmentPassCriterion`은 자기
// 모듈에서 직접 읽고, `verdict`는 `results`에서 파생한다(계약 §1.7).

// design.md §10 · §3.2 — 종합 판정 아이콘. 문항 표식과 같은 어휘(체크/엑스)를 큰
// 크기(`icon-size-xl`)로 재사용한다.
const verdictIconByVerdict: Record<AssessmentVerdict, string> = {
  passed: tick,
  failed: cross,
};

const verdictIconColorByVerdict: Record<AssessmentVerdict, string> = {
  passed: color.feedback["correct-text"],
  failed: color.feedback["incorrect-text"],
};

export type AssessmentScreenProps = {
  stepOrdinal: number;
  results: readonly ListeningAnswerResult[];
  onExit: () => void;
};

export function AssessmentScreen({
  stepOrdinal,
  results,
  onExit,
}: AssessmentScreenProps): ReactNode {
  // verdict를 두 곳(셸·화면)이 계산한다 — 같은 순수 함수·같은 상수·같은 results라
  // 갈릴 수 없다(계약 §1.4). criterion을 prop으로 받지 않고 자기 모듈 상수를 직접
  // 읽는다.
  const verdict = judgeAssessment(results, assessmentPassCriterion);

  // 마운트 때 정확히 한 번(계약 §3.3). dep 배열이 비어 있다 — verdict는 이 화면이
  // 사는 동안 바뀌지 않는다(상태가 없다, §1.3). cleanup이 없다 — 낭독은 취소할 수
  // 있는 자원이 아니다.
  useEffect(() => {
    announce(assessmentAnnouncement(verdict));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <view className="assessment-screen">
      {/* [고정] 머리 — 제목 하나. 행 상자가 없다(계약 §1.9(a)). back이 없다 — 나가는
          수단은 `맵으로` 하나뿐이다(D3·D5). */}
      <text
        className="assessment-screen-title"
        data-testid="assessment-screen-title"
        accessibility-traits="header"
      >
        {assessmentScreenTitle(stepOrdinal)}
      </text>

      {/* [흐름] 내용 슬롯. `scroll-orientation`·`scroll-bar-enable`을 적는다 — 안
          적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로 불가능하다
          (계약 §1.9(c)). accessibility-*를 붙이지 않는다 — 조작 단위가 아니라
          상자다(계약 §1.9(e)). */}
      <scroll-view
        className="assessment-screen-scroll"
        data-testid="assessment-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐이다 — flex 어휘와 gap은 이 상자가 진다
            (계약 §1.9(d)). */}
        <view className="assessment-screen-content">
          <view
            className="assessment-screen-verdict"
            data-testid="assessment-screen-verdict"
            // 언제나 붙고 값만 갈린다 — 조건부로 빼지 않는다(계약 §2.2).
            data-verdict={verdict}
            // accessibility-label을 붙이지 않는다 — 안쪽 <text>의 내용이 곧 이름이다
            // (계약 §2.3).
          >
            <svg
              className="assessment-screen-verdict-icon"
              content={verdictIconByVerdict[verdict]}
              current-color={verdictIconColorByVerdict[verdict]}
            />
            <text className="assessment-screen-verdict-label">
              {assessmentVerdictLabel(verdict)}
            </text>
          </view>

          <view className="assessment-screen-items">
            {results.map((result, index) => (
              <AssessmentItem key={index} index={index} result={result} />
            ))}
          </view>
        </view>
      </scroll-view>

      {/* [고정] 액션 행 — 나가는 수단 하나(D3·D5). 판정과 무관하게 라벨이 '맵으로'
          그대로다(계약 §1.7.1). */}
      <view
        className="assessment-screen-exit"
        data-testid="assessment-screen-exit"
        accessibility-element={true}
        accessibility-label="맵으로"
        accessibility-traits="button"
        bindtap={onExit}
      >
        <text className="assessment-screen-exit-label">맵으로</text>
      </view>
    </view>
  );
}
