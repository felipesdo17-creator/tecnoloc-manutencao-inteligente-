
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
    const prompt = `
      VOCÊ É UM ASSISTENTE TÉCNICO EXPERT DA TECNOLOC ESPECIALIZADO EM ${equipmentInfo.category.toUpperCase()}.
      
      CONTEXTO DO EQUIPAMENTO:
      - Nome: ${equipmentInfo.name}
      - Marca: ${equipmentInfo.brand}
      - Modelo: ${equipmentInfo.model}
      - Categoria de Defeito: ${equipmentInfo.category} (Foque a análise técnica nesta área)
      
      PROBLEMA RELATADO:
      "${equipmentInfo.defect}"
      
      BASE DE CONHECIMENTO (MANUAL):
      ${manualContent || "Não há manual disponível para este modelo específico."}
      
      HISTÓRICO DE CASOS SIMILARES NA TECNOLOC:
      ${previousSolutions || "Sem histórico prévio disponível."}
      
      SUA TAREFA:
      Analise os dados técnicos, a categoria de erro e forneça um diagnóstico estruturado.
      Se for ELÉTRICO, considere sensores, fiação, baterias e módulos.
      Se for MECÂNICO, considere hidráulica, motor, engrenagens e vedações.
      Sempre leve em conta a experiência de casos anteriores da Tecnoloc para sugerir soluções práticas além do que está no manual.
    `;

    const contents: any[] = [{ text: prompt }];
    if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possible_causes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de causas prováveis focada em " + equipmentInfo.category
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
                    description: "Fácil, Média ou Difícil"
                  }
                },
                required: ["title", "steps", "difficulty"]
              }
            }
          },
          required: ["possible_causes", "solutions"]
        }
      }
    });

    try {
      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (e) {
      throw new Error("Falha ao processar resposta da IA: " + e);
    }
  }
};
