'use client';

import { useEffect, useRef } from 'react';

const VIDEO_URL = 'https://files.catbox.moe/9jmirk.mp4';

interface VideoPlayerProps {
  onVideoEnd: () => void;
}

export function VideoPlayer({ onVideoEnd }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      // Attempt to play the video automatically.
      // Modern browsers might block this, but it's worth a try.
      videoElement.play().catch(error => {
        console.warn("Video autoplay was blocked:", error);
        // If autoplay fails, the user might need to click to play.
        // The controls attribute is present to allow this.
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        onEnded={onVideoEnd}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
