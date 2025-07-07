"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Copy } from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: any;
}

export default function OAuthDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [oauthAttemptLog, setOauthAttemptLog] = useState<string[]>([]);
  const supabase = supabaseBrowser;

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    setOauthAttemptLog((prev) => [...prev, logEntry]);
    console.log(logEntry);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setOauthAttemptLog([]);

    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Check Supabase Configuration
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        diagnosticResults.push({
          test: "Supabase Environment Variables",
          status: "pass",
          message: "Supabase URL and Anon Key are configured",
          details: { url: supabaseUrl.substring(0, 30) + "..." },
        });
      } else {
        diagnosticResults.push({
          test: "Supabase Environment Variables",
          status: "fail",
          message: "Missing Supabase environment variables",
          details: { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey },
        });
      }
    } catch (error) {
      diagnosticResults.push({
        test: "Supabase Environment Variables",
        status: "fail",
        message: "Error checking environment variables",
        details: error,
      });
    }

    // Test 2: Check Current URL and Domain
    try {
      const currentOrigin = window.location.origin;
      const expectedCallback = `${currentOrigin}/auth/callback`;

      diagnosticResults.push({
        test: "Domain and Callback URL",
        status: "pass",
        message: "Current domain and callback URL identified",
        details: {
          origin: currentOrigin,
          callbackUrl: expectedCallback,
          isHttps: currentOrigin.startsWith("https"),
        },
      });
    } catch (error) {
      diagnosticResults.push({
        test: "Domain and Callback URL",
        status: "fail",
        message: "Error determining current domain",
        details: error,
      });
    }

    // Test 3: Test Supabase Client Initialization
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        diagnosticResults.push({
          test: "Supabase Client Connection",
          status: "fail",
          message: `Supabase client error: ${error.message}`,
          details: error,
        });
      } else {
        diagnosticResults.push({
          test: "Supabase Client Connection",
          status: "pass",
          message: "Supabase client is working correctly",
          details: { hasSession: !!data.session },
        });
      }
    } catch (error) {
      diagnosticResults.push({
        test: "Supabase Client Connection",
        status: "fail",
        message: "Failed to initialize Supabase client",
        details: error,
      });
    }

    // Test 4: Test OAuth Provider Availability
    try {
      addLog("Testing OAuth provider availability...");

      // This will attempt to initiate OAuth but we'll catch any immediate errors
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true, // This prevents actual redirect for testing
        },
      });

      if (error) {
        if (
          error.message.includes("Provider not found") ||
          error.message.includes("not enabled")
        ) {
          diagnosticResults.push({
            test: "Google OAuth Provider",
            status: "fail",
            message: "Google OAuth provider is not enabled in Supabase",
            details: error,
          });
        } else {
          diagnosticResults.push({
            test: "Google OAuth Provider",
            status: "warning",
            message: `OAuth provider responded with: ${error.message}`,
            details: error,
          });
        }
      } else {
        diagnosticResults.push({
          test: "Google OAuth Provider",
          status: "pass",
          message: "Google OAuth provider is available",
          details: data,
        });
      }
    } catch (error) {
      diagnosticResults.push({
        test: "Google OAuth Provider",
        status: "fail",
        message: "Error testing OAuth provider",
        details: error,
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const testActualOAuth = async () => {
    addLog("🚀 Starting actual Google OAuth test...");

    try {
      // Clear any existing session
      await supabase.auth.signOut({ scope: "local" });
      addLog("✅ Cleared existing session");

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth/callback`;

      addLog(`🔗 Using redirect URL: ${redirectUrl}`);

      // Attempt OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        addLog(`❌ OAuth initiation failed: ${error.message}`);
        addLog(`📊 Error details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addLog(`✅ OAuth initiated successfully`);
        addLog(`📊 OAuth data: ${JSON.stringify(data, null, 2)}`);
        addLog(`🔄 Browser should redirect to Google...`);
      }
    } catch (error) {
      addLog(`❌ Unexpected error: ${error}`);
    }
  };

  const copyLogs = () => {
    const logsText = oauthAttemptLog.join("\n");
    navigator.clipboard.writeText(logsText);
  };

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "pass":
        return "border-green-200 bg-green-50";
      case "fail":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
    }
  };

  return (
    <div className="bg-white min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Google OAuth Diagnostic Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? "Running Diagnostics..." : "Run Diagnostics"}
              </Button>
              <Button
                onClick={testActualOAuth}
                variant="outline"
                className="flex-1"
              >
                Test Actual OAuth Flow
              </Button>
            </div>

            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Diagnostic Results:</h3>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h4 className="font-medium">{result.test}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer">
                              Show Details
                            </summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {oauthAttemptLog.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">OAuth Attempt Log:</h3>
                  <Button onClick={copyLogs} size="sm" variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Logs
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto">
                  {oauthAttemptLog.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>
                  To fix Google OAuth, ensure these are configured:
                </strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Google Cloud Console: Create OAuth 2.0 Client ID</li>
                  <li>
                    Add authorized redirect URI:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      https://[your-supabase-project].supabase.co/auth/v1/callback
                    </code>
                  </li>
                  <li>
                    Supabase Dashboard: Enable Google provider with Client ID &
                    Secret
                  </li>
                  <li>
                    Add your domain to Supabase redirect URLs:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      {typeof window !== "undefined"
                        ? window.location.origin
                        : "[your-domain]"}
                      /auth/callback
                    </code>
                  </li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
