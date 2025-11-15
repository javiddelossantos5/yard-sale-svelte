import type { Event } from './api';

/**
 * Get a formatted time remaining message for events
 * This function calculates time remaining based on the event's timezone
 */
export function getEventTimeRemainingMessage(event: Event): string {
	if (!event.end_date || !event.end_time) {
		return '';
	}

	// Use event's timezone if available, otherwise default to Mountain Time
	const timezone = event.timezone || 'America/Denver';
	const now = new Date();

	// Get current time components in the event's timezone
	const nowInTzParts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).formatToParts(now);

	const nowObj: Record<string, string> = {};
	nowInTzParts.forEach((part) => {
		nowObj[part.type] = part.value;
	});

	const nowYear = parseInt(nowObj.year || '0');
	const nowMonth = parseInt(nowObj.month || '0');
	const nowDay = parseInt(nowObj.day || '0');
	const nowHour = parseInt(nowObj.hour || '0');
	const nowMin = parseInt(nowObj.minute || '0');
	const nowSec = parseInt(nowObj.second || '0');

	// Parse end date and time (these represent wall-clock time in the event's timezone)
	const [endYear, endMonth, endDay] = event.end_date.split('-').map(Number);
	const [endHour, endMin] = event.end_time.split(':').map(Number);

	// Since both "now" and "end" times are in the same timezone (event's timezone),
	// we can compare them directly by calculating the difference in minutes

	// Calculate total minutes from start of day for both times
	const nowTotalMinutes = nowHour * 60 + nowMin;
	const endTotalMinutes = endHour * 60 + endMin;

	// Calculate days difference using Date objects (accounts for month/year boundaries)
	const nowDateObj = new Date(nowYear, nowMonth - 1, nowDay);
	const endDateObj = new Date(endYear, endMonth - 1, endDay);
	const daysDiff = Math.floor(
		(endDateObj.getTime() - nowDateObj.getTime()) / (1000 * 60 * 60 * 24)
	);

	// Calculate total minutes difference
	const totalMinutesDiff = daysDiff * 24 * 60 + (endTotalMinutes - nowTotalMinutes);

	const diffMinutes = totalMinutesDiff;
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffMinutes / (60 * 24));

	if (diffMinutes < 0) {
		// Event has ended
		if (Math.abs(diffDays) === 0) {
			return 'Ended today';
		} else if (Math.abs(diffDays) === 1) {
			return 'Ended yesterday';
		} else {
			return `Ended ${Math.abs(diffDays)} days ago`;
		}
	}

	// Check if it ends today (in the event's timezone)
	const isEndingToday = endYear === nowYear && endMonth === nowMonth && endDay === nowDay;

	if (isEndingToday) {
		// Ending today - show minutes or hours
		if (diffMinutes < 60) {
			if (diffMinutes <= 0) {
				return 'Ending soon';
			}
			return `${diffMinutes} min left`;
		} else if (diffHours === 1) {
			return '1 hour left';
		} else {
			return `${diffHours} hours left`;
		}
	} else {
		// Not ending today - show days
		if (diffDays === 0) {
			return 'Ends today';
		} else if (diffDays === 1) {
			return 'Ends tomorrow';
		} else {
			return `Ends in ${diffDays} days`;
		}
	}
}
