
import { DiagnosticResult } from "../types";

// Prioriza process.env.API_KEY conforme diretrizes de segurança do ambiente
const GROQ_API_KEY = process.env.API_KEY || (import.meta as any).env?.VITE_GROQ_API_KEY;

export const aiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null
  ): Promise<DiagnosticResult> => {
    
    if (!GROQ_API_KEY) {
      throw new Error("Chave de API não configurada. Verifique as variáveis de ambiente.");
    }

    const systemInstruction = `
      VOCÊ É O ENGENHEIRO CHEFE DE MANUTENÇÃO DA TECNOLOC.
      Sua missão é fornecer diagnósticos técnicos de alta precisão para equipamentos industriais (geradores, torres, compressores).

      DADOS DE ENTRADA:
      - MANUAL TÉCNICO: ${manualContent || "Não disponível (use seu conhecimento de base)."}
      - HISTÓRICO DE CAMPO: ${previousSolutions || "Sem registros anteriores para este caso específico."}

      DIRETRIZES:
      - Categoria da falha: ${equipmentInfo.category.toUpperCase()}.
      - Seja pragmático: sugira passos que um técnico pode realizar no canteiro de obras.
      - Prioridade: Se houver histórico de campo, coloque essas soluções no topo.
      - Dificuldade: Use apenas 'Fácil', 'Média' ou 'Difícil'.

      RESPOSTA:
      Você DEVE retornar obrigatoriamente um objeto JSON com esta estrutura:
      {
        "possible_causes": ["Causa A", "Causa B"],
        "solutions": [
          {
            "title": "Título da Solução",
            "steps": ["Passo 1", "Passo 2"],
            "difficulty": "Fácil"
          }
        ]
      }
    `;

    const userPrompt = `
      EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
      RELATO DO TÉCNICO: "${equipmentInfo.defect}"
      ${imageBase64 ? "Nota: Há uma imagem anexada para análise visual." : ""}
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
          temperature: 0.1, // Temperatura baixa para maior consistência técnica
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro na comunicação com o Groq.");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      return JSON.parse(content);
    } catch (error: any) {
      console.error("Erro no Groq Service:", error);
      throw error;
    }
  }
};
