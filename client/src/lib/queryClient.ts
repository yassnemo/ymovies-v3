import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL, DEMO_SERVER_URL, USE_DEMO_SERVER } from "./apiConfig";
import supabase from "./supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
): Promise<any> {
  // Get the current user's session token for authentication
  let headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Get the current Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  
  // If there's an active session, add the Authorization header
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json().catch(() => res);
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Track if server is running
let isServerRunning: boolean = false;

// Function to check server status
async function checkServerStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const serverBaseUrl = USE_DEMO_SERVER ? DEMO_SERVER_URL : API_BASE_URL;
    const response = await fetch(`${serverBaseUrl.replace(/\/$/, "")}/api/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      isServerRunning = true;
      console.log("Demo server is running");
      return true;
    }
  } catch (error) {
    console.log("Demo server is not running");
  }
  
  isServerRunning = false;
  return false;
}

// Check server status on load
checkServerStatus();

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Process the query key to get the correct URL
      const path = queryKey[0] as string;
      let url: URL;
      
      // Handle different URL formats
      if (path.startsWith('http')) {
        // If it's a full URL, use it directly
        url = new URL(path);
      } else if (path.startsWith('/api/')) {
        // API paths always use the configured application backend.
        const serverBaseUrl = USE_DEMO_SERVER ? DEMO_SERVER_URL : API_BASE_URL;
        url = new URL(`${serverBaseUrl.replace(/\/$/, "")}${path}`);
      } else {
        // Otherwise, assume it's relative to the current origin
        url = new URL(path, window.location.origin);
      }
      
      // Set timeout to avoid long waits if server is down
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      let res;
      try {
        res = await fetch(url.toString(), {
          credentials: "include",
          signal: controller.signal
        });
        
        // If we can connect to the API, mark server as running
        if (path.startsWith('/api/')) {
          isServerRunning = true;
        }
      } catch (error) {
        // If connection failed for API endpoint, update server status
        if (path.startsWith('/api/')) {
          isServerRunning = false;
          await checkServerStatus();
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        // If demo server not running, provide more specific error
        if (!isServerRunning && path.startsWith('/api/')) {
          throw new Error("Demo server is not running. Start it with 'npm run dev:demo'");
        }
        
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      try {
        // Parse response as JSON
        const data = await res.json();
        return data;
      } catch (error) {
        // Handle non-JSON responses
        console.error(`Invalid JSON response from ${queryKey[0]}:`, error);
        // For non-API routes that might return HTML instead of JSON
        if (path.startsWith('/api/')) {
          throw new Error("Received invalid JSON from API. Is the demo server running?");
        }
        return null;
      }
    } catch (error) {
      console.error(`Error fetching ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Export the server status check function and status variable
export { checkServerStatus, isServerRunning };
