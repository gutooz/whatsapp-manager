'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import { UserPlus, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import type { ConversationAssignment, User } from '@/lib/types';

interface Props {
  conversationId: string;
  current?: ConversationAssignment;
  onAssign: (assignment: ConversationAssignment) => void;
}

export function AssignButton({ conversationId, current, onAssign }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: team } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/team');
      return data.filter((u) => u.isActive);
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/conversations/${conversationId}/assign`, { userId });
      return data;
    },
    onSuccess: (data) => {
      onAssign(data.assignment);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-wm-surface text-muted-foreground hover:text-foreground transition-colors"
          title="Atribuir conversa"
        >
          {current ? (
            <>
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: current.user.color }}
              >
                {getInitials(current.user.name)}
              </div>
              <span>{current.user.name}</span>
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              <span>Atribuir</span>
            </>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-56 bg-wm-sidebar border border-border rounded-lg shadow-xl p-1"
          align="end"
          sideOffset={5}
        >
          <p className="text-xs text-muted-foreground px-2 py-1.5 font-medium">Atribuir para</p>
          {team?.map((member) => (
            <button
              key={member.id}
              onClick={() => mutation.mutate(member.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover:bg-wm-surface transition-colors',
                current?.userId === member.id && 'bg-wm-surface',
              )}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: member.color }}
              >
                {getInitials(member.name)}
              </div>
              <span className="flex-1 text-left">{member.name}</span>
              {current?.userId === member.id && <Check className="h-3.5 w-3.5 text-wm-green" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
