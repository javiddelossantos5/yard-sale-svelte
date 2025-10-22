import type { YardSale } from './api';

/**
 * Check if a yard sale is currently active (not expired and not closed)
 * A yard sale is considered active if:
 * 1. The end date hasn't passed AND
 * 2. The status is 'active' or 'on_break' (not 'closed')
 */
export function isYardSaleActive(yardSale: YardSale): boolean {
	// Use Mountain Time for all date comparisons
	const now = new Date();
	const nowMountain = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));

	// Parse the yard sale end date in Mountain Time
	const endDateStr = yardSale.end_date || '';
	if (!endDateStr) return false;

	// Create date in Mountain Time by parsing as if it's in Mountain Time
	const endDate = new Date(endDateStr + 'T00:00:00');

	// Add end time to the end date for more accurate comparison
	if (yardSale.end_time) {
		const [hours, minutes] = yardSale.end_time.split(':').map(Number);
		endDate.setHours(hours, minutes, 0, 0);
	}

	// Check if the event has ended by date
	const hasEndedByDate = endDate <= nowMountain;

	// Check if the event is closed by status
	const isClosedByStatus = yardSale.status === 'closed';

	return !hasEndedByDate && !isClosedByStatus;
}

/**
 * Check if a yard sale has started yet
 * A yard sale is considered started if the start date has passed
 */
export function hasYardSaleStarted(yardSale: YardSale): boolean {
	// Use Mountain Time for all date comparisons
	const now = new Date();
	const nowMountain = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));

	// Parse the yard sale start date in Mountain Time
	const startDateStr = yardSale.start_date || '';
	if (!startDateStr) return false;

	// Create date in Mountain Time by parsing as if it's in Mountain Time
	const startDate = new Date(startDateStr + 'T00:00:00');

	// Add start time to the start date for more accurate comparison
	if (yardSale.start_time) {
		const [hours, minutes] = yardSale.start_time.split(':').map(Number);
		startDate.setHours(hours, minutes, 0, 0);
	}

	return startDate <= nowMountain;
}

/**
 * Get the status of a yard sale
 * This combines date-based logic with backend status
 */
export function getYardSaleStatus(
	yardSale: YardSale
): 'upcoming' | 'active' | 'on_break' | 'closed' | 'expired' {
	// If it hasn't started yet, it's upcoming
	if (!hasYardSaleStarted(yardSale)) {
		return 'upcoming';
	}

	// If it's closed by backend status, it's closed
	if (yardSale.status === 'closed') {
		return 'closed';
	}

	// If it's on break by backend status, it's on break
	if (yardSale.status === 'on_break') {
		return 'on_break';
	}

	// If it's active by backend status and not expired by date, it's active
	if (yardSale.status === 'active' && isYardSaleActive(yardSale)) {
		return 'active';
	}

	// If the date has passed, it's expired
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
		case 'on_break':
			return yardSale.status_reason || 'This yard sale is currently on break';
		case 'closed':
			return yardSale.status_reason || 'This yard sale is currently closed';
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
	// Use Mountain Time for all date comparisons
	const now = new Date();
	const nowMountain = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));

	// Parse dates in Mountain Time
	const startDateStr = yardSale.start_date || '';
	const endDateStr = yardSale.end_date || '';

	if (!startDateStr || !endDateStr) return 0;

	const startDate = new Date(startDateStr + 'T00:00:00');
	const endDate = new Date(endDateStr + 'T00:00:00');

	// If it hasn't started, return days until start
	if (!hasYardSaleStarted(yardSale)) {
		const diffTime = startDate.getTime() - nowMountain.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	// If it's active, return days until end
	if (isYardSaleActive(yardSale)) {
		const diffTime = endDate.getTime() - nowMountain.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	// If it's expired, return negative days since it ended
	const diffTime = nowMountain.getTime() - endDate.getTime();
	return -Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a yard sale is happening today
 */
export function isYardSaleToday(yardSale: YardSale): boolean {
	// Use Mountain Time for all date comparisons
	const now = new Date();
	const todayMountain = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));

	// Parse dates in Mountain Time
	const startDateStr = yardSale.start_date || '';
	const endDateStr = yardSale.end_date || '';

	if (!startDateStr || !endDateStr) return false;

	const startDate = new Date(startDateStr + 'T00:00:00');
	const endDate = new Date(endDateStr + 'T00:00:00');

	// Check if today is between start and end date (inclusive)
	return todayMountain >= startDate && todayMountain <= endDate;
}

/**
 * Check if a yard sale is active on a specific date
 * This includes multi-day events and considers the yard sale's status
 */
export function isYardSaleActiveOnDate(yardSale: YardSale, targetDate: string): boolean {
	// Parse all dates in Mountain Time
	const target = new Date(targetDate + 'T00:00:00');
	const startDateStr = yardSale.start_date || '';
	const endDateStr = yardSale.end_date || '';

	if (!startDateStr || !endDateStr) return false;

	const startDate = new Date(startDateStr + 'T00:00:00');
	const endDate = new Date(endDateStr + 'T00:00:00');

	// Debug logging
	console.log(`Date filter debug for "${yardSale.title}":`);
	console.log(`  Target date: ${targetDate} -> ${target}`);
	console.log(`  Start date: ${startDateStr} -> ${startDate}`);
	console.log(`  End date: ${endDateStr} -> ${endDate}`);
	console.log(
		`  Target year: ${target.getFullYear()}, Start year: ${startDate.getFullYear()}, End year: ${endDate.getFullYear()}`
	);

	// Check if the target date is between start and end date (inclusive)
	const isWithinDateRange = target >= startDate && target <= endDate;
	console.log(`  Is within date range: ${isWithinDateRange}`);

	// If it's not within the date range, it's not active
	if (!isWithinDateRange) {
		return false;
	}

	// If it's within the date range, check the status
	const status = getYardSaleStatus(yardSale);
	console.log(`  Status: ${status}`);

	// Show if it's active, on_break, or upcoming (but only if it's the start date or later)
	if (status === 'active' || status === 'on_break') {
		console.log(`  Result: true (active/on_break)`);
		return true;
	}

	// For upcoming events, only show if the target date is the start date or later
	if (status === 'upcoming') {
		const result = target >= startDate;
		console.log(`  Result: ${result} (upcoming)`);
		return result;
	}

	// For closed/expired events, only show if the target date is before the end date
	if (status === 'closed' || status === 'expired') {
		const result = target <= endDate;
		console.log(`  Result: ${result} (closed/expired)`);
		return result;
	}

	console.log(`  Result: false (default)`);
	return false;
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
		case 'on_break':
			return 'On break';
		case 'closed':
			return 'Closed';
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
