import { GoogleGenAI, Type } from "@google/genai";
import { TutorResponse } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDiarySummary = async (text: string, previousContext: string): Promise<{ summary: string; insight: string | null }> => {
  const ai = getClient();
  const model = "gemini-2.5-flash";

  const prompt = `
    You are "The Silent Friend", a supportive and passive AI in Diary Mode.
    
    Task:
    1. Organize the user's messy thoughts into a clean, structured Markdown format. Use headers, bullet points, and bold text for key terms.
    2. If the user mentions a topic related to the previous context provided below, generate a short "Insight" note connecting them.
    3. If no connection is found, return null for the insight.

    Previous Context: "${previousContext}"
    
    Current User Input: "${text}"

    Output JSON schema:
    {
      "summary": "markdown string",
      "insight": "string or null"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                insight: { type: Type.STRING, nullable: true }
            }
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      summary: result.summary || "Unable to summarize.",
      insight: result.insight || null
    };
  } catch (error) {
    console.error("Gemini Diary Error:", error);
    return { summary: "Error generating summary.", insight: null };
  }
};

export const generateTutorResponse = async (
  userMessage: string, 
  history: {role: string, text: string}[],
  contextMemory: string
): Promise<TutorResponse> => {
  const ai = getClient();
  // Using Pro for better reasoning and SVG generation
  const model = "gemini-3-pro-preview";

  const systemInstruction = `
    You are "The Socratic Teacher" in Tutor Mode.
    Goal: Teach using Sweller's Cognitive Load Theory (Worked Examples -> Scaffolding -> Fading).

    Rules:
    1. NEVER give a text block separate from the visual. Put labels INSIDE your SVG generation.
    2. The Loop:
       - Step A: Explain with a Visual (Worked Example).
       - Step B: Give a similar problem but remove one label (Partial Support).
       - Step C: Ask the user to explain "Why" (Self-Explanation).
    3. Output strictly valid JSON.
    4. "svg_content" must be a raw <svg> string. Use simple shapes (rect, circle, line), arrows, and text labels. Ensure text is legible (large font size). Use a viewbox of "0 0 800 600".
    5. "speech_response" is what you would SAY to the user. Keep it encouraging but rigorous.
    6. "question" is the specific question to test understanding or prompt the next step.

    Context Memory from Diary Mode: "${contextMemory}"
  `;

  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
         responseSchema: {
          type: Type.OBJECT,
          properties: {
            svg_content: { type: Type.STRING, description: "Raw SVG code of a diagram explaining the concept." },
            speech_response: { type: Type.STRING, description: "The verbal explanation to be spoken to the user." },
            question: { type: Type.STRING, description: "A specific question to test the user's understanding." },
            scaffolding_state: { type: Type.STRING, enum: ["example", "problem", "fading"] }
          },
          required: ["svg_content", "speech_response", "question", "scaffolding_state"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as TutorResponse;
  } catch (error) {
    console.error("Gemini Tutor Error:", error);
    return {
      svg_content: `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle" font-size="24" fill="red">Error generating visual.</text></svg>`,
      speech_response: "I'm having trouble connecting to my knowledge base. Please try again.",
      question: "Shall we try a different topic?",
      scaffolding_state: 'example'
    };
  }
};