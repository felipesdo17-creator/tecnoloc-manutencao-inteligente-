
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
    // A chave deve ser obtida exclusivamente de process.env.API_KEY conforme diretrizes do SDK
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("A chave de API do Gemini não foi configurada no ambiente (process.env.API_KEY).");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Modelos atualizados conforme diretrizes (Série Gemini 3)
    // Usamos o Pro para a primeira tentativa (maior raciocínio) e Flash se precisar de retry rápido
    const modelName = retryCount > 0 ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';

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
      // Tratamento de erro 429 (Rate Limit) com Exponential Backoff
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        console.warn(`[Gemini] Limite de cota atingido. Tentando novamente em breve...`);
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};
