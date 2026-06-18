'use client';
import { useState, useEffect } from 'react';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatWindow } from '@/components/whatsapp/ChatWindow';
import { ConversationInfo } from '@/components/whatsapp/ConversationInfo';
import type { Conversation } from '@/lib/types';

export default function WhatsAppPage() {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ConversationList
        selectedId={selectedConv?.id}
        onSelect={(conv) => {
          setSelectedConv(conv);
          setShowInfo(false);
        }}
      />

      {selectedConv ? (
        <>
          <ChatWindow
            conversation={selectedConv}
            onUpdate={setSelectedConv}
            onInfoToggle={() => setShowInfo(!showInfo)}
            showInfo={showInfo}
          />
          {showInfo && (
            <ConversationInfo
              conversation={selectedConv}
              onUpdate={setSelectedConv}
              onClose={() => setShowInfo(false)}
            />
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-wm-bg">
          <div className="text-center text-muted-foreground">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-lg font-medium">Selecione uma conversa</p>
            <p className="text-sm mt-1">Escolha uma conversa na lista para começar</p>
          </div>
        </div>
      )}
    </div>
  );
}
