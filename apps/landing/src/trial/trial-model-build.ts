// 체험판 화면 모델의 조립입니다(순수). 조각은 `trial-model-parts.ts`가 만들고, 여기서 오류를 모아 한 모델로 묶습니다.

import type { Episode } from "@libitums/episode-core/episode";

import type { TrialAssetPort, TrialModelError, TrialModelOf } from "./trial-model.contract";
import {
  addressesOf,
  built,
  cultureOf,
  cutsOf,
  EPILOGUE_CUTS,
  failed,
  imageMatchOf,
  itemIn,
  PICK,
  replySelectOf,
  turnsOf,
  vocabOf,
  type Built,
  type ItemOf,
  type ItemType,
} from "./trial-model-parts";

const valueOf = <T>(result: Built<T>, errors: TrialModelError[]): T | null => {
  if (result.ok) return result.value;
  errors.push(result.error);
  return null;
};

/** 에피소드 + 주소 입력 + 사본의 판 → 화면 모델. 고른 단계가 없거나 모양이 어긋나면 오류 목록입니다. */
export function buildTrialModel(
  episode: Episode,
  port: TrialAssetPort,
  version: string,
): ReturnType<TrialModelOf> {
  const at = addressesOf(port);
  const errors: TrialModelError[] = [];
  const pick = <T extends ItemType, V>(
    stepId: string,
    type: T,
    view: (item: ItemOf<T>) => Built<V>,
  ): V | null => {
    const item = valueOf(itemIn(episode, stepId, type), errors);
    return item === null ? null : valueOf(view(item), errors);
  };

  const prologue = valueOf(cutsOf(episode.prologue, "pre_cuts", at), errors);
  const epilogueCuts = episode.epilogue.slice(0, EPILOGUE_CUTS);
  const epilogue =
    epilogueCuts.length < EPILOGUE_CUTS
      ? valueOf(failed("step-missing", "post_cuts"), errors)
      : valueOf(cutsOf(epilogueCuts, "post_cuts", at), errors);
  const vocab = pick(PICK.vocab, "VOCAB_CARD", (item) => built(vocabOf(item, at)));
  const imageMatch = pick(PICK.imageMatch, "IMG_MATCH", (item) =>
    imageMatchOf(item, PICK.imageMatch, at),
  );
  const replySelect = pick(PICK.replySelect, "REPLY_SELECT", (item) =>
    replySelectOf(item, PICK.replySelect, at),
  );
  const culture = pick(PICK.culture, "CULTURE_CARD", (item) => cultureOf(item, PICK.culture, at));
  const turns = valueOf(turnsOf(episode, at), errors);

  if (
    prologue === null ||
    epilogue === null ||
    vocab === null ||
    imageMatch === null ||
    replySelect === null ||
    culture === null ||
    turns === null
  ) {
    return { ok: false, errors };
  }
  const firstTurn = episode.finalTest.items.find((item) => item.type === "ROLEPLAY_TURN");
  return {
    ok: true,
    model: {
      episodeId: episode.id,
      version,
      counterpartName: episode.counterpart.trim(),
      prologue,
      vocab,
      imageMatch,
      replySelect,
      culture,
      roleplay: {
        imageUrl:
          firstTurn?.type === "ROLEPLAY_TURN" ? at.imageOf(firstTurn.stimulus.imageUrl) : null,
        turns,
      },
      epilogue,
    },
  };
}
