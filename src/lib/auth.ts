/*
  Dev-only auth helper to auto-register/login and attach Authorization for /api requests.
*/

type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in?: number;
};

const ACCESS_TOKEN_KEY = 'access_token';
let fetchWrapped = false;
let isHandlingTokenExpiration = false;

// Initialize auth fetch wrapper immediately if in browser
if (typeof window !== 'undefined') {
	setupAuthFetch();
}

export function getAccessToken(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setupAuthFetch(): void {
	if (typeof window === 'undefined' || fetchWrapped) return;

	const originalFetch = window.fetch.bind(window);
	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		try {
			const url = typeof input === 'string' ? input : input.toString();
			if (url.startsWith('/api')) {
				// Don't handle token expiration for login/register endpoints
				if (url.includes('/api/login') || url.includes('/api/register')) {
					return originalFetch(input, init);
				}

				const token = getAccessToken();
				if (token) {
					const headers = new Headers(init?.headers || {});
					if (!headers.has('Authorization')) {
						headers.set('Authorization', `Bearer ${token}`);
					}
					const response = await originalFetch(input, { ...init, headers });

					// Only handle token expiration for /api/me endpoint (the definitive auth check)
					// Other endpoints handle their own errors and don't necessarily mean token is expired
					if (isTokenExpired(response) && url.includes('/api/me') && !isHandlingTokenExpiration) {
						const currentPath = window.location.pathname;
						if (currentPath !== '/login') {
							handleTokenExpiration();
						} else {
							// Clear the expired token if we're on login page
							logout();
						}
					}

					return response;
				}
			}
		} catch {
			// fall through to original fetch
		}
		return originalFetch(input, init);
	};
	fetchWrapped = true;
}

async function tryRegister(username: string, email: string, password: string): Promise<void> {
	const res = await fetch('/api/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, email, password })
	});
	if (!res.ok && res.status !== 400 && res.status !== 409) {
		// 400/409 likely means user exists; other errors should surface
		const text = await res.text();
		throw new Error(`Register failed: ${res.status} ${text}`);
	}
}

async function login(username: string, password: string): Promise<LoginResponse> {
	const res = await fetch('/api/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Login failed: ${res.status} ${text}`);
	}
	return res.json();
}

export function isLoggedIn(): boolean {
	return getAccessToken() !== null;
}

export function logout(redirectToLogin: boolean = true): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
	}
	
	// Use hard redirect for better mobile compatibility
	if (redirectToLogin && typeof window !== 'undefined') {
		const currentPath = window.location.pathname;
		if (currentPath !== '/login') {
			// Use setTimeout to ensure localStorage is cleared first
			setTimeout(() => {
				window.location.href = '/login';
			}, 0);
		}
	}
}

export function handleTokenExpiration(): void {
	// Prevent multiple simultaneous calls
	if (isHandlingTokenExpiration) {
		return;
	}

	isHandlingTokenExpiration = true;

	// Clear session and redirect to login
	// logout() will handle the redirect automatically
	logout(true);

	// Reset flag after a delay to allow redirect to happen
	setTimeout(() => {
		isHandlingTokenExpiration = false;
	}, 1000);
}

export function isTokenExpired(response: Response): boolean {
	return response.status === 401 || response.status === 403;
}

export async function ensureDevLogin(username: string, password: string): Promise<void> {
	if (!import.meta.env.DEV) return;
	const existing = getAccessToken();
	if (existing) return;

	const email = `${username}@example.com`;
	try {
		await tryRegister(username, email, password);
	} catch {
		// ignore; proceed to login
	}
	const data = await login(username, password);
	if (data?.access_token) setAccessToken(data.access_token);
}
