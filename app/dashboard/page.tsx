'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';

/**
 * Bu sayfa, giriş yapmış kullanıcıları rollerine göre (coach veya client)
 * ilgili panele yönlendirmek için bir yönlendirici görevi görür.
 */
export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectUser() {
      const { profile: userProfile, error } = await getCurrentProfile();

      if (error || !userProfile) {
        // Profil alınamazsa veya hata olursa giriş sayfasına yönlendir
        router.push('/sign-in');
        return;
      }

      // Kullanıcı tipine göre yönlendirme yap
      if (userProfile.user_type === 'coach') {
        router.push('/dashboard/coach');
      } else if (userProfile.user_type === 'client') {
        router.push('/dashboard/client');
      } else {
        // Beklenmedik bir kullanıcı tipi varsa veya tip belirtilmemişse
        // varsayılan bir sayfaya veya giriş sayfasına yönlendir
        console.error('Unknown user type:', userProfile.user_type);
        router.push('/sign-in');
      }
    }

    redirectUser();
  }, [router]);

  // Yönlendirme gerçekleşirken bir yükleme ekranı göster
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-600">Redirecting...</div>
    </div>
  );
}