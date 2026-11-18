import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { missionTestIds as ids } from "./mission-test-ids";
import type { MissionReport, MissionReportScreenProps } from "./roleplay-mission.contract";

import "./roleplay-mission-report.css";

type RowProps = {
  readonly testId: string;
  readonly text: string;
  readonly value: string;
  readonly good: boolean;
};

function ReportRow({ testId, text, value, good }: RowProps): ReactNode {
  return (
    <view
      className="mission-report-row"
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={`${text}, ${value}`}
    >
      <text className="mission-report-row-text">{text}</text>
      <text className={`mission-report-row-value${good ? " mission-report-row-value-good" : ""}`}>
        {value}
      </text>
    </view>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <view className="mission-report-section">
      <text className="mission-report-heading" accessibility-traits="header">
        {title}
      </text>
      {children}
    </view>
  );
}

function ReportBody({ report }: { readonly report: MissionReport }): ReactNode {
  const copy = useUiCopy().roleplayMission.report;
  const doneCount = report.goals.filter((goal) => goal.done).length;
  const usedCount = report.expressions.filter((entry) => entry.used).length;
  return (
    <view className="mission-report-body">
      <view className="mission-report-hero">
        <text
          className="mission-report-outcome"
          data-testid={ids.reportOutcome}
          data-outcome={report.outcome}
          accessibility-traits="header"
        >
          {report.outcome === "success" ? copy.success : copy.fail}
        </text>
        <text className="mission-report-score" data-testid={ids.reportScore}>
          {copy.score(report.totalScore)}
        </text>
        {report.bestScore === null ? null : (
          <text className="mission-report-best" data-testid={ids.reportBest}>
            {copy.best(report.bestScore)}
          </text>
        )}
      </view>
      <Section title={`${copy.task} · ${String(doneCount)} / ${String(report.goals.length)}`}>
        {report.goals.map((goal) => (
          <ReportRow
            key={goal.id}
            testId={ids.reportGoal(goal.id)}
            text={goal.label.en}
            value={goal.done ? copy.done : copy.notDone}
            good={goal.done}
          />
        ))}
      </Section>
      {report.expressions.length === 0 ? null : (
        <Section
          title={`${copy.expressions} · ${String(usedCount)} / ${String(report.expressions.length)}`}
        >
          {report.expressions.map((entry) => (
            <ReportRow
              key={entry.id}
              testId={ids.reportExpression(entry.id)}
              text={entry.ko}
              value={entry.used ? copy.used : copy.notUsed}
              good={entry.used}
            />
          ))}
        </Section>
      )}
      <view className="mission-report-section">
        <ReportRow
          testId={ids.reportAccuracy}
          text={copy.accuracy}
          value={String(Math.round(report.accuracyScore))}
          good={false}
        />
        <ReportRow
          testId={ids.reportHints}
          text={copy.hints}
          value={copy.hintsUsed(report.hintsUsed)}
          good={false}
        />
      </view>
      {report.corrections.length === 0 ? null : (
        <Section title={copy.corrections}>
          <view className="mission-report-section" data-testid={ids.reportCorrections}>
            {report.corrections.map((entry, index) => (
              <view
                key={`${entry.original}:${String(index)}`}
                className="mission-report-card"
                accessibility-element={true}
                accessibility-label={`${entry.original}, ${entry.corrected}`}
              >
                <text className="mission-report-strike">{entry.original}</text>
                <text className="mission-report-ko">{entry.corrected}</text>
              </view>
            ))}
          </view>
        </Section>
      )}
      {report.retry.length === 0 ? null : (
        <Section title={copy.retry}>
          <view className="mission-report-section" data-testid={ids.reportRetry}>
            {report.retry.map((entry) => (
              <view
                key={entry.ko}
                className="mission-report-card"
                accessibility-element={true}
                accessibility-label={`${entry.ko}, ${entry.meaning}`}
              >
                <text className="mission-report-ko">{entry.ko}</text>
                <text className="mission-report-muted">{entry.meaning}</text>
              </view>
            ))}
          </view>
        </Section>
      )}
      <Section title={copy.summary}>
        <text className="mission-report-row-text" data-testid={ids.reportSummary}>
          {report.summary}
        </text>
      </Section>
    </view>
  );
}

/**
 * 미션 리포트입니다(PRD §3.8 · 부록 B) — 성공 여부 · 최종 점수 · 이 미션 최고 기록, 목표별 달성 · 목표 표현 사용 ·
 * 정확도 · 힌트, 고친 문장 · 다시 해 볼 표현 · 총평. 채점이 실패하면 리포트 대신 「다시 시도」와 값이 돌아갔다는 안내입니다.
 * 레슨 결과 화면은 정답 수 기반이라 담을 칸이 없어 새로 그렸습니다(PRD §7).
 */
export function MissionReportScreen({
  insets,
  report,
  gradingFailure,
  grading,
  onRetryGrading,
  onPlayAgain,
  onExit,
}: MissionReportScreenProps): ReactNode {
  const copy = useUiCopy().roleplayMission;
  useScreenBack(onExit);
  return (
    <view
      className="mission-report-screen"
      data-testid={ids.report}
      style={{ paddingTop: `${String(insets.top)}px`, paddingBottom: `${String(insets.bottom)}px` }}
    >
      <scroll-view
        className="mission-report-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        {report !== null ? (
          <ReportBody report={report} />
        ) : (
          <view className="mission-report-body" data-testid={ids.reportFailed}>
            <view className="mission-report-hero">
              <text className="mission-report-outcome" accessibility-traits="header">
                {grading ? copy.grading : copy.report.failedTitle}
              </text>
              {grading ? null : (
                <text className="mission-report-muted">{copy.report.failedBody}</text>
              )}
              {!grading && gradingFailure?.refunded === true ? (
                <text className="mission-report-muted">{copy.report.refunded}</text>
              ) : null}
            </view>
          </view>
        )}
      </scroll-view>
      <view className="mission-report-actions">
        {report === null ? (
          <view data-testid={ids.reportRetryGrading}>
            <Button
              label={copy.report.retryGrading}
              variant="brand"
              size="xl"
              width="fill"
              disabled={grading || gradingFailure?.retryable === false}
              bindtap={onRetryGrading}
            />
          </view>
        ) : (
          <view data-testid={ids.reportPlayAgain}>
            <Button
              label={copy.report.playAgain}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={onPlayAgain}
            />
          </view>
        )}
        <view data-testid={ids.reportExit}>
          <Button
            label={copy.report.backToList}
            variant="text"
            size="xl"
            width="fill"
            bindtap={onExit}
          />
        </view>
      </view>
    </view>
  );
}
