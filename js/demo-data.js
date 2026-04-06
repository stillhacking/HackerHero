/**
 * @fileoverview Demo Data Generator for HackerHero
 *
 * Generates realistic red team operations data:
 *  - 3 operations with different scopes
 *  - Zones (DMZ, Internal, Cloud, etc.)
 *  - Assets with real hostnames, IPs, OS info
 *  - Subitems with real parser output (nmap, ip addr, /etc/passwd, etc.)
 *  - Tickets at various priorities and statuses
 *  - Ticket messages (forum-style discussions)
 *  - Changelog entries spread over 30+ days
 *  - Multiple operator names
 *
 * @module demo-data
 */

import { DB } from './db.js?v=20260406u';
import { generateId, now } from './utils.js?v=20260406u';

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const OPERATORS = ['Spectre', 'Viper', 'Ghost', 'Nomad', 'Cipher', 'Phoenix'];

const pick    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN   = (arr, n) => { const a = [...arr]; const r = []; while (r.length < n && a.length) r.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return r; };
const days    = (d) => new Date(Date.now() - d * 86400000).toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const id      = () => generateId();

// ─────────────────────────────────────────────────────────────────────────────
//  REALISTIC PARSER OUTPUT SAMPLES
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_NMAP_DMZ = `Starting Nmap 7.94 ( https://nmap.org ) at 2026-03-15 14:32 UTC
Nmap scan report for webprod01.megacorp.local (10.0.1.10)
Host is up (0.0012s latency).

PORT      STATE  SERVICE       VERSION
22/tcp    open   ssh           OpenSSH 8.9p1 Ubuntu 3ubuntu0.6
80/tcp    open   http          nginx 1.24.0
443/tcp   open   ssl/http      nginx 1.24.0
3306/tcp  closed mysql
8080/tcp  open   http-proxy    Varnish 7.3

Nmap scan report for mail01.megacorp.local (10.0.1.11)
Host is up (0.0009s latency).

PORT      STATE  SERVICE       VERSION
25/tcp    open   smtp          Postfix smtpd
110/tcp   open   pop3          Dovecot pop3d
143/tcp   open   imap          Dovecot imapd
443/tcp   open   ssl/http      Roundcube Webmail
993/tcp   open   ssl/imap      Dovecot imapd

OS details: Ubuntu 22.04 LTS`;

const SAMPLE_NMAP_INTERNAL = `Starting Nmap 7.94 ( https://nmap.org ) at 2026-03-18 09:15 UTC
Nmap scan report for dc01.corp.megacorp.local (172.16.0.1)
Host is up (0.0003s latency).

PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Microsoft DNS
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos
135/tcp   open  msrpc         Microsoft Windows RPC
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP
445/tcp   open  microsoft-ds  Microsoft Windows Server 2019
636/tcp   open  ssl/ldap      Microsoft Windows Active Directory LDAP
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP
3389/tcp  open  ms-wbt-server Microsoft Terminal Services

OS details: Windows Server 2019 Standard 17763`;

const SAMPLE_NMAP_FILESERVER = `Starting Nmap 7.94 ( https://nmap.org ) at 2026-03-18 10:22 UTC
Nmap scan report for fs01.corp.megacorp.local (172.16.0.20)
Host is up (0.0005s latency).

PORT      STATE SERVICE       VERSION
22/tcp    open  ssh           OpenSSH 8.2p1
111/tcp   open  rpcbind       2-4 (RPC #100000)
139/tcp   open  netbios-ssn   Samba smbd 4.15
445/tcp   open  microsoft-ds  Samba smbd 4.15
2049/tcp  open  nfs           3-4 (RPC #100003)

OS details: Ubuntu 20.04 LTS`;

const SAMPLE_IP_ADDR = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:a1:b2:c3 brd ff:ff:ff:ff:ff:ff
    inet 10.0.1.10/24 brd 10.0.1.255 scope global dynamic eth0
       valid_lft 86150sec preferred_lft 86150sec
    inet6 fe80::5054:ff:fea1:b2c3/64 scope link
       valid_lft forever preferred_lft forever`;

const SAMPLE_ETC_PASSWD = `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
mysql:x:106:112:MySQL Server,,,:/nonexistent:/bin/false
deploy:x:1000:1000:Deploy User:/home/deploy:/bin/bash
jenkins:x:1001:1001:Jenkins CI:/home/jenkins:/bin/bash
backup:x:1002:1002:Backup User:/home/backup:/bin/bash
admin:x:1003:1003:Admin User:/home/admin:/bin/bash`;

const SAMPLE_ETC_SHADOW = `root:$6$rAnD0m$KjH8sLm3nB5qR7xW2dY9eA1iO4pU6tZ8cV0bN3mF5gJ7hK9lM1qS3wE5rT7yU9iO:19800:0:99999:7:::
deploy:$6$s4Lt3d$Xp2Kj8Nm5Bv3Qw7Ry1Tl4Uh6Af9Dg0Ek2Hi3Jm5Lo7Nq9Ps1Rv3Tw5Ux:19750:0:99999:7:::
jenkins:$6$h4sh3d$Mz8Ky6Nw4Bq2Rv0Tp3Ul5Ah7Dj9Fm1Gk3Hn5Jq7Lo9Nr1Ps3Rv5Tw7U:19780:0:99999:7:::
admin:$6$cr4ck$Lw7Jx5Mv3Ap1Qr9So2Tk4Uf6Bg8Ch0Ek2Gm4In6Kp8Lq0Nr2Pt4Sv6Uw8:19820:0:99999:7:::`;

const SAMPLE_NETSTAT = `Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN
tcp        0     36 10.0.1.10:22            10.0.1.50:49832         ESTABLISHED
tcp        0      0 10.0.1.10:443           203.0.113.42:51234      ESTABLISHED
tcp        0      0 10.0.1.10:80            198.51.100.7:60102      TIME_WAIT
tcp6       0      0 :::8080                 :::*                    LISTEN`;

const SAMPLE_IPCONFIG = `Windows IP Configuration

   Host Name . . . . . . . . . . . . : DC01
   Primary Dns Suffix  . . . . . . . : corp.megacorp.local
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No

Ethernet adapter Ethernet0:

   Connection-specific DNS Suffix  . : corp.megacorp.local
   Physical Address. . . . . . . . . : 00-50-56-A1-B2-C3
   DHCP Enabled. . . . . . . . . . . : No
   IPv4 Address. . . . . . . . . . . : 172.16.0.1
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . : 172.16.0.254
   DNS Servers . . . . . . . . . . . : 127.0.0.1
                                        172.16.0.2`;

const SAMPLE_SYSTEMINFO = `Host Name:                 DC01
OS Name:                   Microsoft Windows Server 2019 Standard
OS Version:                10.0.17763 N/A Build 17763
System Type:               x64-based PC
Total Physical Memory:     16,384 MB
Available Physical Memory: 8,192 MB
Domain:                    corp.megacorp.local
Logon Server:              \\\\DC01
Hotfix(s):                 42 Hotfix(s) Installed.
                           [01]: KB5034127
                           [02]: KB5034439`;

const SAMPLE_SUDO_L = `Matching Defaults entries for deploy on webprod01:
    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

User deploy may run the following commands on webprod01:
    (ALL) NOPASSWD: /usr/bin/systemctl restart nginx
    (ALL) NOPASSWD: /usr/bin/systemctl restart php8.1-fpm
    (root) NOPASSWD: /usr/bin/journalctl`;

const SAMPLE_CRONTAB = `# m h dom mon dow command
*/5  * * * * /opt/scripts/healthcheck.sh >> /var/log/healthcheck.log 2>&1
0    2 * * * /usr/bin/certbot renew --quiet
30   3 * * 0 /opt/backup/weekly-backup.sh
0    * * * * /usr/bin/php /var/www/app/artisan schedule:run >> /dev/null 2>&1
15   4 * * * /usr/local/bin/logrotate-custom.sh`;

const SAMPLE_ETC_HOSTS = `127.0.0.1       localhost
127.0.1.1       webprod01.megacorp.local webprod01
10.0.1.10       webprod01.megacorp.local webprod01
10.0.1.11       mail01.megacorp.local mail01
10.0.1.12       api01.megacorp.local api01
172.16.0.1      dc01.corp.megacorp.local dc01
172.16.0.20     fs01.corp.megacorp.local fs01
172.16.0.50     devbox01.corp.megacorp.local devbox01`;

const SAMPLE_SSH_PRIVKEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEA0mNPkG2rJ9L3v5MKz0Z2HsXkBqIiL5dN5mZvR7kP3bN7OxU8vH
... [REDACTED FOR DEMO] ...
4X9Uk3pKwWZJR1qF5VlB9S2jN7mK0Gc8RhD3LpAAAAABkZXBsb3lAbWVnYWNvcnA=
-----END OPENSSH PRIVATE KEY-----`;

