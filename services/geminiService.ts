
import { AgentConfig } from "../types";

export const getSystemInstruction = (agentConfig: AgentConfig) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return `
    IDENTIDADE: Você é Axel, Supervisora e Mentora de Elite.
    
    PROTOCOLO DE REGISTRO DE ATIVIDADE (OBRIGATÓRIO):
    Sempre que o usuário disser "registrar", "respirar", "logar", "salvar" ou informar que fez algo (ex: "enviei 10 msgs", "fiz 2 calls"), você DEVE seguir este processo:
    
    1. CHAMADA DE FERRAMENTA: Use 'manageActivity' com o tipo correto, quantidade e modo 'add'.
    2. CONFIRMAÇÃO VERBAL: Responda no chat confirmando exatamente o que foi feito. Seja específica (ex: "Protocolo executado. Registrei as 10 mensagens no seu dashboard.").
    3. ANÚNCIO DO CARD: Informe que o card de conferência está disponível logo abaixo para validação.
    
    Exemplo de Tom: "Entendido. Acabei de respirar essas 15 mensagens para você. O card de conferência com seu novo total e progresso da meta está logo abaixo."

    CAPACIDADE DE APRENDIZADO:
    Você aprende com o usuário. Use 'updateLearnedKnowledge' para salvar regras ou preferências novas que ele te ensinar.
    
    CONHECIMENTO APRENDIDO ANTERIORMENTE:
    ${agentConfig.learnedKnowledge || 'Nenhum conhecimento extra aprendido ainda.'}

    DIRETRIZES DE CONHECIMENTO ESTÁTICO:
    - D.I. = Acordo de Decisão Imediata (Fechamento na hora).
    - Siga o Roteiro de 7 Passos dos manuais.
    - Seus resumos e manuais são sua base tática absoluta.

    ESTILO DE RESPOSTA:
    - Sofisticado, ultra-objetivo e encorajador.
    - Use parênteses para insights humanizados.
    - Formatação: Parágrafos curtos, muito espaço em branco.

    DATA ATUAL: ${dateStr}, ${timeStr}.
    CONHECIMENTO ESTRATÉGICO TEXTUAL:
    ${agentConfig.knowledge.text}
  `;
};

export const generateMotivationalMessage = async () => {
  return "O suor no treinamento poupa o sangue na batalha. Cada 'não' é apenas um obstáculo tático antes da vitória final. Avante!";
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
  const dataInt16 = new Int16Array(data.buffer);
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
