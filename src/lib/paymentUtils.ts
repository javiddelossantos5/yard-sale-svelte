import type { PaymentMethod } from './api';

// Cache for payment methods to avoid repeated API calls
let paymentMethodsCache: PaymentMethod[] | null = null;

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
	if (paymentMethodsCache) {
		return paymentMethodsCache;
	}

	try {
		const { getAvailablePaymentMethods } = await import('./api');
		paymentMethodsCache = await getAvailablePaymentMethods();
		return paymentMethodsCache;
	} catch (error) {
		console.warn('Failed to fetch payment methods from backend, using fallback:', error);
		// Always return fallback methods when backend fails
		const fallbackMethods = getFallbackPaymentMethods();
		paymentMethodsCache = fallbackMethods;
		return fallbackMethods;
	}
}

function getFallbackPaymentMethods(): PaymentMethod[] {
	return [
		{ id: 'cash', name: 'Cash', icon: 'dollar-sign', icon_type: 'solid' },
		{ id: 'paypal', name: 'PayPal', icon: 'paypal', icon_type: 'brand' },
		{ id: 'zelle', name: 'Zelle', icon: 'check-circle', icon_type: 'solid' },
		{ id: 'apple', name: 'Apple Pay', icon: 'apple', icon_type: 'brand' },
		{ id: 'google', name: 'Google Pay', icon: 'google', icon_type: 'brand' },
		{ id: 'square', name: 'Square', icon: 'credit-card', icon_type: 'solid' },
		{ id: 'visa', name: 'Visa', icon: 'cc-visa', icon_type: 'brand' },
		{ id: 'mastercard', name: 'Mastercard', icon: 'cc-mastercard', icon_type: 'brand' },
		{ id: 'amex', name: 'American Express', icon: 'cc-amex', icon_type: 'brand' },
		{ id: 'discover', name: 'Discover', icon: 'cc-discover', icon_type: 'brand' },
		{ id: 'bitcoin', name: 'Bitcoin', icon: 'bitcoin', icon_type: 'brand' },
		{ id: 'ethereum', name: 'Ethereum', icon: 'ethereum', icon_type: 'brand' },
		{ id: 'check', name: 'Check', icon: 'check', icon_type: 'solid' },
		{ id: 'credit-card', name: 'Credit Card', icon: 'credit-card', icon_type: 'solid' }
	];
}

export function getPaymentMethodIcon(
	paymentMethodName: string,
	availableMethods: PaymentMethod[]
): { icon: string; iconType: 'solid' | 'brand' } {
	const normalizedName = paymentMethodName.toLowerCase().trim();

	// Try to find exact match first
	const exactMatch = availableMethods.find(
		(method) =>
			method.name.toLowerCase() === normalizedName || method.id.toLowerCase() === normalizedName
	);

	if (exactMatch) {
		return { icon: exactMatch.icon, iconType: exactMatch.icon_type };
	}

	// Try to find partial match
	const partialMatch = availableMethods.find(
		(method) =>
			normalizedName.includes(method.name.toLowerCase()) ||
			normalizedName.includes(method.id.toLowerCase()) ||
			method.name.toLowerCase().includes(normalizedName) ||
			method.id.toLowerCase().includes(normalizedName)
	);

	if (partialMatch) {
		return { icon: partialMatch.icon, iconType: partialMatch.icon_type };
	}

	// Fallback to hardcoded logic for backward compatibility
	return getFallbackIcon(paymentMethodName);
}

function getFallbackIcon(paymentMethodName: string): { icon: string; iconType: 'solid' | 'brand' } {
	const method = paymentMethodName.toLowerCase();

	if (method.includes('cash')) {
		return { icon: 'dollar-sign', iconType: 'solid' };
	} else if (method.includes('venmo')) {
		return { icon: 'check-circle', iconType: 'solid' };
	} else if (method.includes('paypal')) {
		return { icon: 'paypal', iconType: 'brand' };
	} else if (method.includes('zelle')) {
		return { icon: 'check-circle', iconType: 'solid' };
	} else if (method.includes('apple')) {
		return { icon: 'apple', iconType: 'brand' };
	} else if (method.includes('google')) {
		return { icon: 'google', iconType: 'brand' };
	} else if (method.includes('square')) {
		return { icon: 'credit-card', iconType: 'solid' };
	} else if (method.includes('visa')) {
		return { icon: 'cc-visa', iconType: 'brand' };
	} else if (method.includes('mastercard')) {
		return { icon: 'cc-mastercard', iconType: 'brand' };
	} else if (method.includes('amex') || method.includes('american express')) {
		return { icon: 'cc-amex', iconType: 'brand' };
	} else if (method.includes('discover')) {
		return { icon: 'cc-discover', iconType: 'brand' };
	} else if (method.includes('bitcoin')) {
		return { icon: 'bitcoin', iconType: 'brand' };
	} else if (method.includes('ethereum') || method.includes('eth')) {
		return { icon: 'ethereum', iconType: 'brand' };
	} else if (method.includes('check')) {
		return { icon: 'check', iconType: 'solid' };
	} else if (method.includes('card') || method.includes('credit') || method.includes('debit')) {
		return { icon: 'credit-card', iconType: 'solid' };
	} else {
		return { icon: 'dollar-sign', iconType: 'solid' };
	}
}
