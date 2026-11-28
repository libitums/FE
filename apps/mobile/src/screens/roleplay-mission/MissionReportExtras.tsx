import type { ReactNode } from "@lynx-js/react";

import { useMissionCopy } from "../../lib/ui-copy-roleplay-mission-tables";
import { missionTestIds as ids } from "./mission-test-ids";
import type { MissionReport } from "./roleplay-mission.contract";

import "./roleplay-mission-report.css";

// 리포트의 새 구역(파이프라인 문서 §5.7 · §10.2 ②) — 결과 한 줄 · 못 이룬 목표의 예문 · 점수 항 · 잘한 점 · 꼭 볼 고친 문장 ·
// 더 나은 표현 · 다음 도전. 리포트 계약의 (선택) 칸이 없으면(옛 결과 행) 그 구역을 그리지 않습니다. 모양은 리포트의 기존 클래스만 씁니다.

type Report = { readonly report: MissionReport };

function Heading({ text }: { readonly text: string }): ReactNode {
  return (
    <text className="mission-report-heading" accessibility-traits="header">
      {text}
    </text>
  );
}

function Pair({
  ko,
  sub,
  strike,
}: {
  readonly ko: string;
  readonly sub: string;
  readonly strike?: boolean;
}): ReactNode {
  return (
    <view accessibility-element={true} accessibility-label={`${sub}, ${ko}`}>
      <text className={strike === true ? "mission-report-strike" : "mission-report-muted"}>
        {sub}
      </text>
      <text className="mission-report-ko">{ko}</text>
    </view>
  );
}

/**
 * 점수 항을 정수로 — 서버 점수는 round(세 항의 합) − 감점이므로, 세 항을 큰 나머지 순으로 반올림해 합이 round(합)과 같게 맞춥니다
 * (「+37.5 · +25.5 · +10」이 「+38 · +25 · +10 = 73」으로). 화면의 합이 총점과 어긋나 보이지 않게 합니다(QA 14).
 */
export function roundedScoreParts(parts: readonly number[]): readonly number[] {
  const target = Math.round(parts.reduce((sum, value) => sum + value, 0));
  const floors = parts.map((value) => Math.floor(value));
  let left = target - floors.reduce((sum, value) => sum + value, 0);
  const order = parts
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index);
  const result = [...floors];
  for (const { index } of order) {
    if (left <= 0) break;
    result[index] = (result[index] ?? 0) + 1;
    left -= 1;
  }
  return result;
}

/** 목표 표현의 자리표(`{음료}` · `{drink}`)를 빈칸으로 — 「___ 한 잔 주세요.」(QA 8). */
export const missionPatternText = (text: string): string => text.replace(/\{[^}]*\}/g, "___");

/** 히어로 아래 결과 한 줄(학습자 언어). */
export function ReportHeadline({ report }: Report): ReactNode {
  return report.headline === undefined || report.headline === "" ? null : (
    <text className="mission-report-muted" data-testid={ids.reportHeadline}>
      {report.headline}
    </text>
  );
}

/** 못 이룬 목표마다 「You could have said」 — 목표 글 · 한국어 예문 · 뜻. */
export function ReportTips({ report }: Report): ReactNode {
  const copy = useMissionCopy().extra.report;
  const tips = report.goals.flatMap((goal) =>
    !goal.done && goal.tip !== undefined && goal.tip !== null ? [{ goal, tip: goal.tip }] : [],
  );
  if (tips.length === 0) return null;
  return (
    <view className="mission-report-section" data-testid={ids.reportTips}>
      <Heading text={copy.tips} />
      {tips.map(({ goal, tip }) => (
        <view
          key={goal.id}
          className="mission-report-card"
          accessibility-element={true}
          accessibility-label={`${goal.label.en}: ${tip.ko}, ${tip.meaning}`}
        >
          <text className="mission-report-muted">{goal.label.en}</text>
          <text className="mission-report-ko">{tip.ko}</text>
          <text className="mission-report-muted">{tip.meaning}</text>
        </view>
      ))}
    </view>
  );
}

