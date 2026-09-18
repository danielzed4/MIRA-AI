/*
# App settings table — key-value store for system configuration
*/

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_authenticated" ON public.app_settings FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "settings_insert_authenticated" ON public.app_settings FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "settings_update_authenticated" ON public.app_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Seed defaults
INSERT INTO public.app_settings (key, value) VALUES
  ('theme', 'light'),
  ('language', 'fa'),
  ('date_format', 'jalali'),
  ('ai_action_level', 'suggest'),
  ('ai_confidence_threshold', '70'),
  ('session_timeout', '60'),
  ('max_upload_mb', '10'),
  ('notif_new_customer', 'true'),
  ('notif_new_message', 'true'),
  ('notif_hot_lead', 'true'),
  ('notif_follow_up', 'true')
ON CONFLICT (key) DO NOTHING;