const SAMPLE_HTTP_HEADERS = `HTTP/2 200 OK
server: nginx/1.24.0
date: Sat, 15 Mar 2026 14:45:22 GMT
content-type: text/html; charset=UTF-8
x-powered-by: PHP/8.1.27
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
strict-transport-security: max-age=31536000; includeSubDomains
set-cookie: PHPSESSID=a1b2c3d4e5f6g7h8; path=/; HttpOnly; Secure
x-request-id: f47ac10b-58cc-4372-a567-0e02b2c3d479`;

const SAMPLE_DNS_LOOKUP = `; <<>> DiG 9.18.18-0ubuntu0.22.04.2-Ubuntu <<>> megacorp.local ANY
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 34521
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 5, AUTHORITY: 0, ADDITIONAL: 3

;; ANSWER SECTION:
megacorp.local.     600  IN  A      10.0.1.10
megacorp.local.     600  IN  A      10.0.1.12
megacorp.local.     600  IN  MX     10 mail01.megacorp.local.
megacorp.local.     600  IN  NS     dc01.corp.megacorp.local.
megacorp.local.     600  IN  TXT    "v=spf1 mx a ip4:10.0.1.0/24 -all"

;; ADDITIONAL SECTION:
mail01.megacorp.local. 600 IN A    10.0.1.11
dc01.corp.megacorp.local. 600 IN A 172.16.0.1`;

const SAMPLE_HASH_LIST = `admin:$6$cr4ck3d$Lw7Jx5Mv3Ap1:Admin User
deploy:$6$s4Lt3d$Xp2Kj8Nm5Bv:Deploy User
jenkins:$6$h4sh3d$Mz8Ky6Nw4Bq:Jenkins CI
root:$6$rAnD0m$KjH8sLm3nB5:root
backup:$1$old$simpleHash123456:Backup User
svc_sql:$6$SQLpwd$YmN5Kp3Rv7Tw:SQL Service Account`;

const SAMPLE_NIKTO = `- Nikto v2.5.0
---------------------------------------------------------------------------
+ Target IP:          10.0.1.12
+ Target Hostname:    api01.megacorp.local
+ Target Port:        443
+ SSL Info:           Subject:  /CN=*.megacorp.local
                      Ciphers:  TLS_AES_256_GCM_SHA384
+ Start Time:         2026-03-20 11:30:00
---------------------------------------------------------------------------
+ Server: nginx/1.24.0
+ /: The X-Content-Type-Options header is not set.
+ /admin/: Directory indexing found.
+ /backup/: Directory indexing found.
+ /api/v1/debug: Debug endpoint found. Contains stack traces.
+ /server-status: Apache mod_status found (informational).
+ /.env: Environment file found. May contain credentials.
+ /wp-login.php: WordPress login found (false positive — custom app).
+ 7 item(s) reported on remote host
+ End Time: 2026-03-20 11:32:45 (165 seconds)`;

const SAMPLE_WEBFUZZ = `===============================================================
Gobuster v3.6
===============================================================
[+] Url:           https://megacorp.local
[+] Threads:       50
[+] Wordlist:      /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt
===============================================================
/admin                (Status: 301) [Size: 178] [--> /admin/]
/api                  (Status: 301) [Size: 178] [--> /api/]
/assets               (Status: 301) [Size: 178] [--> /assets/]
/backup               (Status: 403) [Size: 162]
/config               (Status: 403) [Size: 162]
/docs                 (Status: 200) [Size: 4521]
/health               (Status: 200) [Size: 15]
/login                (Status: 200) [Size: 3847]
/logout               (Status: 302) [Size: 0] [--> /login]
/uploads              (Status: 403) [Size: 162]
/.env                 (Status: 200) [Size: 1247]
/server-info          (Status: 403) [Size: 162]
===============================================================`;

const SAMPLE_IPTABLES = `Chain INPUT (policy DROP)
target     prot opt source               destination
ACCEPT     all  --  0.0.0.0/0            0.0.0.0/0            state RELATED,ESTABLISHED
ACCEPT     all  --  0.0.0.0/0            0.0.0.0/0
ACCEPT     icmp --  0.0.0.0/0            0.0.0.0/0
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:22
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:80
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:443

Chain FORWARD (policy DROP)
target     prot opt source               destination

Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination`;

const SAMPLE_PS_AUX = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1 167312 11632 ?        Ss   Mar15   0:12 /sbin/init
root         512  0.0  0.0  72308  5632 ?        Ss   Mar15   0:02 /usr/sbin/sshd -D
www-data    1423  0.1  1.2 412956 98432 ?        S    Mar15   8:45 php-fpm: pool www
www-data    1424  0.1  1.1 408832 94208 ?        S    Mar15   8:32 php-fpm: pool www
mysql       2100  1.2  5.4 1890432 441344 ?      Ssl  Mar15  52:18 /usr/sbin/mysqld
root        3210  0.0  0.0   8540  3456 ?        Ss   Mar15   0:00 /usr/sbin/cron -f
root        3458  0.0  0.2 234512 18944 ?        Ss   Mar15   0:08 nginx: master process
www-data    3460  0.3  0.4 245760 35840 ?        S    Mar15   5:22 nginx: worker process
deploy     15233  0.0  0.0  10768  6144 pts/0    Ss   14:30   0:00 -bash
deploy     15301  0.0  0.0  12456  3584 pts/0    R+   14:32   0:00 ps aux`;

const SAMPLE_MOUNT_DF = `Filesystem      Size  Used Avail Use% Mounted on
udev            7.8G     0  7.8G   0% /dev
tmpfs           1.6G  1.8M  1.6G   1% /run
/dev/sda1        98G   42G   51G  46% /
tmpfs           7.8G     0  7.8G   0% /dev/shm
/dev/sdb1       500G  312G  163G  66% /data
//fs01/share    1.0T  780G  244G  77% /mnt/fileserver`;

const SAMPLE_FIND_SUID = `/usr/bin/sudo
/usr/bin/passwd
/usr/bin/chsh
/usr/bin/gpasswd
/usr/bin/newgrp
/usr/bin/pkexec
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/openssh/ssh-keysign
/opt/custom/backup-tool
/usr/local/bin/admin-helper`;

const SAMPLE_AUTH_LOG = `Mar 15 14:30:12 webprod01 sshd[15200]: Accepted publickey for deploy from 10.0.1.50 port 49832 ssh2: RSA SHA256:Abc123
Mar 15 14:31:45 webprod01 sshd[15210]: Failed password for root from 203.0.113.42 port 51234 ssh2
Mar 15 14:31:47 webprod01 sshd[15210]: Failed password for root from 203.0.113.42 port 51234 ssh2
Mar 15 14:31:49 webprod01 sshd[15210]: Failed password for root from 203.0.113.42 port 51234 ssh2
Mar 15 14:32:00 webprod01 sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx
Mar 15 14:35:22 webprod01 sshd[15280]: Accepted password for admin from 172.16.0.50 port 38472 ssh2
Mar 16 02:00:01 webprod01 CRON[18400]: pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)
Mar 16 08:15:33 webprod01 sshd[19500]: Failed password for invalid user test from 198.51.100.7 port 60102 ssh2`;

const SAMPLE_ENV_VARS = `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=/home/deploy
USER=deploy
SHELL=/bin/bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=megacorp_prod
DB_USER=app_user
DB_PASSWORD=Pr0d_S3cret!2026
APP_ENV=production
APP_KEY=base64:a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SMTP_HOST=mail01.megacorp.local
SMTP_USER=noreply@megacorp.local
SMTP_PASS=M4ilP@ss!`;

// ─────────────────────────────────────────────────────────────────────────────
//  MISSION BRIEFING TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

