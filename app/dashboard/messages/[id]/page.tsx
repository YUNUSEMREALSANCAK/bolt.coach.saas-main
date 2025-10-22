'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const otherUserId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function loadInitialData() {
      const { profile } = await getCurrentProfile();
      if (!profile) {
        router.push('/sign-in');
        return;
      }
      setCurrentUser(profile as Profile);

      const { data: otherUserData, error: otherUserError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      if (otherUserError || !otherUserData) {
        toast.error("Could not find user.");
        router.push('/dashboard/messages');
        return;
      }
      setOtherUser(otherUserData as Profile);

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('sender_id', [profile.id, otherUserId])
        .in('receiver_id', [profile.id, otherUserId])
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (messagesError) {
        toast.error("Failed to load messages.");
      } else {
        setMessages(messagesData as Message[]);
        setHasMoreMessages(messagesData.length === 15);
      }

      setLoading(false);
    }
    
    loadInitialData();
  }, [router, otherUserId]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`messages-${currentUser.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, otherUserId]);


  async function loadMoreMessages() {
    if (!currentUser || !otherUser || loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    const oldestMessage = messages[messages.length - 1];

    const { data: olderMessagesData, error: olderMessagesError } = await supabase
      .from('messages')
      .select('*')
      .in('sender_id', [currentUser.id, otherUser.id])
      .in('receiver_id', [currentUser.id, otherUser.id])
      .order('created_at', { ascending: false })
      .limit(15)
      .lt('created_at', oldestMessage.created_at);

    if (olderMessagesError) {
      toast.error("Failed to load more messages.");
    } else {
      const olderMessages = olderMessagesData as Message[];
      if (olderMessages.length < 15) {
        setHasMoreMessages(false);
      }
      setMessages(prev => [...prev, ...olderMessages]);
    }

    setLoadingMore(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser || !otherUser) return;

    const messageToSend = {
      sender_id: currentUser.id,
      receiver_id: otherUser.id,
      content: newMessage.trim(),
    };

    setNewMessage('');

    // Optimistic UI update
    const optimisticMessage: Message = { ...messageToSend, id: Date.now(), created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMessage]);

    const { error } = await supabase.from('messages').insert(messageToSend);
    if (error) {
      toast.error('Message failed to send.');
      // Revert optimistic update on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }
  }
  
  if (loading || !currentUser || !otherUser) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading chat...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center p-4 border-b sticky top-0 bg-card z-10">
        <Link href="/dashboard/messages">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5"/></Button>
        </Link>
        <div className="flex items-center space-x-3 ml-2">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {otherUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-card-foreground">{otherUser.full_name}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={loadMoreMessages}
              disabled={loadingMore}
              className="mb-4"
            >
              {loadingMore ? 'Loading...' : 'Load More Messages'}
            </Button>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender_id === currentUser.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t sticky bottom-0 bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
}