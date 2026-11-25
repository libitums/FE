import { useGlobalProps, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft from "@libitums/icons/lynx/arrow-left";
import book from "@libitums/icons/lynx/book";
import cards from "@libitums/icons/lynx/cards";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { safeAreaInsetsFrom, sheetBottomInsetFrom } from "../../lib/safe-area";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import {
  STORY_BACKGROUNDS,
  editorShareOf,
  placeSticker,
  type EditorCaps,
  type EditorShare,
  type EditorSticker,
  type EditorText,
} from "./my-story-editor";
import {
  myStoriesTestIds as ids,
  type MyStoryChoices,
  type MyStoryCorrectionResult,
  type MyStoryKind,
  type StoryBackground,
} from "./my-stories.contract";
import { MyStoryAddSheet } from "./MyStoryComposer";
import { MyStorySticker, type CanvasSize } from "./MyStorySticker";
import { MyStoryTextEntry } from "./MyStoryTextEntry";

import "./my-stories.css";

/** 아래 단추 줄의 기본 여백(CSS `--libitum-spacing-16`). */
const FOOTER_PADDING = 16;

function Tool({
  testId,
  label,
  onTap,
  children,
}: {
  readonly testId: string;
  readonly label: string;
  readonly onTap: () => void;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <view
      className="my-story-tool"
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={() => {
        "background only";
        playSound("button");
        onTap();
      }}
    >
      <view className="my-story-tool-icon" accessibility-elements-hidden={true}>
        {children}
      </view>
      <text className="my-story-tool-text" accessibility-elements-hidden={true}>
        {label}
      </text>
    </view>
  );
}

export type MyStoryEditorProps = {
  readonly caps: EditorCaps;
  readonly choices: () => MyStoryChoices;
  readonly correct: (text: string) => Promise<MyStoryCorrectionResult>;
  readonly busy: boolean;
  /** 올리기 실패 안내 글 — 문구는 부르는 쪽이 고릅니다. */
  readonly error: string | null;
  readonly onShare: (share: EditorShare) => void;
  /** 바탕 · 얹은 것이 바뀜 — 부르는 쪽이 clientId · 안내를 새로 합니다. */
  readonly onChange: () => void;
  readonly onClose: () => void;
};

/**
 * 바탕 위에서 만들기(시안 27번) — 위 줄 뒤로 · 바탕색 넷, 오른쪽 도구 Aa(글 서버에서만) · Words · Cards(넣기 시트), 가운데 바탕 위
 * 스티커(끌기 · 두 손가락 크기/회전 · ×), 아래 안내 · Share with friends. 지금 서버는 스티커 하나만 — 글 없이 스티커 하나일 때 Share가 켜집니다.
 */
export function MyStoryEditor({
  caps,
  choices,
  correct,
  busy,
  error,
  onShare,
  onChange,
  onClose,
}: MyStoryEditorProps): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.editor;
  const globalProps = useGlobalProps();
  const insets = safeAreaInsetsFrom(globalProps);
  const bottom = sheetBottomInsetFrom(globalProps, FOOTER_PADDING);
  const [background, setBackground] = useState<StoryBackground>("orange");
  const [stickers, setStickers] = useState<readonly EditorSticker[]>([]);
  const [text, setText] = useState<EditorText | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<MyStoryKind | null>(null);
  const [writing, setWriting] = useState(false);
  const [canvas, setCanvas] = useState<CanvasSize>({ width: 0, height: 0 });
  const stickerIds = useRef(0); // 스티커 id — 이 편집 안에서만 씁니다(서버 clientId와 따로)
  useLayerBack(onClose);

  const share = editorShareOf(background, stickers, text, caps);
  const changed = (apply: () => void) => {
    apply();
    onChange();
  };
  const update = (next: EditorSticker) =>
    setStickers((now) => now.map((each) => (each.id === next.id ? next : each)));

  return (
    <>
      <view
        className={`my-story-editor my-story-bg-${background}`}
        data-testid={ids.editor}
        event-through={false}
        accessibility-elements-hidden={sheet !== null || writing}
        style={{ paddingTop: `${insets.top}px` }}
      >
        <view className="my-story-editor-top">
          <view
            className="my-story-editor-round"
            data-testid={ids.composerClose}
            accessibility-element={true}
            accessibility-label={copy.back}
            accessibility-traits="button"
            accessibility-enable-tap={true}
            flatten={false}
            bindtap={() => {
              "background only";
              playSound("button");
              onClose();
            }}
          >
            <svg className="my-story-icon" content={arrowLeft} current-color={color.fg.neutral} />
          </view>
          <view className="my-story-swatches" accessibility-label={copy.colors}>
            {STORY_BACKGROUNDS.map((each) => (
              <view
                key={each}
                className={`my-story-swatch my-story-bg-${each}${each === background ? " my-story-swatch-on" : ""}`}
                data-testid={ids.swatch(each)}
                accessibility-element={true}
                accessibility-label={copy.colorLabel(copy.color(each), each === background)}
                accessibility-traits="button"
                accessibility-enable-tap={true}
                flatten={false}
                bindtap={() => {
                  "background only";
                  changed(() => setBackground(each));
                }}
              />
            ))}
          </view>
          <view className="my-story-editor-spacer" />
        </view>
        <view
          className="my-story-canvas"
          data-testid={ids.stickers}
          bindlayoutchange={(event: { detail: { width: number; height: number } }) => {
            "background only";
            setCanvas({ width: event.detail.width, height: event.detail.height });
          }}
          bindtap={() => {
            "background only";
            setSelected(null);
          }}
        >
          {text === null ? null : (
            <view
              className="my-story-text-block"
              data-testid={ids.textBlock}
              flatten={false}
              accessibility-element={true}
              accessibility-label={text.meaning === null ? text.ko : `${text.ko}. ${text.meaning}`}
              accessibility-traits="button"
              accessibility-enable-tap={true}
              catchtap={() => {
                "background only";
                setWriting(true);
              }}
            >
              <text className="my-story-text-block-ko" accessibility-elements-hidden={true}>
                {text.ko}
              </text>
              {text.meaning === null ? null : (
                <text className="my-story-text-block-meaning" accessibility-elements-hidden={true}>
                  {`“${text.meaning}”`}
                </text>
              )}
            </view>
          )}
          {stickers.map((sticker) => (
            <MyStorySticker
              key={sticker.id}
              sticker={sticker}
              canvas={canvas}
              selected={selected === sticker.id}
              onSelect={() => setSelected(sticker.id)}
              onChange={update}
              onRemove={() =>
                changed(() => setStickers((now) => now.filter((each) => each.id !== sticker.id)))
              }
            />
          ))}
        </view>
        <view className="my-story-tools">
          {caps.text ? (
            <Tool testId={ids.toolText} label={copy.text} onTap={() => setWriting(true)}>
              <text className="my-story-tool-aa">Aa</text>
            </Tool>
          ) : null}
          <Tool testId={ids.toolWords} label={copy.words} onTap={() => setSheet("word")}>
            <svg className="my-story-icon" content={book} current-color={color.fg.brand} />
          </Tool>
          <Tool testId={ids.toolCards} label={copy.cards} onTap={() => setSheet("card")}>
            <svg className="my-story-icon" content={cards} current-color={color.fg.brand} />
          </Tool>
        </view>
        <view
          className="my-story-editor-footer"
          style={{ paddingBottom: `${FOOTER_PADDING + bottom}px` }}
        >
          <text
            className={
              error === null ? "my-story-editor-hint" : "my-story-editor-hint my-story-error"
            }
            data-testid={error === null ? ids.editorHint : ids.composerError}
          >
            {error ?? (stickers.length > 0 ? copy.hintMove : copy.hintOne)}
          </text>
          <view data-testid={ids.share}>
            <Button
              label={busy ? copy.posting : copy.share}
              variant="brand"
              size="xl"
              width="fill"
              disabled={share === null}
              loading={busy}
              bindtap={() => {
                "background only";
                if (!busy && share !== null) onShare(share);
              }}
            />
          </view>
        </view>
      </view>
      {sheet === null ? null : (
        <MyStoryAddSheet
          choices={choices()}
          tab={sheet}
          many={caps.maxStickers > 1}
          onPick={(choice) => {
            stickerIds.current += 1;
            const id = `s${stickerIds.current}`;
            changed(() => setStickers((now) => placeSticker(now, choice, caps, id)));
            setSelected(id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {writing ? (
        <MyStoryTextEntry
          initial={text?.original ?? text?.ko ?? ""}
          correct={correct}
          onDone={(next) => {
            changed(() => setText(next.ko === "" ? null : next));
            setWriting(false);
          }}
          onCancel={() => setWriting(false)}
        />
      ) : null}
    </>
  );
}
