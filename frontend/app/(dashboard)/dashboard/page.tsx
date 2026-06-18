'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, CheckCircle2, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn, formatDuration, formatRelative, getInitials } from '@/lib/utils';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { OverviewMetrics, AgentMetric, Conversation } from '@/lib/types';

type Period = 'today' | '7d' | '30d';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('today');

  const { data: overview } = useQuery({
    queryKey: ['metrics-overview', period],
    queryFn: async () => {
      const { data } = await api.get<OverviewMetrics>('/metrics/overview', {
        params: { period },
      });
      return data;
    },
    refetchInterval: 30_000,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents', period],
    queryFn: async () => {
      const { data } = await api.get<AgentMetric[]>('/metrics/agents', {
        params: { period },
      });
      return data;
    },
    refetchInterval: 30_000,
  });

  const { data: recentConversations } = useQuery({
    queryKey: ['conversations-recent'],
    queryFn: async () => {
      const { data } = await api.get<{ items: Conversation[] }>('/conversations', {
        params: { limit: 20 },
      });
      return data.items;
    },
    refetchInterval: 30_000,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', period],
    queryFn: async () => {
      const { data } = await api.get<{ hour: number; count: number }[]>('/metrics/timeline', {
        params: { period },
      });
      return data;
    },
  });

  return (
    <div className="h-full overflow-y-auto bg-wm-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Desempenho da equipe em tempo real</p>
          </div>

          <div className="flex gap-1 bg-wm-surface rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  period === p.value
                    ? 'bg-wm-sidebar text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Conversas abertas"
            value={overview?.openConversations ?? 0}
            icon={<MessageCircle className="h-5 w-5 text-wm-green" />}
            color="text-wm-green"
          />
          <MetricCard
            title="Mensagens respondidas"
            value={overview?.messagesToday ?? 0}
            icon={<TrendingUp className="h-5 w-5 text-blue-400" />}
            color="text-blue-400"
          />
          <MetricCard
            title="Taxa de resolução"
            value={`${overview?.resolvedRate ?? 0}%`}
            icon={<CheckCircle2 className="h-5 w-5 text-purple-400" />}
            color="text-purple-400"
          />
          <MetricCard
            title="Tempo médio resposta"
            value={formatDuration(overview?.avgFirstResponseMs ?? 0)}
            icon={<Clock className="h-5 w-5 text-wm-yellow" />}
            color="text-wm-yellow"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold mb-4 text-foreground">Equipe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(agents ?? []).map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-4 text-foreground">Atividade por hora</h2>
            <div className="bg-wm-sidebar border border-border rounded-xl p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeline ?? []}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1a1d27', border: '1px solid #252836', borderRadius: '8px' }}
                    labelFormatter={(v) => `${v}:00`}
                    formatter={(v: number) => [v, 'Mensagens']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(timeline ?? []).map((_, i) => (
                      <Cell key={i} fill="#25D366" opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Top 3 — Resoluções</h3>
              <div className="space-y-2">
                {(agents ?? [])
                  .sort((a, b) => b.resolvedCount - a.resolvedCount)
                  .slice(0, 3)
                  .map((agent, i) => (
                    <div key={agent.id} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-4">
                        {i + 1}
                      </span>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: agent.color }}
                      >
                        {getInitials(agent.name)}
                      </div>
                      <span className="flex-1 text-sm">{agent.name}</span>
                      <span className="text-sm font-semibold text-wm-green">
                        {agent.resolvedCount}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Conversas recentes</h2>
            <Link
              href="/whatsapp"
              className="text-xs text-wm-green hover:underline flex items-center gap-1"
            >
              Ver todas <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-wm-sidebar border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3 font-medium">Contato</th>
                  <th className="text-left px-4 py-3 font-medium">Responsável</th>
                  <th className="text-left px-4 py-3 font-medium">Última mensagem</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(recentConversations ?? []).map((conv) => {
                  const displayName = conv.contact.name ?? conv.contact.phone;
                  const waitingMs = conv.lastMessageAt
                    ? Date.now() - new Date(conv.lastMessageAt).getTime()
                    : 0;
                  const waitingMin = Math.floor(waitingMs / 60000);

                  return (
                    <tr
                      key={conv.id}
                      className={cn(
                        'border-b border-border/50 hover:bg-wm-surface/50 transition-colors',
                        waitingMin >= 60 && 'bg-wm-red/5',
                        waitingMin >= 30 && waitingMin < 60 && 'bg-wm-yellow/5',
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: conv.assignment?.user?.color ?? '#64748b' }}
                          >
                            {getInitials(displayName)}
                          </div>
                          <div>
                            <p className="font-medium">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{conv.contact.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {conv.assignment ? (
                          <span style={{ color: conv.assignment.user.color }}>
                            {conv.assignment.user.name}
                          </span>
                        ) : (
                          <span className="text-wm-yellow text-xs">⚠ Sem responsável</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {conv.lastMessageAt ? formatRelative(conv.lastMessageAt) : '--'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={conv.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href="/whatsapp"
                          className="text-xs text-wm-green hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-wm-sidebar border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        {icon}
      </div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentMetric }) {
  return (
    <div className="bg-wm-sidebar border border-border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: agent.color }}
          >
            {getInitials(agent.name)}
          </div>
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-wm-sidebar',
              agent.online ? 'bg-wm-green' : 'bg-gray-500',
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{agent.name}</p>
          <p className="text-xs text-muted-foreground">{agent.online ? 'Online' : 'Offline'}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-wm-green">{agent.activeConversations}</p>
          <p className="text-[10px] text-muted-foreground">ativas</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-wm-surface rounded-lg p-2">
          <p className="text-sm font-semibold">{agent.resolvedCount}</p>
          <p className="text-[10px] text-muted-foreground">Resolvidas</p>
        </div>
        <div className="bg-wm-surface rounded-lg p-2">
          <p className="text-sm font-semibold">{agent.messagesSent}</p>
          <p className="text-[10px] text-muted-foreground">Mensagens</p>
        </div>
        <div className="bg-wm-surface rounded-lg p-2">
          <p className="text-sm font-semibold">{formatDuration(agent.avgResponseTimeMs)}</p>
          <p className="text-[10px] text-muted-foreground">T. médio</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    OPEN: { label: 'Aberta', class: 'bg-blue-500/10 text-blue-400' },
    IN_PROGRESS: { label: 'Em andamento', class: 'bg-wm-green/10 text-wm-green' },
    WAITING: { label: 'Aguardando', class: 'bg-wm-yellow/10 text-wm-yellow' },
    RESOLVED: { label: 'Resolvida', class: 'bg-gray-500/10 text-gray-400' },
  };
  const s = map[status] ?? { label: status, class: '' };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', s.class)}>
      {s.label}
    </span>
  );
}
