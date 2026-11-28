/**
 * §BATCH 4b — THE HOMEPAGE'S FIXED-DARK SURFACES STAY READABLE IN BOTH APPEARANCES
 * (2026-11-28)
 *
 * WHY THIS SPEC EXISTS (rule 07 — every fix carries a gate that can fail; rule 06 — compile
 * is not render)
 * -----------------------------------------------------------------------------------------
 * The front page is a FIXED-DARK design: its root is `bg-ink` (#000000) and it keeps the
 * same dark canvas in BOTH appearances (recorded as intended in
 * `docs/VISUAL_ACCEPTANCE_2026-11-25.md` → "WHAT LOOKS RIGHT AND SHOULD NOT BE FIXED").
 * Two real defects shipped on it, and NOTHING could see them: both passed typecheck, the
 * build, `validate:all` and every browser test, because a screen full of unreadable text
 * still HAS text.
 *
 *   1. the flow diagram's final step ("Growth") carried BOTH `bg-paper` and `bg-ink`,
 *      because `cn()` (`src/utils/cn.ts`) JOINS its arguments instead of merging them. The
 *      white card sat under `text-paper` — the word measured 1:1, white on white;
 *   2. the photo badges and the "Origin" bar are `bg-ink/80`, which the generated alpha-shim
 *      layer had mapped onto the APPEARANCE-REACTIVE `--mr-surface` — so in the light
 *      appearance a black scrim painted itself WHITE at 80% under white text (1.41:1 and
 *      1.31:1).
 *
 * This spec drives the real page in BOTH appearances and measures what the browser
 * actually painted. It asserts the two things the defects violated:
 *
 *   · every fixed-dark surface is still DARK in both appearances (its own painted colour is
 *     not the light appearance's surface), and
 *   · the text on it is legible — at least 3:1 for the small mono labels, at least 4.5:1 for
 *     the diagram's step labels.
 *
 * It is deliberately NOT a WCAG-AA audit of the whole design: the instrument's floor is
 * "can a person see this at all", and several labels on this dark design are deliberately
 * dimmed (`text-paper/55`) — raising those is a colour decision, not a defect fix.
 *
 * HOW THE COLOUR IS READ. `getComputedStyle` returns `oklab(…)` / `color(srgb …)` for this
 * palette, so a hand-written parser would be a second implementation to drift. Instead the
 * browser itself normalises each colour: a 1×1 canvas is filled with the surface, then with
 * the colour under test, and the resulting pixel is read. That is exact and needs no parsing.
 */
import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const THEMES = [
  { id: 'brand-dark', label: 'dark' },
  { id: 'brand-light', label: 'light' },
] as const;

/** What a surface painted, and the contrast of the text sitting on it. */
type Measurement = {
  surface: [number, number, number];
  text: [number, number, number];
  ratio: number;
  surfaceLum: number;
};

/** Measure a SURFACE element's own painted colour and the TEXT element's colour on it. */
async function measure(surface: Locator, text: Locator): Promise<Measurement> {
  const surfaceColor = await surface.evaluate((el) => getComputedStyle(el).backgroundColor);
  const textColor = await text.evaluate((el) => getComputedStyle(el).color);
  return surface.evaluate(
    (_el, { surfaceColor: sc, textColor: tc }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context — cannot normalise a colour');
      /* Fill with `over`, then with `colour`; the pixel IS the composite the eye sees. */
      const composite = (colour: string, over: string): [number, number, number] => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = over;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
      };
      /* The walk's own base: a semi-transparent surface is reported over WHITE. */
      const surface = composite(sc, '#ffffff');
      const text = composite(tc, `rgb(${surface[0]} ${surface[1]} ${surface[2]})`);
      const lum = ([r, g, b]: [number, number, number]) => {
        const f = (v: number) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const l1 = lum(text);
      const l2 = lum(surface);
      return {
        surface,
        text,
        surfaceLum: l2,
        ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
      };
    },
    { surfaceColor, textColor }
  );
}

/** The fixed-dark surfaces the defects lived on, with the floor each must clear. */
function surfaces(page: Page) {
  const flowStep = page.locator('#infrastructure ol li').filter({ hasText: 'Growth' }).first();
  const originBar = page.locator('#how-it-works .absolute.bottom-4').first();
  return [
    {
      name: 'the flow diagram’s final step ("Growth")',
      surface: flowStep.locator('div').first(),
      text: flowStep.getByText('Growth', { exact: true }),
      floor: 4.5,
    },
    {
      name: 'the warehouse photo badge scrim',
      surface: page.getByText('Received · checked', { exact: true }).locator('..'),
      text: page.getByText('Received · checked', { exact: true }),
      floor: 3,
    },
    {
      name: 'the "Origin" bar scrim',
      surface: originBar,
      text: originBar.getByText('Origin', { exact: true }),
      floor: 3,
    },
  ];
}

