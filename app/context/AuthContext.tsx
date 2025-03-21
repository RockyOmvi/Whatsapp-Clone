'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  User,
  ConfirmationResult,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithPhone: (phoneOrVerificationId: string, code?: string) => Promise<ConfirmationResult | void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize auth state listener
  useEffect(() => {
    console.log('Setting up auth listener');
    setMounted(true);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        console.log('Auth state changed:', user ? `User logged in: ${user.uid}` : 'No user');
        
        try {
          if (user) {
            // Update user data in Firestore
            const userRef = doc(db, 'users', user.uid);
            const userData = {
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
              photoURL: user.photoURL,
              lastSeen: serverTimestamp(),
              phoneNumber: user.phoneNumber,
              createdAt: serverTimestamp(),
            };
            
            console.log('Updating user data:', userData);
            await setDoc(userRef, userData, { merge: true });
            setUser(user);
            setError(null);
          } else {
            setUser(null);
            setError(null);
          }
        } catch (error) {
          console.error('Error updating user data:', error);
          setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
          if (mounted) {
            setInitialLoading(false);
          }
        }
      },
      (error) => {
        console.error('Auth state error:', error);
        setError(error instanceof Error ? error.message : 'Authentication error');
        if (mounted) {
          setInitialLoading(false);
        }
      }
    );

    // Set a shorter timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && initialLoading) {
        console.log('Auth initialization timeout, setting initialLoading to false');
        setInitialLoading(false);
      }
    }, 2000); // 2 second timeout

    return () => {
      console.log('Cleaning up auth listener');
      setMounted(false);
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [mounted]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      setInitialLoading(false);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log('Starting Google sign-in process...');
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', result.user.uid);

      // Update user data in Firestore
      const userRef = doc(db, 'users', result.user.uid);
      const userData = {
        email: result.user.email,
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Anonymous',
        photoURL: result.user.photoURL,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      
      console.log('Updating user data in Firestore:', userData);
      await setDoc(userRef, userData, { merge: true });
      
      // Set user state after successful Firestore update
      setUser(result.user);
      setError(null);
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      setInitialLoading(false);

      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign-in successful:', result.user.uid);
      setUser(result.user);
    } catch (error) {
      console.error('Email sign-in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in with email');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      setInitialLoading(false);

      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Email sign-up successful:', result.user.uid);
      
      // Update user profile
      await updateProfile(result.user, {
        displayName: name
      });
      
      setUser(result.user);
    } catch (error) {
      console.error('Email sign-up error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign up with email');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhone = async (phoneOrVerificationId: string, code?: string): Promise<ConfirmationResult | void> => {
    try {
      setLoading(true);
      setError(null);
      setInitialLoading(false);

      if (!code) {
        // Step 1: Request OTP
        console.log('Requesting OTP for:', phoneOrVerificationId);
        
        // Clear any existing recaptcha
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
        }

        // Create new recaptcha
        window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          },
        }, auth);

        const formattedPhone = phoneOrVerificationId.startsWith('+') 
          ? phoneOrVerificationId 
          : `+${phoneOrVerificationId}`;

        const confirmationResult = await signInWithPhoneNumber(
          auth,
          formattedPhone,
          window.recaptchaVerifier
        );

        window.confirmationResult = confirmationResult;
        console.log('OTP sent successfully');
        return confirmationResult;
      } else {
        // Step 2: Verify OTP
        console.log('Verifying OTP');
        if (!window.confirmationResult) {
          throw new Error('Please request OTP first');
        }
        
        const result = await window.confirmationResult.confirm(code);
        console.log('OTP verified successfully');

        // Update user profile in Firestore
        if (result.user) {
          const userRef = doc(db, 'users', result.user.uid);
          await setDoc(userRef, {
            phoneNumber: result.user.phoneNumber,
            lastSeen: serverTimestamp(),
            createdAt: serverTimestamp(),
          }, { merge: true });
        }

        setUser(result.user);

        // Clear confirmationResult after successful verification
        window.confirmationResult = null;
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      }
    } catch (error) {
      console.error('Phone sign-in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in with phone');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      setInitialLoading(false);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign out');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    initialLoading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithPhone,
    signOut,
  }), [user, loading, initialLoading, error]);

  if (initialLoading && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#25D366] mb-4"></div>
          <p className="text-gray-600">Loading Hiiapp...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
};

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
    confirmationResult: ConfirmationResult | null;
  }
} 