const BRIEFING_BLACKOUT = `# Operation Blackout — Mission Briefing

## Scope
Full external-to-internal penetration test of **MegaCorp Industries** infrastructure.
Client authorized testing of all internet-facing systems and, upon successful breach, lateral movement into the corporate network.

## Rules of Engagement
- **Testing window**: 24/7, weekdays only for social engineering
- **Out of scope**: Production database writes, denial-of-service
- **Emergency contact**: CISO — Sarah Mitchell — +1-555-0142
- No physical access testing in Phase 1

## Key Intelligence
- Primary domain: \`megacorp.local\` / \`megacorp.com\`
- Known tech stack: **nginx**, **PHP 8.1**, **MySQL 8**, **Redis**
- VPN endpoint discovered at \`vpn.megacorp.com\` (OpenVPN)
- 3 public-facing web apps identified

## Attack Surface Notes
> The DMZ segment (10.0.1.0/24) hosts web and mail servers.
> Internal corporate network is 172.16.0.0/16.
> Cloud workloads on AWS (us-east-1) — S3 buckets and EC2 instances.

## OSINT Findings
- LinkedIn shows **42 employees** in IT/Engineering
- GitHub org \`megacorp-dev\` has 3 public repos with CI/CD configs
- Shodan reveals exposed **Elasticsearch** on port 9200
`;

const BRIEFING_GHOSTWIRE = `# Operation GhostWire — Mission Briefing

## Scope
Red team assessment targeting **NovaTech Solutions** cloud infrastructure.
Focus on AWS environment with assumed breach scenario (valid low-privilege credentials provided).

## Rules of Engagement
- Cloud-only scope (no on-premise testing)
- AWS account ID: \`123456789012\`
- Region: \`eu-west-1\` (primary), \`us-east-1\` (DR)
- **Do NOT** modify production S3 data
- Credential provided: \`readonly-auditor\` IAM user

## Objectives
1. Escalate from \`readonly-auditor\` to admin
2. Identify cross-account trust misconfigurations
3. Exfiltrate sample data from staging environment
4. Test CloudTrail detection capabilities

## Known Infrastructure
- EKS cluster \`novatech-prod\` running **128 pods**
- RDS PostgreSQL \`prod-db.cluster-abc123.eu-west-1.rds.amazonaws.com\`
- 14 Lambda functions, 3 API Gateways
- CloudFront distribution for \`app.novatech.io\`
`;

const BRIEFING_REDSAND = `# Operation RedSand — Mission Briefing

## Scope
Purple team exercise with **GlobalBank Financial** security operations center.
Goal: test detection and response capabilities against simulated APT techniques.

## Rules of Engagement
- SOC team is **NOT** informed (true red team exercise)
- IR team will be notified post-exercise for joint debrief
- Active Directory environment: \`globalbank.corp\`
- Testing both Windows and Linux endpoints

## MITRE ATT&CK Techniques Planned
- T1566.001 — Spearphishing Attachment
- T1053.005 — Scheduled Task
- T1003.001 — LSASS Memory (Mimikatz)
- T1021.001 — Remote Desktop Protocol
- T1048.003 — Exfiltration Over Unencrypted Protocol

## Key Contacts
| Role | Name | Phone |
|------|------|-------|
| Red Team Lead | Spectre | Encrypted channel |
| Blue Team POC | David Chen | After exercise |
| CISO | Margaret Wu | Emergency only |
`;

// ─────────────────────────────────────────────────────────────────────────────
//  OPERATION 1 — BLACKOUT (full external pentest)
// ─────────────────────────────────────────────────────────────────────────────

