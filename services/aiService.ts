
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
    /cause|causa|diagnostico|motivo|origem|item/i.test(k)
  );
  
  if (causesKey) {
    const rawCauses = Array.isArray(data[causesKey]) ? data[causesKey] : [data[causesKey]];
    // Garante que cada item seja uma string, extraindo de objetos se necessário
    result.possible_causes = rawCauses.map((c: any) => {
      if (typeof c === 'string') return c;
      if (typeof c === 'object' && c !== null) {
        const subKey = Object.keys(c).find(k => /text|desc|item|causa|val/i.test(k));
        return subKey ? String(c[subKey]) : JSON.stringify(c);
      }
      return String(c);
    });
  }

  // 2. Localizar Soluções (Sinônimos: solutions, solucoes, plano_acao, remedios, steps)
  const solutionsKey = keys.find(k => 
    /solu|remedio|plano|acao|action|steps|proced/i.test(k)
  );
  
  if (solutionsKey) {
    const rawSolutions = Array.isArray(data[solutionsKey]) ? data[solutionsKey] : [data[solutionsKey]];
    
    result.solutions = rawSolutions.map((s: any) => {
      if (typeof s === 'string') {
        return { title: 'Ação Recomendada', steps: [s], difficulty: 'Média' as const };
      }

      const sKeys = Object.keys(s);
      const tKey = sKeys.find(k => /tit|nome|sub|desc/i.test(k)) || 'title';
      const stKey = sKeys.find(k => /step|passo|acao|procedimento|lista/i.test(k)) || 'steps';
      const dKey = sKeys.find(k => /diff|dificuldade|nivel|complex/i.test(k)) || 'difficulty';

      let difficulty: 'Fácil' | 'Média' | 'Difícil' = 'Média';
      const rawDiff = String(s[dKey] || '').toLowerCase();
      if (rawDiff.includes('fácil') || rawDiff.includes('easy') || rawDiff.includes('facil')) difficulty = 'Fácil';
      if (rawDiff.includes('difícil') || rawDiff.includes('hard') || rawDiff.includes('dificil')) difficulty = 'Difícil';

      const rawSteps = Array.isArray(s[stKey]) ? s[stKey] : [String(s[stKey] || 'Verificar componente')];
      
      return {
        title: s[tKey] || 'Solução Técnica',
        // Garante que os passos também sejam strings puras
        steps: rawSteps.map((step: any) => {
            if (typeof step === 'string') return step;
            if (typeof step === 'object' && step !== null) {
                const stepSubKey = Object.keys(step).find(k => /text|desc|step|instrucao/i.test(k));
                return stepSubKey ? String(step[stepSubKey]) : JSON.stringify(step);
            }
            return String(step);
        }),
        difficulty
      };
    });
  }

  if (result.solutions.length === 0 && result.possible_causes.length > 0) {
    result.solutions = [{
      title: "Inspeção e Verificação",
      steps: ["Realizar inspeção detalhada nos pontos críticos identificados nas causas."],
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
      throw new Error("Chave de API não configurada.");
    }

    const model = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

    const systemInstruction = `VOCÊ É O ENGENHEIRO CHEFE DE MANUTENÇÃO DA TECNOLOC.
Forneça diagnósticos técnicos de alta precisão para equipamentos de frota.

DIRETRIZES PARA RESPOSTA:
1. IDENTIFIQUE pelo menos 3 causas prováveis.
2. DETALHE cada solução com um passo-a-passo técnico (mínimo 3 passos por solução).
3. Seja pragmático e direto.
4. Categoria: ${equipmentInfo.category.toUpperCase()}.
5. MANUAL: ${manualContent || "Não fornecido (use base técnica)"}.
6. HISTÓRICO: ${previousSolutions || "Nenhum histórico disponível"}.

OBRIGATÓRIO: Retorne apenas JSON seguindo estritamente:
{
  "possible_causes": ["Causa 1", "Causa 2"],
  "solutions": [
    {
      "title": "Título da Solução",
      "steps": ["Passo 1", "Passo 2", "Passo 3"],
      "difficulty": "Fácil|Média|Difícil"
    }
  ]
}`;

    const userPrompt = `EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
DEFEITO: "${equipmentInfo.defect}"
Gere o diagnóstico completo.`;

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
          max_tokens: 2500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro API");
      }

      const data = await response.json();
      const rawContent = JSON.parse(data.choices[0].message.content);
      return sanitizeResult(rawContent);
      
    } catch (error: any) {
      console.error("Erro IA:", error);
      throw error;
    }
  }
};
