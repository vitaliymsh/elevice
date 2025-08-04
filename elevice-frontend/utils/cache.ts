/**
 * Cache utilities for managing localStorage-based caches
 */

/**
 * Invalidate interview cache for a specific user
 */
export const invalidateInterviewCache = (userId: string) => {
  const cacheKey = `interviews_cache_${userId}`;
  localStorage.removeItem(cacheKey);
  console.log(`🗑️ Interview cache invalidated for user: ${userId}`);
};

/**
 * Invalidate jobs cache for a specific user
 */
export const invalidateJobsCache = (userId: string) => {
  const cacheKey = `jobs_cache_${userId}`;
  localStorage.removeItem(cacheKey);
  console.log(`🗑️ Jobs cache invalidated for user: ${userId}`);
};

/**
 * Invalidate all caches for a specific user
 */
export const invalidateAllUserCaches = (userId: string) => {
  invalidateInterviewCache(userId);
  invalidateJobsCache(userId);
  console.log(`🗑️ All caches invalidated for user: ${userId}`);
};

/**
 * Invalidate specific cache by key
 */
export const invalidateCache = (cacheKey: string) => {
  localStorage.removeItem(cacheKey);
  console.log(`🗑️ Cache invalidated: ${cacheKey}`);
};