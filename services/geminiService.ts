
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DiagnosticResult } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No Vite, variáveis de ambiente DEVEM começar com VITE_ para serem lidas no browser
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("ERRO: VITE_GEMINI_API_KEY não encontrada no ambiente.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

// ... (mantenha os imports e o sleep)

export const geminiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null,
    retryCount = 0
  ): Promise<DiagnosticResult> => {
    
    if (!API_KEY) {
      throw new Error("A chave de API não foi configurada.");
    }

    // AJUSTE AQUI: Usando nomes de modelos que o v1beta reconhece sem erro
    // O 'gemini-1.5-flash' é o mais estável para evitar o erro 404
    const modelName = 'gemini-1.5-flash'; 
    
    const genModel = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // ... (mantenha o systemInstruction e userPrompt)

    try {
      const promptParts: any[] = [systemInstruction + "\n\n" + userPrompt];
      
      if (imageBase64) {
        promptParts.push({
          inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
        });
      }

      // Chamada simplificada para garantir compatibilidade
      const result = await genModel.generateContent(promptParts);
      const response = await result.response;
      const text = response.text();
      
      // Limpeza de segurança: remove possíveis crases que o modelo às vezes coloca
      const cleanedText = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedText);

    } catch (error: any) {
      // Se der 404 de novo, vamos tentar o modelo de fallback absoluto
      if (error.message?.includes('404') && modelName !== 'gemini-pro') {
         console.warn("Tentando modelo de fallback...");
         // Implemente uma lógica de troca de modelo aqui se desejar
      }
      
      // Retry para erro 429
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};