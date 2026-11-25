import { useGlobalProps, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft from "@libitums/icons/lynx/arrow-left";
import book from "@libitums/icons/lynx/book";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { openExternalLink } from "../../lib/external-link";
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
} from "./my-story-editor";
import type { ChatCrisisResource } from "./chat-source.contract";
import {
  myStoriesTestIds as ids,
  type MyStoryChoices,
  type StoryBackground,
} from "./my-stories.contract";
import { MyStoryAddSheet } from "./MyStoryComposer";
import { MyStorySticker, type CanvasSize } from "./MyStorySticker";
import { MyStoryTextBox, useEditorText } from "./MyStoryTextBox";
import { MyStoryTextEntry } from "./MyStoryTextEntry";
import { ChatCrisisCard } from "./SafetyParts";

import "./my-stories.css";

/** 아래 단추 줄의 기본 여백(CSS `--libitum-spacing-16`). */
const FOOTER_PADDING = 16;

// 위기 카드의 전화 · 웹 주소는 호스트가 엽니다(ADR-0125, 대화 화면과 같음).
const openLink = (url: string): void => {
  "background only";
  openExternalLink(url);
};

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
  readonly busy: boolean;
  /** 올리기 실패 안내 글 — 문구는 부르는 쪽이 고릅니다. */
  readonly error: string | null;
  /** 올리기 검수의 위기 신호 — 기존 위기 안내 카드(ADR-0125)를 Share 위에 띄웁니다. */
  readonly crisis: readonly ChatCrisisResource[] | null;
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
  busy,
  error,
  crisis,
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
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [canvas, setCanvas] = useState<CanvasSize>({ width: 0, height: 0 });
  const stickerIds = useRef(0); // 스티커 id — 이 편집 안에서만 씁니다(서버 clientId와 따로)
  useLayerBack(onClose);

  const changed = (apply: () => void) => {
    apply();
    onChange();
  };
  const typing = useEditorText(changed);
  const { text, writing } = typing;
  const share = editorShareOf(background, stickers, text, caps);
  // 아래 안내 — 실패, 얹은 것이 있음, 빈 바탕 순.
  const hint = error ?? (stickers.length > 0 || text !== null ? copy.hintMove : copy.hintOne);
  const update = (next: EditorSticker) =>
    setStickers((now) => now.map((each) => (each.id === next.id ? next : each)));

  return (
    <>
      <view
        className={`my-story-editor my-story-bg-${background}`}
        data-testid={ids.editor}
        event-through={false}
        accessibility-elements-hidden={sheet || writing}
        style={{ paddingTop: `${insets.top}px` }}
      >
        <view className={`my-story-editor-top${writing ? " my-story-under-typing" : ""}`}>
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
          {text === null || writing ? null : (
            <MyStoryTextBox
              text={text}
              canvas={canvas}
              selected={selected === "text"}
              onSelect={() => setSelected("text")}
              onChange={typing.update}
              onRemove={typing.remove}
              onEdit={typing.start}
            />
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
        <view className={`my-story-tools${writing ? " my-story-under-typing" : ""}`}>
          {caps.text ? (
            <Tool testId={ids.toolText} label={copy.text} onTap={typing.start}>
              <text className="my-story-tool-aa">Aa</text>
            </Tool>
          ) : null}
          {caps.word ? (
            <Tool testId={ids.toolWords} label={copy.words} onTap={() => setSheet(true)}>
              <svg className="my-story-icon" content={book} current-color={color.fg.brand} />
            </Tool>
          ) : null}
        </view>
        <view
          className={`my-story-editor-footer${writing ? " my-story-under-typing" : ""}`}
          style={{ paddingBottom: `${FOOTER_PADDING + bottom}px` }}
        >
          {crisis === null ? null : <ChatCrisisCard resources={crisis} onOpen={openLink} />}
          <text
            className={
              error === null ? "my-story-editor-hint" : "my-story-editor-hint my-story-error"
            }
            data-testid={error === null ? ids.editorHint : ids.composerError}
          >
            {hint}
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
      {!sheet ? null : (
        <MyStoryAddSheet
          choices={choices()}
          many={caps.maxStickers > 1}
          onPick={(choice) => {
            stickerIds.current += 1;
            const id = `s${stickerIds.current}`;
            changed(() => setStickers((now) => placeSticker(now, choice, caps, id, text !== null)));
            setSelected(id);
            setSheet(false);
          }}
          onClose={() => setSheet(false)}
        />
      )}
      {writing ? (
        <MyStoryTextEntry
          initial={text?.ko ?? ""}
          initialColor={text?.color ?? "brown"}
          onDone={typing.finish}
        />
      ) : null}
    </>
  );
}
