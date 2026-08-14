import React from 'react';

export const NightBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-bg">
      <div className="grain" />
      {/* Immersive ambient glowing orbs */}
      <div className="orb w-[400px] h-[400px] bg-info -top-20 -right-20" />
      <div className="orb w-[500px] h-[500px] bg-accent -bottom-40 -left-20" />
      <div className="orb w-[300px] h-[300px] bg-caution top-1/2 left-1/4" />
      <div className="orb w-[450px] h-[450px] bg-line top-1/3 right-1/3 opacity-30" />
    </div>
  );
};
