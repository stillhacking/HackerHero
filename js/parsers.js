/**
 * @fileoverview Command Output Parsers for HackerHero
 *
 * Each parser can:
 *  1. `detect(text)` → confidence score 0..1  (is this text of this type?)
 *  2. `parse(text)`  → structured data object
 *  3. `suggestName(parsedData)` → suggested asset / subitem name
 *  4. `suggestItemName(parsedData)` → suggested subitem label
 *
 * Adding a new parser:
 *  - Create an object following the ParserDef interface below
 *  - Append it to the PARSERS array at the bottom of this file
 *  - That's it — the rest of the app picks it up automatically
 *
 * @module parsers
 */

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the number of regex matches in text, clamped to [0,1] by dividing
 * by `divisor`.  Useful for confidence scoring.
 * @param {string} text
 * @param {RegExp} regex
 * @param {number} [divisor=1]
 * @returns {number}
 */
function score(text, regex, divisor = 1) {
  const matches = (text.match(regex) || []).length;
  return Math.min(1, matches / divisor);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PARSER DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `ip addr` / `ip addr show` parser.
 * Extracts interface names, MAC addresses, IPv4/IPv6 addresses.
 */
const IP_ADDR = {
  id:    'ip_addr',
  label: 'Linux ip addr',
  icon:  '🐧',

  detect(text) {
    let s = 0;
    if (/^\d+:\s+\w+:/m.test(text))  s += 0.4;
    if (/link\/ether/i.test(text))    s += 0.3;
    if (/inet\s+\d+\.\d+/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const interfaces = [];
    // Split into interface blocks (start with `\d+: name:`)
    const blocks = text.split(/(?=^\d+:\s+\w)/m).filter(Boolean);
    for (const block of blocks) {
      const nameMatch  = block.match(/^\d+:\s+(\S+):/m);
      const macMatch   = block.match(/link\/ether\s+([\da-f:]+)/i);
      const inet4      = [...block.matchAll(/inet\s+([\d.]+)\/(\d+)/g)];
      const inet6      = [...block.matchAll(/inet6\s+([0-9a-f:]+)\/(\d+)/gi)];
      const state      = (block.match(/state\s+(\w+)/i) || [])[1] || '';

      if (!nameMatch) continue;
      interfaces.push({
        name: nameMatch[1].replace(/@.*/, ''),
        mac:  macMatch ? macMatch[1] : null,
        ipv4: inet4.map((m) => `${m[1]}/${m[2]}`),
        ipv6: inet6.map((m) => `${m[1]}/${m[2]}`),
        state,
      });
    }
    return { interfaces };
  },

  suggestName(parsedData) {
    // Use the first non-loopback IPv4 address as machine name
    for (const iface of parsedData.interfaces || []) {
      if (iface.name !== 'lo' && iface.ipv4.length) {
        return iface.ipv4[0].split('/')[0];
      }
    }
    return null;
  },

  suggestItemName() { return 'ip addr'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux/macOS `ifconfig` parser.
 */
const IFCONFIG = {
  id:    'ifconfig',
  label: 'ifconfig',
  icon:  '🐧',

  detect(text) {
    let s = 0;
    if (/^\w[\w.]+:\s/m.test(text))           s += 0.3;
    if (/inet addr:/i.test(text) || /inet \d/i.test(text)) s += 0.3;
    if (/ether\s+[\da-f:]+/i.test(text))      s += 0.2;
    if (/RX packets|TX packets/i.test(text))  s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const interfaces = [];
    const blocks = text.split(/\n(?=\S)/).filter(Boolean);
    for (const block of blocks) {
      const nameMatch = block.match(/^([\w.]+)[\s:]/);
      const macMatch  = block.match(/ether\s+([\da-f:]+)/i) ||
                        block.match(/HWaddr\s+([\da-f:]+)/i);
      const inet4     = [...block.matchAll(/inet (?:addr:)?([\d.]+)/gi)];
      const inet6     = [...block.matchAll(/inet6 (?:addr:)?([0-9a-f:]+)/gi)];
      if (!nameMatch) continue;
      interfaces.push({
        name: nameMatch[1],
        mac:  macMatch ? macMatch[1] : null,
        ipv4: inet4.map((m) => m[1]),
        ipv6: inet6.map((m) => m[1]),
      });
    }
    return { interfaces };
  },

  suggestName(parsedData) {
    for (const iface of parsedData.interfaces || []) {
      if (!['lo', 'lo0'].includes(iface.name) && iface.ipv4.length) {
        return iface.ipv4[0];
      }
    }
    return null;
  },

  suggestItemName() { return 'ifconfig'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `ipconfig /all` parser.
 */
const IPCONFIG = {
  id:    'ipconfig',
  label: 'Windows ipconfig',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/Windows IP Configuration/i.test(text)) s += 0.5;
    if (/IPv4 Address/i.test(text))             s += 0.3;
    if (/Physical Address/i.test(text))         s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const interfaces = [];
    const blocks = text.split(/\r?\n\r?\n/).filter(Boolean);
    let hostname = null;

    const hostMatch = text.match(/Host Name[\s.]+:\s*(.+)/i);
    if (hostMatch) hostname = hostMatch[1].trim();

    for (const block of blocks) {
      const nameMatch = block.match(/^(Ethernet adapter|Wireless LAN adapter|Tunnel adapter)[^:]*:/im);
      if (!nameMatch) continue;
      const mac   = (block.match(/Physical Address[\s.]+:\s*([\dA-F-]+)/i) || [])[1];
      const ipv4  = [...block.matchAll(/IPv4 Address[\s.]+:\s*([\d.]+)/gi)].map((m) => m[1]);
      const ipv6  = [...block.matchAll(/IPv6 Address[\s.]+:\s*([0-9a-f:]+)/gi)].map((m) => m[1]);
      const gw    = (block.match(/Default Gateway[\s.]+:\s*([\d.]+)/i) || [])[1];
      const dns   = [...block.matchAll(/DNS Servers[\s.]+:\s*([\d.]+)/gi)].map((m) => m[1]);
      interfaces.push({
        name: nameMatch[0].replace(':', '').trim(),
        mac:  mac || null,
        ipv4, ipv6, gateway: gw || null, dns,
      });
    }
    return { hostname, interfaces };
  },

  suggestName(parsedData) {
    if (parsedData.hostname) return parsedData.hostname;
    for (const iface of parsedData.interfaces || []) {
      if (iface.ipv4.length) return iface.ipv4[0];
    }
    return null;
  },

  suggestItemName() { return 'ipconfig /all'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * nmap scan output parser.
 * Supports both "normal" (-oN) and greppable (-oG) formats.
 */
const NMAP = {
  id:    'nmap',
  label: 'nmap scan',
  icon:  '🔍',

  detect(text) {
    let s = 0;
    if (/Nmap scan report for/i.test(text))         s += 0.4;
    if (/Nmap \d+\.\d+/i.test(text))                s += 0.2;
    if (/\/tcp\s+open|\/udp\s+open/i.test(text))    s += 0.3;
    if (/Host:\s+\d+\.\d+.*Ports:/i.test(text))     s += 0.3; // greppable
    return Math.min(1, s);
  },

  parse(text) {
    const hosts = [];

    // ── Normal format ─────────────────────────────────────────────────────
    const hostBlocks = text.split(/(?=Nmap scan report for)/i).filter(Boolean);
    for (const block of hostBlocks) {
      const hostLine = block.match(/Nmap scan report for (.+)/i);
      if (!hostLine) continue;

      const rawHost = hostLine[1].trim();
      const ipMatch = rawHost.match(/\(?([\d.]+)\)?$/);
      const hostname = rawHost.replace(/\s*\([\d.]+\)/, '').trim();

      const ports = [];
      const portRe = /(\d+)\/(tcp|udp)\s+(\w+)\s+(\S+)\s*(.*)/gi;
      let m;
      while ((m = portRe.exec(block)) !== null) {
        ports.push({
          port:     parseInt(m[1], 10),
          protocol: m[2],
          state:    m[3],
          service:  m[4],
          version:  m[5].trim(),
        });
      }

      const osMatch = block.match(/OS details?:\s*(.+)/i) ||
                      block.match(/Running:\s*(.+)/i);

      hosts.push({
        ip:       ipMatch ? ipMatch[1] : rawHost,
        hostname: hostname !== rawHost ? hostname : null,
        ports,
        os:       osMatch ? osMatch[1].trim() : null,
      });
    }

    // ── Greppable format ──────────────────────────────────────────────────
    if (hosts.length === 0) {
      const lineRe = /Host:\s+([\d.]+)\s+\(([^)]*)\)\s+Ports:\s*(.+)/gi;
      while ((m = lineRe.exec(text)) !== null) {
        const ports = m[3].split(',').map((p) => {
          const parts = p.trim().split('/');
          return {
            port:     parseInt(parts[0], 10),
            state:    parts[1],
            protocol: parts[2],
            service:  parts[4],
            version:  parts[6] || '',
          };
        });
        hosts.push({ ip: m[1], hostname: m[2] || null, ports, os: null });
      }
    }

    return { hosts };
  },

  suggestName(parsedData) {
    if (parsedData.hosts && parsedData.hosts.length > 0) {
      const h = parsedData.hosts[0];
      return h.hostname || h.ip;
    }
    return null;
  },

  suggestItemName() { return 'nmap scan'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux/Windows `netstat -an` output parser.
 * Extracts listening ports and established connections.
 */
const NETSTAT = {
  id:    'netstat',
  label: 'netstat',
  icon:  '📡',

  detect(text) {
    let s = 0;
    if (/Active (Internet|Network) connections/i.test(text)) s += 0.4;
    if (/Proto\s+Recv-Q|TCP\s+\d+\.\d+/i.test(text))        s += 0.3;
    if (/LISTEN|ESTABLISHED|TIME_WAIT/i.test(text))          s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const connections = [];
    const re = /^(tcp|udp|tcp6|udp6)\s+\d+\s+\d+\s+(\S+)\s+(\S+)\s+(\w+)/gim;
    // Windows format
    const reWin = /^\s*(TCP|UDP)\s+(\S+)\s+(\S+)\s+(\w+)/gim;
    let m;

    const parseAddr = (addr) => {
      const last = addr.lastIndexOf(':');
      return { addr: addr.slice(0, last), port: addr.slice(last + 1) };
    };

    while ((m = re.exec(text)) !== null) {
      connections.push({
        proto:  m[1],
        local:  parseAddr(m[2]),
        remote: parseAddr(m[3]),
        state:  m[4],
      });
    }

    if (connections.length === 0) {
      while ((m = reWin.exec(text)) !== null) {
        connections.push({
          proto:  m[1],
          local:  parseAddr(m[2]),
          remote: parseAddr(m[3]),
          state:  m[4],
        });
      }
    }

    const listening = connections.filter((c) => c.state === 'LISTEN' || c.state === 'LISTENING');
    return { connections, listening };
  },

  suggestName() { return null; },
  suggestItemName() { return 'netstat'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `ps aux` output parser.
 */
const PS_AUX = {
  id:    'ps_aux',
  label: 'ps aux',
  icon:  '⚙️',

  detect(text) {
    let s = 0;
    if (/^USER\s+PID\s+%CPU/im.test(text))  s += 0.6;
    if (/^\w+\s+\d+\s+[\d.]+\s+[\d.]+/m.test(text)) s += 0.4;
    return Math.min(1, s);
  },

  parse(text) {
    const lines = text.split('\n').filter(Boolean);
    const processes = [];
    // Skip header
    for (const line of lines.slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) continue;
      processes.push({
        user:    parts[0],
        pid:     parseInt(parts[1], 10),
        cpu:     parseFloat(parts[2]),
        mem:     parseFloat(parts[3]),
        command: parts.slice(10).join(' '),
      });
    }
    return { processes };
  },

  suggestName() { return null; },
  suggestItemName() { return 'ps aux'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `systeminfo` parser.
 */
const SYSTEMINFO = {
  id:    'systeminfo',
  label: 'Windows systeminfo',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/Host Name:/i.test(text))       s += 0.3;
    if (/OS Name:/i.test(text))         s += 0.3;
    if (/System Type:/i.test(text))     s += 0.2;
    if (/Total Physical Memory/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const get = (label) => {
      const m = text.match(new RegExp(`${label}:\\s*(.+)`, 'i'));
      return m ? m[1].trim() : null;
    };
    return {
      hostname:    get('Host Name'),
      os:          get('OS Name'),
      version:     get('OS Version'),
      arch:        get('System Type'),
      ram:         get('Total Physical Memory'),
      domain:      get('Domain'),
      logonServer: get('Logon Server'),
    };
  },

  suggestName(parsedData) { return parsedData.hostname || null; },
  suggestItemName() { return 'systeminfo'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `net user` output parser.
 */
const NET_USER = {
  id:    'net_user',
  label: 'Windows net user',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/User accounts for \\\\/i.test(text))   s += 0.4;
    if (/The command completed successfully/i.test(text)) s += 0.3;
    if (/User name\s+\w/i.test(text))           s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    // net user /domain lists  (multiple)
    if (/User accounts for/i.test(text)) {
      const users = text
        .replace(/[-]+/g, '')
        .replace(/User accounts for .+/i, '')
        .replace(/The command completed successfully.?/i, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      return { users };
    }
    // net user <username> detail
    const get = (label) => {
      const m = text.match(new RegExp(`${label}\\s+(.+)`, 'i'));
      return m ? m[1].trim() : null;
    };
    return {
      username:   get('User name'),
      fullName:   get('Full Name'),
      active:     get('Account active'),
      lastLogon:  get('Last logon'),
      groups:     get('Local Group Memberships') || get('Global Group Memberships'),
    };
  },

  suggestName(parsedData) { return parsedData.username || null; },
  suggestItemName() { return 'net user'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `uname -a` parser (Linux/macOS).
 */
const UNAME = {
  id:    'uname',
  label: 'uname -a',
  icon:  '🐧',

  detect(text) {
    const re = /^(Linux|Darwin|FreeBSD)\s+\S+\s+[\d.]+/im;
    return re.test(text.trim()) ? 0.9 : 0;
  },

  parse(text) {
    const parts = text.trim().split(/\s+/);
    return {
      os:       parts[0] || null,
      hostname: parts[1] || null,
      kernel:   parts[2] || null,
      arch:     parts[parts.length - 2] || null,
      full:     text.trim(),
    };
  },

  suggestName(parsedData) { return parsedData.hostname || null; },
  suggestItemName() { return 'uname -a'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic port scan result (one host:port per line style).
 * Catches things like masscan, simple grep output, etc.
 */
const PORT_SCAN = {
  id:    'port_scan',
  label: 'Port scan results',
  icon:  '🔍',

  detect(text) {
    const lines = text.split('\n').filter(Boolean);
    const portLines = lines.filter((l) => /\d+\.\d+\.\d+\.\d+\s*:\s*\d+/.test(l) ||
                                          /open\s+\d+\//.test(l));
    return portLines.length >= 2 ? Math.min(1, portLines.length / lines.length * 2) : 0;
  },

  parse(text) {
    const results = [];
    // masscan style: open tcp 80 192.168.1.1 ...
    const massRe = /open\s+(tcp|udp)\s+(\d+)\s+([\d.]+)/gi;
    let m;
    while ((m = massRe.exec(text)) !== null) {
      results.push({ ip: m[3], port: parseInt(m[2], 10), protocol: m[1] });
    }
    // ip:port style
    if (results.length === 0) {
      const ipPortRe = /([\d.]+)\s*:\s*(\d+)/g;
      while ((m = ipPortRe.exec(text)) !== null) {
        results.push({ ip: m[1], port: parseInt(m[2], 10), protocol: 'tcp' });
      }
    }
    return { results };
  },

  suggestName(parsedData) {
    if (parsedData.results && parsedData.results.length) {
      return parsedData.results[0].ip;
    }
    return null;
  },
  suggestItemName() { return 'port scan'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux /etc/passwd parser.
 * Detects and summarizes account entries.
 */
const ETC_PASSWD = {
  id:    'etc_passwd',
  label: '/etc/passwd',
  icon:  '🔐',

  detect(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return 0;

    // Typical passwd line: user:x:1000:1000:comment:/home/user:/bin/bash
    const passwdLike = lines.filter((l) => /^[^:\s]+:[^:]*:\d+:\d+:[^:]*:[^:]*:[^:\s]+$/.test(l));
    const ratio = passwdLike.length / lines.length;

    let s = 0;
    if (ratio >= 0.6) s += 0.7;
    if (/^root:[^:]*:0:0:/m.test(text)) s += 0.2;
    if (/\/bin\/(bash|sh|zsh|false|nologin)/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const users = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(':');
        if (parts.length < 7) return null;
        return {
          username: parts[0],
          uid: Number(parts[2]),
          gid: Number(parts[3]),
          gecos: parts[4],
          home: parts[5],
          shell: parts[6],
        };
      })
      .filter(Boolean);

    return {
      users,
      count: users.length,
      privileged: users.filter((u) => u.uid === 0).map((u) => u.username),
    };
  },

  suggestName() { return null; },
  suggestItemName() { return '/etc/passwd'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `/etc/shadow` parser.
 * Detects shadow-format password hashes.
 */
const ETC_SHADOW = {
  id:    'etc_shadow',
  label: '/etc/shadow',
  icon:  '🔐',

  detect(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return 0;
    // shadow line: user:$hash:days:...
    const shadowLike = lines.filter((l) => /^[^:\s]+:(\$\d\$|!|\*|)[^:]*:\d*:\d*:\d*:\d*/.test(l));
    let s = 0;
    if (shadowLike.length / lines.length >= 0.5) s += 0.7;
    if (/^root:\$/.test(text)) s += 0.2;
    if (/\$6\$|\$y\$|\$5\$|\$2[aby]\$|\$1\$/m.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = text.split(/\r?\n/).filter(Boolean).map((line) => {
      const p = line.split(':');
      if (p.length < 8) return null;
      return {
        username: p[0],
        hash: p[1],
        hasPassword: !['!', '*', '!!', ''].includes(p[1]),
        lastChanged: p[2] ? Number(p[2]) : null,
        hashType: (p[1].match(/^\$(\w+)\$/) || [])[1] || null,
      };
    }).filter(Boolean);
    return {
      entries,
      count: entries.length,
      withPassword: entries.filter((e) => e.hasPassword).map((e) => e.username),
    };
  },

  suggestName() { return null; },
  suggestItemName() { return '/etc/shadow'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `/etc/hosts` parser.
 */
const ETC_HOSTS = {
  id:    'etc_hosts',
  label: '/etc/hosts',
  icon:  '🌐',

  detect(text) {
    let s = 0;
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
    if (/^127\.0\.0\.1\s+localhost/m.test(text)) s += 0.5;
    if (/^::1\s+localhost/m.test(text)) s += 0.2;
    const hostLines = lines.filter((l) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s+\S+/.test(l));
    if (hostLines.length >= 2) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = text.split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) return null;
        return { ip: parts[0], hostnames: parts.slice(1) };
      }).filter(Boolean);
    return { entries };
  },

  suggestName() { return null; },
  suggestItemName() { return '/etc/hosts'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `/etc/group` parser.
 */
const ETC_GROUP = {
  id:    'etc_group',
  label: '/etc/group',
  icon:  '👥',

  detect(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return 0;
    // group line: name:x:gid:members
    const groupLike = lines.filter((l) => /^[^:\s]+:[^:]*:\d+:/.test(l));
    let s = 0;
    if (groupLike.length / lines.length >= 0.5) s += 0.6;
    if (/^root:[^:]*:0:/m.test(text)) s += 0.2;
    if (/^(sudo|wheel|adm):/m.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const groups = text.split(/\r?\n/).filter(Boolean).map((line) => {
      const p = line.split(':');
      if (p.length < 4) return null;
      return {
        name: p[0],
        gid: Number(p[2]),
        members: p[3] ? p[3].split(',').filter(Boolean) : [],
      };
    }).filter(Boolean);
    return {
      groups,
      privileged: groups.filter((g) => ['root', 'sudo', 'wheel', 'adm', 'docker'].includes(g.name)),
    };
  },

  suggestName() { return null; },
  suggestItemName() { return '/etc/group'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `id` / `whoami` parser.
 */
const ID_WHOAMI = {
  id:    'id_whoami',
  label: 'id / whoami',
  icon:  '🐧',

  detect(text) {
    const trimmed = text.trim();
    let s = 0;
    if (/^uid=\d+\([^)]+\)\s+gid=\d+/m.test(trimmed)) s += 0.9;
    else if (/^(root|[\w-]+)$/m.test(trimmed) && trimmed.split('\n').length <= 2) s += 0.3;
    if (/groups=\d+/m.test(trimmed)) s += 0.1;
    return Math.min(1, s);
  },

  parse(text) {
    const trimmed = text.trim();
    const idMatch = trimmed.match(/uid=(\d+)\(([^)]+)\)\s+gid=(\d+)\(([^)]+)\)/);
    if (idMatch) {
      const groupsRaw = trimmed.match(/groups=(.+)/);
      const groups = groupsRaw
        ? [...groupsRaw[1].matchAll(/(\d+)\(([^)]+)\)/g)].map((m) => ({ gid: Number(m[1]), name: m[2] }))
        : [];
      return {
        uid: Number(idMatch[1]),
        username: idMatch[2],
        gid: Number(idMatch[3]),
        group: idMatch[4],
        groups,
        isRoot: Number(idMatch[1]) === 0,
      };
    }
    return { username: trimmed.split('\n')[0].trim(), uid: null, isRoot: trimmed.trim() === 'root' };
  },

  suggestName(parsedData) { return parsedData.username || null; },
  suggestItemName() { return 'id'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `sudo -l` parser.
 */
const SUDO_L = {
  id:    'sudo_l',
  label: 'sudo -l',
  icon:  '🔑',

  detect(text) {
    let s = 0;
    if (/matching defaults entries/i.test(text)) s += 0.3;
    if (/User \w+ may run/i.test(text)) s += 0.4;
    if (/\(ALL\s*:\s*ALL\)\s+(ALL|NOPASSWD)/i.test(text)) s += 0.3;
    if (/NOPASSWD/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const userMatch = text.match(/User (\w+) may run/i);
    const rules = [];
    const ruleRe = /\(([^)]+)\)\s+(.*)/gm;
    let m;
    while ((m = ruleRe.exec(text)) !== null) {
      rules.push({ runAs: m[1].trim(), commands: m[2].trim() });
    }
    return {
      user: userMatch ? userMatch[1] : null,
      rules,
      nopasswd: rules.filter((r) => /NOPASSWD/i.test(r.commands)),
      isFullRoot: rules.some((r) => /\(ALL\s*:\s*ALL\)\s+ALL/i.test(`(${r.runAs}) ${r.commands}`)),
    };
  },

  suggestName() { return null; },
  suggestItemName() { return 'sudo -l'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crontab / cron jobs parser.
 */
const CRONTAB = {
  id:    'crontab',
  label: 'crontab -l',
  icon:  '⏰',

  detect(text) {
    let s = 0;
    // Standard cron schedule pattern
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
    const cronLines = lines.filter((l) => /^[\d*\/,-]+\s+[\d*\/,-]+\s+[\d*\/,-]+\s+[\d*\/,-]+\s+[\d*\/,-]+\s+/.test(l.trim()));
    if (cronLines.length >= 1) s += 0.5;
    if (/@(reboot|yearly|annually|monthly|weekly|daily|hourly)/i.test(text)) s += 0.3;
    if (/^SHELL=|^MAILTO=|^PATH=/m.test(text)) s += 0.2;
    if (/no crontab for/i.test(text)) s += 0.4;
    return Math.min(1, s);
  },

  parse(text) {
    const jobs = [];
    const envVars = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const envMatch = trimmed.match(/^(\w+)=(.*)/);
      if (envMatch) { envVars[envMatch[1]] = envMatch[2]; continue; }
      const cronMatch = trimmed.match(/^([\d*\/,-]+\s+[\d*\/,-]+\s+[\d*\/,-]+\s+[\d*\/,-]+\s+[\d*\/,-]+)\s+(\S.*)$/);
      if (cronMatch) { jobs.push({ schedule: cronMatch[1], command: cronMatch[2] }); continue; }
      const atMatch = trimmed.match(/^@(\w+)\s+(.+)/);
      if (atMatch) { jobs.push({ schedule: `@${atMatch[1]}`, command: atMatch[2] }); }
    }
    return { jobs, envVars };
  },

  suggestName() { return null; },
  suggestItemName() { return 'crontab'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `ss -tlnp` / `ss -anp` parser.
 */
const SS = {
  id:    'ss',
  label: 'ss (socket stats)',
  icon:  '📡',

  detect(text) {
    let s = 0;
    if (/^(State|Netid)\s+(Recv-Q|State)/im.test(text)) s += 0.5;
    if (/LISTEN\s+\d+\s+\d+/i.test(text)) s += 0.3;
    if (/users:\(\("/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const sockets = [];
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines.slice(1)) {
      // Netid State Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const stateIdx = /^(LISTEN|ESTAB|TIME-WAIT|CLOSE-WAIT|SYN-SENT|UNCONN|FIN-WAIT)/.test(parts[0]) ? 0 : 1;
      const local = parts[stateIdx + 3] || '';
      const peer = parts[stateIdx + 4] || '';
      const processMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
      sockets.push({
        state: parts[stateIdx],
        local,
        peer,
        process: processMatch ? { name: processMatch[1], pid: Number(processMatch[2]) } : null,
      });
    }
    const listening = sockets.filter((s) => s.state === 'LISTEN');
    return { sockets, listening };
  },

  suggestName() { return null; },
  suggestItemName() { return 'ss -tlnp'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `mount` / `df -h` parser.
 */
const MOUNT_DF = {
  id:    'mount_df',
  label: 'mount / df',
  icon:  '💾',

  detect(text) {
    let s = 0;
    if (/^Filesystem\s+(Size|1K-blocks|\d+[KMGT]?-blocks)\s+Used/im.test(text)) s += 0.7; // df
    if (/\s+type\s+(ext[234]|xfs|btrfs|tmpfs|nfs|vfat|ntfs)/im.test(text)) s += 0.5; // mount
    if (/^\S+\s+on\s+\S+\s+type\s+/m.test(text)) s += 0.4;
    return Math.min(1, s);
  },

  parse(text) {
    // Try df format first
    if (/^Filesystem/im.test(text)) {
      const entries = [];
      const lines = text.split(/\r?\n/).filter(Boolean).slice(1);
      for (const line of lines) {
        const p = line.trim().split(/\s+/);
        if (p.length >= 6) {
          entries.push({ filesystem: p[0], size: p[1], used: p[2], avail: p[3], usePct: p[4], mountpoint: p[5] });
        }
      }
      return { type: 'df', entries };
    }
    // mount format
    const mounts = text.split(/\r?\n/).filter(Boolean).map((line) => {
      const m = line.match(/^(\S+)\s+on\s+(\S+)\s+type\s+(\S+)\s+\(([^)]*)\)/);
      if (!m) return null;
      return { device: m[1], mountpoint: m[2], fstype: m[3], options: m[4] };
    }).filter(Boolean);
    return { type: 'mount', mounts };
  },

  suggestName() { return null; },
  suggestItemName(parsedData) { return parsedData?.type === 'df' ? 'df -h' : 'mount'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Environment variables (`env` / `printenv` / `set`) parser.
 */
const ENV_VARS = {
  id:    'env_vars',
  label: 'env / printenv',
  icon:  '📋',

  detect(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return 0;
    const envLike = lines.filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l));
    let s = 0;
    if (envLike.length / lines.length >= 0.5) s += 0.6;
    if (/^(PATH|HOME|USER|SHELL|LANG|PWD)=/m.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const vars = {};
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const eq = line.indexOf('=');
      if (eq > 0) vars[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return {
      vars,
      count: Object.keys(vars).length,
      interesting: ['PATH', 'HOME', 'USER', 'SHELL', 'SUDO_USER', 'SSH_AUTH_SOCK',
        'LD_PRELOAD', 'LD_LIBRARY_PATH', 'HISTFILE'].filter((k) => vars[k]),
    };
  },

  suggestName() { return null; },
  suggestItemName() { return 'env'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux `iptables -L` / `iptables -S` parser.
 */
const IPTABLES = {
  id:    'iptables',
  label: 'iptables -L',
  icon:  '🛡️',

  detect(text) {
    let s = 0;
    if (/^Chain (INPUT|OUTPUT|FORWARD|PREROUTING|POSTROUTING)/m.test(text)) s += 0.5;
    if (/policy (ACCEPT|DROP|REJECT)/i.test(text)) s += 0.3;
    if (/^-[AID]\s+(INPUT|OUTPUT|FORWARD)/m.test(text)) s += 0.5; // iptables -S
    if (/target\s+prot\s+opt/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const chains = {};
    let currentChain = null;
    for (const line of text.split(/\r?\n/)) {
      const chainMatch = line.match(/^Chain (\S+) \(policy (\S+)/);
      if (chainMatch) {
        currentChain = chainMatch[1];
        chains[currentChain] = { policy: chainMatch[2], rules: [] };
        continue;
      }
      if (currentChain && /^\s*(ACCEPT|DROP|REJECT|LOG|RETURN|DNAT|SNAT|MASQUERADE)\s/.test(line)) {
        chains[currentChain].rules.push(line.trim());
      }
    }
    // iptables -S format
    if (!Object.keys(chains).length) {
      const rules = text.split(/\r?\n/).filter((l) => /^-[AID]/.test(l.trim()));
      return { format: 'short', rules };
    }
    return { format: 'list', chains };
  },

  suggestName() { return null; },
  suggestItemName() { return 'iptables'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Routing table parser: `ip route` / `route -n` / Windows `route print`.
 */
const ROUTE = {
  id:    'route',
  label: 'Routing table',
  icon:  '🛤️',

  detect(text) {
    let s = 0;
    if (/^default\s+via\s+/m.test(text)) s += 0.5; // ip route
    if (/^Kernel IP routing table/im.test(text)) s += 0.5; // route -n
    if (/^(Destination\s+Gateway|Network Destination)/im.test(text)) s += 0.4;
    if (/IPv4 Route Table/i.test(text)) s += 0.5; // Windows
    if (/dev\s+(eth|ens|enp|wlan|virbr)/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const routes = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      // ip route format
      const ipRouteMatch = line.match(/^(\S+)\s+(?:via\s+(\S+)\s+)?dev\s+(\S+)/);
      if (ipRouteMatch) {
        routes.push({ dest: ipRouteMatch[1], gateway: ipRouteMatch[2] || 'direct', dev: ipRouteMatch[3] });
        continue;
      }
      // route -n format: Dest  Gateway  Genmask  Flags  Metric  Ref  Use  Iface
      const routeNMatch = line.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+\w+\s+\d+\s+\d+\s+\d+\s+(\S+)/);
      if (routeNMatch) {
        routes.push({ dest: routeNMatch[1], gateway: routeNMatch[2], mask: routeNMatch[3], dev: routeNMatch[4] });
      }
    }
    return { routes };
  },

  suggestName() { return null; },
  suggestItemName() { return 'ip route'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * OS release info: `/etc/os-release`, `lsb_release -a`, `/etc/issue`.
 */
const OS_RELEASE = {
  id:    'os_release',
  label: 'OS release info',
  icon:  '🐧',

  detect(text) {
    let s = 0;
    if (/^(PRETTY_NAME|NAME|VERSION_ID)=/m.test(text)) s += 0.6;
    if (/^Distributor ID:/im.test(text)) s += 0.5; // lsb_release
    if (/^(Ubuntu|Debian|CentOS|Red Hat|Fedora|Kali|Arch|Alpine)/im.test(text)) s += 0.3;
    if (/^ID=/m.test(text) && /^VERSION_ID=/m.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const info = {};
    // Key=Value format (/etc/os-release)
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const m = line.match(/^(\w+)=["']?([^"'\n]+)/);
      if (m) info[m[1]] = m[2];
    }
    // lsb_release -a format
    if (!info.NAME) {
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        const m = line.match(/^([\w\s]+):\s+(.+)/);
        if (m) info[m[1].trim().replace(/\s+/g, '_')] = m[2].trim();
      }
    }
    return {
      name: info.PRETTY_NAME || info.NAME || info.Distributor_ID || text.trim().split('\n')[0],
      version: info.VERSION_ID || info.Release || null,
      id: info.ID || null,
      raw: info,
    };
  },

  suggestName(parsedData) { return parsedData.name || null; },
  suggestItemName() { return 'OS release'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SUID/SGID binary finder: `find / -perm -4000` / `find / -perm -u=s`.
 */
const FIND_SUID = {
  id:    'find_suid',
  label: 'SUID binaries',
  icon:  '⚠️',

  detect(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.includes('Permission denied'));
    if (!lines.length) return 0;
    const binPaths = lines.filter((l) => /^\/(usr\/)?(bin|sbin|local)\//.test(l.trim()));
    let s = 0;
    if (binPaths.length / lines.length >= 0.5 && binPaths.length >= 3) s += 0.6;
    if (/\/(sudo|passwd|ping|mount|su|pkexec|nmap|find|vim|python|perl|ruby|php|node|docker)\s*$/m.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const gtfobins = ['nmap', 'find', 'vim', 'vi', 'python', 'python3', 'perl', 'ruby', 'php',
      'node', 'docker', 'env', 'awk', 'less', 'more', 'man', 'ftp', 'socat', 'bash', 'sh',
      'dash', 'zsh', 'tar', 'zip', 'gcc', 'strace', 'ltrace', 'wget', 'curl', 'nc', 'ncat',
      'pkexec', 'systemctl', 'journalctl', 'ed', 'nano', 'pico', 'tee', 'cp', 'mv'];
    const binaries = text.split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('/'));
    const exploitable = binaries.filter((b) => {
      const name = b.split('/').pop();
      return gtfobins.includes(name);
    });
    return { binaries, count: binaries.length, exploitable };
  },

  suggestName() { return null; },
  suggestItemName() { return 'SUID binaries'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `last` / `lastlog` / `w` login history parser.
 */
const LAST_LOG = {
  id:    'last_log',
  label: 'last / w / who',
  icon:  '👤',

  detect(text) {
    let s = 0;
    // last format: user  pts/0  1.2.3.4  Mon Mar ...
    if (/^\w+\s+(pts\/\d+|tty\d+|:0)\s+/m.test(text)) s += 0.5;
    if (/still logged in/i.test(text)) s += 0.3;
    if (/^wtmp begins/m.test(text)) s += 0.3;
    // w format
    if (/^\s*\d+:\d+:\d+\s+up/m.test(text) && /USER\s+TTY/i.test(text)) s += 0.6;
    return Math.min(1, s);
  },

  parse(text) {
    const sessions = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const m = line.match(/^(\S+)\s+(pts\/\d+|tty\d+|:0|system boot)\s+(\S+)?\s+(.+)/);
      if (m && m[1] !== 'wtmp' && m[1] !== 'reboot') {
        sessions.push({ user: m[1], terminal: m[2], from: m[3] || 'local', time: m[4].trim() });
      }
    }
    const uniqueUsers = [...new Set(sessions.map((s) => s.user))];
    const uniqueIPs = [...new Set(sessions.filter((s) => /\d+\.\d+/.test(s.from)).map((s) => s.from))];
    return { sessions, uniqueUsers, uniqueIPs };
  },

  suggestName() { return null; },
  suggestItemName() { return 'last (logins)'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ARP table parser: `arp -a` / `ip neigh` (Linux & Windows).
 */
const ARP = {
  id:    'arp',
  label: 'ARP table',
  icon:  '📡',

  detect(text) {
    let s = 0;
    // arp -a format: ? (1.2.3.4) at aa:bb:cc:dd:ee:ff
    if (/\(\d+\.\d+\.\d+\.\d+\)\s+at\s+[\da-f:]+/i.test(text)) s += 0.6;
    // ip neigh format: 1.2.3.4 dev eth0 lladdr aa:bb:cc:dd:ee:ff
    if (/^\d+\.\d+.*dev\s+\S+\s+lladdr\s+[\da-f:]+/im.test(text)) s += 0.6;
    // Windows arp -a
    if (/Interface:\s+\d+\.\d+/i.test(text) && /dynamic|static/i.test(text)) s += 0.6;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = [];
    // arp -a Linux/macOS
    for (const m of text.matchAll(/\(?([\d.]+)\)?\s+at\s+([\da-f:]+)/gi)) {
      entries.push({ ip: m[1], mac: m[2], type: 'dynamic' });
    }
    // ip neigh
    if (!entries.length) {
      for (const m of text.matchAll(/^([\d.]+)\s+dev\s+(\S+)\s+lladdr\s+([\da-f:]+)\s+(\S+)/gim)) {
        entries.push({ ip: m[1], mac: m[3], dev: m[2], state: m[4] });
      }
    }
    // Windows arp -a
    if (!entries.length) {
      for (const m of text.matchAll(/([\d.]+)\s+([\da-f]{2}-[\da-f]{2}-[\da-f]{2}-[\da-f]{2}-[\da-f]{2}-[\da-f]{2})\s+(\w+)/gi)) {
        entries.push({ ip: m[1], mac: m[2].replace(/-/g, ':'), type: m[3] });
      }
    }
    return { entries };
  },

  suggestName() { return null; },
  suggestItemName() { return 'arp table'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DNS lookup parser: `dig`, `nslookup`, `host`.
 */
const DNS_LOOKUP = {
  id:    'dns_lookup',
  label: 'DNS lookup',
  icon:  '🌐',

  detect(text) {
    let s = 0;
    if (/;; ANSWER SECTION/i.test(text)) s += 0.5; // dig
    if (/; <<>> DiG/i.test(text)) s += 0.3;
    if (/^Server:\s+/m.test(text) && /^Address:\s+/m.test(text) && /^Name:/m.test(text)) s += 0.6; // nslookup
    if (/\s+IN\s+(A|AAAA|MX|NS|CNAME|TXT|SOA|PTR)\s+/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const records = [];
    // dig format
    const answerSection = text.match(/;; ANSWER SECTION:\n([\s\S]*?)(?:\n\n|;; )/);
    if (answerSection) {
      for (const line of answerSection[1].split('\n').filter(Boolean)) {
        const p = line.trim().split(/\s+/);
        if (p.length >= 5) {
          records.push({ name: p[0], ttl: Number(p[1]), class: p[2], type: p[3], value: p.slice(4).join(' ') });
        }
      }
    }
    // nslookup format
    if (!records.length) {
      const nameMatch = text.match(/^Name:\s+(\S+)/m);
      const addrMatches = [...text.matchAll(/^Address:\s+(\S+)/gm)];
      if (nameMatch && addrMatches.length) {
        for (const m of addrMatches) {
          if (m[1].includes('#')) continue; // server address
          records.push({ name: nameMatch[1], type: m[1].includes(':') ? 'AAAA' : 'A', value: m[1] });
        }
      }
    }
    const server = (text.match(/;; SERVER:\s+(\S+)/) || text.match(/^Server:\s+(\S+)/m) || [])[1];
    return { records, server: server || null };
  },

  suggestName(parsedData) {
    if (parsedData.records.length) return parsedData.records[0].name;
    return null;
  },
  suggestItemName() { return 'DNS lookup'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `/etc/resolv.conf` parser.
 */
const RESOLV_CONF = {
  id:    'resolv_conf',
  label: '/etc/resolv.conf',
  icon:  '🌐',

  detect(text) {
    let s = 0;
    if (/^nameserver\s+\d+\.\d+/m.test(text)) s += 0.5;
    if (/^(search|domain)\s+\S+/m.test(text)) s += 0.3;
    if (/^#.*resolv/im.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const nameservers = [];
    let domain = null;
    const searchDomains = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed) continue;
      const nsMatch = trimmed.match(/^nameserver\s+(\S+)/);
      if (nsMatch) nameservers.push(nsMatch[1]);
      const domMatch = trimmed.match(/^domain\s+(\S+)/);
      if (domMatch) domain = domMatch[1];
      const searchMatch = trimmed.match(/^search\s+(.+)/);
      if (searchMatch) searchDomains.push(...searchMatch[1].trim().split(/\s+/));
    }
    return { nameservers, domain, searchDomains };
  },

  suggestName() { return null; },
  suggestItemName() { return '/etc/resolv.conf'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Installed packages: `dpkg -l` / `rpm -qa` / `apt list --installed`.
 */
const PKG_LIST = {
  id:    'pkg_list',
  label: 'Installed packages',
  icon:  '📦',

  detect(text) {
    let s = 0;
    if (/^(Desired|ii\s+\w)/m.test(text) && /^ii\s+/m.test(text)) s += 0.6; // dpkg -l
    if (/^\w[\w.-]+\s+[\d.:~+-]+\s+(amd64|i386|all|arm64)\s/m.test(text)) s += 0.3; // dpkg
    if (/^[\w.-]+-[\d.]+-\d+\.\w+$/m.test(text) && text.split('\n').length > 5) s += 0.5; // rpm -qa
    if (/^Listing\.\.\./m.test(text) && /\/\w+ \[installed/i.test(text)) s += 0.6; // apt list
    return Math.min(1, s);
  },

  parse(text) {
    const packages = [];
    // dpkg -l format
    if (/^ii\s+/m.test(text)) {
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^ii\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)/);
        if (m) packages.push({ name: m[1], version: m[2], arch: m[3], description: m[4].trim() });
      }
    }
    // rpm -qa format
    if (!packages.length) {
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        if (/^[\w.-]+-[\d.]/.test(line.trim())) packages.push({ name: line.trim(), version: null });
      }
    }
    return { packages, count: packages.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'installed packages'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `lsof -i` / open network connections parser.
 */
const LSOF = {
  id:    'lsof',
  label: 'lsof -i',
  icon:  '🔌',

  detect(text) {
    let s = 0;
    if (/^COMMAND\s+PID\s+USER\s+FD\s+TYPE/im.test(text)) s += 0.7;
    if (/\d+(u|r|w)\s+(IPv4|IPv6)\s/m.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = [];
    const lines = text.split(/\r?\n/).filter(Boolean).slice(1);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 9) {
        entries.push({
          command: parts[0],
          pid: Number(parts[1]),
          user: parts[2],
          fd: parts[3],
          type: parts[4],
          name: parts.slice(8).join(' '),
        });
      }
    }
    return { entries };
  },

  suggestName() { return null; },
  suggestItemName() { return 'lsof -i'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `history` / `.bash_history` command history parser.
 */
const CMD_HISTORY = {
  id:    'cmd_history',
  label: 'Command history',
  icon:  '📜',

  detect(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return 0;
    // Numbered history entries:  1234  command
    const numbered = lines.filter((l) => /^\s*\d+\s+\S/.test(l));
    let s = 0;
    if (numbered.length / lines.length >= 0.6 && numbered.length >= 5) s += 0.7;
    // Non-numbered but looks like shell commands
    if (!numbered.length) {
      const cmds = lines.filter((l) => /^(ls|cd|cat|grep|find|chmod|sudo|ssh|curl|wget|git|apt|yum|pip|npm)\s/i.test(l.trim()));
      if (cmds.length / lines.length >= 0.3 && cmds.length >= 5) s += 0.5;
    }
    return Math.min(1, s);
  },

  parse(text) {
    const commands = text.split(/\r?\n/).filter(Boolean).map((line) => {
      const m = line.match(/^\s*(\d+)\s+(.+)/);
      return m ? { num: Number(m[1]), cmd: m[2].trim() } : { num: null, cmd: line.trim() };
    }).filter((c) => c.cmd);
    // Interesting commands for pentester
    const interesting = commands.filter((c) =>
      /sudo|ssh|curl|wget|nc |ncat|nmap|gobuster|dirb|hydra|john|hashcat|msfconsole|reverse|shell|passwd|shadow|cred|token|key|secret/i.test(c.cmd)
    );
    return { commands, count: commands.length, interesting };
  },

  suggestName() { return null; },
  suggestItemName() { return 'shell history'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSH keys / authorized_keys parser.
 */
const SSH_KEYS = {
  id:    'ssh_keys',
  label: 'SSH keys',
  icon:  '🔑',

  detect(text) {
    let s = 0;
    if (/^ssh-(rsa|ed25519|ecdsa|dsa)\s+/m.test(text)) s += 0.7;
    if (/^(-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)/m.test(text)) s += 0.9;
    if (/^(-----BEGIN (RSA |EC )?PUBLIC KEY-----)/m.test(text)) s += 0.7;
    return Math.min(1, s);
  },

  parse(text) {
    const keys = [];
    // authorized_keys format
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const m = line.match(/^(ssh-\w+)\s+(\S+)\s*(.*)/);
      if (m) keys.push({ type: m[1], key: m[2].slice(0, 32) + '...', comment: m[3].trim() || null });
    }
    // PEM key detection
    const isPrivate = /BEGIN.*PRIVATE KEY/i.test(text);
    const keyType = (text.match(/BEGIN (\w+ )?(\w+) KEY/) || [])[2] || null;
    return {
      keys,
      isPrivateKey: isPrivate,
      keyType,
      count: keys.length || (isPrivate || /BEGIN.*PUBLIC KEY/i.test(text) ? 1 : 0),
    };
  },

  suggestName() { return null; },
  suggestItemName(parsedData) {
    if (parsedData?.isPrivateKey) return 'SSH private key';
    if (parsedData?.keys?.length) return 'authorized_keys';
    return 'SSH key';
  },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * HTTP headers / `curl -I` parser.
 */
const HTTP_HEADERS = {
  id:    'http_headers',
  label: 'HTTP headers',
  icon:  '🌐',

  detect(text) {
    let s = 0;
    if (/^HTTP\/[\d.]+\s+\d{3}/m.test(text)) s += 0.5;
    if (/^(Content-Type|Server|X-Powered-By|Set-Cookie|Location):\s/im.test(text)) s += 0.3;
    if (/^(Host|User-Agent|Accept|Authorization):\s/im.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const headers = {};
    let statusLine = null;
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const statusMatch = line.match(/^(HTTP\/[\d.]+\s+\d{3}.*)/);
      if (statusMatch) { statusLine = statusMatch[1]; continue; }
      const headerMatch = line.match(/^([\w-]+):\s*(.*)/);
      if (headerMatch) headers[headerMatch[1].toLowerCase()] = headerMatch[2].trim();
    }
    return {
      statusLine,
      headers,
      server: headers['server'] || null,
      poweredBy: headers['x-powered-by'] || null,
      cookies: headers['set-cookie'] || null,
      securityHeaders: {
        csp: headers['content-security-policy'] || null,
        hsts: headers['strict-transport-security'] || null,
        xfo: headers['x-frame-options'] || null,
        xcto: headers['x-content-type-options'] || null,
      },
    };
  },

  suggestName(parsedData) { return parsedData.server || null; },
  suggestItemName() { return 'HTTP headers'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `whoami /all` parser.
 */
const WHOAMI_ALL = {
  id:    'whoami_all',
  label: 'whoami /all (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/USER INFORMATION/i.test(text)) s += 0.3;
    if (/GROUP INFORMATION/i.test(text)) s += 0.3;
    if (/PRIVILEGES INFORMATION/i.test(text)) s += 0.3;
    if (/S-1-5-\d+-/i.test(text)) s += 0.2; // SIDs
    return Math.min(1, s);
  },

  parse(text) {
    const userName = (text.match(/^(\S+\\?\S+)\s+S-1-5/m) || [])[1];
    const sids = [...text.matchAll(/(S-1-5-[\d-]+)/g)].map((m) => m[1]);
    const groups = [];
    const groupSection = text.match(/GROUP INFORMATION[\s\S]*?(?=PRIVILEGES|$)/i);
    if (groupSection) {
      for (const m of groupSection[0].matchAll(/^(\S+\\?\S+)\s+(S-1-\S+)\s+(.+)/gm)) {
        groups.push({ name: m[1], sid: m[2], attributes: m[3].trim() });
      }
    }
    const privileges = [];
    const privSection = text.match(/PRIVILEGES INFORMATION[\s\S]*/i);
    if (privSection) {
      for (const m of privSection[0].matchAll(/^(Se\w+)\s+(.*)/gm)) {
        privileges.push({ name: m[1], state: m[2].trim() });
      }
    }
    const dangerous = privileges.filter((p) =>
      /SeImpersonate|SeAssignPrimaryToken|SeBackup|SeRestore|SeDebug|SeTcb|SeLoadDriver/i.test(p.name)
    );
    return { userName, sids, groups, privileges, dangerousPrivileges: dangerous };
  },

  suggestName(parsedData) { return parsedData.userName || null; },
  suggestItemName() { return 'whoami /all'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `tasklist` parser.
 */
const TASKLIST = {
  id:    'tasklist',
  label: 'tasklist (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/^Image Name\s+PID\s+Session Name/im.test(text)) s += 0.7;
    if (/^={10,}/m.test(text) && /\.exe\s+\d+/im.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const processes = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const m = line.match(/^(\S+\.exe)\s+(\d+)\s+(\S+)\s+(\d+)\s+([\d,]+ K)/i);
      if (m) {
        processes.push({ name: m[1], pid: Number(m[2]), session: m[3], sessionNum: Number(m[4]), mem: m[5] });
      }
    }
    return { processes, count: processes.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'tasklist'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `sc query` / `sc queryex` parser (services).
 */
const SC_QUERY = {
  id:    'sc_query',
  label: 'sc query (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/SERVICE_NAME:\s+\S/i.test(text)) s += 0.5;
    if (/DISPLAY_NAME:\s+\S/i.test(text)) s += 0.2;
    if (/STATE\s+:\s+\d+\s+(RUNNING|STOPPED)/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const services = [];
    const blocks = text.split(/(?=SERVICE_NAME:)/i).filter(Boolean);
    for (const block of blocks) {
      const name = (block.match(/SERVICE_NAME:\s+(.+)/i) || [])[1]?.trim();
      const display = (block.match(/DISPLAY_NAME:\s+(.+)/i) || [])[1]?.trim();
      const state = (block.match(/STATE\s+:\s+\d+\s+(\S+)/i) || [])[1];
      const pid = (block.match(/PID\s+:\s+(\d+)/i) || [])[1];
      if (name) services.push({ name, display, state: state || 'UNKNOWN', pid: pid ? Number(pid) : null });
    }
    const running = services.filter((s) => s.state === 'RUNNING');
    return { services, running, count: services.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'sc query (services)'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `net localgroup administrators` / `net localgroup` parser.
 */
const NET_LOCALGROUP = {
  id:    'net_localgroup',
  label: 'net localgroup (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/Alias name\s+\w/i.test(text)) s += 0.4;
    if (/Members/i.test(text) && /The command completed successfully/i.test(text)) s += 0.3;
    if (/^-+$/m.test(text) && /Administrators|Users|Remote Desktop/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const groupName = (text.match(/Alias name\s+(.+)/i) || [])[1]?.trim();
    const comment = (text.match(/Comment\s+(.+)/i) || [])[1]?.trim();
    const membersSection = text.match(/Members\s*\n-+\n([\s\S]*?)(?=The command completed|$)/i);
    const members = membersSection
      ? membersSection[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      : [];
    return { groupName, comment, members };
  },

  suggestName() { return null; },
  suggestItemName(parsedData) { return parsedData?.groupName ? `net localgroup ${parsedData.groupName}` : 'net localgroup'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `net share` parser.
 */
const NET_SHARE = {
  id:    'net_share',
  label: 'net share (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/Share name\s+Resource\s+Remark/i.test(text)) s += 0.6;
    if (/The command completed successfully/i.test(text) && /\$\s+([\w:\\]+)/m.test(text)) s += 0.3;
    if (/^(ADMIN|IPC|C)\$\s/m.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const shares = [];
    const lines = text.split(/\r?\n/).filter(Boolean);
    let started = false;
    for (const line of lines) {
      if (/^-+$/m.test(line)) { started = true; continue; }
      if (/The command completed/i.test(line)) break;
      if (started && line.trim()) {
        const m = line.match(/^(\S+)\s+([\w:\\]+)?\s*(.*)/);
        if (m) shares.push({ name: m[1], resource: m[2]?.trim() || null, remark: m[3]?.trim() || null });
      }
    }
    return { shares };
  },

  suggestName() { return null; },
  suggestItemName() { return 'net share'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `schtasks /query` parser (scheduled tasks).
 */
const SCHTASKS = {
  id:    'schtasks',
  label: 'schtasks (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/^(TaskName|Folder)\s+/m.test(text) && /Next Run Time/i.test(text)) s += 0.6;
    if (/^\\?\w.*\s+(Ready|Running|Disabled)\s/m.test(text)) s += 0.3;
    // Verbose format
    if (/^TaskName:\s+/m.test(text) && /^Status:\s+/m.test(text)) s += 0.6;
    return Math.min(1, s);
  },

  parse(text) {
    const tasks = [];
    // Verbose format
    if (/^TaskName:/m.test(text)) {
      const blocks = text.split(/(?=^TaskName:)/m).filter(Boolean);
      for (const block of blocks) {
        const get = (label) => (block.match(new RegExp(`^${label}:\\s*(.+)`, 'im')) || [])[1]?.trim();
        tasks.push({
          name: get('TaskName'),
          nextRun: get('Next Run Time'),
          status: get('Status'),
          runAs: get('Run As User') || get('Author'),
          command: get('Task To Run'),
        });
      }
    }
    // Table format
    if (!tasks.length) {
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^(\\?\S.+?)\s{2,}(\S.*?)\s{2,}(\S+)\s*$/);
        if (m && !/^(TaskName|Folder|\s*$)/.test(m[1])) {
          tasks.push({ name: m[1].trim(), nextRun: m[2].trim(), status: m[3].trim() });
        }
      }
    }
    return { tasks, count: tasks.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'schtasks'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `reg query` parser (registry).
 */
const REG_QUERY = {
  id:    'reg_query',
  label: 'reg query (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    if (/^HK(EY_|LM\\|CU\\|CR\\)/m.test(text)) s += 0.5;
    if (/REG_(SZ|DWORD|BINARY|EXPAND_SZ|MULTI_SZ)\s/i.test(text)) s += 0.4;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = [];
    let currentKey = null;
    for (const line of text.split(/\r?\n/)) {
      const keyMatch = line.match(/^(HK\S+)/);
      if (keyMatch) { currentKey = keyMatch[1]; continue; }
      const valMatch = line.match(/^\s+(\S+)\s+(REG_\w+)\s+(.*)/);
      if (valMatch && currentKey) {
        entries.push({ key: currentKey, name: valMatch[1], type: valMatch[2], value: valMatch[3].trim() });
      }
    }
    return { entries, count: entries.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'reg query'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `dir` / Linux `ls -la` directory listing parser.
 */
const DIR_LS = {
  id:    'dir_ls',
  label: 'Directory listing',
  icon:  '📂',

  detect(text) {
    let s = 0;
    // ls -la format
    if (/^total\s+\d+/m.test(text) && /^[drwx-]{10}/m.test(text)) s += 0.7;
    // Windows dir
    if (/Directory of\s+\S/i.test(text)) s += 0.5;
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+(AM|PM)?\s+(<DIR>|\d)/m.test(text)) s += 0.4;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = [];
    // ls -la format
    if (/^[drwx-]{10}/m.test(text)) {
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        const m = line.match(/^([drwxstSl-]{10})\s+(\d+)\s+(\S+)\s+(\S+)\s+([\d,]+)\s+(.{12})\s+(.+)/);
        if (m) {
          entries.push({
            perms: m[1], links: Number(m[2]), owner: m[3], group: m[4],
            size: m[5].replace(/,/g, ''), date: m[6].trim(), name: m[7],
            isDir: m[1].startsWith('d'), isSuid: m[1].includes('s'),
          });
        }
      }
    }
    // Windows dir
    if (!entries.length) {
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        const m = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}\s*(?:AM|PM)?)\s+(<DIR>|[\d,]+)\s+(.+)/i);
        if (m) {
          entries.push({ date: m[1], time: m[2], isDir: m[3] === '<DIR>', size: m[3] === '<DIR>' ? null : m[3].replace(/,/g, ''), name: m[4].trim() });
        }
      }
    }
    const directory = (text.match(/Directory of\s+(.+)/i) || text.match(/^(\/\S+):$/m) || [])[1]?.trim();
    return { directory: directory || null, entries, count: entries.length };
  },

  suggestName() { return null; },
  suggestItemName(parsedData) { return parsedData?.directory ? `ls ${parsedData.directory}` : 'directory listing'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gobuster / ffuf / dirbuster / feroxbuster output parser.
 */
const WEB_FUZZ = {
  id:    'web_fuzz',
  label: 'Web fuzzing results',
  icon:  '🕸️',

  detect(text) {
    let s = 0;
    if (/Gobuster\s+v/i.test(text)) s += 0.5;
    if (/ffuf/i.test(text) && /FUZZ/i.test(text)) s += 0.5;
    if (/feroxbuster/i.test(text)) s += 0.5;
    if (/^(\/\S+)\s+\(Status:\s*\d{3}\)/m.test(text)) s += 0.4; // gobuster
    if (/^\d{3}\s+(GET|POST)\s+/m.test(text)) s += 0.4; // feroxbuster
    if (/\[Status:\s*\d{3},\s*Size:\s*\d+/m.test(text)) s += 0.4; // ffuf
    return Math.min(1, s);
  },

  parse(text) {
    const results = [];
    // Gobuster format: /path  (Status: 200) [Size: 1234]
    for (const m of text.matchAll(/^(\/\S+)\s+\(Status:\s*(\d{3})\)\s*\[Size:\s*(\d+)\]/gm)) {
      results.push({ path: m[1], status: Number(m[2]), size: Number(m[3]) });
    }
    // ffuf format: path [Status: 200, Size: 1234, ...]
    if (!results.length) {
      for (const m of text.matchAll(/^(\S+)\s+\[Status:\s*(\d{3}),\s*Size:\s*(\d+)/gm)) {
        results.push({ path: m[1], status: Number(m[2]), size: Number(m[3]) });
      }
    }
    // feroxbuster format: 200  GET  1234  http://target/path
    if (!results.length) {
      for (const m of text.matchAll(/^(\d{3})\s+(GET|POST|PUT|DELETE|HEAD|OPTIONS)\s+(\d+)l?\s+\S+\s+\S+\s+(\S+)/gm)) {
        results.push({ status: Number(m[1]), method: m[2], size: Number(m[3]), url: m[4] });
      }
    }
    const targetMatch = text.match(/(?:Target|Url|url):\s*(\S+)/i);
    return { target: targetMatch ? targetMatch[1] : null, results, count: results.length };
  },

  suggestName(parsedData) { return parsedData.target || null; },
  suggestItemName() { return 'web fuzzing'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Nikto web scanner output parser.
 */
const NIKTO = {
  id:    'nikto',
  label: 'Nikto scan',
  icon:  '🕸️',

  detect(text) {
    let s = 0;
    if (/- Nikto v/i.test(text)) s += 0.6;
    if (/\+ Target IP:/i.test(text)) s += 0.2;
    if (/\+ Server:/i.test(text)) s += 0.2;
    if (/OSVDB-\d+/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const target = (text.match(/\+ Target IP:\s+(\S+)/i) || [])[1];
    const hostname = (text.match(/\+ Target Hostname:\s+(\S+)/i) || [])[1];
    const port = (text.match(/\+ Target Port:\s+(\d+)/i) || [])[1];
    const server = (text.match(/\+ Server:\s+(.+)/i) || [])[1]?.trim();
    const findings = [];
    for (const m of text.matchAll(/^\+ (.+)/gm)) {
      if (!/Target|Nikto|Start Time|End Time|host\(s\) tested/i.test(m[1])) {
        findings.push(m[1].trim());
      }
    }
    return { target, hostname, port: port ? Number(port) : null, server, findings };
  },

  suggestName(parsedData) { return parsedData.hostname || parsedData.target || null; },
  suggestItemName() { return 'Nikto scan'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash list / cracked passwords parser (hashcat, john output, raw hashes).
 */
const HASH_LIST = {
  id:    'hash_list',
  label: 'Hash / credentials',
  icon:  '🔓',

  detect(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return 0;
    let s = 0;
    // hashcat potfile: hash:password
    const md5like = lines.filter((l) => /^[a-f0-9]{32}(:.+)?$/i.test(l.trim()));
    const sha1like = lines.filter((l) => /^[a-f0-9]{40}(:.+)?$/i.test(l.trim()));
    const sha256like = lines.filter((l) => /^[a-f0-9]{64}(:.+)?$/i.test(l.trim()));
    const ntlmlike = lines.filter((l) => /^\w+:\d+:[a-f0-9]{32}:[a-f0-9]{32}:::/i.test(l.trim()));
    const hashLines = md5like.length + sha1like.length + sha256like.length + ntlmlike.length;
    if (hashLines / lines.length >= 0.5 && hashLines >= 2) s += 0.7;
    // user:password format
    const credPairs = lines.filter((l) => /^[^:\s]+:[^:]+$/i.test(l.trim()) && l.trim().length < 200);
    if (credPairs.length / lines.length >= 0.5 && credPairs.length >= 3 && !hashLines) s += 0.4;
    if (ntlmlike.length >= 1) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const trimmed = line.trim();
      // NTLM hash: user:rid:lm:ntlm:::
      const ntlm = trimmed.match(/^(\w+):(\d+):([a-f0-9]{32}):([a-f0-9]{32}):::/i);
      if (ntlm) { entries.push({ type: 'NTLM', user: ntlm[1], rid: Number(ntlm[2]), lm: ntlm[3], ntlm: ntlm[4] }); continue; }
      // hash:password (cracked)
      const cracked = trimmed.match(/^([a-f0-9]{32,128}):(.+)$/i);
      if (cracked) { entries.push({ type: 'cracked', hash: cracked[1], password: cracked[2] }); continue; }
      // Plain hash
      if (/^[a-f0-9]{32,128}$/i.test(trimmed)) { entries.push({ type: 'hash', hash: trimmed }); continue; }
      // user:password
      const cred = trimmed.match(/^([^:]+):(.+)$/);
      if (cred && cred[2].length < 200) { entries.push({ type: 'credential', user: cred[1], password: cred[2] }); }
    }
    return { entries, count: entries.length };
  },

  suggestName() { return null; },
  suggestItemName(parsedData) {
    const types = [...new Set((parsedData?.entries || []).map((e) => e.type))];
    if (types.includes('NTLM')) return 'NTLM hashes';
    if (types.includes('cracked')) return 'cracked passwords';
    if (types.includes('credential')) return 'credentials';
    return 'hash list';
  },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Windows `wmic` output parser (various queries).
 */
const WMIC = {
  id:    'wmic',
  label: 'wmic (Win)',
  icon:  '🪟',

  detect(text) {
    let s = 0;
    // wmic CSV-like output with headers
    if (/^(Caption|Description|Name|ProcessId|Node)\s/im.test(text) &&
        text.split(/\r?\n/).filter(Boolean).length >= 2) s += 0.4;
    if (/^(\w+\s+){3,}$/m.test(text.split('\n')[0])) s += 0.2;
    // wmic specific keywords
    if (/Win32_|MSFT_/i.test(text)) s += 0.3;
    if (/^Node\s+/m.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { entries: [] };
    // Assume first line is headers
    const headers = lines[0].trim().split(/\s{2,}/);
    const entries = [];
    for (const line of lines.slice(1)) {
      const values = line.trim().split(/\s{2,}/);
      const entry = {};
      headers.forEach((h, i) => { entry[h.trim()] = values[i]?.trim() || ''; });
      entries.push(entry);
    }
    return { headers, entries, count: entries.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'wmic output'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `cmdkey /list` (Windows stored credentials) parser.
 */
const CMDKEY = {
  id:    'cmdkey',
  label: 'cmdkey /list (Win)',
  icon:  '🔑',

  detect(text) {
    let s = 0;
    if (/Currently stored credentials/i.test(text)) s += 0.5;
    if (/Target:\s+\S/i.test(text)) s += 0.3;
    if (/Type:\s+(Domain|Generic)/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const creds = [];
    const blocks = text.split(/(?=^\s*Target:)/im).filter(Boolean);
    for (const block of blocks) {
      const target = (block.match(/Target:\s+(\S+)/i) || [])[1];
      const type = (block.match(/Type:\s+(.+)/i) || [])[1]?.trim();
      const user = (block.match(/User:\s+(.+)/i) || [])[1]?.trim();
      if (target) creds.push({ target, type, user });
    }
    return { credentials: creds, count: creds.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'cmdkey /list'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSH `known_hosts` file parser.
 * Format: hostname/IP  algo  base64key
 */
const KNOWN_HOSTS = {
  id:    'known_hosts',
  label: 'known_hosts',
  icon:  '🔐',

  detect(text) {
    let s = 0;
    const lines = text.split(/\r?\n/).filter(Boolean);
    // known_hosts lines: hostname[,hostname] algo base64
    const khLines = lines.filter(l =>
      /^[|]?\S+\s+ssh-(rsa|ed25519|ecdsa|dsa)\s+\S+/.test(l) ||
      /^[|]?\S+\s+ecdsa-sha2-nistp\d+\s+\S+/.test(l) ||
      /^@cert-authority\s/.test(l) ||
      /^\[[\w.:]+\](:\d+)?\s+ssh-/.test(l) ||      // [host]:port format
      /^[|]1[|]\S+[|]\S+\s+ssh-/.test(l)            // hashed format
    );
    if (lines.length > 0 && khLines.length / lines.length >= 0.5) s += 0.8;
    else if (khLines.length >= 2) s += 0.5;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      if (line.startsWith('#')) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue;
      const hostRaw = parts[0];
      const algo = parts[1];
      const key = parts[2];
      const hosts = hostRaw.startsWith('|1|')
        ? [hostRaw]                          // hashed host
        : hostRaw.split(',');                 // plain hosts
      entries.push({
        hosts,
        algo,
        keySnippet: key.slice(0, 24) + '…',
        hashed: hostRaw.startsWith('|1|'),
      });
    }
    const algos = [...new Set(entries.map(e => e.algo))];
    return { entries, count: entries.length, algos };
  },

  suggestName() { return null; },
  suggestItemName() { return 'known_hosts'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSH `authorized_keys` file parser.
 */
const AUTHORIZED_KEYS = {
  id:    'authorized_keys',
  label: 'authorized_keys',
  icon:  '🔑',

  detect(text) {
    let s = 0;
    const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
    const akLines = lines.filter(l => /^(ssh-(rsa|ed25519|ecdsa|dsa)|ecdsa-sha2-nistp\d+)\s+\S{20,}/.test(l));
    if (lines.length > 0 && akLines.length / lines.length >= 0.6) s += 0.85;
    else if (akLines.length >= 2) s += 0.55;
    // Distinguish from known_hosts: authorized_keys lines don't start with a hostname
    if (akLines.length > 0 && !lines.some(l => /^[\w.[\]-]+,?\s+ssh-/.test(l))) s += 0.05;
    return Math.min(1, s);
  },

  parse(text) {
    const keys = [];
    for (const line of text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'))) {
      // Optional options prefix, then algo, base64, optional comment
      const m = line.match(/^(?:(.*?)\s+)?(ssh-\w+|ecdsa-sha2-nistp\d+)\s+(\S+)\s*(.*)/);
      if (!m) continue;
      keys.push({
        options: m[1] || null,
        algo: m[2],
        keySnippet: m[3].slice(0, 24) + '…',
        comment: m[4].trim() || null,
      });
    }
    return { keys, count: keys.length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'authorized_keys'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSH public key file parser (single public key in PEM or OpenSSH format).
 */
const SSH_PUB_KEY = {
  id:    'ssh_pub_key',
  label: 'SSH public key',
  icon:  '🔓',

  detect(text) {
    let s = 0;
    const trimmed = text.trim();
    // OpenSSH one-liner: ssh-rsa AAAA... comment
    if (/^(ssh-(rsa|ed25519|ecdsa|dsa)|ecdsa-sha2-nistp\d+)\s+\S{20,}/.test(trimmed) &&
        trimmed.split(/\r?\n/).filter(Boolean).length <= 3) s += 0.9;
    // PEM public key
    if (/^-----BEGIN (RSA |EC )?PUBLIC KEY-----/.test(trimmed) &&
        /-----END (RSA |EC )?PUBLIC KEY-----\s*$/.test(trimmed)) s += 0.95;
    // SSH2 public key format
    if (/^---- BEGIN SSH2 PUBLIC KEY ----/.test(trimmed)) s += 0.9;
    return Math.min(1, s);
  },

  parse(text) {
    const trimmed = text.trim();
    // OpenSSH one-liner
    const m = trimmed.match(/^(ssh-\w+|ecdsa-sha2-nistp\d+)\s+(\S+)\s*(.*)/);
    if (m) {
      return { format: 'openssh', algo: m[1], keySnippet: m[2].slice(0, 32) + '…', comment: m[3].trim() || null, bits: null };
    }
    // PEM
    const algo = (trimmed.match(/BEGIN (\w+) PUBLIC KEY/) || [])[1] || 'unknown';
    const b64 = trimmed.replace(/-----.+?-----/g, '').replace(/\s+/g, '');
    return { format: 'pem', algo, keyLength: b64.length, keySnippet: b64.slice(0, 32) + '…', comment: null };
  },

  suggestName() { return null; },
  suggestItemName() { return 'SSH public key'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSH private key file parser (PEM / OpenSSH format).
 */
const SSH_PRIV_KEY = {
  id:    'ssh_priv_key',
  label: 'SSH private key',
  icon:  '🗝️',

  detect(text) {
    let s = 0;
    if (/^-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/m.test(text)) s += 0.95;
    if (/^-----END (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/m.test(text)) s += 0.05;
    return Math.min(1, s);
  },

  parse(text) {
    const trimmed = text.trim();
    const typeMatch = trimmed.match(/BEGIN (\w+\s)?PRIVATE KEY/);
    const keyFormat = (typeMatch?.[1]?.trim()) || 'GENERIC';
    const encrypted = /ENCRYPTED/i.test(trimmed) || /Proc-Type:.*ENCRYPTED/i.test(trimmed) || /DEK-Info:/i.test(trimmed);
    const isOpenSSH = /BEGIN OPENSSH PRIVATE KEY/.test(trimmed);
    const b64 = trimmed.replace(/-----.+?-----/g, '').replace(/^[A-Za-z-]+:.*$/gm, '').replace(/\s+/g, '');
    return {
      format: isOpenSSH ? 'openssh' : 'pem',
      keyType: keyFormat,
      encrypted,
      keyLength: b64.length,
      warning: '⚠️ PRIVATE KEY — handle with care',
    };
  },

  suggestName() { return null; },
  suggestItemName(pd) { return `SSH private key (${pd?.keyType || 'unknown'})`; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `/etc/sudoers` file parser.
 * Different from `sudo -l` which parses the output of the command.
 */
const ETC_SUDOERS = {
  id:    'etc_sudoers',
  label: '/etc/sudoers',
  icon:  '🛡️',

  detect(text) {
    let s = 0;
    if (/^#.*sudoers/im.test(text)) s += 0.3;
    if (/^Defaults\s+/m.test(text)) s += 0.3;
    if (/^(root|%\w+)\s+ALL\s*=\s*\(/m.test(text)) s += 0.4;
    if (/^#include\w*\s+/m.test(text)) s += 0.1;
    if (/^(User_Alias|Runas_Alias|Host_Alias|Cmnd_Alias)\s+/m.test(text)) s += 0.3;
    if (/NOPASSWD/m.test(text)) s += 0.15;
    return Math.min(1, s);
  },

  parse(text) {
    const lines = text.split(/\r?\n/);
    const defaults = [];
    const aliases = [];
    const rules = [];
    const includes = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;

      if (line.startsWith('Defaults')) {
        defaults.push(line.replace(/^Defaults\s*/, ''));
      } else if (/^(User_Alias|Runas_Alias|Host_Alias|Cmnd_Alias)\s+/.test(line)) {
        const m = line.match(/^(\w+)\s+(\w+)\s*=\s*(.*)/);
        if (m) aliases.push({ type: m[1], name: m[2], value: m[3].trim() });
      } else if (/^#include/.test(line)) {
        includes.push(line);
      } else {
        // user/group  host=(runAs) cmds
        const m = line.match(/^(\S+)\s+(\S+)\s*=\s*(.+)/);
        if (m) {
          const runAsMatch = m[3].match(/^\(([^)]*)\)\s*(.*)/);
          rules.push({
            user: m[1],
            host: m[2],
            runAs: runAsMatch ? runAsMatch[1] : null,
            commands: runAsMatch ? runAsMatch[2] : m[3],
            nopasswd: /NOPASSWD/i.test(m[3]),
          });
        }
      }
    }

    const dangerousRules = rules.filter(r =>
      /ALL/i.test(r.commands) || r.nopasswd ||
      /\/bin\/(bash|sh|zsh)|\/usr\/bin\/(vi|vim|nano|less|more|env|find|awk|perl|python|ruby|node)/i.test(r.commands)
    );

    return { defaults, aliases, rules, includes, dangerousRules, count: rules.length };
  },

  suggestName() { return null; },
  suggestItemName() { return '/etc/sudoers'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `/etc/fstab` file parser.
 */
const ETC_FSTAB = {
  id:    'etc_fstab',
  label: '/etc/fstab',
  icon:  '💾',

  detect(text) {
    let s = 0;
    if (/^#.*fstab/im.test(text)) s += 0.3;
    // fstab line: device  mountpoint  fstype  options  dump  pass
    const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
    const fstabLines = lines.filter(l => {
      const parts = l.trim().split(/\s+/);
      return parts.length >= 4 && /(ext[234]|xfs|btrfs|tmpfs|vfat|ntfs|nfs|swap|auto|proc|sysfs|devpts|cifs|iso9660)/.test(parts[2]);
    });
    if (lines.length > 0 && fstabLines.length / lines.length >= 0.5) s += 0.7;
    else if (fstabLines.length >= 2) s += 0.4;
    if (/^UUID=/m.test(text) || /^\/dev\//m.test(text)) s += 0.15;
    return Math.min(1, s);
  },

  parse(text) {
    const entries = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 4) continue;
      entries.push({
        device: parts[0],
        mountpoint: parts[1],
        fstype: parts[2],
        options: parts[3],
        dump: parts[4] || '0',
        pass: parts[5] || '0',
      });
    }
    const nfs = entries.filter(e => /^nfs/.test(e.fstype));
    const cifs = entries.filter(e => e.fstype === 'cifs');
    const noauto = entries.filter(e => /noauto/.test(e.options));
    return { entries, count: entries.length, nfs, cifs, noauto };
  },

  suggestName() { return null; },
  suggestItemName() { return '/etc/fstab'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `sshd_config` parser (OpenSSH server configuration).
 */
const SSHD_CONFIG = {
  id:    'sshd_config',
  label: 'sshd_config',
  icon:  '🔧',

  detect(text) {
    let s = 0;
    // Common sshd_config directives
    const directives = [
      'Port', 'ListenAddress', 'PermitRootLogin', 'PasswordAuthentication',
      'PubkeyAuthentication', 'AuthorizedKeysFile', 'ChallengeResponseAuthentication',
      'UsePAM', 'X11Forwarding', 'AllowUsers', 'AllowGroups', 'DenyUsers',
      'Subsystem', 'AcceptEnv', 'MaxAuthTries', 'PermitEmptyPasswords',
    ];
    const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
    let hits = 0;
    for (const d of directives) {
      if (new RegExp(`^${d}\\s`, 'im').test(text)) hits++;
    }
    if (hits >= 4) s += 0.8;
    else if (hits >= 2) s += 0.5;
    if (/^#.*sshd_config|^#.*OpenSSH/im.test(text)) s += 0.2;
    return Math.min(1, s);
  },

  parse(text) {
    const settings = {};
    const comments = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) { comments.push(trimmed); continue; }
      const m = trimmed.match(/^(\w+)\s+(.*)/);
      if (m) {
        const key = m[1];
        const val = m[2].trim();
        if (settings[key]) {
          if (!Array.isArray(settings[key])) settings[key] = [settings[key]];
          settings[key].push(val);
        } else {
          settings[key] = val;
        }
      }
    }
    // Security audit highlights
    const issues = [];
    if (/^PermitRootLogin\s+(yes|without-password)/im.test(text))
      issues.push('⚠️ Root login permitted');
    if (/^PasswordAuthentication\s+yes/im.test(text))
      issues.push('⚠️ Password authentication enabled');
    if (/^PermitEmptyPasswords\s+yes/im.test(text))
      issues.push('🔴 Empty passwords allowed');
    if (!/^PubkeyAuthentication\s+yes/im.test(text) && !/^PubkeyAuthentication/im.test(text))
      issues.push('ℹ️ PubkeyAuthentication not explicitly set');
    const port = settings.Port || '22';
    if (port === '22') issues.push('ℹ️ Default port 22');

    return { settings, issues, port, settingCount: Object.keys(settings).length };
  },

  suggestName() { return null; },
  suggestItemName() { return 'sshd_config'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apache / httpd.conf / nginx.conf parser.
 * Handles common Apache and Nginx configuration directives.
 */
const APACHE_CONF = {
  id:    'apache_conf',
  label: 'Apache / Nginx conf',
  icon:  '🌐',

  detect(text) {
    let s = 0;
    // Apache directives
    if (/<VirtualHost\s/im.test(text)) s += 0.6;
    if (/<Directory\s/im.test(text)) s += 0.3;
    if (/^(ServerRoot|DocumentRoot|ServerName|ServerAdmin|ErrorLog|CustomLog|LoadModule)\s/im.test(text)) s += 0.4;
    if (/^(Listen|ServerTokens|ServerSignature|TraceEnable)\s/im.test(text)) s += 0.2;
    if (/^#.*httpd\.conf|^#.*apache/im.test(text)) s += 0.2;
    // Nginx
    if (/^\s*server\s*\{/m.test(text)) s += 0.4;
    if (/^\s*location\s+[\w/~]/m.test(text)) s += 0.3;
    if (/^(worker_processes|error_log|access_log|proxy_pass|fastcgi_pass)\s/im.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const lines = text.split(/\r?\n/);
    const directives = {};
    const vhosts = [];
    const locations = [];
    const modules = [];
    const issues = [];

    let inVhost = false;
    let currentVhost = null;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;

      // Track VirtualHost blocks
      const vhostOpen = line.match(/<VirtualHost\s+([^>]+)>/i);
      if (vhostOpen) {
        inVhost = true;
        currentVhost = { bind: vhostOpen[1], directives: {} };
        continue;
      }
      if (/<\/VirtualHost>/i.test(line)) {
        if (currentVhost) vhosts.push(currentVhost);
        inVhost = false;
        currentVhost = null;
        continue;
      }

      // LoadModule
      const modMatch = line.match(/^LoadModule\s+(\S+)\s+(\S+)/i);
      if (modMatch) { modules.push({ name: modMatch[1], path: modMatch[2] }); continue; }

      // location blocks (nginx)
      const locMatch = line.match(/^\s*location\s+(.*?)\s*\{/);
      if (locMatch) { locations.push(locMatch[1]); continue; }

      // Generic key-value directive
      const m = line.match(/^(\w+)\s+(.*)/);
      if (m) {
        const target = inVhost && currentVhost ? currentVhost.directives : directives;
        target[m[1]] = m[2].replace(/;$/, '').trim();
      }
    }

    // Security checks
    if (/ServerTokens\s+(Full|OS|Major)/im.test(text))
      issues.push('⚠️ ServerTokens exposes version info');
    if (/ServerSignature\s+On/im.test(text))
      issues.push('⚠️ ServerSignature enabled');
    if (/Options.*Indexes/im.test(text))
      issues.push('⚠️ Directory listing (Indexes) enabled');
    if (/AllowOverride\s+All/im.test(text))
      issues.push('ℹ️ AllowOverride All — .htaccess fully enabled');
    if (/autoindex\s+on/im.test(text))
      issues.push('⚠️ Nginx autoindex on');

    const isNginx = /worker_processes|server\s*\{|location\s/im.test(text);
    return {
      type: isNginx ? 'nginx' : 'apache',
      directives,
      vhosts,
      locations,
      modules,
      issues,
      directiveCount: Object.keys(directives).length,
    };
  },

  suggestName() { return null; },
  suggestItemName(pd) { return pd?.type === 'nginx' ? 'nginx.conf' : 'httpd.conf'; },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * `ps faux` / `ps auxf` — process tree format parser.
 * Handles the tree-style output with `\_ ` hierarchy indicators.
 */
const PS_FAUX = {
  id:    'ps_faux',
  label: 'ps faux (tree)',
  icon:  '🌳',

  detect(text) {
    let s = 0;
    if (/^USER\s+PID\s+%CPU/im.test(text)) s += 0.3;
    // Tree indicators like  \_ or  |
    const treeLines = text.split(/\r?\n/).filter(l => /[\\|]_?\s+\S/.test(l) || /^\s*[`|\\]/.test(l));
    if (treeLines.length >= 3) s += 0.5;
    if (/\\_\s+/.test(text)) s += 0.3;
    return Math.min(1, s);
  },

  parse(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const processes = [];
    for (const line of lines) {
      // Skip header
      if (/^USER\s+PID/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) continue;
      // Compute depth from leading whitespace / tree chars in command area
      const cmdPart = parts.slice(10).join(' ');
      const depth = (cmdPart.match(/^([| \\`_]+)/)?.[1]?.length || 0);
      const cleanCmd = cmdPart.replace(/^[| \\`_]+/, '').trim();
      processes.push({
        user:    parts[0],
        pid:     parseInt(parts[1], 10),
        cpu:     parseFloat(parts[2]),
        mem:     parseFloat(parts[3]),
        vsz:     parts[4],
        rss:     parts[5],
        tty:     parts[6],
        stat:    parts[7],
        start:   parts[8],
        time:    parts[9],
        command: cleanCmd || cmdPart,
        depth,
      });
    }
    const rootProcs = processes.filter(p => p.user === 'root');
    const highCpu = processes.filter(p => p.cpu > 50);
    const highMem = processes.filter(p => p.mem > 10);
    return { processes, count: processes.length, rootProcs: rootProcs.length, highCpu, highMem };
  },

  suggestName() { return null; },
  suggestItemName() { return 'ps faux'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  PLAIN IP ADDRESS PARSERS
// ─────────────────────────────────────────────────────────────────────────────

/** Matches content that is purely a single IPv4 address (with optional CIDR). */
const IP_ADDRESS_V4 = {
  id:    'ip_address_v4',
  label: 'IPv4 Address',
  icon:  '🌐',

  detect(text) {
    const t = text.trim();
    return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(t) ? 0.95 : 0;
  },

  parse(text) {
    const t = text.trim();
    const m = t.match(/^((\d{1,3}\.){3}\d{1,3})(\/(\d{1,2}))?$/);
    const address = m ? m[1] : t;
    const cidr    = m && m[4] != null ? parseInt(m[4]) : null;
    return { address, cidr, version: 4 };
  },

  suggestName(pd)     { return null; },
  suggestItemName(pd) {
    return pd.cidr != null ? `${pd.address}/${pd.cidr}` : (pd.address || 'IPv4 Address');
  },
};

/** Matches content that is purely a single IPv6 address (with optional prefix length). */
const IP_ADDRESS_V6 = {
  id:    'ip_address_v6',
  label: 'IPv6 Address',
  icon:  '🌐',

  detect(text) {
    const t = text.trim();
    if (!t.includes(':')) return 0;
    return /^[0-9a-f:%]+(?:\/\d{1,3})?$/i.test(t) && /[0-9a-f]/i.test(t) ? 0.95 : 0;
  },

  parse(text) {
    const t = text.trim();
    const m = t.match(/^([0-9a-f:%]+)(\/(\d{1,3}))?$/i);
    const address = m ? m[1] : t;
    const prefix  = m && m[3] != null ? parseInt(m[3]) : null;
    return { address, prefix, version: 6 };
  },

  suggestName(pd)     { return null; },
  suggestItemName(pd) {
    return pd.prefix != null ? `${pd.address}/${pd.prefix}` : (pd.address || 'IPv6 Address');
  },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linux auth.log / /var/log/secure parser.
 * Extracts SSH logins (success/failure), sudo usage, su, and user management.
 */
const AUTH_LOG = {
  id:    'auth_log',
  label: 'auth.log / secure',
  icon:  '🔐',

  detect(text) {
    let s = 0;
    if (/Failed password for/i.test(text))                                    s += 0.45;
    if (/Accepted (publickey|password|keyboard-interactive) for/i.test(text)) s += 0.40;
    if (/pam_unix\(sshd:auth\)/i.test(text))                                  s += 0.35;
    if (/sshd\[\d+\]/i.test(text))                                            s += 0.25;
    if (/sudo:\s+\w+.*COMMAND=/i.test(text))                                  s += 0.35;
    if (/useradd\[|new user:|usermod\[/i.test(text))                          s += 0.20;
    // syslog timestamp: "Mon DD HH:MM:SS"
    if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/m.test(text)) s += 0.15;
    return Math.min(1, s);
  },

  parse(text) {
    const events   = [];
    const syslogRe = /^(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s+(.*)/;

    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      const m = line.match(syslogRe);
      if (!m) continue;
      const [, timestamp, host, service, , message] = m;

      let type = 'other';
      let user = null;
      let from = null;

      // SSH failed login
      const failM = message.match(/Failed (?:password|publickey) for (?:invalid user )?(\S+) from ([\d.:a-f]+)/i);
      if (failM) { type = 'ssh_fail';    user = failM[1]; from = failM[2]; }

      // SSH successful login
      const okM = message.match(/Accepted (?:password|publickey|keyboard-interactive) for (\S+) from ([\d.:a-f]+)/i);
      if (okM)   { type = 'ssh_success'; user = okM[1];   from = okM[2]; }

      // sudo
      const sudoM = message.match(/^(\w+)\s+:.*?COMMAND=(.*)/i);
      if (sudoM && /^sudo/.test(service)) { type = 'sudo'; user = sudoM[1]; }

      // su
      const suM = message.match(/Successful su for (\S+)/i);
      if (suM && /\bsu\b/.test(service)) { type = 'su'; user = suM[1]; }

      // useradd
      if (/useradd|new user/i.test(message)) {
        type = 'user_add';
        user = (message.match(/name=(\S+)/i) || message.match(/user[:\s]+(\S+)/i) || [])[1] || null;
      }

      // userdel
      if (/userdel|delete user/i.test(message)) {
        type = 'user_del';
        user = (message.match(/user[:\s]+(\S+)/i) || [])[1] || null;
      }

      events.push({ timestamp, host, service, type, user, from, message: message.slice(0, 200) });
    }

    return {
      events,
      failedLogins:  events.filter((e) => e.type === 'ssh_fail'),
      successLogins: events.filter((e) => e.type === 'ssh_success'),
      sudoEvents:    events.filter((e) => e.type === 'sudo'),
      userAddEvents: events.filter((e) => e.type === 'user_add'),
      failedIPs:     [...new Set(events.filter((e) => e.type === 'ssh_fail' && e.from).map((e) => e.from))],
    };
  },

  suggestName()     { return null; },
  suggestItemName() { return 'auth.log analysis'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL HEADERS PARSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses raw email headers (copy-pasted from "View Source" / "Show Original").
 * Extracts: From, To, Cc, Reply-To, Date, Subject, Message-ID,
 * Received chain (hops), X-Originating-IP, X-Sender-IP, SPF, DKIM, etc.
 */
const EMAIL_HEADERS = {
  id:    'email_headers',
  label: 'Email Headers',
  icon:  '📧',

  detect(text) {
    let s = 0;
    if (/^From:\s/mi.test(text))          s += 0.3;
    if (/^To:\s/mi.test(text))            s += 0.2;
    if (/^Subject:\s/mi.test(text))       s += 0.2;
    if (/^Received:\s/mi.test(text))      s += 0.2;
    if (/^Message-ID:\s/mi.test(text))    s += 0.1;
    if (/^MIME-Version:/mi.test(text))    s += 0.1;
    if (/^Date:\s/mi.test(text))          s += 0.1;
    return Math.min(1, s);
  },

  parse(text) {
    // Decode MIME RFC 2047 encoded-words: =?charset?B|Q?...?=
    const decodeMime = (str) => {
      if (!str || !str.includes('=?')) return str;
      return str.replace(/=\?([^?]+)\?(B|Q)\?([^?]*)\?=/gi, (_, charset, enc, encoded) => {
        try {
          if (enc.toUpperCase() === 'B') {
            // Base64
            const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
            return new TextDecoder(charset).decode(bytes);
          } else {
            // Quoted-Printable
            const qp = encoded.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
            return new TextDecoder(charset).decode(Uint8Array.from(qp, (c) => c.charCodeAt(0)));
          }
        } catch { return encoded; }
      // Collapse whitespace between adjacent encoded-words
      }).replace(/\?=\s+=\?[^?]+\?[BQbq]\?/g, '');
    };

    // Unfold headers (continuation lines start with whitespace)
    const unfolded = text.replace(/\r?\n([ \t]+)/g, ' ');
    const lines = unfolded.split(/\r?\n/);

    const headers = {};
    for (const line of lines) {
      const m = line.match(/^([\w-]+):\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = decodeMime(m[2].trim());
      if (!headers[key]) headers[key] = [];
      headers[key].push(val);
    }

    // Extract email addresses with optional display names
    const parseAddr = (raw) => {
      if (!raw) return [];
      const results = [];
      // Pattern: "Display Name" <email@domain> or just email@domain
      const re = /(?:"?([^"<]*?)"?\s*)?<?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/g;
      let m2;
      while ((m2 = re.exec(raw)) !== null) {
        results.push({ name: (m2[1] || '').replace(/^[\s,;]+|[\s,;]+$/g, ''), email: m2[2].toLowerCase() });
      }
      return results;
    };

    const from    = parseAddr((headers['from']       || [])[0]);
    const to      = parseAddr((headers['to']         || []).join(', '));
    const cc      = parseAddr((headers['cc']         || []).join(', '));
    const replyTo = parseAddr((headers['reply-to']   || [])[0]);
    const subject = (headers['subject'] || [])[0] || '';
    const date    = (headers['date']    || [])[0] || '';
    const msgId   = (headers['message-id'] || [])[0] || '';

    // Received chain (most recent first as in raw headers)
    const received = (headers['received'] || []).map((r) => {
      const fromM  = r.match(/from\s+(\S+)/i);
      const byM    = r.match(/by\s+(\S+)/i);
      const ipM    = r.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
      const dateM  = r.match(/;\s*(.+)$/);
      return {
        raw: r.slice(0, 300),
        fromHost: fromM  ? fromM[1]  : null,
        byHost:   byM    ? byM[1]    : null,
        ip:       ipM    ? ipM[1]    : null,
        date:     dateM  ? dateM[1].trim() : null,
      };
    });

    // Originating IPs
    const origIP = (headers['x-originating-ip'] || headers['x-sender-ip'] || [])
      .map((v) => v.replace(/[[\]]/g, '').trim())
      .filter(Boolean);

    // Auth results
    const authResults = (headers['authentication-results'] || []).join('; ');
    const spf  = (authResults.match(/spf=(\w+)/i)  || [])[1] || null;
    const dkim = (authResults.match(/dkim=(\w+)/i)  || [])[1] || null;
    const dmarc = (authResults.match(/dmarc=(\w+)/i) || [])[1] || null;

    // X-Mailer / User-Agent
    const mailer = (headers['x-mailer'] || headers['user-agent'] || [])[0] || null;

    // Return-Path
    const returnPath = parseAddr((headers['return-path'] || [])[0]);

    return {
      from, to, cc, replyTo, returnPath,
      subject, date, messageId: msgId,
      received, originatingIPs: origIP,
      spf, dkim, dmarc, mailer,
      headerCount: Object.keys(headers).length,
    };
  },

  suggestName(pd) {
    return pd.from?.[0]?.email || null;
  },
  suggestItemName() { return 'Email Headers'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL BODY / SIGNATURE PARSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts structured info from an email body:
 *  - Signature block → name, title, organization, phone, email, website
 *  - Reply chains → quoted senders
 */
const EMAIL_BODY = {
  id:    'email_body',
  label: 'Email Body / Signature',
  icon:  '✉️',

  detect(text) {
    let s = 0;
    // Signature separators
    if (/^--\s*$/m.test(text))              s += 0.15;
    if (/^_{3,}/m.test(text))               s += 0.1;
    // Typical signature fields
    if (/\b(tel|phone|fax|mobile)\s*[:.]?\s*[\d+(\s]/im.test(text)) s += 0.2;
    // Email in body
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text))      s += 0.15;
    // Title-like patterns
    if (/\b(manager|director|engineer|analyst|officer|head of|chef|responsable|consultant|architect)\b/i.test(text)) s += 0.2;
    // Organization patterns
    if (/\b(inc\.|corp\.|ltd\.|sarl|sas|gmbh|ag|plc|llc|group)\b/i.test(text)) s += 0.15;
    // Reply chain markers
    if (/^(>|On .+ wrote:)/m.test(text))    s += 0.1;
    return Math.min(1, s);
  },

  parse(text) {
    const signatures = [];
    const mentions   = [];

    // Find signature blocks: after "-- \n" or "__\n" or at end of email
    const sigSeps = [/^--\s*$/m, /^_{3,}\s*$/m, /^-{3,}\s*$/m];
    let sigBlock = '';
    for (const sep of sigSeps) {
      const idx = text.search(sep);
      if (idx !== -1) {
        sigBlock = text.slice(idx);
        break;
      }
    }
    // If no explicit separator, take the last 15 lines
    if (!sigBlock) {
      const lines = text.trim().split('\n');
      sigBlock = lines.slice(-15).join('\n');
    }

    // Extract contact info from signature
    const extractSig = (block) => {
      const sig = { name: null, title: null, org: null, phone: null, email: null, website: null, address: null };

      // Email
      const emM = block.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
      if (emM) sig.email = emM[1].toLowerCase();

      // Phone (international + local formats)
      const phM = block.match(/(?:tel|phone|mobile|fax|t[ée]l)[.\s:]*([+\d][\d\s.()\-]{6,})/i)
               || block.match(/([+]?\d[\d\s.()\-]{8,})/);
      if (phM) sig.phone = phM[1].trim();

      // Website
      const wwM = block.match(/(https?:\/\/[^\s<>"]+)/i)
               || block.match(/(www\.[^\s<>"]+)/i);
      if (wwM) sig.website = wwM[1];

      // Organization
      const orgRe = /\b([A-Z][\w&.\-]+(?:\s+(?:Inc|Corp|Ltd|SARL|SAS|GmbH|AG|PLC|LLC|Group|International|Solutions|Technologies|Consulting|Services|Systems|Security))+\.?)\b/;
      const orM = block.match(orgRe);
      if (orM) sig.org = orM[1].trim();

      // Scan lines in order to detect: physical address, full-line title, name
      const lines = block.split('\n').map((l) => l.replace(/^[-_\s>]+/, '').trim()).filter(Boolean);

      // Title keywords — the *full line* is captured, not just the matched keyword
      const titleKw = /\b(chief|senior|junior|lead|head\s+of|deputy|associate|assistant|principal|staff|managing|general|manager|director|engineer|analyst|officer|architect|consultant|developer|administrator|specialist|coordinator|technician|designer|scientist|researcher|president|vp|ceo|cto|cio|ciso|cso|cfo|coo|responsable|chef\s+de|ing[ée]nieur|directeur|directrice|analyste|technicien|architecte|administrateur|charg[ée]\s+de|gestionnaire)\b/i;

      // Street address pattern (FR + EN): optional building/campus prefix, then house number + street keyword
      // Matches: "5 rue Bellini", "Campus Cyber, 5 rue Bellini", "Bâtiment A, 12 avenue..."
      const streetRe = /(?:^|,\s*)\d[\d\s]*[,\s]+(?:rue|avenue|av\.?|boulevard|bd\.?|route|chemin|impasse|all[ée]e|place|quai|passage|square|street|road|lane|drive|way|blvd|ave\.?|r[ée]sidence|b[âa]timent|bat\.?|zi\b|za\b|zac\b|zae\b)/i;
      // Postal code + city (4–5 digits optionally followed by comma/space then a city name)
      const zipCityRe = /^\d{4,5}[\s,]+[A-ZÀ-ÝÂÊÎÔÛÄËÏÖÜÇa-zA-Zà-ÿ]/;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (l.length < 2) continue;
        if (sig.email   && l.includes(sig.email))   continue;
        if (sig.phone   && l.includes(sig.phone))   continue;
        if (sig.website && l.includes(sig.website)) continue;
        if (/^(http|www|tel|fax|phone|mobile)/i.test(l)) continue;

        // Physical address: street line (optionally followed by ZIP+city on the next line)
        if (!sig.address && streetRe.test(l) && l.length <= 100) {
          const parts = [l];
          if (i + 1 < lines.length && zipCityRe.test(lines[i + 1]) && lines[i + 1].length <= 60) {
            parts.push(lines[i + 1].trim());
            i++;
          }
          sig.address = parts.join(', ');
          continue;
        }

        // Bare ZIP+city line (when no street prefix was detected yet)
        if (!sig.address && zipCityRe.test(l) && /\d{4,5}/.test(l) && l.length <= 60) {
          sig.address = l;
          continue;
        }

        // Title: full line that contains a title keyword
        if (!sig.title && titleKw.test(l) && l.length <= 80) {
          sig.title = l;
          continue;
        }

        // Name: first line that looks like a proper name (2–4 capitalised words)
        if (!sig.name && l.length >= 3 && l.length <= 60) {
          if (/^[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+(?:\s+[A-ZÀ-ÖÙ-Ý][a-zà-öù-ÿ]+){0,3}$/.test(l)) {
            sig.name = l;
            continue;
          }
          // "LASTNAME Firstname" or "Firstname LASTNAME"
          if (/^[A-ZÀ-Ý]{2,}\s+[A-ZÀ-Ý][a-zà-ÿ]+|^[A-ZÀ-Ý][a-zà-ÿ]+\s+[A-ZÀ-Ý]{2,}/.test(l)) {
            sig.name = l;
            continue;
          }
        }
      }

      return sig;
    };

    const mainSig = extractSig(sigBlock);
    if (mainSig.name || mainSig.email || mainSig.title) {
      signatures.push(mainSig);
    }

    // Extract quoted reply senders: "On ... <email> wrote:" or "From: Name <email>"
    const replyRe = /(?:On\s.+?<([^>]+@[^>]+)>\s*wrote:|^From:\s*.*?<([^>]+@[^>]+)>)/gmi;
    let rm;
    while ((rm = replyRe.exec(text)) !== null) {
      const email = (rm[1] || rm[2] || '').toLowerCase();
      if (email && !mentions.includes(email)) mentions.push(email);
    }

    // Also find all emails in body as mentions
    const allEmails = [...text.matchAll(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g)]
      .map((m) => m[1].toLowerCase());
    for (const e of allEmails) {
      if (!mentions.includes(e)) mentions.push(e);
    }

    return { signatures, mentions, sigBlock: sigBlock.slice(0, 1000) };
  },

  suggestName(pd) {
    return pd.signatures?.[0]?.name || pd.signatures?.[0]?.email || null;
  },
  suggestItemName() { return 'Email Signature'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  RECON & SUBDOMAIN DISCOVERY
// ─────────────────────────────────────────────────────────────────────────────

/** Amass enum / intel output */
const AMASS = {
  id: 'amass', label: 'Amass', icon: '🗺️',
  detect(text) {
    let s = 0;
    if (/amass\s+(enum|intel)/i.test(text)) s += 0.5;
    if (/\bOWASP\b/i.test(text) && /amass/i.test(text)) s += 0.3;
    if (/^\S+\.\S+\.\S+$/m.test(text) && text.split('\n').filter(l => /^\S+\.\S+\.\S+$/.test(l.trim())).length > 3) s += 0.3;
    if (/\(FQDN\)/i.test(text)) s += 0.3;
    if (/Querying\s/i.test(text) && /data sources/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const domains = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l || l.startsWith('#') || /^(\[|amass|OWASP|Querying)/i.test(l)) continue;
      const m = l.match(/^([\w.-]+\.\w{2,})(?:\s|$)/);
      if (m) domains.push(m[1].toLowerCase());
    }
    return { domains: [...new Set(domains)], count: new Set(domains).size };
  },
  suggestName(pd) { return pd.domains?.[0]?.split('.').slice(-2).join('.') || null; },
  suggestItemName() { return 'amass enum'; },
};

/** Subfinder output (one domain per line) */
const SUBFINDER = {
  id: 'subfinder', label: 'Subfinder', icon: '🔎',
  detect(text) {
    let s = 0;
    if (/subfinder/i.test(text)) s += 0.5;
    if (/projectdiscovery/i.test(text)) s += 0.2;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const domainLines = lines.filter(l => /^[\w.-]+\.\w{2,}$/.test(l));
    if (domainLines.length > 5 && domainLines.length / lines.length > 0.7) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const domains = text.split('\n').map(l => l.trim()).filter(l => /^[\w.-]+\.\w{2,}$/.test(l)).map(d => d.toLowerCase());
    return { domains: [...new Set(domains)], count: new Set(domains).size };
  },
  suggestName(pd) { return pd.domains?.[0]?.split('.').slice(-2).join('.') || null; },
  suggestItemName() { return 'subfinder'; },
};

/** Github-Subdomains output */
const GITHUB_SUBDOMAINS = {
  id: 'github_subdomains', label: 'Github-Subdomains', icon: '🐙',
  detect(text) {
    let s = 0;
    if (/github.subdomains|github-subdomains/i.test(text)) s += 0.6;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const domainLines = lines.filter(l => /^[\w.-]+\.\w{2,}$/.test(l));
    if (domainLines.length > 3 && domainLines.length / lines.length > 0.8) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const domains = text.split('\n').map(l => l.trim()).filter(l => /^[\w.-]+\.\w{2,}$/.test(l)).map(d => d.toLowerCase());
    return { domains: [...new Set(domains)], count: new Set(domains).size };
  },
  suggestName(pd) { return pd.domains?.[0]?.split('.').slice(-2).join('.') || null; },
  suggestItemName() { return 'github-subdomains'; },
};

/** dig output parser */
const DIG = {
  id: 'dig', label: 'dig', icon: '🔍',
  detect(text) {
    let s = 0;
    if (/^;\s*<<>>\s*DiG\s/m.test(text)) s += 0.7;
    if (/;;\s*ANSWER SECTION/i.test(text)) s += 0.3;
    if (/;;\s*QUESTION SECTION/i.test(text)) s += 0.2;
    if (/;;\s*Query time/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const records = [];
    let inAnswer = false;
    for (const line of text.split('\n')) {
      if (/^;;\s*ANSWER SECTION/i.test(line)) { inAnswer = true; continue; }
      if (inAnswer && /^;;/.test(line)) { inAnswer = false; continue; }
      if (inAnswer) {
        const m = line.match(/^(\S+)\s+(\d+)\s+IN\s+(\w+)\s+(.+)/);
        if (m) records.push({ name: m[1], ttl: Number(m[2]), type: m[3], value: m[4].trim() });
      }
    }
    const server = (text.match(/;;\s*SERVER:\s*(\S+)/i) || [])[1] || null;
    const queryTime = (text.match(/;;\s*Query time:\s*(\d+\s*\w+)/i) || [])[1] || null;
    return { records, server, queryTime, count: records.length };
  },
  suggestName(pd) { return pd.records?.[0]?.name?.replace(/\.$/, '') || null; },
  suggestItemName() { return 'dig'; },
};

/** ShuffleDNS / PureDNS / MassDNS output (resolved domains) */
const MASS_DNS = {
  id: 'mass_dns', label: 'MassDNS / ShuffleDNS / PureDNS', icon: '📡',
  detect(text) {
    let s = 0;
    if (/shuffledns|puredns|massdns/i.test(text)) s += 0.5;
    // massdns format: domain. type value
    if (/^\S+\.\s+(A|AAAA|CNAME)\s+\S+/m.test(text)) s += 0.4;
    // plain resolved list
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const domainLines = lines.filter(l => /^[\w.-]+\.\w{2,}$/.test(l));
    if (domainLines.length > 10 && domainLines.length / lines.length > 0.8) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const resolved = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      // massdns format: domain. A 1.2.3.4
      const m = l.match(/^([\w.-]+\.)\s+(A|AAAA|CNAME)\s+(.+)/);
      if (m) { resolved.push({ domain: m[1].replace(/\.$/, ''), type: m[2], value: m[3].trim() }); continue; }
      // plain domain
      if (/^[\w.-]+\.\w{2,}$/.test(l)) resolved.push({ domain: l.toLowerCase(), type: 'resolved', value: '' });
    }
    return { resolved, count: resolved.length };
  },
  suggestName(pd) { return pd.resolved?.[0]?.domain?.split('.').slice(-2).join('.') || null; },
  suggestItemName() { return 'dns bruteforce'; },
};

/** Dnsgen output (permutation wordlist — domains) */
const DNSGEN = {
  id: 'dnsgen', label: 'Dnsgen', icon: '🧬',
  detect(text) {
    let s = 0;
    if (/dnsgen/i.test(text)) s += 0.5;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const dl = lines.filter(l => /^[\w.-]+\.\w{2,}$/.test(l));
    if (dl.length > 20 && dl.length / lines.length > 0.95) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const domains = text.split('\n').map(l => l.trim()).filter(l => /^[\w.-]+\.\w{2,}$/.test(l));
    return { domains: [...new Set(domains)], count: new Set(domains).size };
  },
  suggestName(pd) { return pd.domains?.[0]?.split('.').slice(-2).join('.') || null; },
  suggestItemName() { return 'dnsgen'; },
};

/** DNSX output (resolver / enumeration) */
const DNSX = {
  id: 'dnsx', label: 'DNSX', icon: '📡',
  detect(text) {
    let s = 0;
    if (/dnsx/i.test(text) && /projectdiscovery/i.test(text)) s += 0.5;
    // dnsx output: domain [A] [1.2.3.4]
    if (/\[A\]|\[AAAA\]|\[CNAME\]|\[MX\]/i.test(text)) s += 0.3;
    if (/^\S+\.\S+\s+\[/m.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const records = [];
    for (const line of text.split('\n')) {
      const m = line.match(/^([\w.-]+)\s+\[(\w+)\]\s+\[([^\]]+)\]/);
      if (m) records.push({ domain: m[1], type: m[2], value: m[3] });
    }
    // also plain domain lines
    if (!records.length) {
      for (const line of text.split('\n')) {
        const l = line.trim();
        if (/^[\w.-]+\.\w{2,}$/.test(l)) records.push({ domain: l, type: 'A', value: '' });
      }
    }
    return { records, count: records.length };
  },
  suggestName(pd) { return pd.records?.[0]?.domain?.split('.').slice(-2).join('.') || null; },
  suggestItemName() { return 'dnsx'; },
};

/** Hakrevdns — reverse DNS lookups */
const HAKREVDNS = {
  id: 'hakrevdns', label: 'Hakrevdns', icon: '🔄',
  detect(text) {
    let s = 0;
    if (/hakrevdns/i.test(text)) s += 0.5;
    // format: IP\tPTR
    const lines = text.split('\n').filter(l => /^\d+\.\d+\.\d+\.\d+\s+\S+/.test(l.trim()));
    if (lines.length > 3) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    for (const line of text.split('\n')) {
      const m = line.trim().match(/^(\d+\.\d+\.\d+\.\d+)\s+([\w.-]+)/);
      if (m) results.push({ ip: m[1], ptr: m[2].replace(/\.$/, '') });
    }
    return { results, count: results.length };
  },
  suggestName(pd) { return pd.results?.[0]?.ptr || pd.results?.[0]?.ip || null; },
  suggestItemName() { return 'hakrevdns'; },
};

/** Prips — IP range expansion */
const PRIPS = {
  id: 'prips', label: 'Prips', icon: '📋',
  detect(text) {
    let s = 0;
    if (/prips/i.test(text)) s += 0.4;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const ips = lines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l));
    if (ips.length > 10 && ips.length / lines.length > 0.9) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const ips = text.split('\n').map(l => l.trim()).filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l));
    return { ips, count: ips.length };
  },
  suggestName(pd) { return pd.ips?.length ? `${pd.ips[0]}-${pd.ips[pd.ips.length - 1]}` : null; },
  suggestItemName() { return 'prips'; },
};

/** Certstream / certstream-go — certificate transparency log watcher */
const CERTSTREAM = {
  id: 'certstream', label: 'Certstream', icon: '📜',
  detect(text) {
    let s = 0;
    if (/certstream/i.test(text)) s += 0.5;
    if (/certificate_update|leaf_cert|all_domains/i.test(text)) s += 0.3;
    if (/\"message_type\"/i.test(text) && /\"data\"/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const domains = new Set();
    // JSON-line format
    for (const line of text.split('\n')) {
      try {
        const obj = JSON.parse(line);
        for (const d of (obj?.data?.leaf_cert?.all_domains || obj?.all_domains || [])) {
          if (d && d !== '*.') domains.add(d.replace(/^\*\./, '').toLowerCase());
        }
      } catch { /* plain text fallback */ }
      const m = line.match(/(?:CN|DNS)[=:]([^\s,]+)/gi);
      if (m) m.forEach(hit => { const v = hit.split(/[=:]/)[1]; if (v) domains.add(v.replace(/^\*\./, '').toLowerCase()); });
    }
    return { domains: [...domains], count: domains.size };
  },
  suggestName(pd) { return pd.domains?.[0]?.split('.').slice(-2).join('.') || null; },
  suggestItemName() { return 'certstream'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  HTTP PROBING & WEB ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/** Httpx output (ProjectDiscovery) */
const HTTPX = {
  id: 'httpx', label: 'Httpx', icon: '🌐',
  detect(text) {
    let s = 0;
    if (/httpx/i.test(text) && /projectdiscovery/i.test(text)) s += 0.5;
    // JSON-line with status_code + url
    if (/\"status.code\"\s*:\s*\d{3}/i.test(text) && /\"url\"/i.test(text)) s += 0.4;
    // plain: http(s)://host [200] [title]
    if (/^https?:\/\/\S+\s+\[\d{3}\]/m.test(text)) s += 0.5;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      // JSON format
      try {
        const obj = JSON.parse(l);
        if (obj.url || obj.input) {
          results.push({
            url: obj.url || obj.input,
            status: obj.status_code || obj.status || 0,
            title: obj.title || '',
            tech: obj.tech || [],
            contentLength: obj.content_length || 0,
            webServer: obj.webserver || '',
          });
          continue;
        }
      } catch { /* not JSON */ }
      // Plain format: https://host [200] [title] [tech]
      const m = l.match(/^(https?:\/\/\S+)\s+\[(\d{3})\](?:\s+\[([^\]]*)\])?(?:\s+\[([^\]]*)\])?/);
      if (m) results.push({ url: m[1], status: Number(m[2]), title: m[3] || '', tech: m[4] ? m[4].split(',').map(t => t.trim()) : [] });
    }
    return { results, count: results.length };
  },
  suggestName(pd) { try { return new URL(pd.results?.[0]?.url).hostname; } catch { return null; } },
  suggestItemName() { return 'httpx'; },
};

/** Httprobe output (alive hosts) */
const HTTPROBE = {
  id: 'httprobe', label: 'Httprobe', icon: '🏓',
  detect(text) {
    let s = 0;
    if (/httprobe/i.test(text)) s += 0.5;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const urlLines = lines.filter(l => /^https?:\/\/[\w.-]+/.test(l) && !/\s/.test(l));
    if (urlLines.length > 3 && urlLines.length / lines.length > 0.8) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\/[\w.-]+/.test(l));
    const hosts = [...new Set(urls.map(u => { try { return new URL(u).hostname; } catch { return u; } }))];
    return { urls, hosts, count: urls.length };
  },
  suggestName(pd) { return pd.hosts?.[0] || null; },
  suggestItemName() { return 'httprobe'; },
};

/** TLSX — TLS cert grabber (ProjectDiscovery) */
const TLSX = {
  id: 'tlsx', label: 'TLSX', icon: '🔒',
  detect(text) {
    let s = 0;
    if (/tlsx/i.test(text) && /projectdiscovery/i.test(text)) s += 0.5;
    if (/\"tls_version\"/i.test(text) || /\"subject_dn\"/i.test(text)) s += 0.4;
    if (/\"host\"\s*:\s*\"/i.test(text) && /\"port\"\s*:\s*\d/i.test(text)) s += 0.3;
    // plain: host:port [version] [cipher]
    if (/^\S+:\d+\s+\[TLS/m.test(text)) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try {
        const obj = JSON.parse(l);
        if (obj.host) {
          results.push({
            host: obj.host, port: obj.port || 443,
            version: obj.tls_version || obj.version || '',
            cipher: obj.cipher || '',
            subject: obj.subject_dn || obj.subject_cn || '',
            issuer: obj.issuer_dn || obj.issuer_cn || '',
            san: obj.subject_an || [],
            expired: obj.expired || false,
          });
          continue;
        }
      } catch { /* not JSON */ }
      const m = l.match(/^([\w.-]+):(\d+)\s+\[([^\]]+)\]/);
      if (m) results.push({ host: m[1], port: Number(m[2]), version: m[3], cipher: '', subject: '', issuer: '' });
    }
    return { results, count: results.length };
  },
  suggestName(pd) { return pd.results?.[0]?.host || null; },
  suggestItemName() { return 'tlsx'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  WEB CRAWLING & URL DISCOVERY
// ─────────────────────────────────────────────────────────────────────────────

/** Katana — web crawler (ProjectDiscovery) */
const KATANA = {
  id: 'katana', label: 'Katana', icon: '🗡️',
  detect(text) {
    let s = 0;
    if (/katana/i.test(text) && /projectdiscovery/i.test(text)) s += 0.5;
    if (/\"endpoint\"/i.test(text) && /\"source\"/i.test(text)) s += 0.3;
    // plain URL list (http) with high density
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const urlLines = lines.filter(l => /^https?:\/\//i.test(l));
    if (urlLines.length > 5 && urlLines.length / lines.length > 0.7) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try {
        const obj = JSON.parse(l);
        if (obj.endpoint || obj.url) { urls.push(obj.endpoint || obj.url); continue; }
      } catch { /* not JSON */ }
      if (/^https?:\/\//i.test(l)) urls.push(l);
    }
    return { urls: [...new Set(urls)], count: new Set(urls).size };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'katana'; },
};

/** Gospider — web spider */
const GOSPIDER = {
  id: 'gospider', label: 'Gospider', icon: '🕷️',
  detect(text) {
    let s = 0;
    if (/gospider/i.test(text)) s += 0.5;
    if (/\[url\]|\[form\]|\[javascript\]|\[linkfinder\]/i.test(text)) s += 0.4;
    if (/\[subdomains\]/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = [], forms = [], jsFiles = [], subdomains = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (/\[url\]/i.test(l))        { const u = l.replace(/.*\]\s*-\s*/, '').trim(); if (u) urls.push(u); }
      if (/\[form\]/i.test(l))       { const u = l.replace(/.*\]\s*-\s*/, '').trim(); if (u) forms.push(u); }
      if (/\[javascript\]/i.test(l))  { const u = l.replace(/.*\]\s*-\s*/, '').trim(); if (u) jsFiles.push(u); }
      if (/\[subdomains?\]/i.test(l)) { const u = l.replace(/.*\]\s*-\s*/, '').trim(); if (u) subdomains.push(u); }
    }
    return { urls, forms, jsFiles, subdomains, count: urls.length };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'gospider'; },
};

/** Hakrawler — web crawler */
const HAKRAWLER = {
  id: 'hakrawler', label: 'Hakrawler', icon: '🕸️',
  detect(text) {
    let s = 0;
    if (/hakrawler/i.test(text)) s += 0.5;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const urlLines = lines.filter(l => /^https?:\/\//i.test(l));
    if (urlLines.length > 5 && urlLines.length / lines.length > 0.8) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//i.test(l));
    return { urls: [...new Set(urls)], count: new Set(urls).size };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'hakrawler'; },
};

/** Cariddi — web crawler + secrets finder */
const CARIDDI = {
  id: 'cariddi', label: 'Cariddi', icon: '🦑',
  detect(text) {
    let s = 0;
    if (/cariddi/i.test(text)) s += 0.6;
    if (/\[secret\]|\[endpoint\]|\[error\]/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = [], secrets = [], errors = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (/\[secret\]/i.test(l)) secrets.push(l.replace(/.*\]\s*/, ''));
      else if (/\[error\]/i.test(l)) errors.push(l.replace(/.*\]\s*/, ''));
      else if (/^https?:\/\//i.test(l)) urls.push(l);
    }
    return { urls, secrets, errors, count: urls.length };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'cariddi'; },
};

/** GAU — getallurls */
const GAU = {
  id: 'gau', label: 'GAU (GetAllUrls)', icon: '📦',
  detect(text) {
    let s = 0;
    if (/gau|getallurls/i.test(text)) s += 0.4;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const urlLines = lines.filter(l => /^https?:\/\//i.test(l));
    if (urlLines.length > 10 && urlLines.length / lines.length > 0.9) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//i.test(l));
    return { urls: [...new Set(urls)], count: new Set(urls).size };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'gau'; },
};

/** Waybackurls output */
const WAYBACKURLS = {
  id: 'waybackurls', label: 'Waybackurls', icon: '⏳',
  detect(text) {
    let s = 0;
    if (/waybackurls/i.test(text)) s += 0.5;
    if (/web\.archive\.org/i.test(text)) s += 0.3;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const urlLines = lines.filter(l => /^https?:\/\//i.test(l));
    if (urlLines.length > 10 && urlLines.length / lines.length > 0.9) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//i.test(l));
    return { urls: [...new Set(urls)], count: new Set(urls).size };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'waybackurls'; },
};

/** Waymore output */
const WAYMORE = {
  id: 'waymore', label: 'Waymore', icon: '⏳',
  detect(text) {
    let s = 0;
    if (/waymore/i.test(text)) s += 0.6;
    if (/\[wayback\]|\[commoncrawl\]|\[alienvault\]/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//i.test(l));
    return { urls: [...new Set(urls)], count: new Set(urls).size };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'waymore'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  JS / PARAMETER / SECRET ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/** Subjs — JS file extractor from HTTP responses */
const SUBJS = {
  id: 'subjs', label: 'Subjs', icon: '📜',
  detect(text) {
    let s = 0;
    if (/subjs/i.test(text)) s += 0.5;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const jsUrls = lines.filter(l => /^https?:\/\/.*\.js(\?.*)?$/i.test(l));
    if (jsUrls.length > 3 && jsUrls.length / lines.length > 0.7) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//i.test(l));
    return { urls: [...new Set(urls)], count: new Set(urls).size };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'subjs'; },
};

/** LinkFinder — JS endpoint extractor */
const LINKFINDER = {
  id: 'linkfinder', label: 'LinkFinder', icon: '🔗',
  detect(text) {
    let s = 0;
    if (/linkfinder/i.test(text)) s += 0.6;
    if (/Running against:/i.test(text) && /endpoints/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const endpoints = text.split('\n').map(l => l.trim()).filter(l => l && !/^Running|^$|^#/.test(l));
    return { endpoints: [...new Set(endpoints)], count: new Set(endpoints).size };
  },
  suggestName() { return null; },
  suggestItemName() { return 'linkfinder'; },
};

/** SecretFinder — secrets in JS files */
const SECRETFINDER = {
  id: 'secretfinder', label: 'SecretFinder', icon: '🔑',
  detect(text) {
    let s = 0;
    if (/secretfinder/i.test(text)) s += 0.6;
    if (/\[apikey\]|\[secret\]|\[token\]|\[password\]/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const findings = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      const m = l.match(/^\[(\w+)\]\s*(.+)/);
      if (m) findings.push({ type: m[1], value: m[2].trim() });
    }
    return { findings, count: findings.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'secretfinder'; },
};

/** Jsubfinder — secrets/endpoints from JS */
const JSUBFINDER = {
  id: 'jsubfinder', label: 'Jsubfinder', icon: '🔗',
  detect(text) {
    let s = 0;
    if (/jsubfinder/i.test(text)) s += 0.6;
    return Math.min(1, s);
  },
  parse(text) {
    const results = text.split('\n').map(l => l.trim()).filter(l => l && !/^#/.test(l));
    return { results, count: results.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'jsubfinder'; },
};

/** ParamSpider — parameter discovery */
const PARAMSPIDER = {
  id: 'paramspider', label: 'ParamSpider', icon: '🕷️',
  detect(text) {
    let s = 0;
    if (/paramspider/i.test(text)) s += 0.6;
    if (/FUZZ/.test(text)) s += 0.2;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const paramUrls = lines.filter(l => /^https?:\/\/.*[?&]\w+=/.test(l));
    if (paramUrls.length > 3 && paramUrls.length / lines.length > 0.6) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//i.test(l));
    const params = new Set();
    for (const u of urls) {
      try { for (const k of new URL(u).searchParams.keys()) params.add(k); } catch { /* skip */ }
    }
    return { urls, params: [...params], count: urls.length };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'paramspider'; },
};

/** Arjun — parameter brute-forcing */
const ARJUN = {
  id: 'arjun', label: 'Arjun', icon: '🎯',
  detect(text) {
    let s = 0;
    if (/arjun/i.test(text)) s += 0.5;
    if (/\bValid parameters\b/i.test(text)) s += 0.3;
    if (/\bTarget\b.*https?:\/\//i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const params = [];
    let target = (text.match(/Target:\s*(\S+)/i) || [])[1] || null;
    // "Valid parameters: param1, param2" or JSON output
    const listMatch = text.match(/Valid parameters?:?\s*(.+)/i);
    if (listMatch) {
      for (const p of listMatch[1].split(/[,\s]+/)) { const t = p.trim(); if (t) params.push(t); }
    }
    try {
      const obj = JSON.parse(text);
      for (const [url, pList] of Object.entries(obj)) {
        if (!target) target = url;
        for (const p of (Array.isArray(pList) ? pList : [])) params.push(p);
      }
    } catch { /* not JSON */ }
    return { target, params: [...new Set(params)], count: params.length };
  },
  suggestName(pd) { try { return new URL(pd.target).hostname; } catch { return pd.target || null; } },
  suggestItemName() { return 'arjun'; },
};

/** x8 — hidden parameter brute-forcer */
const X8 = {
  id: 'x8', label: 'x8', icon: '🎯',
  detect(text) {
    let s = 0;
    if (/\bx8\b/i.test(text) && /parameter/i.test(text)) s += 0.5;
    if (/Found\s+hidden\s+param/i.test(text)) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const params = [];
    for (const m of text.matchAll(/(?:Found|hidden)\s+param(?:eter)?:?\s*[`"']?(\w+)/gi)) {
      params.push(m[1]);
    }
    return { params: [...new Set(params)], count: params.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'x8'; },
};

/** URL manipulation utilities: Anew, Qsreplace, Unfurl, Gf, Uro */
const URL_UTILS = {
  id: 'url_utils', label: 'URL Utilities (anew/qsreplace/unfurl/gf/uro)', icon: '🔧',
  detect(text) {
    let s = 0;
    if (/anew|qsreplace|unfurl|uro/i.test(text)) s += 0.3;
    if (/\bgf\b/i.test(text) && /(xss|sqli|ssrf|redirect|lfi|rce|ssti)/i.test(text)) s += 0.4;
    // High-density URL list
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const urlLines = lines.filter(l => /^https?:\/\//i.test(l));
    if (urlLines.length > 10 && urlLines.length / lines.length > 0.9) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const urls = text.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//i.test(l) || /^[\w.-]+\.\w{2,}/.test(l));
    return { urls: [...new Set(urls)], count: new Set(urls).size };
  },
  suggestName(pd) { try { return new URL(pd.urls?.[0]).hostname; } catch { return null; } },
  suggestItemName() { return 'url utilities'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  PORT & SERVICE SCANNING
// ─────────────────────────────────────────────────────────────────────────────

/** Naabu — port scanner (ProjectDiscovery) */
const NAABU = {
  id: 'naabu', label: 'Naabu', icon: '🔌',
  detect(text) {
    let s = 0;
    if (/naabu/i.test(text) && /projectdiscovery/i.test(text)) s += 0.5;
    // format: host:port
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const hostPort = lines.filter(l => /^[\w.-]+:\d{1,5}$/.test(l));
    if (hostPort.length > 3 && hostPort.length / lines.length > 0.7) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    for (const line of text.split('\n')) {
      const m = line.trim().match(/^([\w.-]+):(\d{1,5})$/);
      if (m) results.push({ host: m[1], port: Number(m[2]) });
    }
    const hosts = [...new Set(results.map(r => r.host))];
    return { results, hosts, count: results.length };
  },
  suggestName(pd) { return pd.hosts?.[0] || null; },
  suggestItemName() { return 'naabu'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  VULNERABILITY SCANNING
// ─────────────────────────────────────────────────────────────────────────────

/** Nuclei (ProjectDiscovery) */
const NUCLEI = {
  id: 'nuclei', label: 'Nuclei', icon: '☢️',
  detect(text) {
    let s = 0;
    if (/nuclei/i.test(text) && /projectdiscovery/i.test(text)) s += 0.5;
    if (/\[(info|low|medium|high|critical)\]/i.test(text)) s += 0.3;
    if (/\[[\w:-]+\]\s+\[/m.test(text)) s += 0.3;  // [template-id] [severity]
    // JSON output
    if (/\"template-id\"/i.test(text) && /\"matched-at\"/i.test(text)) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const findings = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      // JSON format
      try {
        const obj = JSON.parse(l);
        if (obj['template-id'] || obj.templateID) {
          findings.push({
            templateId: obj['template-id'] || obj.templateID,
            name: obj.info?.name || obj.name || '',
            severity: obj.info?.severity || obj.severity || 'info',
            matchedAt: obj['matched-at'] || obj.matched || '',
            extractedResults: obj['extracted-results'] || [],
            tags: obj.info?.tags || [],
          });
          continue;
        }
      } catch { /* not JSON */ }
      // Plain format: [template-id] [protocol] [severity] matched-at
      const m = l.match(/\[([\w:-]+)\]\s+\[(\w+)\]\s+\[(info|low|medium|high|critical)\]\s+(.+)/i);
      if (m) findings.push({ templateId: m[1], protocol: m[2], severity: m[3].toLowerCase(), matchedAt: m[4].trim() });
    }
    const bySev = {};
    for (const f of findings) { bySev[f.severity] = (bySev[f.severity] || 0) + 1; }
    return { findings, bySeverity: bySev, count: findings.length };
  },
  suggestName(pd) {
    const first = pd.findings?.[0];
    if (!first) return null;
    try { return new URL(first.matchedAt).hostname; } catch { return first.matchedAt || null; }
  },
  suggestItemName() { return 'nuclei'; },
};

/** Jaeles — web vulnerability scanner */
const JAELES = {
  id: 'jaeles', label: 'Jaeles', icon: '🎯',
  detect(text) {
    let s = 0;
    if (/jaeles/i.test(text)) s += 0.6;
    if (/\[Vuln\]/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const findings = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (/\[Vuln\]/i.test(l)) {
        findings.push({ raw: l.replace(/\[Vuln\]\s*/i, '').trim() });
      }
    }
    return { findings, count: findings.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'jaeles'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  XSS TESTING
// ─────────────────────────────────────────────────────────────────────────────

/** Dalfox — XSS scanner */
const DALFOX = {
  id: 'dalfox', label: 'Dalfox', icon: '🦊',
  detect(text) {
    let s = 0;
    if (/dalfox/i.test(text)) s += 0.6;
    if (/\[POC\]|\[V\]|\[G\]/i.test(text)) s += 0.3;
    if (/\bVerified\b/i.test(text) && /xss/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const pocs = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (/\[POC\]/i.test(l)) pocs.push({ type: 'poc', payload: l.replace(/.*\[POC\]\s*/i, '') });
      else if (/\[V\]/i.test(l)) pocs.push({ type: 'verified', payload: l.replace(/.*\[V\]\s*/i, '') });
      else if (/\[G\]/i.test(l)) pocs.push({ type: 'grepping', payload: l.replace(/.*\[G\]\s*/i, '') });
    }
    return { pocs, count: pocs.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'dalfox'; },
};

/** XSStrike — XSS detection */
const XSSTRIKE = {
  id: 'xsstrike', label: 'XSStrike', icon: '⚡',
  detect(text) {
    let s = 0;
    if (/xsstrike/i.test(text)) s += 0.6;
    if (/Vulnerable|Payload/i.test(text) && /xss/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const vulns = [];
    for (const line of text.split('\n')) {
      if (/Vulnerable/i.test(line)) vulns.push(line.trim());
    }
    return { vulns, count: vulns.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'xsstrike'; },
};

/** Kxss — XSS reflection checker */
const KXSS = {
  id: 'kxss', label: 'Kxss', icon: '💉',
  detect(text) {
    let s = 0;
    if (/kxss/i.test(text)) s += 0.6;
    if (/unfiltered|reflected/i.test(text) && /param/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (l && !/^#/.test(l)) results.push(l);
    }
    return { results, count: results.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'kxss'; },
};

/** Airixss — XSS scanner */
const AIRIXSS = {
  id: 'airixss', label: 'Airixss', icon: '💉',
  detect(text) {
    let s = 0;
    if (/airixss/i.test(text)) s += 0.7;
    return Math.min(1, s);
  },
  parse(text) {
    const results = text.split('\n').map(l => l.trim()).filter(l => l && !/^#/.test(l));
    return { results, count: results.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'airixss'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SQL INJECTION
// ─────────────────────────────────────────────────────────────────────────────

/** SQLMap output */
const SQLMAP = {
  id: 'sqlmap', label: 'SQLMap', icon: '💉',
  detect(text) {
    let s = 0;
    if (/sqlmap/i.test(text)) s += 0.4;
    if (/\bsqlmap\.org\b/i.test(text)) s += 0.3;
    if (/\[INFO\].*parameter.*is vulnerable/i.test(text)) s += 0.5;
    if (/Type:\s*(boolean-based|time-based|UNION|error-based|stacked)/i.test(text)) s += 0.4;
    if (/back-end DBMS/i.test(text)) s += 0.3;
    if (/available databases/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const vulns = [];
    const databases = [];
    const tables = [];
    let dbms = (text.match(/back-end DBMS:\s*(.+)/i) || [])[1]?.trim() || null;
    let target = (text.match(/(?:URL|target|Target URL):\s*(\S+)/i) || [])[1] || null;

    // injection types
    for (const m of text.matchAll(/Parameter:\s*(\S+).*?\n((?:\s+Type:.*\n?)+)/gi)) {
      const param = m[1];
      const types = [...m[2].matchAll(/Type:\s*(.+)/gi)].map(t => t[1].trim());
      vulns.push({ parameter: param, types });
    }

    // databases
    for (const m of text.matchAll(/\[\*\]\s+(\S+)/g)) { databases.push(m[1]); }

    // tables
    for (const m of text.matchAll(/\|\s+(\S+)\s+\|/g)) {
      const t = m[1].trim();
      if (t && t !== 'Table' && !/^-+$/.test(t)) tables.push(t);
    }

    return { target, dbms, vulns, databases, tables, count: vulns.length };
  },
  suggestName(pd) { try { return new URL(pd.target).hostname; } catch { return pd.target || null; } },
  suggestItemName() { return 'sqlmap'; },
};

/** Ghauri — SQL injection */
const GHAURI = {
  id: 'ghauri', label: 'Ghauri', icon: '💉',
  detect(text) {
    let s = 0;
    if (/ghauri/i.test(text)) s += 0.6;
    if (/parameter.*injectable|is vulnerable/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const vulns = [];
    let target = (text.match(/(?:URL|target):\s*(\S+)/i) || [])[1] || null;
    for (const line of text.split('\n')) {
      if (/injectable|vulnerable/i.test(line)) vulns.push(line.trim());
    }
    return { target, vulns, count: vulns.length };
  },
  suggestName(pd) { try { return new URL(pd.target).hostname; } catch { return pd.target || null; } },
  suggestItemName() { return 'ghauri'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  WEB FUZZING (EXTENDED)
// ─────────────────────────────────────────────────────────────────────────────

/** Wfuzz output parser */
const WFUZZ = {
  id: 'wfuzz', label: 'Wfuzz', icon: '🐝',
  detect(text) {
    let s = 0;
    if (/wfuzz/i.test(text)) s += 0.5;
    if (/^\d+\s+\d+\s+\d+\s+\d+\.\d+\s/m.test(text)) s += 0.3;  // wfuzz output columns
    if (/Target:\s*https?:\/\//i.test(text)) s += 0.2;
    if (/Total requests/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    const target = (text.match(/Target:\s*(\S+)/i) || [])[1] || null;
    // ID  Response  Lines  Word  Chars  Payload
    for (const m of text.matchAll(/^(\d+)\s+(\d{3})\s+(\d+)\s+L\s+(\d+)\s+W\s+(\d+)\s+Ch\s+"(.+)"/gm)) {
      results.push({ id: Number(m[1]), status: Number(m[2]), lines: Number(m[3]), words: Number(m[4]), chars: Number(m[5]), payload: m[6] });
    }
    // Alternative simpler format
    if (!results.length) {
      for (const m of text.matchAll(/^(\d{3})\s+\d+L\s+\d+W\s+\d+Ch\s+"([^"]+)"/gm)) {
        results.push({ status: Number(m[1]), payload: m[2] });
      }
    }
    return { target, results, count: results.length };
  },
  suggestName(pd) { return pd.target || null; },
  suggestItemName() { return 'wfuzz'; },
};

/** ffuf (extended — complements WEB_FUZZ) */
const FFUF = {
  id: 'ffuf', label: 'ffuf', icon: '⚡',
  detect(text) {
    let s = 0;
    if (/\bffuf\b/i.test(text)) s += 0.4;
    if (/FUZZ/i.test(text) && /\bffuf\b/i.test(text)) s += 0.3;
    if (/\[Status:\s*\d{3},\s*Size:\s*\d+/m.test(text)) s += 0.4;
    // JSON mode
    if (/\"commandline\".*ffuf/i.test(text)) s += 0.5;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    const target = (text.match(/(?:Target|URL|url):\s*(\S+)/i) || [])[1] || null;
    // JSON output
    try {
      const obj = JSON.parse(text);
      if (obj.results) {
        for (const r of obj.results) {
          results.push({ url: r.url || r.input?.FUZZ, status: r.status, length: r.length, words: r.words, lines: r.lines });
        }
        return { target: obj.commandline || target, results, count: results.length };
      }
    } catch { /* not JSON */ }
    // Text mode: keyword [Status: 200, Size: 1234, Words: 56, Lines: 12]
    for (const m of text.matchAll(/^(\S+)\s+\[Status:\s*(\d{3}),\s*Size:\s*(\d+)(?:,\s*Words:\s*(\d+))?(?:,\s*Lines:\s*(\d+))?/gm)) {
      results.push({ url: m[1], status: Number(m[2]), length: Number(m[3]), words: Number(m[4] || 0), lines: Number(m[5] || 0) });
    }
    return { target, results, count: results.length };
  },
  suggestName(pd) { return pd.target || null; },
  suggestItemName() { return 'ffuf'; },
};

/** Gobuster (extended with dns/vhost modes) */
const GOBUSTER = {
  id: 'gobuster', label: 'Gobuster', icon: '👻',
  detect(text) {
    let s = 0;
    if (/Gobuster\s+v/i.test(text)) s += 0.6;
    if (/^Found:\s/m.test(text)) s += 0.3;
    if (/^(\/\S+)\s+\(Status:\s*\d{3}\)/m.test(text)) s += 0.4;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    // dir mode: /path (Status: 200) [Size: 1234]
    for (const m of text.matchAll(/^(\/\S+)\s+\(Status:\s*(\d{3})\)\s*(?:\[Size:\s*(\d+)\])?/gm)) {
      results.push({ path: m[1], status: Number(m[2]), size: Number(m[3] || 0), mode: 'dir' });
    }
    // dns mode: Found: subdomain.example.com
    for (const m of text.matchAll(/^Found:\s+([\w.-]+)/gm)) {
      results.push({ domain: m[1], mode: 'dns' });
    }
    // vhost mode: Found: vhost Status: 200
    for (const m of text.matchAll(/^Found:\s+(\S+)\s+Status:\s*(\d{3})/gm)) {
      results.push({ vhost: m[1], status: Number(m[2]), mode: 'vhost' });
    }
    const target = (text.match(/(?:Url|Target):\s*(\S+)/i) || [])[1] || null;
    return { target, results, count: results.length };
  },
  suggestName(pd) { return pd.target || null; },
  suggestItemName() { return 'gobuster'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SECRET & CREDENTIAL SCANNING
// ─────────────────────────────────────────────────────────────────────────────

/** Trufflehog — secret scanner */
const TRUFFLEHOG = {
  id: 'trufflehog', label: 'Trufflehog', icon: '🐷',
  detect(text) {
    let s = 0;
    if (/trufflehog/i.test(text)) s += 0.6;
    if (/Detector Type/i.test(text) || /\"SourceMetadata\"/i.test(text)) s += 0.3;
    if (/Raw result/i.test(text)) s += 0.2;
    if (/Verified:\s*(true|false)/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const secrets = [];
    // JSON-line format
    for (const line of text.split('\n')) {
      try {
        const obj = JSON.parse(line);
        if (obj.DetectorType || obj.Raw || obj.SourceMetadata) {
          secrets.push({
            detector: obj.DetectorType || obj.DetectorName || 'unknown',
            raw: obj.Raw || '',
            verified: obj.Verified || false,
            source: obj.SourceMetadata?.Data?.Git?.file || obj.SourceMetadata?.Data?.Filesystem?.file || '',
          });
          continue;
        }
      } catch { /* not JSON */ }
      // Text format: Detector Type: X\nRaw: Y
      const dm = line.match(/Detector Type:\s*(.+)/i);
      if (dm) secrets.push({ detector: dm[1].trim(), raw: '', verified: false, source: '' });
    }
    // Fill in raw values from subsequent lines
    let cur = null;
    for (const line of text.split('\n')) {
      const dm = line.match(/Detector Type:\s*(.+)/i);
      if (dm) { cur = secrets.find(s => s.detector === dm[1].trim() && !s.raw); continue; }
      if (cur) {
        const rm = line.match(/Raw(?:V2)?:\s*(.+)/i);
        if (rm) { cur.raw = rm[1].trim(); cur = null; }
        const vm = line.match(/Verified:\s*(true|false)/i);
        if (vm) cur.verified = vm[1] === 'true';
      }
    }
    return { secrets, count: secrets.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'trufflehog'; },
};

/** Gitrob — GitHub org/user recon */
const GITROB = {
  id: 'gitrob', label: 'Gitrob', icon: '🐙',
  detect(text) {
    let s = 0;
    if (/gitrob/i.test(text)) s += 0.7;
    if (/\[CRITICAL\]|\[HIGH\]|\[MEDIUM\]|\[LOW\]/i.test(text) && /\.git/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const findings = [];
    for (const line of text.split('\n')) {
      const m = line.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.+)/i);
      if (m) findings.push({ severity: m[1].toLowerCase(), detail: m[2].trim() });
    }
    return { findings, count: findings.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'gitrob'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  OSINT / INTERNET-WIDE SCANNING
// ─────────────────────────────────────────────────────────────────────────────

/** Shodan CLI output */
const SHODAN = {
  id: 'shodan', label: 'Shodan CLI', icon: '👁️',
  detect(text) {
    let s = 0;
    if (/shodan/i.test(text)) s += 0.4;
    if (/\"ip_str\"/i.test(text) || /\"port\"\s*:\s*\d+/i.test(text)) s += 0.3;
    if (/ISP:/i.test(text) && /Ports:/i.test(text)) s += 0.4;
    if (/Organization:/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    // JSON format
    for (const line of text.split('\n')) {
      try {
        const obj = JSON.parse(line);
        if (obj.ip_str || obj.ip) {
          results.push({
            ip: obj.ip_str || obj.ip, port: obj.port, transport: obj.transport || 'tcp',
            product: obj.product || '', version: obj.version || '',
            org: obj.org || '', isp: obj.isp || '', os: obj.os || '',
            hostnames: obj.hostnames || [], domains: obj.domains || [],
          });
          continue;
        }
      } catch { /* not JSON */ }
    }
    // Text summary format
    if (!results.length) {
      const ip = (text.match(/IP:\s*(\S+)/i) || [])[1];
      const org = (text.match(/Organization:\s*(.+)/i) || [])[1]?.trim();
      const ports = (text.match(/Ports:\s*(.+)/i) || [])[1]?.split(/[,\s]+/).map(Number).filter(Boolean);
      if (ip) results.push({ ip, org: org || '', ports: ports || [] });
    }
    return { results, count: results.length };
  },
  suggestName(pd) { return pd.results?.[0]?.ip || pd.results?.[0]?.hostnames?.[0] || null; },
  suggestItemName() { return 'shodan'; },
};

/** Censys output */
const CENSYS = {
  id: 'censys', label: 'Censys', icon: '🔬',
  detect(text) {
    let s = 0;
    if (/censys/i.test(text)) s += 0.5;
    if (/\"ip\"\s*:\s*\"/i.test(text) && /\"services\"/i.test(text)) s += 0.4;
    if (/\"autonomous_system\"/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const results = [];
    for (const line of text.split('\n')) {
      try {
        const obj = JSON.parse(line);
        if (obj.ip) {
          results.push({
            ip: obj.ip,
            services: (obj.services || []).map(s => ({ port: s.port, protocol: s.transport_protocol, name: s.service_name })),
            asn: obj.autonomous_system?.asn || '',
            org: obj.autonomous_system?.description || '',
          });
        }
      } catch { /* not JSON */ }
    }
    return { results, count: results.length };
  },
  suggestName(pd) { return pd.results?.[0]?.ip || null; },
  suggestItemName() { return 'censys'; },
};

/** Metabigor — OSINT without API key */
const METABIGOR = {
  id: 'metabigor', label: 'Metabigor', icon: '🔍',
  detect(text) {
    let s = 0;
    if (/metabigor/i.test(text)) s += 0.7;
    return Math.min(1, s);
  },
  parse(text) {
    const results = text.split('\n').map(l => l.trim()).filter(l => l && !/^#/.test(l));
    const ips = results.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(l));
    return { results, ips, count: results.length };
  },
  suggestName(pd) { return pd.ips?.[0] || null; },
  suggestItemName() { return 'metabigor'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  CLOUD SECURITY
// ─────────────────────────────────────────────────────────────────────────────

/** AWS CLI output */
const AWS_CLI = {
  id: 'aws_cli', label: 'AWS CLI', icon: '☁️',
  detect(text) {
    let s = 0;
    if (/\"(Account|Arn|UserId)\"/i.test(text)) s += 0.3;
    if (/arn:aws:/i.test(text)) s += 0.4;
    if (/\"Buckets\"|\"Instances\"|\"SecurityGroups\"/i.test(text)) s += 0.3;
    if (/aws\s+(s3|ec2|iam|sts|lambda)/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    try {
      const obj = JSON.parse(text);
      return { data: obj, type: 'json', count: Array.isArray(obj) ? obj.length : Object.keys(obj).length };
    } catch { /* not JSON */ }
    const arns = [...text.matchAll(/arn:aws:[^"\s]+/g)].map(m => m[0]);
    return { raw: text, arns, count: arns.length };
  },
  suggestName(pd) { return pd.arns?.[0]?.split(':')[4] || null; },
  suggestItemName() { return 'aws cli'; },
};

/** CloudEnum — cloud resource enumeration */
const CLOUDENUM = {
  id: 'cloudenum', label: 'CloudEnum', icon: '☁️',
  detect(text) {
    let s = 0;
    if (/cloud.?enum/i.test(text)) s += 0.6;
    if (/\[+\]\s*(s3|azure|gcp|bucket)/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const buckets = [], results = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (/s3\.amazonaws|blob\.core\.windows|storage\.googleapis/i.test(l)) buckets.push(l.replace(/\[.\]\s*/, ''));
      else if (l && /\[.\]/.test(l)) results.push(l.replace(/\[.\]\s*/, ''));
    }
    return { buckets, results, count: buckets.length + results.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'cloudenum'; },
};

/** S3Scanner output */
const S3SCANNER = {
  id: 's3scanner', label: 'S3Scanner', icon: '🪣',
  detect(text) {
    let s = 0;
    if (/s3scanner/i.test(text)) s += 0.6;
    if (/bucket.*exists|AuthorizatedAccess|AllUsers/i.test(text)) s += 0.3;
    if (/\.s3\.amazonaws\.com/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const buckets = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      const m = l.match(/([\w.-]+\.s3[\w.-]*\.amazonaws\.com|[\w.-]+)\s*\|\s*(.+)/i);
      if (m) buckets.push({ name: m[1], status: m[2].trim() });
      else if (/bucket.*exists/i.test(l)) buckets.push({ name: l, status: 'exists' });
    }
    return { buckets, count: buckets.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 's3scanner'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  PRIVILEGE ESCALATION
// ─────────────────────────────────────────────────────────────────────────────

/** LinPEAS output */
const LINPEAS = {
  id: 'linpeas', label: 'LinPEAS', icon: '🐧',
  detect(text) {
    let s = 0;
    if (/linpeas/i.test(text)) s += 0.5;
    if (/╔═.*╗/m.test(text) || /╚═.*╝/m.test(text)) s += 0.2;
    if (/INTERESTING|EXPLOIT/i.test(text)) s += 0.2;
    if (/\u001b\[\d+m/g.test(text) || /\x1b\[\d+m/g.test(text)) s += 0.1;  // ANSI colors
    if (/Cron jobs|╠═.*Analyzing/i.test(text)) s += 0.2;
    if (/99%.*sure/i.test(text) || /PE.*possible/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    // Strip ANSI escape codes
    const clean = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\u001b\[[0-9;]*m/g, '');
    const sections = [];
    let currentSection = null;

    for (const line of clean.split('\n')) {
      // Section headers: ╔══════════╗  or ══════ Title ══════
      const headerMatch = line.match(/[╔═]+\s*(.+?)\s*[═╗]+/) || line.match(/^#+\s*(.+)/);
      if (headerMatch) {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: headerMatch[1].trim(), findings: [], severity: 'info' };
        continue;
      }
      if (!currentSection) continue;

      const l = line.trim();
      if (!l) continue;

      // Color-coded severity (linpeas uses red/yellow)
      if (/99%|PE - Always/i.test(l)) currentSection.severity = 'critical';
      else if (/95%|PE -/i.test(l) && currentSection.severity !== 'critical') currentSection.severity = 'high';
      else if (/Interesting|possible/i.test(l) && !['critical', 'high'].includes(currentSection.severity)) currentSection.severity = 'medium';

      if (l.length > 2 && !/^[═╔╗╚╝─]+$/.test(l)) currentSection.findings.push(l);
    }
    if (currentSection) sections.push(currentSection);

    const bySeverity = {};
    for (const s of sections) { bySeverity[s.severity] = (bySeverity[s.severity] || 0) + 1; }
    return { sections, bySeverity, count: sections.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'linpeas'; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  IMPACKET TOOLS
// ─────────────────────────────────────────────────────────────────────────────

/** Impacket secretsdump.py output */
const IMPACKET_SECRETSDUMP = {
  id: 'impacket_secretsdump', label: 'Impacket secretsdump', icon: '🔐',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /secretsdump/i.test(text)) s += 0.5;
    if (/\[.\]\s*Dumping/i.test(text)) s += 0.3;
    // NTLM hash format: user:rid:lmhash:nthash:::
    if (/^\w+:\d+:[a-f0-9]{32}:[a-f0-9]{32}:::/m.test(text)) s += 0.5;
    // NTDS.DIT or SAM hashes
    if (/NTDS\.DIT|SAM hashes/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const hashes = [];
    const kerberos = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      // user:rid:lmhash:nthash:::
      const hm = l.match(/^(\S+):(\d+):([a-f0-9]{32}):([a-f0-9]{32}):::/i);
      if (hm) { hashes.push({ user: hm[1], rid: Number(hm[2]), lm: hm[3], nt: hm[4] }); continue; }
      // Kerberos keys
      if (/\$krb5tgs\$|\$krb5asrep\$/i.test(l)) kerberos.push(l);
    }
    return { hashes, kerberos, count: hashes.length + kerberos.length };
  },
  suggestName(pd) { return pd.hashes?.[0]?.user?.split('\\').pop() || null; },
  suggestItemName() { return 'secretsdump'; },
};

/** Impacket psexec/smbexec/wmiexec/atexec/dcomexec shell output */
const IMPACKET_EXEC = {
  id: 'impacket_exec', label: 'Impacket exec (*exec)', icon: '💻',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /(psexec|smbexec|wmiexec|atexec|dcomexec)/i.test(text)) s += 0.6;
    if (/\[.\]\s*Requesting shares/i.test(text)) s += 0.3;
    if (/\[.\]\s*Found writable share/i.test(text)) s += 0.3;
    if (/C:\\Windows\\system32>/m.test(text) || /Microsoft Windows \[Version/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const target = (text.match(/(?:Target|Connecting to)\s+(\S+)/i) || [])[1] || null;
    const tool = (text.match(/(psexec|smbexec|wmiexec|atexec|dcomexec)/i) || [])[1] || 'exec';
    const output = text.split('\n').filter(l => !l.startsWith('[*]') && !l.startsWith('[+]') && l.trim()).map(l => l.trim());
    return { target, tool, output, count: output.length };
  },
  suggestName(pd) { return pd.target || null; },
  suggestItemName(pd) { return pd.tool || 'impacket exec'; },
};

/** Impacket GetNPUsers.py — ASREProasting */
const IMPACKET_GETNPUSERS = {
  id: 'impacket_getnpusers', label: 'Impacket GetNPUsers', icon: '🎫',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /GetNPUsers/i.test(text)) s += 0.6;
    if (/\$krb5asrep\$/i.test(text)) s += 0.5;
    if (/UF_DONT_REQUIRE_PREAUTH/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const hashes = [];
    for (const line of text.split('\n')) {
      if (/\$krb5asrep\$/i.test(line)) hashes.push(line.trim());
    }
    return { hashes, count: hashes.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'GetNPUsers (ASREProast)'; },
};

/** Impacket GetUserSPNs.py — Kerberoasting */
const IMPACKET_GETUSERSPNS = {
  id: 'impacket_getuserspns', label: 'Impacket GetUserSPNs', icon: '🎫',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /GetUserSPNs/i.test(text)) s += 0.6;
    if (/\$krb5tgs\$/i.test(text)) s += 0.5;
    if (/ServicePrincipalName/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const hashes = [];
    const spns = [];
    for (const line of text.split('\n')) {
      if (/\$krb5tgs\$/i.test(line)) { hashes.push(line.trim()); continue; }
      const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/);
      if (m && /\//.test(m[1]) && !/ServicePrincipalName/i.test(m[1])) {
        spns.push({ spn: m[1], name: m[2], memberOf: m[3], delegation: m[4] });
      }
    }
    return { hashes, spns, count: hashes.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'GetUserSPNs (Kerberoast)'; },
};

/** Impacket getTGT.py / getST.py — ticket requests */
const IMPACKET_GETTICKET = {
  id: 'impacket_getticket', label: 'Impacket getTGT/getST', icon: '🎟️',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /(getTGT|getST)/i.test(text)) s += 0.6;
    if (/Saving ticket/i.test(text) || /\.ccache/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const tickets = [];
    for (const m of text.matchAll(/Saving ticket in\s+(\S+)/gi)) tickets.push(m[1]);
    const target = (text.match(/(?:Target|Using|domain)\s+(\S+)/i) || [])[1] || null;
    return { target, tickets, count: tickets.length };
  },
  suggestName(pd) { return pd.target || null; },
  suggestItemName() { return 'kerberos ticket'; },
};

/** Impacket smbclient.py / smbmap output */
const IMPACKET_SMB = {
  id: 'impacket_smb', label: 'Impacket SMB (smbclient/smbmap)', icon: '📂',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /(smbclient|lookupsid)/i.test(text)) s += 0.5;
    if (/smbmap/i.test(text)) s += 0.4;
    if (/\bDisk\b.*READ|WRITE/i.test(text)) s += 0.4;
    if (/\[.\]\s*Listing shares/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const shares = [];
    for (const m of text.matchAll(/^\s*([\w$]+)\s+(Disk|IPC|Print)\s+(READ|WRITE|NO ACCESS|READ, WRITE)?/gmi)) {
      shares.push({ name: m[1], type: m[2], access: (m[3] || 'none').trim() });
    }
    const target = (text.match(/(?:Target|Host):\s*(\S+)/i) || [])[1] || null;
    return { target, shares, count: shares.length };
  },
  suggestName(pd) { return pd.target || null; },
  suggestItemName() { return 'smb shares'; },
};

/** Impacket lookupsid.py — SID enumeration */
const IMPACKET_LOOKUPSID = {
  id: 'impacket_lookupsid', label: 'Impacket lookupsid', icon: '👤',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /lookupsid/i.test(text)) s += 0.6;
    if (/S-1-5-21-/i.test(text) && /SidTypeUser|SidTypeGroup/i.test(text)) s += 0.5;
    return Math.min(1, s);
  },
  parse(text) {
    const entries = [];
    for (const m of text.matchAll(/(\d+):\s*(S-[\d-]+)\s+(\S+)\s+\((\w+)\)/g)) {
      entries.push({ rid: Number(m[1]), sid: m[2], name: m[3], type: m[4] });
    }
    return { entries, count: entries.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'lookupsid'; },
};

/** Impacket ntlmrelayx — NTLM relay */
const IMPACKET_NTLMRELAY = {
  id: 'impacket_ntlmrelay', label: 'Impacket ntlmrelayx', icon: '🔄',
  detect(text) {
    let s = 0;
    if (/Impacket/i.test(text) && /ntlmrelayx/i.test(text)) s += 0.6;
    if (/\[.\]\s*Servers started/i.test(text)) s += 0.3;
    if (/\[.\]\s*HTTPD.*started|SMBd.*started/i.test(text)) s += 0.2;
    if (/Authenticating against/i.test(text)) s += 0.2;
    return Math.min(1, s);
  },
  parse(text) {
    const relayed = [];
    for (const line of text.split('\n')) {
      if (/Authenticating against|relay.*succeeded|SAMRDump/i.test(line)) relayed.push(line.trim());
    }
    return { relayed, count: relayed.length };
  },
  suggestName() { return null; },
  suggestItemName() { return 'ntlmrelayx'; },
};

/** Impacket responder-like / GetADUsers / rpcdump / samrdump / reg etc. (generic Impacket) */
const IMPACKET_GENERIC = {
  id: 'impacket_generic', label: 'Impacket (generic)', icon: '🧰',
  detect(text) {
    let s = 0;
    if (/Impacket\s+v/i.test(text)) s += 0.4;
    if (/Copyright.*SECUREAUTH|fortra/i.test(text)) s += 0.3;
    if (/(GetADUsers|rpcdump|samrdump|reg\.py|addcomputer|ticketer|raiseChild|findDelegation|getPac|describeTicket)/i.test(text)) s += 0.3;
    return Math.min(1, s);
  },
  parse(text) {
    const tool = (text.match(/(GetADUsers|rpcdump|samrdump|reg|addcomputer|ticketer|raiseChild|findDelegation|getPac|describeTicket|mimikatz|goldenPac|getST|getTGT|mssqlclient|mssqlattack|dpapi|esentutl|wmipersist|services|ifmap|opdump|netview)\b/i) || [])[1] || 'unknown';
    const output = text.split('\n').filter(l => l.trim() && !l.startsWith('Impacket')).map(l => l.trim());
    return { tool, output, count: output.length };
  },
  suggestName() { return null; },
  suggestItemName(pd) { return `impacket ${pd.tool}`; },
};

// ─────────────────────────────────────────────────────────────────────────────
//  PARSER REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const PARSERS = [
  // ── IP Addresses (plain single address detection) ──
  IP_ADDRESS_V4,
  IP_ADDRESS_V6,

  // ── Network / Identity ──
  IP_ADDR,
  IFCONFIG,
  IPCONFIG,
  ID_WHOAMI,
  WHOAMI_ALL,
  UNAME,
  OS_RELEASE,

  // ── Scanning ──
  NMAP,
  PORT_SCAN,
  NAABU,
  WEB_FUZZ,
  NIKTO,
  DNS_LOOKUP,

  // ── Web Fuzzing ──
  GOBUSTER,
  FFUF,
  WFUZZ,

  // ── Vulnerability Scanning ──
  NUCLEI,
  JAELES,

  // ── XSS ──
  DALFOX,
  XSSTRIKE,
  KXSS,
  AIRIXSS,

  // ── SQL Injection ──
  SQLMAP,
  GHAURI,

  // ── HTTP Probing ──
  HTTPX,
  HTTPROBE,
  TLSX,

  // ── Subdomain & DNS Discovery ──
  AMASS,
  SUBFINDER,
  GITHUB_SUBDOMAINS,
  DIG,
  DNSX,
  MASS_DNS,
  DNSGEN,
  HAKREVDNS,
  PRIPS,
  CERTSTREAM,

  // ── Web Crawling & URL Discovery ──
  KATANA,
  GOSPIDER,
  HAKRAWLER,
  CARIDDI,
  GAU,
  WAYBACKURLS,
  WAYMORE,

  // ── JS / Parameter / Secret Analysis ──
  SUBJS,
  LINKFINDER,
  SECRETFINDER,
  JSUBFINDER,
  PARAMSPIDER,
  ARJUN,
  X8,
  URL_UTILS,

  // ── Secret & Credential Scanning ──
  TRUFFLEHOG,
  GITROB,

  // ── OSINT / Internet-wide ──
  SHODAN,
  CENSYS,
  METABIGOR,

  // ── Cloud Security ──
  AWS_CLI,
  CLOUDENUM,
  S3SCANNER,

  // ── Privilege Escalation ──
  LINPEAS,
  FIND_SUID,

  // ── Impacket ──
  IMPACKET_SECRETSDUMP,
  IMPACKET_EXEC,
  IMPACKET_GETNPUSERS,
  IMPACKET_GETUSERSPNS,
  IMPACKET_GETTICKET,
  IMPACKET_SMB,
  IMPACKET_LOOKUPSID,
  IMPACKET_NTLMRELAY,
  IMPACKET_GENERIC,

  // ── Connections & Routing ──
  NETSTAT,
  SS,
  ARP,
  ROUTE,
  LSOF,

  // ── Processes & Services ──
  PS_FAUX,
  PS_AUX,
  TASKLIST,
  SC_QUERY,
  SCHTASKS,
  CRONTAB,

  // ── System Info ──
  SYSTEMINFO,
  MOUNT_DF,
  ETC_FSTAB,
  ENV_VARS,
  PKG_LIST,
  DIR_LS,
  WMIC,

  // ── Files & Secrets ──
  ETC_PASSWD,
  ETC_SHADOW,
  ETC_HOSTS,
  ETC_GROUP,
  RESOLV_CONF,
  SSH_PRIV_KEY,
  SSH_PUB_KEY,
  AUTHORIZED_KEYS,
  KNOWN_HOSTS,
  SSH_KEYS,
  HASH_LIST,
  HTTP_HEADERS,
  CMD_HISTORY,

  // ── Users & Privileges ──
  NET_USER,
  NET_LOCALGROUP,
  NET_SHARE,
  SUDO_L,
  ETC_SUDOERS,
  CMDKEY,

  // ── Config Files ──
  SSHD_CONFIG,
  APACHE_CONF,

  // ── Firewall ──
  IPTABLES,

  // ── Logs ──
  AUTH_LOG,
  LAST_LOG,

  // ── Email ──
  EMAIL_HEADERS,
  EMAIL_BODY,

  // ── Registry ──
  REG_QUERY,
];

// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-DETECT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to auto-detect the type of the given text by running all parsers'
 * detect() functions and returning ranked candidates.
 *
 * @param {string} text
 * @returns {{ parser: ParserDef, confidence: number }[]}  Sorted highest-first
 */
export function detectParsers(text) {
  return PARSERS
    .map((p) => ({ parser: p, confidence: p.detect(text) }))
    .filter((r) => r.confidence > 0.1)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Runs a specific parser by id.
 * @param {string} parserId
 * @param {string} text
 * @returns {{ parsedData: Object, suggestedName: string|null, suggestedItemName: string } | null}
 */
export function runParser(parserId, text) {
  const parser = PARSERS.find((p) => p.id === parserId);
  if (!parser) return null;
  const parsedData = parser.parse(text);
  return {
    parsedData,
    suggestedName:     parser.suggestName(parsedData),
    suggestedItemName: parser.suggestItemName(parsedData),
  };
}

/**
 * @typedef {Object} ParserDef
 * @property {string}   id
 * @property {string}   label
 * @property {string}   icon
 * @property {function(string): number}  detect
 * @property {function(string): Object}  parse
 * @property {function(Object): string|null} suggestName
 * @property {function(Object): string}      suggestItemName
 */
