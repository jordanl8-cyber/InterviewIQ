import OpenAI from 'openai';

let client: OpenAI | null = null;
let cerebras: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return client;
}

export function createChatCompletion(
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, 'model'>
) {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (apiKey) {
    cerebras ??= new OpenAI({ apiKey, baseURL: 'https://api.cerebras.ai/v1' });
    return cerebras.chat.completions.create({
      ...params,
      model: 'qwen-3.8-27b',
      reasoning_effort: 'none',
    });
  }
  return getOpenAI().chat.completions.create({ ...params, model: 'gpt-5.2' });
}
