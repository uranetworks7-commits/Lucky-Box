
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { QuizOrPoll, Submission } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function QuizResultsPage() {
  const params = useParams();
  const quizId = params.id as string;
  const router = useRouter();

  const [activity, setActivity] = useState<QuizOrPoll | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;
    const activityRef = ref(db, `quizzes/${quizId}`);
    const unsubscribe = onValue(activityRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setActivity({ id: quizId, ...data });
        const subs = data.submissions ? Object.values(data.submissions) : [];
        setSubmissions(subs.sort((a:any, b:any) => a.submittedAt - b.submittedAt));
      } else {
        setActivity(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [quizId]);
  
  const getAnswerText = (submission: Submission) => {
      if (activity && (activity.questionType === 'mcq' || activity.questionType === 'poll')) {
          const optionIndex = Number(submission.answer);
          return activity.options?.[optionIndex] ?? 'Invalid Option';
      }
      return submission.answer.toString();
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!activity) {
    return (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
            <p>Activity not found.</p>
            <Button variant="outline" asChild><Link href="/admin"><ArrowLeft/> Back to Admin</Link></Button>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{activity.title}</CardTitle>
                    <CardDescription>Submission Results</CardDescription>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
                </Button>
            </div>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground"><Users /> {submissions.length} total submissions</div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead>Submitted At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {submissions.length > 0 ? submissions.map((sub, i) => (
                        <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>{sub.username}</TableCell>
                            <TableCell>{getAnswerText(sub)}</TableCell>
                            <TableCell>{format(new Date(sub.submittedAt), 'Pp')}</TableCell>
                        </TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center">No submissions yet.</TableCell></TableRow>}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
    </div>
  );
}

    