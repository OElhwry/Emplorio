import { renderToStream, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';
import type { Profile } from '@emplorio/shared';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica' },
  h1: { fontSize: 18, marginBottom: 4 },
  h2: { fontSize: 13, marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 4 },
  meta: { color: '#555', fontSize: 9, marginBottom: 8 },
  bullet: { marginLeft: 12 },
});

export interface CvDocProps {
  profile: Profile;
  bullets: Record<string, string[]>;
}

export const CvDoc = ({ profile, bullets }: CvDocProps) =>
  React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.h1 }, `${profile.firstName} ${profile.lastName}`),
      React.createElement(
        Text,
        { style: styles.meta },
        [profile.email, profile.phone, profile.linkedinUrl].filter(Boolean).join(' · '),
      ),
      React.createElement(Text, { style: styles.h2 }, 'Experience'),
      ...profile.workHistory.map((w) =>
        React.createElement(
          View,
          { key: w.id ?? `${w.company}-${w.title}` },
          React.createElement(Text, null, `${w.title} — ${w.company}`),
          ...(bullets[w.id ?? ''] ?? w.bullets).map((b, i) =>
            React.createElement(Text, { key: i, style: styles.bullet }, `• ${b}`),
          ),
        ),
      ),
    ),
  );

export async function renderCvPdf(props: CvDocProps): Promise<NodeJS.ReadableStream> {
  return renderToStream(CvDoc(props));
}