test.describe('§BATCH 4b — the homepage’s fixed-dark surfaces (both appearances)', () => {
  for (const theme of THEMES) {
    test(`every fixed-dark surface is still dark, and its text legible, on '${theme.label}'`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));

      await page.goto('/');
      await page.evaluate((id) => window.localStorage.setItem('mercenta.theme', id), theme.id);
      await page.reload();
      await page.waitForTimeout(700);

      await expect(page.locator('[data-testid="home-hero"]').first()).toHaveAttribute(
        'data-design',
        'e-concept'
      );

      for (const { name, surface, text, floor } of surfaces(page)) {
        await expect(surface, `${name} — the surface must render`).toBeVisible({ timeout: 8000 });
        const { surface: bg, text: fg, ratio, surfaceLum } = await measure(surface, text);
        const label = `${name} — surface rgb(${bg.join(',')}) · text rgb(${fg.join(',')})`;

        /* THE DEFECT, in one assertion: a fixed-dark surface must never resolve to the
           light appearance's surface. Before the fix this was rgb(255,255,255), luminance 1. */
        expect(
          Math.round(surfaceLum * 1000) / 1000,
          `${label} — the surface is LIGHT (luminance ${surfaceLum.toFixed(3)}); a fixed-dark element is following the appearance`
        ).toBeLessThan(0.15);

        expect(
          Math.round(ratio * 100) / 100,
          `${label} — contrast ${ratio.toFixed(2)}:1 on '${theme.label}' (floor ${floor}:1)`
        ).toBeGreaterThanOrEqual(floor);
      }

      expect(errors, `page errors on '${theme.label}'`).toEqual([]);
    });

    /* §OWNER DECISION 2026-11-28 — ORANGE WRITING ON A LIGHT SURFACE CLEARS THE AA FLOOR.
       The owner kept the orange PATCHES exactly as they are and asked for the deeper brand step
       wherever orange WRITING sits on a light background. This measures the page's two LIGHT
       sections (`#infrastructure`, `#why-mercenta` — both `bg-paper text-ink`) and requires every
       orange-writing element inside them to clear 4.5:1, and it also pins the owner's other half:
       the brand orange FILL is unchanged. */
    test(`the light sections' orange writing clears 4.5:1, and the fill is unchanged, on '${theme.label}'`, async ({
      page,
    }) => {
      await page.goto('/');
      await page.evaluate((id) => window.localStorage.setItem('mercenta.theme', id), theme.id);
      await page.reload();
      await page.waitForTimeout(700);

      const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d context — cannot normalise a colour');
        const rgbOf = (colour: string, over: string): [number, number, number] => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = over;
          ctx.fillRect(0, 0, 1, 1);
          ctx.fillStyle = colour;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
        };
        const lum = ([r, g, b]: [number, number, number]) => {
          const f = (v: number) => {
            const x = v / 255;
            return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const bgOf = (el: Element) => {
          const chain: Element[] = [];
          for (let n: Element | null = el; n; n = n.parentElement) chain.push(n);
          let acc: [number, number, number] = [255, 255, 255];
          for (let i = chain.length - 1; i >= 0; i -= 1) {
            const c = getComputedStyle(chain[i]!).backgroundColor;
            if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') continue;
            acc = rgbOf(c, `rgb(${acc.join(' ')})`);
          }
          return acc;
        };
        const rows: { text: string; fg: string; bg: string; ratio: number }[] = [];
        for (const section of Array.from(document.querySelectorAll('#infrastructure, #why-mercenta'))) {
          for (const el of Array.from(section.querySelectorAll('span,p,li,a,button'))) {
            const own = Array.from(el.childNodes)
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent || '')
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            const text = el.children.length > 0 ? own : (el.textContent || '').trim();
            if (text.length < 2) continue;
            if (el.getClientRects().length === 0) continue;
            const colour = getComputedStyle(el).color;
            const fg = rgbOf(colour, 'rgb(255 255 255)');
            /* The brand orange family: #FF6A00 and its declared deeper step #B34700. */
            if (!['255,106,0', '179,71,0'].includes(fg.join(','))) continue;
            const bg = bgOf(el);
            const l1 = lum(rgbOf(colour, `rgb(${bg.join(' ')})`));
            const l2 = lum(bg);
            rows.push({
              text: text.slice(0, 26),
              fg: fg.join(','),
              bg: bg.join(','),
              ratio: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100,
            });
          }
        }
        return {
          rows,
          signalFill: getComputedStyle(document.documentElement).getPropertyValue('--color-signal').trim(),
        };
      });

      /* A check that finds nothing is a FAILURE, never a pass (rule 10 §5). */
      expect(result.rows.length, 'orange writing found in the light sections').toBeGreaterThan(0);

      const below = result.rows.filter((r) => r.ratio < 4.5);
      expect(
        below,
        `orange writing below 4.5:1 on a light surface: ${JSON.stringify(below)}`
      ).toEqual([]);

      /* The owner's other half: the orange PATCHES are untouched. */
      expect(result.signalFill.toUpperCase(), 'the brand orange fill is unchanged').toBe('#FF6A00');
    });
  }
});
