//Uses the ServiceNow Rest API to deal with profile information
//Author: crisag@microsoft.com

import axios, { AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables once at module initialization
dotenv.config({ path: 'env/.env.local.user' });

class ProfilesApiService {
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

    // Function to fetch user profile from ServiceNow
    async getProfile(email: string) {
        try {
            const response = await axios.get(
                `${this.baseURL}/sys_user`,
                {
                    ...this.baseConfig,
                    params: {
                        sysparm_limit: 10,
                        sysparm_query: `email=${email}`
                    },
                }
            );
            console.log('Profile fetched successfully from ServiceNow:', response.data.result);
            return response.data.result;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }
}

export default new ProfilesApiService();

