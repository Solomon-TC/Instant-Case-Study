export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Type definitions for API data
type UserData = {
  id: string;
  is_pro: boolean | null;
  generation_count: number | null;
};

// Type guard to validate user data
function isValidUserData(data: any): data is UserData {
  return (
    data &&
    typeof data.id === "string" &&
    (typeof data.is_pro === "boolean" || data.is_pro === null) &&
    (typeof data.generation_count === "number" ||
      data.generation_count === null)
  );
}

// Helper function to validate and get environment variables at runtime
function getRequiredEnvVars(): {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
} {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [];
  if (!openaiApiKey) missing.push("OPENAI_API_KEY");
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    openaiApiKey: openaiApiKey!,
    supabaseUrl: supabaseUrl!,
    supabaseServiceRoleKey: supabaseServiceRoleKey!,
  };
}

// Initialize clients lazily to avoid build-time errors
let openai: OpenAI | null = null;
let supabase: ReturnType<typeof createClient<Database>> | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const { openaiApiKey } = getRequiredEnvVars();
    openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }
  return openai;
}

function getSupabaseClient() {
  if (!supabase) {
    const { supabaseUrl, supabaseServiceRoleKey } = getRequiredEnvVars();
    supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
  }
  return supabase;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize clients at request time
    const openaiClient = getOpenAIClient();
    const supabaseClient = getSupabaseClient();

    const body = await request.json();
    const {
      clientType,
      challenge,
      solution,
      result,
      tone,
      industry,
      clientQuote,
      userId,
    } = body;

    // Validate required fields
    if (
      !clientType ||
      !challenge ||
      !solution ||
      !result ||
      !tone ||
      !industry ||
      !userId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check user's pro status and generation count
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("id, is_pro, generation_count")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate and type-check user data
    if (!userData || !isValidUserData(userData)) {
      console.error("Invalid user data structure:", userData);
      return NextResponse.json({ error: "Invalid user data" }, { status: 500 });
    }

    const user = userData as UserData;

    // Check if user has reached generation limit (handle null values)
    const isPro = user.is_pro ?? false;
    const generationCount = user.generation_count ?? 0;

    if (!isPro && generationCount >= 3) {
      return NextResponse.json(
        { error: "Generation limit reached. Please upgrade to Pro." },
        { status: 403 },
      );
    }

    // Build the prompt
    const prompt = `You are a professional case study copywriter. Write a persuasive and well-structured case study using the following inputs:
- Client Type: ${clientType}
- Challenge: ${challenge}
- Solution: ${solution}
- Result: ${result}
${clientQuote ? `- Client Quote: "${clientQuote}"` : ""}

Use a ${tone} tone and write for the ${industry} industry.

Structure it like this:
1. Headline that summarizes the result
2. Intro paragraph
3. Challenge → Solution → Result narrative (2–3 paragraphs)
4. Include the client quote in a blockquote if provided
5. End with a short Call to Action

Output should be 250–350 words.`;

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedCaseStudy = completion.choices[0]?.message?.content;

    if (!generatedCaseStudy) {
      return NextResponse.json(
        { error: "Failed to generate case study" },
        { status: 500 },
      );
    }

    // Generate social media post text
    const socialMediaPrompt = `You are a copywriter crafting a short, engaging social media post based on the following case study. Summarize the key challenge, solution, and result in a persuasive, casual tone suitable for LinkedIn or Twitter. Keep it under 280 characters. End with:
'Here's the full case study 👉 https://your-app-url.com'

Case Study:
${generatedCaseStudy}`;

    const socialCompletion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: socialMediaPrompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const socialMediaText = socialCompletion.choices[0]?.message?.content || "";

    if (!socialMediaText) {
      console.warn("Failed to generate social media text");
    }

    // Save to Supabase
    const { data, error: supabaseError } = await supabaseClient
      .from("case_studies")
      .insert({
        client_type: clientType,
        challenge,
        solution,
        result,
        tone,
        industry,
        client_quote: clientQuote || null,
        ai_output: generatedCaseStudy,
        user_id: userId,
      })
      .select()
      .single();

    // Increment user's generation count if not pro
    if (!isPro) {
      const { error: incrementError } = await supabaseClient.rpc(
        "increment_generation_count",
        { user_id: userId },
      );

      if (incrementError) {
        console.error("Error incrementing generation count:", incrementError);
      }
    }

    if (supabaseError) {
      console.error("Error saving to Supabase:", supabaseError);
      // Still return the case study even if saving fails
      return NextResponse.json({
        caseStudy: generatedCaseStudy,
        socialMediaText,
      });
    }

    return NextResponse.json({
      caseStudy: generatedCaseStudy,
      socialMediaText,
      saved: true,
      id: data.id,
    });
  } catch (error) {
    console.error("Error generating case study:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
