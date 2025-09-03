'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AdminAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECURITY_KEY = 'Utkarsh225';

export function AdminAccessDialog({ open, onOpenChange }: AdminAccessDialogProps) {
  const [key, setKey] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleAccess = () => {
    if (key === SECURITY_KEY) {
      localStorage.setItem('isAdmin', 'true');
      router.push('/admin');
    } else {
      toast({
        title: 'Access Denied',
        description: 'The security key is incorrect.',
        variant: 'destructive',
      });
      setKey('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Admin Access</DialogTitle>
          <DialogDescription>
            Enter the moderator security key to access the admin panel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="security-key"
            type="password"
            placeholder="Security Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleAccess}>Enter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
