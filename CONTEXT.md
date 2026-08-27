# UQ

UQ helps people host song-review queues and lets submitters quickly send songs with reusable identity and social details.

## Language

**LiveQueue**:
A hosted submission space owned by a user where other users can send items for consideration. A user may own multiple queues.
In UI copy, call this a "queue" unless the distinction from a backend queue data structure matters.
_Avoid_: Room, channel, playlist, generic Queue entity

**Queue Name**:
An owner-facing label used to distinguish a user's LiveQueues from each other.
_Avoid_: Queue slug, public title

**Queue Owner**:
The user who created and manages a LiveQueue.
_Avoid_: Admin, GM, moderator

**Handle**:
A user's unique public identifier used in queue URLs.
_Avoid_: Username, slug, display name

**Active Queue**:
The one LiveQueue a queue owner is currently running for public visitors and submissions.
_Avoid_: Current room, live playlist, selected queue

**Queue Type**:
The kind of activity a LiveQueue supports, such as music submissions, debate prompts, or audience subject voting.
_Avoid_: Category, mode, template

**Queue Visibility**:
The audience that may find or access a LiveQueue.
_Avoid_: Privacy, sharing mode

**Queue Configuration**:
The type-specific rules and defaults that determine how a LiveQueue behaves.
_Avoid_: Settings, options, preferences

**Guest Submission**:
A submission made without a durable user account when the queue allows low-friction public participation. Guests may have a technical session, but they do not need to sign up before interacting with a public active queue.
_Avoid_: Anonymous song, public post

**Claimed Submission**:
A guest submission that becomes associated with a durable user account after the guest signs up or logs in.
_Avoid_: Migrated submission, converted entry

**Submission**:
An item sent by a user into a LiveQueue for consideration.
_Avoid_: Entry, request, post

**Active Submission**:
A submission that has not been archived.
_Avoid_: Pending submission, live entry

**Submission Limit**:
A queue rule that controls how many active submissions a submitter may have in that queue.
_Avoid_: Rate limit, duplicate rule

**Guest Submission Limit**:
The platform rule that guests may have only one active submission in a queue.
_Avoid_: Guest rate limit, anonymous quota

**Banana Boost**:
A spendable queue mechanic that authenticated users can apply to increase a submission's chance or priority within a queue. Unused banana boosts may be returned to a user's account when a queue stops accepting or using boosts.
_Avoid_: Music boost, generic boost, sticker data

**Granted Banana Boost**:
A queue-owner-awarded boost that increases a submission's chance or priority within that queue without creating a paid banana owned by the submitter.
_Avoid_: Free paid banana, comped balance

**Submission Points**:
A configurable queue mechanic that represents a submission's accumulated priority over time or through owner adjustment.
_Avoid_: Music points, score

**Submission Data**:
The queue-type-specific content attached to a submission.
_Avoid_: Payload, details, extra fields

**Submitter Profile**:
A user's optional reusable identity and social details used to prefill submissions across queues. Submitted values are copied into submissions rather than linked back to the profile.
_Avoid_: Account, socials, defaults
