// Re-export the browser and server clients
export { supabaseBrowser } from "./supabase-browser";
export { createSupabaseServerClient } from "./supabase-server";

// Shared types and utility functions
export interface CaseStudy {
  id: string;
  created_at: string | null;
  client_type: string;
  challenge: string;
  solution: string;
  result: string;
  tone: string;
  industry: string;
  client_quote: string | null;
  ai_output: string;
  user_id: string | null;
}

export interface User {
  id: string;
  email: string;
  is_pro: boolean | null;
  generation_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}
