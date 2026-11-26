import type { ReactNode } from "@lynx-js/react";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { windowSheetOf } from "./my-stories";
import {
  myStoriesTestIds as ids,
  type MyStory,
  type MyStoryWindow,
  type WindowSlotView,
} from "./my-stories.contract";

import "./my-stories.css";

/**
 * 올리기 창 시트(ADR-0191 D8, 시안 18번) — 이번 창을 이미 썼을 때 「+」 자리를 누르면 섭니다. 아침 · 낮 · 밤 세 칸(지난 칸은 올렸음 /
 * 놓침, 지금 칸은 올렸음, 다음 칸은 여는 시각)과 다음 창 시각. OK · 바깥 · 시스템 뒤로 = 닫힘.
 */
export function MyStoryWindowSheet({
  window,
  stories,
  now,
  onClose,
}: {
  readonly window: MyStoryWindow;
  readonly stories: readonly MyStory[];
  readonly now: number;
  readonly onClose: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.window;
  useLayerBack(onClose);
  const view = windowSheetOf(window, stories, now);
  const next = copy.time(view.next.hours, view.next.minutes);
  const hour = (h: number) => copy.time(h, 0);
  const stateText = (slot: WindowSlotView) =>
    slot.state === "shared"
      ? copy.shared
      : slot.state === "missed"
        ? copy.missed
        : slot.state === "open"
          ? copy.open
          : copy.opens(hour(slot.startHour));
  return (
    <view data-testid={ids.windowSheet}>
      <AppBottomSheet
        title={copy.title(view.current)}
        description={copy.body(next)}
        closeAccessibilityLabel={copy.close}
        actions={[{ id: "ok", label: copy.ok, bindtap: onClose }]}
        ondismiss={onClose}
      >
        <view className="my-story-slots">
          {view.slots.map((slot) => {
            const range = copy.range(hour(slot.startHour), hour(slot.endHour));
            const state = stateText(slot);
            return (
              <view
                key={slot.slot}
                className={`my-story-slot my-story-slot-${slot.state}`}
                data-testid={ids.windowSlot(slot.slot)}
                flatten={false}
                accessibility-element={true}
                accessibility-label={copy.slotLabel(copy.slot(slot.slot), range, state)}
              >
                <text className="my-story-slot-name" accessibility-elements-hidden={true}>
                  {copy.slot(slot.slot)}
                </text>
                <text className="my-story-slot-range" accessibility-elements-hidden={true}>
                  {range}
                </text>
                <view className="my-story-slot-state" accessibility-elements-hidden={true}>
                  {slot.state === "shared" && slot.slot === view.current ? (
                    <svg
                      className="my-story-slot-tick"
                      content={tick}
                      current-color={color.fg.brand}
                    />
                  ) : null}
                  <text className="my-story-slot-state-text">{state}</text>
                </view>
              </view>
            );
          })}
        </view>
      </AppBottomSheet>
    </view>
  );
}
