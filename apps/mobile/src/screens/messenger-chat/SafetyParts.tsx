import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import clock from "@libitums/icons/lynx/clock";
import heart from "@libitums/icons/lynx/heart";
import info from "@libitums/icons/lynx/info";
import lock from "@libitums/icons/lynx/lock";
import phone from "@libitums/icons/lynx/phone";
import user from "@libitums/icons/lynx/user";

import { announce } from "../../lib/accessibility";
import { useUiCopy } from "../../lib/ui-copy";
import type { ChatCrisisResource, ChatInputBlock, ChatNoticeKind } from "./chat-source.contract";
import { SLOP_ROUND } from "./hit-slop";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { clockOf, isOpenableExternalUrl } from "./safety-rules";

import "./safety.css";

const muted = color.fg["neutral-muted"];

type ChatNoticeRowProps = { readonly notice: ChatNoticeKind; readonly name: string };

// 로그 가운데 회색 줄입니다(ADR-0125) — AI 고지 · 미성년자 고지 · 휴식 알림. 문장 하나로 읽힙니다.
export function ChatNoticeRow({ notice, name }: ChatNoticeRowProps): ReactNode {
  const copy = useUiCopy().messengerChat.safety.notice;
  const text =
    notice === "ai-disclosure"
      ? copy.aiDisclosure(name)
      : notice === "minor-notice"
        ? copy.minorNotice
        : copy.breakReminder(name);
  const icon = notice === "ai-disclosure" ? info : notice === "break-reminder" ? clock : null;
  return (
    <view
      className="chat-notice"
      data-testid={ids.notice}
      flatten={false}
      accessibility-element={true}
      accessibility-label={text}
    >
      <view className="chat-notice-rule" />
      <view className="chat-notice-body" accessibility-elements-hidden={true}>
        {icon === null ? null : (
          <svg className="chat-notice-icon" content={icon} current-color={muted} />
        )}
        <text className="chat-notice-text">{text}</text>
      </view>
      <view className="chat-notice-rule" />
    </view>
  );
}

type ChatCrisisCardProps = {
  readonly resources: readonly ChatCrisisResource[];
  readonly onOpen: (url: string) => void;
};

// 위기 안내 카드입니다(ADR-0125). 캐릭터 연기가 없으므로 아바타가 없고, 기관마다 전화 · 웹 주소 단추를 둡니다.
export function ChatCrisisCard({ resources, onOpen }: ChatCrisisCardProps): ReactNode {
  const copy = useUiCopy().messengerChat.safety.crisis;
  return (
    <view className="chat-crisis" data-testid={ids.crisis}>
      <view className="chat-crisis-head">
        <svg
          className="chat-crisis-icon"
          content={heart}
          current-color={color.fg.neutral}
          accessibility-element={false}
        />
        <text className="chat-crisis-title" accessibility-heading={true}>
          {copy.title}
        </text>
      </view>
      <text className="chat-crisis-body">{copy.body}</text>
      {resources.map((resource, index) => (
        <view className="chat-crisis-resource" key={`${index}-${resource.name}`}>
          <view className="chat-crisis-name-block">
            <text className="chat-crisis-name">{resource.name}</text>
            {resource.hours === null ? null : (
              <text className="chat-crisis-hours">{resource.hours}</text>
            )}
          </view>
          <view className="chat-crisis-actions">
            {resource.phone === null || !isOpenableExternalUrl(`tel:${resource.phone}`) ? null : (
              <view
                className="chat-crisis-call"
                data-testid={ids.crisisCall}
                flatten={false}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-enable-tap={true}
                accessibility-label={copy.callLabel(resource.name)}
                bindtap={() => {
                  "background only";
                  if (resource.phone !== null) onOpen(`tel:${resource.phone}`);
                }}
              >
                <svg
                  className="chat-crisis-call-icon"
                  content={phone}
                  current-color={color.fg["neutral-inverted"]}
                  accessibility-element={false}
                />
                <text className="chat-crisis-call-text" accessibility-element={false}>
                  {copy.call(resource.phone)}
                </text>
              </view>
            )}
            {/* 웹 주소도 열 수 있는 꼴(https)일 때만 단추를 그린다 — 전화와 같다(PR #412 리뷰). */}
            {resource.url === null || !isOpenableExternalUrl(resource.url) ? null : (
              <view
                className="chat-crisis-web"
                data-testid={ids.crisisWeb}
                flatten={false}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-enable-tap={true}
                accessibility-label={copy.websiteLabel(resource.name)}
                bindtap={() => {
                  "background only";
                  if (resource.url !== null) onOpen(resource.url);
                }}
              >
                <text className="chat-crisis-web-text" accessibility-element={false}>
                  {copy.website}
                </text>
              </view>
            )}
          </view>
        </view>
      ))}
      <text className="chat-crisis-emergency">{copy.emergency}</text>
    </view>
  );
}

type BlockedComposerProps = {
  readonly block: ChatInputBlock;
  readonly onChangeBirthYear: () => void;
  readonly bottomInset: number;
};

// 입력 줄 자리를 대신하는 상태 줄입니다(ADR-0125). 로그는 그대로 읽히고, 보낼 수 있는 길은 없습니다.
export function BlockedComposer({
  block,
  onChangeBirthYear,
  bottomInset,
}: BlockedComposerProps): ReactNode {
  const safety = useUiCopy().messengerChat.safety;
  const copy = safety.blocked;
  const timeOf = (at: number) => {
    const { hour, minute } = clockOf(at);
    return safety.time(hour, minute);
  };
  const view =
    block.kind === "temporarily-blocked"
      ? { icon: lock, title: copy.pausedTitle(timeOf(block.until)), body: copy.pausedBody }
      : block.kind === "usage-time-limit"
        ? { icon: clock, title: copy.timeUpTitle, body: copy.timeUpBody(timeOf(block.resetsAt)) }
        : { icon: user, title: copy.ageTitle, body: copy.ageBody };
  // 스크린리더 사용자가 독까지 훑기 전에도 막힌 것을 알게, 막힘이 서거나 바뀔 때 한 번 낭독합니다(Lynx에는 status 성질이 없다).
  const spoken = `${view.title}. ${view.body}`;
  useEffect(() => {
    announce(spoken);
  }, [spoken]);
  return (
    <view
      className="chat-blocked"
      data-testid={ids.blocked}
      style={{ paddingBottom: `${12 + bottomInset}px` }}
    >
      <view className="chat-blocked-icon-wrap" accessibility-elements-hidden={true}>
        <svg className="chat-blocked-icon" content={view.icon} current-color={muted} />
      </view>
      <view
        className="chat-blocked-text"
        flatten={false}
        accessibility-element={true}
        accessibility-label={spoken}
      >
        <text className="chat-blocked-title" accessibility-element={false}>
          {view.title}
        </text>
        <text className="chat-blocked-body" accessibility-element={false}>
          {view.body}
        </text>
      </view>
      {block.kind === "age-restricted" ? (
        <view
          className="chat-blocked-change"
          id={ids.blockedChangeYear}
          data-testid={ids.blockedChangeYear}
          flatten={false}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          accessibility-label={copy.changeBirthYear}
          hit-slop={SLOP_ROUND}
          bindtap={() => {
            "background only";
            onChangeBirthYear();
          }}
        >
          <text className="chat-blocked-change-text" accessibility-element={false}>
            {copy.changeBirthYear}
          </text>
        </view>
      ) : null}
    </view>
  );
}
