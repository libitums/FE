import { cleanup, render } from "@lynx-js/react/testing-library";
import { afterEach, expect, test } from "vitest";

import { messengerChatWallet, resetMessengerChatSourceForTests } from "./messenger-chat-wiring";
import { useMessengerWalletSync } from "./use-messenger-wallet-sync";

// 리뷰 P2-2: 지갑의 「쓴 양」은 계정에 묶여야 한다. 로그아웃 · 계정 전환은 `AppSession`이 새로 서는 일이므로,
// 세션이 내려갈 때 쓴 양이 비워져야 다음 계정이 앞 계정의 소비를 물려받지 않는다.

afterEach(() => {
  cleanup();
  resetMessengerChatSourceForTests();
});

function Probe({ coins }: { readonly coins: number }) {
  useMessengerWalletSync(coins);
  return <view />;
}

test("P2-2. 계정 A가 60을 쓰고 세션이 내려간 뒤 계정 B(100)가 서면 B의 잔액은 100이다", () => {
  const sessionA = render(<Probe coins={100} />);
  expect(messengerChatWallet().balance()).toBe(100);
  messengerChatWallet().spend(60, "photo");
  expect(messengerChatWallet().balance()).toBe(40);

  sessionA.unmount();
  render(<Probe coins={100} />);

  expect(messengerChatWallet().balance()).toBe(100);
});

test("P2-2. 같은 세션 안에서 번 엽전이 바뀌어도 쓴 양은 그대로다", () => {
  const view = render(<Probe coins={100} />);
  messengerChatWallet().spend(60, "photo");

  view.rerender(<Probe coins={110} />);

  expect(messengerChatWallet().balance()).toBe(50);
});
