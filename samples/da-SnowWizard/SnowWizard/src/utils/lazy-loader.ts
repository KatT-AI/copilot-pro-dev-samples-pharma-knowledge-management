/**
 * Lazy Loading Utility for Azure Functions
 * 
 * This utility provides lazy loading capabilities for modules and services
 * to improve startup performance and reduce memory usage.
 */

type LazyFactory<T> = () => Promise<T>;
type LazyInstance<T> = () => Promise<T>;

class LazyLoader {
    private cache = new Map<string, any>();
    private loading = new Map<string, Promise<any>>();

    /**
     * Create a lazy-loaded instance of a module or service
     */
    create<T>(key: string, factory: LazyFactory<T>): LazyInstance<T> {
        return async (): Promise<T> => {
            // Return cached instance if available
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }

            // Return existing loading promise if already loading
            if (this.loading.has(key)) {
                return this.loading.get(key);
            }

            // Start loading
            const loadingPromise = factory();
            this.loading.set(key, loadingPromise);

            try {
                const instance = await loadingPromise;
                this.cache.set(key, instance);
                this.loading.delete(key);
                return instance;
            } catch (error) {
                this.loading.delete(key);
                throw error;
            }
        };
    }

    /**
     * Preload a lazy instance (useful for critical path optimization)
     */
    async preload<T>(lazyInstance: LazyInstance<T>): Promise<void> {
        try {
            await lazyInstance();
        } catch (error) {
            console.warn('Preload failed:', error);
        }
    }

    /**
     * Clear cache for a specific key or all keys
     */
    clear(key?: string): void {
        if (key) {
            this.cache.delete(key);
            this.loading.delete(key);
        } else {
            this.cache.clear();
            this.loading.clear();
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): { cached: number; loading: number } {
        return {
            cached: this.cache.size,
            loading: this.loading.size
        };
    }
}

// Singleton instance
const lazyLoader = new LazyLoader();

/**
 * Helper function to create lazy-loaded services
 */
export function createLazyService<T>(key: string, factory: LazyFactory<T>): LazyInstance<T> {
    return lazyLoader.create(key, factory);
}

/**
 * Helper function to create lazy-loaded modules
 */
export function createLazyModule<T>(modulePath: string): LazyInstance<T> {
    return lazyLoader.create(modulePath, async () => {
        const module = await import(modulePath);
        return module.default || module;
    });
}

export default lazyLoader;