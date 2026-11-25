import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx/button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import type { EditorText } from "./my-story-editor";
import {
  myStoriesTestIds as ids,
  type MyStoryCorrection,
  type MyStoryCorrectionResult,
} from "./my-stories.contract";

import "./my-stories.css";

/** 글 한 줄의 길이 상한 — 사진 스토리 한 줄과 같게 둡니다(서버 반영 예상). */
const TEXT_MAX = 80;

type Step =
  | { readonly kind: "write" }
  | { readonly kind: "checking" }
  | { readonly kind: "suggested"; readonly correction: MyStoryCorrection }
  | { readonly kind: "notice"; readonly message: string };

/**
 * Aa — 내 글 한 줄 + 교정 제안(시안 27번, 글 서버에서만). 쓰고 「Check」를 누르면 서버 교정(`companion-my-story` draft)을 받아 고친 글을
 * 보이고 「Use this」(고친 글 · 원래 글은 `original`) / 「Keep mine」. 고칠 것이 없으면(same) 그대로 놓습니다. 막힌 글은 놓지 않습니다.
 */
export function MyStoryTextEntry({
  initial,
  correct,
  onDone,
  onCancel,
}: {
  readonly initial: string;
  readonly correct: (text: string) => Promise<MyStoryCorrectionResult>;
  readonly onDone: (text: EditorText) => void;
  readonly onCancel: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.textEntry;
  const [step, setStep] = useState<Step>({ kind: "write" });
  const value = useRef(initial);
  const checking = useRef(false);
  useLayerBack(onCancel);

  async function handleCheck() {
    "background only";
    const mine = value.current.trim();
    if (mine === "" || checking.current) return;
    checking.current = true;
    setStep({ kind: "checking" });
    const checked = await correct(mine);
    checking.current = false;
    if (checked.result === "ok") {
      const { correction } = checked;
      if (correction.kind === "same" || correction.ko === mine)
        return onDone({ ko: mine, meaning: correction.meaning, original: null });
      return setStep({ kind: "suggested", correction });
    }
    setStep({
      kind: "notice",
      message:
        checked.result === "blocked"
          ? copy.blocked
          : checked.result === "limit"
            ? copy.limit
            : copy.failed,
    });
  }

  return (
    <view className="my-story-text-entry" data-testid={ids.textEntry} event-through={false}>
      <view className="my-story-text-entry-card">
        <text className="my-story-section-title" accessibility-traits="header" flatten={false}>
          {copy.title}
        </text>
        <view data-testid={ids.textInput}>
          <TextField
            accessibilityLabel={copy.title}
            placeholder={copy.placeholder}
            defaultValue={initial}
            counter={{ maxLength: TEXT_MAX }}
            bindinput={(text) => {
              value.current = text;
              if (step.kind !== "write") setStep({ kind: "write" });
            }}
            bindconfirm={() => void handleCheck()}
          />
        </view>
        {step.kind === "suggested" ? (
          <view
            className="my-story-text-suggestion"
            data-testid={ids.textSuggestion}
            flatten={false}
            accessibility-element={true}
            accessibility-label={`${copy.suggested}: ${step.correction.ko}`}
          >
            <text className="my-story-note" accessibility-elements-hidden={true}>
              {copy.suggested}
            </text>
            <text className="my-story-waiting-title" accessibility-elements-hidden={true}>
              {step.correction.ko}
            </text>
            {step.correction.tip === null ? null : (
              <text className="my-story-note" accessibility-elements-hidden={true}>
                {step.correction.tip}
              </text>
            )}
          </view>
        ) : null}
        {step.kind === "notice" ? <text className="my-story-error">{step.message}</text> : null}
        {step.kind === "suggested" ? (
          <view className="my-story-text-actions">
            <view className="my-story-text-action" data-testid={ids.textKeep}>
              <Button
                label={copy.keepMine}
                variant="outline"
                size="m"
                width="fill"
                bindtap={() => {
                  "background only";
                  onDone({ ko: value.current.trim(), meaning: null, original: null });
                }}
              />
            </view>
            <view className="my-story-text-action" data-testid={ids.textUse}>
              <Button
                label={copy.useThis}
                variant="brand"
                size="m"
                width="fill"
                bindtap={() => {
                  "background only";
                  onDone({
                    ko: step.correction.ko,
                    meaning: step.correction.meaning,
                    original: value.current.trim(),
                  });
                }}
              />
            </view>
          </view>
        ) : (
          <view className="my-story-text-actions">
            <view className="my-story-text-action">
              <Button
                label={copy.cancel}
                variant="outline"
                size="m"
                width="fill"
                bindtap={() => {
                  "background only";
                  onCancel();
                }}
              />
            </view>
            <view className="my-story-text-action" data-testid={ids.textCheck}>
              <Button
                label={step.kind === "checking" ? copy.checking : copy.check}
                variant="brand"
                size="m"
                width="fill"
                loading={step.kind === "checking"}
                bindtap={() => {
                  "background only";
                  void handleCheck();
                }}
              />
            </view>
          </view>
        )}
      </view>
    </view>
  );
}
