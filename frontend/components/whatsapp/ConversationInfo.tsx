'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Clock, Tag, StickyNote, History, Phone, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn, formatRelative, formatPhone, getInitials } from '@/lib/utils';
import type { Conversation, ConversationNote, AssignmentHistory } from '@/lib/types';

interface Props {
  conversation: Conversation;
  onUpdate: (c: Conversation) => void;
  onClose: () => void;
}

export function ConversationInfo({ conversation: conv, onUpdate, onClose }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const isAdmin = user?.role === 'ADMIN';

  const { data: detail } = useQuery({
    queryKey: ['conversation-detail', conv.id],
    queryFn: async () => {
      const { data } = await api.get<
        Conversation & { notes: ConversationNote[]; assignmentHistory: AssignmentHistory[] }
      >(`/conversations/${conv.id}`);
      return data;
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      await api.post(`/conversations/${conv.id}/notes`, { content });
    },
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', conv.id] });
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      const { data } = await api.patch<Conversation>(`/conversations/${conv.id}`, { tags });
      return data;
    },
    onSuccess: (data) => onUpdate(data),
  });

  const contact = conv.contact;
  const displayName = contact.name ?? contact.phone;

  return (
    <div className="w-72 flex flex-col h-full bg-wm-sidebar border-l border-border overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-sm">Informações</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-wm-surface"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-0 overflow-y-auto">
        <Section title="Contato" icon={<User className="h-4 w-4" />}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ backgroundColor: conv.assignment?.user?.color ?? '#64748b' }}
            >
              {contact.profilePic ? (
                <img src={contact.profilePic} alt={displayName} className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhone(contact.phone)}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Responsável" icon={<User className="h-4 w-4" />}>
          {conv.assignment ? (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: conv.assignment.user.color }}
              >
                {getInitials(conv.assignment.user.name)}
              </div>
              <div>
                <p className="text-sm font-medium">{conv.assignment.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  Desde {formatRelative(conv.assignment.assignedAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem responsável</p>
          )}
        </Section>

        <Section title="Tags" icon={<Tag className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1.5">
            {conv.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-wm-surface border border-border px-2 py-0.5 rounded-full"
              >
                {tag}
                {isAdmin && (
                  <button
                    onClick={() => updateTagsMutation.mutate(conv.tags.filter((t) => t !== tag))}
                    className="text-muted-foreground hover:text-wm-red"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {isAdmin && (
              <TagInput
                onAdd={(tag) => {
                  if (!conv.tags.includes(tag)) {
                    updateTagsMutation.mutate([...conv.tags, tag]);
                  }
                }}
              />
            )}
          </div>
        </Section>

        <Section title="Notas internas" icon={<StickyNote className="h-4 w-4" />}>
          <div className="space-y-2">
            {detail?.notes?.map((note) => (
              <div key={note.id} className="bg-wm-surface rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: note.user.color }}
                  >
                    {getInitials(note.user.name)}
                  </div>
                  <span className="text-xs font-medium">{note.user.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {formatRelative(note.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-foreground whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}

            <div className="mt-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Adicionar nota interna..."
                rows={2}
                className="w-full bg-wm-surface rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wm-green resize-none"
              />
              <button
                onClick={() => noteText.trim() && addNoteMutation.mutate(noteText.trim())}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                className="mt-1 w-full text-xs py-1.5 bg-wm-surface hover:bg-wm-green hover:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Salvar nota
              </button>
            </div>
          </div>
        </Section>

        <Section title="Histórico de atribuições" icon={<History className="h-4 w-4" />}>
          <div className="space-y-2">
            {detail?.assignmentHistory?.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem histórico</p>
            )}
            {detail?.assignmentHistory?.map((h) => (
              <div key={h.id} className="flex gap-2 text-xs">
                <div className="w-1 bg-wm-green/20 rounded-full flex-shrink-0" />
                <div>
                  <p className="font-medium">{h.userName}</p>
                  <p className="text-muted-foreground">
                    por {h.assignedByName} · {formatRelative(h.assignedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-muted-foreground">{icon}</span>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) { onAdd(value.trim()); setValue(''); }
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+ tag"
        className="text-xs bg-wm-surface border border-dashed border-border rounded-full px-2 py-0.5 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wm-green w-16"
      />
    </form>
  );
}
