CREATE TABLE public.controller_state (
  id text PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.controller_state TO service_role;
ALTER TABLE public.controller_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.controller_state (id, config, password_hash)
VALUES ('default', '{}'::jsonb, encode(sha256('1234'::bytea), 'hex'));