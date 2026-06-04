'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { AppShell } from '../_components/AppShell';
import { PageLoader } from '../_components/PageLoader';
import { LoadingButton } from '../_components/LoadingButton';
import { FormMessage } from '../_components/FormMessage';
import { deleteAccount, exportMyData, toFriendlyMessage } from '../lib/api';
import styles from './settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { status, email, signOut } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  useEffect(() => {
    if (status === 'anon') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <AppShell active="settings" title="Settings">
        <div style={{ padding: '2rem 0' }}>
          {status === 'loading' ? <PageLoader /> : <p style={{ color: 'var(--text-muted)' }}>Redirecting…</p>}
        </div>
      </AppShell>
    );
  }

  async function downloadData() {
    setExportMsg('');
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'emplorio-data.json';
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('Your data has been downloaded.');
    } catch (err) {
      setExportMsg(toFriendlyMessage(err));
    } finally {
      setExporting(false);
    }
  }

  async function removeAccount() {
    setDeleteErr('');
    setDeleting(true);
    try {
      await deleteAccount();
      router.push('/');
    } catch (err) {
      setDeleteErr(toFriendlyMessage(err));
      setDeleting(false);
    }
  }

  return (
    <AppShell
      active="settings"
      title="Settings"
      subtitle="Manage your account, data, and the tutorial."
      email={email}
      onSignOut={signOut}
    >
      <div className={styles.cards}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Account</h2>
          <p className={styles.row}>
            Signed in as <strong>{email}</strong>
          </p>
          <button type="button" className={styles.secondary} onClick={() => void signOut()}>
            Sign out
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Tutorial</h2>
          <p className={styles.muted}>
            Replay the interactive walkthrough to see how filling, cover letters, and question answers
            work.
          </p>
          <a className={styles.secondary} href="/tutorial?next=%2Fsettings">
            Replay tutorial
          </a>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Your data</h2>
          <p className={styles.muted}>
            Download everything we hold for your account: your profile and every saved application, as a
            JSON file.
          </p>
          <LoadingButton
            loading={exporting}
            loadingText="Preparing…"
            loaderTone="dark"
            className={styles.secondary}
            onClick={downloadData}
          >
            Download my data
          </LoadingButton>
          {exportMsg && (
            <div className={styles.msg}>
              <FormMessage tone={/download|prepared/i.test(exportMsg) ? 'success' : 'error'}>
                {exportMsg}
              </FormMessage>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.danger}`}>
          <h2 className={styles.cardTitle}>Delete account</h2>
          <p className={styles.muted}>
            This permanently removes your account, profile, saved CV, and every tracked application. This
            cannot be undone.
          </p>
          {!confirmDelete ? (
            <button type="button" className={styles.dangerBtn} onClick={() => setConfirmDelete(true)}>
              Delete my account
            </button>
          ) : (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>Are you sure? This is permanent.</span>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <LoadingButton
                  loading={deleting}
                  loadingText="Deleting…"
                  className={styles.dangerBtn}
                  onClick={removeAccount}
                >
                  Yes, delete everything
                </LoadingButton>
              </div>
            </div>
          )}
          {deleteErr && (
            <div className={styles.msg}>
              <FormMessage tone="error">{deleteErr}</FormMessage>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
