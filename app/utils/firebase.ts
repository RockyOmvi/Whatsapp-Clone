import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  DocumentData,
  updateDoc,
  doc,
  writeBatch,
  query,
  getDocs,
  where
} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only if it hasn't been initialized yet
let app: FirebaseApp;
if (!getApps().length) {
  try {
    console.log('Initializing Firebase with config:', {
      ...firebaseConfig,
      apiKey: '***' // Hide API key in logs
    });
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw new Error('Failed to initialize Firebase');
  }
} else {
  app = getApps()[0];
  console.log('Using existing Firebase instance');
}

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Set authentication persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence set successfully');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Collection references
export const chatsRef = collection(db, 'chats');
export const messagesRef = collection(db, 'messages');
export const usersRef = collection(db, 'users');

// Helper functions
export const createChat = async (users: string[]): Promise<DocumentData> => {
  console.log('Creating new chat with users:', users);
  
  // Check if chat already exists
  const existingChatsQuery = query(
    collection(db, 'chats'),
    where('users', 'array-contains', users[0])
  );
  
  const existingChats = await getDocs(existingChatsQuery);
  const existingChat = existingChats.docs.find(doc => {
    const chatUsers = doc.data().users;
    return chatUsers.includes(users[1]);
  });

  if (existingChat) {
    console.log('Chat already exists:', existingChat.id);
    return existingChat;
  }

  // Create new chat
  const chatDoc = await addDoc(chatsRef, {
    users,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageTime: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  console.log('Chat created with ID:', chatDoc.id);
  return chatDoc;
};

export const sendMessage = async (chatId: string, senderId: string, text: string): Promise<DocumentData> => {
  console.log('Sending message in chat:', chatId);
  const batch = writeBatch(db);
  
  // Create the message document in the subcollection
  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  batch.set(messageRef, {
    senderId,
    text,
    timestamp: serverTimestamp(),
    read: false
  });

  // Update the chat's last message and time
  const chatRef = doc(db, 'chats', chatId);
  batch.update(chatRef, {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Commit the batch
  await batch.commit();
  console.log('Message sent with ID:', messageRef.id);
  return messageRef;
};

export { auth, db }; 