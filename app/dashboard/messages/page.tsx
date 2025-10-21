'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dumbbell, LogOut, MessageSquare, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  user_type: 'coach' | 'client';
}

interface Conversation {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  last_message_content: string;
  last_message_created_at: string;
  is_last_message_read: boolean;
}

export default function MessagesListPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { profile: userProfile, error } = await getCurrentProfile();
      if (error || !userProfile) {
        router.push('/sign-in');
        return;
      }
      setProfile(userProfile);

      const { data: convosData, error: convosError } = await supabase.rpc('get_conversations', {
        current_user_id: userProfile.id,
      });

      if (convosError) {
        console.error('Error fetching conversations:', convosError.message);
      } else if (convosData) {
        setConversations(convosData);
      }

      setLoading(false);
    };

    loadData();

    const channel = supabase
      .channel('messages-list-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadData();
      })
      .subscribe();

    // Bileşen kaldırıldığında aboneliği temizle
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // router'ı bağımlılıklarda tutmak genellikle güvenlidir.

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading conversations...</div>;
  }
  
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
       <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={profile.user_type === 'coach' ? '/dashboard/coach' : '/dashboard/client'} className="flex items-center space-x-2">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Messages</h1>
        <Card>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="text-center p-16">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No conversations yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.user_type === 'coach' ? 'Start a conversation from a client\'s profile.' : 'Your coach will appear here when they message you.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {conversations.map((convo) => (
                  <li key={convo.profile_id}>
                    <Link href={`/dashboard/messages/${convo.profile_id}`} className="block hover:bg-muted/50 transition-colors">
                      <div className="flex items-center p-4">
                        <Avatar className="h-12 w-12">
                           <AvatarFallback className="bg-primary text-primary-foreground">
                            {convo.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between items-baseline">
                             <p className={`font-semibold ${!convo.is_last_message_read ? 'text-foreground' : 'text-muted-foreground'}`}>{convo.full_name}</p>
                             <p className="text-xs text-muted-foreground">
                               {formatDistanceToNow(new Date(convo.last_message_created_at), { addSuffix: true })}
                             </p>
                          </div>
                          <p className={`text-sm truncate ${!convo.is_last_message_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {convo.last_message_content}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}