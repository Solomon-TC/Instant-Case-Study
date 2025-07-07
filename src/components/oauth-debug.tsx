"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [session, setSession] = useState<any>(null);
  const supabase = supabaseBrowser;

  useEffect(() => {
    const getDebugInfo = async () => {
      const { data: sessionData, error } = await supabase.auth.getSession();

      setDebugInfo({
        url: window.location.href,
        hash: window.location.hash,
        search: window.location.search,
        sessionError: error?.message,
        hasSession: !!sessionData.session,
        userEmail: sessionData.session?.user?.email,
        timestamp: new Date().toISOString(),
      });

      setSession(sessionData.session);
    };

    getDebugInfo();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session?.user?.email);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const testGoogleAuth = async () => {
    console.log("🧪 Testing Google OAuth from debug component...");

    // Clear any existing session first
    await supabase.auth.signOut({ scope: "local" });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    });

    if (error) {
      console.error("❌ OAuth error:", error);
    } else {
      console.log("✅ OAuth initiated:", data);
    }
  };

  const testSessionFromUrl = async () => {
    console.log("🧪 Testing session from current URL...");
    const { data, error } = await supabase.auth.getSession();
    console.log("Session from URL (via getSession):", { data, error });
  };

  const clearSession = async () => {
    console.log("🧹 Clearing all sessions...");
    await supabase.auth.signOut({ scope: "global" });
    window.location.reload();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="bg-white min-h-screen p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>OAuth Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Current Session:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {session ? JSON.stringify(session.user, null, 2) : "No session"}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Debug Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testGoogleAuth}>Test Google OAuth</Button>
            <Button onClick={testSessionFromUrl} variant="outline">
              Test Session from URL
            </Button>
            <Button onClick={clearSession} variant="destructive">
              Clear All Sessions
            </Button>
            {session && (
              <Button onClick={signOut} variant="outline">
                Sign Out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
