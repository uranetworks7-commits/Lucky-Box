
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TerminalAnimation } from '@/components/lucky-draw/TerminalAnimation';
import type { LuckyEvent, UserData } from '@/types';
import { registerForEvent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: LuckyEvent;
  username: string;
  user: UserData | null;
}

export function RegistrationDialog({ open, onOpenChange, event, username, user }: RegistrationDialogProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !isRegistering && !registrationResult) {
      handleRegistration();
    }
    // Reset state when dialog is closed
    if (!open) {
        setIsRegistering(false);
        setRegistrationResult(null);
    }
  }, [open, isRegistering, registrationResult]);

  const handleRegistration = async () => {
    setIsRegistering(true);
    // The dialog is used for both unlocking and final registration.
    // The action handles the logic based on event/user state.
    const result = await registerForEvent(event.id, username);
    
    // For unlock actions that don't show the terminal, show a toast immediately.
    const isUnlockOnly = event.requiredXp && event.requiredXp > 0 && !result.message.includes('successful');
    if (isUnlockOnly) {
        toast({ title: 'Success!', description: result.message });
        onOpenChange(false);
        return;
    }
    
    // For final registration, we show the terminal animation.
    setRegistrationResult(result);
    // The onComplete in TerminalAnimation will close the dialog.
  };

  const handleAnimationComplete = () => {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Event Registration</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {registrationResult ? (
             <TerminalAnimation 
                success={registrationResult.success} 
                message={registrationResult.message}
                onComplete={handleAnimationComplete} 
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p>Processing registration...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
