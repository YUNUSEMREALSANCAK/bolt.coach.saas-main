'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AddClientPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddClient() {
    if (!email) {
      toast.error('Please enter a client email.');
      return;
    }

    setIsAdding(true);
    try {
      const { profile: coachProfile } = await getCurrentProfile();
      if (!coachProfile) {
        throw new Error('Authentication error. Please sign in again.');
      }

      const { data, error } = await supabase.rpc('add_or_reactivate_client', {
        coach_id_param: coachProfile.id,
        client_email_param: email.trim(),
      });

      if (error) {
        throw error;
      }

      // Handle the response from the RPC function
      switch (data) {
        case 'CLIENT_NOT_FOUND':
          toast.error('No user found with this email.');
          break;
        case 'USER_NOT_A_CLIENT':
          toast.error('This user is not registered as a client.');
          break;
        case 'RELATION_ALREADY_ACTIVE':
          toast.error('This client is already on your active list.');
          break;
        case 'RELATION_REACTIVATED':
          toast.success('Collaboration re-established successfully!');
          router.push('/dashboard/coach');
          router.refresh();
          break;
        case 'RELATION_CREATED':
          toast.success('Client added successfully!');
          router.push('/dashboard/coach');
          router.refresh();
          break;
      }
    } catch (error: any) {
      console.error("Error adding or reactivating client:", error);
      toast.error(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/coach">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Add a New Client</CardTitle>
            <CardDescription className="text-muted-foreground">Enter the email address of the client you want to add to your list.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Client's Email</Label>
              <Input id="email" type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button onClick={handleAddClient} disabled={isAdding} className="w-full">
              {isAdding ? 'Adding...' : 'Add Client'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}