# Use Generic Submissions With Type-Specific Data

UQ stores shared queue participation facts in `Submission` and attaches queue-type-specific content through separate data tables such as `MusicSubmissionData`. This preserves common ownership, archive, point, and banana boost behavior without forcing every queue type into a single overloaded submission schema.

**Consequences**

Queue type is derived from the parent queue, and each queue type is responsible for creating the matching submission data row.
