import type { ReactNode } from "@lynx-js/react";

import { chatAlbumTestIds as ids } from "./chat-album.contract";
import type { ChatMediaKind } from "./chat-source.contract";

export type RemakeDialogProps = {
  readonly media: ChatMediaKind;
  readonly name: string;
  readonly price: number;
  readonly balance: number;
  readonly onConfirm: () => void;
  readonly onGetCoins: () => void;
  readonly onCancel: () => void;
};

export function RemakeDialog(_props: RemakeDialogProps): ReactNode {
  return <view data-testid={ids.confirm} />;
}
