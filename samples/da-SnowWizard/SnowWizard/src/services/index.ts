/**
 * Service Registry with Lazy Loading
 * 
 * This module provides a centralized registry for all services with lazy loading
 * to improve startup performance and reduce memory usage.
 */

import { createLazyService } from '../utils/lazy-loader';

// Lazy-loaded services
export const getIncidentsService = createLazyService('incidents-service', async () => {
    const { default: IncidentsApiService } = await import('./snow_incidents');
    return IncidentsApiService;
});

export const getProfilesService = createLazyService('profiles-service', async () => {
    const { default: ProfilesApiService } = await import('./snow_profiles');
    return ProfilesApiService;
});

// Service health check
export async function checkServicesHealth(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    try {
        await getIncidentsService();
        results.incidents = true;
    } catch (error) {
        console.error('Incidents service health check failed:', error);
        results.incidents = false;
    }
    
    try {
        await getProfilesService();
        results.profiles = true;
    } catch (error) {
        console.error('Profiles service health check failed:', error);
        results.profiles = false;
    }
    
    return results;
}

// Preload critical services (can be called during app startup)
export async function preloadCriticalServices(): Promise<void> {
    console.log('🚀 Preloading critical services...');
    
    const promises = [
        getIncidentsService().catch(err => console.warn('Failed to preload incidents service:', err)),
        // Add other critical services here
    ];
    
    await Promise.allSettled(promises);
    console.log('✅ Critical services preloaded');
}