import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Video, WithdrawalRequest, UserProfile } from '../types';
import Layout from '../components/Layout';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  PlayCircle, 
  Wallet, 
  Users, 
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { CURRENCY_SYMBOL } from '../constants';
import { Navigate } from 'react-router-dom';
import { getYouTubeId } from '../lib/utils';
import api from '../services/api';
import AdminWithdrawalRow from '../components/AdminWithdrawalRow';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'withdrawals' | 'users'>('videos');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Video Form State
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    rewardAmount: '',
    duration: '60',
  });
  const [addingVideo, setAddingVideo] = useState(false);

  const fetchData = async () => {
    try {
      if (activeTab === 'videos') {
        const res = await api.get('/admin/videos');
        setVideos(res.data.videos);
      } else if (activeTab === 'withdrawals') {
        const res = await api.get('/withdrawals');
        setWithdrawals(res.data.withdrawals);
      } else if (activeTab === 'users') {
        const res = await api.get('/admin/users');
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, activeTab]);

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingVideo(true);
    try {
      await api.post('/videos', newVideo);
      setNewVideo({ title: '', description: '', youtubeUrl: '', rewardAmount: '', duration: '60' });
      fetchData();
    } catch (err) {
      console.error('Failed to add video', err);
      alert('Failed to add video');
    } finally {
      setAddingVideo(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteVideo = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Reset after 3 seconds
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await api.delete(`/admin/videos/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete video', err);
      alert('Failed to deactivate video. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const [confirmPermanentId, setConfirmPermanentId] = useState<string | null>(null);

  const handlePermanentDelete = async (id: string) => {
    if (confirmPermanentId !== id) {
      setConfirmPermanentId(id);
      setTimeout(() => setConfirmPermanentId(null), 3000);
      return;
    }

    setDeletingId(id);
    setConfirmPermanentId(null);
    try {
      await api.delete(`/admin/videos/${id}/permanent`);
      fetchData();
    } catch (err) {
      console.error('Failed to permanently delete video', err);
      alert('Failed to permanently delete video');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApproveWithdrawal = async (request: WithdrawalRequest) => {
    try {
      await api.patch(`/withdrawals/${request.id}`, { status: 'approved' });
      fetchData();
    } catch (err) {
      console.error('Failed to approve withdrawal', err);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await api.patch(`/withdrawals/${id}`, { status: 'rejected' });
      fetchData();
    } catch (err) {
      console.error('Failed to reject withdrawal', err);
    }
  };

  if (loading && videos.length === 0 && withdrawals.length === 0 && users.length === 0) {
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Manage Videos ({videos.length})</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show Deleted</span>
                  <button 
                    onClick={() => setShowDeleted(!showDeleted)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${showDeleted ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${showDeleted ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              {videos.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-500">
                  No videos added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {videos
                    .filter(v => showDeleted || v.active)
                    .map((video) => (
                    <div key={video.id} className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 ${!video.active ? 'opacity-60 bg-gray-50' : ''}`}>
                      <div className="w-24 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative">
                        <img 
                          src={`https://img.youtube.com/vi/${getYouTubeId(video.youtubeUrl)}/mqdefault.jpg`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {!video.active && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold uppercase">Deleted</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{video.title}</h3>
                        <p className="text-xs text-gray-500">{CURRENCY_SYMBOL}{video.rewardAmount} Reward • {video.active ? 'Active' : 'Inactive'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        {video.active ? (
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
                            disabled={deletingId === video.id}
                            className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                              confirmDeleteId === video.id 
                                ? 'bg-red-600 text-white animate-pulse' 
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title={confirmDeleteId === video.id ? 'Click again to confirm' : 'Delete Video'}
                          >
                            {deletingId === video.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await api.patch(`/admin/videos/${video.id}/restore`);
                                  fetchData();
                                } catch (err) {
                                  alert('Failed to restore video');
                                }
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore Video"
                            >
                              <RotateCcw className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(video.id)}
                              disabled={deletingId === video.id}
                              className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                                confirmPermanentId === video.id 
                                  ? 'bg-red-700 text-white animate-pulse' 
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title={confirmPermanentId === video.id ? 'Click AGAIN to permanently delete' : 'Permanent Delete'}
                            >
                              {deletingId === video.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        )}
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
                <div key={u.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
