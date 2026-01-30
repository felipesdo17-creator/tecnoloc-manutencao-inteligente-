
import { DiagnosticResult } from "../types";

// Prioridade absoluta para process.env.API_KEY conforme diretrizes do ambiente
const GROQ_API_KEY = (process.env as any).API_KEY || (import.meta as any).env?.VITE_GROQ_API_KEY;

/**
 * Converte qualquer valor em uma string pura, extraindo conteúdo de objetos se necessário.
 * Evita o erro [object Object] no frontend.
 */
function forceString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    // Tenta encontrar chaves comuns que contenham o texto real
    const priorityKeys = ['text', 'description', 'desc', 'item', 'causa', 'valor', 'value', 'passo', 'step', 'instrucao'];
    for (const key of priorityKeys) {
      if (val[key] && typeof val[key] === 'string') return val[key];
    }
    // Se não encontrar chaves conhecidas, tenta pegar a primeira propriedade que seja string
    const firstStringKey = Object.keys(val).find(k => typeof val[k] === 'string');
    if (firstStringKey) return val[firstStringKey];
    
    // Fallback final
    return JSON.stringify(val);
  }
  return String(val);
}

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
    result.possible_causes = rawCauses.map(forceString).filter(s => s.trim() !== "");
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

      if (typeof s !== 'object' || s === null) {
        return { title: 'Solução Técnica', steps: [forceString(s)], difficulty: 'Média' as const };
      }

      const sKeys = Object.keys(s);
      const tKey = sKeys.find(k => /tit|nome|sub|desc/i.test(k)) || 'title';
      const stKey = sKeys.find(k => /step|passo|acao|procedimento|lista/i.test(k)) || 'steps';
      const dKey = sKeys.find(k => /diff|dificuldade|nivel|complex/i.test(k)) || 'difficulty';

      let difficulty: 'Fácil' | 'Média' | 'Difícil' = 'Média';
      const rawDiff = String(s[dKey] || '').toLowerCase();
      if (rawDiff.includes('fácil') || rawDiff.includes('easy') || rawDiff.includes('facil')) difficulty = 'Fácil';
      if (rawDiff.includes('difícil') || rawDiff.includes('hard') || rawDiff.includes('dificil')) difficulty = 'Difícil';

      const rawSteps = Array.isArray(s[stKey]) ? s[stKey] : [s[stKey]];
      
      return {
        title: forceString(s[tKey]) || 'Solução Técnica',
        steps: rawSteps.map(forceString).filter(step => step.trim() !== ""),
        difficulty
      };
    });
  }

  // Fallback de segurança
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

    // Atualizado para usar 11b-vision-preview para imagens e 70b-versatile para texto
    const model = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

    const systemInstruction = `VOCÊ É O ENGENHEIRO CHEFE DE MANUTENÇÃO DA TECNOLOC.
Forneça diagnósticos técnicos de alta precisão para equipamentos de frota industrial.

DIRETRIZES PARA RESPOSTA:
1. IDENTIFIQUE pelo menos 3 causas prováveis.
2. DETALHE cada solução com um plano de ação passo-a-passo (mínimo 3 passos por solução).
3. Seja pragmático, técnico e direto ao ponto.
4. Categoria: ${equipmentInfo.category.toUpperCase()}.
5. MANUAL TÉCNICO: ${manualContent || "Não fornecido (baseie-se em conhecimento de engenharia)"}.
6. HISTÓRICO DE CAMPO: ${previousSolutions || "Nenhum histórico disponível"}.

OBRIGATÓRIO: Responda EXCLUSIVAMENTE em formato JSON:
{
  "possible_causes": ["Causa 1", "Causa 2", "Causa 3"],
  "solutions": [
    {
      "title": "Título da Solução",
      "steps": ["Passo 1", "Passo 2", "Passo 3"],
      "difficulty": "Fácil|Média|Difícil"
    }
  ]
}`;

    const userPrompt = `EQUIPAMENTO: ${equipmentInfo.name} (${equipmentInfo.brand} ${equipmentInfo.model})
DEFEITO RELATADO: "${equipmentInfo.defect}"
Gere o diagnóstico técnico completo e o plano de ação.`;

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
        throw new Error(errorData.error?.message || "Erro de comunicação com a API de IA");
      }

      const data = await response.json();
      const rawContent = JSON.parse(data.choices[0].message.content);
      return sanitizeResult(rawContent);
      
    } catch (error: any) {
      console.error("Erro Crítico no Serviço de IA:", error);
      throw error;
    }
  }
};
