# YourShop E-Commerce – Deployment-Dokumentation

Diese Anleitung beschreibt die Bereitstellung des YourShop E-Commerce-Shops auf einem Linux VPS (Debian/Ubuntu). Sie richtet sich an Anfänger und erklärt jeden Schritt ausführlich.

---

## Voraussetzungen

| Komponente | Mindestanforderung |
|---|---|
| Betriebssystem | Debian 11+ oder Ubuntu 22.04+ |
| RAM | 1 GB (empfohlen: 2 GB) |
| Festplatte | 10 GB freier Speicher |
| Node.js | Version 18 oder höher |
| Datenbank | MySQL 8.0+ oder TiDB |
| Domain | Optional, aber empfohlen |

---

## Schritt 1: Server vorbereiten

Verbinden Sie sich per SSH mit Ihrem Server und aktualisieren Sie das System:

```bash
sudo apt update && sudo apt upgrade -y
```

Installieren Sie die benötigten Pakete:

```bash
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx
```

---

## Schritt 2: Node.js installieren

Installieren Sie Node.js 22 über NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Installieren Sie pnpm als Paketmanager:

```bash
npm install -g pnpm
```

Überprüfen Sie die Installation:

```bash
node --version   # Sollte v22.x.x anzeigen
pnpm --version   # Sollte 10.x.x anzeigen
```

---

## Schritt 3: MySQL installieren

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Erstellen Sie eine Datenbank und einen Benutzer:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE yourshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'yourshop'@'localhost' IDENTIFIED BY 'IHR_SICHERES_PASSWORT';
GRANT ALL PRIVILEGES ON yourshop.* TO 'yourshop'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Schritt 4: Projekt auf den Server kopieren

Kopieren Sie das Projekt auf Ihren Server (z.B. per `scp` oder `git clone`):

```bash
cd /var/www
sudo mkdir yourshop
sudo chown $USER:$USER yourshop
# Dateien hierher kopieren
```

Installieren Sie die Abhängigkeiten:

```bash
cd /var/www/yourshop
pnpm install
```
ALTER USER 'myshopuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Hallo1212!';
FLUSH PRIVILEGES;
---
DATABASE_URL="mysql://myshopuser:Hallo1212%21@localhost:3306/myshopdb"
## Schritt 5: Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env`-Datei im Projektverzeichnis:

```bash
nano /var/www/myshop/.env
```

Fügen Sie folgende Variablen ein (passen Sie die Werte an):

```env
# Datenbank
DATABASE_URL=mysql://myshop:IHR_SICHERES_PASSWORT@localhost:3306/myshop

# JWT Secret (generieren Sie einen zufälligen String)
JWT_SECRET=ihr_zufaelliger_jwt_secret_hier

# Oxapay Payment (optional - ohne diese Variable läuft der Shop im Demo-Modus)
OXAPAY_MERCHANT_KEY=IATBVJ-ZETSQG-ERLMYY-ODTKGZ
# Port (Standard: 3000)
PORT=3000
```

Generieren Sie einen sicheren JWT-Secret:

```bash
openssl rand -hex 32
```

---

## Schritt 6: Datenbank-Migration ausführen

```bash
cd /var/www/myshop
pnpm db:push
```

Dies erstellt alle benötigten Tabellen in der Datenbank.

---

## Schritt 7: Projekt bauen

```bash
pnpm build
```

---

## Schritt 8: Systemd-Service erstellen

Erstellen Sie einen Service, damit der Shop automatisch startet:

```bash
sudo nano /etc/systemd/system/myshop.service
```

Inhalt:

```ini
[Unit]
Description=YourShop E-Commerce
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/yourshop
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/yourshop/.env

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten Sie den Service:

```bash
sudo chown -R www-data:www-data /var/www/yourshop
sudo systemctl daemon-reload
sudo systemctl enable yourshop
sudo systemctl start yourshop
```

Überprüfen Sie den Status:

```bash
sudo systemctl status yourshop
```

---

## Schritt 9: Nginx als Reverse Proxy einrichten

```bash
sudo nano /etc/nginx/sites-available/myshop
```

Inhalt (ersetzen Sie `ihre-domain.de` mit Ihrer Domain):

```nginx
server {
    listen 80;
    server_name ihre-domain.de www.ihre-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

Aktivieren Sie die Konfiguration:

```bash
sudo ln -s /etc/nginx/sites-available/myshop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Schritt 10: SSL-Zertifikat einrichten (optional, aber empfohlen)

```bash
sudo certbot --nginx -d ihre-domain.de -d www.ihre-domain.de
```

Certbot richtet automatisch die HTTPS-Weiterleitung ein und erneuert das Zertifikat automatisch.

---

## Schritt 11: Admin-Benutzer einrichten

Nachdem Sie sich zum ersten Mal im Shop angemeldet haben, können Sie Ihren Benutzer zum Admin befördern:

```bash
sudo mysql -u yourshop -p yourshop
```

```sql
UPDATE users SET role = 'admin' WHERE email = 'ihre-email@example.com';
```

---

## Oxapay Payment einrichten

Um Kryptowährungs-Zahlungen zu aktivieren:

1. Erstellen Sie ein Konto bei [Oxapay](https://oxapay.com)
2. Gehen Sie zum Merchant Dashboard und erstellen Sie einen API-Key
3. Tragen Sie den API-Key als `OXAPAY_MERCHANT_KEY` in die `.env`-Datei ein
4. Setzen Sie die Callback-URL in Ihrem Oxapay-Dashboard auf: `https://ihre-domain.de/api/oxapay/callback`
5. Starten Sie den Service neu: `sudo systemctl restart yourshop`

Ohne den API-Key läuft der Shop im Demo-Modus (Bestellungen werden erstellt, aber keine echten Zahlungen verarbeitet).

---

## Nützliche Befehle

| Befehl | Beschreibung |
|---|---|
| `sudo systemctl status yourshop` | Status des Shops prüfen |
| `sudo systemctl restart yourshop` | Shop neu starten |
| `sudo systemctl stop yourshop` | Shop stoppen |
| `sudo journalctl -u yourshop -f` | Live-Logs anzeigen |
| `sudo journalctl -u yourshop --since "1 hour ago"` | Logs der letzten Stunde |
| `pnpm db:push` | Datenbank-Schema aktualisieren |
| `pnpm build` | Projekt neu bauen |

---

## Fehlerbehebung

**Shop startet nicht:**
Prüfen Sie die Logs mit `sudo journalctl -u yourshop -f` und stellen Sie sicher, dass die `.env`-Datei korrekt konfiguriert ist.

**Datenbankfehler:**
Stellen Sie sicher, dass MySQL läuft (`sudo systemctl status mysql`) und die Zugangsdaten in der `.env`-Datei korrekt sind.

**502 Bad Gateway:**
Der Node.js-Prozess läuft möglicherweise nicht. Prüfen Sie mit `sudo systemctl status yourshop`.

**Zahlungen funktionieren nicht:**
Überprüfen Sie, ob der `OXAPAY_MERCHANT_KEY` korrekt gesetzt ist und die Callback-URL in Ihrem Oxapay-Dashboard eingetragen wurde.
