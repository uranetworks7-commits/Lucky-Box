
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bell, Lock, Film, Wallet, Zap, Loader2 } from 'lucide-react';
import { getMessagingToken } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { UserData } from '@/types';
import { payPendingXp } from '@/app/actions';

export default function SettingsPage() {
  const [playAnimation, setPlayAnimation] = useState(true);
  const [usePersonalData, setUsePersonalData] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    // Load settings from localStorage
    const animationSetting = localStorage.getItem('playResultAnimation');
    if (animationSetting !== null) {
      setPlayAnimation(animationSetting === 'true');
    } else {
      localStorage.setItem('playResultAnimation', 'true');
    }

    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
    
    const username = localStorage.getItem('username');
    if(username) {
        const usersRef = ref(db, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                const users = snapshot.val();
                const userEntry = Object.values(users).find((user: any) => user.username === username) as UserData | undefined;
                if (userEntry) {
                    setUserData(userEntry);
                }
            }
        });
        return () => unsubscribe();
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
    
    const token = await getMessagingToken();
    if(token) {
        setNotificationStatus('granted');
        toast({ title: 'Notifications Enabled!' });
    } else {
        setNotificationStatus('denied');
        toast({ title: 'Notifications Denied', variant: 'destructive' });
    }
  };

  const handlePay = async () => {
      if (!userData || !userData.username) return;

      setIsPaying(true);
      const result = await payPendingXp(userData.username);
      if (result.success) {
          toast({ title: 'Success', description: result.message });
      } else {
          toast({ title: 'Payment Failed', description: result.message, variant: 'destructive'});
      }
      setIsPaying(false);
  }

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
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><Wallet/> Spend XP</CardTitle>
                <CardDescription>Pay for unlocked events from your XP balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {userData ? (
                    <>
                        <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                            <span>Pending to Spend</span>
                            <span className="font-bold flex items-center gap-1 text-yellow-400"><Zap className="h-4 w-4"/> {userData?.pendingXpSpend || 0}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                            <span>Your Current Balance</span>
                            <span className="font-bold flex items-center gap-1 text-blue-400"><Zap className="h-4 w-4"/> {userData?.xp || 0}</span>
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={handlePay}
                            disabled={!userData.pendingXpSpend || userData.pendingXpSpend === 0 || isPaying || userData.xp < (userData.pendingXpSpend || 0)}
                        >
                            {isPaying ? <Loader2 className="animate-spin" /> : `Pay ${userData.pendingXpSpend || 0} XP`}
                        </Button>
                        {userData.pendingXpSpend && userData.xp < userData.pendingXpSpend && (
                            <p className="text-xs text-destructive text-center">You don't have enough XP to pay.</p>
                        )}
                    </>
                ) : (
                    <div className="flex justify-center items-center p-4"> <Loader2 className="h-6 w-6 animate-spin"/></div>
                )}
            </CardContent>
          </Card>
        
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
