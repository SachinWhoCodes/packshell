# packshell

**Encrypted `.env` sync for developer teams. Zero plaintext, zero trust.**

packshell keeps your `.env` files in sync across a team without a secret ever
leaving a developer's machine in plaintext. Your environment is encrypted
locally with a project key using AES-256-GCM; only the resulting cipher blob is
uploaded. The project key itself is shared per-member by wrapping it with each
teammate's RSA-4096 public key, so the server only ever stores ciphertext it
cannot read.

This repository is the **open-source command-line client** — the part that
touches your secrets, so you can audit exactly what happens to them. The hosted
sync platform is a separate service at
[packshell.vercel.app](https://packshell.vercel.app).

---

## Install

```bash
npm install -g packshell
```

Requires Node.js 20+.

## Quickstart

```bash
# connect this machine to your account
packshell auth

# link a project in your repo (generates the project key locally)
packshell init

# encrypt your .env and push the first version
packshell push

# on another machine that has access
packshell pull
```

## Commands

| Command | Description |
| --- | --- |
| `packshell auth` | Log in through the website and connect this CLI. |
| `packshell init [name]` | Create or link a project in the current directory. |
| `packshell push` | Encrypt the local env file and push a new version. |
| `packshell pull` | Pull and decrypt the latest version to disk. |
| `packshell diff` | Show key-level changes vs remote — without revealing values. |
| `packshell watch` | Auto-pull when a newer remote version appears. |
| `packshell invite <email>` | Invite a teammate and share the project key when possible. |
| `packshell share <email>` | Share the current project key with an existing member. |
| `packshell join <code>` | Join a company using an invite code. |
| `packshell redeem <code>` | Redeem a plan code for a company. |
| `packshell status` | Show login and project status. |
| `packshell logout` | Remove the local CLI session. |

Run `packshell <command> --help` for the full option list of any command.

## Configuration

By default the CLI talks to the hosted packshell API. To point it at a
self-hosted deployment, set the API origin:

```bash
export PACKSHELL_API_URL="https://packshell.your-company.com"
```

`auth` also accepts `--api <url>`.

## Security model

- **Environment encryption:** AES-256-GCM over the full `.env`.
- **Key wrapping:** RSA-OAEP, 4096-bit, SHA-256 — the project key is wrapped per member.
- **Integrity:** a SHA-256 checksum per version detects changes without revealing contents.
- **The server never sees** plaintext, secret values, project keys, or your private key.

Your private key stays on your machine. Because decryption depends on it,
packshell cannot recover your secrets if you lose it. See [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © Acadable Labs

Built by [Acadable Labs](https://acadable.com).
