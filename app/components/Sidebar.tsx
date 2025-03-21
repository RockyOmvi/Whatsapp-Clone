'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatBubbleLeftIcon, UserCircleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import ChatList from './ChatList';

interface SidebarProps {}

const Sidebar: React.FC<SidebarProps> = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'chats' | 'profile'>('chats');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="w-80 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={user?.photoURL || ''}
            alt="Profile"
            className="w-10 h-10 rounded-full"
          />
          <span className="font-medium">{user?.displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-gray-600 hover:text-gray-800"
          aria-label="Sign out"
        >
          <ArrowLeftOnRectangleIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'chats'
              ? 'text-green-500 border-b-2 border-green-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('chats')}
          aria-label="Show chats"
        >
          <ChatBubbleLeftIcon className="w-5 h-5 mx-auto" />
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'profile'
              ? 'text-green-500 border-b-2 border-green-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('profile')}
          aria-label="Show profile"
        >
          <UserCircleIcon className="w-5 h-5 mx-auto" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <ChatList onChatSelect={() => {}} />
        ) : (
          <div className="p-4">
            <div className="space-y-4">
              <div className="text-center">
                <img
                  src={user?.photoURL || ''}
                  alt="Profile"
                  className="w-24 h-24 rounded-full mx-auto"
                />
                <h2 className="mt-4 font-medium text-xl">{user?.displayName}</h2>
                <p className="text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 