
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DiagnosticResult } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// No Vite, variáveis de ambiente DEVEM começar com VITE_ para serem lidas no browser
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("ERRO: VITE_GEMINI_API_KEY não encontrada no ambiente.");
}

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
      throw new Error("A chave de API não foi configurada. Verifique as Environment Variables na Vercel.");
    }

    // Modelos estáveis e recomendados para produção: 1.5 Pro e 1.5 Flash
    const modelName = retryCount > 0 ? 'gemini-1.5-flash' : 'gemini-1.5-pro';
    
    // Definição do Schema para garantir que o JSON venha no formato certo
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        possible_causes: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Lista de causas prováveis do defeito"
        },
        solutions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              difficulty: { type: SchemaType.STRING, enum: ["Fácil", "Média", "Difícil"] }
            },
            required: ["title", "steps", "difficulty"]
          }
        }
      },
      required: ["possible_causes", "solutions"]
    };

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const systemInstruction = `
      VOCÊ É UM ENGENHEIRO DE MANUTENÇÃO EXPERT DA TECNOLOC.
      ESPECIALIDADE: Defeitos do tipo ${equipmentInfo.category.toUpperCase()}.
      
      TAREFA: Forneça um diagnóstico técnico focado em falhas ${equipmentInfo.category}. 
      Utilize o manual e a experiência de campo fornecida para sugerir soluções práticas.
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      RELATO DO DEFEITO: "${equipmentInfo.defect}"
      
      MANUAL: ${manualContent || "Não disponível."}
      EXPERIÊNCIA ANTERIOR: ${previousSolutions || "Sem registros."}
    `;

    try {
      const promptParts: any[] = [userPrompt];
      
      if (imageBase64) {
        promptParts.push({
          inlineData: { mimeType: 'image/jpeg', data: imageBase64 }
        });
      }

      // O SDK oficial usa generateContent e o método text() é uma função assíncrona
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + userPrompt }] }]
      });
      
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error: any) {
      // Retry para erro 429 (Limite de cota)
      if ((error.message?.includes('429') || error.status === 429) && retryCount < 3) {
        console.warn(`[Gemini] Limite atingido. Tentando novamente...`);
        await sleep(2000 * (retryCount + 1));
        return geminiService.analyzeEquipment(equipmentInfo, manualContent, previousSolutions, imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
};