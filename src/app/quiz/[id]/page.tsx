
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { QuizOrPoll } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitQuizAnswer } from '@/app/actions';
import { ArrowLeft, CheckCircle, Clock, Loader2, Send, XCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type PageStatus = 'loading' | 'live' | 'ended' | 'upcoming' | 'submitted' | 'not_found';

export default function QuizPage() {
  const params = useParams();
  const quizId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState<string | null>(null);
  const [activity, setActivity] = useState<QuizOrPoll | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [answer, setAnswer] = useState<string | number>('');
  const [userSubmission, setUserSubmission] = useState<{answer: string | number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
    } else {
      setUsername(storedUsername);
    }
  }, [router]);

  useEffect(() => {
    if (!quizId || !username) return;

    const activityRef = ref(db, `quizzes/${quizId}`);
    const unsubscribe = onValue(activityRef, (snapshot) => {
      if (snapshot.exists()) {
        const data: QuizOrPoll = { id: quizId, ...snapshot.val() };
        setActivity(data);

        const now = Date.now();
        const submission = Object.values(data.submissions || {}).find(sub => sub.username === username);

        if (submission) {
          setStatus('submitted');
          setUserSubmission(submission);
        } else if (now < data.startTime) {
          setStatus('upcoming');
        } else if (now > data.endTime) {
          setStatus('ended');
        } else {
          setStatus('live');
        }
      } else {
        setStatus('not_found');
      }
    });

    return () => unsubscribe();
  }, [quizId, username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.toString().trim() || !username || !activity) return;
    
    setIsSubmitting(true);
    const result = await submitQuizAnswer(activity.id, username, answer);
    
    if (result.success) {
      toast({ title: 'Success!', description: result.message });
      // Status will be updated by the onValue listener
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    
    setIsSubmitting(false);
  };
  
  const renderContent = () => {
    if (status === 'loading' || !activity) {
        return <div className="flex items-center justify-center min-h-[20rem]"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }
    if (status === 'not_found') {
        return <p>Activity not found.</p>
    }
     if (status === 'upcoming') {
        return <div className="text-center space-y-2"><Clock className="mx-auto h-12 w-12 text-muted-foreground"/><p className="text-lg">This activity has not started yet.</p></div>
    }
     if (status === 'ended') {
        return <div className="text-center space-y-2"><Clock className="mx-auto h-12 w-12 text-muted-foreground"/><p className="text-lg">This activity has ended.</p></div>
    }
     if (status === 'submitted') {
        if (activity.questionType === 'mcq' && activity.correctAnswer !== undefined) {
             const isCorrect = userSubmission?.answer === activity.correctAnswer;
             return (
                 <div className="space-y-4">
                     <p className="text-lg font-medium">{activity.question}</p>
                     <div className="space-y-2">
                         {activity.options?.map((option, index) => {
                             const isUserAnswer = userSubmission?.answer === index;
                             const isCorrectAnswer = activity.correctAnswer === index;
                             return (
                                <div key={index} className={cn(
                                    "flex items-center space-x-3 rounded-md border p-3",
                                    isCorrectAnswer && "border-green-500 bg-green-500/10",
                                    isUserAnswer && !isCorrectAnswer && "border-destructive bg-destructive/10"
                                )}>
                                    {isCorrectAnswer ? <CheckCircle className="text-green-500 h-5 w-5" /> : (isUserAnswer ? <XCircle className="text-destructive h-5 w-5"/> : <div className="h-5 w-5"/>)}
                                    <Label htmlFor={`option-${index}`} className="flex-1">{option}</Label>
                                </div>
                            )
                         })}
                     </div>
                     <div className={cn(
                         "text-center font-bold p-3 rounded-md",
                         isCorrect ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"
                     )}>
                         {isCorrect ? `Correct! You earned ${activity.xp} XP.` : "Sorry, that was not the correct answer."}
                     </div>
                 </div>
             )
        }
        return <div className="text-center space-y-2"><CheckCircle className="mx-auto h-12 w-12 text-green-500"/><p className="text-lg">Thank you for your submission!</p></div>
    }

    // Live status
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-lg font-medium">{activity.question}</p>
             {activity.imageUrl && (
                <div className="flex justify-center">
                    <img src={activity.imageUrl} alt="Question image" className="rounded-lg max-h-60" />
                </div>
            )}
            {activity.questionType === 'mcq' || activity.questionType === 'poll' ? (
                <RadioGroup onValueChange={(val) => setAnswer(Number(val))} value={answer.toString()} className="space-y-2">
                    {activity.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            ) : (
                <Textarea 
                    value={answer.toString()}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={4}
                    required
                />
            )}
            <Button type="submit" disabled={isSubmitting || !answer.toString().trim()} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Submit & Earn {activity.xp} XP</>}
            </Button>
        </form>
    )

  }

  return (
    <main className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl relative">
         <Button asChild variant="ghost" className="absolute top-4 left-4">
            <Link href="/activities"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
        </Button>
        <CardHeader className="text-center pt-16">
          <CardTitle className="text-3xl font-bold">{activity?.title}</CardTitle>
          <CardDescription>
            Complete the activity to earn XP!
          </CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </main>
  );
}

    