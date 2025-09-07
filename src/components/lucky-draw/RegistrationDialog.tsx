
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LuckyEvent } from '@/types';
import { TerminalAnimation } from './TerminalAnimation';
import { registerForEvent } from '@/app/actions';
import { Loader2 } from 'lucide-react';

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: LuckyEvent;
}

export function RegistrationDialog({ open, onOpenChange, event }: RegistrationDialogProps) {
  const router = useRouter();
  const [registrationResult, setRegistrationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (open && !isRegistering && !registrationResult) {
      const performRegistration = async () => {
        setIsRegistering(true);
        const username = localStorage.getItem('username');
        if (username) {
          const result = await registerForEvent(event.id, username);
          setRegistrationResult(result);
        } else {
            // Should not happen if user is on dashboard, but as a fallback
            setRegistrationResult({ success: false, message: 'User not found. Please log in again.'});
        }
        setIsRegistering(false);
      };
      performRegistration();
    }
    // Reset on close
    if (!open) {
        setRegistrationResult(null);
        setIsRegistering(false);
    }
  }, [open, event, isRegistering, registrationResult]);

  const handleAnimationComplete = () => {
    onOpenChange(false);
    if(registrationResult?.success) {
        router.push(`/event/${event.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-gray-800 text-white p-0">
          <DialogHeader>
            <DialogTitle className="sr-only">Registering for event</DialogTitle>
          </DialogHeader>
          <div className="w-full max-w-4xl p-4">
             {isRegistering || !registrationResult ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
             ) : (
                <TerminalAnimation
                    success={registrationResult.success}
                    message={registrationResult.message}
                    onComplete={handleAnimationComplete}
                />
             )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
