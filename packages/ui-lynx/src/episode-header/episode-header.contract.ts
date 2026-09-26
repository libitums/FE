export type EpisodeHeaderProps = {
  /** 에피소드 번호 줄입니다 — 디자인의 「Episode 1.」 자리입니다. */
  readonly episodeLabel: string;
  /** 에피소드 이름입니다 — 디자인의 「Cosmetic.」 자리입니다. */
  readonly title: string;
  /** 이 에피소드에서 끝낸 유닛 수입니다. */
  readonly completedUnitCount: number;
  /** 이 에피소드의 유닛 수입니다. */
  readonly totalUnitCount: number;
};

export type EpisodeHeaderContract = {
  readonly episodeLabel: string;
  readonly title: string;
  readonly countLabel: string;
  /** 진행 막대 채움 폭입니다(0~100). 0이면 채움을 그리지 않습니다. */
  readonly fillPercent: number;
  readonly accessibilityLabel: string;
};

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function getEpisodeHeaderContract(props: EpisodeHeaderProps): EpisodeHeaderContract {
  if (!props || typeof props !== "object") {
    throw new Error("EpisodeHeader props must be an object");
  }
  if (typeof props.episodeLabel !== "string" || !props.episodeLabel.trim()) {
    throw new Error("EpisodeHeader episodeLabel must not be empty");
  }
  if (typeof props.title !== "string" || !props.title.trim()) {
    throw new Error("EpisodeHeader title must not be empty");
  }
  if (!isCount(props.totalUnitCount) || props.totalUnitCount === 0) {
    throw new Error("EpisodeHeader totalUnitCount must be a positive integer");
  }
  if (!isCount(props.completedUnitCount)) {
    throw new Error("EpisodeHeader completedUnitCount must be a non-negative integer");
  }
  // 끝낸 수가 전체를 넘는 상태는 진행이 아니라 계산 오류입니다. 막대를 100%로 눌러
  // 감추면 그 오류가 화면에서 사라지므로 던집니다.
  if (props.completedUnitCount > props.totalUnitCount) {
    throw new Error("EpisodeHeader completedUnitCount must not exceed totalUnitCount");
  }

  const episodeLabel = props.episodeLabel.trim();
  const title = props.title.trim();

  return {
    episodeLabel,
    title,
    countLabel: `${props.completedUnitCount} / ${props.totalUnitCount}`,
    fillPercent: (props.completedUnitCount / props.totalUnitCount) * 100,
    // 「7 / 20」은 눈으로 보면 막대 옆이라 뜻이 붙지만, 낭독되면 무엇의 7인지 알 수
    // 없습니다. 이름에서 단위를 밝힙니다.
    accessibilityLabel: `${episodeLabel} ${title}, 유닛 ${props.totalUnitCount}개 중 ${props.completedUnitCount}개 완료`,
  };
}
