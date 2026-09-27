create unique index if not exists alert_subscriptions_unique_rule
on public.alert_subscriptions (
  user_id,
  alert_type,
  coalesce(query, ''),
  coalesce(category, ''),
  coalesce(brand, ''),
  coalesce(merchant, ''),
  coalesce(max_price, -1),
  coalesce(min_discount, -1)
);
