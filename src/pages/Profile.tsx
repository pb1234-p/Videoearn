import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';
import Layout from '../components/Layout';
import { User, Mail, Wallet, Save, Loader as Loader2, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../constants';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (data) {
        const profileData = data as UserProfile;
        setProfile(profileData);
        if (profileData.upiId) setUpiId(profileData.upiId);
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const profileChannel = supabase
      .channel('user-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `uid=eq.${user.id}`,
        },
        (payload) => {
          const profileData = payload.new as UserProfile;
          setProfile(profileData);
          if (profileData.upiId) setUpiId(profileData.upiId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!upiId.includes('@')) {
      setError('Invalid UPI ID format');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await supabase
        .from('users')
        .update({
          upiId: upiId,
          updatedAt: new Date().toISOString()
        })
        .eq('uid', user.id);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-32 relative">
            <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-full shadow-lg">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="pt-16 p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Full Name</p>
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <User className="w-4 h-4 text-gray-400" />
                  {profile?.displayName}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Email Address</p>
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {profile?.email}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Balance</p>
                <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                  <Wallet className="w-5 h-5" />
                  {CURRENCY_SYMBOL}{profile?.balance.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Account Role</p>
                <div className="flex items-center gap-2 text-gray-900 font-semibold capitalize">
                  {profile?.role}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6 pt-8 border-t border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Payment Information</h2>
              <div>
                <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-2">Default UPI ID</label>
                <input
                  type="text"
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">This UPI ID will be pre-filled when you request a withdrawal.</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-xl flex items-center gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  Profile updated successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