function buildBlackout() {
  const mId = id();

  const mission = {
    id: mId,
    codename: 'BLACKOUT',
    targets: [
      { id: id(), name: 'MegaCorp Industries' },
      { id: id(), name: 'megacorp.com' },
      { id: id(), name: 'megacorp.local' },
    ],
    objectives: [
      { id: id(), text: 'Gain initial foothold on DMZ', status: 'achieved', createdAt: days(28), createdBy: 'Spectre' },
      { id: id(), text: 'Escalate privileges on web server', status: 'achieved', createdAt: days(28), createdBy: 'Spectre' },
      { id: id(), text: 'Pivot to internal network', status: 'achieved', createdAt: days(28), createdBy: 'Viper' },
      { id: id(), text: 'Compromise Active Directory domain', status: 'in-progress', createdAt: days(28), createdBy: 'Viper' },
      { id: id(), text: 'Exfiltrate sensitive data from file server', status: 'in-progress', createdAt: days(28), createdBy: 'Ghost' },
      { id: id(), text: 'Achieve persistence across reboot', status: 'pending', createdAt: days(28), createdBy: 'Spectre' },
      { id: id(), text: 'Access cloud environment via stolen credentials', status: 'pending', createdAt: days(20), createdBy: 'Nomad' },
    ],
    context: BRIEFING_BLACKOUT,
    timezone: 'America/New_York',
    createdAt: days(30), createdBy: 'Spectre',
    updatedAt: days(1), updatedBy: 'Viper',
  };

  // ── Zones ──────────────────────────────────────────────────────────────
  const zDmz   = { id: id(), missionId: mId, name: 'DMZ', network: '10.0.1.0/24', description: 'Internet-facing segment — web, mail, API servers', createdAt: days(29), createdBy: 'Spectre' };
  const zInt   = { id: id(), missionId: mId, name: 'Internal Corp', network: '172.16.0.0/16', description: 'Corporate internal network — AD, file server, workstations', createdAt: days(22), createdBy: 'Viper' };
  const zCloud = { id: id(), missionId: mId, name: 'AWS Cloud', network: 'us-east-1', description: 'AWS infrastructure — EC2, S3, RDS', createdAt: days(15), createdBy: 'Nomad' };
  const zones = [zDmz, zInt, zCloud];

  // ── Assets ─────────────────────────────────────────────────────────────
  const aWeb = {
    id: id(), missionId: mId, zoneIds: [zDmz.id], parentId: null,
    type: 'server', icon: 'server-linux', name: 'webprod01 (10.0.1.10)',
    description: 'Production web server — nginx + PHP 8.1 + MySQL', isKey: true,
    statuses: ['pwned'], createdAt: days(28), createdBy: 'Spectre', updatedAt: days(5), updatedBy: 'Ghost',
  };
  const aMail = {
    id: id(), missionId: mId, zoneIds: [zDmz.id], parentId: null,
    type: 'server', icon: 'server-linux', name: 'mail01 (10.0.1.11)',
    description: 'Mail server — Postfix + Dovecot + Roundcube', isKey: false,
    statuses: ['interesting'], createdAt: days(26), createdBy: 'Spectre', updatedAt: days(18), updatedBy: 'Spectre',
  };
  const aApi = {
    id: id(), missionId: mId, zoneIds: [zDmz.id], parentId: null,
    type: 'server', icon: 'server-linux', name: 'api01 (10.0.1.12)',
    description: 'REST API server — nginx + Node.js', isKey: false,
    statuses: ['todo'], createdAt: days(25), createdBy: 'Ghost', updatedAt: days(10), updatedBy: 'Ghost',
  };
  const aDc = {
    id: id(), missionId: mId, zoneIds: [zInt.id], parentId: null,
    type: 'server', icon: 'server-windows', name: 'DC01 (172.16.0.1)',
    description: 'Primary Domain Controller — Windows Server 2019', isKey: true,
    statuses: ['hvt', 'interesting'], createdAt: days(20), createdBy: 'Viper', updatedAt: days(3), updatedBy: 'Viper',
  };
  const aFs = {
    id: id(), missionId: mId, zoneIds: [zInt.id], parentId: null,
    type: 'server', icon: 'server-linux', name: 'fs01 (172.16.0.20)',
    description: 'File server — Samba + NFS shares', isKey: false,
    statuses: ['interesting'], createdAt: days(18), createdBy: 'Ghost', updatedAt: days(8), updatedBy: 'Ghost',
  };
  const aDev = {
    id: id(), missionId: mId, zoneIds: [zInt.id], parentId: null,
    type: 'workstation', icon: 'desktop', name: 'devbox01 (172.16.0.50)',
    description: 'Developer workstation — Ubuntu 22.04 — used by dev team', isKey: false,
    statuses: ['pwned'], createdAt: days(16), createdBy: 'Viper', updatedAt: days(6), updatedBy: 'Viper',
  };
  const aS3 = {
    id: id(), missionId: mId, zoneIds: [zCloud.id], parentId: null,
    type: 'cloud', icon: 'cloud', name: 'S3: megacorp-backups',
    description: 'AWS S3 bucket — database backups (public listing enabled!)', isKey: true,
    statuses: ['interesting', 'todo'], createdAt: days(12), createdBy: 'Nomad', updatedAt: days(4), updatedBy: 'Nomad',
  };
  const aEc2 = {
    id: id(), missionId: mId, zoneIds: [zCloud.id, zDmz.id], parentId: null,
    type: 'server', icon: 'cloud', name: 'EC2: i-0abc123def456',
    description: 'AWS EC2 instance — staging environment (exposed to internet)', isKey: false,
    statuses: ['todo'], createdAt: days(10), createdBy: 'Nomad', updatedAt: days(5), updatedBy: 'Cipher',
  };
  const assets = [aWeb, aMail, aApi, aDc, aFs, aDev, aS3, aEc2];

  // ── Subitems (data items with real parser output) ────────────────────
  const subitems = [
    { id: id(), assetId: aWeb.id, parentId: null, name: 'nmap scan', content: SAMPLE_NMAP_DMZ, parsedType: 'nmap', statuses: [], createdAt: days(28), createdBy: 'Spectre' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'ip addr', content: SAMPLE_IP_ADDR, parsedType: 'ip_addr', statuses: [], createdAt: days(27), createdBy: 'Spectre' },
    { id: id(), assetId: aWeb.id, parentId: null, name: '/etc/passwd', content: SAMPLE_ETC_PASSWD, parsedType: 'etc_passwd', statuses: [], createdAt: days(26), createdBy: 'Spectre' },
    { id: id(), assetId: aWeb.id, parentId: null, name: '/etc/shadow', content: SAMPLE_ETC_SHADOW, parsedType: 'etc_shadow', statuses: ['pwned'], createdAt: days(24), createdBy: 'Spectre' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'netstat', content: SAMPLE_NETSTAT, parsedType: 'netstat', statuses: [], createdAt: days(27), createdBy: 'Spectre' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'sudo -l', content: SAMPLE_SUDO_L, parsedType: 'sudo_l', statuses: ['interesting'], createdAt: days(25), createdBy: 'Ghost' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'crontab -l', content: SAMPLE_CRONTAB, parsedType: 'crontab', statuses: [], createdAt: days(25), createdBy: 'Ghost' },
    { id: id(), assetId: aWeb.id, parentId: null, name: '/etc/hosts', content: SAMPLE_ETC_HOSTS, parsedType: 'etc_hosts', statuses: [], createdAt: days(24), createdBy: 'Spectre' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'ps aux', content: SAMPLE_PS_AUX, parsedType: 'ps_aux', statuses: [], createdAt: days(24), createdBy: 'Ghost' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'HTTP headers', content: SAMPLE_HTTP_HEADERS, parsedType: 'http_headers', statuses: [], createdAt: days(27), createdBy: 'Spectre' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'iptables rules', content: SAMPLE_IPTABLES, parsedType: 'iptables', statuses: [], createdAt: days(23), createdBy: 'Ghost' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'Environment variables', content: SAMPLE_ENV_VARS, parsedType: 'env_vars', statuses: ['pwned'], createdAt: days(22), createdBy: 'Ghost' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'SUID binaries', content: SAMPLE_FIND_SUID, parsedType: 'find_suid', statuses: ['interesting'], createdAt: days(23), createdBy: 'Ghost' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'auth.log', content: SAMPLE_AUTH_LOG, parsedType: 'auth_log', statuses: [], createdAt: days(21), createdBy: 'Viper' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'df -h', content: SAMPLE_MOUNT_DF, parsedType: 'mount_df', statuses: [], createdAt: days(24), createdBy: 'Ghost' },
    { id: id(), assetId: aWeb.id, parentId: null, name: 'deploy SSH key', content: SAMPLE_SSH_PRIVKEY, parsedType: 'ssh_priv_key', statuses: ['pwned'], createdAt: days(20), createdBy: 'Ghost' },
    { id: id(), assetId: aMail.id, parentId: null, name: 'DNS records', content: SAMPLE_DNS_LOOKUP, parsedType: 'dns_lookup', statuses: [], createdAt: days(26), createdBy: 'Spectre' },
    { id: id(), assetId: aApi.id, parentId: null, name: 'Nikto scan', content: SAMPLE_NIKTO, parsedType: 'nikto', statuses: ['interesting'], createdAt: days(25), createdBy: 'Ghost' },
    { id: id(), assetId: aApi.id, parentId: null, name: 'Gobuster results', content: SAMPLE_WEBFUZZ, parsedType: 'web_fuzz', statuses: ['interesting'], createdAt: days(24), createdBy: 'Ghost' },
    { id: id(), assetId: aDc.id, parentId: null, name: 'nmap scan', content: SAMPLE_NMAP_INTERNAL, parsedType: 'nmap', statuses: [], createdAt: days(20), createdBy: 'Viper' },
    { id: id(), assetId: aDc.id, parentId: null, name: 'ipconfig /all', content: SAMPLE_IPCONFIG, parsedType: 'ipconfig', statuses: [], createdAt: days(19), createdBy: 'Viper' },
    { id: id(), assetId: aDc.id, parentId: null, name: 'systeminfo', content: SAMPLE_SYSTEMINFO, parsedType: 'systeminfo', statuses: [], createdAt: days(19), createdBy: 'Viper' },
    { id: id(), assetId: aDc.id, parentId: null, name: 'Hash dump', content: SAMPLE_HASH_LIST, parsedType: 'hash_list', statuses: ['pwned'], createdAt: days(8), createdBy: 'Viper' },
    { id: id(), assetId: aFs.id, parentId: null, name: 'nmap scan', content: SAMPLE_NMAP_FILESERVER, parsedType: 'nmap', statuses: [], createdAt: days(18), createdBy: 'Ghost' },
  ];

  // ── Tickets ────────────────────────────────────────────────────────────
  const tickets = [
    { id: id(), missionId: mId, title: 'MySQL credentials found in .env file', description: 'Production database credentials exposed in `/var/www/app/.env`. Password: `Pr0d_S3cret!2026`. Immediate privesc vector.', priority: 'critical', status: 'open', refType: 'asset', refId: aWeb.id, createdAt: days(22), createdBy: 'Ghost', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'SSH key reuse across multiple servers', description: 'The `deploy` user SSH private key found on webprod01 also grants access to mail01 and fs01. No passphrase protection.', priority: 'high', status: 'open', refType: 'asset', refId: aWeb.id, createdAt: days(20), createdBy: 'Ghost', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'Directory listing enabled on /admin/ and /backup/', description: 'API server has directory indexing enabled on sensitive paths. Backup files contain database dumps.', priority: 'high', status: 'open', refType: 'asset', refId: aApi.id, createdAt: days(24), createdBy: 'Ghost', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'Domain Controller Kerberoasting possible', description: 'Multiple service accounts have weak SPNs. Kerberoasting attack yielded crackable TGS tickets.', priority: 'critical', status: 'open', refType: 'asset', refId: aDc.id, createdAt: days(8), createdBy: 'Viper', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'S3 bucket has public listing', description: 'The `megacorp-backups` S3 bucket allows unauthenticated ListBucket. Contains nightly DB exports.', priority: 'critical', status: 'open', refType: 'asset', refId: aS3.id, createdAt: days(12), createdBy: 'Nomad', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'Brute force attempts from 203.0.113.42', description: 'auth.log shows repeated failed SSH attempts for root from external IP. Likely unrelated to our op — real attacker?', priority: 'medium', status: 'open', refType: 'asset', refId: aWeb.id, createdAt: days(20), createdBy: 'Viper', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'Initial foothold via PHP deserialization', description: 'Exploited insecure PHP deserialization in the upload handler to get RCE as www-data. Documented in write-up.', priority: 'medium', status: 'closed', refType: 'asset', refId: aWeb.id, createdAt: days(27), createdBy: 'Spectre', closedAt: days(25), closedBy: 'Spectre' },
    { id: id(), missionId: mId, title: 'Need to map NFS shares on fs01', description: 'NFS exports from fs01 are world-readable. Need to enumerate all shared directories and check for sensitive data.', priority: 'low', status: 'open', refType: 'asset', refId: aFs.id, createdAt: days(15), createdBy: 'Ghost', closedAt: null, closedBy: null },
  ];

  // ── Ticket messages ─────────────────────────────────────────────────────
  const messages = [
    // Messages for the first ticket (MySQL creds)
    { id: id(), ticketId: tickets[0].id, text: 'Confirmed — these creds give us full **root** access to the MySQL instance. Database contains PII for ~50k users.', author: 'Spectre', createdAt: days(21) },
    { id: id(), ticketId: tickets[0].id, text: 'I dumped the `users` table headers:\n```\nid | email | password_hash | first_name | last_name | ssn_encrypted\n```\nThe `ssn_encrypted` column uses AES-256 but the key is in the same `.env` file. 💀', author: 'Ghost', createdAt: days(20) },
    { id: id(), ticketId: tickets[0].id, text: 'This is a **P1 finding** for the report. Adding to the executive summary.', author: 'Viper', createdAt: days(19) },
    // Messages for the Kerberoasting ticket
    { id: id(), ticketId: tickets[3].id, text: 'Cracked 3 out of 6 SPN hashes with hashcat:\n- `svc_sql`: `SqlAdmin2024!`\n- `svc_backup`: `Backup123`\n- `svc_web`: `W3bServ1ce`\n\nAll using `rockyou.txt` + rules.', author: 'Viper', createdAt: days(7) },
    { id: id(), ticketId: tickets[3].id, text: '`svc_sql` has **Domain Admin** equivalent privileges via nested group membership:\n> svc_sql → SQL Admins → Server Operators → Domain Admins path', author: 'Viper', createdAt: days(6) },
    { id: id(), ticketId: tickets[3].id, text: 'Good work. This gives us a clear path to full domain compromise. Let\'s document the attack chain before executing.', author: 'Spectre', createdAt: days(5) },
    // Messages for the S3 bucket
    { id: id(), ticketId: tickets[4].id, text: 'Downloaded latest backup: `megacorp-prod-2026-03-24.sql.gz` (2.3 GB). Contains complete production database.', author: 'Nomad', createdAt: days(11) },
    { id: id(), ticketId: tickets[4].id, text: 'Also found AWS credentials in the backup SQL dump:\n```\naws_access_key_id = AKIA...REDACTED\naws_secret_access_key = wJalr...REDACTED\n```\nThese belong to an IAM user with **AdministratorAccess** policy. 🎯', author: 'Cipher', createdAt: days(9) },
    // Messages for closed ticket
    { id: id(), ticketId: tickets[6].id, text: 'Payload used:\n```php\nO:28:"Illuminate\\Support\\Collection":1:{s:8:"\\x00*\\x00items";...}\n```\nGot reverse shell as `www-data`.', author: 'Spectre', createdAt: days(26) },
    { id: id(), ticketId: tickets[6].id, text: 'Escalated to `deploy` via stolen SSH key in `/home/www-data/.bash_history`. Closing this ticket.', author: 'Spectre', createdAt: days(25) },
  ];

  // ── Changelog (spread over 30 days) ─────────────────────────────────────
  const changelog = [];
  const addLog = (d, op, action, eType, eId, eName, desc) => {
    changelog.push({ id: id(), missionId: mId, timestamp: days(d), operator: op, action, entityType: eType, entityId: eId, entityName: eName, description: desc, previousState: null, newState: null });
  };

  addLog(30, 'Spectre', 'create', 'mission', mId, 'BLACKOUT', 'Created operation "BLACKOUT"');
  addLog(29, 'Spectre', 'create', 'zone', zDmz.id, 'DMZ', 'Created zone "DMZ"');
  addLog(28, 'Spectre', 'create', 'asset', aWeb.id, 'webprod01', 'Created asset "webprod01 (10.0.1.10)"');
  addLog(28, 'Spectre', 'create', 'subitem', subitems[0].id, 'nmap scan', 'Added data item "nmap scan" to asset');
  addLog(27, 'Spectre', 'create', 'subitem', subitems[1].id, 'ip addr', 'Added data item "ip addr" to asset');
  addLog(27, 'Spectre', 'create', 'subitem', subitems[9].id, 'HTTP headers', 'Added data item "HTTP headers" to asset');
  addLog(26, 'Spectre', 'create', 'asset', aMail.id, 'mail01', 'Created asset "mail01 (10.0.1.11)"');
  addLog(26, 'Spectre', 'create', 'subitem', subitems[2].id, '/etc/passwd', 'Added data item "/etc/passwd" to asset');
  addLog(26, 'Spectre', 'create', 'subitem', subitems[16].id, 'DNS records', 'Added data item "DNS records" to asset');
  addLog(25, 'Ghost', 'create', 'asset', aApi.id, 'api01', 'Created asset "api01 (10.0.1.12)"');
  addLog(25, 'Ghost', 'create', 'subitem', subitems[5].id, 'sudo -l', 'Added data item "sudo -l" to asset');
  addLog(25, 'Ghost', 'create', 'subitem', subitems[17].id, 'Nikto scan', 'Added data item "Nikto scan" to asset');
  addLog(24, 'Ghost', 'create', 'subitem', subitems[18].id, 'Gobuster results', 'Added data item "Gobuster results" to asset');
  addLog(24, 'Spectre', 'update', 'asset', aWeb.id, 'webprod01', 'Got /etc/shadow — marked asset as pwned');
  addLog(24, 'Ghost', 'create', 'ticket', tickets[2].id, tickets[2].title, `Created ticket "${tickets[2].title}"`);
  addLog(22, 'Ghost', 'create', 'ticket', tickets[0].id, tickets[0].title, `Created ticket "${tickets[0].title}"`);
  addLog(22, 'Viper', 'create', 'zone', zInt.id, 'Internal Corp', 'Created zone "Internal Corp"');
  addLog(21, 'Ghost', 'create', 'subitem', subitems[11].id, 'Environment variables', 'Added data item "Environment variables" to asset');
  addLog(20, 'Viper', 'create', 'asset', aDc.id, 'DC01', 'Created asset "DC01 (172.16.0.1)"');
  addLog(20, 'Ghost', 'create', 'ticket', tickets[1].id, tickets[1].title, `Created ticket "${tickets[1].title}"`);
  addLog(20, 'Viper', 'create', 'ticket', tickets[5].id, tickets[5].title, `Created ticket "${tickets[5].title}"`);
  addLog(20, 'Ghost', 'create', 'subitem', subitems[15].id, 'deploy SSH key', 'Added data item "deploy SSH key" to asset');
  addLog(19, 'Viper', 'create', 'subitem', subitems[20].id, 'ipconfig /all', 'Added data item "ipconfig /all" to asset');
  addLog(19, 'Viper', 'create', 'subitem', subitems[21].id, 'systeminfo', 'Added data item "systeminfo" to asset');
  addLog(18, 'Ghost', 'create', 'asset', aFs.id, 'fs01', 'Created asset "fs01 (172.16.0.20)"');
  addLog(18, 'Ghost', 'create', 'subitem', subitems[23].id, 'nmap scan', 'Added data item "nmap scan" to fs01');
  addLog(16, 'Viper', 'create', 'asset', aDev.id, 'devbox01', 'Created asset "devbox01 (172.16.0.50)"');
  addLog(15, 'Nomad', 'create', 'zone', zCloud.id, 'AWS Cloud', 'Created zone "AWS Cloud"');
  addLog(15, 'Ghost', 'create', 'ticket', tickets[7].id, tickets[7].title, `Created ticket "${tickets[7].title}"`);
  addLog(12, 'Nomad', 'create', 'asset', aS3.id, 'S3: megacorp-backups', 'Created asset "S3: megacorp-backups"');
  addLog(12, 'Nomad', 'create', 'ticket', tickets[4].id, tickets[4].title, `Created ticket "${tickets[4].title}"`);
  addLog(10, 'Nomad', 'create', 'asset', aEc2.id, 'EC2: i-0abc123def456', 'Created asset "EC2: i-0abc123def456"');
  addLog(8, 'Viper', 'create', 'subitem', subitems[22].id, 'Hash dump', 'Added data item "Hash dump" to DC01');
  addLog(8, 'Viper', 'create', 'ticket', tickets[3].id, tickets[3].title, `Created ticket "${tickets[3].title}"`);
  addLog(6, 'Viper', 'update', 'asset', aDc.id, 'DC01', 'Updated DC01 — Kerberoasting path found');
  addLog(5, 'Spectre', 'update', 'mission', mId, 'BLACKOUT', 'Updated objectives status');
  addLog(3, 'Viper', 'update', 'asset', aDc.id, 'DC01', 'Updated DC01 — domain admin path confirmed');
  addLog(2, 'Cipher', 'update', 'asset', aEc2.id, 'EC2 staging', 'Updated EC2 staging instance notes');
  addLog(1, 'Viper', 'update', 'mission', mId, 'BLACKOUT', 'Updated operation context notes');

  return { mission, zones, assets, subitems, tickets, messages, changelog };
}

