import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Emplorio — Apply once. Send everywhere.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Inline the real hummingbird mark (light variant, for the dark card).
let LOGO_SRC = '';
try {
  const data = readFileSync(join(process.cwd(), 'public', 'emplorio-mark-light.png'));
  LOGO_SRC = `data:image/png;base64,${data.toString('base64')}`;
} catch {
  LOGO_SRC = '';
}

// 1200x630 social card used for link previews and search image previews.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #6366f1 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 40 }}>
          {LOGO_SRC ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_SRC} width={60} height={60} alt="" />
          ) : null}
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em' }}>Emplorio</div>
        </div>

        <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          Apply once.
        </div>
        <div
          style={{
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#c7d2fe',
          }}
        >
          Send everywhere.
        </div>

        <div style={{ fontSize: 30, marginTop: 36, color: 'rgba(255,255,255,0.88)' }}>
          Autofill job applications · AI cover letters · Application tracker
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 44, flexWrap: 'wrap' }}>
          {['Greenhouse', 'Lever', 'Workday', 'Ashby', 'LinkedIn', 'Indeed'].map((s) => (
            <div
              key={s}
              style={{
                fontSize: 22,
                padding: '8px 18px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
