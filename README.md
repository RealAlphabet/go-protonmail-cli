> **Disclaimer**
> This project is **not** an official ProtonMail client. It is an experimental CLI implementation that leverages the open-source Go Proton API ([github.com/ProtonMail/go-proton-api](https://github.com/ProtonMail/go-proton-api)).

> The ProtonMail Bridge codebase ([github.com/ProtonMail/proton-bridge](https://github.com/ProtonMail/proton-bridge)) is a paid alternative that provides a local IMAP proxy.

> The CAPTCHA workflow was reverse-engineered from Proton’s WebClient to support manual validation in this CLI.

## Background

1. **IMAP/SMTP Integration**  
   I wanted to connect ProtonMail to Outlook over standard IMAP/SMTP protocols.  
2. **End-to-End Encryption**  
   ProtonMail encrypts all messages client-side, preventing a simple IMAP/SMTP client from accessing plaintext.  
3. **ProtonMail Bridge**  
   The official Bridge exposes a local IMAP proxy but requires a paid subscription.  
4. **Go Proton API**  
   The Bridge uses the open-source Go library `go-proton-api`, which is available without license restrictions.  
5. **Lack of Documentation**  
   There is no formal documentation for exporting messages or contacts; a 2023 issue highlights this gap.  
6. **CLI Prototype**  
   I began a command-line tool to export emails and monitor incoming messages in real time.  
7. **CAPTCHA Handling**  
   CAPTCHA logic is borrowed from Proton’s WebClient (`window.postMessage`) and integrated as a manual step in this CLI.  
8. **Implementation**  
   After reviewing the Bridge and WebClient code, I implemented message export and PGP decryption.  
9. **Publication**  
   This repository captures the results of those experiments.

## ProtonMail CLI Client

A minimalist command-line client for ProtonMail that retrieves, decrypts, and watches your emails in real time. It fully reconstructs MIME messages for SMTP compatibility.

### Features

- OAuth-style authentication via the official Go API  
- Manual CAPTCHA validation through a web browser  
- Two-factor authentication support (2FA/TOTP)  
- Load credentials from a JSON configuration file  
- Retrieve and decrypt ProtonMail messages locally  
- Real-time monitoring of incoming messages  
- Complete MIME reconstruction (headers, body, attachments)

### Project Structure

```
.
├── bin/
│   ├── config.json.example   # Sample configuration file
│   └── cookies.json          # Persistent cookie jar (generated)
├── cmd/
│   └── protonmail/           # Application entry point
│       └── main.go
├── internal/
│   ├── client/               # ProtonMail API wrapper
│   │   └── proton\_client.go
│   ├── config/               # Configuration and constants
│   │   ├── config.go
│   │   └── constants.go
└── build.sh                  # Build script
```

### Configuration

1. Copy the example configuration:

```bash
cp bin/config.json.example bin/config.json
```

2. Edit `bin/config.json` with your credentials:

```json
{
    "username": "your.email@proton.me",
    "password": "your_password",
    "totpSecretKey": "your_totp_secret"  // optional
}
```

### Build & Installation

Run the build script to compile the binary:

```bash
./build.sh
```

The executable will be generated at `bin/protonmail`.

### Usage

```bash
cd bin && ./protonmail
```

On launch, the client will:

1. Authenticate to your ProtonMail account (CAPTCHA + 2FA flow)
2. Display the most recent message
3. Monitor and display new messages in real time

### Security

* Credentials are stored in an isolated JSON file
* Session cookies are persisted to minimize repeated logins
* All messages are decrypted locally using your mailbox password
* Optional TOTP support enhances account security