// ─────────────────────────────────────────────────────────────────────────────
//  OPERATION 2 — GHOSTWIRE (cloud red team)
// ─────────────────────────────────────────────────────────────────────────────

function buildGhostWire() {
  const mId = id();

  const mission = {
    id: mId, codename: 'GHOSTWIRE',
    targets: [
      { id: id(), name: 'NovaTech Solutions' },
      { id: id(), name: 'AWS 123456789012' },
      { id: id(), name: 'novatech.io' },
    ],
    objectives: [
      { id: id(), text: 'Escalate from readonly-auditor to admin', status: 'achieved', createdAt: days(20), createdBy: 'Nomad' },
      { id: id(), text: 'Identify cross-account trust misconfigurations', status: 'in-progress', createdAt: days(20), createdBy: 'Cipher' },
      { id: id(), text: 'Exfiltrate sample data from staging', status: 'achieved', createdAt: days(20), createdBy: 'Nomad' },
      { id: id(), text: 'Test CloudTrail detection capabilities', status: 'in-progress', createdAt: days(20), createdBy: 'Phoenix' },
      { id: id(), text: 'Access EKS cluster secrets', status: 'pending', createdAt: days(15), createdBy: 'Cipher' },
    ],
    context: BRIEFING_GHOSTWIRE,
    timezone: 'Europe/London',
    createdAt: days(21), createdBy: 'Nomad',
    updatedAt: days(2), updatedBy: 'Cipher',
  };

  const zProd  = { id: id(), missionId: mId, name: 'AWS Production', network: 'eu-west-1', description: 'Production workloads — EKS, RDS, Lambda', createdAt: days(20), createdBy: 'Nomad' };
  const zStag  = { id: id(), missionId: mId, name: 'AWS Staging', network: 'eu-west-1 staging', description: 'Staging VPC — less restricted IAM policies', createdAt: days(18), createdBy: 'Cipher' };
  const zones = [zProd, zStag];

  const aEks = {
    id: id(), missionId: mId, zoneIds: [zProd.id], parentId: null,
    type: 'cloud', icon: 'cloud', name: 'EKS: novatech-prod',
    description: 'Kubernetes cluster — 128 pods, 12 namespaces', isKey: true,
    statuses: ['hvt', 'todo'], createdAt: days(19), createdBy: 'Nomad', updatedAt: days(5), updatedBy: 'Cipher',
  };
  const aRds = {
    id: id(), missionId: mId, zoneIds: [zProd.id], parentId: null,
    type: 'database', icon: 'database', name: 'RDS: prod-db',
    description: 'PostgreSQL 15.4 — prod-db.cluster-abc123.eu-west-1.rds.amazonaws.com', isKey: true,
    statuses: ['interesting'], createdAt: days(18), createdBy: 'Nomad', updatedAt: days(6), updatedBy: 'Nomad',
  };
  const aLambda = {
    id: id(), missionId: mId, zoneIds: [zProd.id], parentId: null,
    type: 'application', icon: 'lambda', name: 'Lambda: auth-handler',
    description: 'Authentication Lambda — processes OAuth flows, has DynamoDB access', isKey: false,
    statuses: ['interesting'], createdAt: days(16), createdBy: 'Phoenix', updatedAt: days(8), updatedBy: 'Phoenix',
  };
  const aStagEc2 = {
    id: id(), missionId: mId, zoneIds: [zStag.id], parentId: null,
    type: 'server', icon: 'cloud', name: 'EC2: i-staging-web01',
    description: 'Staging web server — overly permissive IAM role attached', isKey: false,
    statuses: ['pwned'], createdAt: days(15), createdBy: 'Cipher', updatedAt: days(4), updatedBy: 'Cipher',
  };
  const assets = [aEks, aRds, aLambda, aStagEc2];

  const subitems = [
    { id: id(), assetId: aEks.id, parentId: null, name: 'kubectl get pods', content: `NAMESPACE     NAME                                  READY   STATUS    RESTARTS   AGE
default       api-gateway-7b9d4c5f6a-x2k9m          1/1     Running   0          5d
default       auth-service-5c8d7e6f4b-j3n8p         1/1     Running   2          12d
default       payment-processor-9a1b2c3d4e-q5r6s    1/1     Running   0          3d
monitoring    prometheus-server-6f7g8h9i0j-k1l2m    1/1     Running   0          30d
monitoring    grafana-3n4o5p6q7r-s8t9u               1/1     Running   0          30d
kube-system   coredns-8w9x0y1z2a-b3c4d               2/2     Running   0          45d`, parsedType: null, statuses: [], createdAt: days(17), createdBy: 'Nomad' },
    { id: id(), assetId: aEks.id, parentId: null, name: 'kubectl get secrets', content: `NAMESPACE     NAME                         TYPE                                  DATA   AGE
default       api-tls                      kubernetes.io/tls                     2      30d
default       db-credentials               Opaque                                3      30d
default       stripe-api-key               Opaque                                1      30d
default       jwt-signing-key              Opaque                                1      30d
monitoring    grafana-admin                Opaque                                2      30d`, parsedType: null, statuses: ['pwned'], createdAt: days(10), createdBy: 'Cipher' },
    { id: id(), assetId: aRds.id, parentId: null, name: 'pg_dump (sample)', content: `-- PostgreSQL database dump
-- Dumped from database version 15.4
-- Table: users (first 5 rows)
COPY public.users (id, email, password_hash, role, created_at) FROM stdin;
1\tadmin@novatech.io\t$2b$12$LJ3m/I8jK7k...redacted\tadmin\t2024-01-15
2\tjdoe@novatech.io\t$2b$12$Nm4o/P9kL8l...redacted\tuser\t2024-02-20
3\tapi-service@internal\t$2b$12$Op5p/Q0lM9m...redacted\tservice\t2024-01-15
\\.\n-- Total rows: 142,847`, parsedType: null, statuses: ['interesting'], createdAt: days(12), createdBy: 'Nomad' },
    { id: id(), assetId: aStagEc2.id, parentId: null, name: 'IAM role policy', content: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "ec2:*",
        "iam:PassRole",
        "sts:AssumeRole",
        "lambda:*"
      ],
      "Resource": "*"
    }
  ]
}`, parsedType: null, statuses: ['pwned'], createdAt: days(14), createdBy: 'Cipher' },
  ];

  const tickets = [
    { id: id(), missionId: mId, title: 'IAM role allows sts:AssumeRole with wildcard', description: 'Staging EC2 instance role can assume ANY role in the account. Direct path to admin.', priority: 'critical', status: 'open', refType: 'asset', refId: aStagEc2.id, createdAt: days(14), createdBy: 'Cipher', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'EKS secrets not encrypted at rest', description: 'Kubernetes secrets are stored in etcd without KMS encryption. All secrets readable with cluster-admin.', priority: 'high', status: 'open', refType: 'asset', refId: aEks.id, createdAt: days(10), createdBy: 'Cipher', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'RDS snapshot publicly accessible', description: 'Found an RDS snapshot shared with account `*` (all AWS accounts). Contains full prod data.', priority: 'critical', status: 'open', refType: 'asset', refId: aRds.id, createdAt: days(8), createdBy: 'Nomad', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'CloudTrail not monitoring data events', description: 'CloudTrail only logs management events. S3 GetObject and Lambda Invoke are not tracked.', priority: 'medium', status: 'open', refType: null, refId: null, createdAt: days(6), createdBy: 'Phoenix', closedAt: null, closedBy: null },
  ];

  const messages = [
    { id: id(), ticketId: tickets[0].id, text: 'Used this to pivot:\n```bash\naws sts assume-role --role-arn arn:aws:iam::123456789012:role/AdminRole --role-session-name pwned\n```\nGot full admin credentials. 🔓', author: 'Cipher', createdAt: days(13) },
    { id: id(), ticketId: tickets[0].id, text: 'This is the **#1 finding** for this engagement. The staging IAM role should be completely locked down.', author: 'Nomad', createdAt: days(12) },
    { id: id(), ticketId: tickets[2].id, text: 'Snapshot ID: `rds:prod-db-2026-03-15-backup`\nRestored to our own account and extracted the full users table.', author: 'Nomad', createdAt: days(7) },
  ];

  const changelog = [];
  const addLog = (d, op, action, eType, eId, eName, desc) => {
    changelog.push({ id: id(), missionId: mId, timestamp: days(d), operator: op, action, entityType: eType, entityId: eId, entityName: eName, description: desc, previousState: null, newState: null });
  };

  addLog(21, 'Nomad', 'create', 'mission', mId, 'GHOSTWIRE', 'Created operation "GHOSTWIRE"');
  addLog(20, 'Nomad', 'create', 'zone', zProd.id, 'AWS Production', 'Created zone "AWS Production"');
  addLog(19, 'Nomad', 'create', 'asset', aEks.id, 'EKS cluster', 'Created asset "EKS: novatech-prod"');
  addLog(18, 'Cipher', 'create', 'zone', zStag.id, 'AWS Staging', 'Created zone "AWS Staging"');
  addLog(18, 'Nomad', 'create', 'asset', aRds.id, 'RDS', 'Created asset "RDS: prod-db"');
  addLog(17, 'Nomad', 'create', 'subitem', subitems[0].id, 'kubectl get pods', 'Added data item to EKS');
  addLog(16, 'Phoenix', 'create', 'asset', aLambda.id, 'Lambda', 'Created asset "Lambda: auth-handler"');
  addLog(15, 'Cipher', 'create', 'asset', aStagEc2.id, 'EC2 staging', 'Created asset "EC2: i-staging-web01"');
  addLog(14, 'Cipher', 'create', 'subitem', subitems[3].id, 'IAM policy', 'Added data item "IAM role policy" to EC2 staging');
  addLog(14, 'Cipher', 'create', 'ticket', tickets[0].id, tickets[0].title, `Created ticket "${tickets[0].title}"`);
  addLog(12, 'Nomad', 'create', 'subitem', subitems[2].id, 'pg_dump', 'Added data item "pg_dump sample" to RDS');
  addLog(10, 'Cipher', 'create', 'subitem', subitems[1].id, 'secrets', 'Added data item "kubectl get secrets" to EKS');
  addLog(10, 'Cipher', 'create', 'ticket', tickets[1].id, tickets[1].title, `Created ticket "${tickets[1].title}"`);
  addLog(8, 'Nomad', 'create', 'ticket', tickets[2].id, tickets[2].title, `Created ticket "${tickets[2].title}"`);
  addLog(6, 'Phoenix', 'create', 'ticket', tickets[3].id, tickets[3].title, `Created ticket "${tickets[3].title}"`);
  addLog(5, 'Cipher', 'update', 'asset', aEks.id, 'EKS', 'Updated EKS — added secrets enumeration');
  addLog(3, 'Nomad', 'update', 'mission', mId, 'GHOSTWIRE', 'Updated objectives — escalation achieved');
  addLog(2, 'Cipher', 'update', 'mission', mId, 'GHOSTWIRE', 'Updated mission briefing');

  return { mission, zones, assets, subitems, tickets, messages, changelog };
}

// ─────────────────────────────────────────────────────────────────────────────
//  OPERATION 3 — REDSAND (purple team / AD focus)
// ─────────────────────────────────────────────────────────────────────────────

function buildRedSand() {
  const mId = id();

  const mission = {
    id: mId, codename: 'REDSAND',
    targets: [
      { id: id(), name: 'GlobalBank Financial' },
      { id: id(), name: 'globalbank.corp' },
    ],
    objectives: [
      { id: id(), text: 'Achieve domain admin via Kerberos attacks', status: 'achieved', createdAt: days(14), createdBy: 'Spectre' },
      { id: id(), text: 'Execute Mimikatz without triggering EDR', status: 'in-progress', createdAt: days(14), createdBy: 'Viper' },
      { id: id(), text: 'Exfiltrate data without triggering DLP', status: 'pending', createdAt: days(14), createdBy: 'Ghost' },
      { id: id(), text: 'Establish C2 persistence via scheduled task', status: 'achieved', createdAt: days(14), createdBy: 'Spectre' },
    ],
    context: BRIEFING_REDSAND,
    timezone: 'America/Chicago',
    createdAt: days(14), createdBy: 'Spectre',
    updatedAt: days(1), updatedBy: 'Spectre',
  };

  const zAd   = { id: id(), missionId: mId, name: 'AD Domain', network: '10.10.0.0/16', description: 'Active Directory domain — globalbank.corp', createdAt: days(13), createdBy: 'Spectre' };
  const zDmz  = { id: id(), missionId: mId, name: 'Bank DMZ', network: '192.168.1.0/24', description: 'DMZ — web banking portal and APIs', createdAt: days(12), createdBy: 'Viper' };
  const zones = [zAd, zDmz];

  const aDc1 = {
    id: id(), missionId: mId, zoneIds: [zAd.id], parentId: null,
    type: 'server', icon: 'server-windows', name: 'GBDC01 (10.10.0.1)',
    description: 'Primary DC — Windows Server 2022', isKey: true,
    statuses: ['pwned', 'hvt'], createdAt: days(13), createdBy: 'Spectre', updatedAt: days(4), updatedBy: 'Spectre',
  };
  const aExch = {
    id: id(), missionId: mId, zoneIds: [zAd.id, zDmz.id], parentId: null,
    type: 'server', icon: 'server-windows', name: 'GBEXCH01 (10.10.0.5)',
    description: 'Exchange Server 2019 — also exposed in DMZ on 192.168.1.5', isKey: true,
    statuses: ['interesting'], createdAt: days(11), createdBy: 'Viper', updatedAt: days(6), updatedBy: 'Viper',
  };
  const aWs1 = {
    id: id(), missionId: mId, zoneIds: [zAd.id], parentId: null,
    type: 'workstation', icon: 'desktop', name: 'WS-FINANCE01 (10.10.5.10)',
    description: 'Finance department workstation — Windows 11', isKey: false,
    statuses: ['pwned'], createdAt: days(10), createdBy: 'Ghost', updatedAt: days(5), updatedBy: 'Ghost',
  };
  const aWebBank = {
    id: id(), missionId: mId, zoneIds: [zDmz.id], parentId: null,
    type: 'application', icon: 'webapp', name: 'Web Banking Portal',
    description: 'Internet banking at banking.globalbank.com — Java/Spring Boot', isKey: false,
    statuses: ['todo'], createdAt: days(12), createdBy: 'Viper', updatedAt: days(9), updatedBy: 'Viper',
  };
  const assets = [aDc1, aExch, aWs1, aWebBank];

  const subitems = [
    { id: id(), assetId: aDc1.id, parentId: null, name: 'Domain users dump', content: `sAMAccountName    | displayName           | memberOf
