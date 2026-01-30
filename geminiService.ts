
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  generateQuestions: async (topic: string, description: string): Promise<Question[]> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 5 multiple-choice questions for an exam about "${topic}". 
        Context: ${description}. 
        Return an array of questions with text, options (exactly 4), and correctOptionIndex (0-3).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING } 
                },
                correctOptionIndex: { type: Type.INTEGER }
              },
              required: ["text", "options", "correctOptionIndex"]
            }
          }
        }
      });

      const text = response.text;
      const questions = JSON.parse(text);
      return questions.map((q: any, idx: number) => ({
        id: `ai-q-${Date.now()}-${idx}`,
        ...q
      }));
    } catch (error) {
      console.error("AI Generation error:", error);
      return [];
    }
  }
};
