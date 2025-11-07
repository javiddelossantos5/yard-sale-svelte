// Disable SSR for market item detail page to ensure client-side routing works
export const ssr = false;

// Note: match function was removed - it was causing 500 errors
// The route structure already handles /market/messages and /market/watched as separate routes
// so this dynamic [id] route will only match actual market item IDs
