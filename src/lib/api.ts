export interface PaymentMethod {
	id: string;
	name: string;
	icon: string;
	icon_type: 'solid' | 'brand';
}

export interface YardSale {
	id: string;
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
	owner_id: string;
	owner_username: string;
	owner_average_rating?: number;
	owner_is_admin?: boolean; // Indicates if the owner has admin permissions
	comment_count: number;
	venmo_url?: string;
	facebook_url?: string;
	// Visited status fields (only present when include_visited_status=true)
	is_visited?: boolean;
	visit_count?: number;
	last_visited?: string;
}

export async function getYardSales(includeVisitedStatus: boolean = true): Promise<YardSale[]> {
	const token = localStorage.getItem('access_token');

	// If we want visited status but don't have a token, fall back to regular API
	const shouldIncludeVisited = includeVisitedStatus && !!token;

	const url = shouldIncludeVisited
		? '/api/yard-sales?include_visited_status=true'
		: '/api/yard-sales';

	const response = await fetch(url, {
		headers: shouldIncludeVisited
			? {
					Authorization: `Bearer ${token}`
				}
			: {}
	});

	// Handle token expiration
	if (shouldIncludeVisited && (response.status === 401 || response.status === 403)) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch yard sales');
	}
	const data = await response.json();
	return data;
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

export async function getYardSaleById(id: string): Promise<YardSale> {
	const response = await fetch(`/api/yard-sales/${id}`);
	if (!response.ok) {
		throw new Error('Failed to fetch yard sale');
	}
	return response.json();
}

export interface Comment {
	id: string;
	content: string;
	created_at: string;
	updated_at: string;
	user_id: string;
	username: string;
	yard_sale_id: string;
}

export async function getComments(yardSaleId: string): Promise<Comment[]> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/comments`);
	if (!response.ok) {
		throw new Error('Failed to fetch comments');
	}
	return response.json();
}

export async function addComment(yardSaleId: string, content: string): Promise<Comment> {
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
	id: string;
	content: string;
	is_read: boolean;
	created_at: string;
	yard_sale_id?: string; // Optional for conversation messages
	conversation_id?: string; // For conversation-based messages
	sender_id: string;
	sender_username: string;
	recipient_id: string;
	recipient_username: string;
}

export interface Notification {
	id: string;
	type: 'message' | 'rating' | 'comment' | 'visit' | 'info' | 'success' | 'warning' | 'error';
	title: string;
	message: string;
	is_read: boolean;
	created_at: string;
	user_id: string;
	related_user_id?: string;
	related_yard_sale_id?: string;
	related_message_id?: string;
	metadata?: Record<string, any>;
}

export interface MessageThread {
	yard_sale_id: string;
	yard_sale_title: string;
	other_user_id: string;
	other_username: string;
	last_message: Message | null;
	unread_count: number;
}

export async function getYardSaleMessages(yardSaleId: string): Promise<Message[]> {
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

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to send message');
	}
	return response.json();
}

export async function markMessageAsRead(messageId: string): Promise<void> {
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

// Get all messages for the current user (your backend structure)
export async function getAllUserMessages(): Promise<Message[]> {
	const response = await fetch('/api/messages', {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch messages');
	}
	return response.json();
}

// Get messages for a specific conversation
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
	const response = await fetch(`/api/conversations/${conversationId}/messages`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch conversation messages');
	}
	return response.json();
}

export async function sendConversationMessage(
	conversationId: number,
	content: string
): Promise<Message> {
	const response = await fetch(`/api/conversations/${conversationId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({
			content: content.trim()
		})
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to send conversation message');
	}
	return response.json();
}

// Send a message to start a new conversation with a user (using general /messages endpoint)
export async function sendMessageToUser(recipientId: number, content: string): Promise<Message> {
	const response = await fetch('/api/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({
			recipient_id: recipientId,
			content: content.trim()
		})
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to send message to user');
	}
	return response.json();
}

// Get or create a conversation between two users
export async function getOrCreateConversation(otherUserId: string): Promise<{ id: string | null }> {
	// Get current user ID from token
	const token = localStorage.getItem('access_token');
	if (!token) {
		throw new Error('No authentication token found');
	}

	try {
		const payload = JSON.parse(atob(token.split('.')[1]));

		// Handle both string and numeric user IDs (UUIDs are strings)
		let currentUserId: string | null = null;
		if (typeof payload.sub === 'string' && payload.sub.trim() !== '') {
			currentUserId = payload.sub;
		} else if (typeof payload.sub === 'number') {
			currentUserId = String(payload.sub);
		} else {
			const currentUser = await getCurrentUser();
			currentUserId = currentUser?.id || null;
		}

		if (!currentUserId) {
			throw new Error('Could not determine current user ID from token');
		}

		// Get all messages to find existing conversation
		const allMessages = await getAllUserMessages();

		// Find existing conversation between current user and other user
		const existingConversation = allMessages.find(
			(message) =>
				(message.sender_id === currentUserId && message.recipient_id === otherUserId) ||
				(message.sender_id === otherUserId && message.recipient_id === currentUserId)
		);

		if (existingConversation && existingConversation.conversation_id) {
			return { id: existingConversation.conversation_id };
		}

		// If no existing conversation, return null
		// The conversation will be created when the first message is sent
		return { id: null };
	} catch (error) {
		console.error('Error parsing JWT token:', error);
		throw new Error('Could not parse authentication token');
	}
}

