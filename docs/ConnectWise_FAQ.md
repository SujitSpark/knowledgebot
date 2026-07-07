# ConnectWise ScreenConnect Security & FAQ Guide

## Q: What is ConnectWise ScreenConnect?
ConnectWise ScreenConnect (formerly ConnectWise Control) is a remote support and unattended access software. It allows technicians to connect to and control remote devices, manage computers in the background using Backstage mode, and run support sessions.

## Q: What ports are required for ScreenConnect to function?
By default, ScreenConnect uses ports 8040 and 8041. Port 8040 is used for HTTP/HTTPS web interface access, and port 8041 is used for the TCP session relay traffic. Administrators must ensure these ports are open on their network firewall.

## Q: What encryption standards are used to secure remote sessions?
All remote session data in transit is encrypted using AES-256 (Advanced Encryption Standard with a 256-bit key) and standard SSL/TLS protocols. This ensures that commands, screen updates, and file transfers are fully encrypted between the host and guest clients.

## Q: How do I configure Multi-Factor Authentication (MFA) in ScreenConnect?
MFA is highly recommended for all ScreenConnect accounts, particularly administrators. It can be enabled in the Admin Console under the "Security" section. Once enabled, users scan a QR code using an authenticator app (such as Google Authenticator, Microsoft Authenticator, or Duo) to get one-time passcodes for subsequent logins.

## Q: Can I restrict host console access by IP address?
Yes. Administrators can set up IP address restrictions (allowlisting) by configuring security rules in the Admin Portal or the server's web.config file (for on-premises installations). This blocks host portal access from any IP address not explicitly defined in the allowed ranges.

## Q: What is Backstage mode in ScreenConnect?
Backstage mode is an unattended access session type that allows technicians to open a command prompt, PowerShell, registry editor, and file transfer tool in a background session. This lets technicians troubleshoot endpoints without taking control of the user's visible screen or interrupting their active work.

## Q: How does auditing work in ScreenConnect?
ScreenConnect automatically logs session events under the "Audit" page in the Admin Console. It tracks session connection times, technician names, commands executed, and files transferred. For compliance, administrators can also enable automatic video recording of all remote support sessions.

## Q: What is the ConnectWise Trust Center?
The ConnectWise Trust Center (connectwise.com/company/trust-center) is the central resource for security advisories, vulnerability disclosures, compliance documentation (like SOC 2 reports), and security patches. Users should regularly monitor the Trust Center to keep their software secure.
