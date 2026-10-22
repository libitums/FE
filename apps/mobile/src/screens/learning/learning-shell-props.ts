// 학습 화면 껍데기의 prop 계약입니다(타입만). 껍데기 파일이 줄 상한에 닿아 따로 둡니다.

import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import type { LearningActivityForm } from "../../lib/learning-form";
import type { LearningRunProgress } from "./learning-shell.contract";

/** 무대의 면 — `card`(ui-lynx Card가 그림) · `bare`(활동이 스스로 그림). */
export type LearningShellStage = "card" | "bare";

/** 아래 버튼 행이 흐름 안에 서는가(`in-flow`) 화면 아래에 떠 있는가(`floating`, 기본)입니다. */
export type LearningShellActionPlacement = "floating" | "in-flow";

/** 해설 판의 한 줄입니다 — 영어 · 한국어 줄은 언어 태그가 다릅니다. */
export type LearningShellFeedbackLine = { readonly text: string; readonly lang: "en" | "ko" };

/** 답한 뒤 아래에서 올라오는 해설 판의 내용입니다. */
export type LearningShellFeedback = {
  readonly tone: AnswerResult;
  readonly title: string;
  readonly lines: readonly LearningShellFeedbackLine[];
};

/** 껍데기가 받는 것입니다 — 각 줄의 뜻은 `LearningShell`의 머리 주석과 함께 읽습니다. */
export type LearningShellProps = {
  form: LearningActivityForm;
  /**
   * 활동 안에서 지금 몇 번째 문항인가입니다(0부터). 세션 헤더의 `Lesson n / N`과 진행
   * 막대가 이 값에서 납니다.
   *
   * ⟨2026-09-28⟩ 전에는 유닛 안의 **활동** 순번이었고 문항 순번은 오른쪽에 따로 섰는데,
   * 한 줄에 숫자 쌍이 둘이라 어느 것이 지금 나의 위치인지가 읽히지 않았습니다.
   */
  questionIndex: number;
  questionCount: number;
  /**
   * 완료 화면은 문항이 아니며 문제 지시문을 표시하지 않습니다. 완료면 무대 카드가 내용
   * 높이로 머리와 아래 버튼 사이 가운데에 섭니다.
   */
  complete?: boolean;
  /** 카드 위 회색 한 줄 — 「무엇을 하라」입니다. */
  instruction: string;
  onExit: () => void;
  /**
   * 가운데 카드 안입니다. 활동이 여기서 전개되고 판정도 여기서 납니다. 껍데기는 배치가 바뀔
   * 때 이 내용을 한 번 다시 세울 수 있습니다(다시 mount) — 이 안에 mount 효과로 부작용을
   * 두지 마세요. 듣기 재생은 그래서 화면의 `useListenAudio`이 소유합니다.
   */
  card: ReactNode;
  /**
   * 카드 밖 작업 영역입니다 — 고를 낱말 칩처럼 활동마다 다른 것이 섭니다. 없는
   * 활동도 있으므로 선택입니다. `card`처럼 배치가 바뀔 때 한 번 다시 설 수 있으니(다시
   * mount) mount 효과로 부작용을 두지 마세요.
   */
  workspace?: ReactNode;
  /**
   * 작업 영역이 스크롤하는가입니다. 기본은 스크롤합니다.
   *
   * 끄는 것은 작업 영역에 **그리기 표면**이 서는 활동(쓰기) 하나입니다. 표면의 터치와
   * `<scroll-view>`의 팬 제스처가 다투면 무엇이 이기는지 이 스택에서 확인된 적이 없어(획을
   * 긋는 손이 영역을 끌어 올릴 수 있습니다), 그 활동은 스크롤을 끄고 한 화면 안에 들어가는
   * 크기로 내용을 둡니다. 스크롤 요소는 그대로 두어 골격(ADR-0022)은 같습니다.
   */
  workspaceScrolls?: boolean;
  /** 말하기처럼 카드가 길어지는 화면은 카드와 안내를 함께 스크롤합니다. */
  scrollCard?: boolean;
  /**
   * 무대의 면입니다. 기본 `card`는 ui-lynx `Card`(stage 변형)가 면 · 그림자 · 안 여백을 집니다. `bare`는 활동이 준
   * 내용을 무대 상자에 그대로 놓습니다 — 문화 카드 덱처럼 면을 여러 장 겹쳐 스스로 그리는 활동의 자리입니다(흰 카드
   * 안에 덱을 넣으면 카드 속 카드가 됩니다).
   */
  stage?: LearningShellStage;
  /** 주 버튼과 같은 행에 서는 보조 조작입니다. */
  secondaryAction?: ReactNode;
  /**
   * 아래 버튼입니다. 라벨이 활동 · 상태마다 갈립니다(`다음` · `결과 보기`). 둘 다
   * 없으면 버튼을 그리지 않습니다 — 영구히 눌리지 않는 버튼을 두지 않기 위해서입니다
   * (ADR-0016 D10). 「아직 할 수 없다」는 버튼이 **없는 것**으로 말합니다.
   */
  actionLabel?: string;
  onAction?: () => void;
  /** 바로 판정음이 나는 확인 동작은 클릭음을 생략한다. */
  actionSound?: "button" | "none";
  /**
   * 스스로 넘어가는 걸음입니다. 주면 `delayMs` 뒤에 `run`을 부르고, 그 전에 화면을
   * 누르면 즉시 부릅니다.
   *
   * 시간제한이 생기므로(WCAG 2.2.1) 조작을 남깁니다 — 보이는 버튼은 없지만 화면
   * 전체가 이 이름의 조작 단위가 됩니다. 기다리는 것 말고 할 수 있는 일이 없는 화면이
   * 되지 않게 하는 자리입니다.
   */
  advance?: { readonly label: string; readonly run: () => void; readonly delayMs: number };
  gemCount?: number;
  /** 학습 문항 안내가 위를 덮는 동안 true입니다. 루트를 낭독에서 가립니다(닫히면 false). */
  obscured?: boolean;
  /** 주면 세션 헤더 대신 가벼운 헤더(`×` · 칸 막대)가 섭니다 — 단어 카드 구간(ADR-0073). */
  runProgress?: LearningRunProgress;
  /** 기본 아래 버튼 대신 서는 ui-lynx `Button`입니다. 누름 소리 · 동작은 그 버튼의 몫입니다. */
  actionButton?: ReactNode /** 주면 지시문 자리에 판정 배지가 겹쳐 섭니다. */;
  verdict?: AnswerResult;
  /** 주면 아래 버튼 위에 해설 판이 섭니다. */
  feedback?: LearningShellFeedback;
  /** 아래 버튼 행의 자리입니다. 기본 `floating`. */
  actionPlacement?: LearningShellActionPlacement;
  /** 문항이 정한 밀도입니다. 기기 밀도와 무관하게 compact로 내릴 때만 줍니다. */
  densityOverride?: "compact";
};
