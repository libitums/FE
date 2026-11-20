// 더보기 메뉴 화면들의 route 입구입니다(ADR-0169). 단어장 셋은 기기 단어장 칸을 효과(배경 스레드)에서 읽어 줄로 풉니다 — 계정 id ·
// 저장소는 메인 스레드에서 읽지 않습니다. 줄의 글 · 뜻은 UI 언어로 바꾼 카탈로그에서 옵니다.

import { useEffect, useMemo, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { emptyWordbook, reviewQueueOf, wordbookKeyOf, type Wordbook } from "../lib/wordbook";
import { LettersComposeScreen } from "../screens/letters/LettersComposeScreen";
import { LettersScreen } from "../screens/letters/LettersScreen";
import { WordbookReviewScreen } from "../screens/wordbook/WordbookReviewScreen";
import { WordbookScreen } from "../screens/wordbook/WordbookScreen";
import { WordbookWordScreen } from "../screens/wordbook/WordbookWordScreen";
import { loadCurrentWordbook, todayLocal } from "./learning-trail-port";
import type { MoreWiring } from "./more-wiring";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";
import { meaningPoolOf, wordbookEntriesOf } from "./wordbook-entries";

type MoreScreen = Extract<
  Screen,
  { name: "letters" | "letters-compose" | "wordbook" | "wordbook-word" | "wordbook-review" }
>;

export function renderMoreScreen(screen: MoreScreen, wiring: ScreenWiring): ReactNode {
  const more = wiring.more;
  switch (screen.name) {
    case "letters":
      return (
        <LettersScreen
          romanization={more.romanization}
          sound={more.letterSound}
          onPractice={more.onOpenCompose}
          onCellTapped={(letter, group, audio) =>
            more.emit({ name: "letters_cell_tapped", letter, group, audio })
          }
        />
      );
    case "letters-compose":
      return (
        <LettersComposeScreen
          romanization={more.romanization}
          sound={more.letterSound}
          onExit={more.onBack}
          onAnswered={(round, target, correct) =>
            more.emit({ name: "letters_quiz_answered", round: String(round), target, correct })
          }
          onComplete={(rounds, firstTry) =>
            more.emit({
              name: "letters_quiz_completed",
              rounds: String(rounds),
              firstTry: String(firstTry),
            })
          }
        />
      );
    case "wordbook":
    case "wordbook-word":
    case "wordbook-review":
      return <WordbookRoute key={routeKey(screen)} screen={screen} more={more} wiring={wiring} />;
  }
}

function routeKey(screen: MoreScreen): string {
  if (screen.name === "wordbook-word") return `word:${screen.episodeId}:${screen.ref}`;
  if (screen.name === "wordbook-review")
    return `review:${screen.only === null ? "" : `${screen.only.episodeId}:${screen.only.ref}`}`;
  return screen.name;
}

/** 기기 단어장 칸 — 마운트 때(효과) 한 번 읽습니다. 첫 그림은 빈 단어장입니다. */
function useStoredWordbook(): Wordbook {
  const [book, setBook] = useState<Wordbook>(emptyWordbook);
  useEffect(() => {
    setBook(loadCurrentWordbook());
  }, []);
  return book;
}

function WordbookRoute({
  screen,
  more,
  wiring,
}: {
  readonly screen: Extract<MoreScreen, { name: "wordbook" | "wordbook-word" | "wordbook-review" }>;
  readonly more: MoreWiring;
  readonly wiring: ScreenWiring;
}): ReactNode {
  const book = useStoredWordbook();
  const catalog = wiring.episodeContent.catalog;
  const today = todayLocal();
  const entries = useMemo(() => wordbookEntriesOf(book, catalog, today), [book, catalog, today]);
  // 복습 줄은 열 때 한 번 고정합니다 — 답하며 기록이 바뀌어도 문항이 빠지지 않습니다.
  const [queueKeys, setQueueKeys] = useState<readonly string[] | null>(null);
  useEffect(() => {
    if (screen.name !== "wordbook-review" || book === emptyWordbook || queueKeys !== null) return;
    setQueueKeys(
      screen.only === null
        ? reviewQueueOf(book, today).map((record) => wordbookKeyOf(record.episodeId, record.ref))
        : [wordbookKeyOf(screen.only.episodeId, screen.only.ref)],
    );
  }, [book]);
  if (screen.name === "wordbook")
    return (
      <WordbookScreen
        entries={entries}
        dueCount={entries.filter((entry) => entry.record.due <= today).length}
        sound={more.wordSound}
        onOpenWord={more.onOpenWord}
        onReview={() => more.onReview(null)}
      />
    );
  if (screen.name === "wordbook-word") {
    const key = wordbookKeyOf(screen.episodeId, screen.ref);
    const entry = entries.find((candidate) => candidate.key === key) ?? null;
    return (
      <WordbookWordScreen
        entry={entry}
        sound={more.wordSound}
        onBack={more.onBack}
        onPractice={() => more.onReview(entry)}
      />
    );
  }
  const queue = (queueKeys ?? [])
    .map((key) => entries.find((entry) => entry.key === key))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
  if (queue.length === 0) return null;
  return (
    <WordbookReviewScreen
      queue={queue}
      pool={meaningPoolOf(catalog)}
      sound={more.wordSound}
      onAnswer={more.onReviewAnswer}
      onClose={more.onBack}
    />
  );
}
