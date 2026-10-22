import React, { useState, useEffect } from 'react';
import '../../styles/loader.css';

interface RabbitRunningLoaderProps {
  progress?: number; // 0 to 100
  fullscreen?: boolean;
  message?: string;
  duration?: number; // ms to auto-complete if uncontrolled
  onComplete?: () => void;
}

export const RabbitRunningLoader: React.FC<RabbitRunningLoaderProps> = ({
  progress: controlledProgress,
  fullscreen = true,
  message,
  duration = 1400,
  onComplete
}) => {
  const [internalProgress, setInternalProgress] = useState(0);

  const isControlled = typeof controlledProgress === 'number';
  const currentProgress = Math.min(100, Math.max(0, Math.round(isControlled ? controlledProgress : internalProgress)));

  useEffect(() => {
    if (isControlled) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPct = Math.min(100, (elapsed / duration) * 100);
      
      // Easing curve: faster start, smooth finish
      const easedPct = Math.round(100 * Math.sin((rawPct / 100) * (Math.PI / 2)));
      setInternalProgress(easedPct);

      if (rawPct >= 100) {
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 200);
        }
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isControlled, duration, onComplete]);

  // Dynamic milestone messages
  const getMilestoneMessage = (): string => {
    if (message) return message;
    if (currentProgress < 25) return '🐰 Rabbit warming up paws...';
    if (currentProgress < 50) return '🚲 Tuning bike chain & carrot nitro boost...';
    if (currentProgress < 80) return '🌾 Scouting farm track & secret shortcuts...';
    if (currentProgress < 100) return '🥕 Polishing golden carrots & cash rewards...';
    return '🏁 100% Ready! Hop on & Ride!';
  };

  return (
    <div className={`rabbit-loader-container ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="rabbit-loader-card">
        {/* Animated Running Stage */}
        <div className="rabbit-runner-stage">
          <img
            src="/assets/logo.svg"
            alt="Running Rabbit"
            className="rabbit-runner-actor"
          />
          <div className="rabbit-runner-dust" />
          <div className="rabbit-runner-track">
            <div className="rabbit-runner-dashes" />
          </div>
        </div>

        {/* 0% to 100% Counter */}
        <div className="rabbit-loader-percent-row">
          <span className="rabbit-loader-percent-val">{currentProgress}</span>
          <span className="rabbit-loader-percent-sign">%</span>
        </div>

        {/* Progress Bar Track */}
        <div className="rabbit-loader-bar-wrap">
          <div
            className="rabbit-loader-bar-fill"
            style={{ width: `${currentProgress}%` }}
          />
        </div>

        {/* Status Message */}
        <div className="rabbit-loader-status">
          {getMilestoneMessage()}
        </div>
      </div>
    </div>
  );
};

export default RabbitRunningLoader;
