// 법 · 안전 UI(ADR-0125)의 문구 계약입니다 — 고지 줄 · 위기 카드 · 막힌 입력 줄 · 생년 시트.

export type SafetyCopy = {
  readonly time: (hour: number, minute: number) => string;
  readonly notice: {
    readonly aiDisclosure: (name: string) => string;
    readonly minorNotice: string;
    readonly breakReminder: (name: string) => string;
  };
  readonly crisis: {
    readonly title: string;
    readonly body: string;
    readonly call: (phone: string) => string;
    readonly callLabel: (name: string) => string;
    readonly website: string;
    readonly websiteLabel: (name: string) => string;
    readonly emergency: string;
  };
  readonly blocked: {
    readonly pausedTitle: (time: string) => string;
    readonly pausedBody: string;
    readonly timeUpTitle: string;
    readonly timeUpBody: (time: string) => string;
    readonly ageTitle: string;
    readonly ageBody: string;
    readonly changeBirthYear: string;
  };
  readonly birthYear: {
    readonly title: string;
    readonly body: string;
    readonly continue: string;
    readonly skip: string;
    readonly skipNote: string;
    readonly sidebar: string;
    readonly notSet: string;
  };
};
