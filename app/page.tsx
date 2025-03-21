'use client';

import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthForm from './components/AuthForm';
import { Spinner } from './components/Spinner';

export default function Home() {
  const { user, initialLoading } = useAuth();

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="large" />
          <p className="mt-4 text-gray-600">Loading Hiiapp...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AuthForm />
      </div>
    );
  }

  return <Layout />;
} 