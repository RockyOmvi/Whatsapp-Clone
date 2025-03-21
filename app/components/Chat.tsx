'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { PaperAirplaneIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  limit,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db, sendMessage } from '../utils/firebase';
import { Message } from '../types/chat';
import { formatTimestamp } from '../utils/date';

interface ChatProps {
  chatId: string;
}

const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatInitialized, setChatInitialized] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    console.log('Chat component mounted with chatId:', chatId);
    if (!chatId || !user) {
      console.log('Missing chatId or user:', { chatId, userId: user?.uid });
      setError('Chat not available');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Get chat details and other user's name
    const fetchChatDetails = async () => {
      try {
        console.log('Fetching chat details for:', chatId);
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        
        if (!isMounted) return;

        if (!chatDoc.exists()) {
          console.error('Chat document not found:', chatId);
          setError('Chat not found');
          setLoading(false);
          return;
        }

        const chatData = chatDoc.data();
        console.log('Chat data:', chatData);
        
        const otherUserId = chatData.users.find((id: string) => id !== user.uid);
        if (!otherUserId) {
          console.error('Other user not found in chat users');
          setError('Chat participant not found');
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (!isMounted) return;

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Other user data:', userData);
          setOtherUserName(userData.displayName || 'Unknown User');
          setChatInitialized(true);
        } else {
          console.error('User document not found:', otherUserId);
          setError('User not found');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error fetching chat details:', error);
        if (isMounted) {
          setError('Failed to load chat details');
          setLoading(false);
        }
      }
    };

    // Set up messages listener
    console.log('Setting up messages listener for chat:', chatId);
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery, 
      (snapshot) => {
        if (!isMounted) return;
        console.log('Received messages update:', snapshot.size, 'messages');
        const newMessages: Message[] = [];
        snapshot.forEach((doc) => {
          const messageData = doc.data();
          console.log('Message data:', messageData);
          newMessages.push({ 
            id: doc.id,
            ...messageData
          } as Message);
        });
        setMessages(newMessages);
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      },
      (error) => {
        console.error('Error listening to messages:', error);
        if (isMounted) {
          setError('Failed to load messages');
          setLoading(false);
        }
      }
    );

    // Fetch initial data
    fetchChatDetails();

    return () => {
      console.log('Cleaning up chat component');
      isMounted = false;
      unsubscribe();
    };
  }, [chatId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId) return;

    try {
      console.log('Sending message:', {
        chatId,
        senderId: user.uid,
        text: newMessage.trim()
      });
      
      await sendMessage(chatId, user.uid, newMessage.trim());
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#25D366] mb-2"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-[#25D366] text-white rounded hover:bg-opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5]">
      {/* Chat header */}
      <div className="bg-[#f0f2f5] p-4 border-b flex items-center">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{otherUserName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.senderId === user?.uid
                  ? 'bg-[#dcf8c6] text-black'
                  : 'bg-white text-black'
              }`}
            >
              <p className="break-words">{message.text}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatTimestamp(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-[#f0f2f5] border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message"
            className="flex-1 px-4 py-2 rounded-full border focus:outline-none focus:border-[#25D366]"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-[#25D366] text-white rounded-full hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 