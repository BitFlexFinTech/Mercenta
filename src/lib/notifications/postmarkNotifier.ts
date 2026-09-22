/**
 * §Postmark — Transactional email notification for brand-facing events.
 *
 * Mock-first: when POSTMARK_API_KEY is configured in .env, real emails are
 * sent through the Postmark API. Otherwise, mock responses are returned.
 */
const POSTMARK_API_URL = 'https://api.postmarkapp.com/email';

function getApiKey(): string | null {
  const key =
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_POSTMARK_API_KEY as string | undefined) ||
        (import.meta.env.POSTMARK_API_KEY as string | undefined)
      : undefined) ??
    (typeof process !== 'undefined' && process.env
      ? process.env.POSTMARK_API_KEY
      : undefined) ??
    null;
  return key?.trim() || null;
}

export interface PostmarkEmailInput {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
}

export interface PostmarkEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  mock?: boolean;
}

let mockMessageCounter = 0;

export function resetMockPostmarkState(): void {
  mockMessageCounter = 0;
}

export async function sendPostmarkEmail(
  input: PostmarkEmailInput
): Promise<PostmarkEmailResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 120));
    const addr = input.to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr)) {
      return {
        ok: false,
        error: 'Invalid recipient address "' + addr + '" - (Mock) message not sent',
        mock: true,
      };
    }
    mockMessageCounter += 1;
    return {
      ok: true,
      messageId: 'mock:postmark:' + String(mockMessageCounter).padStart(5, '0'),
      mock: true,
    };
  }

  try {
    const res = await fetch(POSTMARK_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiKey,
      },
      body: JSON.stringify({
        From: 'notifications@mercenta.co.uk',
        To: input.to,
        Subject: input.subject,
        TextBody: input.textBody,
        HtmlBody: input.htmlBody ?? undefined,
        MessageStream: 'transactional',
      }),
    });

    const body = (await res.json()) as {
      MessageID?: string;
      ErrorCode?: number;
      Message?: string;
    };
if (!res.ok || body.ErrorCode) {
      return {
        ok: false,
        error: body.Message ?? 'Postmark HTTP ' + res.status,
      };
    }

    return {
      ok: true,
      messageId: body.MessageID ?? 'pm-' + Date.now(),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Postmark network error',
    };
  }
}

/**
 * Build a human-readable notification for a new purchase order.
 */
export function buildPoNotificationHtml(
  poNumber: string,
  brandName: string,
  lineItemCount: number,
  deadlineIso: string,
  brandPoUrl: string
): { textBody: string; htmlBody: string } {
  const deadlineDate = new Date(deadlineIso);
  const deadlineFormatted = deadlineDate.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const textBody = [
    'NEW PURCHASE ORDER - ACTION REQUIRED',
    '',
    'Dear ' + brandName + ',',
    '',
    'A new purchase order has been issued to you on the Mercenta Partners platform.',
    'Please log in to review and acknowledge it within 24 hours.',
    '',
    'PO Number: ' + poNumber,
    'Line Items: ' + lineItemCount,
    'Acknowledgment Deadline: ' + deadlineFormatted,
    '',
    'Link to PO: ' + brandPoUrl,
    '',
    /**
     * §Dashboard-cleanup P0 — AV-002 / AV-003 CORRECTED.
     *
     * OLD: "it may be subject to forced cancellation and could affect your
     * vendor performance rating." The repo's own Amazon truth register records
     * BOTH claims as unsupported: AV-002 ("unacknowledged ⇒ forced cancellation"
     * is an INFERENCE, not an Amazon statement) and AV-003 ("vendor performance
     * rating" has NO Amazon source reached). They are replaced by a statement of
     * RISK, attributed to Mercenta — never a certainty, never an invented Amazon
     * consequence.
     */
    'If you do not acknowledge this PO by the deadline it may be at risk of',
    'cancellation. Mercenta will contact you before any order is affected.',
    '',
    '- Mercenta Partners',
  ].join('\n');

  const htmlBody = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8"></head>',
    '<body style="font-family: -apple-system, sans-serif; background: #f5f5f5; padding: 32px;">',
    '<div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; border: 1px solid #e0e0e0;">',
    '<div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Mercenta Partners</div>',
    '<h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1a1a;">New Purchase Order - Action Required</h2>',
    '<p style="color: #444; font-size: 14px; line-height: 1.5;">Dear ' + brandName + ',</p>',
    '<p style="color: #444; font-size: 14px; line-height: 1.5;">A new purchase order has been issued to you on the Mercenta Partners platform. Please log in to review and acknowledge it within <strong>24 hours</strong>.</p>',
    '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">',
    '<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #666;">PO Number</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: 600;">' + poNumber + '</td></tr>',
    '<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #666;">Line Items</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: 600;">' + lineItemCount + '</td></tr>',
    '<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #666;">Deadline</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #d93838;">' + deadlineFormatted + '</td></tr>',
    '</table>',
    '<a href="' + brandPoUrl + '" style="display: inline-block; background: #b8860b; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 8px 0;">View Purchase Order</a>',
    '<p style="color: #888; font-size: 12px; line-height: 1.5; margin-top: 16px;">If you do not acknowledge this PO by the deadline it may be at risk of cancellation. Mercenta will contact you before any order is affected.</p>',
    '<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">',
    '<p style="color: #888; font-size: 11px;">- Mercenta Partners</p>',
    '</div></body></html>',
  ].join('\n');

  return { textBody, htmlBody };
}