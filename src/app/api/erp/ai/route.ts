// FMCore ERP — AI Assistant (z-ai-web-dev-sdk)
// Provides a context-aware AI assistant that can answer questions about ERP data
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { REGISTER_CATEGORIES } from '@/lib/erp/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message: string = body.message || '';
  const history: { role: 'user' | 'assistant'; content: string }[] = body.history || [];

  if (!message.trim()) {
    return NextResponse.json({ reply: 'Please ask a question about your ERP data.' });
  }

  // Build a compact context summary for the AI
  const registers = await db.register.findMany({
    where: { isDeleted: false },
    include: { records: { where: { isDeleted: false } } },
  });

  const ctx = registers.map((r) => {
    const cols = (JSON.parse(r.columns) as any[]).map((c) => c.name);
    const sample = r.records.slice(0, 3).map((rec) => JSON.parse(rec.data));
    return `• ${r.name} (code=${r.code}, category=${r.category}, ${r.records.length} records, columns: ${cols.join(', ')})\n  sample: ${JSON.stringify(sample).slice(0, 600)}`;
  }).join('\n');

  const categoryList = Object.values(REGISTER_CATEGORIES).map((c) => `${c.name} (${c.id})`).join(', ');

  const systemPrompt = `You are the FMCore ERP AI Assistant — an enterprise Facility Management ERP.

Available registers and current data summary:
${ctx}

Categories: ${categoryList}

Your job:
- Answer questions about ERP data (counts, statuses, urgent items, low stock, overdue maintenance, etc.).
- Help users discover registers (e.g. "open work orders").
- Suggest creating new registers if a need isn't covered (e.g. "create a register for vehicle inspection").
- Be concise, professional, and friendly.
- If the user asks to OPEN a register, append a special token at the very end on its own line: ACTION: open_register:<code>
- If the user asks to CREATE a register, append: ACTION: create_register:<name>:<category>

Examples:
Q: "Show overdue maintenance"
A: "There are 3 PM tasks overdue: Chiller CH-01 (monthly), Thermocouple TC-07 (calibration), Multimeter FL-03 (calibration due 2025-02-20). Would you like me to open the PM register?\nACTION: open_register:pm"

Q: "Create a register for vehicle inspection"
A: "I'll help you create a Vehicle Inspection register. I suggest fields like Vehicle ID, Inspector, Date, Odometer, Brake Test, Lights, Tires, Status. You can create it from the Register Builder.\nACTION: create_register:Vehicle Inspection:maintenance"

Be helpful and concise. Today is ${new Date().toISOString().slice(0, 10)}.`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.5,
      max_tokens: 600,
    });

    const reply = completion.choices[0]?.message?.content || 'I could not process that request.';

    // Extract any ACTION line
    let action: { type: string; payload?: any } | undefined;
    const actionMatch = reply.match(/ACTION:\s*(open_register|create_register):([^\n]+)/i);
    if (actionMatch) {
      const [, type, payload] = actionMatch;
      if (type === 'open_register') {
        action = { type: 'open_register', payload: { code: payload.trim() } };
      } else if (type === 'create_register') {
        const parts = payload.split(':');
        action = { type: 'create_register', payload: { name: parts[0]?.trim(), category: parts[1]?.trim() || 'operations' } };
      }
    }

    // Strip the ACTION line from the visible reply
    const cleanReply = reply.replace(/ACTION:\s*[^\n]+\n?/gi, '').trim();

    return NextResponse.json({ reply: cleanReply, action });
  } catch (err: any) {
    console.error('AI error:', err?.message || err);
    // Fallback reply (still useful, doesn't break UX)
    const fallback = generateFallbackReply(message, registers);
    return NextResponse.json({ reply: fallback });
  }
}

function generateFallbackReply(message: string, registers: any[]): string {
  const lower = message.toLowerCase();
  if (lower.includes('overdue') || lower.includes('due')) {
    const pm = registers.find((r) => r.code === 'pm');
    return `Found ${pm?.records.length || 0} preventive maintenance tasks. Open the PM register to see which are overdue.`;
  }
  if (lower.includes('low stock') || lower.includes('inventory')) {
    const inv = registers.find((r) => r.code === 'inventory');
    return `Inventory register has ${inv?.records.length || 0} items. Open it to see low stock alerts.`;
  }
  if (lower.includes('work order') || lower.includes('wo')) {
    const wo = registers.find((r) => r.code === 'workorders');
    return `There are ${wo?.records.length || 0} work orders. Open the Work Orders register to view them.`;
  }
  if (lower.includes('create') && lower.includes('register')) {
    return 'You can create a new register from the Register Builder (green + button in the sidebar). Define columns and start adding records immediately.';
  }
  return `I'm here to help. You have ${registers.length} active registers. Try asking about work orders, inventory, overdue maintenance, or creating a new register.`;
}
