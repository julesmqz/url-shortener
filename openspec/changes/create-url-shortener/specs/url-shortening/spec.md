## Purpose

Provides URL shortening, safe HTTP redirection, click analytics tracking, and dashboard management for links.

## ADDED Requirements

### Requirement: Short link generation
The system SHALL generate a unique short code for a valid submitted long URL and persist the link record with an initial click count of zero. The system MUST generate codes using nanoid and attempt up to 3 retries in the event of an existing code collision before reporting an error.

#### Scenario: Successful link creation
- **WHEN** user submits a valid long URL "https://example.com/very/long/path" via the link creation form
- **THEN** system generates a unique alphanumeric short code, stores the mapping in Cloudflare D1 with click count initialized to 0, and redisplays the dashboard showing the newly created link

#### Scenario: Code collision retry
- **WHEN** generated short code already exists in the database
- **THEN** system retries generation with a new short code up to 3 times before failing

### Requirement: URL validation and error display
The system SHALL validate submitted URLs on the server and MUST reject empty inputs, malformed URLs, or URLs with unsupported protocols (protocols other than http: and https:). When validation fails, the system SHALL render a user-friendly error message in the UI without creating a database record.

#### Scenario: Invalid URL protocol or format
- **WHEN** user submits an invalid URL string such as "javascript:alert(1)" or "not-a-valid-url"
- **THEN** system rejects the submission, does not persist any record, and renders the dashboard with a prominent error alert explaining that only valid HTTP/HTTPS URLs are accepted

#### Scenario: Empty URL submission
- **WHEN** user submits an empty or whitespace-only URL input
- **THEN** system rejects the request and displays a validation error indicating the URL is required

### Requirement: Redirection and click counting
The system SHALL redirect incoming requests for an existing short code to its original destination URL using an HTTP 302 (Found) redirect status, and SHALL atomically increment the click counter for that short code.

#### Scenario: Successful redirection and click increment
- **WHEN** user or client visits "/abc123" where "abc123" maps to "https://example.com" with current clicks = 5
- **THEN** system increments the link's click count to 6 in D1 and returns an HTTP 302 response with Location set to "https://example.com"

### Requirement: Unknown short code 404 response
The system SHALL return an HTTP 404 Not Found status code and serve a clean plain HTML 404 page when a requested short code does not exist in the database.

#### Scenario: Visiting non-existent short code
- **WHEN** client requests "/unknownCode99" and no such link exists in the database
- **THEN** system returns HTTP status 404 with a plain HTML error page indicating the short link was not found and offering a link back to the homepage

### Requirement: Link listing and dashboard
The system SHALL render an HTML dashboard at the root URL ("/") containing the link creation form and a list of all existing shortened links displaying their original URL, short code, and total click count.

#### Scenario: Viewing dashboard with existing links
- **WHEN** user navigates to "/"
- **THEN** system retrieves all shortened links from D1 ordered by creation date descending, rendering them in a table along with the input form for creating new links
