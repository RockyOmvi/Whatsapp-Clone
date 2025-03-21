'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatList from './ChatList';
import Chat from './Chat';
import { Spinner } from './Spinner';

const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Layout mounted, user:', user?.uid);
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="large" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      <div className="w-1/3 border-r bg-white">
        <ChatList
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          onError={setError}
        />
      </div>
      <div className="w-2/3 bg-white">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : selectedChatId ? (
          <Chat chatId={selectedChatId} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <h3 className="text-xl mb-2">Welcome to Hiiapp</h3>
              <p>Select a chat to start messaging or create a new chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout; 