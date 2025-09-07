
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signInUser } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';


export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      router.push('/dashboard');
    } else {
        setVerifying(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
        toast({
            title: "Login Failed",
            description: "Username cannot be empty.",
            variant: "destructive",
        });
        return;
    }
    
    setIsLoading(true);

    try {
        const result = await signInUser(trimmedUsername);
        if (result.success) {
            localStorage.setItem('username', trimmedUsername);
            router.push('/dashboard');
        } else {
            toast({
                title: "Login Failed",
                description: result.message,
                variant: "destructive",
            });
            setIsLoading(false);
        }
    } catch (error) {
        console.error("Login Error: ", error);
        toast({
            title: "Login Failed",
            description: "An error occurred during login. Please try again.",
            variant: "destructive",
        });
        setIsLoading(false);
    }
  };

  if (verifying) {
    return (
        <main className="flex items-center justify-center min-h-screen bg-black">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
    )
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('https://i.postimg.cc/7Yf8zfPQ/fhdnature3648.jpg')"}}>
        <div className="absolute inset-0 bg-black/50"></div>
        <Card className="w-full max-w-sm z-10">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">URA Box</CardTitle>
                <CardDescription>Enter your username to join the fun!</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input 
                            id="username" 
                            placeholder="e.g. LuckyUser" 
                            required 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin"/> : 'Login'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    </main>
  );
}
