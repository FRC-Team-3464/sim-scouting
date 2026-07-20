/**
 * Canonical browser routes used throughout the React application.
 *
 * Keeping these lowercase paths in one place prevents capitalization and
 * spelling differences between route declarations, links, and redirects.
 * API endpoints and Firestore document paths are separate contracts and do
 * not belong in this browser-routing map.
 */
export const APP_ROUTES = {
    home: "/",
    localData: "/local-data",
    login: "/login",
    match: "/match",
    pit: "/pit",
    signup: "/signup",
} as const;

/** Existing browser paths retained as redirects during the route migration. */
export const LEGACY_APP_ROUTES = {
    localData: "/stored",
    pit: "/pitScouting",
} as const;
