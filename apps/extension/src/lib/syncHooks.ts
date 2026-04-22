import type { Profile } from '@emplorio/shared';
import type { TrackedApplication } from './storage.js';

type ProfileHook = (profile: Partial<Profile>) => void;
type AppsHook = (apps: TrackedApplication[]) => void;
type DeleteHook = (id: string) => void;

let profileHook: ProfileHook | null = null;
let appsHook: AppsHook | null = null;
let deleteHook: DeleteHook | null = null;

export function registerSyncHooks(hooks: {
  onProfileSaved?: ProfileHook;
  onAppsSaved?: AppsHook;
  onAppDeleted?: DeleteHook;
}) {
  if (hooks.onProfileSaved) profileHook = hooks.onProfileSaved;
  if (hooks.onAppsSaved) appsHook = hooks.onAppsSaved;
  if (hooks.onAppDeleted) deleteHook = hooks.onAppDeleted;
}

export function emitProfileSaved(profile: Partial<Profile>) {
  if (profileHook) {
    try {
      profileHook(profile);
    } catch {
      // best effort
    }
  }
}

export function emitAppsSaved(apps: TrackedApplication[]) {
  if (appsHook) {
    try {
      appsHook(apps);
    } catch {
      // best effort
    }
  }
}

export function emitAppDeleted(id: string) {
  if (deleteHook) {
    try {
      deleteHook(id);
    } catch {
      // best effort
    }
  }
}
