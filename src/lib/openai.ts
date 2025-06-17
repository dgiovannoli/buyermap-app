import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable')
}

// Create OpenAI client instance
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper function to create chat completion
export async function createChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<OpenAI.Chat.ChatCompletionCreateParams>
) {
  const startTime = Date.now();
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      ...options,
    })
    const duration = Date.now() - startTime;
    const tokens = 'usage' in completion ? completion.usage?.total_tokens || 0 : 0;
    console.log(`[OpenAI] ${options?.model || 'gpt-4o-mini'}: ${duration}ms, ${tokens} tokens`);
    return completion
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

// Helper function to create embeddings
export async function createEmbedding(
  input: string | string[],
  options?: Partial<OpenAI.Embeddings.EmbeddingCreateParams>
) {
  try {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
      ...options,
    })
    return embedding
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}