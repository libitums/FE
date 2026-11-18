import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { useUiCopy } from "../../lib/ui-copy";
import { friendsTestIds as ids, type FriendProfileModel } from "./chat-friends.contract";

import "./friends.css";

export type FriendProfileSheetProps = {
  readonly model: FriendProfileModel;
  readonly avatarUrl: string | null;
  /** 서버가 더는 보이지 않게 한 추가한 친구 — 대화 불가 한 줄. */
  readonly unavailable: boolean;
  readonly onAdd: () => void;
  readonly onClose: () => void;
};

function Fact({
  label,
  value,
  sub,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly testId: string;
}): ReactNode {
  return (
    <view
      className="friends-profile-fact"
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={sub === undefined ? `${label}, ${value}` : `${label}, ${value}, ${sub}`}
    >
      <text className="friends-profile-label">{label}</text>
      <view className="friends-profile-value">
        <text className="friends-profile-text">{value}</text>
        {sub === undefined ? null : <text className="friends-profile-sub">{sub}</text>}
      </view>
    </view>
  );
}

/**
 * 인물 프로필 시트입니다(아홉 인물) — 아바타 · 이름 · AI 표시 · 나이 · 직업 · MBTI · 한 줄 소개(한국어 + 화면 언어). 아직 추가하지 않은
 * 추천 친구만 「친구 추가」 단추가 섭니다. 그림이 없으면 Avatar가 이름 첫 글자로 물러납니다.
 */
export function FriendProfileSheet({
  model,
  avatarUrl,
  unavailable,
  onAdd,
  onClose,
}: FriendProfileSheetProps): ReactNode {
  const copy = useUiCopy().messengerChat.friends;
  const jobSub = model.job.translated === model.job.ko ? undefined : model.job.translated;
  return (
    <view data-testid={ids.sheet}>
      <AppBottomSheet
        title={model.name}
        closeAccessibilityLabel={copy.close}
        actions={model.canAdd ? [{ id: "add", label: copy.addFriend, bindtap: onAdd }] : []}
        ondismiss={onClose}
      >
        <view className="friends-profile">
          <Avatar
            imageSource={avatarUrl ?? undefined}
            name={model.name}
            size="xl"
            accessibility="hidden"
          />
          <text className="friends-profile-name" data-testid={ids.sheetName}>
            {model.name}
          </text>
          <text
            className="friends-profile-ai"
            data-testid={ids.sheetAi}
            flatten={false}
            accessibility-element={true}
          >
            {copy.aiLabel}
          </text>
          <view className="friends-profile-facts">
            <Fact testId={ids.sheetAge} label={copy.ageLabel} value={copy.age(model.age)} />
            <Fact testId={ids.sheetJob} label={copy.jobLabel} value={model.job.ko} sub={jobSub} />
            <Fact testId={ids.sheetMbti} label={copy.mbtiLabel} value={model.mbti} />
          </view>
          <view className="friends-profile-bio" accessibility-element={true}>
            <text className="friends-profile-text" data-testid={ids.sheetBio}>
              {model.bio.ko}
            </text>
            <text className="friends-profile-sub" data-testid={ids.sheetBioTranslated}>
              {model.bio.translated}
            </text>
          </view>
          {unavailable ? (
            <text
              className="friends-profile-sub"
              data-testid={ids.sheetUnavailable}
              flatten={false}
              accessibility-element={true}
            >
              {copy.unavailable(model.name)}
            </text>
          ) : null}
        </view>
      </AppBottomSheet>
    </view>
  );
}
