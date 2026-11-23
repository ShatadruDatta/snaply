# Snaply Implementation Plan

## Product overview

Snaply is a mobile-first social app for sharing and following photo and video posts. The first release targets a small beta on iOS and Android.

### V1 goals

- Make it easy to sign in, set up a profile, and start following people.
- Make creating and viewing posts from followed users the core experience.
- Support basic social interactions and one-to-one direct messages.
- Provide a clean, minimal interface that adapts to the device's light or dark appearance.

### V1 scope

- Sign up and sign in with Google or Apple using Clerk.
- Require a unique handle and display name during first-time onboarding.
- Show four main tabs: Home, Messages, Explore, and Profile.
- Create one-image or one-video posts with an optional caption. Videos are limited to 60 seconds and 100 MB.
- Browse a chronological feed of posts from followed users.
- Search users and browse recent public posts in Explore.
- Follow and unfollow users; like posts; create and delete one's own comments; delete one's own posts.
- View and edit a profile: display name, handle, bio, and avatar.
- Start one-to-one text conversations with any signed-in user. Show incoming changes live.
- Block accounts and report accounts or posts.
- Delete one's account and app data.
- Send push notifications for new direct messages; keep other social activity in-app.

### Explicit v1 exclusions

- Private profiles and follow requests.
- Multi-item carousels and text-only posts.
- Media attachments in messages, read receipts, and typing indicators.
- Ranked feeds, creator recommendations, and curated discovery.
- Push notifications for likes, comments, and follows.
- Web as a launch target.

## Technology and architecture

- **Mobile app:** Existing Expo project using Expo SDK 58, React Native 0.88, and Expo Router. Use Expo Router native tabs for the four main sections and stack routes for details and compose flows.
- **Styling:** NativeWind, with a light default and system-driven dark mode. Before implementation, verify a NativeWind release supports this repo's Expo SDK and React Native versions. Keep NativeWind as the chosen styling approach; do not silently substitute another styling system.
- **Authentication:** Clerk owns authentication and identity. Use custom native-styled Google and Apple sign-in buttons with Clerk OAuth and browser-based redirect flow. Configure app identifiers, redirect URLs, and provider credentials for development and beta builds.
- **Backend:** Convex owns app profiles, posts, follow relationships, likes, comments, conversations, messages, blocks, reports, and notification device tokens. Convex queries provide reactive updates for feeds and conversations; mutations enforce authorization and invariants.
- **Media:** Use Convex file storage for avatars and post media. Upload media directly from the client using generated upload URLs, then store the Convex storage ID in the relevant profile or post record. Enforce the 60-second and 100-MB video caps in the client and backend metadata validation. Media URLs are public bearer URLs: anyone with a URL can view the media until it is deleted.
- **Push:** Use Expo push notifications for new direct messages, with device token registration and cleanup. Request permission when the user first reaches messaging; messaging remains usable in-app if permission is declined.
- **Environments:** Maintain separate development and production Convex deployments and Clerk instances/keys. Beta builds use production-like OAuth redirects and push credentials without mixing development secrets into the app bundle.

## Data model and rules

Use Convex document IDs as references. Every application record that belongs to a user should resolve to a Clerk user ID through the profile record or an explicit author ID. All mutations must derive the caller from the verified Convex auth context; never trust a client-supplied author ID.

### Profiles

- `clerkUserId`: required, unique identity key.
- `handle`: required, unique, normalized lowercase handle.
- `displayName`: required.
- `bio`: optional.
- `avatarStorageId`: optional Convex storage ID.
- Creation and update timestamps.

### Posts

- `authorId`: required profile reference.
- `mediaStorageId`: required Convex storage ID.
- `mediaType`: image or video.
- `caption`: optional.
- Creation timestamp.
- Validate ownership on delete; delete associated media when the post is deleted. Feed and Explore queries must be paginated and ordered newest first.

### Follows

- `followerId`, `followeeId`, creation timestamp.
- A user cannot follow themselves. Enforce one relationship per ordered pair. Follow and unfollow apply immediately.

### Likes

- `userId`, `postId`, creation timestamp.
- Enforce one like per user and post. Like/unlike operations are idempotent from the UI's perspective.

### Comments

- `authorId`, `postId`, text, creation timestamp.
- Only the author can delete a comment. Only the post author can delete their post; deleting a post also removes its comments and likes.

### Conversations and messages

- A conversation represents exactly two distinct profile participants. Enforce a single conversation per unordered participant pair.
- A message has `conversationId`, `senderId`, text, and creation timestamp. Only a participant may read or write in a conversation; sender identity comes from auth context.
- Deleting an account deletes its message records, so those messages disappear for both participants. Empty conversations may be removed during account cleanup.

