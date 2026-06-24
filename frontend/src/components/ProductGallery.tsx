'use client';
import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/cn';

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const imgs = images.length ? images : [];
  const [emblaRef, embla] = useEmblaCarousel({ direction: 'rtl', loop: imgs.length > 1 });
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState(false);

  const onThumb = useCallback((i: number) => { embla?.scrollTo(i); setSelected(i); }, [embla]);
  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSel);
    return () => { embla.off('select', onSel); };
  }, [embla]);

  if (!imgs.length) return <div className="card aspect-square bg-muted grid place-items-center text-muted-foreground">لا صورة</div>;

  return (
    <div>
      <div className="card overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {imgs.map((src, i) => (
            <div key={i} className="flex-[0_0_100%] aspect-square bg-muted cursor-zoom-in" onClick={() => setZoom(true)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
      {imgs.length > 1 && (
        <div className="flex gap-2 mt-3">
          {imgs.map((src, i) => (
            <button key={i} onClick={() => onThumb(i)} className={cn('w-16 h-16 rounded-lg overflow-hidden border-2 transition', i === selected ? 'border-gold' : 'border-transparent opacity-70')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 bg-black/85 z-50 grid place-items-center p-4 cursor-zoom-out animate-fade-in" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgs[selected]} alt={name} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
