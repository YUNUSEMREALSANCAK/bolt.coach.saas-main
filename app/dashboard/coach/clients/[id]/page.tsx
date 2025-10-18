'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, MessageSquare, Calendar, User } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  user_type: string;
}

interface TrainingProgram {
  id: number;
  name: string;
  description: string | null;
}

interface DietPlan {
  id: number;
  name: string;
  description: string | null;
}

interface Assignment {
  id: number;
  training_program_id: number | null;
  diet_plan_id: number | null;
}

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Profile | null>(null);
  const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [selectedTrainingProgram, setSelectedTrainingProgram] = useState<string>('');
  const [selectedDietPlan, setSelectedDietPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      const { profile: coachProfile } = await getCurrentProfile();

      if (!coachProfile || coachProfile.user_type !== 'coach') {
        router.push('/sign-in');
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError || !clientData) {
        router.push('/dashboard/coach');
        return;
      }

      setClient(clientData as Profile);

      const { data: programsData } = await supabase
        .from('training_programs')
        .select('id, name, description')
        .eq('coach_id', coachProfile.id)
        .order('created_at', { ascending: false });

      if (programsData) {
        setTrainingPrograms(programsData);
      }

      const { data: plansData } = await supabase
        .from('diet_plans')
        .select('id, name, description')
        .eq('coach_id', coachProfile.id)
        .order('created_at', { ascending: false });

      if (plansData) {
        setDietPlans(plansData);
      }

      const { data: assignmentData } = await supabase
        .from('client_assignments')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (assignmentData) {
        setAssignment(assignmentData);
        setSelectedTrainingProgram(assignmentData.training_program_id?.toString() || '');
        setSelectedDietPlan(assignmentData.diet_plan_id?.toString() || '');
      }

      setLoading(false);
    }

    loadData();
  }, [router, clientId]);

  async function handleAssignPrograms() {
    setSaving(true);
    setError('');
    setSuccess('');

    const { profile: coachProfile } = await getCurrentProfile();

    if (!coachProfile) {
      setError('Authentication error');
      setSaving(false);
      return;
    }

    if (assignment) {
      const { error: updateError } = await supabase
        .from('client_assignments')
        .update({
          training_program_id: selectedTrainingProgram ? parseInt(selectedTrainingProgram) : null,
          diet_plan_id: selectedDietPlan ? parseInt(selectedDietPlan) : null,
        })
        .eq('id', assignment.id);

      if (updateError) {
        setError('Failed to update assignments');
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('client_assignments')
        .insert({
          client_id: clientId,
          training_program_id: selectedTrainingProgram ? parseInt(selectedTrainingProgram) : null,
          diet_plan_id: selectedDietPlan ? parseInt(selectedDietPlan) : null,
          assigned_by: coachProfile.id,
        });

      if (insertError) {
        setError('Failed to create assignments');
        setSaving(false);
        return;
      }
    }

    setSuccess('Programs assigned successfully!');
    setSaving(false);

    setTimeout(() => {
      router.push('/dashboard/coach');
    }, 1500);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard/coach">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-slate-900 text-white text-xl">
                    {client.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{client.full_name}</CardTitle>
                  <CardDescription>{client.email}</CardDescription>
                </div>
              </div>
              <Link href={`/dashboard/coach/messages/${client.id}`}>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign Programs</CardTitle>
            <CardDescription>
              Select training and diet programs to assign to this client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <Label>Training Program</Label>
              {trainingPrograms.length === 0 ? (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-600">No training programs created yet</span>
                  </div>
                  <Link href="/dashboard/coach/programs/create">
                    <Button size="sm">Create Program</Button>
                  </Link>
                </div>
              ) : (
                <Select value={selectedTrainingProgram} onValueChange={setSelectedTrainingProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a training program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No program</SelectItem>
                    {trainingPrograms.map((program) => (
                      <SelectItem key={program.id} value={program.id.toString()}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Diet Plan</Label>
              {dietPlans.length === 0 ? (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-600">No diet plans created yet</span>
                  </div>
                  <Link href="/dashboard/coach/programs/create">
                    <Button size="sm">Create Plan</Button>
                  </Link>
                </div>
              ) : (
                <Select value={selectedDietPlan} onValueChange={setSelectedDietPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a diet plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No plan</SelectItem>
                    {dietPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              onClick={handleAssignPrograms}
              className="w-full"
              disabled={saving || (trainingPrograms.length === 0 && dietPlans.length === 0)}
            >
              {saving ? 'Saving...' : 'Assign Programs'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
