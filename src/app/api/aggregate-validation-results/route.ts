import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function filterRelevantQuotes(quotes: any[], assumption: string) {
  // Simple relevance filter: you can replace with your advanced logic
  return quotes
    .filter(q => q.text && q.text.length > 20 && assumption && q.text.toLowerCase().includes(assumption.split(' ')[0].toLowerCase()))
    .slice(0, 10);
}

function buildSynthesisPrompt(assumption: string, quotes: any[]) {
  return `
You are a business analyst. Synthesize the following interview quotes to validate or challenge the assumption below.

ASSUMPTION: "${assumption}"

QUOTES:
${quotes.map((q, i) => `${i + 1}. "${q.text}" - ${q.speaker || 'Unknown'} (${q.role || 'Unknown role'})`).join('\n')}

CRITICAL RULES:
- ONLY use information from the provided quotes.
- Do NOT mention any roles or categories unless they appear in the quotes.
- Be strict: only 'Validated' if the evidence is explicit.

Provide a concise, actionable summary for product marketing.
`;
}

function calculateConfidence(quotes: any[]) {
  // Simple: 10 points per unique speaker, capped at 100
  const uniqueSpeakers = new Set(quotes.map(q => q.speaker || 'Unknown'));
  return Math.min(100, uniqueSpeakers.size * 10);
}

function determineValidationLabel(synthesis: string, quotes: any[]) {
  if (quotes.length === 0) return 'Insufficient Data';
  if (/contradict|challenge|conflict/i.test(synthesis)) return 'Contradicted';
  if (/validate|confirm|support/i.test(synthesis)) return 'Validated';
  return 'Gap Identified';
}

export async function POST(req: NextRequest) {
  try {
    const { assumption, quotes } = await req.json();

    const relevantQuotes = filterRelevantQuotes(quotes, assumption);
    const prompt = buildSynthesisPrompt(assumption, relevantQuotes);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      max_tokens: 300,
      temperature: 0.2,
    });

    const synthesis = completion.choices[0]?.message?.content?.trim() || '';
    const confidence = calculateConfidence(relevantQuotes);
    const label = determineValidationLabel(synthesis, relevantQuotes);

    return NextResponse.json({
      keyFinding: synthesis,
      label,
      confidence,
      supportingQuotes: relevantQuotes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
} 