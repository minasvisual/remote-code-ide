# How to generate an OpenSSH key from your private key

This guide shows how to convert the most common private key formats to OpenSSH PEM, which is compatible with this app.

---

## 1. Identify your key type

Open the key file and check the header line:

| Header | Type |
|---|---|
| `-----BEGIN RSA PRIVATE KEY-----` | RSA classic PEM — ready to use |
| `-----BEGIN OPENSSH PRIVATE KEY-----` | OpenSSH native — ready to use |
| `-----BEGIN EC PRIVATE KEY-----` | ECDSA PEM — ready to use |
| `-----BEGIN DSA PRIVATE KEY-----` | DSA PEM — ready to use |
| `.ppk` file | PuTTY format — needs conversion |

---

## 2. Key already in OpenSSH / classic PEM format

If the header is `-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN OPENSSH PRIVATE KEY-----`, `-----BEGIN EC PRIVATE KEY-----`, or `-----BEGIN DSA PRIVATE KEY-----`, the key is ready. Paste the full content (including the `-----BEGIN ...-----` and `-----END ...-----` lines) into the **Private Key** field.

---

## 3. Convert a PuTTY key (.ppk) to OpenSSH

**Windows (PuTTYgen GUI):**
1. Open **PuTTYgen** (`puttygen.exe`)
2. Click **Load** and select the `.ppk` file
3. Go to **Conversions → Export OpenSSH key**
4. Save the file and paste its contents into the **Private Key** field

**Linux / macOS (command line):**
```bash
puttygen key.ppk -O private-openssh -o key_openssh.pem
```

---

## 4. Convert a new-format OpenSSH key to classic PEM (RSA)

Recent versions of `ssh-keygen` produce keys with a `-----BEGIN OPENSSH PRIVATE KEY-----` header. To convert to classic RSA PEM:

```bash
cp ~/.ssh/id_rsa ~/.ssh/id_rsa.bak
ssh-keygen -p -m PEM -f ~/.ssh/id_rsa
# leave the new passphrase empty (press Enter) if you don't want one
```

---

## 5. Generate a new RSA key pair

```bash
ssh-keygen -t rsa -b 4096 -C "your@email.com" -f ~/.ssh/id_rsa
```

Copy the public key to your server:
```bash
ssh-copy-id -i ~/.ssh/id_rsa.pub user@server
```

Paste the contents of `~/.ssh/id_rsa` into the **Private Key** field.

---

## 6. Generate a new Ed25519 key pair (recommended)

```bash
ssh-keygen -t ed25519 -C "your@email.com" -f ~/.ssh/id_ed25519
```

Copy the public key to your server:
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server
```

Paste the contents of `~/.ssh/id_ed25519` into the **Private Key** field.

---

## Tip: print the key content to your terminal

```bash
# Linux / macOS
cat ~/.ssh/id_rsa

# Windows (PowerShell)
Get-Content $HOME\.ssh\id_rsa
```

Select and copy **everything**, including the `-----BEGIN ...-----` and `-----END ...-----` lines.
