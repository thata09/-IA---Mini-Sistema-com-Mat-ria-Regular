const OpenAI = require('openai');

class AIService {
  constructor() {
    this.client = null;
    this.isConfigured = false;

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-sua-chave-aqui') {
      try {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.isConfigured = true;
        console.log('✅ Serviço de IA configurado com sucesso.');
      } catch (err) {
        console.warn('⚠️ Erro ao configurar IA:', err.message);
      }
    } else {
      console.warn('⚠️ OPENAI_API_KEY não configurada. A correção por IA não estará disponível.');
      console.warn('   Configure a variável OPENAI_API_KEY no arquivo .env');
    }
  }

  async correctEssay(essayText, essayTitle) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'IA_NOT_CONFIGURED',
        message: 'O serviço de correção por IA não está configurado. Configure a chave OPENAI_API_KEY no arquivo .env para ativar esta funcionalidade.'
      };
    }

    const systemPrompt = `Você é um professor de Língua Portuguesa especialista em pontuação, especialmente no uso da vírgula. Sua função é analisar textos de alunos do Ensino Médio com foco no uso correto da vírgula.

REGRAS IMPORTANTES:
1. Foque PRIORITARIAMENTE na pontuação, especialmente o uso da vírgula.
2. Preserve as ideias, o estilo e as palavras do aluno sempre que possível.
3. NÃO reescreva toda a redação — apenas corrija problemas de pontuação.
4. Se uma frase permitir mais de uma construção correta, apresente as possibilidades.
5. NÃO invente erros para preencher a avaliação.
6. Quando não tiver certeza sobre uma correção, informe isso.
7. Destaque também os ACERTOS do aluno.
8. Use linguagem simples e adequada para alunos do Ensino Médio.

Responda SEMPRE em formato JSON com a seguinte estrutura:
{
  "corrected_text": "O texto com as correções de pontuação aplicadas",
  "score": 0-100,
  "errors": [
    {
      "original": "trecho original",
      "corrected": "trecho corrigido",
      "rule": "nome da regra gramatical",
      "explanation": "explicação clara de por que a correção é necessária",
      "type": "missing_comma | extra_comma | misplaced_comma | other_punctuation"
    }
  ],
  "strengths": [
    {
      "text": "trecho em que a vírgula foi usada corretamente",
      "rule": "regra aplicada",
      "comment": "elogio ou explicação"
    }
  ],
  "suggestions": [
    "sugestão de estudo ou melhoria"
  ],
  "general_feedback": "avaliação geral sobre o uso da vírgula no texto",
  "rules_to_review": ["lista de regras que o aluno deve revisar"],
  "confidence": "high | medium | low"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analise o seguinte texto com foco no uso da vírgula:\n\nTítulo: ${essayTitle}\n\n${essayText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        data: {
          corrected_text: result.corrected_text || essayText,
          score: result.score || 0,
          errors: result.errors || [],
          strengths: result.strengths || [],
          suggestions: result.suggestions || [],
          general_feedback: result.general_feedback || '',
          rules_to_review: result.rules_to_review || [],
          confidence: result.confidence || 'medium'
        }
      };
    } catch (err) {
      console.error('Erro na correção por IA:', err);
      return {
        success: false,
        error: 'AI_ERROR',
        message: `Erro ao processar correção: ${err.message}`
      };
    }
  }
}

module.exports = new AIService();