### Blocks

- Store `blockerId`, `blockedId`, and creation timestamp; disallow self-blocking and duplicate block pairs.
- A block is mutual for app visibility and contact: hide each profile and its posts from the other, prevent follows in either direction, and prevent direct messages in either direction. Existing follow relationships between the users should be removed.

### Reports

- Store target type (account or post), target reference, reason/details, creation timestamp, and a reporter reference that can be anonymized on account deletion.
- Reports are available to admins for review through Convex's dashboard or an equivalent minimal internal workflow. No in-app admin console is required for v1.
- Keep reports after reporter deletion, anonymizing the reporter link. Do not retain deleted target content solely to support a report; retain the report's submitted metadata.

### Push tokens

- Associate Expo push token with the signed-in profile and platform. Support token refresh and removal on sign-out/account deletion. Push delivery failures must not prevent message persistence.

### Account deletion

- Provide an explicit confirmation step.
- Remove the Clerk account and all app-owned profile, posts, comments, likes, follows, blocks, push tokens, and uploaded media. Remove the user's messages from shared conversation history. Preserve submitted reports in anonymized form.
- Make cleanup safe to retry and surface a recoverable error if the Clerk identity or Convex cleanup step fails. Document any residual cleanup requiring admin action.

### Authorization and visibility

- All profiles and posts are visible to signed-in users, subject to block rules. The app itself requires sign-in to access social data.
- Convex functions validate authentication, ownership, participant membership, block status, and input constraints for every write and protected read.
- Public Convex media URLs can be opened outside the app by anyone who has the URL. Deleting the file revokes its URL.

## Navigation and primary journeys

### Signed-out journey

1. Show a branded welcome/sign-in screen with Google and Apple actions.
2. Complete Clerk OAuth and return through the app's configured redirect.
3. Route new users to profile setup; route returning users to the tab navigator.

### First-time setup

1. Collect a unique handle and display name.
2. Validate handle availability and format before saving.
3. Create the Convex profile linked to the verified Clerk identity.
4. Enter Home with a useful empty state and a route to Explore.

### Home and posting

1. Show a paginated, chronological feed of followed users' posts.
2. Each post supports profile navigation, like/unlike, comments, and owner-only deletion.
3. Provide a compose action that selects one image or video, previews it, accepts an optional caption, and reports upload progress/errors.
4. Empty feed state points to Explore; refresh and pagination remain responsive on mobile.

### Explore and profiles

1. Search profiles by handle/display name and browse recent public posts.
2. Open a profile, view profile details and post grid, then follow/unfollow or start a DM.
3. The current user's Profile tab provides edit controls for name, handle, bio, and avatar, plus account settings and deletion.

### Messages

1. Show the user's conversation list, ordered by latest message.
2. Start or open a conversation from a profile or existing conversation list.
3. Display messages in real time and allow text sending with a clear pending/error state.
4. Blocked pairs cannot open or send messages; push is requested in context and is optional.

## Implementation phases

### Phase 1: Foundation and compatibility

- Verify Expo SDK 58 guidance for Router native tabs, authentication integration, and required Expo modules before using their APIs.
- Verify NativeWind compatibility with Expo 58 / React Native 0.88; select a compatible stable version and document the resolution.
- Add NativeWind configuration and system color scheme behavior; organize non-route components outside `src/app/`.
- Configure environment variable examples, app identifiers, and development/beta environment separation. Never commit real credentials.

**Exit criteria:** App starts on iOS and Android; native tab shell renders; NativeWind light/dark styles work; configuration has no committed secrets.

### Phase 2: Authentication and profile onboarding

- Integrate Clerk Expo and Convex authentication using the documented provider bridge.
- Add custom Google and Apple sign-in flows and auth/loading/error states.
- Configure Clerk OAuth providers, native app identifiers, and redirect allowlists.
- Add profile creation, unique handle validation, sign-out, and account/session routing.

**Exit criteria:** New and returning users can authenticate on both platforms; a new user cannot enter the social app before completing the required profile; Convex rejects unauthenticated writes.

### Phase 3: Navigation, profiles, and discovery

- Implement the four native tabs and stack destinations for user profiles, post detail/comments, compose, settings, and conversations.
- Add profile view/edit, avatar upload, follow/unfollow, user search, and recent-post Explore.
- Add empty, loading, error, and retry states.

**Exit criteria:** Profiles and search work; handle uniqueness and self-follow prevention are enforced by Convex; block rules are applied to profile/search visibility.

### Phase 4: Media posts and Home feed

