import "background-only";

// 에피소드 최상위 `counterpart_avatar`(상대 아바타 그림 경로)를 읽는 순수 함수입니다. 껍데기만 있는 단계입니다.

export type CounterpartAvatarDecode =
  | { readonly kind: "absent" }
  | { readonly kind: "path"; readonly path: string }
  | { readonly kind: "invalid"; readonly raw: string };

export function counterpartAvatarPathOf(_raw: string | null | undefined): CounterpartAvatarDecode {
  return { kind: "absent" };
}
