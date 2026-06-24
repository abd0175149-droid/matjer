'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';

// هيرو سينمائي بتأثير parallax عند التمرير (mds/13 §6)
export default function HeroCinematic() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '60%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="my-6 rounded-3xl overflow-hidden relative card-luxe h-[440px]">
      {/* طبقة الخلفية المتحرّكة */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-0">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--gold-deep), var(--gold))' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/hero-gold/1600/900" alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0, transparent 45%)' }} />
      </motion.div>

      {/* النص */}
      <motion.div style={{ y: textY, opacity }} className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 text-white">
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight max-w-xl">
          إكسسوارات الذهب التقليدي
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }} className="text-white/90 text-lg mb-8 max-w-lg">
          أطقم وخواتم وأساور وقلادات — ذهب روسي وصيني بأسعار ثابتة وجودة مضمونة.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }}>
          <Link href="/category/sets" className="bg-white text-gold-deep font-extrabold rounded-xl px-8 py-3.5 inline-block hover:scale-105 transition-transform">تسوّق الآن</Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
