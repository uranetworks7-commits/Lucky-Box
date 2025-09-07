
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ref, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { QuizOrPoll, Question, QuestionType } from '@/types';
import { ArrowLeft, PlusCircle, Trash2, Image as ImageIcon, MessageSquare, CheckSquare, BarChart2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const defaultQuestion: Question = {
  questionType: 'mcq',
  question: '',
  options: ['', ''],
  correctAnswer: undefined,
  imageUrl: ''
};

export default function EditQuizPage() {
  const [activity, setActivity] = useState<QuizOrPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [xp, setXp] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (!quizId) return;

    const fetchQuiz = async () => {
        const quizRef = ref(db, `quizzes/${quizId}`);
        const snapshot = await get(quizRef);
        if (snapshot.exists()) {
            const data = snapshot.val() as Omit<QuizOrPoll, 'id'>;
            const fetchedActivity = { id: quizId, ...data };
            setActivity(fetchedActivity);
            setTitle(fetchedActivity.title);
            // Format timestamps for datetime-local input
            setStartTime(format(new Date(fetchedActivity.startTime), "yyyy-MM-dd'T'HH:mm"));
            setEndTime(format(new Date(fetchedActivity.endTime), "yyyy-MM-dd'T'HH:mm"));
            setXp(fetchedActivity.xp);
            setQuestions(fetchedActivity.questions || [{...defaultQuestion, options: ['','']}]);
        } else {
            toast({ title: 'Error', description: 'Activity not found.', variant: 'destructive'});
            router.push('/admin');
        }
        setLoading(false);
    }
    fetchQuiz();
  }, [quizId, router, toast]);

  const handleQuestionChange = (qIndex: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    const question = { ...newQuestions[qIndex], [field]: value };

    // Reset fields when changing question type
    if (field === 'questionType') {
        question.options = (value === 'mcq' || value === 'poll') ? ['', ''] : undefined;
        question.correctAnswer = undefined;
        question.imageUrl = '';
    }

    newQuestions[qIndex] = question;
    setQuestions(newQuestions);
  };
  
  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newOptions = [...(newQuestions[qIndex].options || [])];
    newOptions[oIndex] = value;
    handleQuestionChange(qIndex, 'options', newOptions);
  };
  
  const addOption = (qIndex: number) => {
      const newQuestions = [...questions];
      const newOptions = [...(newQuestions[qIndex].options || []), ''];
      handleQuestionChange(qIndex, 'options', newOptions);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    if ((newQuestions[qIndex].options?.length || 0) > 2) {
      const newOptions = newQuestions[qIndex].options?.filter((_, i) => i !== oIndex);
      handleQuestionChange(qIndex, 'options', newOptions);
       if (newQuestions[qIndex].correctAnswer === oIndex) {
         handleQuestionChange(qIndex, 'correctAnswer', undefined);
       } else if (newQuestions[qIndex].correctAnswer && newQuestions[qIndex].correctAnswer! > oIndex) {
         handleQuestionChange(qIndex, 'correctAnswer', newQuestions[qIndex].correctAnswer! - 1);
       }
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { ...defaultQuestion, options: ['', ''] }]);
  };

  const removeQuestion = (qIndex: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== qIndex));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!title || !startTime || !endTime || questions.length === 0) {
      toast({ title: 'Error', description: 'Please fill out all required activity fields.', variant: 'destructive' });
      return;
    }

    if (xp <= 0) {
      toast({ title: 'Error', description: 'XP must be a positive number.', variant: 'destructive' });
      return;
    }

    for (const q of questions) {
        if (!q.questionType || !q.question) {
            toast({ title: 'Error', description: `A question is missing its type or text.`, variant: 'destructive' });
            return;
        }
        if ((q.questionType === 'mcq' || q.questionType === 'poll') && (q.options?.filter(Boolean).length || 0) < 2) {
             toast({ title: 'Error', description: `Question "${q.question}" must have at least two options.`, variant: 'destructive' });
             return;
        }
        if (q.questionType === 'mcq' && q.correctAnswer === undefined) {
             toast({ title: 'Error', description: `Please select a correct answer for MCQ: "${q.question}".`, variant: 'destructive' });
             return;
        }
        if (q.questionType === 'image' && !q.imageUrl) {
             toast({ title: 'Error', description: `Image-based question "${q.question}" requires an image URL.`, variant: 'destructive' });
             return;
        }
    }

    setIsSubmitting(true);

    const finalQuestions = questions.map(q => {
        const newQ = { ...q };
        if (q.questionType !== 'mcq' && q.questionType !== 'poll') {
            delete newQ.options;
        }
        if (q.questionType !== 'mcq') {
            delete newQ.correctAnswer;
        }
        if (q.questionType !== 'image') {
            delete newQ.imageUrl
        }
        return newQ;
    });
    
    const updatedQuiz: Partial<Omit<QuizOrPoll, 'id'>> = {
      title,
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      xp: Number(xp),
      questions: finalQuestions,
      questionType: questions[0].questionType,
    };

    try {
      const quizRef = ref(db, `quizzes/${quizId}`);
      await update(quizRef, updatedQuiz);
      toast({ title: 'Success', description: 'Activity updated successfully!' });
      router.push('/admin');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to update activity.', variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  const renderQuestionTypeIcon = (type: QuestionType | undefined) => {
    switch(type) {
        case 'poll': return <BarChart2 className="h-4 w-4" />;
        case 'mcq': return <CheckSquare className="h-4 w-4" />;
        case 'descriptive': return <MessageSquare className="h-4 w-4" />;
        case 'image': return <ImageIcon className="h-4 w-4" />;
        default: return null;
    }
  }
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <Card className="max-w-3xl mx-auto mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edit Activity</CardTitle>
         <Button variant="outline" asChild>
          <Link href="/admin"><ArrowLeft /> Back</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="p-4 border rounded-lg space-y-4">
                 <h3 className="text-lg font-medium">Activity Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="title">Activity Title</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Weekly Trivia" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input id="start-time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Input id="end-time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                        <Label htmlFor="xp">Total XP Reward</Label>
                        <Input id="xp" type="number" min="1" value={xp} onChange={(e) => setXp(Number(e.target.value))} required />
                  </div>
            </div>

            <Separator />

             <div className="space-y-4">
                <h3 className="text-lg font-medium">Questions</h3>
                 {questions.map((q, qIndex) => (
                    <Card key={qIndex} className="p-4 relative">
                        <CardHeader className="p-2">
                            <CardTitle className="text-base flex justify-between items-center">
                                <span>Question {qIndex + 1}</span>
                                {questions.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-2">
                             <div className="space-y-2">
                                <Label>Question Type</Label>
                                <Select 
                                    onValueChange={(value: QuestionType) => handleQuestionChange(qIndex, 'questionType', value)} 
                                    value={q.questionType}
                                >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mcq"><div className="flex items-center gap-2"><CheckSquare/> MCQ</div></SelectItem>
                                    <SelectItem value="poll"><div className="flex items-center gap-2"><BarChart2/> Poll</div></SelectItem>
                                    <SelectItem value="descriptive"><div className="flex items-center gap-2"><MessageSquare/> Descriptive</div></SelectItem>
                                    <SelectItem value="image"><div className="flex items-center gap-2"><ImageIcon/> Image-Based</div></SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`q-text-${qIndex}`}>Question</Label>
                                <Textarea id={`q-text-${qIndex}`} value={q.question} onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)} required placeholder="What do you want to ask?" />
                            </div>
                             {q.questionType === 'image' && (
                                <div className="space-y-2">
                                    <Label htmlFor={`q-img-${qIndex}`}>Image URL</Label>
                                    <Input id={`q-img-${qIndex}`} type="url" value={q.imageUrl} onChange={(e) => handleQuestionChange(qIndex, 'imageUrl', e.target.value)} required placeholder="https://example.com/image.png" />
                                    {q.imageUrl && <img src={q.imageUrl} alt="preview" className="rounded-md max-h-48 mt-2" />}
                                </div>
                             )}
                            {(q.questionType === 'mcq' || q.questionType === 'poll') && (
                                <RadioGroup onValueChange={(v) => handleQuestionChange(qIndex, 'correctAnswer', Number(v))} value={q.correctAnswer?.toString()}>
                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center">
                                      <Label>Options</Label>
                                      {q.questionType === 'mcq' && <Label className="text-xs text-muted-foreground">Select Correct Answer</Label>}
                                    </div>
                                    <div className="space-y-2">
                                    {(q.options || []).map((option, oIndex) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                        <Input
                                            value={option}
                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                            placeholder={`Option ${oIndex + 1}`}
                                        />
                                         {q.questionType === 'mcq' && (
                                            <RadioGroupItem value={oIndex.toString()} id={`q-${qIndex}-o-${oIndex}`} />
                                        )}
                                        { (q.options?.length || 0) > 2 && (
                                            <Button type="button" variant="outline" size="icon" onClick={() => removeOption(qIndex, oIndex)}>
                                            <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        </div>
                                    ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                                    </Button>
                                </div>
                                </RadioGroup>
                            )}
                        </CardContent>
                    </Card>
                 ))}
                 <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Another Question
                 </Button>
            </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
