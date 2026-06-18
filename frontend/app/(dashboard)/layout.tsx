'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/components/socket-provider';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/whatsapp', icon: MessageSquare, label: 'Conversas' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
  { href: '/team', icon: Users, label: 'Equipe', adminOnly: true },
  { href: '/settings', icon: Settings, label: 'Configurações', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, fetchMe } = useAuthStore();
  const { connected } = useSocket();

  useEffect(() => {
    if (!user) {
      fetchMe().catch(() => router.push('/login'));
    }
  }, [user, fetchMe, router]);

  if (!user) return null;

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'ADMIN');

  return (
    <div className="flex h-screen bg-wm-bg overflow-hidden">
      <aside className="w-16 flex flex-col items-center py-4 bg-wm-sidebar border-r border-border gap-2">
        <div className="w-10 h-10 rounded-full bg-wm-green/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-5 h-5 text-wm-green" />
        </div>

        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              pathname.startsWith(href)
                ? 'bg-wm-green text-white'
                : 'text-muted-foreground hover:bg-wm-surface hover:text-foreground',
            )}
          >
            <Icon className="w-5 h-5" />
          </Link>
        ))}

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-2 mt-auto">
          <div title={connected ? 'Conectado' : 'Desconectado'}>
            {connected ? (
              <Wifi className="w-4 h-4 text-wm-green" />
            ) : (
              <WifiOff className="w-4 h-4 text-wm-red" />
            )}
          </div>

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-default"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {getInitials(user.name)}
          </div>

          <button
            onClick={() => logout()}
            title="Sair"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-wm-red hover:bg-wm-surface transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
