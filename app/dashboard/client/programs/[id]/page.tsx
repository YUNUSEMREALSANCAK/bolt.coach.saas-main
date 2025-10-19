'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';

// TypeScript için veri yapılarını tanımlayalım
interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
  notes: string | null;
  order_index: number;
}
interface TrainingDay {
  id: number;
  day_name: string;
  order_index: number;
  exercises: Exercise[];
}
interface TrainingProgram {
  id: number;
  name: string;
  description: string | null;
  training_days: TrainingDay[];
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

export default function ClientProgramDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const programId = params.id as string;
  const programType = searchParams.get('type');

  const [program, setProgram] = useState<TrainingProgram | DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!programId || !programType) {
      router.push('/dashboard/client');
      return;
    }

    async function loadProgramDetails() {
      setLoading(true);
      setError('');
      
      const { profile: clientProfile } = await getCurrentProfile();
      if (!clientProfile) {
        router.push('/sign-in');
        return;
      }

      let query;
      if (programType === 'training') {
        query = supabase
          .from('training_programs')
          .select(`
            id, name, description,
            training_days (
              id, day_name, order_index,
              exercises (
                id, name, sets, reps, notes, order_index
              )
            )
          `)
          .eq('id', programId)
          .single();
      } else if (programType === 'diet') {
        query = supabase
          .from('diet_plans')
          .select(`
            id, name, description, target_calories,
            diet_days (
              id, day_name, order_index,
              meals (
                id, meal_name, description, calories, order_index
              )
            )
          `)
          .eq('id', programId)
          .single();
      } else {
        setError('Invalid program type.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await query;

      if (queryError || !data) {
        setError('Program not found.');
        setLoading(false);
        return;
      }
      
      // Gelen veriyi sıralayalım
      if (programType === 'training') {
        const prog = data as TrainingProgram;
        prog.training_days.sort((a, b) => a.order_index - b.order_index);
        prog.training_days.forEach(day => day.exercises.sort((a, b) => a.order_index - b.order_index));
        setProgram(prog);
      } else if (programType === 'diet') {
        const plan = data as DietPlan;
        plan.diet_days.sort((a, b) => a.order_index - b.order_index);
        plan.diet_days.forEach(day => day.meals.sort((a, b) => a.order_index - b.order_index));
        setProgram(plan);
      }

      setLoading(false);
    }

    loadProgramDetails();
  }, [programId, programType, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading program details...</div>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/dashboard/client">
          <Button variant="outline">Go back to Dashboard</Button>
        </Link>
      </div>
    );
  }
  
  if (!program) return null;
  
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard/client">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{program.name}</CardTitle>
            {program.description && <CardDescription className="text-md pt-2">{program.description}</CardDescription>}
            {programType === 'diet' && 'target_calories' in program && program.target_calories && (
              <CardDescription className="text-md pt-1">Target: {program.target_calories} calories/day</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {programType === 'training' && 'training_days' in program && (
              (program as TrainingProgram).training_days.map(day => (
                <Card key={day.id} className="bg-white">
                  <CardHeader><CardTitle className="text-xl">{day.day_name}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {day.exercises.length > 0 ? day.exercises.map(ex => (
                      <div key={ex.id} className="p-4 bg-slate-50 rounded-lg border">
                        <p className="font-semibold text-slate-800">{ex.name}</p>
                        <p className="text-sm text-slate-600">{ex.sets} sets × {ex.reps} reps</p>
                        {ex.notes && <p className="text-xs text-slate-500 mt-1">Notes: {ex.notes}</p>}
                      </div>
                    )) : <p className="text-sm text-slate-500">No exercises for this day.</p>}
                  </CardContent>
                </Card>
              ))
            )}

            {programType === 'diet' && 'diet_days' in program && (
              (program as DietPlan).diet_days.map(day => (
                <Card key={day.id} className="bg-white">
                  <CardHeader><CardTitle className="text-xl">{day.day_name}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {day.meals.length > 0 ? day.meals.map(meal => (
                      <div key={meal.id} className="p-4 bg-slate-50 rounded-lg border">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-slate-800">{meal.meal_name}</p>
                          {meal.calories && <p className="text-sm font-medium text-slate-700">{meal.calories} cal</p>}
                        </div>
                        {meal.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{meal.description}</p>}
                      </div>
                    )) : <p className="text-sm text-slate-500">No meals for this day.</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}