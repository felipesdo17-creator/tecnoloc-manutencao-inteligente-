
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosticResult } from "../types";

// Função auxiliar para esperar (delay)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const geminiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null,
    retryCount = 0
  ): Promise<DiagnosticResult> => {
    // Fixed: Always use process.env.API_KEY directly in a named parameter and avoid manual key management.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Use gemini-3-pro-preview for complex reasoning tasks.
    const modelName = retryCount > 1 ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';

    const systemInstruction = `
      VOCÊ É UM ENGENHEIRO DE MANUTENÇÃO EXPERT DA TECNOLOC.
      ESPECIALIDADE ATUAL: Defeitos do tipo ${equipmentInfo.category.toUpperCase()}.
      
      TAREFA:
      Forneça um diagnóstico técnico focado em falhas ${equipmentInfo.category}. 
      Utilize tanto o manual quanto a "experiência de campo" fornecida para sugerir soluções que realmente funcionam no dia a dia.
      Retorne obrigatoriamente um objeto JSON válido.
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      RELATO DO DEFEITO: "${equipmentInfo.defect}"
      
      BASE DE CONHECIMENTO (MANUAL):
      ${manualContent || "Não disponível."}
      
      EXPERIÊNCIA DE CAMPO (CASOS ANTERIORES):
      ${previousSolutions || "Sem registros anteriores para este caso."}
    `;

    try {
      const parts: any[] = [{ text: userPrompt }];
      if (imageBase64) {
        parts.push({
          inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
        });
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: parts },
        config: {
          systemInstruction: systemInstruction,
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
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    difficulty: { type: Type.STRING }
                  },
                  propertyOrdering: ["title", "steps", "difficulty"]
                }
              }
            },
            propertyOrdering: ["possible_causes", "solutions"]
          }
        }
      });

      // Fixed: Access response.text property directly (not a method).
      const text = response.text || '{}';
      return JSON.parse(text.trim());
    } catch (error: any) {
      // Handle quota limits (429) and other errors with retry logic.
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        console.warn(`[Gemini] Limite atingido. Tentativa ${retryCount + 1} de 3...`);
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};
