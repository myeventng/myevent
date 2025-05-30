// components/homepage/LoadingScreen.tsx
import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold">Loading Amazing Events...</h2>
        <p className="mt-2 text-white/80">
          Preparing your personalized experience
        </p>
      </div>
    </div>
  );
};
