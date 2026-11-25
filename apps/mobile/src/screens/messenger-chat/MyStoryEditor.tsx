import { useGlobalProps, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft from "@libitums/icons/lynx/arrow-left";
import book from "@libitums/icons/lynx/book";
import { color } from "@libitums/design-tokens";

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
import type { PickedPhoto } from "./my-story-photo.contract";
import {
  myStoriesTestIds as ids,
  type MyStoryChoices,
  type StoryBackground,
} from "./my-stories.contract";
import { MyStoryAddSheet } from "./MyStoryComposer";
import { MyStoryEditorFooter } from "./MyStoryEditorFooter";
import { MyStorySticker, type CanvasSize } from "./MyStorySticker";
import { MyStoryTextBox, useEditorText } from "./MyStoryTextBox";
import { MyStoryTextEntry } from "./MyStoryTextEntry";
import type { StoryShare } from "./use-story-share";

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
  /** 사진 위 편집(ADR-0199) — 있으면 바탕이 그 사진이고 색 고르기가 없습니다. */
  readonly photo?: PickedPhoto | null;
  /** 올리기 상태(실패 안내 · 위기 카드 · 거절 판 · 올리는 중) — `use-story-share.ts`. */
  readonly sharing: StoryShare;
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
  photo = null,
  sharing,
  onShare,
  onChange,
  onClose,
}: MyStoryEditorProps): ReactNode {
  const all = useUiCopy().messengerChat.myStories;
  const copy = all.editor;
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
  const share = editorShareOf(background, stickers, text, caps, photo !== null);
  // 아래 안내 — 얹은 것이 있음, 빈 바탕(사진이면 한 줄이 있어야 올림) 순. 실패 · 올리는 중은 아래 줄이 덮습니다.
  const hint =
    stickers.length > 0 || text !== null
      ? copy.hintMove
      : photo !== null
        ? all.photo.hint
        : copy.hintOne;
  const update = (next: EditorSticker) =>
    setStickers((now) => now.map((each) => (each.id === next.id ? next : each)));

  return (
    <>
      <view
        className={`my-story-editor ${photo === null ? `my-story-bg-${background}` : "my-story-photo-bg"}`}
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
          {photo !== null ? null : (
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
          )}
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
          {photo === null ? null : (
            <image
              className="my-story-photo"
              src={photo.url}
              mode="aspectFill"
              data-testid={ids.editorPhoto}
              accessibility-element={true}
              accessibility-label={all.photo.label}
            />
          )}
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
          <Tool testId={ids.toolWords} label={copy.words} onTap={() => setSheet(true)}>
            <svg className="my-story-icon" content={book} current-color={color.fg.brand} />
          </Tool>
        </view>
        <MyStoryEditorFooter
          sharing={sharing}
          share={share}
          hint={hint}
          photo={photo !== null}
          hidden={writing}
          bottom={FOOTER_PADDING + bottom}
          onShare={onShare}
        />
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
