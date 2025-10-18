'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { profile, error } = await getCurrentProfile();

      if (error || !profile) {
        router.push('/sign-in');
        return;
      }

      if (profile.user_type === 'coach') {
        router.push('/dashboard/coach');
      } else {
        router.push('/dashboard/client');
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return null;
}
