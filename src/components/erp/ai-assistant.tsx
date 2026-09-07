'use client';

// FMCore ERP — AI Assistant Panel
import { useEffect, useRef, useState } from 'react';
import { aiApi, registersApi } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import type { Register } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { Wand2, Send, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Msg { role: 'user' | 'assistant'; content: string; action?: { type: string; payload?: any } }

const SUGGESTIONS = [
  'How many open work orders?',
  'Create a work order for Pump-05 leakage',
  'How do I change the currency?',
  'Show overdue maintenance',
  'Update WO-0001 status to Completed',
  'How do I add a new asset?',
];

export function AiAssistant() {
  const { aiPanelOpen, setAiPanel, openTab, setBuilderOpen } = useErpStore();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hello! I'm your FMCore ERP AI Assistant with full CRUD capabilities. I can:\n\n📊 **Answer questions** — \"How many open work orders?\"\n✨ **Create records** — \"Create a work order for Pump-05 leakage\"\n✏️ **Update records** — \"Update WO-0001 status to Completed\"\n🗑️ **Delete records** — \"Delete WO-0003\"\n📖 **Guide you** — \"How do I change the currency?\"\n\nTry asking me anything!" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [registers, setRegisters] = useState<Register[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registersApi.list().then(setRegisters).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleAction = (action?: { type: string; payload?: any }) => {
    if (!action) return;
    if (action.type === 'open_register' && action.payload?.code) {
      const reg = registers.find((r) => r.code === action.payload.code);
      if (reg) {
        openTab({ id: `reg_${reg.id}`, type: 'register', label: reg.name, icon: reg.icon, refId: reg.id });
        toast.success(`Opened ${reg.name}`);
      } else {
        toast.error(`Register "${action.payload.code}" not found`);
      }
    } else if (action.type === 'create_register') {
      setAiPanel(false);
      setBuilderOpen(true);
      toast.info('Opening Register Builder' + (action.payload?.name ? ` for "${action.payload.name}"` : ''));
    } else if (action.type === 'create_record') {
      // Record was already created by the API; just open the register to show it
      const reg = registers.find((r) => r.code === action.payload?.code);
      if (reg) {
        openTab({ id: `reg_${reg.id}`, type: 'register', label: reg.name, icon: reg.icon, refId: reg.id });
        toast.success(`Record created in ${reg.name}`);
      } else {
        toast.success('Record created');
      }
      // Refresh registers list to get the updated record count
      registersApi.list().then(setRegisters).catch(() => {});
    } else if (action.type === 'update_record') {
      toast.success(`Record #${action.payload?.sequence} updated in ${action.payload?.code}`);
      // Refresh registers to reflect the change
      registersApi.list().then(setRegisters).catch(() => {});
    } else if (action.type === 'delete_record') {
      toast.success(`Record #${action.payload?.sequence} deleted from ${action.payload?.code}`);
      registersApi.list().then(setRegisters).catch(() => {});
    } else if (action.type === 'guide') {
      // No action needed — the reply text already contains the step-by-step guide
      toast.info(`Guide: ${action.payload?.topic?.replace(/_/g, ' ') || 'instructions'}`);
    }
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content: msg };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await aiApi.chat(msg, history);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply, action: res.action }]);
      // Auto-execute action after a brief delay
      if (res.action) setTimeout(() => handleAction(res.action), 800);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ Sorry, I encountered an error: ${e.message}. Please try again.` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!aiPanelOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setAiPanel(false)} />
      <aside
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-[var(--erp-bg-secondary)] border-l border-[var(--erp-border)] flex flex-col z-50 shadow-xl"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[52px] border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--erp-accent-dim)] flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-[var(--erp-accent)]" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--erp-text)]">AI Assistant</div>
              <div className="text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--erp-success)]" /> Online · Context-aware
              </div>
            </div>
          </div>
          <button onClick={() => setAiPanel(false)} className="p-2 rounded-md text-[var(--erp-text-muted)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]" aria-label="Close AI panel">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold',
                msg.role === 'user'
                  ? 'bg-[var(--erp-bg-active)] text-[var(--erp-text)]'
                  : 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)]'
              )}>
                {msg.role === 'user' ? 'AD' : <FAIcon name="fa-wand-magic-sparkles" />}
              </div>
              <div className={cn(
                'max-w-[80%] px-3 py-2 rounded-lg text-[12px] whitespace-pre-wrap leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--erp-accent)] text-white rounded-tr-none'
                  : 'bg-[var(--erp-bg-card)] border border-[var(--erp-border)] text-[var(--erp-text)] rounded-tl-none'
              )}>
                {msg.content}
                {msg.action && (
                  <button
                    onClick={() => handleAction(msg.action)}
                    className="mt-2 ml-1 px-2 py-0.5 rounded text-[10px] bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] hover:bg-[var(--erp-accent)] hover:text-white transition-colors"
                  >
                    {msg.action.type === 'open_register' ? '→ Open register' : '→ Create register'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--erp-accent-dim)] text-[var(--erp-accent)]">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="px-3 py-2 rounded-lg bg-[var(--erp-bg-card)] border border-[var(--erp-border)] text-[12px] text-[var(--erp-text-muted)]">
                Thinking<span className="animate-pulse">...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2">
            <div className="text-[10px] text-[var(--erp-text-muted)] mb-1.5 uppercase tracking-wide">Try asking</div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2 py-1 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:border-[var(--erp-accent-border)] hover:text-[var(--erp-accent)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Ask anything about your ERP data..."
              className="flex-1 text-[12px] p-2 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] resize-none max-h-[120px]"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="p-2 rounded-md bg-[var(--erp-accent)] text-white hover:bg-[var(--erp-accent-hover)] disabled:opacity-40 transition-colors"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-[var(--erp-text-muted)] mt-1.5 text-center">
            AI can access your ERP data to answer questions.
          </div>
        </div>
      </aside>
    </>
  );
}
