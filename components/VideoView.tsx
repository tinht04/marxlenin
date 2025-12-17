import React, { useState } from "react";

interface Video {
  id: string;
  title: string;
  url: string;
}

const videos: Video[] = [
  {
    id: "8ImSSaDfMG0",
    title: "Sự ra đời Đảng Cộng sản Việt Nam",
    url: "https://www.youtube.com/watch?v=8ImSSaDfMG0"
  },
  {
    id: "kQ0wh-Tnlc8",
    title: "Quyết Định Lịch Sử - Chiến Thắng Điện Biên Phủ",
    url: "https://www.youtube.com/watch?v=kQ0wh-Tnlc8"
  },
  {
    id: "y6kF14peP7A",
    title: "Chiến Lược Của Một Dân Tộc - Kháng Chiến Chống Mỹ Cứu Nước",
    url: "https://www.youtube.com/watch?v=y6kF14peP7A"
  }
];

export const VideoView: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 bg-clip-text text-transparent">
          Video Lịch Sử Đảng
        </h1>

        {/* Video Player */}
        {selectedVideo ? (
          <div className="mb-8 relative">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-4 -right-4 z-20 w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg"
              aria-label="Đóng video"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold text-gray-800">{selectedVideo.title}</h2>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-8 p-6 bg-white rounded-lg shadow-md">
            <p className="text-gray-600">Chọn một video để phát</p>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-transparent hover:border-amber-500"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <img
                  src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                  alt={video.title}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white ml-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 line-clamp-2">{video.title}</h3>
                <p className="text-sm text-gray-500 mt-2">Click để phát video</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
