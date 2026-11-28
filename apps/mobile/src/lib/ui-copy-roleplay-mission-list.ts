// 롤플레이 미션 문구 가운데 **늘 번들에 드는 몫** — 롤플레이 목록 카드가 쓰는 낱말(형태 · 목표 수 · 최고 기록 · 「Report ready」)만.
// 나머지 미션 문구(미리보기 · 대화 · 리포트 · 음성)는 미션 화면과 함께 빌드 상수로 가지치기되므로 문구표(`UiCopy`)에 두지 않고
// `ui-copy-roleplay-mission-tables.ts`(`useMissionCopy`)가 집니다(ADR-0193, 번들 천장 ADR-0149). 영어 밖은 번역 초안 — 원어민 검수 필요.

import { n } from "./ui-copy-en-plural";

export type RoleplayMissionListCopy = {
  /** 목록 카드의 형태 낱말. */
  readonly form: string;
  readonly goalCount: (count: number) => string;
  readonly best: (score: number) => string;
  /** 목록 카드의 채점 대기 판 표시(`pendingReports`) — 리포트 준비됨 · 채점 중. */
  readonly reportReady: { readonly ready: string; readonly grading: string };
};

export const roleplayMissionListCopy = {
  en: {
    form: "Mission",
    goalCount: (count) => n(count, "goal", "goals"),
    best: (score) => `Best ${String(score)}`,
    reportReady: { ready: "Report ready", grading: "Scoring…" },
  },
  es: {
    form: "Misión",
    goalCount: (count) => (count === 1 ? "1 objetivo" : `${String(count)} objetivos`),
    best: (score) => `Récord ${String(score)}`,
    reportReady: { ready: "Informe listo", grading: "Puntuando…" },
  },
  ja: {
    form: "ミッション",
    goalCount: (count) => `目標 ${String(count)}つ`,
    best: (score) => `最高 ${String(score)}`,
    reportReady: { ready: "レポート準備完了", grading: "採点中…" },
  },
  id: {
    form: "Misi",
    goalCount: (count) => `${String(count)} tujuan`,
    best: (score) => `Terbaik ${String(score)}`,
    reportReady: { ready: "Laporan siap", grading: "Menilai…" },
  },
  vi: {
    form: "Nhiệm vụ",
    goalCount: (count) => `${String(count)} mục tiêu`,
    best: (score) => `Cao nhất ${String(score)}`,
    reportReady: { ready: "Báo cáo đã sẵn sàng", grading: "Đang chấm…" },
  },
  th: {
    form: "ภารกิจ",
    goalCount: (count) => `${String(count)} เป้าหมาย`,
    best: (score) => `สถิติ ${String(score)}`,
    reportReady: { ready: "รายงานพร้อมแล้ว", grading: "กำลังให้คะแนน…" },
  },
  my: {
    form: "မစ်ရှင်",
    goalCount: (count) => `ပန်းတိုင် ${String(count)} ခု`,
    best: (score) => `အကောင်းဆုံး ${String(score)}`,
    reportReady: { ready: "အစီရင်ခံစာ အသင့်", grading: "အမှတ်ပေးနေသည်…" },
  },
  "zh-TW": {
    form: "任務",
    goalCount: (count) => `${String(count)} 個目標`,
    best: (score) => `最佳 ${String(score)}`,
    reportReady: { ready: "報告已備妥", grading: "評分中…" },
  },
} satisfies Record<string, RoleplayMissionListCopy>;
