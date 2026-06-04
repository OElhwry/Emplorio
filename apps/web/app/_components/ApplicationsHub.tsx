'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ApplicationStatus } from '@emplorio/shared';
import {
  deleteApplicationRemote,
  fetchApplications,
  saveApplication,
  type WebApplication,
} from '../lib/api';
import styles from './ApplicationsHub.module.css';
import { PageLoader } from './PageLoader';

const COLUMNS: { id: ApplicationStatus; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
];

const ALL_STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

/** Map the less-common statuses into a visible column. */
function columnOf(status: ApplicationStatus): ApplicationStatus {
  if (status === 'draft') return 'saved';
  if (status === 'withdrawn') return 'rejected';
  return status;
}

function ts(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function relative(s: string | null): string {
  const t = ts(s);
  if (t == null) return '';
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface Insights {
  week: number;
  month: number;
  responseRate: number | null;
  offerRate: number | null;
  interviews: number;
  total: number;
}

function computeInsights(items: WebApplication[]): Insights {
  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;
  const applied = items.filter((a) => ts(a.appliedAt) != null);
  const week = applied.filter((a) => (ts(a.appliedAt) ?? 0) >= weekAgo).length;
  const month = applied.filter((a) => (ts(a.appliedAt) ?? 0) >= monthAgo).length;
  const positive = applied.filter((a) => a.status === 'interview' || a.status === 'offer');
  const offers = items.filter((a) => a.status === 'offer');
  const interviewed = items.filter((a) => a.status === 'interview' || a.status === 'offer');
  return {
    week,
    month,
    responseRate: applied.length ? positive.length / applied.length : null,
    offerRate: interviewed.length ? offers.length / interviewed.length : null,
    interviews: interviewed.length,
    total: items.length,
  };
}

function pct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

export function ApplicationsHub({ showInsights = true }: { showInsights?: boolean }) {
  const [items, setItems] = useState<WebApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchApplications()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your applications.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const insights = useMemo(() => computeInsights(items), [items]);

  async function changeStatus(app: WebApplication, status: ApplicationStatus) {
    const patch: WebApplication = { ...app, status };
    if (status === 'applied' && !patch.appliedAt) patch.appliedAt = new Date().toISOString();
    if (status === 'saved' && !patch.savedAt) patch.savedAt = new Date().toISOString();
    setItems((prev) => prev.map((a) => (a.id === app.id ? patch : a)));
    try {
      await saveApplication(patch);
    } catch {
      setError('Could not update that application. It may be missing a job URL.');
      setItems((prev) => prev.map((a) => (a.id === app.id ? app : a)));
    }
  }

  async function remove(app: WebApplication) {
    setItems((prev) => prev.filter((a) => a.id !== app.id));
    try {
      await deleteApplicationRemote(app.id);
    } catch {
      // best effort; a refetch would restore it if it failed
    }
  }

  if (loading) {
    return <PageLoader minHeight="40vh" />;
  }

  return (
    <div className={styles.hub}>
      {showInsights && (
        <div className={styles.insights}>
          <Tile value={String(insights.week)} label="Applied this week" />
          <Tile value={String(insights.month)} label="Applied (30d)" />
          <Tile value={pct(insights.responseRate)} label="Response rate" />
          <Tile value={pct(insights.offerRate)} label="Offer rate" />
          <Tile value={String(insights.interviews)} label="Interviews" />
          <Tile value={String(insights.total)} label="Total tracked" />
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No applications yet</p>
          <p className={styles.muted}>
            Install the Emplorio extension and hit Fill on a job page, or Save for later. They&apos;ll
            show up here automatically.
          </p>
        </div>
      ) : (
        <div className={styles.board}>
          {COLUMNS.map((col) => {
            const colItems = items.filter((a) => columnOf(a.status) === col.id);
            return (
              <div key={col.id} className={styles.column}>
                <div className={styles.columnHead}>
                  <span className={`${styles.dot} ${styles[`dot_${col.id}`]}`} />
                  {col.label}
                  <span className={styles.count}>{colItems.length}</span>
                </div>
                <div className={styles.cards}>
                  {colItems.map((app) => (
                    <div key={app.id} className={styles.card}>
                      <div className={styles.cardRole}>{app.role || 'Untitled role'}</div>
                      <div className={styles.cardCompany}>{app.company || 'Unknown company'}</div>
                      <div className={styles.cardMeta}>
                        {relative(app.appliedAt ?? app.savedAt ?? app.updatedAt)}
                      </div>
                      <div className={styles.cardActions}>
                        <select
                          className={styles.statusSelect}
                          value={app.status}
                          onChange={(e) => void changeStatus(app, e.target.value as ApplicationStatus)}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {app.jobUrl && (
                          <a className={styles.iconLink} href={app.jobUrl} target="_blank" rel="noreferrer" title="Open job">
                            ↗
                          </a>
                        )}
                        <button className={styles.iconLink} onClick={() => void remove(app)} title="Delete">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {colItems.length === 0 && <p className={styles.colEmpty}>Nothing here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileValue}>{value}</div>
      <div className={styles.tileLabel}>{label}</div>
    </div>
  );
}
