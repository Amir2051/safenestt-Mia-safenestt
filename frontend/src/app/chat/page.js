'use client';
import AppShell from '@/components/AppShell';
import ChatLayout from '@/components/ChatLayout';

export default function ChatPage() {
  return (
    <AppShell>
      <ChatLayout embedded />
    </AppShell>
  );
}
