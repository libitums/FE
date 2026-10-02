-- Keep the existing registration RPC and APNs rows. The environment value chooses
-- the transport; FCM tokens are stored as `fcm.` + base64url(UTF-8 raw token).
alter table public.push_devices
  drop constraint push_devices_token_check,
  drop constraint push_devices_environment_check;

alter table public.push_devices
  add constraint push_devices_environment_check
    check (environment in ('sandbox', 'production', 'fcm')),
  add constraint push_devices_token_check
    check (
      (environment in ('sandbox', 'production') and token ~ '^[0-9a-f]{64,200}$')
      or
      (environment = 'fcm' and char_length(token) between 31 and 4100
        and token ~ '^fcm\.[A-Za-z0-9_-]+$')
    );
