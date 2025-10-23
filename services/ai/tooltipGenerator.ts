/**
 * AI-Powered Tooltip Generator
 *
 * Generates intelligent, context-aware tooltips with personalized insights
 * and actionable suggestions based on business metrics and trends.
 */

export interface MetricData {
    name: string;
    currentValue: number;
    previousValue: number;
    currentPeriod: 'day' | 'week' | 'month' | 'quarter' | 'year';
    change: number; // Percentage change
    changeType: 'increase' | 'decrease';
    context?: {
        // Additional context for better insights
        totalCount?: number;
        limit?: number;
        industryAverage?: number;
        goalTarget?: number;
        relatedMetrics?: { [key: string]: number };
    };
}

export interface TooltipInsight {
    summary: string;
    analysis: string;
    suggestions: string[];
    sentiment: 'positive' | 'negative' | 'neutral' | 'warning';
}

/**
 * Analyzes metric performance and generates AI-powered insights
 */
function analyzeMetric(metric: MetricData): TooltipInsight {
    const { name, currentValue, previousValue, change, changeType, context = {} } = metric;

    // Determine metric type and category
    const metricType = categorizeMetric(name);

    // Generate context-aware analysis
    let summary = '';
    let analysis = '';
    const suggestions: string[] = [];
    let sentiment: 'positive' | 'negative' | 'neutral' | 'warning' = 'neutral';

    // Handle different metric types
    switch (metricType) {
        case 'routes_assigned':
            return analyzeRoutesAssigned(metric);

        case 'routes_completed':
            return analyzeRoutesCompleted(metric);

        case 'routes_pending':
            return analyzeRoutesPending(metric);

        case 'revenue':
            return analyzeRevenue(metric);

        case 'drivers':
            return analyzeDrivers(metric);

        case 'vehicles':
            return analyzeVehicles(metric);

        case 'clients':
            return analyzeClients(metric);

        case 'delivery_rate':
            return analyzeDeliveryRate(metric);

        default:
            return generateGenericInsight(metric);
    }
}

/**
 * Categorize metric based on name
 */
function categorizeMetric(name: string): string {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('route') && nameLower.includes('assign')) return 'routes_assigned';
    if (nameLower.includes('route') && nameLower.includes('complet')) return 'routes_completed';
    if (nameLower.includes('route') && nameLower.includes('pending')) return 'routes_pending';
    if (nameLower.includes('revenue') || nameLower.includes('earning')) return 'revenue';
    if (nameLower.includes('driver')) return 'drivers';
    if (nameLower.includes('vehicle')) return 'vehicles';
    if (nameLower.includes('client')) return 'clients';
    if (nameLower.includes('delivery') && nameLower.includes('rate')) return 'delivery_rate';

    return 'generic';
}

/**
 * Analyze Routes Assigned metric
 */
