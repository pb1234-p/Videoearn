import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from '../constants';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const [user, loading] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Create initial profile if it doesn't exist
          const now = new Date().toISOString();
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            balance: 0,
            totalEarned: 0,
            role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      }
      setProfileLoading(false);
    };

    if (!loading) {
      if (!user) {
        setProfileLoading(false);
      } else {
        fetchOrCreateProfile();
      }
    }
  }, [user, loading]);

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user && adminOnly) {
    return <Navigate to="/" />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
