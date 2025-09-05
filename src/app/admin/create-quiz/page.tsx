
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { QuizOrPoll, QuestionType } from '@/types';
import { ArrowLeft, PlusCircle, Trash2, Image as ImageIcon, MessageSquare, CheckSquare, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';

export default function CreateQuizPage() {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [xp, setXp] = useState(10);
  const [questionType, setQuestionType] = useState<QuestionType>();
  const [question, setQuestion] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState<string[]>(['']);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOptionField = () => {
    setOptions([...options, '']);
  };

  const removeOptionField = (index: number) => {
    if (options.length > 1) {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionType || !title || !question || !startTime || !endTime) {
      toast({ title: 'Error', description: 'Please fill out all required fields.', variant: 'destructive' });
      return;
    }

    if (xp <= 0) {
         toast({ title: 'Error', description: 'XP must be a positive number.', variant: 'destructive' });
         return;
    }

    const finalOptions = (questionType === 'mcq' || questionType === 'poll') 
        ? options.map(o => o.trim()).filter(Boolean) 
        : undefined;

    if ((questionType === 'mcq' || questionType === 'poll') && (!finalOptions || finalOptions.length < 2)) {
         toast({ title: 'Error', description: 'MCQs and Polls must have at least two options.', variant: 'destructive' });
         return;
    }

    if (questionType === 'image' && !imageUrl) {
         toast({ title: 'Error', description: 'Image-based questions require an image URL.', variant: 'destructive' });
         return;
    }

    setIsSubmitting(true);
    
    const newQuiz: Omit<QuizOrPoll, 'id'> = {
      title,
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      xp: Number(xp),
      questionType,
      question,
      ...(imageUrl && { imageUrl }),
      ...(finalOptions && { options: finalOptions }),
    };

    try {
      const newQuizRef = push(ref(db, 'quizzes'));
      await set(newQuizRef, newQuiz);
      toast({ title: 'Success', description: 'Activity created successfully!' });
      router.push('/admin');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to create activity.', variant: 'destructive' });
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

  return (
    <Card className="max-w-2xl mx-auto mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Create New Quiz or Poll</CardTitle>
         <Button variant="outline" asChild>
          <Link href="/admin"><ArrowLeft /> Back</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="xp">XP Reward</Label>
                <Input id="xp" type="number" min="1" value={xp} onChange={(e) => setXp(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
                <Label>Question Type</Label>
                <Select onValueChange={(value: QuestionType) => setQuestionType(value)} required>
                <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="poll"><div className="flex items-center gap-2"><BarChart2/> Poll</div></SelectItem>
                    <SelectItem value="mcq"><div className="flex items-center gap-2"><CheckSquare/> MCQ</div></SelectItem>
                    <SelectItem value="descriptive"><div className="flex items-center gap-2"><MessageSquare/> Descriptive</div></SelectItem>
                    <SelectItem value="image"><div className="flex items-center gap-2"><ImageIcon/> Image-Based</div></SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
          
          <hr/>
          
          {questionType && (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                    {renderQuestionTypeIcon(questionType)}
                    <span className="capitalize">{questionType} Question Details</span>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="question-text">Question</Label>
                    <Textarea id="question-text" value={question} onChange={(e) => setQuestion(e.target.value)} required placeholder="What do you want to ask?" />
                </div>
                 {questionType === 'image' && (
                    <div className="space-y-2">
                        <Label htmlFor="image-url">Image URL</Label>
                        <Input id="image-url" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required placeholder="https://example.com/image.png" />
                        {imageUrl && <img src={imageUrl} alt="preview" className="rounded-md max-h-48 mt-2" />}
                    </div>
                 )}
                 {(questionType === 'mcq' || questionType === 'poll') && (
                     <div className="space-y-4">
                        <Label>Options</Label>
                        <div className="space-y-2">
                        {options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                            <Input
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                            />
                            {options.length > 1 && (
                                <Button type="button" variant="outline" size="icon" onClick={() => removeOptionField(index)}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            </div>
                        ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addOptionField}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                        </Button>
                    </div>
                 )}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || !questionType}>
            {isSubmitting ? 'Creating...' : 'Create Activity'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
