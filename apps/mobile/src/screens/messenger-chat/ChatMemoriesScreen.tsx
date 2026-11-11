import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import pencil from "@libitums/icons/lynx/pencil";
import info from "@libitums/icons/lynx/info";
import trash from "@libitums/icons/lynx/trash";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { ChatHeader, ChatHeaderSide } from "../../components/chat/ChatHeader";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { ChatModalFrame } from "./ChatModalFrame";
import { MEMORY_MAX_LENGTH, normalizeMemoryText } from "./chat-settings-rules";
import type { ChatMemory, ChatMemoryScope, ChatSource } from "./chat-source.contract";
import { chatSettingsTestIds as ids } from "./chat-settings.contract";
import { MemoryIconButton } from "./MemoryIconButton";
import { useChatMemories } from "./use-chat-source";

import "./chat-overlays.css";
import "./chat-settings.css";

export type ChatMemoriesScreenProps = {
  readonly source: ChatSource;
  readonly scope: ChatMemoryScope;
  /** 인물 층이면 그 이름, 공유 층이면 null. */
  readonly name: string | null;
  readonly onBack: () => void;
};

type Dialog =
  | { readonly kind: "none" }
  | { readonly kind: "edit"; readonly memory: ChatMemory; readonly text: string }
  | { readonly kind: "delete"; readonly memory: ChatMemory };

