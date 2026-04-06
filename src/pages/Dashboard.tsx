import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { Video, UserProfile, WatchedVideo } from '../types';
import Layout from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { Play, Wallet, Trophy, Loader as Loader2, CirclePlay as PlayCircle, CircleAlert as AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CURRENCY_SYMBOL, ADMIN_EMAIL } from '../constants';

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [watchedVideoIds, setWatchedVideoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch or create user profile
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (data) {
        setProfile(data as UserProfile);
      } else if (error && error.code === 'PGRST116') {
        // Create initial profile
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
    };

    fetchProfile();

    // Subscribe to profile changes
    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `uid=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    // Fetch watched videos
    const fetchWatchedVideos = async () => {
      const { data } = await supabase
        .from('watched_videos')
        .select('videoId')
        .eq('userId', user.id);

      if (data) {
        const ids = new Set(data.map((item) => item.videoId));
        setWatchedVideoIds(ids);
      }
    };

    fetchWatchedVideos();

    // Subscribe to watched videos changes
    const watchedChannel = supabase
      .channel('watched-videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watched_videos',
          filter: `userId=eq.${user.id}`,
        },
        () => {
          fetchWatchedVideos();
        }
      )
      .subscribe();

    // Fetch active videos
    const fetchVideos = async () => {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('active', true)
        .order('createdAt', { ascending: false });

      if (data) {
        setVideos(data as Video[]);
        setLoading(false);
      }
    };

    fetchVideos();

    // Subscribe to videos changes
    const videosChannel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
        },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(watchedChannel);
      supabase.removeChannel(videosChannel);
    };
  }, [user]);

  const availableVideos = videos.filter(v => !watchedVideoIds.has(v.id));

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
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">{CURRENCY_SYMBOL}{profile?.balance.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Videos Watched</p>
              <p className="text-2xl font-bold text-gray-900">{watchedVideoIds.size}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Available Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{availableVideos.length}</p>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">How it Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <PlayCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">1. Watch Videos</h3>
              <p className="text-sm text-gray-500 tracking-tight">Choose from our list of available YouTube videos and watch them completely.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">2. Earn Rewards</h3>
              <p className="text-sm text-gray-500 tracking-tight">Once the video is complete, claim your reward in Indian Rupees (INR).</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">3. Withdraw Cash</h3>
              <p className="text-sm text-gray-500 tracking-tight">Request a withdrawal to your UPI ID once you reach the minimum balance.</p>
            </div>
          </div>
        </div>

        {/* Video List Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Available Videos</h2>
            <span className="text-sm text-gray-500">{availableVideos.length} videos found</span>
          </div>

          {availableVideos.length === 0 ? (
            <EmptyState 
              title="No videos available" 
              description="Check back later for more tasks to earn money!" 
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableVideos.map((video) => (
                <div key={video.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="aspect-video bg-gray-100 relative">
                    <img 
                      src={`https://img.youtube.com/vi/${video.youtubeUrl.split('v=')[1]?.split('&')[0] || video.youtubeUrl.split('/').pop()}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100" />
                    </div>
                    <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      {CURRENCY_SYMBOL}{video.rewardAmount}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 line-clamp-1 mb-2">{video.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{video.description}</p>
                    <Link
                      to={`/watch/${video.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Watch & Earn
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
