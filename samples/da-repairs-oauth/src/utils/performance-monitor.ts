interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private readonly SLOW_THRESHOLD = 100; // 100ms for API functions

    startTimer(name: string, metadata?: Record<string, any>): void {
        this.metrics.set(name, {
            name,
            startTime: performance.now(),
            metadata
        });
    }

    endTimer(name: string): number | null {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`⚠️ Performance timer '${name}' not found`);
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - metric.startTime;

        metric.endTime = endTime;
        metric.duration = duration;

        // Log slow operations
        if (duration > this.SLOW_THRESHOLD) {
            console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    measure<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
        this.startTimer(name, metadata);
        try {
            const result = operation();
            this.endTimer(name);
            return result;
        } catch (error) {
            this.endTimer(name);
            throw error;
        }
    }

    clear(): void {
        this.metrics.clear();
    }
}

export default new PerformanceMonitor();