// Visited Yard Sales API functions
export async function markYardSaleAsVisited(yardSaleId: string): Promise<void> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/visit`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to mark yard sale as visited');
	}
}

export async function markYardSaleAsNotVisited(yardSaleId: string): Promise<void> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/visit`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to mark yard sale as not visited');
	}
}

export async function getUserVisitedYardSales(): Promise<number[]> {
	const response = await fetch('/api/user/visited-yard-sales', {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch visited yard sales');
	}

	const data = await response.json();
	return data.map((item: any) => item.yard_sale_id);
}

export async function getYardSaleVisitStats(yardSaleId: string): Promise<{
	total_visits: number;
	unique_visitors: number;
	most_recent_visit: string | null;
	average_visits: number;
}> {
	const response = await fetch(`/api/yard-sales/${yardSaleId}/visit-stats`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch visit statistics');
	}

	return response.json();
}

export async function getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
	// For now, return a static list since this endpoint might not be implemented yet
	// This can be updated when the backend endpoint is available
	return [
		{ id: 'cash', name: 'Cash', icon: 'dollar-sign', icon_type: 'solid' },
		{ id: 'credit-card', name: 'Credit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'debit-card', name: 'Debit Card', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'paypal', name: 'PayPal', icon: 'paypal', icon_type: 'brand' },
		{ id: 'zelle', name: 'Zelle', icon: 'check-circle', icon_type: 'solid' },
		{ id: 'apple', name: 'Apple Pay', icon: 'apple', icon_type: 'brand' },
		{ id: 'google', name: 'Google Pay', icon: 'google', icon_type: 'brand' },
		{ id: 'square', name: 'Square', icon: 'credit-card', icon_type: 'solid' }
	];
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
	const response = await fetch('/login', {
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
	password_confirm: string;
	full_name: string;
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
	const response = await fetch('/register', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(userData)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		// For 422 validation errors, extract the error message(s)
		if (response.status === 422 && errorData.detail) {
			const errorMessage = Array.isArray(errorData.detail)
				? errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
				: typeof errorData.detail === 'string'
					? errorData.detail
					: JSON.stringify(errorData.detail);
			const error = new Error(errorMessage);
			(error as any).status = 422;
			throw error;
		}
		throw new Error(errorData.detail || errorData.message || 'Registration failed');
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
	facebook_url?: string;
}
export async function createYardSale(yardSaleData: YardSaleCreate): Promise<YardSale> {
	const response = await fetch('/api/yard-sales', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(yardSaleData)
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to create yard sale');
	}
	return response.json();
}

export async function updateYardSale(id: string, yardSaleData: YardSaleCreate): Promise<YardSale> {
	const token = localStorage.getItem('access_token');
	const response = await fetch(`/api/yard-sales/${id}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(yardSaleData)
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to update yard sale');
	}
	return response.json();
}

export async function deleteYardSale(id: string): Promise<void> {
	const token = localStorage.getItem('access_token');
	const response = await fetch(`/api/yard-sales/${id}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to delete yard sale');
	}
}

// Featured Image Interfaces
export interface SetFeaturedImageRequest {
	image_url?: string;
	image_key?: string;
	photo_index?: number;
}

export interface FeaturedImageResponse {
	message: string;
	featured_image: string;
}

export interface YardSaleImagesResponse {
	featured_image: string | null;
	photos: string[];
	uploaded_images: string[];
	all_images: string[];
}

// Get available images for a yard sale
export async function getYardSaleImages(yardSaleId: string): Promise<YardSaleImagesResponse> {
	const token = localStorage.getItem('access_token');
	const response = await fetch(`/api/yard-sales/${yardSaleId}/images`, {
		headers: token
			? {
					Authorization: `Bearer ${token}`
				}
			: {}
	});

	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch yard sale images');
	}

	return response.json();
}

// Set featured image for a yard sale
export async function setYardSaleFeaturedImage(
	yardSaleId: string,
	request: SetFeaturedImageRequest
): Promise<FeaturedImageResponse> {
	const token = localStorage.getItem('access_token');
	if (!token) {
		throw new Error('Authentication required');
	}

	console.log('Calling API:', `/api/yard-sales/${yardSaleId}/featured-image`, request);

	const response = await fetch(`/api/yard-sales/${yardSaleId}/featured-image`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(request)
	});

	console.log('Response status:', response.status);

	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		const errorText = await response.text();
		console.error('Error response:', errorText);
		let error;
		try {
			error = JSON.parse(errorText);
		} catch {
			error = { detail: errorText || 'Failed to set featured image' };
		}
		throw new Error(error.detail || error.message || 'Failed to set featured image');
	}

	return response.json();
}

// Remove featured image from a yard sale
export async function removeYardSaleFeaturedImage(yardSaleId: string): Promise<void> {
	const token = localStorage.getItem('access_token');
	const response = await fetch(`/api/yard-sales/${yardSaleId}/featured-image`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to remove featured image');
	}
}

export interface CurrentUser {
	id: string;
	username: string;
	email: string;
	full_name: string;
	phone_number?: string;
	location: {
		city: string;
		state: string;
		zip: string;
	};
	bio: string;
	permissions?: string; // User permissions (e.g., "admin", "user")
	// Trust metrics
	average_rating?: number;
	total_ratings?: number;
	is_verified?: boolean;
	verification_badges?: VerificationBadge[];
}

export interface VerificationBadge {
	id: string;
	user_id: string;
	verification_type: 'email' | 'phone' | 'identity' | 'address';
	status: 'pending' | 'verified' | 'rejected';
	verified_at?: string;
	created_at: string;
}

export interface Rating {
	id: string;
	rating: number; // 1-5
	review_text?: string;
	created_at: string;
	reviewer_id: string;
	reviewer_username: string;
	rated_user_id: string;
	rated_user_username: string;
	yard_sale_id?: string | null;
	yard_sale_title?: string | null;
}

export interface Report {
	id: string;
	reporter_id: string;
	reported_user_id?: string;
	reported_yard_sale_id?: string;
	report_type: 'scam' | 'inappropriate' | 'spam' | 'other';
	description: string;
	status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
	created_at: string;
	reporter_username?: string;
	reported_username?: string;
	reported_yard_sale_title?: string;
}

// Helper function to parse JWT token and extract user ID
function getCurrentUserId(): string | null {
	const token = localStorage.getItem('access_token');
	if (!token) return null;

	try {
		// JWT tokens have 3 parts separated by dots: header.payload.signature
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		// Decode the payload (second part)
		const payload = JSON.parse(atob(parts[1]));

		// Handle both string and numeric sub fields
		if (typeof payload.sub === 'string') {
			// If sub is a username, we need to get the actual user ID
			// For now, return null to indicate we need to fetch from backend
			return null;
		} else if (typeof payload.sub === 'number') {
			return payload.sub.toString();
		}

		return null;
	} catch (error) {
		console.error('Error parsing JWT token:', error);
		return null;
	}
}

export async function getCurrentUser(): Promise<CurrentUser> {
	try {
		// First try to get user ID from JWT token
		const userId = getCurrentUserId();

		if (userId) {
			// If we have a user ID, fetch the user profile
			return await getUserProfile(userId);
		} else {
			// If we can't get user ID from token, try the /me endpoint
			const token = localStorage.getItem('access_token');
			const response = await fetch('/me', {
				headers: token
					? {
							Authorization: `Bearer ${token}`
						}
					: {}
			});

			// Handle token expiration
			if (response.status === 401 || response.status === 403) {
				const { handleTokenExpiration } = await import('./auth');
				handleTokenExpiration();
				throw new Error('Token expired');
			}

			if (!response.ok) {
				throw new Error(`API returned ${response.status}`);
			}

			const userData = await response.json();
			return userData;
		}
	} catch (error) {
		console.error('getCurrentUser failed:', error);
		throw error;
	}
}

// User Profile API functions
export async function getUserProfile(userId: string): Promise<CurrentUser> {
	const response = await fetch(`/users/${userId}`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('User profile endpoint not implemented on backend');
		}
		throw new Error(`Failed to fetch user profile: ${response.status}`);
	}
	return response.json();
}

