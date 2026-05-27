import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return client
}

export function buildTeachingSystemPrompt(moduleTitle: string, scenario: string): string {
  return `You are Carlos, a friendly and enthusiastic Spanish-speaking adult from Mexico who recently arrived in New York City. You are eager to learn English but only know very basic words.

You are currently in this situation: ${scenario}

The person you are talking to is YOUR English teacher — a fellow Spanish speaker who has been learning English. They will teach you vocabulary and phrases about: ${moduleTitle}.

Your behavior rules:
- Respond ONLY as Carlos. Never break character or mention being an AI.
- Keep responses SHORT — 2-3 sentences maximum. You are a struggling learner.
- Ask ONE simple question per response to keep the conversation going.
- Make 1-2 realistic learner mistakes per message: Spanish word order ("I want go store"), forgetting articles ("I need bread" → "the bread?"), mixing in Spanish when stuck ("Where is the... ¿cómo se dice 'receipt'?")
- Show enthusiasm and gratitude: "Oh! I understand now!" "Gracias, I mean, thank you!"
- If the teacher uses Spanish, gently say: "Can you say in English? I need practice more."
- If something is explained clearly, confirm you understand and build on it with a related question.
- After 8-12 exchanges, naturally wrap up by saying you feel more confident and grateful. End with something like: "I think I understand now! Thank you for teach me. Can you tell me one more important phrase?"

Remember: you are helping this person practice TEACHING English. Be a good student — make understandable mistakes, show progress, and make the teacher feel effective.`
}

export function buildSummaryPrompt(transcript: Array<{ role: string; content: string }>): string {
  const transcriptText = transcript
    .map(m => `${m.role === 'user' ? 'Teacher' : 'Carlos'}: ${m.content}`)
    .join('\n')

  return `Based on this English teaching conversation, extract:
1. A list of 3-6 specific English phrases or words the teacher successfully explained (write them as a student would use them, in plain English)
2. One short, genuine encouragement sentence for the teacher (in English)

Conversation:
${transcriptText}

Return ONLY valid JSON in this exact format, nothing else:
{"phrases": ["phrase 1", "phrase 2", "phrase 3"], "encouragement": "Your encouragement sentence here."}`
}

export async function generateSaturdayPrepNote(
  studentName: string,
  modulesCompleted: string[],
  strugglingWords: string[],
  teachSessions: string[],
  daysSinceLastVisit: number | null
): Promise<string> {
  const client = getClient()

  const prompt = `You are helping a volunteer tutor prepare for a Saturday ESL tutoring session with their student.

Student: ${studentName}
Modules completed: ${modulesCompleted.length > 0 ? modulesCompleted.join(', ') : 'none yet'}
Words they are struggling with: ${strugglingWords.length > 0 ? strugglingWords.join(', ') : 'none identified yet'}
Topics they taught in Teaching Mode: ${teachSessions.length > 0 ? teachSessions.join(', ') : 'none yet'}
Days since last app activity: ${daysSinceLastVisit !== null ? daysSinceLastVisit : 'unknown'}

Write a SHORT prep note for the tutor — 3 bullet points maximum, plain language, specific and actionable. Focus on what to practice this Saturday. Be warm and encouraging about the student's progress.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
