import YouTube, { YouTubeProps } from 'react-youtube';

interface VideoPlayerProps {
  youtubeId: string;
  onStateChange: YouTubeProps['onStateChange'];
}

export default function VideoPlayer({ youtubeId, onStateChange }: VideoPlayerProps) {
  return (
    <div className="w-full h-full min-h-[300px] sm:min-h-[400px] bg-black">
      <YouTube
        videoId={youtubeId}
        className="youtube-container"
        iframeClassName="w-full h-full aspect-video"
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            controls: 1,
            origin: window.location.origin
          },
        }}
        onStateChange={onStateChange}
      />
    </div>
  );
}
