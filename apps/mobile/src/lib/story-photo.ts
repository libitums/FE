// 내 스토리 사진의 호스트 접점입니다(ADR-0199) — `StoryPhotoModule`(고르기 · 찍기 · 줄이기 · 올리기 · 지우기)을 감쌉니다. 접점은
// 모듈마다 파일 하나입니다(ADR-0017 D3). 사진 바이트는 JS를 지나지 않습니다(호스트가 파일에서 바로 올림). 모듈이 없는 환경
// (Explorer · 테스트 · 옛 호스트)에서는 `storyPhotosAvailable()`이 거짓이고 사진 선택지가 서지 않습니다. 던지지 않습니다.

import { photoPickResultOf, photoUploadOf } from "../screens/messenger-chat/my-story-photo";
import type {
  PhotoPickResult,
  StoryPhotoSource,
  StoryPhotoUpload,
} from "../screens/messenger-chat/my-story-photo.contract";

interface StoryPhotoModule {
  pick(source: string, callback: (payload: unknown) => void): void;
  upload(
    path: string,
    url: string,
    headers: Readonly<Record<string, string>>,
    callback: (payload: unknown) => void,
  ): void;
  discard(path: string): void;
}

function nativeModule(): StoryPhotoModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)["StoryPhotoModule"] as
    | StoryPhotoModule
    | undefined;
  return module ?? undefined;
}

export function storyPhotosAvailable(): boolean {
  return nativeModule() !== undefined;
}

export function pickStoryPhoto(source: StoryPhotoSource): Promise<PhotoPickResult> {
  const host = nativeModule();
  if (host === undefined) return Promise.resolve({ status: "unavailable" });
  return new Promise((resolve) => {
    try {
      host.pick(source, (payload) => resolve(photoPickResultOf(payload)));
    } catch {
      resolve({ status: "failed" });
    }
  });
}

export const uploadStoryPhoto: StoryPhotoUpload = (path, url, headers) => {
  const host = nativeModule();
  if (host === undefined) return Promise.resolve("failed");
  return new Promise((resolve) => {
    try {
      host.upload(path, url, headers, (payload) => resolve(photoUploadOf(payload)));
    } catch {
      resolve("failed");
    }
  });
};

export function discardStoryPhoto(path: string): void {
  try {
    nativeModule()?.discard(path);
  } catch {
    // 지우지 못해도 호스트가 24시간 뒤 정리합니다.
  }
}
