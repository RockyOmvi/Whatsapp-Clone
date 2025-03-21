'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, createChat } from '../utils/firebase';
import { Spinner } from './Spinner';

interface Chat {
  id: string;
  users: string[];
  lastMessage: string | null;
  lastMessageTime: any;
  createdAt: any;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

const ChatList: React.FC<{
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onError: (error: string) => void;
}> = ({ selectedChatId, onSelectChat, onError }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up chat list listener for user:', user.uid);
    const q = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      console.log('Chats updated:', chatList);
      setChats(chatList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching chats:', error);
      onError('Failed to load chats');
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up chat list listener');
      unsubscribe();
    };
  }, [user, onError]);

  const searchUser = async () => {
    if (!searchEmail || !user) return;

    try {
      setSearching(true);
      setSearchResult(null);
      onError('');

      console.log('Searching for user with email:', searchEmail);
      
      // First try exact match
      let q = query(
        collection(db, 'users'),
        where('email', '==', searchEmail.toLowerCase())
      );

      let querySnapshot = await getDocs(q);
      
      // If no exact match, try case-insensitive search
      if (querySnapshot.empty) {
        console.log('No exact match found, trying case-insensitive search');
        q = query(
          collection(db, 'users'),
          where('email', '>=', searchEmail.toLowerCase()),
          where('email', '<=', searchEmail.toLowerCase() + '\uf8ff')
        );
        
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        console.log('No user found with email:', searchEmail);
        onError('User not found');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as User;
      
      if (userDoc.id === user.uid) {
        console.log('Cannot chat with yourself');
        onError('Cannot chat with yourself');
        return;
      }

      // Check if chat already exists
      const existingChatsQuery = query(
        collection(db, 'chats'),
        where('users', 'array-contains', user.uid)
      );
      
      const existingChats = await getDocs(existingChatsQuery);
      const existingChat = existingChats.docs.find(doc => {
        const chatUsers = doc.data().users;
        return chatUsers.includes(userDoc.id);
      });

      if (existingChat) {
        console.log('Chat already exists:', existingChat.id);
        onSelectChat(existingChat.id);
        setSearchEmail('');
        setSearchResult(null);
        return;
      }

      console.log('User found:', userData);
      setSearchResult({
        id: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL
      });
    } catch (error) {
      console.error('Error searching user:', error);
      onError('Failed to search user');
    } finally {
      setSearching(false);
    }
  };

  const startChat = async () => {
    if (!searchResult || !user) return;

    try {
      console.log('Starting chat with user:', searchResult.id);
      const chatDoc = await createChat([user.uid, searchResult.id]);
      console.log('Chat created:', chatDoc.id);
      onSelectChat(chatDoc.id);
      setSearchEmail('');
      setSearchResult(null);
    } catch (error) {
      console.error('Error creating chat:', error);
      onError('Failed to create chat');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="medium" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <input
            type="email"
            placeholder="Search user by email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          />
          <button
            onClick={searchUser}
            disabled={searching || !searchEmail}
            className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] disabled:opacity-50"
          >
            {searching ? <Spinner size="small" /> : 'Search'}
          </button>
        </div>
        {searchResult && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                {searchResult.photoURL ? (
                  <img
                    src={searchResult.photoURL}
                    alt={searchResult.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 text-lg">
                    {searchResult.displayName[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium">{searchResult.displayName}</p>
                <p className="text-sm text-gray-500">{searchResult.email}</p>
              </div>
            </div>
            <button
              onClick={startChat}
              className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E]"
            >
              Start Chat
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => {
          const otherUserId = chat.users.find(id => id !== user?.uid);
          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                selectedChatId === chat.id ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 text-lg">
                    {chat.lastMessage ? chat.lastMessage[0].toUpperCase() : 'C'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">Chat with {otherUserId}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList; 