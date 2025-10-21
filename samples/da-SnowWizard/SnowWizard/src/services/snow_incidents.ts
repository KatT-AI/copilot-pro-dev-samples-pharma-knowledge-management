//Uses the ServiceNow Rest API to deal with incidents
//Author: crisag@microsoft.com

import axios, { AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables once at module initialization
dotenv.config({ path: 'env/.env.local.user' });

class IncidentsApiService {
    private readonly SN_INSTANCE: string;
    private readonly SN_USERNAME: string;
    private readonly SN_PASSWORD: string;
    private readonly baseURL: string;
    private readonly baseConfig: Pick<AxiosRequestConfig, 'auth' | 'headers'>;

    constructor() {
        // Environment variables setup
        this.SN_INSTANCE = process.env.SN_INSTANCE || '';
        this.SN_USERNAME = process.env.SN_USERNAME || '';
        this.SN_PASSWORD = process.env.SN_PASSWORD || '';
        
        // Cache commonly used values
        this.baseURL = `https://${this.SN_INSTANCE}.service-now.com/api/now/table`;
        this.baseConfig = {
            auth: {
                username: this.SN_USERNAME,
                password: this.SN_PASSWORD
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }

    // Function to fetch a single incident from ServiceNow
    async getIncident(id: string) {
        try {
            const response = await axios.get(
                `${this.baseURL}/incident`,
                {
                    ...this.baseConfig,
                    params: {
                        sysparm_limit: 1,
                        sysparm_fields: 'number,made_sla,short_description,description,priority,opened_at',
                        sysparm_query: `number=${id}`
                    },
                }
            );
            console.log('Incidents fetched successfully from ServiceNow:', response.data.result);
            return response.data.result;
        } catch (error) {
            console.error('Error fetching incidents:', error);
            throw error;
        }
    }

    // Function to fetch the latest 10 incidents from ServiceNow
    async getIncidents() {
        try {
            const response = await axios.get(
                `${this.baseURL}/incident`,
                {
                    ...this.baseConfig,
                    params: {
                        sysparm_limit: 10,
                        sysparm_fields: 'number,made_sla,short_description,description,priority,opened_at',
                        sysparm_query: 'ORDERBYDESCsys_created_on'
                    },
                }
            );
            console.log('Incidents fetched successfully from ServiceNow:', response.data.result);
            return response.data.result;
        } catch (error) {
            console.error('Error fetching incidents:', error);
            throw error;
        }
    }

    // Function to fetch the latest 10 incidents from ServiceNow
    async getUserIncidents(username: string) {
        try {
            // Get the sys_id of the user
            const sys_id = await this.getUserSysId(username);
            // Fetch incidents assigned to the user
            const response = await axios.get(
                `${this.baseURL}/incident`,
                {
                    ...this.baseConfig,
                    params: {
                        sysparm_limit: 10,
                        sysparm_fields: 'number,made_sla,short_description,description,priority,opened_at',
                        sysparm_query: `ORDERBYDESCsys_created_on^assigned_to=${sys_id}`
                    },
                }
            );
            console.log('Incidents fetched successfully from ServiceNow:', response.data.result);
            return response.data.result;
        } catch (error) {
            console.error('Error fetching incidents:', error);
            throw error;
        }
    }

    // Function to create a new incident in ServiceNow
    async createIncident(email: string, short_description: string, description: string) {
        try {
            // Get the sys_id of the user
            const sys_id = await this.getUserSysId(email);
            // Create a new incident on Service Now (removed redundant string interpolation)
            const response = await axios.post(
                `${this.baseURL}/incident`,
                {
                    short_description,
                    description,
                    caller_id: sys_id
                },
                this.baseConfig
            );
            console.log('Incident created successfully in ServiceNow:', response.data.result);
            return response.data.result;
        } catch (error) {
            console.error('Error creating incident:', error);
            throw error;
        }
    }

    private async getUserSysId(username: string): Promise<string> {
        const response = await axios.get(
            `${this.baseURL}/sys_user`,
            {
                ...this.baseConfig,
                params: {
                    sysparm_limit: 10,
                    sysparm_query: `email=${username}`
                },
            }
        );
        console.log('User fetched successfully from ServiceNow:', response.data.result);
        return response.data.result[0].sys_id;
    }

}

export default new IncidentsApiService();

