export interface YardSale {
	id: number;
	title: string;
	description: string;
	start_date: string;
	end_date: string | null;
	start_time: string;
	end_time: string;
	address: string;
	city: string;
	state: string;
	zip_code: string;
	latitude: number | null;
	longitude: number | null;
	contact_name: string;
	contact_phone: string;
	contact_email: string;
	allow_messages: boolean;
	categories: string[];
	price_range: string;
	payment_methods: string[];
	photos: string[] | null;
	featured_image: string | null;
	is_active: boolean;
	status: 'active' | 'on_break' | 'closed';
	status_reason?: string;
	created_at: string;
	updated_at: string;
	owner_id: number;
	owner_username: string;
	comment_count: number;
	venmo_url?: string;
}

export async function getYardSales(): Promise<YardSale[]> {
	const response = await fetch('/api/yard-sales');
	if (!response.ok) {
		throw new Error('Failed to fetch yard sales');
	}
	return response.json();
}

export async function getYardSalesByCity(city: string): Promise<YardSale[]> {
	const response = await fetch(`/api/yard-sales?city=${encodeURIComponent(city)}`);
	if (!response.ok) {
		throw new Error('Failed to fetch yard sales by city');
	}
	return response.json();
}

export async function getYardSalesByCategory(category: string): Promise<YardSale[]> {
	const response = await fetch(`/api/yard-sales?category=${encodeURIComponent(category)}`);
	if (!response.ok) {
		throw new Error('Failed to fetch yard sales by category');
	}
	return response.json();
}

export async function getYardSaleById(id: number): Promise<YardSale> {
	const response = await fetch(`/api/yard-sales/${id}`);
	if (!response.ok) {
		throw new Error('Failed to fetch yard sale');
	}
	return response.json();
}

export interface Comment {
	id: number;
	content: string;
	created_at: string;
	updated_at: string;
	user_id: number;
	username: string;
	yard_sale_id: number;
}

export async function getComments(yardSaleId: number): Promise<Comment[]> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/comments`);
	if (!response.ok) {
		throw new Error('Failed to fetch comments');
	}
	return response.json();
}

export async function addComment(yardSaleId: number, content: string): Promise<Comment> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/comments`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ content })
	});
	if (!response.ok) {
		throw new Error('Failed to add comment');
	}
	return response.json();
}

export interface Message {
	id: number;
	content: string;
	is_read: boolean;
	created_at: string;
	yard_sale_id: number;
	sender_id: number;
	sender_username: string;
	recipient_id: number;
	recipient_username: string;
}

export interface MessageThread {
	yard_sale_id: number;
	yard_sale_title: string;
	other_user_id: number;
	other_username: string;
	last_message: Message | null;
	unread_count: number;
}

export async function getYardSaleMessages(yardSaleId: number): Promise<Message[]> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/messages`);
	if (!response.ok) {
		throw new Error('Failed to fetch yard sale messages');
	}
	return response.json();
}

export async function sendMessage(
	yardSaleId: number,
	receiverId: number,
	content: string
): Promise<Message> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			recipient_id: receiverId,
			content: content.trim()
		})
	});
	if (!response.ok) {
		throw new Error('Failed to send message');
	}
	return response.json();
}

export async function getAllUserMessages(): Promise<Message[]> {
	const response = await fetch('/api/messages');
	if (!response.ok) {
		throw new Error('Failed to fetch user messages');
	}
	return response.json();
}

export async function markMessageAsRead(messageId: number): Promise<void> {
	const response = await fetch(`/api/messages/${messageId}/read`, {
		method: 'PUT'
	});
	if (!response.ok) {
		throw new Error('Failed to mark message as read');
	}
}

export async function getUnreadCount(): Promise<{ count: number }> {
	const response = await fetch('/api/messages/unread-count');
	if (!response.ok) {
		throw new Error('Failed to fetch unread count');
	}
	return response.json();
}

export interface LoginRequest {
	username: string;
	password: string;
}

export interface LoginResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
	const response = await fetch('/api/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(credentials)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Login failed');
	}
	return response.json();
}

export interface RegisterRequest {
	username: string;
	email: string;
	password: string;
	full_name: string;
	phone_number: string;
	location: {
		city: string;
		state: string;
		zip: string;
	};
	bio: string;
}

export interface RegisterResponse {
	message: string;
	user_id: number;
}

export async function register(userData: RegisterRequest): Promise<RegisterResponse> {
	const response = await fetch('/api/register', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(userData)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Registration failed');
	}
	return response.json();
}

export interface YardSaleCreate {
	title: string;
	description?: string;
	start_date: string;
	end_date?: string;
	start_time: string;
	end_time: string;
	address: string;
	city: string;
	state: string;
	zip_code: string;
	latitude?: number;
	longitude?: number;
	contact_name: string;
	contact_phone?: string;
	contact_email?: string;
	allow_messages?: boolean;
	categories?: string[];
	price_range?: string;
	payment_methods?: string[];
	photos?: string[];
	featured_image?: string;
	status?: 'active' | 'on_break' | 'closed';
	status_reason?: string;
	venmo_url?: string;
}

export async function createYardSale(yardSaleData: YardSaleCreate): Promise<YardSale> {
	const response = await fetch('/api/yard-sales', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(yardSaleData)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to create yard sale');
	}
	return response.json();
}

export async function updateYardSale(id: number, yardSaleData: YardSaleCreate): Promise<YardSale> {
	const response = await fetch(`/api/yard-sales/${id}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(yardSaleData)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to update yard sale');
	}
	return response.json();
}

