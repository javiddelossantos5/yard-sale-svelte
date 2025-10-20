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
	created_at: string;
	updated_at: string;
	owner_id: number;
	owner_username: string;
	comment_count: number;
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
	sender_id: number;
	receiver_id: number;
	yard_sale_id: number;
	created_at: string;
	updated_at: string;
	sender_username: string;
	receiver_username: string;
	is_read: boolean;
}

export interface MessageThread {
	yard_sale_id: number;
	yard_sale_title: string;
	other_user_id: number;
	other_username: string;
	last_message: Message | null;
	unread_count: number;
}

export async function getMessageThreads(): Promise<MessageThread[]> {
	const response = await fetch('/api/messages/threads');
	if (!response.ok) {
		throw new Error('Failed to fetch message threads');
	}
	return response.json();
}

export async function getMessages(yardSaleId: number, otherUserId: number): Promise<Message[]> {
	const response = await fetch(`/api/messages/${yardSaleId}/${otherUserId}`);
	if (!response.ok) {
		throw new Error('Failed to fetch messages');
	}
	return response.json();
}

export async function sendMessage(
	yardSaleId: number,
	receiverId: number,
	content: string
): Promise<Message> {
	const response = await fetch('/api/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			yard_sale_id: yardSaleId,
			receiver_id: receiverId,
			content: content.trim()
		})
	});
	if (!response.ok) {
		throw new Error('Failed to send message');
	}
	return response.json();
}

export async function markMessagesAsRead(yardSaleId: number, senderId: number): Promise<void> {
	const response = await fetch(`/api/messages/${yardSaleId}/${senderId}/read`, {
		method: 'PUT'
	});
	if (!response.ok) {
		throw new Error('Failed to mark messages as read');
	}
}
