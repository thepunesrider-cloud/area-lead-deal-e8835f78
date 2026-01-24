/**
 * Performance Optimization Utilities
 * Image optimization, lazy loading, caching, etc.
 */

/**
 * Compress and optimize image
 */
export const optimizeImage = async (
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Cache manager
 */
export const cacheManager = {
  /**
   * Set cache with expiration
   */
  set: (key: string, value: any, expirationMinutes: number = 60): void => {
    const expirationTime = Date.now() + expirationMinutes * 60 * 1000;
    localStorage.setItem(
      `cache_${key}`,
      JSON.stringify({
        value,
        expiration: expirationTime,
      })
    );
  },

  /**
   * Get cache if not expired
   */
  get: <T>(key: string): T | null => {
    const cached = localStorage.getItem(`cache_${key}`);
    
    if (!cached) return null;
    
    try {
      const { value, expiration } = JSON.parse(cached);
      
      if (Date.now() > expiration) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return value as T;
    } catch {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
  },

  /**
   * Remove cache
   */
  remove: (key: string): void => {
    localStorage.removeItem(`cache_${key}`);
  },

  /**
   * Clear all cache
   */
  clear: (): void => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  },
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Lazy load images
 */
export const lazyLoadImages = (): void => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
};

/**
 * Preload resources
 */
export const preloadResource = (url: string, type: 'image' | 'script' | 'style'): void => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = type;
  document.head.appendChild(link);
};

/**
 * Prefetch resource
 */
export const prefetchResource = (url: string): void => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
};

/**
 * Calculate memory usage
 */
export const getMemoryUsage = (): { used: number; total: number; percentage: number } | null => {
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    };
  }
  return null;
};

/**
 * Monitor performance
 */
export const monitorPerformance = (label: string): (() => void) => {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  };
};

/**
 * Virtual scroll manager (for large lists)
 */
export class VirtualScroller {
  private itemHeight: number;
  private visibleCount: number;
  private items: any[];
  private scrollTop: number = 0;

  constructor(itemHeight: number, visibleCount: number, items: any[]) {
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
    this.items = items;
  }

  /**
   * Get visible items based on scroll position
   */
  getVisibleItems(scrollTop: number): { items: any[]; startIndex: number; endIndex: number } {
    this.scrollTop = scrollTop;
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleCount + 1, this.items.length);

    return {
      items: this.items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
    };
  }

  /**
   * Get total height
   */
  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  /**
   * Get offset
   */
  getOffset(): number {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    return startIndex * this.itemHeight;
  }
}

/**
 * Request idle callback polyfill
 */
export const scheduleIdleCallback = (callback: IdleRequestCallback): number => {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback);
  } else {
    return setTimeout(callback as any, 0);
  }
};
