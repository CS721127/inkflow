# Security policy

## Supported versions

Security fixes are intended for the latest release of InkFlow. Older reconstructed development snapshots are provided as history and are not maintained.

## Reporting a vulnerability

Please **do not disclose an exploitable vulnerability in a public issue**. If the GitHub repository has Private Vulnerability Reporting enabled, use **Security → Report a vulnerability**. Otherwise contact the repository maintainer privately through their published contact method before opening a public report.

Describe impact, affected version, reproduction steps and any relevant browser/device details. Do not include real users' document content in reports.

## Security model

InkFlow is client-side and intentionally does not send text to a backend. It imports user-selected local files and renders Markdown/MathJax inside a browser origin. Dependencies may be installed or served locally; keep npm dependencies updated, preserve third-party notices and avoid adding dynamic remote code or document-upload APIs without an explicit feature review.
