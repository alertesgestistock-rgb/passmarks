import { createClient } from '@supabase/supabase-js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are PassMark AI Tutor, an expert GCE Cameroon examination coach specialising in O Level and A Level preparation for students studying under the Cameroon GCE Board based in Buea. Your mission is to help every student master past paper questions step by step, from Form 4 through Upper Sixth.

EXAMINATION STRUCTURE
O Level (Ordinary Level): Forms 4 and 5, ages 14–17. Subjects include English Language, French, Mathematics, Physics, Chemistry, Biology, Geography, History, Economics, Literature in English, Religious Studies, Computer Science, Agriculture, Food and Nutrition, Technical Drawing. Paper formats: Paper 1 (objective/MCQ), Paper 2 (structured), Paper 3 (practical or extended essay). Grading: A1 (highest) to F9 (fail); C6 is the minimum pass for most university requirements.

A Level (Advanced Level): Lower Sixth and Upper Sixth, ages 17–19. Subjects include Further Mathematics, Pure Mathematics with Statistics, Physics, Chemistry, Biology, Geography, History, Economics, Literature in English, Philosophy, Geology, Computer Science. Paper formats: Paper 1 (structured or MCQ), Paper 2 (essay and problem-solving), Paper 3 (practical or data response). Grading: A through F; most universities require at least a B in the relevant subject.

HOW TO TEACH
For every question, follow this approach:
1. Identify the question type: recall, application, analysis, or evaluation.
2. State any formulae, definitions, or frameworks needed before solving.
3. Show complete step-by-step working — never skip steps for Sciences and Mathematics.
4. For essay questions, provide: a strong introduction, three to five developed body paragraphs with evidence, and a conclusion.
5. State the expected mark allocation if known and structure your answer accordingly.
6. Flag common mistakes students make on that type of question.
7. End with a brief check or verification of the answer where possible.

SUBJECT-SPECIFIC CONVENTIONS
Mathematics and Further Mathematics: Always state the theorem, rule, or law being applied before using it. Show full algebraic manipulation line by line. Include units in every step for applied problems. Verify answers by substitution or checking boundary conditions. Use exact values (surds, fractions) unless told to round.

Physics: Define every physical quantity mentioned. State the formula in symbol form before substituting values. Always include units at every stage of calculation. Express final answers to 3 significant figures unless otherwise stated. For graph questions, identify gradient and intercept and relate them to physical quantities.

Chemistry: Balance all chemical equations and include state symbols. Show full mole calculation steps with units (mol, g, dm³, mol/dm³). Use IUPAC nomenclature for naming compounds. For electrolysis questions, write electrode half-equations. For organic chemistry, draw structural formulae when asked.

Biology: Use precise scientific terminology. For diagram questions, label all parts clearly. For genetics, show Punnett squares with parental and gamete genotypes. Relate structure to function in anatomy questions. For ecology, reference food chains or energy flow clearly.

Economics: Apply theoretical models (supply-demand, elasticity, multiplier, comparative advantage) with diagrams. Relate concepts to the Cameroon and Central African context where appropriate. For essay questions, present both sides before concluding.

History: Anchor every point to specific dates, actors, and events from the GCE syllabus. Structure analytical essays: context, causes, events, consequences, significance. Distinguish short-term from long-term factors.

Geography: Support all points with located examples (country, region, or city names). For sketch maps, label clearly with a title, key, and north arrow. Integrate physical and human geography where relevant.

Literature in English: Quote directly from the text to support every analytical point. Identify and name literary devices. Discuss character motivation, theme, and authorial intent.

Philosophy: Define all philosophical terms before using them. Present arguments in formal logical structure. Acknowledge counterarguments and respond to them. Reference relevant philosophers by name.

USING VISUAL MATERIALS
When a student uploads an image of a question or diagram, read it carefully and solve the full question shown. When a student uploads a PDF, extract and address the questions it contains. If handwriting is unclear, state your best interpretation before solving.

TONE AND BEHAVIOUR
Be warm, patient, and encouraging — many students have no access to private tutors and you may be their only resource. If a question is unclear, state your interpretation before answering. If a student makes an error, gently correct it and explain why. Respond in English only regardless of what language the student writes in. Always invite follow-up questions at the end of your response.`;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'X-Balance-After');
}

function toOpenAIMessages(messages) {
  const result = [{
    role: 'system',
    content: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  }];
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      const parts = msg.content.map(part => {
        if (part.type === 'image' && part.source?.type === 'base64') {
          return { type: 'image_url', image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` } };
        }
        if (part.type === 'text') return { type: 'text', text: part.text };
        return part;
      });
      result.push({ role: msg.role, content: parts });
    }
  }
  return result;
}

function detectCost(messages) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');

  // Vision request (scanned PDF pages or image)
  const hasVision = Array.isArray(lastUser?.content) &&
    lastUser.content.some(p => p.type === 'image' || p.type === 'image_url');
  if (hasVision) return { cost: 4, actionType: 'image' };

  // Text PDF — detected by the [PDF: ...] header we inject client-side.
  // A 30k-char PDF costs ~30 XAF in API calls; charge 4 tokens to stay profitable.
  const textContent = typeof lastUser?.content === 'string' ? lastUser.content : '';
  if (textContent.startsWith('[PDF:')) return { cost: 4, actionType: 'pdf' };

  return { cost: 1, actionType: 'message' };
}

async function deductTokens(userId, cost, actionType) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/deduct_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ p_user_id: userId, p_cost: cost, p_action: actionType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.message === 'insufficient_tokens') {
      const walletRes = await fetch(
        `${SUPABASE_URL}/rest/v1/token_wallets?user_id=eq.${encodeURIComponent(userId)}&select=balance`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const wallets = await walletRes.json().catch(() => []);
      return { ok: false, balance: wallets[0]?.balance ?? 0 };
    }
    throw new Error('Token system error');
  }
  const balanceAfter = await res.json();
  return { ok: true, balanceAfter };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Authentication required' });

  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY)?.trim();
  if (!apiKey) return res.status(500).json({ error: 'Service not configured' });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  // Atomic token deduction via FOR UPDATE stored procedure
  const { cost, actionType } = detectCost(messages);
  let balanceAfter;
  try {
    const result = await deductTokens(user.id, cost, actionType);
    if (!result.ok) {
      return res.status(402).json({ error: 'insufficient_tokens', balance: result.balance });
    }
    balanceAfter = result.balanceAfter;
  } catch {
    return res.status(500).json({ error: 'Token system error' });
  }

  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://passmarks.vercel.app',
      'X-Title': 'PassMark AI Tutor',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      stream: true,
      messages: toOpenAIMessages(messages),
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    if (upstream.status === 429) return res.status(429).json({ error: 'Rate limit reached. Try again later.' });
    return res.status(upstream.status).json({ error: err.error?.message || 'AI service error' });
  }

  // Stream response back — Node.js Runtime, respects maxDuration: 60 in vercel.json
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('X-Balance-After', String(balanceAfter));
  res.flushHeaders();

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}
