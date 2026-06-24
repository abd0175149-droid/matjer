'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { apiPost } from '@/lib/api';

export default function WishlistButton({ productId }: { productId: number }) {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      await apiPost(`/wishlist/${productId}`, undefined, token);
      setAdded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={onClick} disabled={loading} className="btn-outline">
      {added ? '♥ في المفضلة' : '♡ أضف للمفضلة'}
    </button>
  );
}