- Implement image/video selection, preview, upload progress, caption entry, and post creation.
- Validate image type and video duration/size on the client and again in backend metadata checks where possible.
- Implement paginated following feed, post deletion with storage cleanup, and owner-only permissions.
- Optimize images for mobile display and avoid loading unneeded media in off-screen feed cells.

**Exit criteria:** A user can publish, view, and delete an image/video post; the following feed is chronological and paginated; invalid or oversized video is rejected with a clear explanation.

### Phase 5: Likes and comments

- Implement idempotent like/unlike, comment creation, and author-only comment deletion.
- Keep counts and visible state consistent with Convex's reactive updates.

**Exit criteria:** Duplicate likes are prevented; users can only delete their own comments; deleting a post removes its comments and likes.

### Phase 6: Direct messages and push

- Implement one-to-one conversation creation, conversation list, live message thread, text send, and retry/error feedback.
- Enforce one conversation per participant pair and participant-only access.
- Add Expo push token registration and DM notification delivery; request permission after the user reaches messaging.

**Exit criteria:** Both participants see new messages live; duplicate conversations are not created; message storage succeeds even if push delivery fails; declined push permission leaves in-app messaging working.

### Phase 7: Blocking, reporting, and account deletion

- Add block/unblock actions and enforce mutual visibility/follow/message restrictions in every relevant query and mutation.
- Add report actions for profiles and posts and persist reports for admin review.
- Add account deletion confirmation and retryable cleanup across Clerk, Convex records, messages, and media; anonymize reporter references while retaining reports.

**Exit criteria:** A blocked pair cannot discover, follow, or message one another; reports are reviewable; account deletion removes app data and uploaded media while retaining anonymized report metadata.

### Phase 8: Beta readiness

- Add/complete automated tests for authorization and core mutations, plus UI coverage for the critical user journeys.
- Verify iOS and Android behavior, system dark mode, poor-network/error states, upload limits, and OAuth redirects in development builds.
- Run lint, TypeScript checks, and Expo Doctor; fix issues before beta builds.
- Configure internal beta distribution and document environment setup, test accounts, and known limitations.

**Exit criteria:** Critical flows pass on iOS and Android; automated tests, lint, TypeScript, and Expo Doctor pass; beta builds can authenticate against the intended Clerk and Convex environments.

## Testing and acceptance checklist

### Automated backend tests

- Profile creation, handle uniqueness/normalization, profile edits, and ownership validation.
- Authentication and authorization for each Convex query/mutation.
- Follow pair uniqueness, self-follow rejection, block side effects, and blocked-user restrictions.
- Like idempotency, comment ownership, post deletion cascade, and media cleanup.
- Conversation pair uniqueness, participant-only reads/writes, message deletion, and retry-safe account cleanup.
- Report persistence and reporter anonymization.
- Video duration/size validation and push failure isolation.

### Mobile flow checks

- Google and Apple sign-in, redirect return, first-time setup, returning session, and sign-out on iOS and Android.
- Empty and populated Home/Explore/Profile/Messages states.
- Post upload progress, upload failure/retry, unsupported media, 60-second boundary, and 100-MB boundary.
- Feed pagination/refresh, like toggling, comment creation/deletion, follow/unfollow, and profile edits.
- Real-time message updates, offline send failure/retry, permission granted/declined, and blocked conversation handling.
- Report submission, account deletion confirmation, and system-driven light/dark appearance.

### Project checks

- `npx expo lint`
- `npx tsc --noEmit`
- `npx expo-doctor`
- Manual iOS and Android development-build checks for Clerk OAuth and push notifications.

## Risks and operational notes

- **NativeWind compatibility:** Current project versions are Expo SDK 58 and React Native 0.88. Confirm the selected NativeWind version supports them before setup; preserve NativeWind as a requirement and resolve compatibility without silently changing the styling choice.
- **Convex media cost/access:** Storage and egress are metered. Public bearer URLs are shareable and remain accessible until file deletion. Review beta usage and storage/egress costs before broad launch.
- **Video playback:** Convex stores and serves files but does not supply a complete video transcoding/streaming pipeline. Verify practical playback and upload behavior on both platforms with representative 100-MB files; if quality or cost is unacceptable, revisit the media service before adding a replacement.
- **OAuth setup:** Google/Apple provider credentials, bundle identifiers/package name, redirects, and Clerk Native API configuration are dashboard prerequisites.
- **Push setup:** Expo push credentials and device testing are required; push is best-effort and must not be treated as message delivery confirmation.
- **Moderation operations:** V1 includes report capture and admin review through Convex dashboard or a minimal internal workflow, but no full moderation console or automated moderation.
- **Offline behavior:** Convex-backed reads may be available from client cache, but v1 does not promise durable offline storage or queued writes. All writes require connectivity.
