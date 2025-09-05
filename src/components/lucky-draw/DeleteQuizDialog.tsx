
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteQuiz } from '@/app/actions';
import type { QuizOrPoll } from '@/types';

interface DeleteQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: QuizOrPoll;
}

export function DeleteQuizDialog({ open, onOpenChange, quiz }: DeleteQuizDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteQuiz(quiz.id);
      toast({ title: 'Success', description: `Activity "${quiz.title}" has been deleted.` });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to delete the activity.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the activity 
            <span className="font-bold"> "{quiz.title}" </span> 
            and all of its associated data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete activity'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
