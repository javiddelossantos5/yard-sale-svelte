import type { YardSale } from './api';

/**
 * Check if a yard sale is currently active (not expired)
 * A yard sale is considered active if the end date hasn't passed
 */
export function isYardSaleActive(yardSale: YardSale): boolean {
	const now = new Date();
	const endDate = new Date(yardSale.end_date || '');

	// Add end time to the end date for more accurate comparison
	if (yardSale.end_time) {
		const [hours, minutes] = yardSale.end_time.split(':').map(Number);
		endDate.setHours(hours, minutes, 0, 0);
	}

	return endDate > now;
}

/**
 * Check if a yard sale has started yet
 * A yard sale is considered started if the start date has passed
 */
export function hasYardSaleStarted(yardSale: YardSale): boolean {
	const now = new Date();
	const startDate = new Date(yardSale.start_date || '');

	// Add start time to the start date for more accurate comparison
	if (yardSale.start_time) {
		const [hours, minutes] = yardSale.start_time.split(':').map(Number);
		startDate.setHours(hours, minutes, 0, 0);
	}

	return startDate <= now;
}

/**
 * Get the status of a yard sale
 */
export function getYardSaleStatus(yardSale: YardSale): 'upcoming' | 'active' | 'expired' {
	if (!hasYardSaleStarted(yardSale)) {
		return 'upcoming';
	}

	if (isYardSaleActive(yardSale)) {
		return 'active';
	}

	return 'expired';
}

/**
 * Get a human-readable status message
 */
export function getYardSaleStatusMessage(yardSale: YardSale): string {
	const status = getYardSaleStatus(yardSale);

	switch (status) {
		case 'upcoming':
			return "This yard sale hasn't started yet";
		case 'active':
			return 'This yard sale is currently active';
		case 'expired':
			return 'This yard sale has ended';
		default:
			return 'Status unknown';
	}
}

/**
 * Get the number of days until a yard sale starts or ends
 */
export function getDaysUntilEvent(yardSale: YardSale): number {
	const now = new Date();
	const startDate = new Date(yardSale.start_date || '');
	const endDate = new Date(yardSale.end_date || '');

	// If it hasn't started, return days until start
	if (!hasYardSaleStarted(yardSale)) {
		const diffTime = startDate.getTime() - now.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	// If it's active, return days until end
	if (isYardSaleActive(yardSale)) {
		const diffTime = endDate.getTime() - now.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	// If it's expired, return negative days since it ended
	const diffTime = now.getTime() - endDate.getTime();
	return -Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a yard sale is happening today
 */
export function isYardSaleToday(yardSale: YardSale): boolean {
	const today = new Date();
	const startDate = new Date(yardSale.start_date || '');
	const endDate = new Date(yardSale.end_date || '');

	// Check if today is between start and end date (inclusive)
	return today >= startDate && today <= endDate;
}

/**
 * Get a formatted time remaining message
 */
export function getTimeRemainingMessage(yardSale: YardSale): string {
	const status = getYardSaleStatus(yardSale);
	const days = getDaysUntilEvent(yardSale);

	switch (status) {
		case 'upcoming':
			if (days === 0) {
				return 'Starts today!';
			} else if (days === 1) {
				return 'Starts tomorrow';
			} else {
				return `Starts in ${days} days`;
			}
		case 'active':
			if (days === 0) {
				return 'Ends today!';
			} else if (days === 1) {
				return 'Ends tomorrow';
			} else {
				return `Ends in ${days} days`;
			}
		case 'expired':
			if (days === 0) {
				return 'Ended today';
			} else if (days === 1) {
				return 'Ended yesterday';
			} else {
				return `Ended ${Math.abs(days)} days ago`;
			}
		default:
			return '';
	}
}
