CREATE TABLE IF NOT EXISTS case_studies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_type TEXT NOT NULL,
  challenge TEXT NOT NULL,
  solution TEXT NOT NULL,
  result TEXT NOT NULL,
  tone TEXT NOT NULL,
  industry TEXT NOT NULL,
  client_quote TEXT,
  ai_output TEXT NOT NULL
);

alter publication supabase_realtime add table case_studies;