// Ratings API functions
export async function getUserRatings(userId: string): Promise<Rating[]> {
	const response = await fetch(`/users/${userId}/ratings`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});
	if (!response.ok) {
		if (response.status === 404 || response.status === 405) {
			throw new Error('User ratings endpoint not implemented on backend');
		}
		throw new Error(`Failed to fetch user ratings: ${response.status}`);
	}
	return response.json();
}

export async function createRating(
	ratedUserId: number,
	rating: number,
	reviewText?: string,
	yardSaleId?: number
): Promise<Rating> {
	const response = await fetch('/api/ratings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({
			rated_user_id: ratedUserId,
			rating,
			review_text: reviewText,
			yard_sale_id: yardSaleId
		})
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to create rating');
	}
	return response.json();
}

// Reports API functions
export async function createReport(
	reportType: 'scam' | 'inappropriate' | 'spam' | 'other',
	description: string,
	reportedUserId?: number,
	reportedYardSaleId?: number
): Promise<Report> {
	const response = await fetch('/api/reports', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({
			report_type: reportType,
			description,
			reported_user_id: reportedUserId,
			reported_yard_sale_id: reportedYardSaleId
		})
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to create report');
	}
	return response.json();
}

// Verification API functions
export async function requestVerification(
	verificationType: 'email' | 'phone' | 'identity' | 'address'
): Promise<VerificationBadge> {
	const response = await fetch('/api/verifications', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({
			verification_type: verificationType
		})
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Failed to request verification');
	}
	return response.json();
}

// ===== NOTIFICATION API FUNCTIONS =====

// Get user's notifications with pagination and filtering
export async function getNotifications(
	page: number = 1,
	limit: number = 50,
	unreadOnly: boolean = false
): Promise<{
	notifications: Notification[];
	total: number;
	unread_count: number;
	unread_notifications: number;
}> {
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString(),
		...(unreadOnly && { unread_only: 'true' })
	});

	const response = await fetch(`/api/notifications?${params}`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch notifications');
	}
	return response.json();
}

