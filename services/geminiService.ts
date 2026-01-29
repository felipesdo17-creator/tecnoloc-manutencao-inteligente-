
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosticResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null
  ): Promise<DiagnosticResult> => {
    // Defined system persona and core instructions separately as per latest recommendations
    const systemInstruction = `
      VOCÊ É UM ENGENHEIRO DE MANUTENÇÃO EXPERT DA TECNOLOC.
      ESPECIALIDADE ATUAL: Defeitos do tipo ${equipmentInfo.category.toUpperCase()}.
      
      TAREFA:
      Forneça um diagnóstico técnico focado em falhas ${equipmentInfo.category}. 
      Utilize tanto o manual quanto a "experiência de campo" fornecida para sugerir soluções que realmente funcionam no dia a dia, indo além do óbvio.
      Retorne obrigatoriamente um objeto JSON válido conforme o esquema de resposta solicitado.
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      RELATO DO DEFEITO: "${equipmentInfo.defect}"
      
      BASE DE CONHECIMENTO (MANUAL):
      ${manualContent || "Não disponível."}
      
      EXPERIÊNCIA DE CAMPO (CASOS ANTERIORES):
      ${previousSolutions || "Sem registros anteriores para este caso."}
    `;

    const contents: any[] = [{ text: userPrompt }];
    if (imageBase64) {
      contents.push({
        inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
      });
    }

    // Call generateContent with specified model and config containing systemInstruction
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possible_causes: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Lista de causas técnicas prováveis do defeito.'
            },
            solutions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Título curto da solução.' },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Passo a passo da execução.' },
                  difficulty: { type: Type.STRING, description: 'Nível: Fácil, Média ou Difícil.' }
                },
                required: ["title", "steps", "difficulty"],
                propertyOrdering: ["title", "steps", "difficulty"]
              },
              description: 'Sugestões de soluções técnicas detalhadas.'
            }
          },
          required: ["possible_causes", "solutions"]
        }
      }
    });

    // Access the .text property directly instead of calling it as a method
    const jsonStr = response.text || '{}';
    return JSON.parse(jsonStr);
  }
};
