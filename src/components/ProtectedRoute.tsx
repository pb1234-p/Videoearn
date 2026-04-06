import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabase';
import { Loader as Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from '../constants';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (data) {
          setProfile(data as UserProfile);
        } else if (error && error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const now = new Date().toISOString();
          const newProfile: UserProfile = {
            uid: user.id,
            email: user.email || '',
            displayName: user.user_metadata?.full_name || user.email || 'User',
            balance: 0,
            totalEarned: 0,
            role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
            createdAt: now,
            updatedAt: now,
          };
          const { data: insertedData } = await supabase
            .from('users')
            .insert(newProfile)
            .select()
            .single();

          if (insertedData) {
            setProfile(insertedData as UserProfile);
          }
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

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
