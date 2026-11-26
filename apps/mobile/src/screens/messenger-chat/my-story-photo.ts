// 내 스토리 사진(ADR-0199) 판정 — 순수 · 던지지 않습니다. 호스트 콜백 풀기 · 버킷 경로 · 올릴 한 줄.

import type { EditorSticker, EditorText } from "./my-story-editor";
import type { PhotoPickResult } from "./my-story-photo.contract";

type Raw = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const filled = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;
/** 호스트는 수를 문자열로 싣습니다(ContentFileModule 관례) — 양의 정수만. */
const size = (value: unknown): number | null => {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/** `StoryPhotoModule.pick` 콜백 — picked인데 칸이 틀리면 failed, busy · invalid · 모르는 값도 failed. */
export function photoPickResultOf(payload: unknown): PhotoPickResult {
  if (!isRecord(payload)) return { status: "failed" };
  const status = payload["status"];
  if (status === "cancelled" || status === "denied" || status === "unavailable") return { status };
  if (status !== "picked") return { status: "failed" };
  const url = filled(payload["url"]);
  const path = filled(payload["path"]);
  const width = size(payload["width"]);
  const height = size(payload["height"]);
  if (url === null || path === null || width === null || height === null)
    return { status: "failed" };
  return { status: "picked", photo: { url, path, width, height } };
}

/** 같은 파일이 이미 있음 — Storage는 409, 또는 400 본문의 `Duplicate`로 알립니다(다시 시도의 업로드). */
const DUPLICATE = /Duplicate|already exists/i;

/** `StoryPhotoModule.upload` 콜백 — 2xx · 이미 있음은 uploaded. */
export function photoUploadOf(payload: unknown): "uploaded" | "failed" {
  if (!isRecord(payload) || payload["status"] !== "http") return "failed";
  const code = Number(payload["code"]);
  if (code >= 200 && code < 300) return "uploaded";
  if (code === 409) return "uploaded";
  const body = typeof payload["body"] === "string" ? payload["body"] : "";
  return code === 400 && DUPLICATE.test(body) ? "uploaded" : "failed";
}

const USER = /^[0-9a-f-]{36}$/;
const FILE = /^[A-Za-z0-9._-]{1,120}$/;

/** 버킷 안 경로 `<user_id>/<파일 이름>` — 서버 판정(`companion_save_my_photo_story`)과 같은 규칙. 맞지 않으면 null. */
export function storyPhotoObjectPath(userId: string, localPath: string): string | null {
  const name = localPath.slice(localPath.lastIndexOf("/") + 1);
  if (!USER.test(userId) || !FILE.test(name) || name.startsWith(".")) return null;
  return `${userId}/${name}`;
}

/** 사진에 붙일 한국어 한 줄(서버는 1 ~ 120자를 요구) — 글 상자 글, 없으면 첫 단어. 아무것도 없으면 null(Share 꺼짐). */
export function photoLineOf(
  text: EditorText | null,
  stickers: readonly EditorSticker[],
): string | null {
  const line = text?.ko.trim() ?? "";
  if (line !== "") return line;
  const [first] = stickers;
  return first === undefined ? null : first.choice.ko;
}