administrator     | Domain Admin          | Domain Admins; Enterprise Admins
svc_sql           | SQL Service           | SQL Admins; Server Operators
svc_backup        | Backup Service        | Backup Operators
j.smith           | John Smith            | Finance; Domain Users
a.johnson         | Alice Johnson         | IT Admins; Domain Users
m.chen            | Michael Chen          | Development; Domain Users
s.mitchell        | Sarah Mitchell        | Executive; Domain Users
t.williams        | Tom Williams          | Helpdesk; Domain Users
backup.admin      | Backup Admin          | Backup Operators; Server Operators`, parsedType: 'net_user', statuses: [], createdAt: days(12), createdBy: 'Spectre' },
    { id: id(), assetId: aDc1.id, parentId: null, name: 'NTDS.dit hashes', content: `Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971889:::
svc_sql:1103:aad3b435b51404eeaad3b435b51404ee:e6f01fc9ae3bbac22e3d05e0479ed003:::
svc_backup:1104:aad3b435b51404eeaad3b435b51404ee:32ed87bdb5fdc5e9cba88547376818d4:::
j.smith:1105:aad3b435b51404eeaad3b435b51404ee:58a478135a93ac3bf058a5ea0e8fdb71:::
a.johnson:1106:aad3b435b51404eeaad3b435b51404ee:7dd5a6b2c1e3f4a5b6c7d8e9f0a1b2c3:::
backup.admin:1110:aad3b435b51404eeaad3b435b51404ee:b5f7e8a9c0d1e2f3a4b5c6d7e8f9a0b1:::`, parsedType: 'hash_list', statuses: ['pwned'], createdAt: days(5), createdBy: 'Spectre' },
    { id: id(), assetId: aWs1.id, parentId: null, name: 'Keylogged credentials', content: `# Captured via keylogger on WS-FINANCE01
