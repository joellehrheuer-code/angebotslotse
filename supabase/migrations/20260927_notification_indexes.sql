create index if not exists notification_events_outbox_idx
  on private.notification_events(outbox_id);

create index if not exists notification_events_user_idx
  on private.notification_events(user_id);

create index if not exists notification_outbox_user_idx
  on private.notification_outbox(user_id);
