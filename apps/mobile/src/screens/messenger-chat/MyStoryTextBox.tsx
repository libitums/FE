import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { typedText, type EditorText } from "./my-story-editor";
import { textFit } from "./my-story-text";
import { myStoriesTestIds as ids, type StoryTextColor } from "./my-stories.contract";
import { MyStoryPlaced, type CanvasSize } from "./MyStorySticker";
import { StoryTextLines } from "./StoryOverlayLines";

/** 바탕 위 글 상자 상태(시안 29 · 30번) — 쓰기(Done)면 사용자가 쓴 글 그대로 놓습니다(교정 없음, 검수는 올리기 요청 안에서 서버가). */
export function useEditorText(changed: (apply: () => void) => void) {
  const [text, setText] = useState<EditorText | null>(null);
  const [writing, setWriting] = useState(false);
  return {
    text,
    writing,
    start: () => setWriting(true),
    finish: (ko: string, textColor: StoryTextColor) => {
      setWriting(false);
      changed(() => setText((before) => typedText(ko, textColor, before)));
    },
    update: (next: EditorText) => setText(next),
    remove: () => changed(() => setText(null)),
  };
}

/** 바탕 위 글 상자 — 다른 스티커처럼 끌기 · 크기/회전(글자도 같은 비율), 다시 누르면 고쳐 쓰기. */
export function MyStoryTextBox({
  text,
  canvas,
  selected,
  onSelect,
  onChange,
  onRemove,
  onEdit,
}: {
  readonly text: EditorText;
  readonly canvas: CanvasSize;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onChange: (next: EditorText) => void;
  readonly onRemove: () => void;
  readonly onEdit: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories;
  return (
    <MyStoryPlaced
      item={text}
      testId={ids.textBlock}
      label={copy.textEntry.editLabel(text.ko)}
      removeTestId={ids.textRemove}
      removeLabel={copy.editor.remove(text.ko)}
      canvas={canvas}
      selected={selected}
      className="my-story-text-box"
      onSelect={onSelect}
      onChange={onChange}
      fit={(next, settled) => ({ ...next, ...textFit(next.ko, next, canvas, settled) })}
      onRemove={onRemove}
      onTap={onEdit}
      lane={true}
    >
      {(settled: number) => <StoryTextLines ko={text.ko} color={text.color} size={settled} />}
    </MyStoryPlaced>
  );
}