# Date: 2026-03-28
j.smith / Fin@nce2026! — logged into SAP portal
j.smith / Fin@nce2026! — logged into banking.globalbank.com/admin
j.smith → opened file: Q1_Financial_Report_CONFIDENTIAL.xlsx`, parsedType: null, statuses: ['pwned'], createdAt: days(5), createdBy: 'Ghost' },
  ];

  const tickets = [
    { id: id(), missionId: mId, title: 'Domain Admin achieved via AS-REP Roasting', description: 'backup.admin account had pre-authentication disabled. Cracked offline in 3 minutes. Account is member of Server Operators → DA path.', priority: 'critical', status: 'closed', refType: 'asset', refId: aDc1.id, createdAt: days(9), createdBy: 'Spectre', closedAt: days(4), closedBy: 'Spectre' },
    { id: id(), missionId: mId, title: 'EDR bypass needed for Mimikatz', description: 'CrowdStrike Falcon blocking standard Mimikatz. Need to test AMSI bypass or use alternative credential dumping.', priority: 'high', status: 'open', refType: 'asset', refId: aDc1.id, createdAt: days(7), createdBy: 'Viper', closedAt: null, closedBy: null },
    { id: id(), missionId: mId, title: 'Exchange ProxyLogon check', description: 'GBEXCH01 running Exchange 2019 CU12. Need to verify patch level for ProxyLogon/ProxyShell vulnerabilities.', priority: 'medium', status: 'open', refType: 'asset', refId: aExch.id, createdAt: days(10), createdBy: 'Viper', closedAt: null, closedBy: null },
  ];

  const messages = [
    { id: id(), ticketId: tickets[0].id, text: 'Attack chain:\n1. AS-REP roast `backup.admin`\n2. Cracked with hashcat: `BackupAdmin2025!`\n3. `backup.admin` → Server Operators\n4. Used Server Operators to modify GPO → added ourselves to Domain Admins\n\n**Total time: 47 minutes** from initial access to DA.', author: 'Spectre', createdAt: days(8) },
    { id: id(), ticketId: tickets[0].id, text: 'Impressive speed. The SOC didn\'t alert on any of this. Logging gap confirmed — no monitoring on Kerberos pre-auth failures.', author: 'Ghost', createdAt: days(7) },
    { id: id(), ticketId: tickets[1].id, text: 'Tried `Invoke-Mimikatz` — blocked immediately. Also tried:\n- `SafetyKatz` — blocked\n- `SharpKatz` — blocked\n- Direct LSASS dump via `comsvcs.dll` — **succeeded!** 🎉\n\n```\nrundll32.exe C:\\Windows\\System32\\comsvcs.dll, MiniDump <LSASS_PID> C:\\temp\\lsass.dmp full\n```', author: 'Viper', createdAt: days(5) },
  ];

  const changelog = [];
  const addLog = (d, op, action, eType, eId, eName, desc) => {
    changelog.push({ id: id(), missionId: mId, timestamp: days(d), operator: op, action, entityType: eType, entityId: eId, entityName: eName, description: desc, previousState: null, newState: null });
  };

  addLog(14, 'Spectre', 'create', 'mission', mId, 'REDSAND', 'Created operation "REDSAND"');
  addLog(13, 'Spectre', 'create', 'zone', zAd.id, 'AD Domain', 'Created zone "AD Domain"');
  addLog(13, 'Spectre', 'create', 'asset', aDc1.id, 'GBDC01', 'Created asset "GBDC01 (10.10.0.1)"');
  addLog(12, 'Viper', 'create', 'zone', zDmz.id, 'Bank DMZ', 'Created zone "Bank DMZ"');
  addLog(12, 'Viper', 'create', 'asset', aWebBank.id, 'Web Banking', 'Created asset "Web Banking Portal"');
  addLog(12, 'Spectre', 'create', 'subitem', subitems[0].id, 'Domain users', 'Added data item "Domain users dump" to GBDC01');
  addLog(11, 'Viper', 'create', 'asset', aExch.id, 'GBEXCH01', 'Created asset "GBEXCH01 (10.10.0.5)"');
  addLog(10, 'Ghost', 'create', 'asset', aWs1.id, 'WS-FINANCE01', 'Created asset "WS-FINANCE01 (10.10.5.10)"');
  addLog(10, 'Viper', 'create', 'ticket', tickets[2].id, tickets[2].title, `Created ticket "${tickets[2].title}"`);
  addLog(9, 'Spectre', 'create', 'ticket', tickets[0].id, tickets[0].title, `Created ticket "${tickets[0].title}"`);
  addLog(7, 'Viper', 'create', 'ticket', tickets[1].id, tickets[1].title, `Created ticket "${tickets[1].title}"`);
  addLog(5, 'Spectre', 'create', 'subitem', subitems[1].id, 'NTDS.dit', 'Added data item "NTDS.dit hashes" to GBDC01');
  addLog(5, 'Ghost', 'create', 'subitem', subitems[2].id, 'Keylogger', 'Added data item "Keylogged credentials" to WS-FINANCE01');
  addLog(4, 'Spectre', 'update', 'asset', aDc1.id, 'GBDC01', 'Updated GBDC01 — domain admin achieved');
  addLog(3, 'Viper', 'update', 'asset', aExch.id, 'GBEXCH01', 'Checking Exchange patch level');
  addLog(1, 'Spectre', 'update', 'mission', mId, 'REDSAND', 'Updated mission briefing');

  return { mission, zones, assets, subitems, tickets, messages, changelog };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEED / CLEAR
// ─────────────────────────────────────────────────────────────────────────────

async function seedOperation(data) {
  await DB.saveMission(data.mission);
  for (const z of data.zones)     await DB.saveZone(z);
  for (const a of data.assets)    await DB.saveAsset(a);
  for (const s of data.subitems)  await DB.saveSubitem(s);
  for (const t of data.tickets)   await DB.saveTicket(t);
  for (const m of data.messages)  await DB.saveTicketMessage(m);
  for (const c of data.changelog) await DB.saveChangelogEntry(c);
}

/**
 * Public API — generates all demo data and stores it in the DB.
 * Returns the list of generated mission IDs so they can be tracked.
 */
export async function loadDemoData() {
  const ops = [buildBlackout(), buildGhostWire(), buildRedSand()];
  const missionIds = [];
  for (const op of ops) {
    await seedOperation(op);
    missionIds.push(op.mission.id);
  }
  // Store generated mission IDs so we can remove them later
  await DB.setSetting('demoMissionIds', missionIds);
  return missionIds;
}

/**
 * Removes all demo data from the DB.
 */
export async function clearDemoData() {
  const ids = (await DB.getSetting('demoMissionIds')) || [];
  for (const mId of ids) {
    await DB.deleteMission(mId);
  }
  await DB.setSetting('demoMissionIds', null);
  return ids.length;
}

/**
 * Returns true if demo data is currently loaded.
 */
export async function isDemoLoaded() {
  const ids = (await DB.getSetting('demoMissionIds')) || [];
  if (!ids.length) return false;
  // Verify at least one demo mission still exists
  for (const mId of ids) {
    const m = await DB.getMission(mId);
    if (m) return true;
  }
  return false;
}
