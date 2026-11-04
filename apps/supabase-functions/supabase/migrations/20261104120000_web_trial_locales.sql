-- 랜딩이 베트남어 · 인도네시아어 · 말레이어 페이지를 얻었다(랜딩 ADR-0094). 웹 체험판이 보내는 `locale`은
-- 페이지 언어 그대로라 두 표의 닫힌 목록을 `apps/landing/src/site.ts`의 `languages`와 같게 넓힌다.
-- 열 · 권한 · 정책은 그대로다 — check 제약만 바꾼다.

alter table public.pre_registrations
  drop constraint pre_registrations_locale_check,
  add constraint pre_registrations_locale_check check (locale in ('en', 'ko', 'vi', 'id', 'ms'));

alter table public.trial_speech_samples
  drop constraint trial_speech_samples_locale_check,
  add constraint trial_speech_samples_locale_check check (locale in ('en', 'ko', 'vi', 'id', 'ms'));
