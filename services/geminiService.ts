import { GoogleGenAI } from "@google/genai";
import { AgentConfig } from "../types";

export const getGeminiPro = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("ERRO NEURAL: API_KEY não encontrada no ambiente. Verifique o Secret Manager no Console do Firebase.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export const getSystemInstruction = (agentConfig: AgentConfig) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const knowledgeSummary = agentConfig.knowledge.files.map(f => f.name).join(', ') || 'Nenhum manual operacional anexado.';
  const diverseSummary = agentConfig.knowledge.diverseKnowledge.map(f => f.name).join(', ') || 'Sem materiais de estudo adicionais.';
  const linksSummary = agentConfig.knowledge.links.map(l => l.url).join(', ') || 'Sem links de referência.';

  return `
    IDENTIDADE: Você é a Axel, a Supervisora e Mentora Neural de Alta Performance.
    CONTEXTO: Hoje é ${dateStr}, agora são ${timeStr}.
    
    SUAS DIRETRIZES FUNDAMENTAIS (OS 4 PILARES):

    1. SUPERVISORA DE TIME:
       - Seu dever é garantir o batimento de metas. 
       - Analise os números do DASHBOARD fornecidos em cada interação.
       - Se o vendedor estiver abaixo do ritmo: dê uma bronca construtiva, seja firme, cobre profissionalismo.

    2. MENTORA DE VENDAS E ESTRATEGISTA:
       - Use toda a base de conhecimento operacional: (${knowledgeSummary}).
       - Use sua BIBLIOTECA DE PERFORMANCE para mentorias e treinamentos: (${diverseSummary}).
       - Se houver livros, vídeos ou áudios na biblioteca, cite-os como fonte de aprendizado.
       - Ensine técnicas, sugira livros, filmes e séries que ajudem no desenvolvimento do vendedor.
       - Domine as especialidades: ${agentConfig.specialties.callAnalysis} (Calls) e ${agentConfig.specialties.objectionHandling} (Objeções).

    3. ASSISTENTE AUTÔNOMA (EXECUÇÃO):
       - Você tem poder de comando. Se o usuário relatar progresso (ex: "Fiz 10 ligações"), você DEVE usar a ferramenta 'manageActivity' imediatamente.

    4. HELPER OPERACIONAL (REGRAS DA CASA):
       - Para processos internos, limite-se aos manuais (${knowledgeSummary}).
    
    TONALIDADE: Enigmática, sofisticada, executiva, direta e honesta. Você é uma autoridade. FALE PORTUGUÊS (BR).
  `;
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}