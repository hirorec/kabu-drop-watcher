-- ウォッチリスト
create table watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  company_name text not null,
  priority integer not null default 0,
  enabled boolean not null default true,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ticker)
);

-- 決算・適時開示イベント
create table earnings_events (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  announced_at timestamptz not null,
  period text,
  source_url text,
  raw_text text,
  created_at timestamptz not null default now()
);

-- 株価スナップショット
create table price_snapshots (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  captured_at timestamptz not null,
  price numeric not null,
  change_pct numeric,
  volume bigint,
  created_at timestamptz not null default now()
);

-- AI分析結果
create table analysis_results (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  event_id uuid references earnings_events(id) on delete set null,
  summary text,
  reason_label text,
  structural_classification text,
  kpi_status text,
  guidance_status text,
  score numeric,
  json_result jsonb,
  created_at timestamptz not null default now()
);

-- 通知履歴
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  type text not null,
  title text not null,
  body text,
  sent_at timestamptz not null default now(),
  opened_at timestamptz
);

-- アラートルール
create table user_alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  min_drop_pct numeric not null default 5.0,
  min_score numeric not null default 0,
  channels jsonb not null default '[]'::jsonb,
  quiet_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create index idx_watchlists_user_id on watchlists(user_id);
create index idx_earnings_events_ticker on earnings_events(ticker);
create index idx_earnings_events_announced_at on earnings_events(announced_at);
create index idx_price_snapshots_ticker_captured on price_snapshots(ticker, captured_at);
create index idx_analysis_results_ticker on analysis_results(ticker);
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_sent_at on notifications(sent_at);

-- RLS 有効化
alter table watchlists enable row level security;
alter table notifications enable row level security;
alter table user_alert_rules enable row level security;

-- RLS ポリシー: ユーザーは自分のデータのみアクセス可能
create policy "watchlists: users can manage own data" on watchlists
  for all using (auth.uid() = user_id);

create policy "notifications: users can manage own data" on notifications
  for all using (auth.uid() = user_id);

create policy "user_alert_rules: users can manage own data" on user_alert_rules
  for all using (auth.uid() = user_id);

-- updated_at を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger watchlists_updated_at
  before update on watchlists
  for each row execute function update_updated_at();

create trigger user_alert_rules_updated_at
  before update on user_alert_rules
  for each row execute function update_updated_at();
