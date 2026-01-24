import React from 'react';

/**
 * Fade In Animation
 */
export const FadeIn: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  return (
    <div
      style={{
        animation: `fadeIn 0.5s ease-in-out ${delay}s both`,
      }}
      className="animate-fade-in"
    >
      {children}
    </div>
  );
};

/**
 * Slide In Animation
 */
export const SlideIn: React.FC<{
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}> = ({ children, direction = 'up', delay = 0 }) => {
  const directionMap = {
    up: 'slideInUp',
    down: 'slideInDown',
    left: 'slideInLeft',
    right: 'slideInRight',
  };

  return (
    <div
      style={{
        animation: `${directionMap[direction]} 0.5s ease-out ${delay}s both`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Bounce Animation
 */
export const Bounce: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  return (
    <div
      style={{
        animation: `bounce 0.6s ease-in-out ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Pulse Animation
 */
export const Pulse: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="animate-pulse">{children}</div>;
};

/**
 * Skeleton Loader
 */
export const SkeletonLoader: React.FC<{
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}> = ({ width = '100%', height = '20px', count = 1, className = '' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width,
            height,
          }}
          className={`animate-pulse bg-muted rounded mb-2 ${className}`}
        />
      ))}
    </>
  );
};

/**
 * CSS Animations
 * Add these to your global CSS or tailwind config
 */
export const animationStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }

  .animate-slide-up {
    animation: slideInUp 0.5s ease-out;
  }

  .animate-slide-down {
    animation: slideInDown 0.5s ease-out;
  }

  .animate-slide-left {
    animation: slideInLeft 0.5s ease-out;
  }

  .animate-slide-right {
    animation: slideInRight 0.5s ease-out;
  }

  .animate-bounce {
    animation: bounce 0.6s ease-in-out;
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
    background: linear-gradient(
      to right,
      #f6f7f8 0%,
      #edeef1 20%,
      #f6f7f8 40%,
      #f6f7f8 100%
    );
    background-size: 1000px 100%;
  }
`;

/**
 * Lottie Animation Component (requires lottie-react)
 */
export interface LottieAnimationProps {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  className?: string;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  animationData,
  loop = true,
  autoplay = true,
  speed = 1,
  className = '',
}) => {
  // This would require importing from lottie-react
  // For now, this is a placeholder
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-pulse">Loading animation...</div>
    </div>
  );
};

/**
 * Transition Component
 */
export const Transition: React.FC<{
  children: React.ReactNode;
  show: boolean;
  enter?: string;
  enterActive?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveActive?: string;
  leaveFrom?: string;
  leaveTo?: string;
}> = ({
  children,
  show,
  enter = 'transition ease-out duration-200',
  enterFrom = 'opacity-0 transform scale-95',
  enterTo = 'opacity-100 transform scale-100',
  leave = 'transition ease-in duration-150',
  leaveFrom = 'opacity-100 transform scale-100',
  leaveTo = 'opacity-0 transform scale-95',
}) => {
  const [mounted, setMounted] = React.useState(show);

  React.useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  if (!mounted && !show) return null;

  return (
    <div
      className={`
        ${show ? `${enter} ${enterTo}` : `${leave} ${leaveTo}`}
        ${!mounted || !show ? enterFrom : ''}
      `}
      onTransitionEnd={() => {
        if (!show) setMounted(false);
      }}
    >
      {children}
    </div>
  );
};

/**
 * Page Transition
 */
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <FadeIn>{children}</FadeIn>;
};
