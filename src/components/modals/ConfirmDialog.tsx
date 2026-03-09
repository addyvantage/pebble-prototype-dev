import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/useI18n'

interface ConfirmDialogProps {
    open: boolean
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    /** When set, shows a "Don't ask again" checkbox and persists to this localStorage key */
    dontAskKey?: string
    onConfirm: () => void
    onClose: () => void
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmText,
    cancelText,
    dontAskKey,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    const { t } = useI18n()
    const titleId = useId()
    const [dontAsk, setDontAsk] = useState(false)
    const confirmButtonRef = useRef<HTMLButtonElement>(null)

    // Auto-focus the cancel button when opened (safer default)
    const cancelButtonRef = useRef<HTMLButtonElement>(null)
    useEffect(() => {
        if (open) {
            setDontAsk(false)
            // Small delay so the portal renders fully before focusing
            const id = setTimeout(() => cancelButtonRef.current?.focus(), 30)
            return () => clearTimeout(id)
        }
    }, [open])

    // ESC to close
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    if (!open) return null

    const portalHost = document.getElementById('pebble-portal') ?? document.body

    const handleConfirm = () => {
        if (dontAskKey && dontAsk) {
            try { localStorage.setItem(dontAskKey, 'false') } catch { /* noop */ }
        }
        onConfirm()
    }

    const confirmLabel = confirmText ?? t('confirm.defaultConfirm')
    const cancelLabel = cancelText ?? t('actions.close')

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ isolation: 'isolate' }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[rgba(6,10,18,0.52)] backdrop-blur-[3px]"
                aria-hidden="true"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={[
                    'relative z-10 w-full max-w-[380px]',
                    'pebble-confirm-dialog p-6 flex flex-col gap-4',
                    'animate-[fadeInScale_180ms_ease-out]',
                ].join(' ')}
            >
                {/* Title */}
                <h2
                    id={titleId}
                    className="text-base font-semibold text-pebble-text-primary"
                >
                    {title}
                </h2>

                {/* Description */}
                <p className="text-sm leading-relaxed text-pebble-text-secondary">
                    {description}
                </p>

                {/* Don't ask again */}
                {dontAskKey && (
                    <label className="pebble-confirm-checkbox-row flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm text-pebble-text-secondary">
                        <input
                            type="checkbox"
                            checked={dontAsk}
                            onChange={(e) => setDontAsk(e.target.checked)}
                            className="h-3.5 w-3.5 accent-pebble-accent"
                        />
                        <span>{t('confirm.dontAskAgain')}</span>
                    </label>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onClose}
                        className={[
                            'pebble-modal-control border border-pebble-border/35 bg-pebble-panel/80',
                            'px-4 py-2 text-sm font-medium text-pebble-text-secondary',
                            'shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-border/50',
                        ].join(' ')}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={handleConfirm}
                        className={[
                            'pebble-modal-control border border-pebble-warning/40 bg-pebble-warning/18',
                            'px-4 py-2 text-sm font-semibold text-pebble-warning',
                            'shadow-[0_12px_26px_rgba(245,158,11,0.16)] transition hover:bg-pebble-warning/24',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-warning/40',
                        ].join(' ')}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        portalHost,
    )
}
