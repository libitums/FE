import minseoProfile from "../../assets/characters/minseo-profile.jpg";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { Button } from "@libitums/ui-lynx/button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";
import type { DialoguePanelProps } from "./visual-novel.contract";
import "./visual-novel.css";

// 도입·최종 이야기와 같은 디자인 컴포넌트입니다. 다음으로 대사를 읽고 마지막 Continue로 완료합니다.
export function DialoguePanel({
  beatId,
  speakerRole = "partner",
  speakerName,
  dialogue,
  translation,
  romanization,
  action,
}: DialoguePanelProps) {
  return (
    <view
      className={`visual-novel-dialogue visual-novel-dialogue-${speakerRole}`}
      data-speaker={speakerRole}
      data-testid={`visual-novel-dialogue-${beatId}`}
    >
      <scroll-view
        className="visual-novel-dialogue-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        data-testid={`visual-novel-dialogue-content-${beatId}`}
      >
        <VisualNovelDialog
          speakerName={speakerName}
          avatar={
            <Avatar
              name={speakerName}
              imageSource={speakerRole === "partner" ? minseoProfile : undefined}
              size="sm"
              accessibility="hidden"
            />
          }
          line={dialogue}
          translation={[romanization, translation].filter(Boolean).join("\n") || undefined}
          accessibilityLabel={[speakerName, dialogue, romanization, translation]
            .filter(Boolean)
            .join(", ")}
          surface={speakerRole === "self" ? "opaque" : "translucent"}
          contentLanguage="learning"
          languageTag="ko"
          continueIndicator="off"
        />
      </scroll-view>
      <view
        data-testid={
          action.kind === "advance" ? "visual-novel-advance-button" : "visual-novel-finish-button"
        }
        accessibility-element={true}
        accessibility-label={action.label}
        accessibility-traits="button"
        bindtap={action.onSelect}
        className="visual-novel-dialogue-action"
      >
        <view accessibility-elements-hidden={true}>
          <Button label={action.label} variant="brand" size="xl" width="fill" />
        </view>
      </view>
    </view>
  );
}
