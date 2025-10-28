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
	comment_count: number;
	venmo_url?: string;
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

		// Handle both string and numeric user IDs
		let currentUserId: number | null = null;
		if (typeof payload.sub === 'number') {
			currentUserId = payload.sub;
		} else if (typeof payload.sub === 'string') {
			// Try to parse as integer first
			const parsed = parseInt(payload.sub);
			if (!isNaN(parsed)) {
				currentUserId = parsed;
			} else {
				// If it's a string like "javiddelossantos", we need to get the actual user ID
				// For now, let's use the getCurrentUser API to get the proper user ID
				const currentUser = await getCurrentUser();
				currentUserId = currentUser?.id || null;
			}
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

export async function updateYardSale(id: number, yardSaleData: YardSaleCreate): Promise<YardSale> {
	const response = await fetch(`/api/yard-sales/${id}`, {
		method: 'PUT',
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
		throw new Error(errorData.detail || 'Failed to update yard sale');
	}
	return response.json();
}

export async function deleteYardSale(id: string): Promise<void> {
	const response = await fetch(`/api/yard-sales/${id}`, {
		method: 'DELETE'
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
			const response = await fetch('/api/me');

			// Handle token expiration - don't redirect here, let calling code handle it
			if (response.status === 401 || response.status === 403) {
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
	const response = await fetch(`/api/users/${userId}`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('access_token')}`
		}
	});
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
	const response = await fetch(`/api/users/${userId}/ratings`, {
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

// Helper function to get the proxy URL for an image
export function getImageProxyUrl(imageKey: string): string {
	return `http://localhost:8000/image-proxy/${imageKey}`;
}

// Helper function to get authenticated image URL
export function getAuthenticatedImageUrl(imageUrl: string): string {
	if (!imageUrl) return '';

	// If it's already a localhost:8000 URL, add the token as a query parameter
	if (imageUrl.includes('localhost:8000')) {
		const token = localStorage.getItem('access_token');
		if (token) {
			const separator = imageUrl.includes('?') ? '&' : '?';
			return `${imageUrl}${separator}token=${token}`;
		}
	}

	return imageUrl;
}

export async function uploadImage(file: File): Promise<UploadedImage> {
	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch('/upload/image', {
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
	const response = await fetch('/images', {
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
	const response = await fetch(`/images/${imageKey}`, {
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
