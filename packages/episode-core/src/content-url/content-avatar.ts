// 에피소드 최상위 `counterpart_avatar`(상대 아바타 그림 경로)를 읽는 순수 함수입니다.
// 경로 규칙은 다른 그림 경로와 같고(버킷 상대 경로, 선두 `content/`는 허용), 그림 확장자만 받습니다.

import { resolveContentUrlSafe } from "./content-url";

export type CounterpartAvatarDecode =
  | { readonly kind: "absent" }
  | { readonly kind: "path"; readonly path: string }
  | { readonly kind: "invalid"; readonly raw: string };

const IMAGE_EXTENSION = /\.(webp|png|jpe?g)$/i;
const FORBIDDEN_CHARACTER = /[\s?#]/;

export function counterpartAvatarPathOf(raw: string | null | undefined): CounterpartAvatarDecode {
  if (typeof raw !== "string") return { kind: "absent" };
  const path = raw.trim();
  if (path === "") return { kind: "absent" };
  if (
    resolveContentUrlSafe("", path) === null ||
    !IMAGE_EXTENSION.test(path) ||
    FORBIDDEN_CHARACTER.test(path)
  ) {
    return { kind: "invalid", raw };
  }
  return { kind: "path", path };
}
