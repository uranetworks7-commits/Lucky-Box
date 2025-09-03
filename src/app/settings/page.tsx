
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bell, Lock, Film } from 'lucide-react';
import { getMessagingToken } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [playAnimation, setPlayAnimation] = useState(true);
  const [usePersonalData, setUsePersonalData] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Load settings from localStorage
    const animationSetting = localStorage.getItem('playResultAnimation');
    if (animationSetting !== null) {
      setPlayAnimation(animationSetting === 'true');
    } else {
      // Default to true if not set
      localStorage.setItem('playResultAnimation', 'true');
    }

    // Check current notification permission status
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  const handleAnimationChange = (checked: boolean) => {
    setPlayAnimation(checked);
    localStorage.setItem('playResultAnimation', String(checked));
    toast({
        title: 'Settings Saved',
        description: `Result animations are now ${checked ? 'ON' : 'OFF'}.`
    })
  };

  const handlePersonalDataChange = (checked: boolean) => {
    setUsePersonalData(checked);
    toast({
        title: 'Settings Saved',
        description: `Personal data usage preference updated.`
    })
  };

  const handleNotificationChange = async (checked: boolean) => {
    if (!checked) {
      // Note: We can't programmatically revoke notification permissions.
      // We can only guide the user to do it in their browser settings.
      toast({
        title: 'Manage Notifications',
        description: 'Please manage notification permissions in your browser settings.',
      });
      return;
    }

    if (notificationStatus === 'granted') {
      toast({ title: 'Notifications are already enabled.' });
      return;
    }
    
    if (notificationStatus === 'denied') {
        toast({
            title: 'Notifications Blocked',
            description: 'Please enable notifications in your browser settings to receive updates.',
            variant: 'destructive',
        });
        return;
    }
    
    // Request permission
    const token = await getMessagingToken();
    if(token) {
        setNotificationStatus('granted');
        toast({ title: 'Notifications Enabled!' });
    } else {
        setNotificationStatus('denied');
        toast({ title: 'Notifications Denied', variant: 'destructive' });
    }
  };


  return (
    <main className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Settings</CardTitle>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <Label htmlFor="animation-switch" className="flex items-center gap-3 cursor-pointer">
              <Film className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-semibold">Play result animation</span>
                <span className="text-sm text-muted-foreground">Show video before displaying results.</span>
              </div>
            </Label>
            <Switch
              id="animation-switch"
              checked={playAnimation}
              onCheckedChange={handleAnimationChange}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <Label htmlFor="notification-switch" className="flex items-center gap-3 cursor-pointer">
              <Bell className="h-5 w-5" />
               <div className="flex flex-col">
                 <span className="font-semibold">Enable Notifications</span>
                 <span className="text-sm text-muted-foreground">Receive alerts for new events.</span>
              </div>
            </Label>
            <Switch
              id="notification-switch"
              checked={notificationStatus === 'granted'}
              onCheckedChange={handleNotificationChange}
              disabled={notificationStatus === 'denied'}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <Label htmlFor="data-switch" className="flex items-center gap-3 cursor-pointer">
              <Lock className="h-5 w-5" />
              <div className="flex flex-col">
                 <span className="font-semibold">Use My Personal Data</span>
                 <span className="text-sm text-muted-foreground">Allow use for analytics and improvements.</span>
              </div>
            </Label>
            <Switch
              id="data-switch"
              checked={usePersonalData}
              onCheckedChange={handlePersonalDataChange}
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

    