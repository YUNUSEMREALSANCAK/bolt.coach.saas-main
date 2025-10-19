'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Users, Calendar, MessageSquare, Plus, LogOut, TrendingUp, NotebookPen, Utensils } from 'lucide-react';

// Interface Tanımları
interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  user_type: string;
}

interface Program {
  id: number;
  name: string;
  description: string | null;
}

interface Client {
  id: number;
  client_id: string;
  status: string;
  client: Profile;
}

export default function CoachDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [trainingPrograms, setTrainingPrograms] = useState<Program[]>([]);
  const [dietPlans, setDietPlans] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { profile: userProfile, error } = await getCurrentProfile();

      if (error || !userProfile) {
        router.push('/sign-in');
        return;
      }

      if (userProfile.user_type !== 'coach') {
        router.push('/dashboard/client');
        return;
      }

      setProfile(userProfile as Profile);

      const { data: clientsData } = await supabase
        .from('client_coach_relations')
        .select(`
          id,
          client_id,
          status,
          client:profiles!client_coach_relations_client_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            user_type
          )
        `)
        .eq('coach_id', userProfile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (clientsData) {
        const formattedClients = (clientsData as any[]).map(item => ({
          id: item.id,
          client_id: item.client_id,
          status: item.status,
          client: Array.isArray(item.client) ? item.client[0] : item.client,
        }));
        setClients(formattedClients as Client[]);
      }
      
      const { data: programsData } = await supabase
        .from('training_programs')
        .select('id, name, description')
        .eq('coach_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (programsData) {
        setTrainingPrograms(programsData);
      }

      const { data: plansData } = await supabase
        .from('diet_plans')
        .select('id, name, description')
        .eq('coach_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (plansData) {
        setDietPlans(plansData);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard/coach" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Dumbbell className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">FitTrack</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">{profile.full_name}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Coach Dashboard</h1>
          <p className="text-slate-600">Manage your clients and programs</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          {/* ... Card'lar burada olduğu gibi kalacak ... */}
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Your Clients</h2>
              <Link href="/dashboard/coach/clients/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </Link>
            </div>

            {clients.length === 0 ? (
              <Card>
                {/* ... No client card içeriği ... */}
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clients.map((relation) => (
                  <Card key={relation.id} className="hover:shadow-lg transition-shadow flex flex-col">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-slate-900 text-white">
                            {relation.client.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{relation.client.full_name}</CardTitle>
                          <CardDescription>{relation.client.email}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto flex flex-col space-y-2">
                        {/* --- YENİ BUTON DÜZENİ --- */}
                        <Link href={`/dashboard/coach/clients/${relation.client_id}`}>
                          <Button variant="outline" className="w-full" size="sm">
                            <NotebookPen className="h-4 w-4 mr-2" />
                            Assign / View Details
                          </Button>
                        </Link>
                        <Link href={`/dashboard/coach/messages/${relation.client_id}`}>
                          <Button variant="outline" className="w-full" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Client
                          </Button>
                        </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="programs" className="space-y-4">
             {/* ... Programs sekmesi içeriği önceki adımdaki gibi kalacak ... */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}