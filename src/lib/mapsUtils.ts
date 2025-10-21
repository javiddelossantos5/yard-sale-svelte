/**
 * Utility functions for handling maps and directions
 */

/**
 * Detects if the user is on an iOS device
 */
export function isIOS(): boolean {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

/**
 * Generates the appropriate maps URL based on the platform
 * @param address - The full address string
 * @returns The maps URL for the current platform
 */
export function getMapsUrl(address: string): string {
	const encodedAddress = encodeURIComponent(address);

	if (isIOS()) {
		// Apple Maps URL scheme
		return `http://maps.apple.com/?q=${encodedAddress}`;
	} else {
		// Google Maps URL
		return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
	}
}

/**
 * Opens directions to the given address in the appropriate maps app
 * @param address - The full address string
 */
export function openDirections(address: string): void {
	const url = getMapsUrl(address);
	window.open(url, '_blank');
}

/**
 * Gets the platform name for display purposes
 */
export function getPlatformName(): string {
	return isIOS() ? 'Apple Maps' : 'Google Maps';
}
