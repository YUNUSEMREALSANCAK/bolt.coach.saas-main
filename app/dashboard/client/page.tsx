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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dumbbell, User, Calendar, MessageSquare, LogOut, UserX } from 'lucide-react';
import { toast } from 'sonner';

// --- Güncellenmiş Interface Tanımları ---
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
  const [isTerminating, setIsTerminating] = useState(false);

  useEffect(() => {
    async function loadData() {
      console.log('ClientDashboard: Veri yükleme işlemi başladı.');
      setLoading(true);

      const { profile: userProfile, error } = await getCurrentProfile();

      if (error || !userProfile) {
        console.error('ClientDashboard: Profil alınamadı veya hata oluştu. Giriş sayfasına yönlendiriliyor.', error);
        router.push('/sign-in');
        return;
      }

      const typedProfile = userProfile as Profile;
      console.log('ClientDashboard: Oturum açan kullanıcının profili getirildi.', typedProfile);

      if (typedProfile.user_type !== 'client') {
        console.log('ClientDashboard: Kullanıcı tipi "client" değil. Koç paneline yönlendiriliyor.');
        router.push('/dashboard/coach');
        return;
      }

      setProfile(typedProfile);

      const { data: coachRelation } = await supabase
        .from('client_coach_relations')
        .select(`
          coach:profiles!client_coach_relations_coach_id_fkey(
            id,
            full_name,
            email,
            avatar_url,
            user_type
          )
        `)
        .eq('client_id', typedProfile.id)
        .eq('status', 'active')
        .maybeSingle();

      console.log('ClientDashboard: Koç ilişki sorgusu sonucu:', coachRelation);
      if (coachRelation) {
        const relation = coachRelation as any;
        if (relation.coach) {
          setCoach(Array.isArray(relation.coach) ? relation.coach[0] : relation.coach);
          console.log('ClientDashboard: Koç bilgisi state\'e kaydedildi.', Array.isArray(relation.coach) ? relation.coach[0] : relation.coach);
        }
      }

      const { data: assignmentData } = await supabase
        .from('client_assignments')
        .select(`
          training_program:training_programs(id, name, description),
          diet_plan:diet_plans(id, name, description)
        `)
        .eq('client_id', typedProfile.id)
        .maybeSingle();

      console.log('ClientDashboard: Program atama sorgusu sonucu (assignmentData):', assignmentData);
      
      if (assignmentData) {
        const data = assignmentData as any;
        setAssignment({
          training_program: Array.isArray(data.training_program) ? data.training_program[0] : data.training_program,
          diet_plan: Array.isArray(data.diet_plan) ? data.diet_plan[0] : data.diet_plan
        });
        console.log('ClientDashboard: Atama bilgisi state\'e kaydedildi.');
      } else {
        console.warn('ClientDashboard: Bu danışan için atanmış program bulunamadı.');
      }

      setLoading(false);
      console.log('ClientDashboard: Veri yükleme tamamlandı.');
    }

    loadData();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  async function handleTerminateCollaboration() {
    if (!profile || !coach) return;

    setIsTerminating(true);

    const { error } = await supabase
      .from('client_coach_relations')
      .update({ status: 'inactive' })
      .eq('client_id', profile.id)
      .eq('coach_id', coach.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error terminating collaboration:', error);
      toast.error('Failed to end collaboration. Please try again.');
      setIsTerminating(false);
    } else {
      toast.success("Collaboration with your coach has been ended.");
      // Arayüzü güncellemek için coach state'ini null yapıyoruz.
      // Bu, "Your Coach" kartının kaybolmasını sağlar.
      setCoach(null);
      // Sayfayı yeniden yüklemek de bir seçenek olabilirdi: router.refresh();
    }
    // Hata durumunda butonun tekrar aktif olması için false'a çekiyoruz.
    // Başarılı durumda zaten kart kaybolacağı için state'in bir önemi kalmıyor.
    if (!error) return;
    setIsTerminating(false);
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
      {/* ... Nav bar olduğu gibi kalacak ... */}
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
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar><AvatarFallback className="bg-slate-900 text-white">{coach.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback></Avatar>
                <div>
                  <div className="font-medium">{coach.full_name}</div>
                  <div className="text-sm text-slate-600">{coach.email}</div>
                </div>
              </div>
              <div className="flex flex-col items-end sm:flex-row sm:justify-end gap-2">
                <Link href={`/dashboard/client/messages/${coach.id}`}>
                  <Button variant="outline"><MessageSquare className="h-4 w-4 mr-2" />Message</Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <UserX className="h-4 w-4 mr-2" />
                      End Collaboration
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will terminate your professional relationship with {coach.full_name}. You will no longer have access to the programs they assigned. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isTerminating}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleTerminateCollaboration} disabled={isTerminating} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isTerminating ? 'Terminating...' : 'Yes, Terminate'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                    <Button className="w-full"><Calendar className="h-4 w-4 mr-2" />View Program</Button>
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