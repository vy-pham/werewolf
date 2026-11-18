import type { TFunction } from 'i18next';
import { useToast } from './toast';

/** Error code → translated message (`errors.<CODE>`). Falls back to the error's message. */
export function errorMessage(t: TFunction, error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code) {
    const key = `errors.${code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return error instanceof Error ? error.message : t('errors.INTERNAL');
}

/** Runs an async action and shows an error toast if it fails. Returns whether it succeeded. */
export async function attempt(t: TFunction, action: () => Promise<unknown>) {
  try {
    await action();
    return true;
  } catch (error) {
    useToast.getState().push(errorMessage(t, error), 'error');
    return false;
  }
}
