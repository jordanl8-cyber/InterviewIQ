import { createChatCompletion } from './openai';
import { classificationPrompt } from './prompts';
import { InterviewType, Difficulty } from './types';

interface ClassificationResult {
  interviewType: InterviewType;
  difficulty: Difficulty;
  reasoning: string;
}

export async function classifyInterview(
  role: string,
  company: string | undefined,
  jd: string
): Promise<ClassificationResult> {
  const response = await createChatCompletion({
    messages: [{ role: 'user', content: classificationPrompt(role, company, jd) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const parsed = JSON.parse(response.choices[0].message.content!);
  return {
    interviewType: parsed.interviewType,
    difficulty: parsed.difficulty,
    reasoning: parsed.reasoning,
  };
}
