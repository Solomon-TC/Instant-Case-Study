"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}

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
  user_id?: string;
}

export interface User {
  id: string;
  email: string;
  is_pro: boolean;
  generation_count: number;
  created_at: string;
  updated_at: string;
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
