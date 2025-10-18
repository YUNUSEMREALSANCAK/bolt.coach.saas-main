'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';

export default function AddClientPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { profile } = await getCurrentProfile();

    if (!profile || profile.user_type !== 'coach') {
      setError('You must be a coach to add clients');
      setLoading(false);
      return;
    }

    const { data: clientProfile, error: clientError } = await supabase
      .from('profiles')
      .select('id, email, user_type')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (clientError || !clientProfile) {
      setError('Client not found with this email');
      setLoading(false);
      return;
    }

    if (clientProfile.user_type !== 'client') {
      setError('This user is not registered as a client');
      setLoading(false);
      return;
    }

    const { error: relationError } = await supabase
      .from('client_coach_relations')
      .insert({
        coach_id: profile.id,
        client_id: clientProfile.id,
        status: 'active',
      });

    if (relationError) {
      if (relationError.code === '23505') {
        setError('This client is already added to your list');
      } else {
        setError('Failed to add client');
      }
      setLoading(false);
      return;
    }

    setSuccess('Client added successfully!');
    setTimeout(() => {
      router.push('/dashboard/coach');
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/coach">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Add New Client</CardTitle>
            <CardDescription>
              Enter the email address of your client. They must already have a FitTrack account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddClient} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 text-green-900 border-green-200">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Client Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Adding client...' : 'Add client'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