// 기억 화면입니다(ADR-0126) — 공유 층 · 인물 층 같은 모양. 고치기는 시트, 지우기는 확인 대화를 거칩니다.
export function ChatMemoriesScreen({
  source,
  scope,
  name,
  onBack,
}: ChatMemoriesScreenProps): ReactNode {
  const chatCopy = useUiCopy().messengerChat;
  const settingsCopy = chatCopy.chatSettings;
  const copy = settingsCopy.memories;
  // 날짜는 목록 시각과 같은 언어별 「월 · 일」 표기를 씁니다(PrimJS에 Intl이 없다).
  const dateOf = (at: number): string => {
    const date = new Date(at);
    return chatCopy.time.date(date.getMonth() + 1, date.getDate());
  };
  const list = useChatMemories(source, scope);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const close = () => setDialog({ kind: "none" });
  useScreenBack(() => {
    "background only";
    if (dialog.kind !== "none") close();
    else onBack();
  });
  const title = name === null ? copy.titleShared : copy.titleCharacter(name);
  // 빈 글이거나 바꾼 것이 없으면 Save를 끕니다 — 같은 글로 저장해 「Edited」가 붙지 않게요.
  const normalized = dialog.kind === "edit" ? normalizeMemoryText(dialog.text) : null;
  const editText =
    dialog.kind === "edit" && normalized !== dialog.memory.content ? normalized : null;

  return (
    <view className="chat-settings-screen" data-testid={ids.memoriesScreen}>
      <view
        className="chat-settings-body"
        flatten={false}
        accessibility-elements-hidden={dialog.kind === "none" ? undefined : true}
      >
        <ChatHeader
          title={title}
          insetTop={0}
          testIds={{ root: `${ids.memoriesScreen}-header`, title: `${ids.memoriesScreen}-title` }}
          start={
            <ChatHeaderSide testId={ids.memoriesBack}>
              <RoundButton
                accessibilityLabel={settingsCopy.back}
                icon={arrowLeft03}
                variant="neutral"
                size="l"
                bindtap={onBack}
              />
            </ChatHeaderSide>
          }
          end={
            <ChatHeaderSide>
              <text className="chat-memory-count" flatten={false} accessibility-element={true}>
                {copy.count(list.count, list.cap)}
              </text>
            </ChatHeaderSide>
          }
        />
        <scroll-view
          className="chat-settings-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="chat-settings-content">
            {list.full ? (
              <view
                className="chat-memory-full"
                data-testid={ids.memoriesFull}
                flatten={false}
                accessibility-element={true}
                accessibility-label={`${copy.fullTitle}. ${copy.fullBody(name)}`}
              >
                <svg
                  className="chat-memory-full-icon"
                  content={info}
                  current-color={color.fg.brand}
                  accessibility-element={false}
                />
                <view className="chat-memory-full-text">
                  <text className="chat-memory-full-title" accessibility-element={false}>
                    {copy.fullTitle}
                  </text>
                  <text className="chat-memory-full-body" accessibility-element={false}>
                    {copy.fullBody(name)}
                  </text>
                </view>
              </view>
            ) : null}
            <text className="chat-settings-footnote" flatten={false} accessibility-element={true}>
              {copy.intro(name)}
            </text>
            {list.memories.length === 0 ? (
              <text
                className="chat-memory-empty"
                data-testid={ids.memoriesEmpty}
                flatten={false}
                accessibility-element={true}
              >
                {copy.empty(name)}
              </text>
            ) : (
              <view className="chat-settings-card">
                {list.memories.map((memory) => (
                  <view
                    key={memory.id}
                    className="chat-memory-row"
                    data-testid={ids.memory(memory.id)}
                  >
                    <view
                      className="chat-memory-text"
                      flatten={false}
                      accessibility-element={true}
                      accessibility-label={
                        memory.edited
                          ? `${memory.content}, ${copy.edited}, ${dateOf(memory.createdAt)}`
                          : `${memory.content}, ${dateOf(memory.createdAt)}`
                      }
                    >
                      <text className="chat-memory-content" accessibility-element={false}>
                        {memory.content}
                      </text>
                      <text className="chat-memory-meta" accessibility-element={false}>
                        {memory.edited
                          ? `${dateOf(memory.createdAt)} · ${copy.edited}`
                          : dateOf(memory.createdAt)}
                      </text>
                    </view>
                    <MemoryIconButton
                      testId={ids.memoryEdit(memory.id)}
                      label={copy.edit}
                      icon={pencil}
                      onTap={() => setDialog({ kind: "edit", memory, text: memory.content })}
                    />
                    <MemoryIconButton
                      testId={ids.memoryDelete(memory.id)}
                      label={copy.delete}
                      icon={trash}
                      onTap={() => setDialog({ kind: "delete", memory })}
                    />
                  </view>
                ))}
              </view>
            )}
          </view>
        </scroll-view>
      </view>
      {dialog.kind === "edit" ? (
        <ChatModalFrame
          testId={ids.memoryEditSheet}
          title={copy.editTitle}
          description={copy.editHint(name)}
          align="start"
          actions={
            <>
              <view className="chat-modal-action">
                <Button
                  label={copy.cancel}
                  variant="outline"
                  size="xl"
                  width="fill"
                  bindtap={close}
                />
              </view>
              <view
                className="chat-modal-action"
                data-enabled={editText === null ? "false" : "true"}
              >
                <Button
                  label={copy.save}
                  variant="brand"
                  size="xl"
                  width="fill"
                  disabled={editText === null}
                  bindtap={() => {
                    if (editText !== null) source.updateMemory(dialog.memory.id, editText);
                    close();
                  }}
                />
              </view>
            </>
          }
        >
          <view className="chat-fix-field">
            <TextField
              accessibilityLabel={copy.editTitle}
              placeholder={copy.editTitle}
              defaultValue={dialog.text}
              counter={{ maxLength: MEMORY_MAX_LENGTH }}
              bindinput={(value: string) => setDialog({ ...dialog, text: value })}
            />
          </view>
        </ChatModalFrame>
      ) : null}
      {dialog.kind === "delete" ? (
        <ChatModalFrame
          testId={ids.memoryDeleteDialog}
          title={copy.deleteTitle}
          description={copy.deleteBody(name)}
          actions={
            <>
              <view className="chat-modal-action">
                <Button
                  label={copy.cancel}
                  variant="outline"
                  size="xl"
                  width="fill"
                  bindtap={close}
                />
              </view>
              <view className="chat-modal-action">
                <Button
                  label={copy.deleteConfirm}
                  variant="brand"
                  size="xl"
                  width="fill"
                  bindtap={() => {
                    source.deleteMemory(dialog.memory.id);
                    close();
                  }}
                />
              </view>
            </>
          }
        />
      ) : null}
    </view>
  );
}