function analyzeRoutesAssigned(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType, currentPeriod, context } = metric;
    const suggestions: string[] = [];

    let summary = `This ${currentPeriod}: ${currentValue} routes assigned | Last ${currentPeriod}: ${previousValue} routes`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    // Handle zero state - no routes at all
    if (currentValue === 0 && previousValue === 0) {
        sentiment = 'warning';
        analysis = `🚀 Getting Started: You haven't assigned any routes yet. Let's get your business moving!`;
        suggestions.push('Create your first route by clicking "Create Route" button above');
        suggestions.push('Add clients to your network to start receiving orders');
        suggestions.push('Ensure you have drivers and vehicles ready for assignments');
        suggestions.push('Consider reaching out to potential clients to secure your first delivery');
        return { summary, analysis, suggestions, sentiment };
    }

    // Handle starting from zero
    if (currentValue > 0 && previousValue === 0) {
        sentiment = 'positive';
        analysis = `🎉 Congratulations! You've assigned your first ${currentValue} route${currentValue > 1 ? 's' : ''}! Your logistics business is now operational.`;
        suggestions.push('Monitor these routes closely to ensure successful delivery');
        suggestions.push('Gather feedback from your first clients for improvements');
        suggestions.push('Continue marketing to grow your route volume');
        return { summary, analysis, suggestions, sentiment };
    }

    // Handle dropping to zero
    if (currentValue === 0 && previousValue > 0) {
        sentiment = 'negative';
        analysis = `🚨 Critical Alert! Route assignments dropped from ${previousValue} to zero. Your business has stalled - immediate action required!`;
        suggestions.push('Urgently reach out to all existing clients to understand why orders stopped');
        suggestions.push('Review your service quality and pricing - something may have driven clients away');
        suggestions.push('Launch aggressive marketing campaigns to win new business');
        suggestions.push('Consider offering special promotions to restart order flow');
        return { summary, analysis, suggestions, sentiment };
    }

    if (changeType === 'increase') {
        sentiment = 'positive';
        if (change > 50) {
            analysis = `🚀 Exceptional growth! Your route assignments surged by ${Math.abs(change).toFixed(1)}%. This indicates strong business expansion and increased client demand.`;
            suggestions.push('Consider hiring additional drivers to maintain service quality');
            suggestions.push('Review vehicle capacity to ensure you can handle the volume');
            suggestions.push('Implement route optimization to improve efficiency');
        } else if (change > 20) {
            analysis = `📈 Significant growth! Route assignments increased by ${Math.abs(change).toFixed(1)}%. Your business is scaling well.`;
            suggestions.push('Monitor driver workload to prevent burnout');
            suggestions.push('Consider expanding your fleet if demand persists');
            suggestions.push('Streamline onboarding process for faster route assignment');
        } else {
            analysis = `✅ Steady growth. Route assignments increased by ${Math.abs(change).toFixed(1)}%, showing consistent business performance.`;
            suggestions.push('Maintain current operational efficiency');
            suggestions.push('Focus on client satisfaction to drive organic growth');
        }
    } else if (changeType === 'decrease') {
        sentiment = change < -30 ? 'negative' : 'warning';
        if (change < -30) {
            analysis = `⚠️ Significant decline. Route assignments dropped by ${Math.abs(change).toFixed(1)}%. This requires immediate attention.`;
            suggestions.push('Reach out to existing clients to understand reduced demand');
            suggestions.push('Launch targeted marketing campaigns to attract new clients');
            suggestions.push('Review pricing strategy to ensure competitiveness');
            suggestions.push('Analyze if seasonal trends are affecting your business');
        } else if (change < -15) {
            analysis = `📉 Notable decline. Route assignments decreased by ${Math.abs(change).toFixed(1)}%. Monitor this trend closely.`;
            suggestions.push('Connect with your sales team to identify new opportunities');
            suggestions.push('Offer promotional rates to boost client engagement');
            suggestions.push('Review service quality feedback from recent deliveries');
        } else {
            analysis = `Minor decline of ${Math.abs(change).toFixed(1)}%. This could be normal fluctuation or seasonal variation.`;
            suggestions.push('Monitor trend over next 2-3 ${currentPeriod}s');
            suggestions.push('Ensure marketing efforts are consistent');
        }
    } else {
        analysis = `Stable performance with no significant change. Route assignments remain consistent.`;
        suggestions.push('Look for growth opportunities to scale your business');
        suggestions.push('Consider diversifying your service offerings');
    }

    // Add context-based suggestions
    if (context.limit && currentValue > context.limit * 0.8) {
        suggestions.unshift(`⚠️ You're at ${((currentValue / context.limit) * 100).toFixed(0)}% of your subscription limit. Consider upgrading your plan.`);
        sentiment = 'warning';
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Analyze Routes Completed metric
 */
function analyzeRoutesCompleted(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType, currentPeriod, context } = metric;
    const suggestions: string[] = [];

    let summary = `This ${currentPeriod}: ${currentValue} completed | Last ${currentPeriod}: ${previousValue} completed`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    // Calculate completion rate if total routes available
    const completionRate = context?.relatedMetrics?.totalRoutes
        ? ((currentValue / context.relatedMetrics.totalRoutes) * 100).toFixed(1)
        : null;

    // Handle zero state - no completions yet
    if (currentValue === 0 && previousValue === 0) {
        const assignedRoutes = context?.relatedMetrics?.assigned || 0;
        const pendingRoutes = context?.relatedMetrics?.pending || 0;

        if (assignedRoutes === 0 && pendingRoutes === 0) {
            sentiment = 'warning';
            analysis = `📦 No routes completed yet. Start by creating and assigning routes to get deliveries moving.`;
            suggestions.push('Create your first route using the "Create Route" button');
            suggestions.push('Assign drivers and vehicles to routes');
            suggestions.push('Once routes are in progress, they will appear here when completed');
        } else {
            sentiment = 'warning';
            analysis = `⏳ No completed routes yet, but you have ${pendingRoutes > 0 ? pendingRoutes + ' pending' : ''} ${assignedRoutes > 0 ? assignedRoutes + ' assigned' : ''} routes in progress.`;
            suggestions.push('Ensure drivers are actively working on assigned routes');
            suggestions.push('Follow up with drivers to confirm delivery progress');
            suggestions.push('Check if there are any blockers preventing completions');
        }
        return { summary, analysis, suggestions, sentiment };
    }

    // Handle first completions
    if (currentValue > 0 && previousValue === 0) {
        sentiment = 'positive';
        analysis = `🎊 First milestone achieved! You've completed ${currentValue} route${currentValue > 1 ? 's' : ''}. Your delivery operations are working!`;
        suggestions.push('Collect client feedback on these completed deliveries');
        suggestions.push('Ensure proof of delivery was properly documented');
        suggestions.push('Use these successful deliveries to build your reputation');
        return { summary, analysis, suggestions, sentiment };
    }

    // Handle dropping to zero completions (but had completions before)
    if (currentValue === 0 && previousValue > 0) {
        sentiment = 'negative';
        analysis = `🚨 Zero completions this ${currentPeriod}! You had ${previousValue} last ${currentPeriod} but none now. This is a critical operational issue.`;
        suggestions.push('Immediately check why no routes are being completed');
        suggestions.push('Verify driver availability and vehicle status');
        suggestions.push('Review if routes are stuck at "In Progress" status');
        suggestions.push('Contact drivers to identify and resolve delivery blockers');
        return { summary, analysis, suggestions, sentiment };
    }

    if (changeType === 'increase') {
        sentiment = 'positive';
        if (change > 40) {
            analysis = `🎯 Outstanding performance! Completed routes increased by ${Math.abs(change).toFixed(1)}%. Your delivery efficiency is excellent.`;
            suggestions.push('Document your successful processes as best practices');
            suggestions.push('Consider rewarding top-performing drivers');
            suggestions.push('Use this momentum to win new clients');
        } else if (change > 15) {
            analysis = `✅ Strong performance! Completed routes rose by ${Math.abs(change).toFixed(1)}%. Your team is executing well.`;
            suggestions.push('Maintain driver motivation with recognition programs');
            suggestions.push('Analyze what contributed to this improvement');
        } else {
            analysis = `Good progress with ${Math.abs(change).toFixed(1)}% increase in completions. Steady operational improvement.`;
            suggestions.push('Continue focusing on on-time deliveries');
        }
    } else if (changeType === 'decrease') {
        sentiment = change < -20 ? 'negative' : 'warning';
        if (change < -25) {
            analysis = `🚨 Critical issue! Completed routes fell by ${Math.abs(change).toFixed(1)}%. This impacts revenue and client satisfaction.`;
            suggestions.push('Immediately investigate bottlenecks in your delivery process');
            suggestions.push('Check for driver availability and vehicle issues');
            suggestions.push('Review route assignment and scheduling efficiency');
            suggestions.push('Speak with drivers to identify operational challenges');
        } else if (change < -10) {
            analysis = `⚠️ Completion rate decreased by ${Math.abs(change).toFixed(1)}%. Address this before it affects customer relationships.`;
            suggestions.push('Analyze pending routes to identify blockers');
            suggestions.push('Ensure adequate driver-to-vehicle ratio');
            suggestions.push('Review if route complexity has increased');
        } else {
            analysis = `Slight decline of ${Math.abs(change).toFixed(1)}% in completions. Monitor this trend.`;
            suggestions.push('Maintain communication with drivers about challenges');
        }
    } else {
        analysis = `Consistent completion rate. Operations are stable.`;
        suggestions.push('Look for efficiency gains through route optimization');
    }

    if (completionRate) {
        analysis += ` Current completion rate: ${completionRate}%.`;
        if (parseFloat(completionRate) < 70) {
            suggestions.push(`⚠️ Completion rate is below 70%. Focus on assigning drivers to pending routes.`);
        }
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Analyze Routes Pending metric
 */
function analyzeRoutesPending(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType, currentPeriod, context } = metric;
    const suggestions: string[] = [];

    let summary = `This ${currentPeriod}: ${currentValue} pending | Last ${currentPeriod}: ${previousValue} pending`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    // Handle zero pending routes (this is actually GOOD!)
    if (currentValue === 0 && previousValue === 0) {
        const availableDrivers = context?.relatedMetrics?.drivers || 0;
        const availableVehicles = context?.relatedMetrics?.vehicles || 0;

        sentiment = 'positive';
        analysis = `✅ Perfect! No pending routes. Your workflow is clear and efficient.`;
        suggestions.push('Create new routes to keep your business growing');
        suggestions.push(`You have ${availableDrivers} available driver${availableDrivers !== 1 ? 's' : ''} ready for assignments`);
        suggestions.push('Reach out to clients to secure more orders');
        return { summary, analysis, suggestions, sentiment };
    }

    // Just cleared all pending routes
    if (currentValue === 0 && previousValue > 0) {
        sentiment = 'positive';
        analysis = `🎉 Excellent! You cleared all ${previousValue} pending routes from last ${currentPeriod}. Zero backlog!`;
        suggestions.push('Great job on workflow efficiency!');
        suggestions.push('Maintain this momentum by assigning new routes quickly');
        suggestions.push('Keep your drivers and vehicles ready for incoming orders');
        return { summary, analysis, suggestions, sentiment };
    }

    // First pending routes appeared
    if (currentValue > 0 && previousValue === 0) {
        const availableDrivers = context?.relatedMetrics?.drivers || 0;
        const availableVehicles = context?.relatedMetrics?.vehicles || 0;

        if (availableDrivers > 0 && availableVehicles > 0) {
            sentiment = 'neutral';
            analysis = `📋 You have ${currentValue} new pending route${currentValue > 1 ? 's' : ''} ready for assignment. You have resources available.`;
            suggestions.push(`Assign drivers and vehicles to these routes - you have ${availableDrivers} driver${availableDrivers !== 1 ? 's' : ''} available`);
            suggestions.push('Start delivery operations to clear the backlog');
        } else {
            sentiment = 'warning';
            analysis = `⚠️ You have ${currentValue} pending route${currentValue > 1 ? 's' : ''}, but limited resources to handle them.`;
            if (availableDrivers === 0) suggestions.push('You need to add drivers to handle these routes');
            if (availableVehicles === 0) suggestions.push('You need to add vehicles to handle these routes');
            suggestions.push('Ensure you have adequate capacity before accepting more orders');
        }
        return { summary, analysis, suggestions, sentiment };
    }

    // For pending routes, decrease is good!
    if (changeType === 'decrease') {
        sentiment = 'positive';
        if (change < -40) {
            analysis = `🎉 Excellent! Pending routes decreased by ${Math.abs(change).toFixed(1)}%. Your workflow efficiency is improving significantly.`;
            suggestions.push('Maintain this pace by ensuring driver availability');
            suggestions.push('Document process improvements for future reference');
        } else if (change < -20) {
            analysis = `👍 Good progress! Pending routes down by ${Math.abs(change).toFixed(1)}%. Better workflow management.`;
            suggestions.push('Continue assigning drivers promptly to new routes');
        } else {
            analysis = `Pending routes decreased by ${Math.abs(change).toFixed(1)}%. Slight improvement in clearance rate.`;
            suggestions.push('Keep momentum by maintaining assignment efficiency');
        }
    } else if (changeType === 'increase') {
        sentiment = change > 40 ? 'negative' : 'warning';
        if (change > 50) {
            analysis = `🚨 Alert! Pending routes surged by ${Math.abs(change).toFixed(1)}%. This creates operational backlog and delays customer deliveries.`;
            suggestions.push('Immediately assign available drivers to pending routes');
            suggestions.push('Check if you have enough active drivers and vehicles');
            suggestions.push('Consider bringing in temporary drivers if capacity allows');
            suggestions.push('Communicate with clients about expected delivery timelines');
        } else if (change > 25) {
            analysis = `⚠️ Pending routes increased by ${Math.abs(change).toFixed(1)}%. Growing backlog needs attention.`;
            suggestions.push('Prioritize high-value or time-sensitive routes');
            suggestions.push('Review driver schedules for optimization opportunities');
            suggestions.push('Consider route batching to improve efficiency');
        } else {
            analysis = `Pending routes increased by ${Math.abs(change).toFixed(1)}%. Monitor capacity carefully.`;
            suggestions.push('Ensure regular assignment of drivers to new routes');
        }
    } else {
        analysis = `Pending routes remain stable. Balanced workload management.`;
        suggestions.push('Aim to reduce pending routes through proactive assignment');
    }

    if (currentValue > 0) {
        suggestions.push(`📊 You have ${currentValue} routes awaiting assignment. Assign drivers and vehicles to start delivery.`);
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Analyze Revenue/Earnings metric
 */
function analyzeRevenue(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType, currentPeriod } = metric;
    const suggestions: string[] = [];

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

    let summary = `This ${currentPeriod}: ${formatCurrency(currentValue)} | Last ${currentPeriod}: ${formatCurrency(previousValue)}`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    if (changeType === 'increase') {
        sentiment = 'positive';
        if (change > 30) {
            analysis = `💰 Exceptional revenue growth of ${Math.abs(change).toFixed(1)}%! Your business is thriving.`;
            suggestions.push('Reinvest profits in expanding your fleet');
            suggestions.push('Consider hiring more drivers to handle growth');
            suggestions.push('Explore premium service offerings for high-value clients');
        } else if (change > 10) {
            analysis = `📈 Strong revenue growth of ${Math.abs(change).toFixed(1)}%. Your business is on a positive trajectory.`;
            suggestions.push('Analyze which clients contribute most to revenue');
            suggestions.push('Focus on retaining high-value customers');
            suggestions.push('Optimize routes to maximize profitability');
        } else {
            analysis = `Steady revenue increase of ${Math.abs(change).toFixed(1)}%. Consistent performance.`;
            suggestions.push('Look for upselling opportunities with existing clients');
        }
    } else if (changeType === 'decrease') {
        sentiment = change < -20 ? 'negative' : 'warning';
        if (change < -25) {
            analysis = `🚨 Revenue dropped by ${Math.abs(change).toFixed(1)}%. Immediate action required to restore income levels.`;
            suggestions.push('Analyze which clients reduced their orders');
            suggestions.push('Review pricing to ensure competitiveness');
            suggestions.push('Launch targeted campaigns to win back clients');
            suggestions.push('Diversify revenue streams to reduce dependency');
        } else if (change < -10) {
            analysis = `⚠️ Revenue decreased by ${Math.abs(change).toFixed(1)}%. Address this trend proactively.`;
            suggestions.push('Identify and contact clients with reduced activity');
            suggestions.push('Offer loyalty discounts to boost order volume');
            suggestions.push('Review operational costs to maintain profitability');
        } else {
            analysis = `Minor revenue dip of ${Math.abs(change).toFixed(1)}%. May be seasonal or temporary.`;
            suggestions.push('Monitor for sustained decline over multiple periods');
        }
    } else {
        analysis = `Revenue remained stable. Focus on growth strategies.`;
        suggestions.push('Explore new market segments');
        suggestions.push('Increase marketing efforts to drive demand');
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Analyze Drivers metric
 */
function analyzeDrivers(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType, context } = metric;
    const suggestions: string[] = [];

    let summary = `Active drivers: ${currentValue} | Previous: ${previousValue}`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    if (changeType === 'increase') {
        sentiment = 'positive';
        analysis = `👥 Driver count increased by ${Math.abs(change).toFixed(1)}%. Expanded delivery capacity.`;
        suggestions.push('Ensure new drivers complete onboarding training');
        suggestions.push('Assign routes to new drivers to utilize capacity');
        suggestions.push('Monitor performance of new hires closely');
    } else if (changeType === 'decrease') {
        sentiment = 'warning';
        analysis = `⚠️ Driver count decreased by ${Math.abs(change).toFixed(1)}%. This may affect delivery capacity.`;
        suggestions.push('Investigate reasons for driver attrition');
        suggestions.push('Recruit new drivers to maintain service levels');
        suggestions.push('Review driver satisfaction and compensation');
        suggestions.push('Ensure remaining drivers are not overworked');
    } else {
        analysis = `Driver count stable. Consistent workforce.`;
        suggestions.push('Consider expanding team if business is growing');
    }

    if (context.limit && currentValue > context.limit * 0.9) {
        suggestions.unshift(`⚠️ You're at ${((currentValue / context.limit) * 100).toFixed(0)}% of your driver limit. Upgrade your plan to add more.`);
        sentiment = 'warning';
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Analyze Vehicles metric
 */
function analyzeVehicles(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType, context } = metric;
    const suggestions: string[] = [];

    let summary = `Active vehicles: ${currentValue} | Previous: ${previousValue}`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    if (changeType === 'increase') {
        sentiment = 'positive';
        analysis = `🚚 Fleet expanded by ${Math.abs(change).toFixed(1)}%. Increased delivery capacity.`;
        suggestions.push('Ensure new vehicles are properly registered and insured');
        suggestions.push('Assign vehicles to drivers for route allocation');
        suggestions.push('Schedule regular maintenance to keep fleet operational');
    } else if (changeType === 'decrease') {
        sentiment = 'warning';
        analysis = `⚠️ Vehicle count decreased by ${Math.abs(change).toFixed(1)}%. May limit delivery capacity.`;
        suggestions.push('Check if vehicles are under maintenance');
        suggestions.push('Consider leasing or purchasing additional vehicles');
        suggestions.push('Ensure vehicle-to-driver ratio is balanced');
    } else {
        analysis = `Fleet size stable. Maintain with regular servicing.`;
        suggestions.push('Track maintenance schedules to prevent breakdowns');
    }

    if (context.limit && currentValue > context.limit * 0.9) {
        suggestions.unshift(`⚠️ You're at ${((currentValue / context.limit) * 100).toFixed(0)}% of your vehicle limit. Consider upgrading your plan.`);
        sentiment = 'warning';
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Analyze Clients metric
 */
function analyzeClients(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType } = metric;
    const suggestions: string[] = [];

    let summary = `Active clients: ${currentValue} | Previous: ${previousValue}`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    if (changeType === 'increase') {
        sentiment = 'positive';
        if (change > 20) {
            analysis = `🎉 Client base grew by ${Math.abs(change).toFixed(1)}%! Strong market expansion.`;
            suggestions.push('Ensure excellent service to new clients for retention');
            suggestions.push('Gather feedback to understand their needs better');
            suggestions.push('Cross-sell additional services to maximize value');
        } else {
            analysis = `📊 Client base increased by ${Math.abs(change).toFixed(1)}%. Healthy growth.`;
            suggestions.push('Focus on building long-term relationships');
            suggestions.push('Request referrals from satisfied clients');
        }
    } else if (changeType === 'decrease') {
        sentiment = 'negative';
        analysis = `⚠️ Lost ${Math.abs(change).toFixed(1)}% of clients. Retention needs attention.`;
        suggestions.push('Reach out to churned clients to understand why they left');
        suggestions.push('Implement client satisfaction surveys');
        suggestions.push('Review service quality and pricing competitiveness');
        suggestions.push('Create loyalty programs to improve retention');
    } else {
        analysis = `Client base stable. Focus on acquisition and retention.`;
        suggestions.push('Launch marketing campaigns to attract new clients');
        suggestions.push('Strengthen relationships with existing clients');
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Analyze Delivery Rate metric
 */
function analyzeDeliveryRate(metric: MetricData): TooltipInsight {
    const { currentValue, change, changeType } = metric;
    const suggestions: string[] = [];

    let summary = `Delivery success rate: ${currentValue.toFixed(1)}%`;
    let sentiment: TooltipInsight['sentiment'] = 'neutral';

    let analysis = '';

    if (currentValue >= 95) {
        sentiment = 'positive';
        analysis = `🌟 Excellent delivery rate of ${currentValue.toFixed(1)}%! Your operations are highly reliable.`;
        suggestions.push('Maintain this standard to build client trust');
        suggestions.push('Use this metric in marketing materials');
    } else if (currentValue >= 85) {
        sentiment = 'neutral';
        analysis = `✅ Good delivery rate of ${currentValue.toFixed(1)}%. Room for improvement.`;
        suggestions.push('Aim for 95%+ to achieve excellence');
        suggestions.push('Analyze failed deliveries to identify patterns');
    } else if (currentValue >= 70) {
        sentiment = 'warning';
        analysis = `⚠️ Delivery rate of ${currentValue.toFixed(1)}% needs improvement.`;
        suggestions.push('Investigate common reasons for delivery failures');
        suggestions.push('Improve driver training on customer communication');
        suggestions.push('Enhance route planning to avoid delays');
    } else {
        sentiment = 'negative';
        analysis = `🚨 Critical! Delivery rate of ${currentValue.toFixed(1)}% is below acceptable standards.`;
        suggestions.push('Urgently review operational processes');
        suggestions.push('Meet with drivers to understand challenges');
        suggestions.push('Consider process automation to reduce errors');
    }

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Generate generic insight for unrecognized metrics
 */
function generateGenericInsight(metric: MetricData): TooltipInsight {
    const { currentValue, previousValue, change, changeType, currentPeriod } = metric;

    let summary = `Current: ${currentValue} | Previous: ${previousValue}`;
    let sentiment: TooltipInsight['sentiment'] = changeType === 'increase' ? 'positive' : 'negative';

    let analysis = changeType === 'increase'
        ? `Metric increased by ${Math.abs(change).toFixed(1)}% compared to last ${currentPeriod}.`
        : `Metric decreased by ${Math.abs(change).toFixed(1)}% compared to last ${currentPeriod}.`;

    const suggestions = [
        'Monitor this metric over time to identify trends',
        'Set specific goals for improvement',
        'Compare with industry benchmarks if available'
    ];

    return { summary, analysis, suggestions, sentiment };
}

/**
 * Format tooltip insight into readable HTML string
 */
export function formatTooltip(insight: TooltipInsight): string {
    const { summary, analysis, suggestions } = insight;

    let tooltip = `${summary}\n\n${analysis}`;

    if (suggestions.length > 0) {
        tooltip += '\n\n💡 Suggestions:\n';
        suggestions.slice(0, 3).forEach((suggestion, index) => {
            tooltip += `${index + 1}. ${suggestion}\n`;
        });
    }

    return tooltip;
}

/**
 * Main function: Generate AI-powered tooltip for a metric
 */
export function generateAITooltip(metric: MetricData): string {
    const insight = analyzeMetric(metric);
    return formatTooltip(insight);
}

/**
 * Export helper for getting insight object (useful for advanced UI)
 */
export function getMetricInsight(metric: MetricData): TooltipInsight {
    return analyzeMetric(metric);
}
