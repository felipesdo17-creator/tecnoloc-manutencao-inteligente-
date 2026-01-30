
import { DiagnosticResult } from "../types";

// Em ambientes de sandbox e plataformas de visualização, a chave é injetada em process.env.API_KEY.
// Em um projeto Vite local, você usaria import.meta.env.VITE_GROQ_API_KEY.
const GROQ_API_KEY = process.env.API_KEY;

export const aiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null
  ): Promise<DiagnosticResult> => {
    
    if (!GROQ_API_KEY) {
      throw new Error("Chave de API não encontrada (process.env.API_KEY). Verifique as configurações do ambiente.");
    }

    const systemInstruction = `
      VOCÊ É O ENGENHEIRO CHEFE DE MANUTENÇÃO DA TECNOLOC.
      Sua missão é fornecer diagnósticos técnicos de alta precisão para equipamentos industriais.

      DADOS DISPONÍVEIS:
      1. MANUAL TÉCNICO: ${manualContent || "Não disponível (use conhecimento genérico)."}
      2. HISTÓRICO DE CAMPO: ${previousSolutions || "Sem histórico prévio."}

      DIRETRIZES:
      - Categoria da falha: ${equipmentInfo.category.toUpperCase()}.
      - Seja pragmático. Sugira passos acionáveis em canteiro de obras.
      - Se houver histórico de campo, priorize essas soluções.
      - O campo 'difficulty' deve ser: 'Fácil', 'Média' ou 'Difícil'.

      RETORNE APENAS UM JSON VÁLIDO:
      {
        "possible_causes": ["Causa 1", "Causa 2"],
        "solutions": [
          {
            "title": "Título da Solução",
            "steps": ["Passo 1", "Passo 2"],
            "difficulty": "Fácil|Média|Difícil"
          }
        ]
      }
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      DEFEITO RELATADO: "${equipmentInfo.defect}"
      ${imageBase64 ? "Nota: Há uma imagem anexada para suporte visual." : ""}
    `;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro na API do Groq.");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      return JSON.parse(content);
    } catch (error: any) {
      console.error("Erro no AI Service (Groq):", error);
      throw error;
    }
  }
};
