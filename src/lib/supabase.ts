import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CaseStudy {
  id: string;
  created_at: string;
  client_type: string;
  challenge: string;
  solution: string;
  result: string;
  tone: string;
  industry: string;
  client_quote: string | null;
  ai_output: string;
}
