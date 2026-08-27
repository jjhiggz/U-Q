# Prefer Derived Domain State

When a domain fact can be reliably derived from existing relationships or timestamps, UQ should derive it instead of storing a separate explicit field. This keeps queue and submission state harder to drift, even when an explicit column would make some reads look simpler.

**Consequences**

Avoid columns such as `Submission.status` or `Submission.submission_type` until they represent information that cannot be derived from `archived_at` or the parent queue's type.
