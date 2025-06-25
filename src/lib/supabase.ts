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
  is_deleted: boolean | null;
}

// Soft delete utility function
export async function softDeleteUser(userId: string) {
  const { supabaseBrowser } = await import("./supabase-browser");
  const supabase = supabaseBrowser;

  const { error } = await supabase
    .from("users")
    .update({ is_deleted: true })
    .eq("id", userId);

  if (error) {
    console.error("Failed to soft delete user:", error);
    throw new Error("Soft delete failed");
  }
}
