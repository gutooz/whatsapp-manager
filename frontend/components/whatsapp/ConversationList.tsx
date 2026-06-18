'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/components/socket-provider';
import { cn, formatRelative, getInitials } from '@/lib/utils';
import type { Conversation, ConversationStatus } from '@/lib/types';

type TabValue = 'all' | 'mine' | 'unassigned' | 'resolved';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'mine', label: 'Minhas' },
  { value: 'unassigned', label: 'Sem atribuição' },
  { value: 'resolved', label: 'Resolvidas' },
];

const STATUS_COLORS: Record<ConversationStatus, string> = {
  OPEN: 'bg-blue-500',
  IN_PROGRESS: 'bg-wm-green',
  RESOLVED: 'bg-gray-500',
  WAITING: 'bg-wm-yellow',
};

interface Props {
  selectedId?: string;
  onSelect: (conv: Conversation) => void;
}

export function ConversationList({ selectedId, onSelect }: Props) {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabValue>('all');

  const buildParams = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (tab === 'mine') params.userId = user!.id;
    if (tab === 'resolved') params.status = 'RESOLVED';
    if (tab === 'unassigned') params.unassigned = 'true';
    return params;
  };

  const { data } = useQuery({
    queryKey: ['conversations', tab, search],
    queryFn: async () => {
      const { data } = await api.get<{ items: Conversation[] }>('/conversations', {
        params: buildParams(),
      });
      return data.items;
    },
  });

  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });
    socket.on('conversation_updated', handler);
    socket.on('new_message', handler);
    return () => {
      socket.off('conversation_updated', handler);
      socket.off('new_message', handler);
    };
  }, [socket, queryClient]);

  const conversations = data ?? [];

  return (
    <div className="w-80 flex flex-col h-full bg-wm-sidebar border-r border-border">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full bg-wm-surface rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wm-green"
          />
        </div>
      </div>

      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              tab === t.value
                ? 'text-wm-green border-b-2 border-wm-green'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Nenhuma conversa</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              selected={conv.id === selectedId}
              onClick={() => onSelect(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation: conv,
  selected,
  onClick,
}: {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
}) {
  const displayName = conv.contact.name ?? conv.contact.phone;
  const isUnassigned = !conv.assignment;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left hover:bg-wm-surface transition-colors border-b border-border/50',
        selected && 'bg-wm-surface',
      )}
    >
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white',
          )}
          style={{
            backgroundColor: conv.assignment?.user?.color ?? '#64748b',
          }}
        >
          {conv.contact.profilePic ? (
            <img
              src={conv.contact.profilePic}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(displayName)
          )}
        </div>
        {conv.assignment && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-wm-sidebar"
            style={{ backgroundColor: conv.assignment.user.color }}
            title={conv.assignment.user.name}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {conv.lastMessageAt ? formatRelative(conv.lastMessageAt) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {conv.lastMessage ?? 'Nenhuma mensagem'}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isUnassigned && (
              <span title="Sem responsável"><AlertTriangle className="h-3 w-3 text-wm-yellow" /></span>
            )}
            {conv.unreadCount > 0 && (
              <span className="bg-wm-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {conv.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
