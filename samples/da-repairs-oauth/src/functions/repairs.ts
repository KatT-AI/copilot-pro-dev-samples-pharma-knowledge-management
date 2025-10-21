/* This code sample provides a starter kit to implement server side logic for your Teams App in TypeScript,
 * refer to https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference for complete Azure Functions
 * developer guide.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { jwtDecode, JwtPayload } from "jwt-decode";
import performanceMonitor from "../utils/performance-monitor";
import cache from "../utils/cache";

import repairRecords from "../repairsData.json";

interface RepairRecord {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  date: string;
  image: string;
}

interface AuthToken extends JwtPayload {
  scp?: string;
}

/**
 * This function handles the HTTP request and returns the repair information.
 *
 * @param {HttpRequest} req - The HTTP request.
 * @param {InvocationContext} context - The Azure Functions context object.
 * @returns {Promise<Response>} - A promise that resolves with the HTTP response containing the repair information.
 */
export async function repairs(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return performanceMonitor.measure('repairs-function', () => {
    context.log("HTTP trigger function processed a request.");

    // Validate authorization
    if (!hasRequiredScopes(req, 'repairs_read')) {
      return {
        status: 403,
        jsonBody: { error: "Insufficient permissions" },
      };
    }

    const assignedTo = req.query.get("assignedTo");
    
    // If no filter, return all records (cached)
    if (!assignedTo) {
      const cacheKey = 'all-repairs';
      let allRepairs = cache.get<RepairRecord[]>(cacheKey);
      
      if (!allRepairs) {
        allRepairs = repairRecords as RepairRecord[];
        cache.set(cacheKey, allRepairs, 10 * 60 * 1000); // Cache for 10 minutes
      }

      return {
        status: 200,
        jsonBody: { results: allRepairs },
      };
    }

    // Filter repairs by assignedTo with caching
    const cacheKey = `repairs-${assignedTo.toLowerCase()}`;
    let filteredRepairs = cache.get<RepairRecord[]>(cacheKey);
    
    if (!filteredRepairs) {
      filteredRepairs = performanceMonitor.measure('filter-repairs', () => {
        const query = assignedTo.trim().toLowerCase();
        return (repairRecords as RepairRecord[]).filter((item) => {
          const fullName = item.assignedTo.toLowerCase();
          const nameParts = fullName.split(/\s+/);
          
          // Check exact match, first name, last name, or partial matches
          return fullName.includes(query) || 
                 nameParts.some(part => part.startsWith(query));
        });
      }, { query: assignedTo, totalRecords: repairRecords.length });
      
      // Cache filtered results for 5 minutes
      cache.set(cacheKey, filteredRepairs, 5 * 60 * 1000);
    }

    return {
      status: 200,
      jsonBody: { results: filteredRepairs },
    };
  }, { method: req.method, hasFilter: !!req.query.get("assignedTo") });
}

function hasRequiredScopes(req: HttpRequest, requiredScopes: string[] | string): boolean {
  return performanceMonitor.measure('auth-validation', () => {
    if (typeof requiredScopes === "string") {
      requiredScopes = [requiredScopes];
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return false;
    }

    const token = authHeader.split(" ");
    if (token.length !== 2 || token[0] !== "Bearer") {
      return false;
    }

    try {
      const decodedToken = jwtDecode<AuthToken>(token[1]);
      const scopes = decodedToken.scp?.split(" ") ?? [];
      return (requiredScopes as string[]).every(scope => scopes.includes(scope));
    } catch (error) {
      console.warn("JWT decode error:", error);
      return false;
    }
  }, { requiredScopes });
}

app.http("repairs", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: repairs,
});
