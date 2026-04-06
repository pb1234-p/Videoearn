import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { Video, WatchedVideo } from '../types';
import Layout from '../components/Layout';
import VideoPlayer from '../components/VideoPlayer';
import { YouTubeProps } from 'react-youtube';
import { Loader as Loader2, ArrowLeft, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CURRENCY_SYMBOL } from '../constants';

export default function WatchVideo() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isWatching, setIsWatching] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId || !user) return;
      try {
        const { data, error: fetchError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoId)
          .single();

        if (data) {
          const videoData = data as Video;
          setVideo(videoData);
          setTimeLeft(videoData.duration || 60);
        } else if (fetchError) {
          setError('Video not found');
        }
      } catch (err) {
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId, user]);

  useEffect(() => {
    if (isWatching && timeLeft > 0 && !isCompleted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isWatching, timeLeft, isCompleted]);

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = playing, 2 = paused
    if (event.data === 1) {
      setIsWatching(true);
    } else {
      setIsWatching(false);
    }
  };

  const claimReward = async () => {
    if (!user || !video || !isCompleted || rewardClaimed) return;

    setRewardClaimed(true);
    try {
      const now = new Date().toISOString();

      // 1. Add to watched_videos collection
      const watchedVideo: Omit<WatchedVideo, 'id'> = {
        userId: user.id,
        videoId: video.id,
        watchedAt: now,
        rewardEarned: video.rewardAmount
      };
      await supabase.from('watched_videos').insert(watchedVideo);

      // 2. Get current user balance
      const { data: userData } = await supabase
        .from('users')
        .select('balance, totalEarned')
        .eq('uid', user.id)
        .single();

      if (userData) {
        // 3. Update user balance and totalEarned
        await supabase
          .from('users')
          .update({
            balance: userData.balance + video.rewardAmount,
            totalEarned: userData.totalEarned + video.rewardAmount,
            updatedAt: now
          })
          .eq('uid', user.id);
      }

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Failed to claim reward', err);
      setRewardClaimed(false);
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

  if (error || !video) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">{error || 'Something went wrong'}</h2>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-blue-600 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const youtubeId = video.youtubeUrl.split('v=')[1]?.split('&')[0] || video.youtubeUrl.split('/').pop();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-black">
            {youtubeId && (
              <VideoPlayer
                youtubeId={youtubeId}
                onStateChange={handleStateChange}
              />
            )}
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
                <p className="text-gray-500 mt-1">{video.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold">
                  <Timer className="w-5 h-5" />
                  {isCompleted ? 'Completed' : `${timeLeft}s remaining`}
                </div>
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold text-lg">
                  {CURRENCY_SYMBOL}{video.rewardAmount}
                </div>
              </div>
            </div>

            {!isCompleted ? (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Please watch the video for at least 60 seconds to earn your reward. 
                  The timer will pause if you stop the video.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <p className="text-green-700 font-semibold">
                    Congratulations! You've watched enough. Claim your reward now!
                  </p>
                </div>
                <button
                  onClick={claimReward}
                  disabled={rewardClaimed}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {rewardClaimed ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Claiming Reward...
                    </>
                  ) : (
                    'Claim Reward'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
