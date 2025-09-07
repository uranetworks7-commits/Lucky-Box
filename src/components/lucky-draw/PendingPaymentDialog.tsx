
'use client';

import { useRouter } from 'next/navigation';
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
import { Gift } from 'lucide-react';

interface PendingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingPaymentDialog({ open, onOpenChange }: PendingPaymentDialogProps) {
  const router = useRouter();
  
  const handleGoToSettings = () => {
    router.push('/settings');
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Gift className="h-6 w-6 text-yellow-600" />
            </div>
          <AlertDialogTitle className="text-center">Pending XP Payment</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You have an outstanding XP balance to pay. Please go to your Settings to clear it before joining another event.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToSettings}>
            Go to Settings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
