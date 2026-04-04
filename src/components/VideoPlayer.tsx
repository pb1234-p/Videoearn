import YouTube, { YouTubeProps } from 'react-youtube';

interface VideoPlayerProps {
  youtubeId: string;
  onStateChange: YouTubeProps['onStateChange'];
}

export default function VideoPlayer({ youtubeId, onStateChange }: VideoPlayerProps) {
  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-black">
      <YouTube
        videoId={youtubeId}
        className="w-full h-full"
        opts={{
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            controls: 1,
          },
        }}
        onStateChange={onStateChange}
      />
    </div>
  );
}
