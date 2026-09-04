/** §Batch-10 — OpenRouter-powered alert triage. */
const CRITICAL_KW = ['critical', 'remote code execution', 'sql injection', 'privilege escalation', 'auth bypass', 'data breach', 'zero-day', 'cve-', 'database unavailable'];
const HIGH_KW = ['high', 'denial of service', 'cross-site', 'xss', 'csrf', 'information disclosure', 'service degraded'];

export function classifySeverity(alertTitle: string, description: string): 'critical' | 'high' | 'info' {
  const combined = (alertTitle + ' ' + description).toLowerCase();
  for (const kw of CRITICAL_KW) { if (combined.includes(kw.toLowerCase())) return 'critical'; }
  for (const kw of HIGH_KW) { if (combined.includes(kw.toLowerCase())) return 'high'; }
  return 'info';
}

function mockTriage(alertTitle: string, description: string): import('@/types').TriageResult {
  const severity = classifySeverity(alertTitle, description);
  const recs: Record<string, string> = {
    critical: 'Patch immediately. Affects production systems. Check for active exploitation.',
    high: 'Schedule patching this sprint. Monitor for related incidents.',
    info: 'Informational only. No action needed.',
  };
  let fix: string | null = null;
  const lower = (alertTitle + ' ' + description).toLowerCase();
  if (lower.includes('database') || lower.includes('supabase')) fix = 'Check Supabase project dashboard. Verify Vault secrets and service role key.';
  else if (lower.includes('function') || lower.includes('edge')) fix = 'Run supabase functions deploy. Check function logs.';
  else if (lower.includes('email') || lower.includes('postmark') || lower.includes('sendgrid')) fix = 'Check email provider status. Verify API keys in Vault.';
  else if (lower.includes('npm') || lower.includes('dependency')) fix = 'Review advisory. Run npm audit fix or bump affected package.';
  return { severity, summary: alertTitle + '. ' + recs[severity], fixSuggestion: fix, actionable: severity === 'critical' || severity === 'high', source: 'mock' as const };
}

async function realTriage(apiKey: string, alertTitle: string, description: string): Promise<import('@/types').TriageResult> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a DevOps alert triage assistant for Mercenta Partners (UK wholesale distribution platform: Supabase, React/Vite, Stripe, Postmark/SendGrid, OpenRouter, Instantly). Respond with JSON: severity ("critical"|"high"|"info"), summary (1-2 sentences), fixSuggestion (string|null), actionable (boolean). Keep under 100 words.' },
        { role: 'user', content: 'Title: ' + alertTitle + '\nDescription: ' + description + '\n\nClassify. JSON only.' },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });
  if (!res.ok) throw new Error('OpenRouter HTTP ' + res.status);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { severity?: string; summary?: string; fixSuggestion?: string | null; actionable?: boolean };
  return {
    severity: (['critical', 'high', 'info'] as const).includes(parsed.severity as 'critical' | 'high' | 'info') ? parsed.severity as 'critical' | 'high' | 'info' : classifySeverity(alertTitle, description),
    summary: parsed.summary ?? 'Triage for: ' + alertTitle,
    fixSuggestion: parsed.fixSuggestion ?? null,
    actionable: parsed.actionable ?? false,
    source: 'openrouter' as const,
  };
}

export async function triageAlert(input: { alertTitle: string; description: string; openRouterApiKey?: string | null; fetchImpl?: typeof fetch }): Promise<import('@/types').TriageResult> {
  const { alertTitle, description, openRouterApiKey, fetchImpl } = input;
  const oldFetch = globalThis.fetch;
  if (fetchImpl) globalThis.fetch = fetchImpl as typeof fetch;
  if (openRouterApiKey) {
    try {
      const result = await realTriage(openRouterApiKey, alertTitle, description);
      if (fetchImpl) globalThis.fetch = oldFetch;
      return result;
    } catch (err) {
      console.warn('[triage] OpenRouter failed, falling back to mock:', err);
      if (fetchImpl) globalThis.fetch = oldFetch;
      return mockTriage(alertTitle, description);
    }
  }
  if (fetchImpl) globalThis.fetch = oldFetch;
  return mockTriage(alertTitle, description);
}