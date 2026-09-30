import { payloadRecordFrom } from "../../lib/auth-user-id";
import type { ProfileCopy } from "../../lib/ui-copy-sections.contract";
import type { ProfileItem } from "./profile.contract";

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** 서버가 발급한 현재 세션에서 표시 정보만 읽습니다. 권한 판정에는 사용하지 않습니다. */
export function profileItems(
  accessToken: string | null,
  copy: ProfileCopy,
): readonly ProfileItem[] {
  const payload = accessToken === null ? null : payloadRecordFrom(accessToken);
  const raw = payload?.["user_metadata"];
  const metadata =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const name =
    nonEmpty(metadata["full_name"]) ??
    nonEmpty(metadata["name"]) ??
    nonEmpty(metadata["display_name"]);
  return [
    { id: "name", value: name ?? copy.notProvided },
    { id: "email", value: nonEmpty(payload?.["email"]) ?? copy.notProvided },
    { id: "phone", value: nonEmpty(payload?.["phone"]) ?? copy.notProvided },
    { id: "learning-language", value: copy.learningLanguage },
  ];
}
