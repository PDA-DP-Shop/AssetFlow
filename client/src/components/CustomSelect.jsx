import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect — branded dropdown that fully replaces native <select>
 *
 * Props:
 *  value        — current value (string)
 *  onChange     — (value: string) => void
 *  options      — [{ value, label }]  OR  [string, ...]  (auto-converted)
 *  placeholder  — shown when value is empty
 *  className    — extra classes for the trigger button
 *  disabled
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Normalise options to { value, label }
  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selected = normalised.find(o => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (val) => {
    onChange({ target: { value: val } });
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`
          w-full flex items-center justify-between gap-2
          bg-white border rounded-xl px-4 py-2.5
          text-sm font-medium text-left
          transition-all duration-200 cursor-pointer
          ${open
            ? 'border-violet-500 ring-2 ring-violet-200 shadow-sm'
            : 'border-violet-200 hover:border-violet-400 hover:shadow-sm'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
        `}
      >
        <span className={selected ? 'text-violet-900' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-violet-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="
            absolute z-50 mt-1.5 w-full
            bg-white border border-violet-100
            rounded-2xl shadow-xl shadow-violet-200/40
            overflow-hidden
            animate-[fadeIn_0.15s_ease-out]
          "
          style={{ minWidth: '100%' }}
        >
          <div className="max-h-56 overflow-y-auto py-1.5 custom-scrollbar">
            {normalised.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={`
                    w-full flex items-center justify-between gap-3
                    px-4 py-2.5 text-sm text-left
                    transition-colors duration-150
                    ${isSelected
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'text-violet-900 hover:bg-violet-50 hover:text-violet-700'}
                  `}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
            {normalised.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-400 italic">No options available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
