import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import type { LoginScreenProps } from "./login.contract";

// 약관 안내. 두 문서 이름만 gray.800으로 구분하고, 누르면 그 문서를 앱 위
// 브라우저로 엽니다(ADR-0033). 인라인 글자는 탭 · 낭독 단위가 될 수 없어 문서
// 이름마다 따로 선 글자로 둡니다.
export function LoginLegalNotice({
  onOpenLegalDocument,
}: Pick<LoginScreenProps, "onOpenLegalDocument">): ReactNode {
  const legal = useUiCopy().login.legal;
  return (
    <view className="login-screen-legal" data-testid="login-screen-legal">
      <text className="login-screen-legal-text" flatten={false} accessibility-element={true}>
        {legal.lead}
      </text>
      <view className="login-screen-legal-links">
        <text
          className="login-screen-legal-emphasis"
          data-testid="login-screen-legal-terms-of-use"
          flatten={false}
          accessibility-element={true}
          accessibility-label={legal.termsOfUse}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          bindtap={() => onOpenLegalDocument("terms-of-use")}
        >
          {legal.termsOfUse}
        </text>
        <text className="login-screen-legal-text" flatten={false} accessibility-element={true}>
          {legal.and}
        </text>
        <text
          className="login-screen-legal-emphasis"
          data-testid="login-screen-legal-privacy-policy"
          flatten={false}
          accessibility-element={true}
          accessibility-label={legal.privacyPolicy}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          bindtap={() => onOpenLegalDocument("privacy-policy")}
        >
          {legal.privacyPolicy}
        </text>
      </view>
    </view>
  );
}
