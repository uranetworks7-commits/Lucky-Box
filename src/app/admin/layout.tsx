
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogOut } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      router.replace('/dashboard');
    } else {
      setIsVerified(true);
    }
  }, [router]);
  
  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    router.push('/dashboard');
  }

  if (!isVerified) {
    return <div className="flex h-screen items-center justify-center"><p>Verifying access...</p></div>;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Link href="/admin">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </Link>
        <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4 md:mr-2"/>
                    <span className="hidden md:inline">User Dashboard</span>
                </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Exit Admin</span>
            </Button>
        </div>
      </header>
      <main className="p-4 sm:px-6 sm:py-0">{children}</main>
    </div>
  );
}
