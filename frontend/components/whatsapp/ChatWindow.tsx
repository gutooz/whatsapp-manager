'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Paperclip, Info, ChevronDown, Check, CheckCheck,
  Loader2, Phone, MoreVertical,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/components/socket-provider';
import { cn, formatTime, getInitials, formatPhone } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { AssignButton } from './AssignButton';
import type { Conversation, Message } from '@/lib/types';

interface Props {
  conversation: Conversation;
  onUpdate: (c: Conversation) => void;
  onInfoToggle: () => void;
  showInfo: boolean;
}

export function ChatWindow({ conversation, onUpdate, onInfoToggle, showInfo }: Props) {
  const { user } = useAuthStore();
  const { socket, joinConversation, leaveConversation } = useSocket();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isAssigned = conversation.assignment?.userId === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const canSend = isAssigned || isAdmin;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', conversation.id],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<{ items: Message[]; nextCursor: string | null; hasMore: boolean }>(
        `/conversations/${conversation.id}/messages`,
        { params: { cursor: pageParam, limit: 40 } },
      );
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (first) => first.nextCursor ?? undefined,
  });

  const messages = data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    joinConversation(conversation.id);
    return () => leaveConversation(conversation.id);
  }, [conversation.id]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (msg: Message) => {
      if (msg.conversationId === conversation.id) {
        queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      }
    };
    const handleTyping = (d: { conversationId: string; typing: boolean }) => {
      if (d.conversationId === conversation.id) setTyping(d.typing);
    };
    socket.on('new_message', handleNew);
    socket.on('typing_indicator', handleTyping);
    return () => {
      socket.off('new_message', handleNew);
      socket.off('typing_indicator', handleTyping);
    };
  }, [socket, conversation.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/conversations/${conversation.id}/messages`, {
        content,
        type: 'TEXT',
      });
      return data;
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const contact = conversation.contact;
  const displayName = contact.name ?? contact.phone;

  return (
    <div className="flex-1 flex flex-col h-full bg-wm-bg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-wm-sidebar border-b border-border flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: conversation.assignment?.user?.color ?? '#64748b' }}
        >
          {contact.profilePic ? (
            <img src={contact.profilePic} alt={displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{displayName}</p>
          <p className="text-xs text-muted-foreground">{formatPhone(contact.phone)}</p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            conversationId={conversation.id}
            status={conversation.status}
            onUpdate={(s) => onUpdate({ ...conversation, status: s })}
          />

          {isAdmin && (
            <AssignButton
              conversationId={conversation.id}
              current={conversation.assignment}
              onAssign={(assignment) => onUpdate({ ...conversation, assignment })}
            />
          )}

          <button
            onClick={onInfoToggle}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showInfo
                ? 'bg-wm-green text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-wm-surface',
            )}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      >
        {hasNextPage && (
          <div className="flex justify-center pb-2">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-wm-green hover:underline"
            >
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const showSender =
            msg.direction === 'OUTBOUND' &&
            msg.sentBy &&
            msg.sentById !== prev?.sentById;

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              showSender={showSender ?? false}
              isCurrentUser={msg.sentById === user?.id}
            />
          );
        })}

        {typing && (
          <div className="flex items-end gap-2">
            <div className="bg-wm-surface text-foreground px-4 py-2 rounded-2xl rounded-bl-none text-sm">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 bg-wm-sidebar border-t border-border flex-shrink-0">
        {!canSend && (
          <div className="text-xs text-muted-foreground text-center mb-2 py-1 bg-wm-surface/50 rounded">
            Conversa atribuída a{' '}
            <span style={{ color: conversation.assignment?.user.color }}>
              {conversation.assignment?.user.name ?? 'outro membro'}
            </span>
            . Solicite ao gestor para transferir.
          </div>
        )}

        <div className="flex items-end gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canSend || sendMutation.isPending}
            placeholder={canSend ? 'Digite uma mensagem... (Enter para enviar)' : 'Sem permissão para enviar'}
            rows={1}
            className={cn(
              'flex-1 bg-wm-surface rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wm-green resize-none max-h-32',
              !canSend && 'opacity-50 cursor-not-allowed',
            )}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />

          <button
            onClick={handleSend}
            disabled={!canSend || !text.trim() || sendMutation.isPending}
            className={cn(
              'p-2.5 rounded-xl transition-colors flex-shrink-0',
              canSend && text.trim()
                ? 'bg-wm-green text-white hover:bg-wm-green-hover'
                : 'bg-wm-surface text-muted-foreground cursor-not-allowed',
            )}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message: msg,
  showSender,
  isCurrentUser,
}: {
  message: Message;
  showSender: boolean;
  isCurrentUser: boolean;
}) {
  const isOut = msg.direction === 'OUTBOUND';

  return (
    <div className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative max-w-[70%] px-3 py-2 rounded-2xl text-sm',
          isOut
            ? 'rounded-br-none text-white'
            : 'bg-wm-surface text-foreground rounded-bl-none',
        )}
        style={
          isOut
            ? { backgroundColor: msg.sentBy?.color ?? '#25D366' }
            : undefined
        }
      >
        {showSender && msg.sentBy && (
          <p className="text-[10px] font-semibold mb-1 opacity-80">
            {msg.sentBy.name}
          </p>
        )}

        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>

        <div className={cn('flex items-center gap-1 mt-1', isOut ? 'justify-end' : 'justify-end')}>
          <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
          {isOut && <MessageStatusIcon status={msg.status} />}
        </div>

        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-0 mb-1 bg-wm-sidebar text-foreground text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none border border-border">
          {msg.sentBy ? `Enviado por ${msg.sentBy.name}` : 'Recebido'}
          {' às '}
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'FAILED') return <span className="text-[10px] text-red-300">!</span>;
  if (status === 'READ') return <CheckCheck className="w-3 h-3 text-blue-300" />;
  if (status === 'DELIVERED') return <CheckCheck className="w-3 h-3 opacity-60" />;
  return <Check className="w-3 h-3 opacity-60" />;
}
