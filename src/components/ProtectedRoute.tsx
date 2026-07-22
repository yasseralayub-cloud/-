import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      // 1. Check PIN / Session storage first
      const isPinAuth = sessionStorage.getItem('admin_authenticated') === 'true';
      if (isPinAuth) {
        setIsAdmin(true);
        return;
      }

      // 2. Check Firebase Auth User
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const IS_BOOTSTRAPPED_ADMIN = user.email === 'yasseralayub@gmail.com';
          setIsAdmin(adminDoc.exists() || IS_BOOTSTRAPPED_ADMIN);
        } catch (err) {
          console.error('Error verifying admin status:', err);
          setIsAdmin(true);
        }
      } else {
        setIsAdmin(false);
      }
    }
    if (!loading) {
      checkAdmin();
    }
  }, [user, loading]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
