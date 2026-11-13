# DPWH Directory (Employee Management System)

An offline, browser-based employee directory. It runs on one computer (or on a local office network) and needs **no internet** once it is installed. You open it in a browser at `http://127.0.0.1:3000`.

## Features

- Employee records with photo (photos are resized automatically), details modal, search, filters and pagination
- Priority cards for the District Engineer, Assistant District Engineer and the six OIC Chiefs
- Login with roles: **admin**, **hr**, **editor**, **viewer**
- Admin: user management and an Activity Log
- Admin and HR: Excel export (with pictures) and a one-click Backup zip

## Tech stack

- **Client:** React + Vite + react-bootstrap
- **Server:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`), photos stored as files

## Project structure

```
dpwh-directory/
├── client/                 React app (Vite)
└── server/                 Node.js API + database
    ├── index.js            the server
    ├── db.js               database setup
    ├── reset-admin.js      resets the admin password
    ├── employees.db        created on first run   (NOT in Git)
    ├── uploads/            employee photos        (NOT in Git)
    └── secret.key          login signing key      (NOT in Git, created on first run)
```

## Requirements

- **Node.js LTS** from https://nodejs.org. Use the **same major version on every computer**. Check with `node -v`.
- **Git** from https://git-scm.com

## Install on a new computer

Commands are for Windows PowerShell. Replace `YOUR-USERNAME` with the GitHub account that owns the repository.

**1. Get the code**

```powershell
git clone https://github.com/YOUR-USERNAME/dpwh-directory.git
cd dpwh-directory
```

**2. Install the server**

```powershell
cd server
npm install
cd ..
```

**3. Install and build the client**

```powershell
cd client
npm install
npm run build
cd ..
```

**4. Start the system**

```powershell
cd server
node index.js
```

**5. Open it**

Go to `http://127.0.0.1:3000` in a browser.

### First login

On the very first start the server creates an `admin` account and prints a **random password once** in the terminal, inside a box. Write it down, log in as `admin`, then use **Change password** in the top-right menu.

If you missed it, stop the server with `Ctrl + C` and run this in the `server` folder:

```powershell
node reset-admin.js
```

It prints a new admin password.

## Development mode

Use two terminals.

```powershell
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

Open the link Vite prints (usually `http://localhost:5173`). The server restarts by itself when you edit server files, and the page updates when you edit client files.

When you want the real, single-address version (`127.0.0.1:3000`) to show your latest client changes, run `npm run build` in `client` again.

## Move your data to another computer

**Git carries only the code.** The employee records, photos and user accounts are *not* in the repository, on purpose. To bring them to another computer:

1. On the old computer, log in as **admin** and click **Backup**. This downloads `employee-backup-<date>.zip`.
2. Copy the zip to the new computer (USB drive or similar). **Do not put it on GitHub.**
3. On the new computer, **stop the server**.
4. If the server has already run once there, rename (do not delete) `server/employees.db`, any `employees.db-wal` and `employees.db-shm` files, and the `server/uploads` folder, for example by adding `old-` in front.
5. Unzip the backup and copy its `employees.db` file and `uploads` folder into the `server` folder.
6. Start the server and log in with the accounts from the old computer.

A backup made by an **admin** includes the user accounts. A backup made by **HR** leaves the accounts out, so after restoring it the server creates a fresh `admin` account and prints a new password in the terminal.

## Update the code on this computer

```powershell
git pull
cd server
npm install
cd ../client
npm install
npm run build
```

Then restart the server.

## Let other computers in the office open it (optional)

1. In `server/index.js`, the `app.listen(3000, "127.0.0.1", ...)` line only accepts connections from the same computer. Changing `"127.0.0.1"` to `"0.0.0.0"` opens it to the local network.
2. Allow port 3000 in the Windows firewall for **Private** networks.
3. Other computers then open `http://<this-computer's-IPv4-address>:3000`. Find the address with `ipconfig`.

The connection is plain HTTP, so only use this on a trusted office network.

## Backups

Click **Backup** regularly (at least weekly) and copy the zip **off this computer**, for example to a USB drive. Treat the zip like the database itself: it contains personal data and photos.

## Security notes

- Keep this repository **private**.
- Never commit `server/employees.db`, `server/uploads/`, `server/secret.key`, backup zips or Excel exports. The `.gitignore` file excludes them. Check with `git status` before every commit.
- `server/secret.key` signs the login cookies. If it is deleted, everyone is simply logged out once and a new one is created.

## Troubleshooting

| Problem | What to do |
|---|---|
| `npm install` fails on `better-sqlite3` or `sharp` | Install the current Node.js LTS, reopen the terminal, and run `npm install` again in that folder. |
| `Cannot GET /` at `127.0.0.1:3000` | The client is not built yet. Run `npm run build` in `client`. |
| `Cannot find module ...` | Run `npm install` in the folder you started the server or client from. |
| Port 3000 already in use | Another copy of the server is running. Close it, or find it with `netstat -ano \| findstr :3000`. |
| Forgot the admin password | Stop the server, then run `node reset-admin.js` in `server`. |
