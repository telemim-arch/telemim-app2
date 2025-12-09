
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeRoute = async (origin: string, destination: string, stops: string[] = []): Promise<any> => {
  try {
    const prompt = `
      Atue como um especialista em logística de mudanças urbanas.
      Analise a seguinte rota:
      Origem: ${origin}
      Destino: ${destination}
      Paradas Intermediárias: ${stops.join(', ') || 'Nenhuma'}

      Forneça uma estimativa logística simulada considerando trânsito urbano médio.
      Retorne APENAS um objeto JSON com os seguintes campos:
      - distance (string, ex: "15 km")
      - duration (string, ex: "45 min")
      - pathDescription (string, resumo curto da rota)
      - suggestion (string, dica para o motorista)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            distance: { type: Type.STRING },
            duration: { type: Type.STRING },
            pathDescription: { type: Type.STRING },
            suggestion: { type: Type.STRING }
          }
        }
      }
    });

    let text = response.text || '{}';
    // Clean potential markdown code blocks
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Route Error:", error);
    return {
      distance: "N/A",
      duration: "N/A",
      pathDescription: "Erro ao calcular rota via IA.",
      suggestion: "Verifique conexão."
    };
  }
};

export const generateReportSummary = async (data: any): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analise estes dados de mudanças recentes e gere um resumo executivo curto (máx 3 linhas) focado em eficiência e custos: ${JSON.stringify(data)}`
    });
    return response.text || "Sem dados para análise.";
  } catch (error) {
    return "Não foi possível gerar o resumo inteligente no momento.";
  }
};
