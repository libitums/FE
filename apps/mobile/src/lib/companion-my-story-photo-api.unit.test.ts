import { describe, expect, test, vi } from "vitest";

import { myStoryPhotoRemote, type MyStoryPhotoRemoteDeps } from "./companion-my-story-photo-api";
import type { MyPhotoStoryDraft } from "../screens/messenger-chat/my-story-photo.contract";

// `unit` 계층(MSP-S1 ~ S4, ADR-0199): 사진 원격 — 업로드(호스트) 경로 · 헤더 → 게시 본문, 업로드 실패, 서명 주소, 다시 확인 요청.

const UID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const b64 = (value: string) => Buffer.from(value).toString("base64url");
const TOKEN = `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify({ sub: UID }))}.sig`;
const CONFIG = { url: "https://proj.supabase.co", anonKey: "anon" };

function deps(patch: Partial<MyStoryPhotoRemoteDeps> = {}) {
  const call = vi.fn(async (_path: string, _body: unknown): Promise<string | null> =>
    JSON.stringify({
      result: "ok",
      story: {
        id: "p1",
        kind: "photo",
        status: "live",
        word: null,
        ko: "서울 도착!",
        roman: "",
        meaning: "",
        example: null,
        imagePath: `${UID}/a1.jpg`,
        postedAt: "2026-11-25T01:00:00Z",
        expiresAt: "2026-11-26T01:00:00Z",
        reactions: [],
      },
    }),
  );
  const upload = vi.fn(async () => "uploaded" as const);
  const all: MyStoryPhotoRemoteDeps = {
    token: async () => TOKEN,
    config: () => CONFIG as never,
    call,
    upload,
    ...patch,
  };
  return { all, call, upload };
}

const draft: MyPhotoStoryDraft = {
  clientId: "c-1",
  photo: {
    url: "file:///c/story-photos/a1.jpg",
    path: "/c/story-photos/a1.jpg",
    width: 1600,
    height: 1200,
  },
  ko: "서울 도착!",
  overlays: [{ kind: "word", ko: "창가 자리", x: 0.4, y: 0.5, scale: 1, rotation: -4 }],
  lang: "en",
  tzOffsetMin: 540,
  region: "KR",
};

describe("MSP-S1 업로드 → 게시", () => {
  test("내 폴더로 올린 뒤(Content-Type 없이 bearer) 그 경로 · 한 줄 · 로마자 · 얹은 것 · 지역으로 게시", async () => {
    const { all, call, upload } = deps();
    const result = await myStoryPhotoRemote(all).post(draft);
    expect(upload).toHaveBeenCalledWith(
      "/c/story-photos/a1.jpg",
      `https://proj.supabase.co/storage/v1/object/my-story-photos/${UID}/a1.jpg`,
      { apikey: "anon", Authorization: `Bearer ${TOKEN}` },
    );
    expect(call).toHaveBeenCalledWith("/functions/v1/companion-my-story", {
      action: "post",
      client_id: "c-1",
      image_path: `${UID}/a1.jpg`,
      ko: "서울 도착!",
      roman: expect.stringContaining("seoul"),
      overlays: draft.overlays,
      lang: "en",
      tz_offset_min: 540,
      client_region: "KR",
    });
    expect(result).toMatchObject({
      result: "ok",
      story: { kind: "photo", imagePath: `${UID}/a1.jpg` },
    });
  });
});

describe("MSP-S2 업로드 실패", () => {
  test("업로드가 실패하거나 토큰 · 호스트가 없으면 게시를 부르지 않고 upload_failed", async () => {
    const failing = deps({ upload: vi.fn(async () => "failed" as const) });
    expect(await myStoryPhotoRemote(failing.all).post(draft)).toEqual({ result: "upload_failed" });
    expect(failing.call).not.toHaveBeenCalled();
    const noToken = deps({ token: async () => null });
    expect(await myStoryPhotoRemote(noToken.all).post(draft)).toEqual({ result: "upload_failed" });
    const noHost = deps({ upload: null });
    expect(await myStoryPhotoRemote(noHost.all).post(draft)).toEqual({ result: "upload_failed" });
    expect(noHost.call).not.toHaveBeenCalled();
  });
});

describe("MSP-S3 서명 주소", () => {
  test("sign 경로로 한 시간 주소를 만들고 storage 기준 전체 주소로, 못 만들면 null", async () => {
    const { all, call } = deps();
    call.mockResolvedValueOnce(
      JSON.stringify({ signedURL: "/object/sign/my-story-photos/x?token=t" }),
    );
    expect(await myStoryPhotoRemote(all).sign(`${UID}/a1.jpg`)).toBe(
      "https://proj.supabase.co/storage/v1/object/sign/my-story-photos/x?token=t",
    );
    expect(call).toHaveBeenCalledWith(`/storage/v1/object/sign/my-story-photos/${UID}/a1.jpg`, {
      expiresIn: 3600,
    });
    call.mockResolvedValueOnce(null);
    expect(await myStoryPhotoRemote(all).sign(`${UID}/a1.jpg`)).toBeNull();
  });
});

describe("MSP-S4 다시 확인 요청", () => {
  test("RPC 결과 ok면 true, not_found · 실패면 false", async () => {
    const { all, call } = deps();
    call.mockResolvedValueOnce(JSON.stringify({ result: "ok" }));
    expect(await myStoryPhotoRemote(all).requestReview("r-1")).toBe(true);
    expect(call).toHaveBeenLastCalledWith("/rest/v1/rpc/companion_request_story_review", {
      p_rejection_id: "r-1",
    });
    call.mockResolvedValueOnce(JSON.stringify({ result: "not_found" }));
    expect(await myStoryPhotoRemote(all).requestReview("r-1")).toBe(false);
    call.mockResolvedValueOnce(null);
    expect(await myStoryPhotoRemote(all).requestReview("r-1")).toBe(false);
  });
});
