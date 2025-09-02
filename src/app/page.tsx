"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const validUsernames = new Set([
  'utkarshx', 'rehan@24', 'ayush@5926', 'Saumy', 'saumy', 'ayush@558', 'rehan ali', 'xrehan', 's', 'arpit', 'o', 'gg', 'kk', 'sajid', 'VLC179', 'b', 'k', 'h', 'm', 'ayush@559', 'romitverma', 'romit verma', 'cv', 'ff', 'test12345678@c.us', 'ij', 'jj', 'CSK', 'bb', 'suraj@23', 'arman@45', 'oo', 'vijomc', 'vv', 'main', 'yyt', 'uu'
]);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (trimmedUsername && validUsernames.has(trimmedUsername)) {
      localStorage.setItem('username', trimmedUsername);
      router.push('/dashboard');
    } else {
      toast({
        title: "Login Failed",
        description: "The username you entered is incorrect.",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('https://i.postimg.cc/c4jzTRB3/fhdabstract101.jpg')"}}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <Card className="w-full max-w-sm z-10">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Lucky Draw</CardTitle>
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
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">Login</Button>
                </CardFooter>
            </form>
        </Card>
    </main>
  );
}
