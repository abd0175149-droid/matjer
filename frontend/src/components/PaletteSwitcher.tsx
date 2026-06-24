'use client';
import { useEffect, useState } from 'react';

const PALETTES = [
  { id: 'gold', label: 'ذهبي', color: '' },
  { id: 'platinum', label: 'بلاتيني', color: '#8a93a6' },
  { id: 'rose', label: 'وردي', color: '#c98a7a' },
  { id: 'emerald', label: 'زمرّدي', color: '#3f9e7a' },
];

export default function PaletteSwitcher() {
  const [active, setActive] = useState('gold');

  useEffect(() => {
    const saved = localStorage.getItem('matjer-palette') || 'gold';
    apply(saved, false);
  }, []);

  const apply = (id: string, save = true) => {
    const p = PALETTES.find((x) => x.id === id) || PALETTES[0];
    if (p.color) document.documentElement.style.setProperty('--gold', p.color);
    else document.documentElement.style.removeProperty('--gold');
    setActive(id);
    if (save) localStorage.setItem('matjer-palette', id);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60">اللون:</span>
      {PALETTES.map((p) => (
        <button
          key={p.id}
          onClick={() => apply(p.id)}
          title={p.label}
          aria-label={p.label}
          className={`w-6 h-6 rounded-full border-2 transition ${active === p.id ? 'border-white scale-110' : 'border-white/30'}`}
          style={{ background: p.color || '#c9a24b' }}
        />
      ))}
    </div>
  );
}
