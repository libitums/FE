// 만들기의 올리기 상태(ADR-0194 · ADR-0199) — 단어 · 카드 RPC, 글 스토리, 사진(업로드 → 게시)을 같은 길로 올리고 결과를 편집에 돌려줍니다.
// 두 번 탭해도 요청은 하나(ref), 만들기 한 번에 clientId 하나(다시 시도해도 같은 것 — 바꾸면 새로). `use-my-stories.tsx`가 씁니다.

import { useRef, useState } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { useChatEvents } from "./chat-events";
import type { ChatCrisisResource } from "./chat-source.contract";
import { draftOf, tzOffsetMinOf } from "./my-stories";
import type {
  MyStoriesPort,
  MyStory,
  MyStoryPostResult,
  MyStoryWindow,
} from "./my-stories.contract";
import type { EditorShare } from "./my-story-editor";
import type { MyStoryRejection, PickedPhoto } from "./my-story-photo.contract";

/** 거절 판(ADR-0199) — 다시 확인 요청의 진행. */
export type RejectionView = {
  readonly rejection: MyStoryRejection | null;
  readonly review: "idle" | "sending" | "sent" | "failed";
};

export type StoryShare = {
  readonly busy: boolean;
  readonly error: string | null;
  readonly crisis: readonly ChatCrisisResource[] | null;
  readonly rejected: RejectionView | null;
  readonly share: (share: EditorShare, photo: PickedPhoto | null) => Promise<void>;
  readonly requestReview: () => Promise<void>;
  /** 바탕 · 얹은 것이 바뀜, 또는 새 만들기 — 앞 실패의 clientId · 안내를 버립니다. */
  readonly reset: () => void;
};

export function useStoryShare({
  port,
  clockOf,
  onWindow,
  onPosted,
}: {
  readonly port: MyStoriesPort | undefined;
  readonly clockOf: (window: MyStoryWindow) => string;
  readonly onWindow: (window: MyStoryWindow) => void;
  readonly onPosted: (story: MyStory, window: MyStoryWindow | null) => void;
}): StoryShare {
  const { emit } = useChatEvents();
  const copy = useUiCopy().messengerChat.myStories;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<readonly ChatCrisisResource[] | null>(null);
  const [rejected, setRejected] = useState<RejectionView | null>(null);
  const clientId = useRef<string | null>(null);
  const posting = useRef(false);

  const reset = () => {
    clientId.current = null;
    setError(null);
    setCrisis(null);
    setRejected(null);
  };

  function failureText(result: MyStoryPostResult["result"]): string {
    switch (result) {
      case "daily_limit":
        return copy.composer.dailyLimit;
      case "text_blocked":
        return copy.editor.textBlocked;
      case "check_limit":
        return copy.composer.checkLimit;
      case "invalid":
        return copy.composer.invalid;
      case "upload_failed":
        return copy.photo.uploadFailed;
      default:
        return copy.composer.failed;
    }
  }

  async function share(share: EditorShare, photo: PickedPhoto | null) {
    "background only";
    // 두 번 탭해도 요청은 하나 — 상태(busy)는 다음 렌더까지 안 바뀌어 ref로 막습니다(감사 A10).
    if (port === undefined || posting.current) return;
    posting.current = true;
    if (clientId.current === null) clientId.current = port.newClientId();
    setBusy(true);
    setError(null);
    setCrisis(null);
    const tz = tzOffsetMinOf(Date.now());
    const id = clientId.current;
    const language = copy.language;
    const request = (): Promise<MyStoryPostResult> => {
      if (share.kind === "choice") return port.post(draftOf(share.choice, id, language, tz));
      if (share.kind === "photo") {
        if (photo === null || port.photo === undefined)
          return Promise.resolve({ result: "failed" });
        return port.photo.post({
          clientId: id,
          photo,
          ko: share.ko,
          overlays: share.overlays,
          lang: language,
          tzOffsetMin: tz,
          region: null,
        });
      }
      return port.postText({
        clientId: id,
        background: share.background,
        ko: share.text?.ko ?? "",
        overlays: share.overlays,
        lang: language,
        tzOffsetMin: tz,
      });
    };
    // 포트는 던지지 않는 약속이지만, 던져도 busy가 풀리게 실패로 받습니다(리뷰 지적).
    const posted = await request().catch((): MyStoryPostResult => ({ result: "failed" }));
    posting.current = false;
    setBusy(false);
    if (posted.result !== "ok") {
      emit({ name: "my_story_post_failed", surface: "chat", reason: posted.result });
      if (posted.result === "window_used") {
        // 창은 서버가 정본 — 다음 창 시각을 「+」 자리에도 씁니다.
        const window = posted.window;
        if (window !== null) onWindow(window);
        setError(copy.composer.windowUsed(window === null ? null : clockOf(window)));
      } else if (posted.result === "crisis") setCrisis(posted.resources);
      else if (posted.result === "rejected")
        setRejected({ rejection: posted.rejection, review: "idle" });
      else setError(failureText(posted.result));
      return;
    }
    clientId.current = null;
    emit({ name: "my_story_posted", surface: "chat", kind: posted.story.kind });
    onPosted(posted.story, posted.window);
  }

  async function requestReview() {
    "background only";
    const target = rejected?.rejection ?? null;
    const review = rejected?.review;
    if (port?.photo === undefined || target === null || review === "sending" || review === "sent")
      return;
    setRejected({ rejection: target, review: "sending" });
    const ok = await port.photo.requestReview(target.id).catch(() => false);
    emit({ name: "my_story_review_requested", surface: "chat", ok });
    setRejected({ rejection: target, review: ok ? "sent" : "failed" });
  }

  return { busy, error, crisis, rejected, share, requestReview, reset };
}
