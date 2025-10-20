'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

// Interface Tanımları
interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  notes: string;
}

interface TrainingDay {
  id: string;
  day_name: string;
  exercises: Exercise[];
}

interface Meal {
  id: string;
  meal_name: string;
  description: string;
  calories: string;
}

interface DietDay {
  id: string;
  day_name: string;
  meals: Meal[];
}

export default function CreateProgramPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'training' | 'diet'>('training');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Training Program State
  const [trainingProgramName, setTrainingProgramName] = useState('');
  const [trainingProgramDescription, setTrainingProgramDescription] = useState('');
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([
    { id: '1', day_name: 'Day 1', exercises: [{ id: '1', name: '', sets: 3, reps: '10', notes: '' }] }
  ]);

  // Diet Plan State
  const [dietPlanName, setDietPlanName] = useState('');
  const [dietPlanDescription, setDietPlanDescription] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [dietDays, setDietDays] = useState<DietDay[]>([
    { id: '1', day_name: 'Day 1', meals: [{ id: '1', meal_name: 'Breakfast', description: '', calories: '' }] }
  ]);

  // --- Training Program Functions ---
  function addTrainingDay() {
    const newDay: TrainingDay = {
      id: Date.now().toString(),
      day_name: `Day ${trainingDays.length + 1}`,
      exercises: [{ id: Date.now().toString(), name: '', sets: 3, reps: '10', notes: '' }]
    };
    setTrainingDays([...trainingDays, newDay]);
  }

  function removeTrainingDay(dayId: string) {
    setTrainingDays(trainingDays.filter((d: TrainingDay) => d.id !== dayId));
  }

  function updateTrainingDay(dayId: string, value: string) {
    setTrainingDays(trainingDays.map((d: TrainingDay) =>
      d.id === dayId ? { ...d, day_name: value } : d
    ));
  }

  function addExercise(dayId: string) {
    setTrainingDays(trainingDays.map((d: TrainingDay) =>
      d.id === dayId
        ? { ...d, exercises: [...d.exercises, { id: Date.now().toString(), name: '', sets: 3, reps: '10', notes: '' }] }
        : d
    ));
  }

  function removeExercise(dayId: string, exerciseId: string) {
    setTrainingDays(trainingDays.map((d: TrainingDay) =>
      d.id === dayId
        ? { ...d, exercises: d.exercises.filter((e: Exercise) => e.id !== exerciseId) }
        : d
    ));
  }

  function updateExercise(dayId: string, exerciseId: string, field: keyof Exercise, value: string | number) {
    setTrainingDays(trainingDays.map((d: TrainingDay) =>
      d.id === dayId
        ? { ...d, exercises: d.exercises.map((e: Exercise) => e.id === exerciseId ? { ...e, [field]: value } : e) }
        : d
    ));
  }
  
  // --- Diet Plan Functions ---
  function addDietDay() {
    const newDay: DietDay = {
      id: Date.now().toString(),
      day_name: `Day ${dietDays.length + 1}`,
      meals: [{ id: Date.now().toString(), meal_name: 'Breakfast', description: '', calories: '' }]
    };
    setDietDays([...dietDays, newDay]);
  }

  function removeDietDay(dayId: string) {
    setDietDays(dietDays.filter((d: DietDay) => d.id !== dayId));
  }
  
  function updateDietDayName(dayId: string, name: string) {
    setDietDays(dietDays.map((day: DietDay) => day.id === dayId ? { ...day, day_name: name } : day));
  }

  function addMeal(dayId: string) {
    setDietDays(dietDays.map((d: DietDay) =>
      d.id === dayId
        ? { ...d, meals: [...d.meals, { id: Date.now().toString(), meal_name: `Meal ${d.meals.length + 1}`, description: '', calories: '' }] }
        : d
    ));
  }

  function removeMeal(dayId: string, mealId: string) {
    setDietDays(dietDays.map((d: DietDay) =>
      d.id === dayId
        ? { ...d, meals: d.meals.filter((m: Meal) => m.id !== mealId) }
        : d
    ));
  }

  function updateMeal(dayId: string, mealId: string, field: keyof Meal, value: string) {
    setDietDays(dietDays.map((d: DietDay) =>
      d.id === dayId
        ? { ...d, meals: d.meals.map((m: Meal) => m.id === mealId ? { ...m, [field]: value } : m) }
        : d
    ));
  }

  // --- Submission Handlers ---
  async function handleCreateTrainingProgram(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { profile } = await getCurrentProfile();
    if (!profile || profile.user_type !== 'coach') {
      setError('You must be a coach to create programs');
      setLoading(false);
      return;
    }

    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .insert({ coach_id: profile.id, name: trainingProgramName, description: trainingProgramDescription || null })
      .select().single();

    if (programError || !program) {
      setError('Failed to create training program');
      setLoading(false);
      return;
    }

    for (let i = 0; i < trainingDays.length; i++) {
        const day = trainingDays[i];
        const { data: dayData, error: dayError } = await supabase
          .from('training_days')
          .insert({ program_id: program.id, day_name: day.day_name, order_index: i })
          .select().single();
  
        if (dayError || !dayData) continue;
  
        const exercisesToInsert = day.exercises
          .filter((ex: Exercise) => ex.name.trim() !== '')
          .map((exercise: Exercise, exIndex: number) => ({
            training_day_id: dayData.id,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            notes: exercise.notes || null,
            order_index: exIndex,
          }));
        
        if (exercisesToInsert.length > 0) {
          await supabase.from('exercises').insert(exercisesToInsert);
        }
    }

    router.push('/dashboard/coach');
    router.refresh();
  }

  async function handleCreateDietPlan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { profile } = await getCurrentProfile();
    if (!profile || profile.user_type !== 'coach') {
      setError('You must be a coach to create programs');
      setLoading(false);
      return;
    }

    const { data: plan, error: planError } = await supabase
      .from('diet_plans')
      .insert({
        coach_id: profile.id,
        name: dietPlanName,
        description: dietPlanDescription || null,
        target_calories: targetCalories ? parseInt(targetCalories) : null,
      })
      .select().single();

    if (planError || !plan) {
      setError('Failed to create diet plan');
      setLoading(false);
      return;
    }

    for (let i = 0; i < dietDays.length; i++) {
      const day = dietDays[i];
      const { data: dayData, error: dayError } = await supabase
        .from('diet_days')
        .insert({ plan_id: plan.id, day_name: day.day_name, order_index: i })
        .select().single();

      if (dayError || !dayData) continue;

      const mealsToInsert = day.meals
        .filter((m: Meal) => m.meal_name.trim() !== '')
        .map((meal: Meal, mealIndex: number) => ({
          diet_day_id: dayData.id,
          meal_name: meal.meal_name,
          description: meal.description || null,
          calories: meal.calories ? parseInt(meal.calories) : null,
          order_index: mealIndex,
        }));
      
      if(mealsToInsert.length > 0) {
        await supabase.from('meals').insert(mealsToInsert);
      }
    }

    router.push('/dashboard/coach');
    router.refresh();
  }
  
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard/coach">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-card-foreground">Create New Program</CardTitle>
            <CardDescription className="text-muted-foreground">
              Build a training program or diet plan to assign to your clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'training' | 'diet')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="training">Training Program</TabsTrigger>
                <TabsTrigger value="diet">Diet Plan</TabsTrigger>
              </TabsList>
              
              <TabsContent value="training">
                <form onSubmit={handleCreateTrainingProgram} className="space-y-6 pt-6">
                  {error && <Alert variant="destructive"><AlertDescription className="text-destructive-foreground">{error}</AlertDescription></Alert>}
                  <div className="space-y-2">
                    <Label htmlFor="trainingName">Program Name</Label>
                    <Input id="trainingName" value={trainingProgramName} onChange={(e) => setTrainingProgramName(e.target.value)} placeholder="e.g., Beginner Full Body" required disabled={loading}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trainingDescription">Description (optional)</Label>
                    <Textarea id="trainingDescription" value={trainingProgramDescription} onChange={(e) => setTrainingProgramDescription(e.target.value)} placeholder="Brief description of the program" disabled={loading}/>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Training Days</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addTrainingDay}><Plus className="h-4 w-4 mr-2" />Add Day</Button>
                    </div>
                    {trainingDays.map((day: TrainingDay) => (
                      <Card key={day.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <Input value={day.day_name} onChange={(e) => updateTrainingDay(day.id, e.target.value)} className="max-w-xs"/>
                            {trainingDays.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeTrainingDay(day.id)}><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {day.exercises.map((exercise: Exercise) => (
                            <div key={exercise.id} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <Input value={exercise.name} onChange={(e) => updateExercise(day.id, exercise.id, 'name', e.target.value)} placeholder="Exercise name" className="flex-1"/>
                                {day.exercises.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeExercise(day.id, exercise.id)}><Trash2 className="h-4 w-4" /></Button>}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Sets</Label>
                                  <Input type="number" value={exercise.sets} onChange={(e) => updateExercise(day.id, exercise.id, 'sets', parseInt(e.target.value))} min="1"/>
                                </div>
                                <div>
                                  <Label className="text-xs">Reps</Label>
                                  <Input value={exercise.reps} onChange={(e) => updateExercise(day.id, exercise.id, 'reps', e.target.value)} placeholder="e.g., 10 or 8-12"/>
                                </div>
                              </div>
                              <Input value={exercise.notes} onChange={(e) => updateExercise(day.id, exercise.id, 'notes', e.target.value)} placeholder="Notes (optional)"/>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => addExercise(day.id)} className="w-full"><Plus className="h-4 w-4 mr-2" />Add Exercise</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Create Training Program'}</Button>
                </form>
              </TabsContent>

              <TabsContent value="diet">
                <form onSubmit={handleCreateDietPlan} className="space-y-6 pt-6">
                  {error && <Alert variant="destructive"><AlertDescription className="text-destructive-foreground">{error}</AlertDescription></Alert>}
                  <div className="space-y-2">
                    <Label htmlFor="dietName">Diet Plan Name</Label>
                    <Input id="dietName" value={dietPlanName} onChange={(e) => setDietPlanName(e.target.value)} placeholder="e.g., 2000 Calorie Meal Plan" required disabled={loading}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dietDescription">Description (optional)</Label>
                    <Textarea id="dietDescription" value={dietPlanDescription} onChange={(e) => setDietPlanDescription(e.target.value)} placeholder="Brief description of the diet plan" disabled={loading}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetCalories">Target Calories (optional)</Label>
                    <Input id="targetCalories" type="number" value={targetCalories} onChange={(e) => setTargetCalories(e.target.value)} placeholder="e.g., 2000" disabled={loading}/>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Diet Days</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addDietDay}><Plus className="h-4 w-4 mr-2" />Add Day</Button>
                    </div>
                    {dietDays.map((day: DietDay) => (
                      <Card key={day.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <Input value={day.day_name} onChange={(e) => updateDietDayName(day.id, e.target.value)} className="max-w-xs"/>
                            {dietDays.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeDietDay(day.id)}><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {day.meals.map((meal: Meal) => (
                            <div key={meal.id} className="p-3 border rounded-lg space-y-2">
                              <div className="flex items-center space-x-2">
                                <Input value={meal.meal_name} onChange={(e) => updateMeal(day.id, meal.id, 'meal_name', e.target.value)} placeholder="Meal name (e.g., Breakfast)" className="flex-1"/>
                                {day.meals.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeMeal(day.id, meal.id)}><Trash2 className="h-4 w-4" /></Button>}
                              </div>
                              <Textarea value={meal.description} onChange={(e) => updateMeal(day.id, meal.id, 'description', e.target.value)} placeholder="Meal description and ingredients"/>
                              <Input type="number" value={meal.calories} onChange={(e) => updateMeal(day.id, meal.id, 'calories', e.target.value)} placeholder="Calories (optional)"/>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => addMeal(day.id)} className="w-full"><Plus className="h-4 w-4 mr-2" />Add Meal</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Create Diet Plan'}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}