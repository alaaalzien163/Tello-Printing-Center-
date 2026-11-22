# Production E2E data cleanup — dry run

Status: **BLOCKED on owner review and approval.** Nothing in this document has
been executed.

## Known state (22 November 2026 audit)

| Item | Value |
|---|---:|
| Total `print_requests` | 11 |
| Requests with `customer_name LIKE 'E2E%'` | 6 |
| `print_request_files` rows | 5 |
| Objects under `print-request-files/requests/` | 4 |
| Private bucket | `print-request-files` (`public = false`) |

The one-row difference between file metadata and stored objects is consistent
with an incomplete/pending upload. The dry-run manifest below distinguishes
metadata from objects, so the owner can decide whether an orphan object exists.

Do **not** delete anything until every step in "Approval and execution" is
complete.

## Non-sensitive identifiers

Collect the manifest with the read-only queries in
`docs/production-readiness/rls-diagnostics.sql`, section 8. The manifest selects:

- `request_number`
- request UUID
- status, timestamps
- file UUID, storage path, upload status, declared size

It deliberately does **not** select customer name, phone, request details,
admin notes, signed URLs, or file contents.

```sql
select r.request_number,
       r.id as request_id,
       r.status,
       r.created_at,
       r.file_count,
       r.total_bytes,
       f.id as file_id,
       f.storage_path,
       f.upload_status,
       f.size_bytes
from public.print_requests r
left join public.print_request_files f on f.request_id = r.id
where r.customer_name like 'E2E%'
order by r.created_at, r.request_number, f.id;
```

## Dry-run checks

Run all of these before asking for approval:

1. **Confirm the records are test data.** Review the request numbers and
   creation times in the manifest. Do not open customer details unless needed.
2. **Confirm foreign-key behavior.** Run the foreign-key query in
   `rls-diagnostics.sql` section 6. Expected: `print_request_files.request_id`
   references `print_requests(id)` with `ON DELETE CASCADE`. If cascade is
   absent, file metadata must be deleted explicitly.
3. **Confirm object ownership.** Map every manifest `storage_path` to a
   `storage.objects` row. The mapping query in section 8 does this. If a path
   has no object, record it as metadata-only; if an object has no metadata row,
   record it as a possible orphan and investigate before deletion.
4. **Confirm no non-E2E rows share a request.** The six rows were created by
   E2E tests; request numbers and timestamps should cluster with test runs.
5. **Snapshot the counts.** Record total requests, total file rows, and total
   objects under `print-request-files` immediately before cleanup.
6. **Check the rate-limit ledger.** E2E submissions also consumed entries in
   `private.print_request_rate_limits`. Deleting requests does not reset that
   ledger. Leave it alone unless the owner explicitly approves a scoped purge;
   the ledger contains no customer data, only HMAC hashes.

## Proposed cleanup sequence (not executed)

1. Export the manifest and the matching object list as JSON/CSV.
2. Confirm the latest database backup is restorable (see
   `FINAL-PREDEPLOY-CHECKLIST.md`, backup section).
3. Export the six request rows and their file metadata to an approved location.
4. Delete the associated Storage objects from `print-request-files` only.
   Verify the object count decreases by the approved number.
5. Delete the six `print_requests` rows. If cascade is confirmed, related
   `print_request_files` rows disappear automatically. If not, delete the file
   rows first.
6. Verify:
   - zero rows with `customer_name LIKE 'E2E%'`;
   - no orphan `print_request_files` rows;
   - no unexpected remaining objects under the deleted request prefixes;
   - the public request form still creates a request in Staging (not
     Production) on the next test run.
7. Record the approver, timestamp, row counts, object counts, and export
   location in the deployment log.

## Approval and execution

The owner must provide, in writing:

- approval to delete the six identified Production records;
- approval to delete their Storage objects;
- the export destination and retention period;
- confirmation that no customer-reported issue references those request
  numbers.

Do not delete the records in this run. Do not delete any Production Storage
object. Do not reset the rate-limit ledger.