// Get notification counts
export async function getNotificationCounts(): Promise<{
	total: number;
	unread: number;
	total_notifications: number;
	unread_notifications: number;
}> {
	const response = await fetch('/api/notifications/count', {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to fetch notification counts');
	}
	return response.json();
}

// Mark a specific notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
	const response = await fetch(`/api/notifications/${notificationId}/read`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to mark notification as read');
	}
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<void> {
	const response = await fetch('/api/notifications/read-all', {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to mark all notifications as read');
	}
}

// Delete a specific notification
export async function deleteNotification(notificationId: string): Promise<void> {
	const response = await fetch(`/api/notifications/${notificationId}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	// Handle token expiration
	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error('Failed to delete notification');
	}
}

export async function getUserVerifications(userId: string): Promise<VerificationBadge[]> {
	const response = await fetch(`/api/users/${userId}/verifications`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});
	if (!response.ok) {
		if (response.status === 404 || response.status === 405) {
			throw new Error('User verifications endpoint not implemented on backend');
		}
		throw new Error(`Failed to fetch user verifications: ${response.status}`);
	}
	return response.json();
}

// Image Upload API functions
export interface UploadedImage {
	id: string;
	key: string;
	url: string;
	filename: string;
	size: number;
	uploaded_at: string;
}

// ===== MARKETPLACE (Market Items) =====
export interface MarketItem {
	id: string;
	name: string;
	description: string;
	price: number;
	is_public: boolean;
	is_available?: boolean;
	status: 'active' | 'sold' | 'hidden';
	category?: string;
	photos: string[];
	featured_image?: string | null;
	price_range?: string;
	payment_methods?: string[];
	venmo_url?: string | null;
	facebook_url?: string | null;
	created_at: string;
	owner_id: string;
	owner_username: string;
	owner_is_admin?: boolean; // Indicates if the owner has admin permissions
	comment_count: number;
	is_watched?: boolean | null;
	original_price?: number | null;
	last_price_change_date?: string | null;
	price_reduced?: boolean;
	price_reduction_amount?: number;
	price_reduction_percentage?: number;
	accepts_best_offer?: boolean;
	contact_phone?: string | null;
	contact_email?: string | null;
	condition?: string | null;
	quantity?: number | null;
	is_free?: boolean; // Indicates if the item is free
}

export interface MarketItemCreate {
	name: string;
	description?: string;
	price: number;
	is_public?: boolean;
	status?: 'active' | 'sold' | 'hidden';
	category?: string;
	photos?: string[];
	featured_image?: string | null;
	price_range?: string;
	payment_methods?: string[];
	venmo_url?: string | null;
	facebook_url?: string | null;
	accepts_best_offer?: boolean;
	contact_phone?: string | null;
	contact_email?: string | null;
	condition?: string | null;
	quantity?: number | null;
	is_free?: boolean; // Indicates if the item is free
}

// Paginated response interface
export interface MarketItemsResponse {
	items: MarketItem[];
	total: number;
	limit: number;
	offset: number;
	has_more: boolean;
}

// Listing/search
export async function getMarketItems(
	params: {
		search?: string;
		category?: string;
		min_price?: number;
		max_price?: number;
		status?: 'active' | 'sold' | 'hidden' | 'all';
		accepts_best_offer?: boolean;
		price_reduced?: boolean;
		is_free?: boolean;
		owner_is_admin?: boolean;
		limit?: number;
		offset?: number;
		sort_by?: 'price' | 'created_at' | 'price_reduction_percentage' | 'name';
		sort_order?: 'asc' | 'desc';
	} = {}
): Promise<MarketItemsResponse> {
	const query = new URLSearchParams();
	if (params.search) query.set('search', params.search);
	if (params.category) query.set('category', params.category);
	if (params.min_price != null) query.set('min_price', String(params.min_price));
	if (params.max_price != null) query.set('max_price', String(params.max_price));
	if (params.status) query.set('status', params.status);
	if (params.accepts_best_offer !== undefined)
		query.set('accepts_best_offer', String(params.accepts_best_offer));
	if (params.price_reduced !== undefined) query.set('price_reduced', String(params.price_reduced));
	if (params.is_free !== undefined) query.set('is_free', String(params.is_free));
	if (params.owner_is_admin !== undefined)
		query.set('owner_is_admin', String(params.owner_is_admin));
	if (params.limit != null) query.set('limit', String(params.limit));
	if (params.offset != null) query.set('offset', String(params.offset));
	if (params.sort_by) query.set('sort_by', params.sort_by);
	if (params.sort_order) query.set('sort_order', params.sort_order);
	const token = localStorage.getItem('access_token');
	const url = `/api/market-items${query.toString() ? `?${query}` : ''}`;
	// Debug logging for filter parameters
	if (import.meta.env.DEV && (params.is_free === true || params.owner_is_admin === true)) {
		console.log('[getMarketItems] Filter params:', {
			is_free: params.is_free,
			owner_is_admin: params.owner_is_admin,
			url: url
		});
	}
	const res = await fetch(url, {
		headers: token ? { Authorization: `Bearer ${token}` } : undefined
	});
	if (!res.ok) {
		// Log error details for debugging
		const errorText = await res.text();
		console.error('[getMarketItems] Request failed:', {
			status: res.status,
			statusText: res.statusText,
			url: url,
			error: errorText
		});
		throw new Error(`Failed to fetch market items: ${res.status} ${res.statusText}`);
	}
	return res.json();
}

export async function getMarketItemById(id: string): Promise<MarketItem> {
	const token = localStorage.getItem('access_token');
	const res = await fetch(`/api/market-items/${id}`, {
		headers: token ? { Authorization: `Bearer ${token}` } : undefined
	});
	if (!res.ok) throw new Error('Failed to fetch market item');
	return res.json();
}

export async function createMarketItem(data: MarketItemCreate): Promise<MarketItem> {
	const res = await fetch('/api/market-items', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify(data)
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to create market item');
	return res.json();
}

export async function updateMarketItem(
	id: string,
	data: Partial<MarketItemCreate>
): Promise<MarketItem> {
	const res = await fetch(`/api/market-items/${id}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify(data)
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to update market item');
	return res.json();
}

export async function deleteMarketItem(id: string): Promise<void> {
	const res = await fetch(`/api/market-items/${id}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to delete market item');
}

// Comments
export interface MarketItemComment {
	id: string;
	content: string;
	created_at: string;
	updated_at: string;
	item_id: string;
	user_id: string;
	username?: string;
}

export async function getMarketItemComments(itemId: string): Promise<MarketItemComment[]> {
	const res = await fetch(`/api/market-items/${itemId}/comments`);
	if (!res.ok) throw new Error('Failed to fetch item comments');
	return res.json();
}

export async function addMarketItemComment(
	itemId: string,
	content: string
): Promise<MarketItemComment> {
	const res = await fetch(`/api/market-items/${itemId}/comments`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({ content })
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to add item comment');
	return res.json();
}

export async function deleteMarketItemComment(commentId: string): Promise<void> {
	const res = await fetch(`/api/market-items/comments/${commentId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to delete item comment');
}

// Watchlist
export async function watchMarketItem(itemId: string): Promise<void> {
	const res = await fetch(`/api/market-items/${itemId}/watch`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to watch item');
}

export async function unwatchMarketItem(itemId: string): Promise<void> {
	const res = await fetch(`/api/market-items/${itemId}/watch`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to unwatch item');
}

export async function getWatchedItems(params?: {
	search?: string;
	category?: string;
	min_price?: number;
	max_price?: number;
	status?: 'active' | 'sold' | 'hidden' | 'all';
	accepts_best_offer?: boolean;
	price_reduced?: boolean;
	limit?: number;
	offset?: number;
	sort_by?: 'price' | 'created_at' | 'price_reduction_percentage' | 'name';
	sort_order?: 'asc' | 'desc';
}): Promise<MarketItemsResponse | MarketItem[]> {
	const query = new URLSearchParams();
	if (params?.search) query.set('search', params.search);
	if (params?.category) query.set('category', params.category);
	if (params?.min_price != null) query.set('min_price', String(params.min_price));
	if (params?.max_price != null) query.set('max_price', String(params.max_price));
	if (params?.status) query.set('status', params.status);
	if (params?.accepts_best_offer !== undefined)
		query.set('accepts_best_offer', String(params.accepts_best_offer));
	if (params?.price_reduced !== undefined) query.set('price_reduced', String(params.price_reduced));
	if (params?.limit != null) query.set('limit', String(params.limit));
	if (params?.offset != null) query.set('offset', String(params.offset));
	if (params?.sort_by) query.set('sort_by', params.sort_by);
	if (params?.sort_order) query.set('sort_order', params.sort_order);

	const url = `/user/watched-items${query.toString() ? `?${query}` : ''}`;
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch watched items');
	const data = await res.json();

	// Handle both paginated response and array response for backward compatibility
	if (data && typeof data === 'object' && 'items' in data) {
		return data as MarketItemsResponse;
	}
	// Fallback: wrap array response in paginated format
	return {
		items: data as MarketItem[],
		total: (data as MarketItem[]).length,
		limit: params?.limit || (data as MarketItem[]).length,
		offset: params?.offset || 0,
		has_more: false
	};
}

// Market Item Featured Image Interfaces
export interface MarketItemImagesResponse {
	item_id: string;
	featured_image: string | null;
	photos: string[];
	uploaded_images: Array<
		string | { key: string; url: string; size: number; last_modified: string; filename: string }
	>;
	all_images: string[];
}

// Set featured image for a market item
export async function setMarketItemFeaturedImage(
	itemId: string,
	request: SetFeaturedImageRequest
): Promise<FeaturedImageResponse> {
	const token = localStorage.getItem('access_token');
	if (!token) {
		throw new Error('Authentication required');
	}

	const response = await fetch(`/api/market-items/${itemId}/featured-image`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		const errorText = await response.text().catch(() => '');
		throw new Error(error.detail || error.message || 'Failed to set featured image');
	}

	return response.json();
}

// Remove featured image from a market item
export async function removeMarketItemFeaturedImage(itemId: string): Promise<void> {
	const token = localStorage.getItem('access_token');
	if (!token) {
		throw new Error('Authentication required');
	}

	const response = await fetch(`/api/market-items/${itemId}/featured-image`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.detail || error.message || 'Failed to remove featured image');
	}
}

// Get all available images for a market item
export async function getMarketItemImages(itemId: string): Promise<MarketItemImagesResponse> {
	const token = localStorage.getItem('access_token');
	if (!token) {
		throw new Error('Authentication required');
	}

	const response = await fetch(`/api/market-items/${itemId}/images`, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.detail || error.message || 'Failed to fetch images');
	}

	return response.json();
}

// Messaging
export interface MarketItemMessage {
	id: string;
	content: string;
	is_read: boolean;
	created_at: string;
	conversation_id: string;
	sender_id: string;
	recipient_id: string;
	sender_username?: string;
	recipient_username?: string;
}

export interface MarketItemMessageCreate {
	content: string;
	recipient_id?: string;
}

export interface MarketItemConversation {
	id: string;
	item_id: string;
	item_name?: string;
	participant1_id: string;
	participant1_username?: string;
	participant2_id: string;
	participant2_username?: string;
	created_at: string;
	updated_at: string;
	last_message?: MarketItemMessage | null;
	unread_count?: number;
}

// Send initial message (creates conversation)
export async function sendMarketItemMessage(
	itemId: string,
	content: string
): Promise<MarketItemMessage> {
	const res = await fetch(`/market-items/${itemId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({ content })
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to send message');
	return res.json();
}

// Send message in existing conversation
export async function sendMarketItemConversationMessage(
	conversationId: string,
	content: string
): Promise<MarketItemMessage> {
	const res = await fetch(`/market-items/conversations/${conversationId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({ content })
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to send message');
	return res.json();
}

// Get messages for an item
export async function getMarketItemMessages(itemId: string): Promise<MarketItemMessage[]> {
	const res = await fetch(`/market-items/${itemId}/messages`, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch messages');
	return res.json();
}

// Get messages for a conversation
export async function getMarketItemConversationMessages(
	conversationId: string
): Promise<MarketItemMessage[]> {
	const res = await fetch(`/market-items/conversations/${conversationId}/messages`, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch messages');
	return res.json();
}

// Get all conversations for current user
export async function getMarketItemConversations(): Promise<MarketItemConversation[]> {
	const res = await fetch(`/market-items/conversations`, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch conversations');
	return res.json();
}

// Mark message as read
export async function markMarketItemMessageRead(messageId: string): Promise<void> {
	const res = await fetch(`/market-items/messages/${messageId}/read`, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to mark message as read');
}

// Get unread message count
export async function getMarketItemUnreadCount(): Promise<{ unread_count: number }> {
	const res = await fetch(`/market-items/messages/unread-count`, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch unread count');
	return res.json();
}

// Yard Sale Conversations (similar to MarketItemConversation)
export interface YardSaleConversation {
	id: string;
	yard_sale_id: string;
	yard_sale_title?: string;
	participant1_id: string;
	participant1_username?: string;
	participant2_id: string;
	participant2_username?: string;
	created_at: string;
	updated_at: string;
	last_message?: Message | null;
	unread_count?: number;
}

// Send initial message to yard sale (creates conversation)
export async function sendYardSaleMessage(yardSaleId: string, content: string): Promise<Message> {
	const res = await fetch(`/yard-sales/${yardSaleId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({ content })
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to send message');
	return res.json();
}

// Send message in existing yard sale conversation
export async function sendYardSaleConversationMessage(
	conversationId: string,
	content: string
): Promise<Message> {
	const res = await fetch(`/yard-sales/conversations/${conversationId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: JSON.stringify({ content })
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to send message');
	return res.json();
}

// Get messages for a yard sale conversation
export async function getYardSaleConversationMessages(conversationId: string): Promise<Message[]> {
	const res = await fetch(`/yard-sales/conversations/${conversationId}/messages`, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch messages');
	return res.json();
}

// Get all yard sale conversations for current user
export async function getYardSaleConversations(): Promise<YardSaleConversation[]> {
	const res = await fetch(`/yard-sales/conversations`, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch conversations');
	return res.json();
}

// Mark yard sale message as read
export async function markYardSaleMessageRead(messageId: string): Promise<void> {
	const res = await fetch(`/yard-sales/messages/${messageId}/read`, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to mark message as read');
}

// Get unread yard sale message count
export async function getYardSaleUnreadCount(): Promise<{ unread_count: number }> {
	const res = await fetch(`/yard-sales/messages/unread-count`, {
		headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}
	if (!res.ok) throw new Error('Failed to fetch unread count');
	return res.json();
}

// Get API base URL from environment variable, or use current origin in production
// This allows nginx to proxy requests and avoids CORS/mixed content issues
// Must be a function to ensure it's evaluated on the client side, not during SSR
let cachedApiBase: string | null = null;
let lastHostname: string | null = null; // Track hostname to detect domain changes

function getApiBase(): string {
	// Only evaluate on client side (window is available)
	// If window is not available (SSR), return a placeholder that won't be used
	// This should never be used in actual API calls since they all check for browser first
	if (typeof window === 'undefined') {
		return 'https://api.yardsalefinders.com'; // Placeholder for SSR (matches production)
	}

	// IMPORTANT: Check HTTPS/production FIRST, before checking environment variable
	// This ensures production always uses HTTPS, even if env var is set to HTTP
	const currentProtocol = window.location.protocol;
	const currentHostname = window.location.hostname;
	const isProduction =
		currentHostname === 'yardsalefinders.com' || currentHostname === 'main.yardsalefinders.com';

	// If we're on HTTPS production, ALWAYS use HTTPS API (ignore HTTP env vars and cache)
	if (currentProtocol === 'https:' && isProduction) {
		cachedApiBase = 'https://api.yardsalefinders.com';
		lastHostname = currentHostname;
		// Debug logging
		console.log('[API Base] Production HTTPS - Using:', cachedApiBase);
		console.log('[API Base] Current location:', {
			protocol: currentProtocol,
			hostname: currentHostname,
			origin: window.location.origin
		});
		console.log('[API Base] Env var (ignored in production):', import.meta.env.VITE_API_BASE_URL);
		return cachedApiBase;
	}

	// Check environment variable (but only if not on HTTPS production)
	// This allows dev/staging to use env var, but production always uses HTTPS
	const envApiBase = import.meta.env.VITE_API_BASE_URL;
	if (envApiBase && typeof envApiBase === 'string' && envApiBase.trim() !== '') {
		const trimmedEnv = envApiBase.trim();
		// Only use HTTP env var if we're on HTTP (dev) or if env var is HTTPS
		if (currentProtocol === 'http:' || trimmedEnv.startsWith('https://')) {
			// Only cache if we're on the client side
			cachedApiBase = trimmedEnv;
			lastHostname = currentHostname;
			return trimmedEnv;
		} else {
			// Ignore HTTP env var if we're on HTTPS (shouldn't happen due to check above, but safety)
			console.warn('[API Base] Ignoring HTTP env var on HTTPS:', trimmedEnv);
		}
	}

	// For other HTTPS domains, use current origin
	if (currentProtocol === 'https:') {
		cachedApiBase = window.location.origin;
		lastHostname = currentHostname;
		return cachedApiBase;
	}

	// Check cache only for HTTP (development) - but validate it first
	if (cachedApiBase !== null) {
		// If cache exists and we're on HTTP (dev), use it
		if (window.location.protocol === 'http:' && cachedApiBase.startsWith('http://')) {
			return cachedApiBase;
		}
		// If cache is HTTP but we're on HTTPS, clear it (shouldn't happen due to check above, but safety)
		if (window.location.protocol === 'https:' && cachedApiBase.startsWith('http://')) {
			cachedApiBase = null;
		}
	}

	// Fallback to direct IP for development (HTTP only)
	cachedApiBase = 'http://10.1.2.165:8000';
	return cachedApiBase;
}

// Export getApiBase so it can be used directly
// This ensures it's always evaluated on the client side when actually used
export function getApiBaseUrl(): string {
	return getApiBase();
}

// For backward compatibility, create API_BASE that calls getApiBase
// This ensures it's evaluated when used, not at module load time
const API_BASE = getApiBase();

// Helper function to get the proxy URL for an image
export function getImageProxyUrl(imageKey: string): string {
	return `${getApiBase()}/image-proxy/${imageKey}`;
}

// Helper function to get authenticated image URL
export function getAuthenticatedImageUrl(imageUrl: string): string {
	if (!imageUrl) return '';

	// Get token from localStorage (only in browser)
	let token: string | null = null;
	if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
		token = localStorage.getItem('access_token');
	}

	// Handle relative URLs - Use relative path so Vite proxy can add Authorization header
	if (
		imageUrl.startsWith('/image-proxy/') ||
		imageUrl.startsWith('/images/') ||
		imageUrl.startsWith('/upload/')
	) {
		if (token) {
			const separator = imageUrl.includes('?') ? '&' : '?';
			const result = `${imageUrl}${separator}token=${token}`;
			// Debug logging (only in development)
			if (import.meta.env.DEV) {
				console.debug(
					'[Image URL] Added token to relative URL:',
					imageUrl.substring(0, 50),
					'→',
					result.substring(0, 80) + '...'
				);
			}
			return result;
		}

		// If no token, still return the URL (will fail auth but helps debug)
		console.warn('[Image URL] No token found in localStorage for image:', imageUrl);
		return imageUrl;
	}

	// If it's already an API base URL, convert to relative path for proxy
	// Check if the URL contains the API base URL (handles localhost, IP addresses, and production domain)
	const apiBaseHosts = [
		'localhost:8000',
		'10.1.2.165:8000',
		'localhost:5173',
		'10.1.2.165:5173',
		'yardsalefinders.com',
		'main.yardsalefinders.com',
		'api.yardsalefinders.com'
	];
	const isApiUrl = apiBaseHosts.some((host) => imageUrl.includes(host));

	if (isApiUrl) {
		// Extract the path from the full URL
		try {
			const url = new URL(imageUrl);
			const relativePath = url.pathname + url.search;

			if (token) {
				const separator = relativePath.includes('?') ? '&' : '?';
				const result = `${relativePath}${separator}token=${token}`;
				if (import.meta.env.DEV) {
					console.debug(
						'[Image URL] Converted full URL to relative:',
						imageUrl.substring(0, 50),
						'→',
						result.substring(0, 80) + '...'
					);
				}
				return result;
			}

			console.warn('[Image URL] No token found for full URL:', imageUrl);
			return relativePath;
		} catch {
			// If URL parsing fails, return as-is
			return imageUrl;
		}
	}

	// If it's any other URL format, return as-is (might be external URL)
	if (import.meta.env.DEV && imageUrl) {
		console.debug('[Image URL] Unhandled URL format:', imageUrl.substring(0, 100));
	}

	return imageUrl;
}

export async function uploadImage(file: File): Promise<UploadedImage> {
	const formData = new FormData();
	formData.append('file', file);

	// Use full backend URL instead of relative path to avoid proxy issues
	// Call getApiBase() to ensure it's evaluated on client side
	const apiBase = getApiBase();
	const uploadUrl = `${apiBase}/upload/image`;

	// Debug logging to help diagnose production issues
	if (
		import.meta.env.PROD ||
		(typeof window !== 'undefined' && window.location.protocol === 'https:')
	) {
		console.log('[Upload Image] API Base:', apiBase);
		console.log('[Upload Image] Full URL:', uploadUrl);
		console.log(
			'[Upload Image] Window protocol:',
			typeof window !== 'undefined' ? window.location.protocol : 'N/A'
		);
		console.log(
			'[Upload Image] Window hostname:',
			typeof window !== 'undefined' ? window.location.hostname : 'N/A'
		);
	}

	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		},
		body: formData
	});

	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error(`Failed to upload image: ${response.status}`);
	}

	const result = await response.json();
	// Transform the backend response to match our interface
	// Backend now returns URLs pointing to localhost:8000
	return {
		id: result.file_name,
		key: result.file_name,
		url: result.image_url,
		filename: result.file_name,
		size: result.file_size,
		uploaded_at: new Date().toISOString()
	};
}

export async function getUserImages(): Promise<UploadedImage[]> {
	// Use full backend URL instead of relative path
	// Call getApiBase() to ensure it's evaluated on client side
	const apiBase = getApiBase();
	const imagesUrl = `${apiBase}/images`;

	// Debug logging to help diagnose production issues
	if (import.meta.env.PROD || window.location.protocol === 'https:') {
		console.log('[Get User Images] API Base:', apiBase);
		console.log('[Get User Images] Full URL:', imagesUrl);
		console.log('[Get User Images] Window protocol:', window.location.protocol);
		console.log('[Get User Images] Window hostname:', window.location.hostname);
	}

	const response = await fetch(imagesUrl, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error(`Failed to fetch images: ${response.status}`);
	}

	const data = await response.json();
	// Transform the backend response to match our interface
	// Backend now returns URLs pointing to localhost:8000
	return data.images.map((img: any) => ({
		id: img.key,
		key: img.key,
		url: img.url, // Backend now returns localhost:8000 URLs directly
		filename: img.filename,
		size: img.size,
		uploaded_at: img.last_modified
	}));
}

export async function deleteImage(imageKey: string): Promise<void> {
	// Use full backend URL instead of relative path
	// Call getApiBase() to ensure it's evaluated on client side
	const response = await fetch(`${getApiBase()}/images/${imageKey}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});

	if (response.status === 401 || response.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired');
	}

	if (!response.ok) {
		throw new Error(`Failed to delete image: ${response.status}`);
	}
}

// ===== ADMIN API FUNCTIONS =====

export interface AdminDashboardStats {
	total_users: number;
	total_items: number;
	total_yard_sales: number;
	active_items: number;
	active_yard_sales: number;
	free_items: number;
	admin_users: number;
	recent_activity: {
		items_last_7_days: number;
		yard_sales_last_7_days: number;
		users_last_7_days: number;
	};
}

export interface AdminItemsResponse {
	items: MarketItem[];
	total: number;
	limit: number;
	offset: number;
	has_more: boolean;
}

export interface AdminYardSalesResponse {
	yard_sales: YardSale[];
	total: number;
	limit: number;
	offset: number;
	has_more: boolean;
}

export interface AdminUsersResponse {
	users: CurrentUser[];
	total: number;
	limit: number;
	offset: number;
	has_more: boolean;
}

// Get admin dashboard statistics
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
	const token = localStorage.getItem('access_token');
	const res = await fetch(`/api/admin/dashboard/stats`, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired or insufficient permissions');
	}
	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new Error(errorData.detail || `Failed to fetch dashboard stats: ${res.status}`);
	}
	return res.json();
}

// Get all items (admin view - includes hidden)
export async function getAdminItems(
	params: {
		skip?: number;
		limit?: number;
		status?: 'active' | 'sold' | 'hidden';
	} = {}
): Promise<AdminItemsResponse> {
	const token = localStorage.getItem('access_token');
	const query = new URLSearchParams();
	if (params.skip !== undefined) query.set('skip', String(params.skip));
	if (params.limit !== undefined) query.set('limit', String(params.limit));
	if (params.status) query.set('status', params.status);

	const url = `/api/admin/items${query.toString() ? `?${query}` : ''}`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired or insufficient permissions');
	}
	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new Error(errorData.detail || `Failed to fetch admin items: ${res.status}`);
	}
	return res.json();
}

// Get all yard sales (admin view - includes inactive)
export async function getAdminYardSales(
	params: {
		skip?: number;
		limit?: number;
		status?: 'active' | 'closed' | 'on_break';
	} = {}
): Promise<AdminYardSalesResponse> {
	const token = localStorage.getItem('access_token');
	const query = new URLSearchParams();
	if (params.skip !== undefined) query.set('skip', String(params.skip));
	if (params.limit !== undefined) query.set('limit', String(params.limit));
	if (params.status) query.set('status', params.status);

	const url = `/api/admin/yard-sales${query.toString() ? `?${query}` : ''}`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		throw new Error('Token expired or insufficient permissions');
	}
	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new Error(errorData.detail || `Failed to fetch admin yard sales: ${res.status}`);
	}
	return res.json();
}

// Get all users (admin view)
export async function getAdminUsers(
	params: {
		skip?: number;
		limit?: number;
		search?: string;
	} = {}
): Promise<AdminUsersResponse> {
	const token = localStorage.getItem('access_token');
	const query = new URLSearchParams();
	if (params.skip !== undefined) query.set('skip', String(params.skip));
	if (params.limit !== undefined) query.set('limit', String(params.limit));
	if (params.search) query.set('search', params.search);

	// Note: /api/admin/users gets proxied to /admin/users by vite.config.ts
	const url = `/api/admin/users${query.toString() ? `?${query}` : ''}`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	if (res.status === 401 || res.status === 403) {
		const { handleTokenExpiration } = await import('./auth');
		handleTokenExpiration();
		const errorData = await res.json().catch(() => ({}));
		throw new Error(errorData.detail || 'Token expired or insufficient permissions');
	}

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		console.error('getAdminUsers error:', {
			status: res.status,
			statusText: res.statusText,
			error: errorData
		});
		throw new Error(
			errorData.detail || `Failed to fetch admin users: ${res.status} ${res.statusText}`
		);
	}

	const data = await res.json();
	// Ensure response has expected structure
	if (!data.users) {
		console.warn('Unexpected response format:', data);
		return {
			users: [],
			total: 0,
			limit: params.limit || 100,
			offset: params.skip || 0,
			has_more: false
		};
	}
	return data;
}

// Helper function to check if current user is admin
export function isAdmin(user: CurrentUser | null): boolean {
	return user?.permissions === 'admin';
}
