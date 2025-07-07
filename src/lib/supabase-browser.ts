"use client";

// This client is only for use in "use client" components
// Do not use this in server-side code or server components
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Enhanced storage implementation for better session persistence
const createEnhancedStorage = () => {
  if (typeof window === "undefined") return undefined;

  return {
    getItem: (key: string) => {
      try {
        const item = window.localStorage.getItem(key);
        console.log(`🔑 Storage getItem: ${key}`, item ? "found" : "not found");
        return item;
      } catch (error) {
        console.error(`❌ Storage getItem error for ${key}:`, error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        window.localStorage.setItem(key, value);
        console.log(`💾 Storage setItem: ${key}`, "saved");
      } catch (error) {
        console.error(`❌ Storage setItem error for ${key}:`, error);
      }
    },
    removeItem: (key: string) => {
      try {
        window.localStorage.removeItem(key);
        console.log(`🗑️ Storage removeItem: ${key}`, "removed");
      } catch (error) {
        console.error(`❌ Storage removeItem error for ${key}:`, error);
      }
    },
  };
};

// Singleton Supabase browser client with enhanced OAuth configuration
const supabaseBrowser = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      debug: process.env.NODE_ENV === "development",
      storage: createEnhancedStorage(),
      storageKey: "sb-auth-token",
    },
    global: {
      headers: {
        "X-Client-Info": "supabase-js-web",
      },
    },
  },
);

// Enhanced session management utilities
export const sessionUtils = {
  // Wait for session to be established with retry logic
  waitForSession: async (maxAttempts = 10, delayMs = 500): Promise<any> => {
    console.log("🔄 Waiting for session establishment...");

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const {
          data: { session },
          error,
        } = await supabaseBrowser.auth.getSession();

        if (error) {
          console.error(`❌ Session check error (attempt ${attempt}):`, error);
          if (attempt === maxAttempts) throw error;
        } else if (session?.user) {
          console.log(
            `✅ Session found on attempt ${attempt}:`,
            session.user.email,
          );
          return session;
        }

        console.log(`⏳ Session not found, attempt ${attempt}/${maxAttempts}`);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`❌ Session wait error (attempt ${attempt}):`, error);
        if (attempt === maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.log("❌ No session found after all attempts");
    return null;
  },

  // Clear all auth-related storage
  clearAuthStorage: () => {
    if (typeof window === "undefined") return;

    console.log("🧹 Clearing auth storage...");
    const keysToRemove = [];

    // Find all supabase-related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("supabase") || key.includes("sb-"))) {
        keysToRemove.push(key);
      }
    }

    // Remove all found keys
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed storage key: ${key}`);
    });
  },

  // Force refresh session
  refreshSession: async (): Promise<any> => {
    console.log("🔄 Forcing session refresh...");
    try {
      const { data, error } = await supabaseBrowser.auth.refreshSession();
      if (error) {
        console.error("❌ Session refresh error:", error);
        throw error;
      }
      console.log("✅ Session refreshed successfully");
      return data.session;
    } catch (error) {
      console.error("❌ Session refresh failed:", error);
      throw error;
    }
  },
};

export { supabaseBrowser };
