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
import { Badge } from '@/components/ui/badge';
import { Dumbbell, User, Calendar, MessageSquare, LogOut, CheckCircle2, Circle } from 'lucide-react';

// --- Interface Tanımları (Değişiklik yok) ---
interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  user_type: string;
}

interface TrainingProgram {
  id: number; name: string; description: string | null;
}
interface DietPlan {
  id: number; name: string; description: string | null;
}

interface Assignment {
  training_program: TrainingProgram | null;
  diet_plan: DietPlan | null;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coach, setCoach] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { profile: userProfile, error } = await getCurrentProfile();

      if (error || !userProfile) {
        router.push('/sign-in');
        return;
      }
      
      const typedProfile = userProfile as Profile;

      if (typedProfile.user_type !== 'client') {
        router.push('/dashboard/coach');
        return;
      }

      setProfile(typedProfile);
      
      // Promise.all ile verileri paralel olarak çekelim
      const [coachRelationResult, assignmentResult] = await Promise.all([
        supabase
          .from('client_coach_relations')
          .select(`coach:profiles!client_coach_relations_coach_id_fkey(id, full_name, email, avatar_url, user_type)`)
          .eq('client_id', typedProfile.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('client_assignments')
          .select(`
            training_program:training_program_id(id, name, description),
            diet_plan:diet_plan_id(id, name, description)
          `)
          .eq('client_id', typedProfile.id)
          .maybeSingle()
      ]);

      // Koç bilgisini state'e kaydedelim
      if (coachRelationResult.data?.coach) {
        // Supabase bazen tekil ilişkiyi dizi olarak dönebilir, bunu kontrol edelim.
        const coachData = Array.isArray(coachRelationResult.data.coach) ? coachRelationResult.data.coach[0] : coachRelationResult.data.coach;
        setCoach(coachData as Profile);
      }

      // Atama bilgisini state'e kaydedelim
      if (assignmentResult.data) {
         setAssignment({
           training_program: assignmentResult.data.training_program as TrainingProgram | null,
           diet_plan: assignmentResult.data.diet_plan as DietPlan | null
         });
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
            <Link href="/dashboard/client" className="flex items-center space-x-2">
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Dashboard</h1>
          <p className="text-slate-600">Track your progress and follow your programs</p>
        </div>

        {coach && (
          <Card className="mb-8">
            <CardHeader><CardTitle className="text-lg">Your Coach</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar><AvatarFallback className="bg-slate-900 text-white">{coach.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{coach.full_name}</div>
                    <div className="text-sm text-slate-600">{coach.email}</div>
                  </div>
                </div>
                <Link href={`/dashboard/client/messages/${coach.id}`}>
                  <Button variant="outline"><MessageSquare className="h-4 w-4 mr-2" />Message</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="training" className="space-y-6">
          <TabsList>
            <TabsTrigger value="training">Training Program</TabsTrigger>
            <TabsTrigger value="diet">Diet Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-4">
            {assignment?.training_program ? (
              <Card>
                <CardHeader>
                  <CardTitle>{assignment.training_program.name}</CardTitle>
                  {assignment.training_program.description && <CardDescription>{assignment.training_program.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <Link href={`/dashboard/client/programs/${assignment.training_program.id}?type=training`}>
                    <Button className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Program
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No training program assigned</h3>
                  <p className="text-slate-600">Your coach will assign you a program soon</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="diet" className="space-y-4">
            {assignment?.diet_plan ? (
               <Card>
                <CardHeader>
                  <CardTitle>{assignment.diet_plan.name}</CardTitle>
                  {assignment.diet_plan.description && <CardDescription>{assignment.diet_plan.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <Link href={`/dashboard/client/programs/${assignment.diet_plan.id}?type=diet`}>
                    <Button className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      View Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No diet plan assigned</h3>
                  <p className="text-slate-600">Your coach will assign you a diet plan soon</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}