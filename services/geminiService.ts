
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
    // Usando import.meta.env conforme solicitado
    const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });

    // Atualizado para os modelos 1.5 conforme solicitado pelo usuário
    const modelName = retryCount > 1 ? 'gemini-1.5-flash' : 'gemini-1.5-pro';

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

      const text = response.text || '{}';
      return JSON.parse(text.trim());
    } catch (error: any) {
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        console.warn(`[Gemini] Limite atingido. Tentativa ${retryCount + 1} de 3...`);
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};
