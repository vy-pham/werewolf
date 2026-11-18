import { useToast } from '../stores/toast';
import { cn } from './ui';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          type="button"
          key={t.id}
          onClick={() => dismiss(t.id)}
          data-testid="toast"
          className={cn(
            'pointer-events-auto max-w-md rounded-lg px-4 py-2 text-sm shadow-lg',
            t.tone === 'error' ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-100',
          )}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
