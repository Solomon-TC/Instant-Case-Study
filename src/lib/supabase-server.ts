import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not defined.");
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({
            name,
            value,
            ...options,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        } catch (error) {
          // Handle cookie setting errors in server components
          console.warn("Failed to set cookie:", error);
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        } catch (error) {
          // Handle cookie removal errors in server components
          console.warn("Failed to remove cookie:", error);
        }
      },
    },
  });
}
