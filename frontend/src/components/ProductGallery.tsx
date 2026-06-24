'use client';
import { useState } from 'react';

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const imgs = images.length ? images : [];

  if (!imgs.length) {
    return <div className="card aspect-square bg-black/5 grid place-items-center text-black/30">لا صورة</div>;
  }

  return (
    <div>
      <div className="card aspect-square bg-black/5 overflow-hidden cursor-zoom-in" onClick={() => setZoom(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs[active]} alt={name} className="w-full h-full object-cover" />
      </div>
      {imgs.length > 1 && (
        <div className="flex gap-2 mt-3">
          {imgs.map((src, i) => (
            <button key={i} onClick={() => setActive(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === active ? 'border-gold' : 'border-transparent'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 bg-black/80 z-50 grid place-items-center p-4 cursor-zoom-out" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgs[active]} alt={name} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
