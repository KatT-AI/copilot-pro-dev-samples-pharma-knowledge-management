//Uses the ServiceNow Rest API to deal with incidents
//Author: crisag@microsoft.com

import httpClient from '../utils/http-client';
import cache from '../utils/cache';
import performanceMonitor from '../utils/performance-monitor';

interface ServiceNowIncident {
  number: string;
  made_sla: boolean;
  short_description: string;
  description: string;
  priority: string;
  opened_at: string;
  sys_id?: string;
}

interface ServiceNowUser {
  sys_id: string;
  email: string;
}

interface ServiceNowResponse<T> {
  result: T;
}

class IncidentsApiService {
    private readonly INCIDENT_FIELDS = 'number,made_sla,short_description,description,priority,opened_at';
    private readonly DEFAULT_LIMIT = 10;
    private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes for incidents
    private readonly USER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for user data

    // Function to fetch a single incident from ServiceNow
    async getIncident(id: string): Promise<ServiceNowIncident[]> {
        return performanceMonitor.measureAsync(
            `getIncident:${id}`,
            async () => {
                const cacheKey = `incident:${id}`;
                
                // Check cache first
                const cachedResult = cache.get<ServiceNowIncident[]>(cacheKey);
                if (cachedResult) {
                    console.log('Incident fetched from cache:', cachedResult);
                    return cachedResult;
                }

                const response = await httpClient.get<ServiceNowResponse<ServiceNowIncident[]>>('/incident', {
                    sysparm_limit: 1,
                    sysparm_fields: this.INCIDENT_FIELDS,
                    sysparm_query: `number=${id}`
                });
                
                console.log('Incident fetched successfully from ServiceNow:', response.data.result);
                
                // Cache the result
                cache.set(cacheKey, response.data.result, this.CACHE_TTL);
                
                return response.data.result;
            },
            { incidentId: id, source: 'ServiceNow' }
        );
    }

    // Function to fetch the latest 10 incidents from ServiceNow
    async getIncidents(): Promise<ServiceNowIncident[]> {
        return performanceMonitor.measureAsync(
            'getIncidents',
            async () => {
                const cacheKey = 'incidents:latest';
                
                // Check cache first
                const cachedResult = cache.get<ServiceNowIncident[]>(cacheKey);
                if (cachedResult) {
                    console.log('Incidents fetched from cache:', cachedResult);
                    return cachedResult;
                }

                const response = await httpClient.get<ServiceNowResponse<ServiceNowIncident[]>>('/incident', {
                    sysparm_limit: this.DEFAULT_LIMIT,
                    sysparm_fields: this.INCIDENT_FIELDS,
                    sysparm_query: 'ORDERBYDESCsys_created_on'
                });
                
                console.log('Incidents fetched successfully from ServiceNow:', response.data.result);
                
                // Cache the result
                cache.set(cacheKey, response.data.result, this.CACHE_TTL);
                
                return response.data.result;
            },
            { limit: this.DEFAULT_LIMIT, source: 'ServiceNow' }
        );
    }

    // Function to fetch user-assigned incidents from ServiceNow
    async getUserIncidents(username: string): Promise<ServiceNowIncident[]> {
        try {
            // Get the sys_id of the user
            const sys_id = await this.getUserSysId(username);
            
            // Fetch incidents assigned to the user
            const response = await httpClient.get<ServiceNowResponse<ServiceNowIncident[]>>('/incident', {
                sysparm_limit: this.DEFAULT_LIMIT,
                sysparm_fields: this.INCIDENT_FIELDS,
                sysparm_query: `ORDERBYDESCsys_created_on^assigned_to=${sys_id}`
            });
            
            console.log('User incidents fetched successfully from ServiceNow:', response.data.result);
            return response.data.result;
        } catch (error) {
            console.error('Error fetching user incidents:', error);
            throw error;
        }
    }

    // Function to create a new incident in ServiceNow
    async createIncident(email: string, short_description: string, description: string): Promise<ServiceNowIncident> {
        try {
            // Get the sys_id of the user
            const sys_id = await this.getUserSysId(email);
            
            // Create a new incident on ServiceNow
            const response = await httpClient.post<ServiceNowResponse<ServiceNowIncident>>('/incident', {
                short_description,
                description,
                caller_id: sys_id
            });
            
            console.log('Incident created successfully in ServiceNow:', response.data.result);
            return response.data.result;
        } catch (error) {
            console.error('Error creating incident:', error);
            throw error;
        }
    }

    private async getUserSysId(username: string): Promise<string> {
        const cacheKey = `user:${username}:sys_id`;
        
        // Check cache first
        const cachedSysId = cache.get<string>(cacheKey);
        if (cachedSysId) {
            console.log('User sys_id fetched from cache:', cachedSysId);
            return cachedSysId;
        }

        const response = await httpClient.get<ServiceNowResponse<ServiceNowUser[]>>('/sys_user', {
            sysparm_limit: 1,
            sysparm_query: `email=${username}`,
            sysparm_fields: 'sys_id'
        });
        
        console.log('User fetched successfully from ServiceNow:', response.data.result);
        
        if (!response.data.result || response.data.result.length === 0) {
            throw new Error(`User not found: ${username}`);
        }
        
        const sysId = response.data.result[0].sys_id;
        
        // Cache the sys_id for longer since user data doesn't change often
        cache.set(cacheKey, sysId, this.USER_CACHE_TTL);
        
        return sysId;
    }

}

export default new IncidentsApiService();

