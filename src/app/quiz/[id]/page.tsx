
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { QuizOrPoll, Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitQuizAnswer } from '@/app/actions';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Loader2, Send, XCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type PageStatus = 'loading' | 'live' | 'ended' | 'upcoming' | 'submitted' | 'not_found';

export default function QuizPage() {
  const params = useParams();
  const quizId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState<string | null>(null);
  const [activity, setActivity] = useState<QuizOrPoll | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [answers, setAnswers] = useState<(string | number)[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userSubmission, setUserSubmission] = useState<{answers: (string | number)[]} | null>(null);
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
        if (data.questions && answers.length === 0) {
            setAnswers(new Array(data.questions.length).fill(''));
        }

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
  }, [quizId, username, answers.length]);

  const handleAnswerChange = (value: string | number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !activity || answers.some(a => a.toString().trim() === '')) {
        toast({ title: 'Incomplete', description: 'Please answer all questions before submitting.', variant: 'destructive' });
        return;
    };
    
    setIsSubmitting(true);
    const result = await submitQuizAnswer(activity.id, username, answers);
    
    if (result.success) {
      toast({ title: 'Success!', description: result.message });
      // Status will be updated by the onValue listener
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    
    setIsSubmitting(false);
  };
  
  const currentQuestion = activity?.questions?.[currentQuestionIndex];
  const progress = activity ? ((currentQuestionIndex + 1) / (activity.questions?.length || 1)) * 100 : 0;
  
  const renderQuestion = (question: Question, index: number) => {
    const answer = answers[index];
    
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <p className="text-lg font-medium">{index + 1}. {question.question}</p>
                {question.imageUrl && (
                    <div className="flex justify-center">
                        <img src={question.imageUrl} alt="Question image" className="rounded-lg max-h-60" />
                    </div>
                )}
            </div>
            {question.questionType === 'mcq' || question.questionType === 'poll' ? (
                <RadioGroup onValueChange={handleAnswerChange} value={answer?.toString()} className="space-y-2">
                    {question.options?.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value={oIndex.toString()} id={`q-${index}-o-${oIndex}`} />
                            <Label htmlFor={`q-${index}-o-${oIndex}`} className="flex-1 cursor-pointer">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            ) : (
                <Textarea 
                    value={answer?.toString() || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={4}
                    required
                />
            )}
        </div>
    )
  }

  const renderSubmittedView = () => {
    return (
        <div className="space-y-6">
            {activity?.questions.map((q, qIndex) => (
                <div key={qIndex} className="p-4 border rounded-lg">
                    <p className="font-semibold">{qIndex+1}. {q.question}</p>
                    {q.questionType === 'mcq' && q.correctAnswer !== undefined && q.correctAnswer !== null ? (
                        // Result view for MCQs
                        <div className="mt-4 space-y-2">
                             {q.options?.map((option, index) => {
                                 const userAnswerIndex = userSubmission?.answers?.[qIndex];
                                 const isUserAnswer = userAnswerIndex === index;
                                 const isCorrectAnswer = q.correctAnswer === index;
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
                    ) : (
                        // View for descriptive/poll answers
                        <div className="mt-2 text-muted-foreground bg-muted p-2 rounded-md">
                           <strong>Your answer:</strong> {q.options?.[Number(userSubmission?.answers[qIndex])] || userSubmission?.answers[qIndex]}
                        </div>
                    )}
                </div>
            ))}
            <div className="text-center font-bold p-3 rounded-md bg-green-500/20 text-green-700">
                Thank you for your submission! You earned {activity?.xp} XP.
            </div>
        </div>
    )
  }
  
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
        return renderSubmittedView();
    }

    // Live status
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Progress value={progress} className="w-full" />
            
            {currentQuestion && renderQuestion(currentQuestion, currentQuestionIndex)}
            
            <div className="flex justify-between items-center">
                 <Button type="button" onClick={() => setCurrentQuestionIndex(i => i-1)} disabled={currentQuestionIndex === 0} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                
                {currentQuestionIndex < (activity.questions.length - 1) ? (
                    <Button type="button" onClick={() => setCurrentQuestionIndex(i => i+1)} variant="outline">
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Submit & Earn {activity.xp} XP</>}
                    </Button>
                )}
            </div>
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
