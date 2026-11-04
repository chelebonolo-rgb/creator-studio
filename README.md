# Creator Studio

A full-stack content management and viewer engagement application built to match the practical assessment criteria. The public portal is a React app; the Express API persists creators, content, viewers, likes, and comments in MongoDB.

## What is included

- **Viewer portal:** creator introduction, featured and published content, keyword search, category filters, content detail pages, view tracking, share/copy links, likes, reactions, comments, newsletter signup, viewer accounts, and bookmarks.
- **Creator dashboard:** JWT-protected login, overview and per-content analytics, content creation/edit/delete, draft/published/scheduled status, comment moderation, interaction notifications, and a publication calendar.
- **Backend:** Express REST API, MongoDB/Mongoose validation, password hashing, JWT authentication, Helmet, rate limiting, CORS allow-list, and centralized error responses.
- **Deployment:** Vercel SPA configuration and a Render Blueprint for the API.

## Requirements

- Node.js 20+
- MongoDB Atlas database (or local MongoDB for development)
- An initial creator account, created with the seed script below

## Run locally

1. Create a MongoDB Atlas cluster and database user. In Atlas Network Access, allow your development IP address. Copy the application connection string.
2. In `server`, copy `.env.example` to `.env`. Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, and creator seed values. Use a long, random JWT secret.
3. In `client`, copy `.env.example` to `.env` if you need a non-default API URL. For local work, the default is `http://localhost:5000/api`.
4. From this folder, install and seed:

   ```sh
   npm install
   npm install --prefix server
   npm install --prefix client
   npm run seed:creator --prefix server
   npm run seed:sample-content --prefix server
   npm run dev
   ```

5. Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The creator login is available at `/creator/login`.

The creator seed command creates an account only if the email does not already exist. The sample-content seed publishes example stories for that creator; it skips titles that already exist and can be safely rerun. Both commands use the values in `server/.env`. The creator seed never prints the password. Choose your own seed email/password; do not commit `.env` files.

## API overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public, rate limited | Creator login |
| GET | `/api/auth/me` | Creator | Current creator profile |
| GET | `/api/contents` | Public | Published content; supports `q` and `category` |
| GET | `/api/contents/:id` | Public | Published content details and view increment |
| GET | `/api/contents/manage` | Creator | All creator content |
| POST | `/api/contents` | Creator | Add content |
| PUT | `/api/contents/:id` | Creator | Update content |
| DELETE | `/api/contents/:id` | Creator | Delete content and related engagement |
| POST | `/api/comments` | Public, rate limited | Submit a comment for moderation |
| GET | `/api/comments/:contentId` | Public | Approved comments |
| GET | `/api/comments/manage` | Creator | All comments for moderation |
| PATCH | `/api/comments/:id` | Creator | Approve or hide a comment |
| DELETE | `/api/comments/:id` | Creator | Delete a comment |
| POST | `/api/likes` | Public | Like content once per browser viewer ID |
| GET | `/api/reactions/:contentId` | Public | Get reaction totals and the current browser viewer's reaction |
| POST | `/api/reactions` | Public | Add, change, or remove a browser viewer's emoji reaction |
| GET | `/api/dashboard/stats` | Creator | Content and comment totals |
| GET | `/api/dashboard/analytics` | Creator | Per-content views, likes, and comment counts |
| GET | `/api/calendar?month=YYYY-MM` | Creator | Scheduled and published content for a month |
| GET | `/api/notifications` | Creator | Creator interaction notification inbox |
| POST | `/api/viewer-auth/register` | Public | Create a viewer account |
| POST | `/api/viewer-auth/login` | Public | Sign in as a viewer |
| GET | `/api/bookmarks` | Viewer | List saved stories |
| POST/DELETE | `/api/bookmarks/:contentId` | Viewer | Save/remove a story |
| POST | `/api/newsletter/subscribe` | Public, rate limited | Subscribe to publication updates |
| POST | `/api/uploads` | Creator | Upload media to Cloudinary |

Scheduled items become published when their scheduled time arrives. Public content APIs never return drafts or future scheduled content. Viewer comments are pending until approved.

## Deploy

### Backend (Render)

1. Push this project to GitHub.
2. Create a Render Blueprint using `render.yaml` (or create a Node web service with root directory `server`, build command `npm install`, start command `npm start`).
3. Set `MONGODB_URI`, a strong `JWT_SECRET`, and `CLIENT_ORIGIN` to the deployed frontend origin. Set `CREATOR_NAME`, `CREATOR_EMAIL`, and `CREATOR_PASSWORD` as Render environment variables.
4. For creator alerts and subscriber updates, configure a Resend API key as `RESEND_API_KEY` and a verified sender as `EMAIL_FROM`. Set `PUBLIC_SITE_URL` to the deployed frontend URL.
5. For media uploads, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
6. Once deployed, seed the creator from a trusted local machine using the same API environment configuration:

   ```sh
   npm run seed:creator --prefix server
   ```

   Do not expose the database URI or creator password in the browser or source control.

### Frontend (Vercel)

1. Import the GitHub repository into Vercel and set the project root to `client`.
2. Set `VITE_API_URL` to `https://YOUR-RENDER-SERVICE.onrender.com/api`.
3. Optionally set `VITE_CREATOR_NAME` and `VITE_CREATOR_INTRO` to personalize the public home page. These are public display values, not secrets.
4. Deploy. The included `client/vercel.json` rewrites SPA routes to `index.html`.
5. Update Render's `CLIENT_ORIGIN` to the exact Vercel production URL and redeploy/restart the API.

Test the public home page, search/filter, content detail/like/comment, creator login, content management, and comment moderation after deployment. Use HTTPS frontend and backend URLs in production.

## Data collections

- `users`: creator profile, normalized unique email, bcrypt password hash.
- `contents`: creator-owned content, category/type, media links, status, schedule/publication dates, view/like counters.
- `comments`: viewer display name/message and pending/approved/hidden moderation status.
- `viewers`: anonymous browser viewer key, optional display name, and optional registered account credentials.
- `likes`: one unique like per content/viewer pair.
- `bookmarks`: one saved-content record per registered viewer/content pair.
- `notifications`: creator interaction and publication alerts.
- `subscribers`: email addresses opted in to publication updates.

## Notes

- Images and media can be referenced by URL or uploaded to Cloudinary after its credentials are configured.
- Public comment submission uses a display name and is intentionally moderated before appearing. Readers can also choose one emoji reaction per story and change or remove their choice later.
- The application has no hard-coded creator credentials, database URI, or JWT secret.
