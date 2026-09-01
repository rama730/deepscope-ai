import { NextRequest, NextResponse } from "next/server";

interface AnalysisResult {
    tags: string[];
    sentiment: "positive" | "neutral" | "negative" | "debate";
    summary?: string;
    category?: "showcase" | "question" | "tutorial" | "discussion" | "coding";
    relevance?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Mock AI Logic (Heuristics)
        const lowerText = text.toLowerCase();
        
        let sentiment: AnalysisResult["sentiment"] = "neutral";
        let category: AnalysisResult["category"] = "discussion";
        const tags: string[] = [];

        // 1. Determine Category
        if (text.includes("?") || lowerText.includes("how to") || lowerText.includes("help")) {
            category = "question";
            tags.push("Question");
        } else if (lowerText.includes("check out") || lowerText.includes("built") || lowerText.includes("launched")) {
            category = "showcase";
            tags.push("Showcase");
            sentiment = "positive";
        } else if (lowerText.includes("tutorial") || lowerText.includes("guide") || lowerText.startsWith("how i")) {
            category = "tutorial";
            tags.push("Tutorial");
        } else if (text.includes("```") || lowerText.includes("function") || lowerText.includes("const ")) {
            category = "coding";
            tags.push("Code");
        }

        // 2. Determine Sentiment (Simple keyword matching)
        if (lowerText.includes("love") || lowerText.includes("great") || lowerText.includes("awesome") || lowerText.includes("excited")) {
            sentiment = "positive";
        } else if (lowerText.includes("issue") || lowerText.includes("bug") || lowerText.includes("fail") || lowerText.includes("hate")) {
            sentiment = "negative";
        } else if (lowerText.includes("agree?") || lowerText.includes("thoughts?") || lowerText.includes("opinion")) {
            sentiment = "debate";
            tags.push("Debate");
        }

        // 3. Generate Summary (Simple Truncation)
        let summary: string | undefined = undefined;
        if (text.length > 300) {
            summary = text.substring(0, 150).trim() + "...";
        }

        // 4. Mock Relevance (Randomized for demo if not real)
        const relevanceReasons = [
            "Trending in Design",
            "Popular in your network",
            "Similar to posts you liked",
            "From a creator you follow",
            "New in Development"
        ];
        const randomRelevance = relevanceReasons[Math.floor(Math.random() * relevanceReasons.length)];

        const result: AnalysisResult = {
            tags: Array.from(new Set(tags)), // Dedup
            sentiment,
            summary,
            category,
            relevance: randomRelevance
        };

        // Artificial delay to simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 500));

        return NextResponse.json(result);

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
