
import { DiagnosticResult } from "../types";

// No Vite/Vercel, usamos apenas o import.meta.env para evitar erros no navegador
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const aiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null
  ): Promise<DiagnosticResult> => {
    
    if (!GROQ_API_KEY) {
      throw new Error("Chave VITE_GROQ_API_KEY não configurada na Vercel.");
    }

    // Mudamos para um modelo que possui VISÃO, caso haja imagem
    const model = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

    const systemInstruction = `VOCÊ É O ENGENHEIRO CHEFE DE MANUTENÇÃO DA TECNOLOC.
Forneça diagnósticos técnicos de alta precisão. 
MANUAL: ${manualContent || "Use base técnica geral"}.
HISTÓRICO: ${previousSolutions || "Sem registros anteriores"}.
DIRETRIZES: Categoria ${equipmentInfo.category.toUpperCase()}. Priorize o histórico de campo.
Responda APENAS em JSON.`;

    const userPrompt = `EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
RELATO: "${equipmentInfo.defect}"`;

    // Prepara as mensagens (Texto + Imagem se houver)
    const messages: any[] = [
      { role: "system", content: systemInstruction },
      {
        role: "user",
        content: imageBase64 
          ? [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          : userPrompt
      }
    ];

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro no Groq");
      }

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
      
    } catch (error: any) {
      console.error("Erro no Diagnóstico Tecnoloc:", error);
      throw error;
    }
  }
};