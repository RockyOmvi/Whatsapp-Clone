'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'signin' | 'signup' | 'phone';

const AuthForm: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithPhone, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');

  const validateForm = () => {
    if (mode === 'signin' || mode === 'signup') {
      if (!email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!password.trim()) {
        setError('Password is required');
        return false;
      }
      if (mode === 'signup' && !name.trim()) {
        setError('Name is required');
        return false;
      }
    } else if (mode === 'phone') {
      if (!verificationId && !phone.trim()) {
        setError('Phone number is required');
        return false;
      }
      if (verificationId && !otp.trim()) {
        setError('OTP is required');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formLoading) return;
    
    setError(null);
    if (!validateForm()) return;

    setFormLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, name.trim());
      } else if (mode === 'phone') {
        if (!verificationId) {
          const confirmationResult = await signInWithPhone(phone.trim());
          if (confirmationResult) {
            setVerificationId(confirmationResult.verificationId);
          }
        } else {
          await signInWithPhone(verificationId, otp.trim());
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = 'An error occurred during authentication';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered';
      } else if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      }
      
      setError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (formLoading) return;
    
    setError(null);
    setFormLoading(true);
    
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError('Failed to sign in with Google');
    } finally {
      setFormLoading(false);
    }
  };

  const isLoading = loading || formLoading;

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#00a884] text-white py-16">
        <h1 className="text-center text-2xl font-light">Hiiapp</h1>
      </div>
      
      <div className="bg-white p-8 shadow-md">
        <div className="mb-8">
          <h2 className="text-xl font-light text-center text-gray-800">
            {mode === 'signin' ? 'Sign in to Hiiapp' : mode === 'signup' ? 'Create your account' : 'Sign in with phone'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'phone' ? (
            <>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full p-3 border-b focus:outline-none focus:border-[#00a884]"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 border-b focus:outline-none focus:border-[#00a884]"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
              {mode === 'signup' && (
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full p-3 border-b focus:outline-none focus:border-[#00a884]"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {!verificationId ? (
                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number (with country code)"
                    className="w-full p-3 border-b focus:outline-none focus:border-[#00a884]"
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example: +1234567890
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="w-full p-3 border-b focus:outline-none focus:border-[#00a884]"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full p-3 text-white rounded-md ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#00a884] hover:bg-[#008f6f]'
            }`}
          >
            {isLoading
              ? 'Please wait...'
              : mode === 'signin'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Sign Up'
              : !verificationId
              ? 'Send OTP'
              : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`mt-4 w-full p-3 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center space-x-2 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-5 h-5"
            />
            <span>Google</span>
          </button>
        </div>

        <div className="mt-6 text-center space-x-4">
          <button
            onClick={() => {
              if (!isLoading) {
                setMode('signin');
                setError(null);
                setVerificationId('');
                setOtp('');
              }
            }}
            disabled={isLoading}
            className={`text-sm ${
              mode === 'signin' ? 'text-[#00a884] font-medium' : 'text-gray-600'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              if (!isLoading) {
                setMode('signup');
                setError(null);
                setVerificationId('');
                setOtp('');
              }
            }}
            disabled={isLoading}
            className={`text-sm ${
              mode === 'signup' ? 'text-[#00a884] font-medium' : 'text-gray-600'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Sign Up
          </button>
          <button
            onClick={() => {
              if (!isLoading) {
                setMode('phone');
                setError(null);
                setVerificationId('');
                setOtp('');
              }
            }}
            disabled={isLoading}
            className={`text-sm ${
              mode === 'phone' ? 'text-[#00a884] font-medium' : 'text-gray-600'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Phone
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm; 