// 자동 푸시 캠페인의 타입입니다(ADR-0130 D12).

export type CopyEntry = { title: string; body: string };
export type Copy = Record<string, CopyEntry>;

/** 서버가 읽은 학습자 한 사람입니다(`push_campaign_learners()` 한 행). */
export type CampaignLearner = {
  userId: string;
  lastActiveMs: number;
  name: string;
  country: string | null;
  catalogProgress: Record<string, unknown> | null;
  lastCampaignMs: number | null;
};

/** 에피소드 카탈로그 — 순서대로, 단계 id · 영어 이름 · 상대 인물(한국어). */
export type CatalogEpisode = { id: string; steps: string[]; title: string; character: string };

export type StoryOption = { hook_name?: string; text?: Record<string, string> };
export type StoryUnits = Record<string, { title_en?: string; after?: Record<string, unknown> }>;

export type StoryPlace = { unitId: string; stepId: string; nextEpisodeId: string | null };

export type SegmentId =
  | "tutorial-cover"
  | "tutorial-lesson1"
  | "tutorial-lesson2"
  | "tutorial-rest"
  | "episode-next"
  | "episode-mid"
  | "all-done";

/** 문구 묶음 — 세그먼트 여럿이 같은 단계 문구를 씁니다(튜토리얼 넷 → tutorial). */
export type Stage = "tutorial" | "next" | "mid";

/** 하루 두 번의 발송 자리입니다. */
export type Slot = "noon" | "evening";

/** 빈도 실험의 칸(ADR-0208) — 사람마다 고정입니다. 기록의 `variant`는 once = a, twice = b, 대조군은 비웁니다. */
export type Arm = "control" | "once" | "twice";

/** 단계마다 문구 — 점심 · 저녁은 매일 단계, 복귀는 그 뒤. 여럿이면 날마다 돌려 씁니다. */
export type StageCopy = { noon: Copy[]; evening: Copy[]; winback: Copy[] };

export type CampaignConfig = {
  /** 이 현지 시(0~23)에 든 사람에게만 보냅니다. 매시 돌면 시간대마다 점심 · 저녁 한 번씩 닿습니다. */
  localHours: Record<Slot, number>;
  /** 이 시간 안에 앱을 쓴 사람은 건너뜁니다 — 오늘 이미 공부한 사람에게 보내지 않습니다. */
  minIdleHours: number;
  /** 다른 알림(선톡 · 스토리 포함)이 이 시간 안에 배정됐으면 건너뜁니다. */
  minGapHours: number;
  /** 쉰 지 이 날수 미만이면 매일 단계(칸에 따라 하루 1 · 2번). 마지막 날 저녁은 「매일 알림을 멈춘다」는 알림입니다. */
  dailyDays: number;
  /** 매일 단계 뒤 — 쉰 날수가 이 값인 날 저녁에만 복귀 알림을 보냅니다. */
  winbackDays: readonly number[];
  /** 세그먼트 → 문구 단계. 없는 세그먼트는 보내지 않습니다("no-rule"). */
  stages: Partial<Record<SegmentId, Stage>>;
  copy: Record<Stage, StageCopy>;
  /** 매일 단계의 마지막 알림(단계 공통). */
  lastCopy: Copy;
};

export type PlannedRow = {
  series: string;
  segment: SegmentId;
  userId: string;
  group: "sent" | "control";
  /** 빈도 칸 — a 하루 1번 · b 하루 2번. 대조군은 null. */
  variant: "a" | "b" | null;
  lang: string;
  /** 어떤 문구였는지 — 「daily:noon:0」 · 「daily:last」 · 「winback:1」. 표의 `story_step` 칸에 남깁니다. */
  storyStep: string | null;
  title: string;
  body: string;
};
