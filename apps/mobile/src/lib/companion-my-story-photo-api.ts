// 내 스토리 사진(ADR-0199 · 서버 ADR-0191 D11) 서버 원격 — 던지지 않습니다.
// - post: 사진을 비공개 버킷 `my-story-photos/<내 id>/<파일>`에 호스트로 올린 뒤(저장소 정책이 `companion_can_upload_story_photo` —
//   성인 · 스위치), `companion-my-story` post로 그 경로를 보냅니다. 서버가 요청 안에서 사진을 읽어 게시 · 다시 보기 · 거절을 정합니다.
//   같은 파일을 다시 올리면 Storage가 「이미 있음」으로 답하고 그것도 올린 것으로 봅니다(다시 시도).
// - sign: 내 폴더 읽기 정책으로 서명 주소(한 시간). - requestReview: 거절의 「다시 확인 요청」.

import type { SupabaseConfig } from "./auth-session.contract";
import { authUserIdFrom } from "./auth-user-id";
import { romanizeKorean } from "./korean-romanize";
import { signedUrlFrom } from "../screens/messenger-chat/companion-media-parse";
import { myStoryPostFrom } from "../screens/messenger-chat/my-stories-parse";
import { storyPhotoObjectPath } from "../screens/messenger-chat/my-story-photo";
import type {
  CompanionMyStoryPhotoRemote,
  StoryPhotoUpload,
} from "../screens/messenger-chat/my-story-photo.contract";

export type MyStoryPhotoRemoteDeps = {
  readonly token: () => Promise<string | null>;
  readonly config: () => SupabaseConfig | null;
  /** 대화 원격의 JSON 전송 — 2xx면 본문, 그 밖은 null. */
  readonly call: (path: string, body: unknown) => Promise<string | null>;
  /** 호스트 업로드 — 없으면(모듈 없는 환경) 사진을 올리지 않습니다. */
  readonly upload: StoryPhotoUpload | null;
};

const BUCKET = "my-story-photos";
const MY_STORY_FUNCTION = "/functions/v1/companion-my-story";
/** 서명 주소 수명(초) — 보기 화면을 여는 동안이면 충분합니다. */
const SIGN_SECONDS = 3600;

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

function resultOf(body: string | null): unknown {
  if (body === null) return null;
  try {
    const value: unknown = JSON.parse(body);
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)["result"]
      : null;
  } catch {
    return null;
  }
}

export function myStoryPhotoRemote(deps: MyStoryPhotoRemoteDeps): CompanionMyStoryPhotoRemote {
  /** 올리고 버킷 경로를 돌려줍니다. 토큰 · 설정 · 호스트 · 경로가 없거나 올리지 못하면 null. */
  async function upload(localPath: string): Promise<string | null> {
    try {
      const host = deps.upload;
      const token = await deps.token();
      const config = deps.config();
      if (host === null || token === null || config === null) return null;
      const userId = authUserIdFrom(token);
      const path = userId === null ? null : storyPhotoObjectPath(userId, localPath);
      if (path === null) return null;
      // 본문 형식은 호스트가 image/jpeg로 고정합니다 — JSON 머리를 싣지 않습니다.
      const url = `${config.url}/storage/v1/object/${BUCKET}/${encodePath(path)}`;
      const headers = { apikey: config.anonKey, Authorization: `Bearer ${token}` };
      return (await host(localPath, url, headers)) === "uploaded" ? path : null;
    } catch {
      return null;
    }
  }

  return {
    post: async (draft, onUploaded) => {
      const imagePath = await upload(draft.photo.path);
      if (imagePath === null) return { result: "upload_failed" };
      onUploaded?.();
      const roman = romanizeKorean(draft.ko).trim();
      return myStoryPostFrom(
        await deps.call(MY_STORY_FUNCTION, {
          action: "post",
          client_id: draft.clientId,
          image_path: imagePath,
          ko: draft.ko,
          roman,
          overlays: draft.overlays,
          lang: draft.lang,
          tz_offset_min: draft.tzOffsetMin,
          ...(draft.region === null ? {} : { client_region: draft.region }),
        }),
      );
    },
    sign: async (imagePath) => {
      const config = deps.config();
      if (config === null) return null;
      const body = await deps.call(`/storage/v1/object/sign/${BUCKET}/${encodePath(imagePath)}`, {
        expiresIn: SIGN_SECONDS,
      });
      return signedUrlFrom(body, `${config.url}/storage/v1`);
    },
    requestReview: async (rejectionId) =>
      resultOf(
        await deps.call("/rest/v1/rpc/companion_request_story_review", {
          p_rejection_id: rejectionId,
        }),
      ) === "ok",
  };
}
