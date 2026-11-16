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

/** 세그먼트마다 자동 발송 규칙입니다. `story`면 받는 사람을 A(캐릭터 톤) · B(단계별 예고)로 반씩 나눕니다. */
export type SegmentRule = {
  holdoutPercent: number;
  minIdleHours: number;
  maxIdleHours: number;
  story: boolean;
};

export type CampaignConfig = {
  /** 이 현지 시(0~23)에 든 사람에게만 보냅니다. 매시 돌면 시간대마다 하루 한 번 저녁에 닿습니다. */
  localHour: number;
  /** 같은 사람에게 자동 캠페인을 다시 보내기까지(대조군 배정 포함). */
  cooldownHours: number;
  rules: Partial<Record<SegmentId, SegmentRule>>;
  /** 세그먼트마다 A 문구(승자 — 캐릭터 톤). */
  copy: Partial<Record<SegmentId, Copy>>;
};

export type PlannedRow = {
  series: string;
  segment: SegmentId;
  userId: string;
  group: "sent" | "control";
  variant: "a" | "b" | null;
  lang: string;
  storyStep: string | null;
  title: string;
  body: string;
};
