import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect — branded dropdown that fully replaces native <select>
 * Uses a React Portal so the dropdown panel is NEVER clipped by parent overflow.
 *
 * Props:
 *  value        — current value (string)
 *  onChange     — (e: { target: { value } }) => void  (matches native select API)
 *  options      — [{ value, label }]  OR  [string, ...]  (auto-converted)
 *  placeholder  — shown when value is empty
 *  className    — extra classes for the trigger button wrapper
 *  disabled
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
  const triggerRef      = useRef(null);

  // Normalise options to { value, label }
  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selected = normalised.find(o => String(o.value) === String(value));

  // Recalculate position whenever the panel opens
  const openPanel = () => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + window.scrollY + 4,
        left:  rect.left   + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(v => !v);
  };

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll',     close, true);
    window.addEventListener('resize',     close);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll',      close, true);
      window.removeEventListener('resize',      close);
    };
  }, [open]);

  const pick = (val) => {
    onChange({ target: { value: val } });
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* ── Trigger button ────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onMouseDown={(e) => { e.stopPropagation(); openPanel(); }}
        className={`
          w-full flex items-center justify-between gap-2
          bg-white border rounded-xl px-4 py-2.5
          text-sm font-medium text-left select-none
          transition-all duration-200 cursor-pointer
          ${open
            ? 'border-violet-500 ring-2 ring-violet-200 shadow-sm'
            : 'border-violet-200 hover:border-violet-400 hover:shadow-sm'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
        `}
      >
        <span className={`truncate ${selected ? 'text-violet-900' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-violet-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Portal dropdown panel ─────────────────────────────────────── */}
      {open && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top:      pos.top,
            left:     pos.left,
            width:    pos.width,
            zIndex:   99999,
          }}
          className="
            bg-white border border-violet-100
            rounded-2xl shadow-2xl shadow-violet-300/30
            overflow-hidden
            animate-[fadeIn_0.15s_ease-out]
          "
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {normalised.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={() => pick(opt.value)}
                  className={`
                    w-full flex items-center justify-between gap-3
                    px-4 py-2.5 text-sm text-left
                    transition-colors duration-100
                    ${isSelected
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-violet-900 hover:bg-violet-50 hover:text-violet-700'}
                  `}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 opacity-90" />}
                </button>
              );
            })}
            {normalised.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-400 italic text-center">No options available</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
