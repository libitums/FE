import { useEffect, useState } from "@lynx-js/react";
import { loadAuthSession } from "../../lib/auth-session";
import { useUiCopy } from "../../lib/ui-copy";
import { ProfileScreen } from "./ProfileScreen";
import { profileItems } from "./profile-items";
import type { ProfileItem } from "./profile.contract";

/** 프로필을 열 때마다 현재 로그인 세션을 읽습니다. 토큰을 화면 props나 분석에 전달하지 않습니다. */
export function AccountProfileScreen({ onExit }: { readonly onExit: () => void }) {
  const { profile } = useUiCopy();
  const [items, setItems] = useState<readonly ProfileItem[]>([]);
  useEffect(() => {
    setItems(profileItems(loadAuthSession()?.accessToken ?? null, profile));
  }, [profile]);
  return <ProfileScreen items={items} onExit={onExit} />;
}
