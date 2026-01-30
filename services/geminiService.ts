
// Use correct import for Google GenAI SDK as per guidelines
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosticResult } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const geminiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null,
    retryCount = 0
  ): Promise<DiagnosticResult> => {
    
    // The API key must be obtained exclusively from process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // System instruction for the technical diagnostics persona at Tecnoloc
    const systemInstruction = `
      VOCÊ É UM ENGENHEIRO DE MANUTENÇÃO EXPERT DA TECNOLOC.
      ESPECIALIDADE: Defeitos do tipo ${equipmentInfo.category.toUpperCase()}.
      TAREFA: Forneça um diagnóstico técnico focado em falhas ${equipmentInfo.category}. 
      Utilize o manual e a experiência de campo para sugerir soluções práticas.
      Retorne obrigatoriamente um JSON válido seguindo a estrutura de DiagnosticResult.
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      RELATO DO DEFEITO: "${equipmentInfo.defect}"
      MANUAL: ${manualContent || "Não disponível."}
      EXPERIÊNCIA ANTERIOR: ${previousSolutions || "Sem registros."}
    `;

    try {
      const parts: any[] = [{ text: userPrompt }];
      
      if (imageBase64) {
        parts.push({
          inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
        });
      }

      // Use gemini-3-pro-preview for complex technical reasoning tasks.
      // Use ai.models.generateContent directly as per @google/genai guidelines.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              possible_causes: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              solutions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    steps: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING } 
                    },
                    difficulty: { 
                      type: Type.STRING,
                      description: "Nível de dificuldade: 'Fácil', 'Média' ou 'Difícil'"
                    }
                  },
                  required: ["title", "steps", "difficulty"],
                  propertyOrdering: ["title", "steps", "difficulty"]
                }
              }
            },
            required: ["possible_causes", "solutions"],
            propertyOrdering: ["possible_causes", "solutions"]
          }
        },
      });

      // Extract text output from response.text property directly
      const text = response.text;
      if (!text) throw new Error("O modelo não retornou conteúdo.");
      
      return JSON.parse(text.trim());

    } catch (error: any) {
      // Exponential backoff retry logic for 429 (Rate Limit) errors
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};
