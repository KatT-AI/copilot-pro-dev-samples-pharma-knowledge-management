//Uses the ServiceNow Rest API to deal with profile information
//Author: crisag@microsoft.com

import httpClient from '../utils/http-client';
import cache from '../utils/cache';

interface ServiceNowProfile {
    sys_id: string;
    email: string;
    name: string;
    first_name: string;
    last_name: string;
    department: string;
    title: string;
}

interface ServiceNowResponse<T> {
    result: T;
}

class ProfilesApiService {
    private readonly PROFILE_FIELDS = 'sys_id,email,name,first_name,last_name,department,title';
    private readonly PROFILE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes for profiles

    // Function to fetch user profile from ServiceNow
    async getProfile(email: string): Promise<ServiceNowProfile[]> {
        const cacheKey = `profile:${email}`;
        
        // Check cache first
        const cachedProfile = cache.get<ServiceNowProfile[]>(cacheKey);
        if (cachedProfile) {
            console.log('Profile fetched from cache:', cachedProfile);
            return cachedProfile;
        }

        try {
            const response = await httpClient.get<ServiceNowResponse<ServiceNowProfile[]>>('/sys_user', {
                sysparm_limit: 1,
                sysparm_query: `email=${email}`,
                sysparm_fields: this.PROFILE_FIELDS
            });
            
            console.log('Profile fetched successfully from ServiceNow:', response.data.result);
            
            // Cache the profile
            cache.set(cacheKey, response.data.result, this.PROFILE_CACHE_TTL);
            
            return response.data.result;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }
}

export default new ProfilesApiService();

