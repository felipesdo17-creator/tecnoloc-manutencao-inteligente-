import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DiagnosticResult } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

export const geminiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null,
    retryCount = 0
  ): Promise<DiagnosticResult> => {
    
    if (!API_KEY) {
      throw new Error("Chave VITE_GEMINI_API_KEY não configurada.");
    }

    // 1. Definir as instruções PRIMEIRO
    const systemInstruction = `
      VOCÊ É UM ENGENHEIRO DE MANUTENÇÃO EXPERT DA TECNOLOC.
      ESPECIALIDADE: Defeitos do tipo ${equipmentInfo.category.toUpperCase()}.
      TAREFA: Forneça um diagnóstico técnico focado em falhas ${equipmentInfo.category}. 
      Utilize o manual e a experiência de campo para sugerir soluções práticas.
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      RELATO DO DEFEITO: "${equipmentInfo.defect}"
      MANUAL: ${manualContent || "Não disponível."}
      EXPERIÊNCIA ANTERIOR: ${previousSolutions || "Sem registros."}
    `;

    // 2. Configurar o Modelo
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    try {
      const promptParts: any[] = [systemInstruction + "\n\n" + userPrompt];
      
      if (imageBase64) {
        promptParts.push({
          inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
        });
      }

      // 3. Chamar a API
      const result = await model.generateContent(promptParts);
      const response = await result.response;
      const text = response.text();
      
      // Limpeza de segurança para evitar erro de JSON
      const cleanedText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);

    } catch (error: any) {
      // Retry para erro de limite (429)
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        console.warn(`[Gemini] Limite atingido, tentando novamente...`);
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};