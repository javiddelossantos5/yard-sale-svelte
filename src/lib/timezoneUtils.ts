/**
 * Maps US states to their primary timezone
 * Uses IANA timezone identifiers (e.g., America/New_York)
 * For states with multiple timezones, uses the most common or state capital's timezone
 */
const STATE_TO_TIMEZONE: Record<string, string> = {
	// Eastern Time
	AL: 'America/Chicago', // Most of Alabama is Central, but some areas are Eastern
	CT: 'America/New_York',
	DE: 'America/New_York',
	FL: 'America/New_York', // Most of Florida is Eastern (some panhandle is Central)
	GA: 'America/New_York',
	IN: 'America/Indiana/Indianapolis', // Most of Indiana is Eastern
	KY: 'America/New_York', // Eastern Kentucky (some western parts are Central)
	ME: 'America/New_York',
	MD: 'America/New_York',
	MA: 'America/New_York',
	MI: 'America/Detroit', // Most of Michigan is Eastern
	NH: 'America/New_York',
	NJ: 'America/New_York',
	NY: 'America/New_York',
	NC: 'America/New_York',
	OH: 'America/New_York',
	PA: 'America/New_York',
	RI: 'America/New_York',
	SC: 'America/New_York',
	VT: 'America/New_York',
	VA: 'America/New_York',
	WV: 'America/New_York',

	// Central Time
	AR: 'America/Chicago',
	IL: 'America/Chicago',
	IA: 'America/Chicago',
	KS: 'America/Chicago',
	LA: 'America/Chicago',
	MN: 'America/Chicago',
	MS: 'America/Chicago',
	MO: 'America/Chicago',
	NE: 'America/Chicago', // Eastern Nebraska (western is Mountain)
	ND: 'America/Chicago', // Eastern North Dakota (western is Mountain)
	OK: 'America/Chicago',
	SD: 'America/Chicago', // Eastern South Dakota (western is Mountain)
	TN: 'America/Chicago', // Most of Tennessee is Central (eastern is Eastern)
	TX: 'America/Chicago', // Most of Texas is Central (western is Mountain)
	WI: 'America/Chicago',

	// Mountain Time
	AZ: 'America/Phoenix', // Arizona doesn't observe DST
	CO: 'America/Denver',
	ID: 'America/Denver', // Southern Idaho (northern is Pacific)
	MT: 'America/Denver',
	NM: 'America/Denver',
	UT: 'America/Denver',
	WY: 'America/Denver',

	// Pacific Time
	CA: 'America/Los_Angeles',
	NV: 'America/Los_Angeles',
	OR: 'America/Los_Angeles',
	WA: 'America/Los_Angeles',

	// Alaska
	AK: 'America/Anchorage',

	// Hawaii
	HI: 'Pacific/Honolulu'
};

/**
 * Determines the timezone based on state (and optionally city/zip)
 * @param state - Two-letter state code (e.g., 'CA', 'NY')
 * @param city - Optional city name (currently not used but can be enhanced)
 * @param zip - Optional zip code (currently not used but can be enhanced)
 * @returns IANA timezone identifier or null if state is invalid
 */
export function getTimezoneFromLocation(
	state: string | null | undefined,
	city?: string | null | undefined,
	zip?: string | null | undefined
): string | null {
	if (!state || !state.trim()) {
		return null;
	}

	const stateCode = state.trim().toUpperCase();
	const timezone = STATE_TO_TIMEZONE[stateCode];

	if (!timezone) {
		// If state not found, default to America/Denver (Mountain Time)
		// This is a safe fallback for the US
		console.warn(`Unknown state code: ${stateCode}, defaulting to America/Denver`);
		return 'America/Denver';
	}

	return timezone;
}

/**
 * Gets a user-friendly timezone name
 * @param timezone - IANA timezone identifier
 * @returns User-friendly timezone name
 */
export function getTimezoneDisplayName(timezone: string | null | undefined): string {
	if (!timezone) return '';

	const timezoneNames: Record<string, string> = {
		'America/New_York': 'Eastern Time',
		'America/Chicago': 'Central Time',
		'America/Denver': 'Mountain Time',
		'America/Los_Angeles': 'Pacific Time',
		'America/Detroit': 'Eastern Time',
		'America/Indiana/Indianapolis': 'Eastern Time',
		'America/Phoenix': 'Mountain Time (Arizona)',
		'America/Anchorage': 'Alaska Time',
		'Pacific/Honolulu': 'Hawaii Time'
	};

	return timezoneNames[timezone] || timezone;
}