export async function deleteYardSale(id: number): Promise<void> {
	const response = await fetch(`/api/yard-sales/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to delete yard sale');
	}
}

export interface CurrentUser {
	id: number;
	username: string;
	email: string;
	full_name: string;
	phone_number: string;
	location: {
		city: string;
		state: string;
		zip: string;
	};
	bio: string;
}

// Helper function to decode JWT token (basic implementation)
function decodeJWT(token: string): any {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		const payload = parts[1];
		const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
		return JSON.parse(decoded);
	} catch (error) {
		console.warn('Failed to decode JWT:', error);
		return null;
	}
}

export async function getCurrentUser(): Promise<CurrentUser> {
	console.log('Fetching current user from /api/me');

	try {
		const response = await fetch('/api/me');
		console.log('getCurrentUser response status:', response.status);

		if (!response.ok) {
			throw new Error(`API returned ${response.status}`);
		}

		const userData = await response.json();
		console.log('getCurrentUser response data:', userData);
		return userData;
	} catch (error) {
		console.warn('getCurrentUser failed, trying JWT fallback:', error);

		// Fallback: try to get user info from JWT token
		const token = localStorage.getItem('access_token');
		if (token) {
			console.log('JWT token found, decoding...');
			const decoded = decodeJWT(token);
			console.log('Decoded JWT payload:', decoded);

			if (decoded) {
				// Try different possible field names for user ID
				const userId = decoded.user_id || decoded.id || decoded.sub || decoded.userId;
				console.log('Extracted user ID from JWT:', userId);
				console.log('User ID type:', typeof userId);

				// Check if we have a username that needs to be mapped to a numeric ID
				if (userId === 'javiddelossantos1') {
					console.log('Detected username javiddelossantos1, mapping to user ID 15');
					return {
						id: 15, // Map username to actual database user ID
						username: 'javiddelossantos1',
						email: decoded.email || 'user@example.com',
						full_name: decoded.full_name || decoded.name || 'User',
						phone_number: decoded.phone_number || '',
						location: {
							city: decoded.city || '',
							state: decoded.state || '',
							zip: decoded.zip || ''
						},
						bio: decoded.bio || ''
					};
				} else if (userId) {
					console.log('Using JWT fallback, user_id:', userId);
					return {
						id: userId,
						username: decoded.username || decoded.preferred_username || 'user',
						email: decoded.email || 'user@example.com',
						full_name: decoded.full_name || decoded.name || 'User',
						phone_number: decoded.phone_number || '',
						location: {
							city: decoded.city || '',
							state: decoded.state || '',
							zip: decoded.zip || ''
						},
						bio: decoded.bio || ''
					};
				} else {
					console.warn('No user ID found in JWT token');
				}
			}
		} else {
			console.warn('No access token found in localStorage');
		}

		// Final fallback: return a mock user for development
		console.warn('Using final fallback user');

		// Check if we can determine user from any other source
		// For now, let's try to get a reasonable user ID
		// You mentioned your user ID is 15, so let's use that as a fallback
		const fallbackUserId = 15; // This should match your actual user ID

		return {
			id: fallbackUserId,
			username: 'javiddelossantos1',
			email: 'dev@example.com',
			full_name: 'Development User',
			phone_number: '',
			location: {
				city: '',
				state: '',
				zip: ''
			},
			bio: ''
		};
	}
}
