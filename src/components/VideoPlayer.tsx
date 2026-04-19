import YouTube, { YouTubeProps } from 'react-youtube';

interface VideoPlayerProps {
  youtubeId: string;
  onStateChange: YouTubeProps['onStateChange'];
}

export default function VideoPlayer({ youtubeId, onStateChange }: VideoPlayerProps) {
  return (
    <div className="w-full relative pt-[56.25%] bg-black">
      <div className="absolute inset-0">
        <YouTube
          videoId={youtubeId}
          className="w-full h-full"
          iframeClassName="w-full h-full"
          opts={{
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 1,
              modestbranding: 1,
              rel: 0,
              controls: 1,
              showinfo: 0,
              iv_load_policy: 3,
            },
          }}
          onStateChange={onStateChange}
        />
      </div>
    </div>
  );
}
