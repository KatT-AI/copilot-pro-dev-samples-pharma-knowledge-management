interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private readonly SLOW_THRESHOLD = 1000; // 1 second

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
        } else {
            console.log(`⚡ ${name} completed in ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    async measureAsync<T>(name: string, asyncOperation: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
        this.startTimer(name, metadata);
        try {
            const result = await asyncOperation();
            this.endTimer(name);
            return result;
        } catch (error) {
            this.endTimer(name);
            console.error(`❌ Error in ${name}:`, error);
            throw error;
        }
    }

    measure<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
        this.startTimer(name, metadata);
        try {
            const result = operation();
            this.endTimer(name);
            return result;
        } catch (error) {
            this.endTimer(name);
            console.error(`❌ Error in ${name}:`, error);
            throw error;
        }
    }

    getMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
    }

    getSlowOperations(): PerformanceMetric[] {
        return this.getMetrics().filter(m => m.duration! > this.SLOW_THRESHOLD);
    }

    getSummary(): { total: number; slow: number; averageDuration: number } {
        const metrics = this.getMetrics();
        const slowMetrics = this.getSlowOperations();
        const totalDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
        
        return {
            total: metrics.length,
            slow: slowMetrics.length,
            averageDuration: metrics.length > 0 ? totalDuration / metrics.length : 0
        };
    }

    clear(): void {
        this.metrics.clear();
    }
}

export default new PerformanceMonitor();