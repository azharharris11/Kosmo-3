import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 border-4 border-gold/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
        <div className="absolute inset-2 border-4 border-gold/40 rounded-full animate-[spin_7s_linear_infinite_reverse]"></div>
        <div className="absolute inset-4 border-4 border-gold/60 rounded-full animate-[spin_4s_linear_infinite]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl text-gold animate-pulse">✦</span>
        </div>
      </div>
      <h3 className="font-cinzel text-2xl text-gold mb-2 tracking-widest">Consulting the Cosmos</h3>
      <p className="font-serif text-gray-400 italic">Natalie is analyzing the planetary alignments...</p>
    </div>
  );
};

export default LoadingScreen;
