import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  increment,
  getDoc,
  where
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Video, WithdrawalRequest, UserProfile } from '../types';
import Layout from '../components/Layout';
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  PlayCircle, 
  Wallet, 
  Users, 
  AlertCircle,
  Video as VideoIcon,
  ExternalLink
} from 'lucide-react';
import { ADMIN_EMAIL, CURRENCY_SYMBOL } from '../constants';
import { Navigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getYouTubeId } from '../lib/utils';

import AdminWithdrawalRow from '../components/AdminWithdrawalRow';

export default function AdminDashboard() {
  const [user] = useAuthState(auth);
  const [videos, setVideos] = useState<Video[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'withdrawals' | 'users'>('videos');

  // Video Form State
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    rewardAmount: '',
    duration: '60',
  });
  const [addingVideo, setAddingVideo] = useState(false);

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;

    const unsubscribeVideos = onSnapshot(
      query(collection(db, 'videos'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'videos')
    );

    const unsubscribeWithdrawals = onSnapshot(
      query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
    );

    const unsubscribeUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    return () => {
      unsubscribeVideos();
      unsubscribeWithdrawals();
      unsubscribeUsers();
    };
  }, [user]);

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/" />;
  }

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingVideo(true);
    try {
      const now = new Date().toISOString();
      const videoData: Omit<Video, 'id'> = {
        title: newVideo.title,
        description: newVideo.description,
        youtubeUrl: newVideo.youtubeUrl,
        rewardAmount: parseFloat(newVideo.rewardAmount),
        duration: parseInt(newVideo.duration),
        createdAt: now,
        active: true,
      };
      await addDoc(collection(db, 'videos'), videoData);
      setNewVideo({ title: '', description: '', youtubeUrl: '', rewardAmount: '', duration: '60' });
    } catch (err) {
      console.error('Failed to add video', err);
      handleFirestoreError(err, OperationType.CREATE, 'videos');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await deleteDoc(doc(db, 'videos', id));
      } catch (err) {
        console.error('Failed to delete video', err);
        handleFirestoreError(err, OperationType.DELETE, `videos/${id}`);
      }
    }
  };

  const handleApproveWithdrawal = async (request: WithdrawalRequest) => {
    if (request.status !== 'pending') return;
    
    try {
      const now = new Date().toISOString();
      // 1. Update user balance (subtract the amount)
      const userRef = doc(db, 'users', request.userId);
      await updateDoc(userRef, {
        balance: increment(-request.amount),
        updatedAt: now
      });

      // 2. Update withdrawal status
      const withdrawalRef = doc(db, 'withdrawals', request.id);
      await updateDoc(withdrawalRef, {
        status: 'approved',
        updatedAt: now
      });
    } catch (err) {
      console.error('Failed to approve withdrawal', err);
      handleFirestoreError(err, OperationType.WRITE, `withdrawals/${request.id}`);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      const withdrawalRef = doc(db, 'withdrawals', id);
      await updateDoc(withdrawalRef, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to reject withdrawal', err);
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${id}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'videos' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'withdrawals' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Withdrawals
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Users
            </button>
          </div>
        </div>

        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Video Form */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  Add New Video
                </h2>
                <form onSubmit={handleAddVideo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                    <input
                      type="url"
                      value={newVideo.youtubeUrl}
                      onChange={(e) => setNewVideo({ ...newVideo, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reward Amount ({CURRENCY_SYMBOL})</label>
                    <input
                      type="number"
                      value={newVideo.rewardAmount}
                      onChange={(e) => setNewVideo({ ...newVideo, rewardAmount: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Required Watch Time (seconds)</label>
                    <input
                      type="number"
                      value={newVideo.duration}
                      onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingVideo}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Video'}
                  </button>
                </form>
              </div>
            </div>

            {/* Video List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Manage Videos ({videos.length})</h2>
              {videos.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-500">
                  No videos added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {videos.map((video) => (
                    <div key={video.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className="w-24 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        <img 
                          src={`https://img.youtube.com/vi/${getYouTubeId(video.youtubeUrl)}/mqdefault.jpg`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{video.title}</h3>
                        <p className="text-xs text-gray-500">{CURRENCY_SYMBOL}{video.rewardAmount} Reward</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Withdrawal Requests ({withdrawals.length})</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">UPI ID</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No withdrawal requests found.</td>
                      </tr>
                    ) : (
                      withdrawals.map((req) => (
                        <AdminWithdrawalRow 
                          key={req.id} 
                          request={req} 
                          onApprove={handleApproveWithdrawal} 
                          onReject={handleRejectWithdrawal} 
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Registered Users ({users.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((u) => (
                <div key={u.uid} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{u.displayName}</h3>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Balance</p>
                      <p className="text-lg font-bold text-green-600">{CURRENCY_SYMBOL}{u.balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Role</p>
                      <p className={`text-sm font-bold ${u.role === 'admin' ? 'text-purple-600' : 'text-gray-600'}`}>
                        {u.role.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {u.upiId && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">UPI ID</p>
                      <p className="text-sm font-medium text-gray-900">{u.upiId}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
