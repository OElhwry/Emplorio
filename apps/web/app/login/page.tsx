'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`${process.env.NEXT_PUBLIC_API_ORIGIN}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSent(true);
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1>Sign in</h1>
      {sent ? (
        <p>Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
          <button type="submit" style={{ marginTop: 12, padding: '8px 16px' }}>
            Send magic link
          </button>
        </form>
      )}
    </main>
  );
}
