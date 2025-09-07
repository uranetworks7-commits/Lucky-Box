
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { QuizOrPoll } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Zap, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

const ACTIVITIES_INITIAL_LIMIT = 6;

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<QuizOrPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(ACTIVITIES_INITIAL_LIMIT);
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

  const showAll = () => {
    setDisplayLimit(activities.length);
  }

  const displayedActivities = activities.slice(0, displayLimit);

  return (
    <div className="min-h-screen bg-muted/40 p-2 sm:p-4">
      <header className="flex items-center justify-between mb-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-7 w-7 text-blue-500" />
          Earn XP
        </h1>
        <Button variant="outline" onClick={handleBack} size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </header>

      <main className="max-w-4xl mx-auto">
        {loading ? (
          <p className="text-center text-sm">Loading activities...</p>
        ) : activities.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayedActivities.map((activity) => (
                <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-3">
                    <CardTitle className="text-base flex justify-between items-start">
                      {activity.title}
                      {getActivityStatus(activity)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1 text-xs">
                      <Badge variant="secondary" className="capitalize text-xs">{activity.questionType}</Badge>
                      <div className="flex items-center gap-1 text-blue-500 font-bold">
                          <Zap className="h-4 w-4"/>
                          <span>{activity.xp} XP</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                     <div className="text-xs text-muted-foreground space-y-1">
                         <div className="flex items-center gap-2"><Calendar className="h-3 w-3"/> Starts: {format(new Date(activity.startTime), 'P p')}</div>
                         <div className="flex items-center gap-2"><Clock className="h-3 w-3"/> Ends: {format(new Date(activity.endTime), 'P p')}</div>
                     </div>
                     <Button className="w-full h-9" asChild size="sm">
                         <Link href={`/quiz/${activity.id}`}>
                           {Date.now() > activity.endTime ? 'View Details' : 'Participate'}
                         </Link>
                     </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activities.length > displayLimit && (
                <div className="mt-6 text-center">
                    <Button onClick={showAll} variant="outline">
                        View All Activities
                    </Button>
                </div>
            )}
          </>
        ) : (
          <Card className="text-center p-8">
            <CardTitle className="text-lg">No Activities Found</CardTitle>
            <CardDescription className="text-sm">Check back later for more quizzes and polls!</CardDescription>
          </Card>
        )}
      </main>
    </div>
  );
}
