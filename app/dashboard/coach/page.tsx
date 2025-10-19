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
import { Dumbbell, Users, Calendar, MessageSquare, Plus, LogOut, TrendingUp } from 'lucide-react';

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
              <Calendar className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
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
                <CardContent className="py-16 text-center">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No clients yet</h3>
                  <p className="text-slate-600 mb-6">Start building your client base</p>
                  <Link href="/dashboard/coach/clients/add">
                    <Button>Add your first client</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clients.map((relation) => (
                  <Card key={relation.id} className="hover:shadow-lg transition-shadow">
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
                    <CardContent>
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/coach/clients/${relation.client_id}`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/dashboard/coach/messages/${relation.client_id}`}>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="programs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Training & Diet Programs</h2>
              <Link href="/dashboard/coach/programs/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Program
                </Button>
              </Link>
            </div>

            {trainingPrograms.length === 0 && dietPlans.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No programs yet</h3>
                  <p className="text-slate-600 mb-6">Create your first training or diet program</p>
                  <Link href="/dashboard/coach/programs/create">
                    <Button>Create program</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Training Programs</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {trainingPrograms.map((program) => (
                      <Card key={program.id}>
                        <CardHeader>
                          <CardTitle>{program.name}</CardTitle>
                          {program.description && <CardDescription>{program.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                          <Link href={`/dashboard/coach/programs/${program.id}?type=training`}>
                            <Button variant="outline" size="sm" className="w-full">View Program</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {trainingPrograms.length === 0 && <p className="text-sm text-slate-500">No training programs created yet.</p>}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Diet Plans</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dietPlans.map((plan) => (
                      <Card key={plan.id}>
                        <CardHeader>
                          <CardTitle>{plan.name}</CardTitle>
                          {plan.description && <CardDescription>{plan.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                          <Link href={`/dashboard/coach/programs/${plan.id}?type=diet`}>
                            <Button variant="outline" size="sm" className="w-full">View Plan</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {dietPlans.length === 0 && <p className="text-sm text-slate-500">No diet plans created yet.</p>}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Messages</h2>
            <Card>
              <CardContent className="py-16 text-center">
                <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No messages yet</h3>
                <p className="text-slate-600">Your conversations with clients will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}