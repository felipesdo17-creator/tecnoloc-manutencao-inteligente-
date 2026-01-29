
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosticResult } from "../types";

const getApiKey = (): string => {
  try {
    return (process.env as any).API_KEY || localStorage.getItem('API_KEY') || '';
  } catch {
    return '';
  }
};

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
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Chave de API (Gemini) não configurada.");
    }

    // Se falhar 2 vezes com Pro, tenta com Flash que tem limites muito maiores
    const modelName = retryCount > 1 ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
    const ai = new GoogleGenAI({ apiKey });

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
      const contents: any[] = [{ text: userPrompt }];
      if (imageBase64) {
        contents.push({
          inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
        });
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: contents },
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
                  required: ["title", "steps", "difficulty"]
                }
              }
            },
            required: ["possible_causes", "solutions"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      // Se for erro de quota (429) e ainda não tentamos muito
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        console.warn(`[Gemini] Limite atingido. Tentativa ${retryCount + 1} de 3...`);
        await sleep(2000 * (retryCount + 1)); // Espera aumentada (Backoff)
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};
