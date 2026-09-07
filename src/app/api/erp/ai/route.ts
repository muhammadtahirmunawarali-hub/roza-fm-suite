// FMCore ERP — AI Assistant (z-ai-web-dev-sdk)
// Context-aware AI with CRUD actions: open/create/update/delete records + guided help
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/erp/auth';
import { REGISTER_CATEGORIES } from '@/lib/erp/types';
import type { ColumnDef } from '@/lib/erp/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message: string = body.message || '';
  const history: { role: 'user' | 'assistant'; content: string }[] = body.history || [];

  if (!message.trim()) {
    return NextResponse.json({ reply: 'Please ask a question about your ERP data.' });
  }

  // Get user for audit log
  const user = await getCurrentUser(req);

  // Build context
  const registers = await db.register.findMany({
    where: { isDeleted: false },
    include: { records: { where: { isDeleted: false } } },
  });

  const ctx = registers.map((r) => {
    const cols = (JSON.parse(r.columns) as ColumnDef[]).map(
      (c) => `${c.name}(${c.type}${c.options ? '/' + c.options.join('|') : ''})`,
    );
    const sample = r.records.slice(0, 2).map((rec) => {
      const d = JSON.parse(rec.data);
      return `#${rec.sequence}: ${JSON.stringify(d).slice(0, 400)}`;
    });
    return `• ${r.name} (code=${r.code}, ${r.records.length} records)\n  columns: ${cols.join(', ')}\n  samples: ${sample.join(' | ')}`;
  }).join('\n');

  const categoryList = Object.values(REGISTER_CATEGORIES)
    .map((c) => `${c.name} (${c.id})`)
    .join(', ');

  const systemPrompt = `You are the FMCore ERP AI Assistant — an enterprise Facility Management ERP with FULL CRUD capabilities.

Available registers and current data:
${ctx}

Categories: ${categoryList}

YOUR CAPABILITIES:
1. ANSWER questions about ERP data (counts, statuses, overdue items, low stock, etc.)
2. OPEN a register → append: ACTION: open_register:<code>
3. CREATE a new register (template) → append: ACTION: create_register:<name>:<category>
4. CREATE a record in an existing register → append: ACTION: create_record:<code>:<JSON field values>
   Example: ACTION: create_record:workorders:{"Building":"Building A","Asset":"AHU-01","Fault Description":"User reported noise","Priority":"High","Status":"Open"}
   Only include fields the user specified or reasonable defaults. Auto-increment fields are auto-filled.
5. UPDATE a field in an existing record → append: ACTION: update_record:<code>:<sequence>:<JSON updates>
   Example: ACTION: update_record:workorders:1:{"Status":"Completed","Completion %":100}
6. DELETE a record → append: ACTION: delete_record:<code>:<sequence>
   Example: ACTION: delete_record:workorders:3
   Always confirm in the reply before deleting.
7. GUIDE the user with step-by-step instructions → append: ACTION: guide:<topic>
   Example for "How do I create a work order?":
   1. Click "Maintenance Work Orders" in the left sidebar
   2. Click the green "Add Record" button at the top
   3. Fill in the fields (Date, Building, Fault Description, Priority)
   4. Click "Create Record"
   ACTION: guide:create_work_order

RULES:
- Be concise, professional, and friendly.
- When performing CRUD operations, confirm what you did in the reply.
- Always use the exact register codes shown above (e.g. "workorders", "pm", "assets").
- For sequence numbers, use the # shown in the samples (e.g. "WO-0001" = sequence 1).
- Today is ${new Date().toISOString().slice(0, 10)}.
- Currency is configured per tenant (check settings if relevant).`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.4,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content || 'I could not process that request.';

    // Parse and execute any ACTION
    let action: { type: string; payload?: any } | undefined;
    let executionResult: string | undefined;

    // Match: ACTION: <type>:<payload>
    const actionRegex =
      /ACTION:\s*(open_register|create_register|create_record|update_record|delete_record|guide):([^\n]+)/i;
    const actionMatch = reply.match(actionRegex);

    if (actionMatch) {
      const [, type, rawPayload] = actionMatch;
      const payloadStr = rawPayload.trim();

      switch (type) {
        case 'open_register':
          action = { type: 'open_register', payload: { code: payloadStr } };
          break;
        case 'create_register': {
          const [name, category] = payloadStr.split(':');
          action = {
            type: 'create_register',
            payload: { name: name?.trim(), category: (category || 'operations').trim() },
          };
          break;
        }
        case 'create_record': {
          // Format: <code>:<JSON>
          const colonIdx = payloadStr.indexOf(':');
          if (colonIdx > -1) {
            const regCode = payloadStr.slice(0, colonIdx).trim();
            const jsonStr = payloadStr.slice(colonIdx + 1).trim();
            try {
              const recordData = JSON.parse(jsonStr);
              executionResult = await executeCreateRecord(
                regCode,
                recordData,
                user?.username || 'ai_assistant',
              );
              action = { type: 'create_record', payload: { code: regCode, data: recordData } };
            } catch (e: any) {
              executionResult = `Failed to create record: ${e.message}`;
            }
          }
          break;
        }
        case 'update_record': {
          // Format: <code>:<sequence>:<JSON updates>
          const parts = payloadStr.split(':');
          if (parts.length >= 3) {
            const regCode = parts[0].trim();
            const seq = parseInt(parts[1]);
            const jsonStr = parts.slice(2).join(':').trim();
            try {
              const updates = JSON.parse(jsonStr);
              executionResult = await executeUpdateRecord(
                regCode,
                seq,
                updates,
                user?.username || 'ai_assistant',
              );
              action = {
                type: 'update_record',
                payload: { code: regCode, sequence: seq, updates },
              };
            } catch (e: any) {
              executionResult = `Failed to update record: ${e.message}`;
            }
          }
          break;
        }
        case 'delete_record': {
          // Format: <code>:<sequence>
          const delParts = payloadStr.split(':');
          if (delParts.length >= 2) {
            const regCode = delParts[0].trim();
            const seq = parseInt(delParts[1]);
            try {
              executionResult = await executeDeleteRecord(
                regCode,
                seq,
                user?.username || 'ai_assistant',
              );
              action = { type: 'delete_record', payload: { code: regCode, sequence: seq } };
            } catch (e: any) {
              executionResult = `Failed to delete record: ${e.message}`;
            }
          }
          break;
        }
        case 'guide':
          action = { type: 'guide', payload: { topic: payloadStr } };
          break;
      }
    }

    // Strip ACTION lines from visible reply
    let cleanReply = reply.replace(/ACTION:\s*[^\n]+\n?/gi, '').trim();

    // Append execution result if any
    if (executionResult) {
      cleanReply += `\n\n✅ ${executionResult}`;
    }

    return NextResponse.json({ reply: cleanReply, action });
  } catch (err: any) {
    console.error('AI error:', err?.message || err);
    const fallback = generateFallbackReply(message, registers);
    return NextResponse.json({ reply: fallback });
  }
}