/** 「How your score adds up」 — 과업 · 정확도 · 목표 표현(가중치를 곱한 값)과 힌트 감점(있을 때만). 앱에서도 보입니다(사용자 결정). */
export function ReportScoreParts({ report }: Report): ReactNode {
  const copy = useMissionCopy().extra.report;
  const parts = report.scoreParts;
  if (parts === undefined) return null;
  const [task, accuracy, expression] = roundedScoreParts([
    parts.task,
    parts.accuracy,
    parts.expression,
  ]);
  const rows = [
    { key: "task", text: copy.partTask, value: `+${String(task ?? 0)}` },
    { key: "accuracy", text: copy.partAccuracy, value: `+${String(accuracy ?? 0)}` },
    { key: "expression", text: copy.partExpression, value: `+${String(expression ?? 0)}` },
    ...(parts.hintPenalty > 0
      ? [{ key: "hints", text: copy.partHints, value: `−${String(parts.hintPenalty)}` }]
      : []),
  ];
  return (
    <view className="mission-report-section" data-testid={ids.reportScoreParts}>
      <Heading text={copy.scoreParts} />
      {rows.map((row) => (
        <view
          key={row.key}
          className="mission-report-row"
          accessibility-element={true}
          accessibility-label={`${row.text}, ${row.value}`}
        >
          <text className="mission-report-row-text">{row.text}</text>
          <text className="mission-report-row-value">{row.value}</text>
        </view>
      ))}
    </view>
  );
}

/** 「What went well」 — 학습자 발화 인용과 한 줄. */
export function ReportStrengths({ report }: Report): ReactNode {
  const copy = useMissionCopy().extra.report;
  const items = report.strengths ?? [];
  if (items.length === 0) return null;
  return (
    <view className="mission-report-section" data-testid={ids.reportStrengths}>
      <Heading text={copy.strengths} />
      {items.map((item) => (
        <view
          key={item.quote}
          className="mission-report-card"
          accessibility-element={true}
          accessibility-label={`${item.quote}, ${item.note}`}
        >
          <text className="mission-report-ko">{item.quote}</text>
          <text className="mission-report-muted">{item.note}</text>
        </view>
      ))}
    </view>
  );
}

/** 「Key corrections」 — 같은 유형끼리 묶은 원문 → 고친 문장과 한 줄 까닭. */
export function ReportFocus({ report }: Report): ReactNode {
  const copy = useMissionCopy().extra.report;
  const focus = report.focus ?? [];
  if (focus.length === 0) return null;
  return (
    <view className="mission-report-section" data-testid={ids.reportFocus}>
      <Heading text={copy.focus} />
      {focus.map((group, index) => (
        <view key={String(index)} className="mission-report-card">
          {group.examples.map((example, at) => (
            <Pair
              key={`${example.original}:${String(at)}`}
              ko={example.corrected}
              sub={example.original}
              strike
            />
          ))}
          <text className="mission-report-muted">{group.reason}</text>
        </view>
      ))}
    </view>
  );
}

/** 「Sounds more natural」 — 더 나은 표현(`kind: better`). 틀린 것이 아니라 제안이라 원문을 지우지 않고 흐리게 둡니다. */
export function ReportBetter({ report }: Report): ReactNode {
  const copy = useMissionCopy().extra.report;
  const items = report.corrections.filter((entry) => entry.kind === "better");
  if (items.length === 0) return null;
  return (
    <view className="mission-report-section" data-testid={ids.reportBetter}>
      <Heading text={copy.better} />
      {items.map((entry, index) => (
        <view key={`${entry.original}:${String(index)}`} className="mission-report-card">
          <Pair ko={entry.corrected} sub={entry.original} />
          {entry.items?.[0]?.reason === undefined ? null : (
            <text className="mission-report-muted">{entry.items[0].reason}</text>
          )}
        </view>
      ))}
    </view>
  );
}

/** 고친 문장 구역에 남길 것 — 고치기만(더 나은 표현은 따로), 「Key corrections」에 든 원문은 뺍니다(두 번 보이지 않게). */
export function otherCorrections(report: MissionReport): MissionReport["corrections"] {
  const shown = new Set(
    (report.focus ?? []).flatMap((group) => group.examples.map((example) => example.original)),
  );
  return report.corrections.filter(
    (entry) => entry.kind !== "better" && !shown.has(entry.original),
  );
}

/** 「Next challenge」 한 줄. */
export function ReportNextStep({ report }: Report): ReactNode {
  const copy = useMissionCopy().extra.report;
  return report.nextStep === undefined || report.nextStep === "" ? null : (
    <view className="mission-report-section" data-testid={ids.reportNextStep}>
      <Heading text={copy.nextStep} />
      <text className="mission-report-paragraph">{report.nextStep}</text>
    </view>
  );
}
