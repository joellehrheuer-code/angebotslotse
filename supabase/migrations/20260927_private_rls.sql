alter table private.newsletter_consents enable row level security;
alter table private.push_subscriptions enable row level security;
alter table private.notification_outbox enable row level security;
alter table private.notification_events enable row level security;

-- Intentionally no anon/authenticated policies.
-- These tables remain server-only and are accessed through trusted server code.
