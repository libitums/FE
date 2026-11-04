-- 랜딩이 스페인어 · 일본어 페이지를 얻었다(랜딩 ADR-0097). 20261104120000과 같은 자리 — 두 표의 `locale` 닫힌 목록을
-- `apps/landing/src/site.ts`의 `languages`와 같게 넓힌다. 열 · 권한 · 정책은 그대로다.

alter table public.pre_registrations
  drop constraint pre_registrations_locale_check,
  add constraint pre_registrations_locale_check check (locale in ('en', 'ko', 'vi', 'id', 'ms', 'es', 'ja'));

alter table public.trial_speech_samples
  drop constraint trial_speech_samples_locale_check,
  add constraint trial_speech_samples_locale_check check (locale in ('en', 'ko', 'vi', 'id', 'ms', 'es', 'ja'));