// ---------- CRUD Execution Functions ----------

async function executeCreateRecord(
  regCode: string,
  data: Record<string, any>,
  username: string,
): Promise<string> {
  const register = await db.register.findFirst({ where: { code: regCode } });
  if (!register) throw new Error(`Register "${regCode}" not found`);

  const lastRecord = await db.record.findFirst({
    where: { registerId: register.id },
    orderBy: { sequence: 'desc' },
  });
  const sequence = (lastRecord?.sequence || 0) + 1;

  // Auto-fill auto_increment columns
  const columns = JSON.parse(register.columns) as ColumnDef[];
  columns.forEach((col) => {
    if (col.type === 'auto_increment' && !data[col.name]) {
      data[col.name] = sequence;
    }
  });

  const r = await db.$transaction(async (tx) => {
    const newRecord = await tx.record.create({
      data: {
        registerId: register.id,
        sequence,
        data: JSON.stringify(data),
        createdBy: username,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: null,
        action: 'Created',
        module: register.name,
        registerId: register.id,
        recordId: newRecord.id,
        summary: `AI Assistant created record #${sequence} in "${register.name}"`,
        newValue: JSON.stringify(data),
      },
    });
    return newRecord;
  });

  return `Created record #${sequence} in ${register.name} with fields: ${Object.keys(data).join(', ')}`;
}

async function executeUpdateRecord(
  regCode: string,
  sequence: number,
  updates: Record<string, any>,
  username: string,
): Promise<string> {
  const register = await db.register.findFirst({ where: { code: regCode } });
  if (!register) throw new Error(`Register "${regCode}" not found`);

  const existing = await db.record.findFirst({
    where: { registerId: register.id, sequence, isDeleted: false },
  });
  if (!existing) throw new Error(`Record #${sequence} not found in ${register.name}`);

  const oldData = JSON.parse(existing.data);
  const newData = { ...oldData, ...updates };

  await db.$transaction(async (tx) => {
    await tx.record.update({
      where: { id: existing.id },
      data: {
        data: JSON.stringify(newData),
        updatedBy: username,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: null,
        action: 'Updated',
        module: register.name,
        registerId: register.id,
        recordId: existing.id,
        summary: `AI Assistant updated record #${sequence} in "${register.name}"`,
        oldValue: existing.data,
        newValue: JSON.stringify(newData),
      },
    });
  });

  return `Updated record #${sequence} in ${register.name}: ${Object.entries(updates)
    .map(([k, v]) => `${k}="${v}"`)
    .join(', ')}`;
}

async function executeDeleteRecord(
  regCode: string,
  sequence: number,
  username: string,
): Promise<string> {
  const register = await db.register.findFirst({ where: { code: regCode } });
  if (!register) throw new Error(`Register "${regCode}" not found`);

  const existing = await db.record.findFirst({
    where: { registerId: register.id, sequence, isDeleted: false },
  });
  if (!existing) throw new Error(`Record #${sequence} not found in ${register.name}`);

  await db.$transaction(async (tx) => {
    await tx.record.update({
      where: { id: existing.id },
      data: { isDeleted: true },
    });
    await tx.auditLog.create({
      data: {
        userId: null,
        action: 'Deleted',
        module: register.name,
        registerId: register.id,
        recordId: existing.id,
        summary: `AI Assistant deleted record #${sequence} from "${register.name}"`,
        oldValue: existing.data,
      },
    });
  });

  return `Deleted record #${sequence} from ${register.name}`;
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
    return `There are ${wo?.records.length || 0} work orders. I can create new ones, update statuses, or delete them. Try: "Create a work order for Pump-05 leakage" or "Update WO-0001 status to Completed".`;
  }
  if (lower.includes('create') && lower.includes('register')) {
    return 'You can create a new register from the Register Builder (green + button in the sidebar). Or I can help — try: "Create a register for vehicle inspection".';
  }
  if (lower.includes('how')) {
    return `I can guide you through any task. Try asking:
• "How do I create a work order?"
• "How do I change the currency?"
• "How do I add a new asset?"
• "How do I export records?"`;
  }
  return `I'm your AI assistant with full CRUD capabilities. I can:
• Answer questions about your ERP data
• Create, update, and delete records
• Open registers and guide you through tasks
• Provide step-by-step instructions

You have ${registers.length} active registers. Try: "Create a work order for Chiller CH-01 noise" or "How do I change currency?"`;
}
