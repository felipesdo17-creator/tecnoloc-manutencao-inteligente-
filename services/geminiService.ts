import { GoogleGenerativeAI } from "@google/generative-ai";
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

    // INSTRUÇÕES DO SISTEMA
    const systemInstruction = `
      VOCÊ É UM ENGENHEIRO DE MANUTENÇÃO EXPERT DA TECNOLOC.
      ESPECIALIDADE: Defeitos do tipo ${equipmentInfo.category.toUpperCase()}.
      TAREFA: Forneça um diagnóstico técnico focado em falhas ${equipmentInfo.category}. 
      Utilize o manual e a experiência de campo para sugerir soluções práticas.
      Retorne obrigatoriamente um JSON válido.
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      RELATO DO DEFEITO: "${equipmentInfo.defect}"
      MANUAL: ${manualContent || "Não disponível."}
      EXPERIÊNCIA ANTERIOR: ${previousSolutions || "Sem registros."}
    `;

    // AJUSTE DO MODELO: Usando o sufixo '-latest' para garantir que o endpoint v1beta encontre o recurso
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest", 
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

      const result = await model.generateContent(promptParts);
      const response = await result.response;
      const text = response.text();
      
      const cleanedText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);

    } catch (error: any) {
      // Se persistir o 404, tentamos o fallback para o modelo 'gemini-pro' original
      if (error.message?.includes('404') && retryCount < 1) {
        console.warn("Modelo flash não encontrado, tentando gemini-pro...");
        // Lógica interna de fallback pode ser disparada aqui
      }

      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};