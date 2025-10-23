import { subscriptionData } from '../../firebase/config';
import type { SubscriptionPlan } from '../../types';

/**
 * Get subscription plan limits based on plan key
 * @param planKey - The plan key (e.g., 'basic', 'pro', 'max')
 * @param role - The user role ('individual', 'business', or 'partner')
 * @returns The subscription limits or null if not found
 */
export const getSubscriptionLimits = (planKey: string, role: string = 'partner'): SubscriptionPlan['limits'] | null => {
  const plans = subscriptionData[role];
  if (!plans) return null;

  const plan = plans.find(p => p.key === planKey);
  return plan?.limits || null;
};

/**
 * Check if a resource limit has been reached
 * @param currentCount - Current count of the resource
 * @param limit - The limit from subscription plan
 * @returns true if limit is reached, false otherwise
 */
export const isLimitReached = (currentCount: number, limit: number | undefined): boolean => {
  // If limit is undefined, no limit set
  if (limit === undefined) return false;

  // -1 means unlimited
  if (limit === -1) return false;

  // Check if current count has reached or exceeded the limit
  return currentCount >= limit;
};

/**
 * Check if a resource can be added based on subscription limits
 * @param currentCount - Current count of the resource
 * @param limit - The limit from subscription plan
 * @returns true if resource can be added, false otherwise
 */
export const canAddResource = (currentCount: number, limit: number | undefined): boolean => {
  return !isLimitReached(currentCount, limit);
};

/**
 * Get a formatted limit display string
 * @param current - Current count
 * @param limit - The limit
 * @returns Formatted string like "3/5" or "3/Unlimited"
 */
export const formatLimitDisplay = (current: number, limit: number | undefined): string => {
  if (limit === undefined) return `${current}`;
  if (limit === -1) return `${current}/Unlimited`;
  return `${current}/${limit}`;
};

/**
 * Get usage percentage for progress indicators
 * @param current - Current count
 * @param limit - The limit
 * @returns Percentage (0-100) or 0 if unlimited
 */
export const getUsagePercentage = (current: number, limit: number | undefined): number => {
  if (limit === undefined || limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(Math.round((current / limit) * 100), 100);
};

/**
 * Get color coding based on usage percentage
 * @param current - Current count
 * @param limit - The limit
 * @returns Color class suffix ('green', 'yellow', 'red')
 */
export const getUsageColor = (current: number, limit: number | undefined): 'green' | 'yellow' | 'red' => {
  const percentage = getUsagePercentage(current, limit);

  if (percentage >= 100) return 'red';
  if (percentage >= 80) return 'yellow';
  return 'green';
};

/**
 * Get full subscription plan object
 * @param planKey - The plan key
 * @param role - The user role
 * @returns The full subscription plan or null
 */
export const getSubscriptionPlan = (planKey: string, role: string = 'partner'): SubscriptionPlan | null => {
  const plans = subscriptionData[role];
  if (!plans) return null;

  return plans.find(p => p.key === planKey) || null;
};
