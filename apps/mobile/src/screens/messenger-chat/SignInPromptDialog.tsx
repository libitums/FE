import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { useUiCopy } from "../../lib/ui-copy";
import { messengerAccessTestIds as ids } from "./messenger-access";

import "./chat-overlays.css";

export type SignInPromptDialogProps = {
  readonly onSignIn: () => void;
  readonly onLater: () => void;
};

// 비회원 「로그인 필요」 대화상자입니다(ADR-0166). 다시 만들기 확인(`RegenerateIdeasDialog`)과 같은 틀 — ui-lynx `Dialog`는 첫 액션이 주
// 단추이고 마지막 액션이 뒤로가기 취소 경로라 [sign-in, later] 순서입니다. 주 단추 문구는 메신저 가입 권유 안내와 같은 「Sign up or log in」.
export function SignInPromptDialog({ onSignIn, onLater }: SignInPromptDialogProps): ReactNode {
  const copy = useUiCopy().messengerChat.access;
  const handleAction = (id: string) => {
    "background only";
    if (id === "sign-in") onSignIn();
    else onLater();
  };
  return (
    <view className="chat-dialog-centered" data-testid={ids.prompt}>
      <Dialog
        title={copy.promptTitle}
        description={copy.promptBody}
        actions={[
          { id: "sign-in", label: copy.signIn },
          { id: "later", label: copy.promptLater },
        ]}
        bindaction={handleAction}
      />
    </view>
  );
}
