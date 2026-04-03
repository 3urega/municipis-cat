"use client";

type PermissionExplanationModalProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Explicació abans de demanar permís del sistema (càmera / galeria).
 */
export function PermissionExplanationModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel·lar",
  onConfirm,
  onCancel,
}: PermissionExplanationModalProps): React.ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-modal-title"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h2
          id="permission-modal-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
            onClick={() => {
              onCancel();
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
            onClick={() => {
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
