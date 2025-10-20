import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dumbbell, Users, Calendar, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">FitTrack</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link href="/sign-in">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 leading-tight">
              Transform Your
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Fitness Coaching
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The complete platform for fitness coaches to manage clients, create programs, and track progress in one seamless experience.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="text-lg px-8">
                  Start free trial
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Watch demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-foreground mb-16">
              Everything you need to succeed
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-2xl p-8 hover:shadow-lg transition-shadow border">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-card-foreground mb-3">Client Management</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Keep all your clients organized in one place. Track their progress, communicate seamlessly, and build lasting relationships.
                </p>
              </div>
              <div className="bg-card rounded-2xl p-8 hover:shadow-lg transition-shadow border">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-card-foreground mb-3">Program Creation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Build custom training and diet plans in seconds. Save templates and assign them instantly to any client.
                </p>
              </div>
              <div className="bg-card rounded-2xl p-8 hover:shadow-lg transition-shadow border">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold text-card-foreground mb-3">Progress Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Monitor client progress with detailed analytics. See completion rates, workout logs, and nutrition adherence.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Ready to elevate your coaching?
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join hundreds of fitness professionals transforming their business with FitTrack.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8">
                Get started today
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 FitTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
