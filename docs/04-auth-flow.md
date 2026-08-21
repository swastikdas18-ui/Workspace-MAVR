# 04 — Authentication Flow & Better Auth Specification

## Endpoints
1. `POST /auth/register` (or `/api/auth/register`)
   - Payload: `{ name, email, password, workspaceName }`
   - Behavior:
     - Validates payload with Zod.
     - Hashes password using bcrypt.
     - Creates User with `role: 'admin'`.
     - Creates Workspace with `ownerId: user.id`.
     - Creates `workspace_members` record with `role: 'admin'`.
     - Generates cryptographically secure session token.
     - Sets HTTP-only session cookie / returns session bearer token.
     - Returns `{ user, workspace, session }` (excluding password hash).

2. `POST /auth/login` (or `/api/auth/login`)
   - Payload: `{ email, password }`
   - Behavior:
     - Validates credentials against bcrypt hash in database.
     - Resolves user's active workspace membership and server-authoritative role.
     - Creates new session.
     - Returns `{ user, workspace, session }`.

3. `POST /auth/logout` (or `/api/auth/logout`)
   - Invalids current session token in database.
   - Clears session cookies.

4. `GET /auth/session` (or `/api/auth/session`)
   - Extracts session token from `Authorization: Bearer <token>` or cookies.
   - Verifies session expiration.
   - Loads fresh User record from database (ignoring any client spoofed headers).
   - Loads active Workspace.
   - Returns `{ user, workspace, session }`.

## Security Rules
- Client-provided `role` field in registration/login is strictly ignored.
- Ordinary registration can never assign `admin` unless creating a new root organization workspace.
- User ID is derived exclusively from the verified session token.
