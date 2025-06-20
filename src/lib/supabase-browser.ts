"use client";

// This client is only for use in "use client" components
// Do not use this in server-side code or server components
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Singleton Supabase browser client
const supabaseBrowser = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export { supabaseBrowser };
