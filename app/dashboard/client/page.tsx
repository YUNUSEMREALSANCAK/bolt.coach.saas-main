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

// --- Güncellenmiş Interface Tanımları ---
interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  user_type: string;
}

interface Exercise {
  id: number; name: string; sets: number; reps: string; notes: string | null; order_index: number;
}
interface TrainingDay {
  id: number; day_name: string; order_index: number; exercises: Exercise[];
}
interface TrainingProgram {
  id: number; name: string; description: string | null; training_days: TrainingDay[];
}

interface Meal {
  id: number;
  meal_name: string;
  description: string | null;
  calories: number | null;
  order_index: number;
}

interface DietDay {
  id: number;
  day_name: string;
  order_index: number;
  meals: Meal[];
}

interface DietPlan {
  id: number;
  name: string;
  description: string | null;
  target_calories: number | null;
  diet_days: DietDay[];
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
  const [completedTrainingDays, setCompletedTrainingDays] = useState<Set<number>>(new Set());
  const [completedMeals, setCompletedMeals] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // app/dashboard/client/page.tsx DOSYASINI GÜNCELLE

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

      if (coachRelation) {
        const relation = coachRelation as any;
        if (relation.coach) {
          setCoach(Array.isArray(relation.coach) ? relation.coach[0] : relation.coach);
        }
      }

      const { data: assignmentData } = await supabase
        .from('client_assignments')
        .select(`
          training_program:training_programs(
            id,
            name,
            description,
            training_days(
              id,
              day_name,
              order_index,
              exercises(
                id,
                name,
                sets,
                reps,
                notes,
                order_index
              )
            )
          ),
          diet_plan:diet_plans(
            id,
            name,
            description,
            target_calories,
            diet_days(
              id,
              day_name,
              order_index,
              meals(
                id,
                meal_name,
                description,
                calories,
                order_index
              )
            )
          )
        `)
        .eq('client_id', typedProfile.id)
        .maybeSingle();

      if (assignmentData) {
        const data = assignmentData as any;
        
        const trainingProgram = Array.isArray(data.training_program) ? data.training_program[0] : data.training_program;
        const dietPlan = Array.isArray(data.diet_plan) ? data.diet_plan[0] : data.diet_plan;

        if (trainingProgram && trainingProgram.training_days) {
          trainingProgram.training_days.sort((a: TrainingDay, b: TrainingDay) => a.order_index - b.order_index);
          for (const day of trainingProgram.training_days) {
            if (day.exercises) {
              day.exercises.sort((a: Exercise, b: Exercise) => a.order_index - b.order_index);
            }
          }
        }

        if (dietPlan && dietPlan.diet_days) {
           dietPlan.diet_days.sort((a: DietDay, b: DietDay) => a.order_index - b.order_index);
           for (const day of dietPlan.diet_days) {
             if (day.meals) {
                day.meals.sort((a: Meal, b: Meal) => a.order_index - b.order_index);
             }
           }
        }
        
        setAssignment({
          training_program: trainingProgram || null,
          diet_plan: dietPlan || null,
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: progressData } = await supabase
        .from('progress_logs')
        .select('log_type, related_id')
        .eq('client_id', typedProfile.id)
        .gte('completed_at', `${today} 00:00:00`);

      if (progressData) {
        const logs = progressData as Array<{ log_type: string; related_id: number }>;
        const trainingDayIds = new Set(
          logs.filter(p => p.log_type === 'training').map(p => p.related_id)
        );
        const mealIds = new Set(
          logs.filter(p => p.log_type === 'diet_meal').map(p => p.related_id)
        );
        setCompletedTrainingDays(trainingDayIds);
        setCompletedMeals(mealIds);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  async function toggleTrainingDay(dayId: number) {
    if (!profile || completedTrainingDays.has(dayId)) return;
    const { error } = await supabase.from('progress_logs').insert({ client_id: profile.id, log_type: 'training', related_id: dayId });
    if (!error) setCompletedTrainingDays(new Set(completedTrainingDays).add(dayId));
  }

  async function toggleMeal(mealId: number) {
    if (!profile || completedMeals.has(mealId)) return;
    const { error } = await supabase.from('progress_logs').insert({ client_id: profile.id, log_type: 'diet_meal', related_id: mealId });
    if (!error) setCompletedMeals(new Set(completedMeals).add(mealId));
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
              <>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{assignment.training_program.name}</h2>
                  {assignment.training_program.description && <p className="text-slate-600">{assignment.training_program.description}</p>}
                </div>
                <div className="space-y-4">
                  {assignment.training_program.training_days.map((day) => {
                    const isCompleted = completedTrainingDays.has(day.id);
                    return (
                      <Card key={day.id} className={isCompleted ? 'border-green-200 bg-green-50' : ''}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CardTitle className="text-lg">{day.day_name}</CardTitle>
                              {isCompleted && <Badge variant="secondary" className="bg-green-100 text-green-800">Completed Today</Badge>}
                            </div>
                            <Button variant={isCompleted ? "secondary" : "default"} size="sm" onClick={() => toggleTrainingDay(day.id)} disabled={isCompleted}>
                              {isCompleted ? (<><CheckCircle2 className="h-4 w-4 mr-2" />Completed</>) : (<><Circle className="h-4 w-4 mr-2" />Mark Complete</>)}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {day.exercises.map((exercise) => (
                              <div key={exercise.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900">{exercise.name}</div>
                                  <div className="text-sm text-slate-600">{exercise.sets} sets × {exercise.reps} reps</div>
                                  {exercise.notes && <div className="text-sm text-slate-500 mt-1">{exercise.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
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

          {/* app/dashboard/client/page.tsx içindeki <TabsContent value="diet"> ... </TabsContent> bloğunu GÜNCELLE */}

          <TabsContent value="diet" className="space-y-4">
            {assignment?.diet_plan ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {assignment.diet_plan.name}
                  </h2>
                  {assignment.diet_plan.target_calories && (
                    <p className="text-slate-600">Target: {assignment.diet_plan.target_calories} calories/day</p>
                  )}
                  {assignment.diet_plan.description && (
                    <p className="text-slate-600 mt-1">{assignment.diet_plan.description}</p>
                  )}
                </div>

                <div className="space-y-6">
                  {assignment.diet_plan.diet_days
                    .map((day) => (
                      <div key={day.id}>
                        <h3 className="text-xl font-semibold text-slate-800 mb-3">{day.day_name}</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {day.meals.map((meal) => {
                              const isCompleted = completedMeals.has(meal.id);
                              return (
                                <Card key={meal.id} className={isCompleted ? 'border-green-200 bg-green-50' : ''}>
                                  <CardHeader>
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-lg">{meal.meal_name}</CardTitle>
                                      {meal.calories && (
                                        <Badge variant="secondary">{meal.calories} cal</Badge>
                                      )}
                                    </div>
                                    {isCompleted && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                                        Completed Today
                                      </Badge>
                                    )}
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {meal.description && (
                                      <p className="text-slate-600 text-sm">{meal.description}</p>
                                    )}
                                    <Button
                                      variant={isCompleted ? "secondary" : "default"}
                                      size="sm"
                                      className="w-full"
                                      onClick={() => toggleMeal(meal.id)}
                                      disabled={isCompleted}
                                    >
                                      {isCompleted ? (
                                        <>
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Completed
                                        </>
                                      ) : (
                                        <>
                                          <Circle className="h-4 w-4 mr-2" />
                                          Mark Complete
                                        </>
                                      )}
                                    </Button>
                                  </CardContent>
                                </Card>
                              );
                            })}
                        </div>
                      </div>
                  ))}
                </div>
              </>
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