# FRC Scouting App for Team 3464 "Sim-City"
## _Mass data collection_

[![N|Solid](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpCOfbpv0-ShoWwaPwG9dHOmSqrFWk7k0Gew&s)](https://firebase.google.com)

[![N|Solid](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRh8JZks1aFfBKkmV13P9BvqCtC-DhY1u5_Nw&s)](https://react.dev)

[![Deploy to Vercel](https://binbashbanana.github.io/deploy-buttons/buttons/remade/vercel.svg)](https://vercel.com)

Built for the First Robotics Competition REBUILT 2026

> [!CAUTION]
> You must create your own firebase database if you are not part of Sim-City

## Features

- Questionnaire detailing all the data about another team
- Offline storage, for the terrible connection found at competitions
- Linked to usernames (less false data)
- Firebase Authentication email/password accounts

## Installation

Clone the repository and install dependencies. This project requires Node.js
22.x.

```
git clone https://github.com/FRC-Team-3464/sim-scouting
cd sim-scouting
npm install
npm --prefix frontend install
```

Start the backend and frontend in separate terminals:

```bash
npm run dev
npm --prefix frontend run dev
```

To build the frontend:

```
npm --prefix frontend run build
```

The backend requires `.env.development`, and the frontend requires
`frontend/.env.development`. Start with the corresponding tracked `.example`
files. See `TECHNICAL_DOCUMENTATION.md` for the current variables and security
model; a complete new-contributor environment guide is planned after the
authentication proposal is finalized.

## Hosted staging and production architecture

The approved Vercel deployment uses one public origin:

```text
Web: https://sim-city-scouting.vercel.app
API: https://sim-city-scouting.vercel.app/api/*
```

The same repository is connected to two root-level Vercel projects. The
`sim-city-scouting` project deploys `main` to production, and
`sim-city-scouting-staging` deploys the `staging` branch to
`https://sim-city-scouting-staging.vercel.app`. Both projects use the root
`vercel.json`, which installs both dependency trees, builds `frontend/dist`,
and keeps React Router routes working. An explicit `/api/:path*` rewrite sends
API requests to the concrete `api/index.js` Express Function before the React
SPA fallback is applied. React uses the relative API base `/api`, so cookies
remain same-origin in both environments.

Hosted staging shares the existing development Firebase project but uses a
separate staging service-account key and CSRF secret. Production uses a
separate Firebase project and credentials. Follow
[`docs/platform/deployment/deployment-setup.md`](docs/platform/deployment/deployment-setup.md) to create both projects
without placing secrets in tracked files.

# Documentation
## Firebase
Working with the best free database:
- SERVER SIDE (`backend/app.js`, started locally by `backend/server.js`)
--
  - implementation of [node.js](https://nodejs.org/docs/latest/api/) and [express.js](https://expressjs.com/en/5x/api.html)
  - POST to "/write": writes authenticated scouting data with CSRF protection and server-derived scout identity
> [!WARNING]
> to write you must submit a JSON.
  - POST to "/read": reads documents for an authenticated user; submit a path
  - `/auth/*`: registration, login, logout, session, and CSRF routes
-

### Requests  
Every request on the server side has 2 properties: req (request), and res (response). by using app.use(express.json()), both of these properties will be jsons. [Request types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods).
The React application uses `frontend/src/api/client.ts` and communicates only
with Node. Password verification, Firebase tokens, session cookies, and
Firestore access are handled by the backend. See `TECHNICAL_DOCUMENTATION.md`
for the current API and security design.
## Components (frontend/src/components)

### AutoResizeTextArea 
```
Autoresizetextarea.tsx
```
- label: String that appears above the text area, labeling it.
- value: Value that the input is changing.
- onChange: Function that runs when the value is changed.
- placeholder: String that is shown when it is blank.

### BinaryChoice
```
BinaryChoice.tsx
```
- label: String that appears above the text area, labeling it.
- options: An array of strings that function as toggleable buttons.
- value: Value that the buttons are changing, the first button is selected if the value is __*true*__, and the second button is selected if it is __*false*__.
- onChange: Function that runs when the value is changed.


### CheckboxDropdown
```
CheckboxDropdown.tsx
```
- label: String that appears above the text area, labeling it.
- optionList: Array that contains all of the options as strings.
- optionCheck: __*Record<string, boolean### *__ that has the same key names as optionList, but also has boolean values attached to the keys.
- onChange: Function that runs when the value is changed.

> [!CAUTION]
> in Matchform.tsx this element is not used

### CounterInput
```
CounterInput.tsx
```
- value: Value that the input is changing.
- onChange: Function that runs when the value is changed.
- min: Minimum integer that the value can be.
- max: Maximum integer that the value can be.
- label: String that appears above the text area, labeling it.

### Dropdown
```
Drowdown.tsx
```
- value: Value that the input is changing.
- options: An array of strings that function as options inside of the dropdown.
- label: String that appears above the text area, labeling it.
- onChange: Function that runs when the value is changed.
- placeholder: String that is shown when it is blank.

### IntegerInput
```
IntegerInput.tsx
```
- value: Value that the input is changing.
- onChange: Function that runs when the value is changed.
- placeholder: String that is shown when it is blank.
- min: Minimum integer that the value can be.
- max: Maximum integer that the value can be.
- label: String that appears above the text area, labeling it.

### MultiCounterInput
```
MultiCounterInput.tsx
```
- value: Value that the input is changing.
- onChange: Function that runs when the value is changed.
- min: Minimum integer that the value can be.
- max: Maximum integer that the value can be.
- label: String that appears above the text area, labeling it.

## Scripts

### seed.tsx
- Retained debug-visible generator for synthetic match data. It has known inconsistencies and may be redesigned with the future purpose-specific data API.

## Other

### .env
- File that has values that are kept hidden from the public.
- Backend environment files hold Firebase Admin credentials, API configuration,
  session settings, and the CSRF secret.
- Frontend environment files contain browser-visible values and may use the
  `VITE_` prefix. Never place a secret in a `VITE_` variable.

### .gitignore
- Makes git ignore files, and not show them on the repository.
- Can contain specific paths, file names, or directory names.
- Can also have comments using "#", and negation using "!"
