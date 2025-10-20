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
import { ThemeToggle } from '@/components/theme-toggle';
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
      setLoading(true);
      try {
        const { profile: userProfile, error } = await getCurrentProfile();

        if (error || !userProfile) {
          router.push('/sign-in');
          return;
        }

        if (userProfile.user_type !== 'client') {
          router.push('/dashboard/coach');
          return;
        }

        setProfile(userProfile as Profile);

        // Koç ve atama bilgilerini paralel olarak çek
        const [coachRelationResult, assignmentResult] = await Promise.all([
          supabase
            .from('client_coach_relations')
            .select('coach:coach_id(id, full_name, email, avatar_url)')
            .eq('client_id', userProfile.id)
            .eq('status', 'active')
            .maybeSingle(),
          supabase
            .from('client_assignments')
            .select('training_program:training_program_id(*), diet_plan:diet_plan_id(*)')
            .eq('client_id', userProfile.id)
            .maybeSingle()
        ]);

        if (coachRelationResult.error) throw coachRelationResult.error;
        if (assignmentResult.error) throw assignmentResult.error;

        if (coachRelationResult.data?.coach) {
          const coachData = coachRelationResult.data.coach;
          // Handle cases where Supabase returns a single-element array for a one-to-one relation
          setCoach((Array.isArray(coachData) ? coachData[0] : coachData) as Profile);
        }

        if (assignmentResult.data) {
          // Gelen veriyi `Assignment` tipine uygun şekilde state'e ata
          const data = assignmentResult.data as any;
          setAssignment({
            training_program: Array.isArray(data.training_program) ? data.training_program[0] : data.training_program,
            diet_plan: Array.isArray(data.diet_plan) ? data.diet_plan[0] : data.diet_plan,
          });
        }
      } catch (err: any) {
        console.error("Failed to load client dashboard data:", err);
        toast.error("Dashboard could not be loaded. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  async function handleTerminateCollaboration() {
    console.log('handleTerminateCollaboration: İşlem başlatıldı.');
    if (!profile || !coach) {
      console.error('handleTerminateCollaboration: Profil veya koç bilgisi eksik. İşlem durduruldu.', { profile, coach });
      return;
    }

    console.log('handleTerminateCollaboration: Koç ile ilişki sonlandırılıyor. Client ID:', profile.id, 'Coach ID:', coach.id);
    try {
      setIsTerminating(true);
      // Call the secure RPC function instead of a direct update
      const { data, error } = await supabase.rpc('terminate_collaboration_as_client', {
        requesting_client_id: profile.id,
      });

      if (error) {
        throw error;
      }

      console.log('handleTerminateCollaboration: RPC function result:', data);

      if (data === 'SUCCESS') {
        console.log('handleTerminateCollaboration: İlişki başarıyla "inactive" olarak güncellendi.');
        toast.success("Collaboration with your coach has been ended.");
      } else {
        // This case handles 'NOT_FOUND' or any other unexpected return value
        console.warn('handleTerminateCollaboration: RPC function reported no active relation was found.');
        toast.info("No active collaboration was found to end.");
      }

      setCoach(null); // Her durumda koçu arayüzden kaldır
    } catch (error: any) {
      console.error('handleTerminateCollaboration: "catch" bloğunda bir hata yakalandı:', error);
      toast.error(error.message || 'Failed to end collaboration. Please try again.');
    } finally {
      console.log('handleTerminateCollaboration: İşlem tamamlandı, `isTerminating` false olarak ayarlanıyor.');
      setIsTerminating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ... Nav bar olduğu gibi kalacak ... */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard/client" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">FitTrack</span>
            </Link>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">{profile.full_name}</span>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and follow your programs</p>
        </div>

        {coach && (
          <Card className="mb-8">
            <CardHeader><CardTitle className="text-lg text-card-foreground">Your Coach</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar><AvatarFallback className="bg-primary text-primary-foreground">{coach.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback></Avatar>
                <div>
                  <div className="font-medium text-card-foreground">{coach.full_name}</div>
                  <div className="text-sm text-muted-foreground">{coach.email}</div>
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
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No training program assigned</h3>
                  <p className="text-muted-foreground">Your coach will assign you a program soon</p>
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
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No diet plan assigned</h3>
                  <p className="text-muted-foreground">Your coach will assign you a diet plan soon</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}