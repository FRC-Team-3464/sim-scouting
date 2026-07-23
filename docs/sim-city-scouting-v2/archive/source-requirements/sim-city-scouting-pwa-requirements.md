# Product Requirements Document (PRD): Sim-City Scouting Progressive Web Application (PWA)

> Archived source requirement. It informed, but does not override, the canonical product requirements.

## 1. Modern UI & UX Requirements
* **Cross-Device Fluidity**: Implement a mobile-first, responsive design using a utility-first CSS framework (e.g., Tailwind CSS) that scales seamlessly from 5-inch smartphones to 15-inch laptops.
* **Tenth-of-a-Second Data Entry**: Use oversized, high-contrast buttons (minimum 48x48px hit targets) with zero touch-input delay.
* **Dynamic Alliance Themes**: Automatically shift the entire UI background and primary accents to crimson red or deep blue based on the assigned alliance to eliminate data-entry cognitive bias.
* **Canvas-Based Field Mapping**: Build an interactive, coordinate-mapped SVG or `<canvas>` field overlay representing the current year's FRC field layout.
* **Haptic & Visual Feedback**: Utilize the Web Vibrations API (`navigator.vibrate`) for Android devices and instant visual state changes for iOS to confirm successful inputs without forcing the scout to look down.

## 2. Offline-First Architecture (React + Firebase Focus)
* **PWA Service Worker**: Implement a robust Service Worker (using Workbox) to cache the React production bundle, assets, and index.html, enabling the app to load instantly with zero network connectivity.
* **Firestore Offline Persistence**: Enable Firestore's native multi-tab offline persistence (`enableIndexedDbPersistence`) in the React initialization layer to automatically queue mutations locally when offline.
* **Fail-Safe QR Code Syncing**: Because FRC venue cellular/Wi-Fi environments frequently drop packets, implement a client-side QR generation engine (e.g., using `qrcode.react`).
* **Data Compression**: Compress match JSON payloads using lightweight compression (e.g., `lz-string`) before rendering them as dynamic, multi-frame QR codes to maximize data density per scan.

## 3. Core System Functional Capabilities
* **JSON-Driven Dynamic Forms**: Avoid hardcoding game metrics into React components. Build a TypeScript engine that reads a single `game-schema.json` file from the Node.js backend to programmatically generate form fields for Autonomous, Teleop, and Endgame.
* **Strict Three-Phase Lifecycle**:
    * **Pre-Match**: Capture Scout Name, Match ID, Team Number, and initial field starting coordinates via the canvas map.
    * **Active Match**: Real-time counter increments for cycles/game pieces, automated event timestamps, and automated state transitions.
    * **Post-Match**: Subjective qualitative metrics (Driver Skill, Defense Breakdown) and open-ended text input.
* **The Blue Alliance (TBA) Sync Engine**: Build a Node.js cron/webhook system to fetch event schedules, rankings, and match results. Cache this data in Firestore so client devices can pre-download the event configuration before going offline.

## 4. Advanced Data Analysis & Strategy Capabilities
* **Client-Side Edge Analytics**: Write client-side TypeScript utility functions to calculate True Shooting Percentages, average cycle times, and climb success rates directly on the master strategist's tablet.
* **Predictive Match Simulator**: Create a lightweight forecasting engine that calculates Component OPR (Offensive Power Rating) and simulated match outcome distributions using historical scouted data.
* **Interactive Drag-and-Drop Picklist Builder**: Develop a dedicated dashboard using `@hello-pangea/dnd` (or a similar lightweight React library) allowing strategy leads to rank teams, filter by capabilities, and weight specific performance metrics dynamically during alliance selection strategy sessions.
