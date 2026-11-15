import type { ReactNode } from "@lynx-js/react";

import { chatAlbumTestIds as ids, type ChatSnapshotSelf } from "./chat-album.contract";

export type SnapshotSelfSheetProps = {
  readonly selected: ChatSnapshotSelf;
  readonly onSelect: (self: ChatSnapshotSelf) => void;
  readonly onSave: () => void;
  readonly onClose: () => void;
};

export function SnapshotSelfSheet(_props: SnapshotSelfSheetProps): ReactNode {
  return <view data-testid={ids.selfSheet} />;
}
