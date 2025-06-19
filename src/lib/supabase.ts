"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not defined.");
}

// Single browser client instance for session persistence
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Use the same client instance to ensure session persistence
export function createSupabaseClient() {
  return supabase;
}

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

export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

export async function updateUserProStatus(
  userId: string,
  isPro: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update({ is_pro: isPro, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user pro status:", error);
    return false;
  }

  return true;
}

export async function incrementUserGenerationCount(
  userId: string,
): Promise<boolean> {
  const { error } = await supabase.rpc("increment_generation_count", {
    user_id: userId,
  });

  if (error) {
    console.error("Error incrementing generation count:", error);
    return false;
  }

  return true;
}
