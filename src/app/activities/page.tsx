
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { QuizOrPoll } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Zap, Clock, Check, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<QuizOrPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const activitiesRef = ref(db, 'quizzes');
    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const activitiesList: QuizOrPoll[] = Object.entries(data).map(([id, activity]) => ({
          id,
          ...(activity as Omit<QuizOrPoll, 'id'>),
        })).sort((a, b) => b.startTime - a.startTime);
        setActivities(activitiesList);
      } else {
        setActivities([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getActivityStatus = (item: { startTime: number; endTime: number }) => {
    const now = Date.now();
    if (now < item.startTime) {
      return <Badge variant="outline">Upcoming</Badge>;
    }
    if (now > item.endTime) {
      return <Badge variant="destructive">Ended</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Live</Badge>;
  };
  
  const handleBack = () => {
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8">
      <header className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap className="h-8 w-8 text-blue-500" />
          Earn XP
        </h1>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </header>

      <main className="max-w-5xl mx-auto">
        {loading ? (
          <p className="text-center">Loading activities...</p>
        ) : activities.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    {activity.title}
                    {getActivityStatus(activity)}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 pt-2">
                    <Badge variant="secondary" className="capitalize">{activity.questionType}</Badge>
                    <div className="flex items-center gap-1 text-blue-500 font-bold">
                        <Zap className="h-4 w-4"/>
                        <span>{activity.xp} XP</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="text-sm text-muted-foreground space-y-1">
                       <div className="flex items-center gap-2"><Calendar className="h-4 w-4"/> Starts: {format(new Date(activity.startTime), 'Pp')}</div>
                       <div className="flex items-center gap-2"><Clock className="h-4 w-4"/> Ends: {format(new Date(activity.endTime), 'Pp')}</div>
                   </div>
                   <Button className="w-full" asChild>
                       <Link href={`/quiz/${activity.id}`}>
                         {Date.now() > activity.endTime ? 'View Details' : 'Participate'}
                       </Link>
                   </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-12">
            <CardTitle>No Activities Found</CardTitle>
            <CardDescription>Check back later for more quizzes and polls to earn XP!</CardDescription>
          </Card>
        )}
      </main>
    </div>
  );
}
