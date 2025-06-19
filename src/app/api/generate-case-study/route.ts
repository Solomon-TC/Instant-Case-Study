import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
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
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("is_pro, generation_count")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has reached generation limit
    if (!user.is_pro && user.generation_count >= 3) {
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

    const completion = await openai.chat.completions.create({
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

    const socialCompletion = await openai.chat.completions.create({
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
    const { data, error: supabaseError } = await supabase
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
    if (!user.is_pro) {
      const { error: incrementError } = await supabase.rpc(
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
