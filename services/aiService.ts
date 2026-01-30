
import { DiagnosticResult } from "../types";

// Prioridade absoluta para process.env.API_KEY conforme diretrizes do ambiente
const GROQ_API_KEY = (process.env as any).API_KEY || (import.meta as any).env?.VITE_GROQ_API_KEY;

/**
 * Função utilitária para normalizar a resposta da IA.
 * Mapeia sinônimos e garante que a estrutura DiagnosticResult seja respeitada.
 */
function sanitizeResult(data: any): DiagnosticResult {
  const result: DiagnosticResult = {
    possible_causes: [],
    solutions: []
  };

  if (!data || typeof data !== 'object') return result;

  const keys = Object.keys(data);
  
  // 1. Localizar Causas (Sinônimos: possible_causes, causas, diagnostico, causes, motivos)
  const causesKey = keys.find(k => 
    /cause|causa|diagnostico|motivo|origem/i.test(k)
  );
  if (causesKey) {
    const rawCauses = data[causesKey];
    result.possible_causes = Array.isArray(rawCauses) ? rawCauses : [String(rawCauses)];
  }

  // 2. Localizar Soluções (Sinônimos: solutions, solucoes, plano_acao, remedios, steps)
  const solutionsKey = keys.find(k => 
    /solu|remedio|plano|acao|action|steps/i.test(k)
  );
  
  if (solutionsKey) {
    const rawSolutions = Array.isArray(data[solutionsKey]) ? data[solutionsKey] : [data[solutionsKey]];
    
    result.solutions = rawSolutions.map((s: any) => {
      // Se a solução for apenas uma string, convertemos para o objeto esperado
      if (typeof s === 'string') {
        return { title: 'Ação Recomendada', steps: [s], difficulty: 'Média' as const };
      }

      // Se for um objeto, mapeamos os campos internos
      const sKeys = Object.keys(s);
      const tKey = sKeys.find(k => /tit|nome|sub|desc/i.test(k)) || 'title';
      const stKey = sKeys.find(k => /step|passo|acao|procedimento/i.test(k)) || 'steps';
      const dKey = sKeys.find(k => /diff|dificuldade|nivel|complex/i.test(k)) || 'difficulty';

      let difficulty: 'Fácil' | 'Média' | 'Difícil' = 'Média';
      const rawDiff = String(s[dKey] || '').toLowerCase();
      if (rawDiff.includes('fácil') || rawDiff.includes('easy') || rawDiff.includes('facil')) difficulty = 'Fácil';
      if (rawDiff.includes('difícil') || rawDiff.includes('hard') || rawDiff.includes('dificil')) difficulty = 'Difícil';

      return {
        title: s[tKey] || 'Solução Técnica',
        steps: Array.isArray(s[stKey]) ? s[stKey] : [String(s[stKey] || 'Verificar componente')],
        difficulty
      };
    });
  }

  // Fallback caso a lista de soluções esteja vazia mas existam causas
  if (result.solutions.length === 0 && result.possible_causes.length > 0) {
    result.solutions = [{
      title: "Verificação Geral",
      steps: ["Realizar inspeção visual nos pontos indicados nas causas."],
      difficulty: "Fácil"
    }];
  }

  return result;
}

export const aiService = {
  analyzeEquipment: async (
    equipmentInfo: { name: string; brand: string; model: string; defect: string; category: string },
    manualContent: string | null,
    previousSolutions: string | null,
    imageBase64: string | null
  ): Promise<DiagnosticResult> => {
    
    if (!GROQ_API_KEY) {
      throw new Error("Chave de API não configurada (API_KEY). Verifique o ambiente.");
    }

    // Llama 3.2 Vision para imagens, Llama 3.3 Versatile para texto puro
    const model = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

    const systemInstruction = `VOCÊ É O ENGENHEIRO CHEFE DE MANUTENÇÃO DA TECNOLOC.
Forneça diagnósticos técnicos de alta precisão para equipamentos de frota.
CONTEÚDO DO MANUAL: ${manualContent || "Use conhecimento técnico padrão"}.
EXPERIÊNCIA DE CAMPO: ${previousSolutions || "Nenhum histórico específico registrado"}.

REGRAS:
1. Categoria: ${equipmentInfo.category.toUpperCase()}.
2. Seja direto e técnico.
3. Use o campo 'difficulty' apenas como 'Fácil', 'Média' ou 'Difícil'.
4. RESPONDA APENAS EM JSON VÁLIDO.`;

    const userPrompt = `EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
DEFEITO: "${equipmentInfo.defect}"
Analise os sintomas e forneça causas e soluções.`;

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
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro na API do Groq");
      }

      const data = await response.json();
      const rawContent = JSON.parse(data.choices[0].message.content);
      
      // Higieniza e normaliza o objeto antes de retornar ao componente
      return sanitizeResult(rawContent);
      
    } catch (error: any) {
      console.error("Erro no Processamento IA:", error);
      throw error;
    }
  }
};
