import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Video, WatchedVideo } from '../types';
import Layout from '../components/Layout';
import VideoPlayer from '../components/VideoPlayer';
import { YouTubeProps } from 'react-youtube';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CURRENCY_SYMBOL } from '../constants';
import { getYouTubeId } from '../lib/utils';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function WatchVideo() {
  const { videoId } = useParams<{ videoId: string }>();
  const [user] = useAuthState(auth);
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
        const videoDoc = await getDoc(doc(db, 'videos', videoId));
        if (videoDoc.exists()) {
          const videoData = { id: videoDoc.id, ...videoDoc.data() } as Video;
          setVideo(videoData);
          setTimeLeft(videoData.duration || 60);
        } else {
          setError('Video not found');
        }
      } catch (err) {
        setError('Failed to load video');
        handleFirestoreError(err, OperationType.GET, `videos/${videoId}`);
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
      const watchedVideo: WatchedVideo = {
        userId: user.uid,
        videoId: video.id,
        watchedAt: now,
        rewardEarned: video.rewardAmount
      };
      await addDoc(collection(db, 'watched_videos'), watchedVideo);

      // 2. Update user balance and totalEarned
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(video.rewardAmount),
        totalEarned: increment(video.rewardAmount),
        updatedAt: now
      });

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Failed to claim reward', err);
      setRewardClaimed(false);
      handleFirestoreError(err, OperationType.WRITE, 'watched_videos/users');
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

  const youtubeId = getYouTubeId(video.youtubeUrl);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-black aspect-video flex items-center justify-center">
            {youtubeId ? (
              <VideoPlayer
                youtubeId={youtubeId}
                onStateChange={handleStateChange}
              />
            ) : (
              <div className="text-white text-center p-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p>Invalid Video URL. Please contact support or try another video.</p>
              </div>
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
