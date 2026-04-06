/**
 * @fileoverview Asset Icon Library — SVG icons for common enterprise OS & applications.
 *
 * Each icon entry:  { id, name, category, keywords[], svg }
 *   - svg: 20×20 inline SVG string (viewBox="0 0 20 20")
 *   - keywords: search tokens (lowercase) for the filter
 *
 * Categories: os, server, database, network, security, identity, cloud, dev, mail, web, file, other
 *
 * @module asset-icons
 */

export const ICON_CATEGORIES = {
  os:       { label: 'Operating Systems', icon: '💻' },
  server:   { label: 'Servers & Services', icon: '🖥️' },
  database: { label: 'Databases', icon: '🗄️' },
  network:  { label: 'Network & Infra', icon: '🌐' },
  security: { label: 'Security', icon: '🛡️' },
  identity: { label: 'Users & Identities', icon: '👤' },
  cloud:    { label: 'Cloud', icon: '☁️' },
  dev:      { label: 'Dev & CI/CD', icon: '⚙️' },
  mail:     { label: 'Mail & Collaboration', icon: '📧' },
  web:      { label: 'Web', icon: '🕸️' },
  file:     { label: 'Files & Data', icon: '📁' },
  other:    { label: 'Other', icon: '📦' },
};

/**
 * @typedef {{ id:string, name:string, category:string, keywords:string[], svg:string }} AssetIcon
 */

/** @type {AssetIcon[]} */
export const ASSET_ICONS = [

  // ── Operating Systems ──────────────────────────────────────────────────
  { id: 'windows', name: 'Windows', category: 'os', keywords: ['windows','microsoft','win','win10','win11','server'],
    svg: `<svg viewBox="0 0 20 20"><path d="M2 4.5L8.5 3.6V9.5H2V4.5Z" fill="#0078D4"/><path d="M9.5 3.5L18 2V9.5H9.5V3.5Z" fill="#0078D4"/><path d="M2 10.5H8.5V16.4L2 15.5V10.5Z" fill="#0078D4"/><path d="M9.5 10.5H18V18L9.5 16.5V10.5Z" fill="#0078D4"/></svg>` },

  { id: 'linux', name: 'Linux', category: 'os', keywords: ['linux','tux','penguin','gnu'],
    svg: `<svg viewBox="0 0 20 20"><g fill="#333"><ellipse cx="10" cy="7" rx="4" ry="5" fill="#F5C518"/><circle cx="8.5" cy="6" r="1" fill="#333"/><circle cx="11.5" cy="6" r="1" fill="#333"/><ellipse cx="10" cy="8.5" rx="1.5" ry="1" fill="#E8A317"/><path d="M6 12C5 14 4 16 5.5 17C7 18 8 16 10 16C12 16 13 18 14.5 17C16 16 15 14 14 12Z" fill="#333"/><ellipse cx="6" cy="16.5" rx="2" ry="1" fill="#F5C518"/><ellipse cx="14" cy="16.5" rx="2" ry="1" fill="#F5C518"/></g></svg>` },

  { id: 'ubuntu', name: 'Ubuntu', category: 'os', keywords: ['ubuntu','linux','debian','canonical'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#E95420"/><circle cx="10" cy="4.5" r="1.5" fill="#fff"/><circle cx="5.2" cy="13" r="1.5" fill="#fff"/><circle cx="14.8" cy="13" r="1.5" fill="#fff"/><circle cx="10" cy="10" r="3" fill="none" stroke="#fff" stroke-width="1.2"/></svg>` },

  { id: 'debian', name: 'Debian', category: 'os', keywords: ['debian','linux','apt'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#A80030"/><text x="10" y="14" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">D</text></svg>` },

  { id: 'centos', name: 'CentOS / RHEL', category: 'os', keywords: ['centos','rhel','redhat','red hat','enterprise','linux','fedora'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="2" width="7.5" height="7.5" fill="#9CCD2A"/><rect x="10.5" y="2" width="7.5" height="7.5" fill="#932279"/><rect x="2" y="10.5" width="7.5" height="7.5" fill="#EFA724"/><rect x="10.5" y="10.5" width="7.5" height="7.5" fill="#262577"/><circle cx="10" cy="10" r="3.5" fill="none" stroke="#fff" stroke-width="1.5"/></svg>` },

  { id: 'kali', name: 'Kali Linux', category: 'os', keywords: ['kali','linux','pentest','offensive','security'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#367CF7"/><path d="M6 7C8 6 10 8 10 10C10 12 8 14 6 13L7 10L6 7Z" fill="#fff"/><path d="M14 7C12 6 10 8 10 10C10 12 12 14 14 13L13 10L14 7Z" fill="#fff"/></svg>` },

  { id: 'macos', name: 'macOS', category: 'os', keywords: ['macos','mac','apple','osx','darwin'],
    svg: `<svg viewBox="0 0 20 20"><path d="M14.5 10.3c0-2.1 1.7-3.1 1.8-3.2-.9-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.3 5.9.9 7.9.7.9 1.4 2 2.4 1.9.9 0 1.3-.6 2.5-.6 1.1 0 1.5.6 2.5.6 1 0 1.7-1 2.3-1.9.7-1.1 1-2.1 1-2.2 0 0-2-.7-1.7-3.9z" fill="#333"/><path d="M12.7 4c.5-.7.9-1.6.8-2.5-.7 0-1.7.5-2.2 1.2-.5.6-.9 1.5-.8 2.4.8.1 1.7-.4 2.2-1.1z" fill="#333"/></svg>` },

  { id: 'android', name: 'Android', category: 'os', keywords: ['android','google','mobile','phone'],
    svg: `<svg viewBox="0 0 20 20"><path d="M4 8h12v7a1 1 0 01-1 1H5a1 1 0 01-1-1V8z" fill="#3DDC84"/><rect x="5" y="8" width="10" height="1" fill="#2DA866"/><path d="M4 8a6 6 0 0112 0H4z" fill="#3DDC84"/><circle cx="7.5" cy="5.5" r=".8" fill="#fff"/><circle cx="12.5" cy="5.5" r=".8" fill="#fff"/><rect x="2" y="9" width="1.5" height="5" rx=".75" fill="#3DDC84"/><rect x="16.5" y="9" width="1.5" height="5" rx=".75" fill="#3DDC84"/><rect x="7" y="16" width="1.5" height="3" rx=".75" fill="#3DDC84"/><rect x="11.5" y="16" width="1.5" height="3" rx=".75" fill="#3DDC84"/></svg>` },

  { id: 'ios', name: 'iOS / iPadOS', category: 'os', keywords: ['ios','iphone','ipad','apple','mobile'],
    svg: `<svg viewBox="0 0 20 20"><rect x="5" y="2" width="10" height="16" rx="2" fill="#333"/><rect x="6" y="4" width="8" height="11" rx="1" fill="#fff"/><circle cx="10" cy="16.5" r=".8" fill="#555"/></svg>` },

  { id: 'freebsd', name: 'FreeBSD', category: 'os', keywords: ['freebsd','bsd','unix'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#AB2B28"/><text x="10" y="14" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">BSD</text></svg>` },

  { id: 'vmware-os', name: 'VMware ESXi', category: 'os', keywords: ['vmware','esxi','vsphere','hypervisor','virtualization'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2" fill="#607078"/><path d="M5 8L8 12L11 7L14 11" stroke="#78BE20" stroke-width="1.5" fill="none"/></svg>` },

  // ── Servers & Services ──────────────────────────────────────────────────
  { id: 'active-directory', name: 'Active Directory', category: 'server', keywords: ['ad','active directory','ldap','domain','dc','microsoft'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6L10 2z" fill="#0078D4"/><path d="M8 9h4v5H8z" fill="#fff"/><circle cx="10" cy="7.5" r="2" fill="#fff"/></svg>` },

  { id: 'exchange', name: 'Exchange Server', category: 'server', keywords: ['exchange','mail','microsoft','smtp','ews'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#0078D4"/><text x="10" y="13" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff">Ex</text></svg>` },

  { id: 'sharepoint', name: 'SharePoint', category: 'server', keywords: ['sharepoint','microsoft','intranet','portal'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="8" cy="7" r="5" fill="#038387"/><circle cx="12.5" cy="10.5" r="4" fill="#0078D4"/><circle cx="8.5" cy="14" r="3" fill="#05A6F0"/></svg>` },

  { id: 'dns', name: 'DNS Server', category: 'server', keywords: ['dns','bind','named','domain','resolve'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#4A90D9"/><text x="10" y="12.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">DNS</text></svg>` },

  { id: 'dhcp', name: 'DHCP Server', category: 'server', keywords: ['dhcp','ip','address','lease'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#6B8E23"/><text x="10" y="12.5" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">DHCP</text></svg>` },

  { id: 'ftp', name: 'FTP / SFTP', category: 'server', keywords: ['ftp','sftp','file','transfer','vsftpd','proftpd'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#607D8B"/><text x="10" y="12.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">FTP</text></svg>` },

  { id: 'samba', name: 'Samba / SMB', category: 'server', keywords: ['samba','smb','cifs','file share','nas'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="5" width="14" height="10" rx="1" fill="#D94F00"/><path d="M6 8h8M6 10.5h8M6 13h5" stroke="#fff" stroke-width=".8"/></svg>` },

  { id: 'print', name: 'Print Server', category: 'server', keywords: ['print','printer','cups','spooler'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="7" width="14" height="7" rx="1" fill="#607D8B"/><rect x="5" y="3" width="10" height="5" rx="1" fill="#90A4AE"/><rect x="5" y="13" width="10" height="4" rx="1" fill="#fff" stroke="#607D8B" stroke-width=".5"/><circle cx="15" cy="10" r=".8" fill="#4CAF50"/></svg>` },

  { id: 'iis', name: 'IIS', category: 'server', keywords: ['iis','internet information services','microsoft','web server'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#5C2D91"/><text x="10" y="12.5" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">IIS</text></svg>` },

  { id: 'tomcat', name: 'Apache Tomcat', category: 'server', keywords: ['tomcat','java','servlet','jsp','apache'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#D4A017"/><text x="10" y="13.5" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">🐱</text></svg>` },

  // ── Databases ──────────────────────────────────────────────────────────
  { id: 'mssql', name: 'SQL Server', category: 'database', keywords: ['mssql','sql server','microsoft','t-sql','database'],
    svg: `<svg viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="7" ry="3" fill="#CC2927"/><path d="M3 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5" fill="none" stroke="#CC2927" stroke-width="1.5"/><ellipse cx="10" cy="10" rx="7" ry="3" fill="none" stroke="#CC2927" stroke-width="1"/></svg>` },

  { id: 'mysql', name: 'MySQL', category: 'database', keywords: ['mysql','mariadb','database','sql'],
    svg: `<svg viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="7" ry="3" fill="#00758F"/><path d="M3 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5" fill="none" stroke="#00758F" stroke-width="1.5"/><ellipse cx="10" cy="10" rx="7" ry="3" fill="none" stroke="#00758F" stroke-width="1"/></svg>` },

  { id: 'postgresql', name: 'PostgreSQL', category: 'database', keywords: ['postgresql','postgres','pgsql','database'],
    svg: `<svg viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="7" ry="3" fill="#336791"/><path d="M3 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5" fill="none" stroke="#336791" stroke-width="1.5"/><ellipse cx="10" cy="10" rx="7" ry="3" fill="none" stroke="#336791" stroke-width="1"/></svg>` },

  { id: 'oracle', name: 'Oracle DB', category: 'database', keywords: ['oracle','database','plsql'],
    svg: `<svg viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="7" ry="3" fill="#C74634"/><path d="M3 5v10c0 1.7 3.1 3 7 3s7-1.3 7-3V5" fill="none" stroke="#C74634" stroke-width="1.5"/><ellipse cx="10" cy="10" rx="7" ry="3" fill="none" stroke="#C74634" stroke-width="1"/></svg>` },

  { id: 'mongodb', name: 'MongoDB', category: 'database', keywords: ['mongodb','mongo','nosql','database'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2C8 4 7 7 7 10c0 4 1.5 7 3 8 1.5-1 3-4 3-8 0-3-1-6-3-8z" fill="#4DB33D"/><path d="M10 2c-.3.3-.5.7-.5 1v15h1V3c0-.3-.2-.7-.5-1z" fill="#3A9833"/></svg>` },

  { id: 'redis', name: 'Redis', category: 'database', keywords: ['redis','cache','nosql','memory'],
    svg: `<svg viewBox="0 0 20 20"><path d="M2 10l8 4 8-4-8-4-8 4z" fill="#D82C20"/><path d="M2 10v3l8 4v-3L2 10z" fill="#A41916"/><path d="M18 10v3l-8 4v-3l8-4z" fill="#C22D1E"/></svg>` },

  { id: 'elasticsearch', name: 'Elasticsearch', category: 'database', keywords: ['elasticsearch','elastic','elk','search','kibana','logstash'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#FEC514"/><rect x="4" y="9" width="12" height="2" rx="1" fill="#343741"/><path d="M4.5 9A6.5 6.5 0 0110 3.5 6.5 6.5 0 0115.5 9" fill="#00BFB3"/></svg>` },

  // ── Network & Infra ────────────────────────────────────────────────────
  { id: 'router', name: 'Router', category: 'network', keywords: ['router','gateway','cisco','routing'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="7" width="16" height="6" rx="1" fill="#1B5E20"/><circle cx="5" cy="10" r="1" fill="#4CAF50"/><circle cx="8" cy="10" r="1" fill="#4CAF50"/><path d="M10 3v4M6 5l4-2 4 2" stroke="#1B5E20" stroke-width="1.2" fill="none"/></svg>` },

  { id: 'switch', name: 'Switch', category: 'network', keywords: ['switch','layer2','cisco','vlan'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="7" width="16" height="6" rx="1" fill="#0D47A1"/><circle cx="5" cy="10" r=".8" fill="#42A5F5"/><circle cx="7.5" cy="10" r=".8" fill="#42A5F5"/><circle cx="10" cy="10" r=".8" fill="#42A5F5"/><circle cx="12.5" cy="10" r=".8" fill="#42A5F5"/><circle cx="15" cy="10" r=".8" fill="#42A5F5"/></svg>` },

  { id: 'firewall', name: 'Firewall', category: 'network', keywords: ['firewall','pfsense','fortinet','palo alto','checkpoint','iptables'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#B71C1C"/><path d="M6 7h8M6 10h8M6 13h8" stroke="#fff" stroke-width="1" stroke-dasharray="2 1"/><rect x="8" y="6" width="4" height="8" rx="1" fill="#E53935"/></svg>` },

  { id: 'wifi', name: 'Wi-Fi AP', category: 'network', keywords: ['wifi','wireless','access point','ap','wlan'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="14" r="1.5" fill="#0D47A1"/><path d="M6 11a5.5 5.5 0 018 0" stroke="#0D47A1" stroke-width="1.2" fill="none"/><path d="M4 8.5a8.5 8.5 0 0112 0" stroke="#0D47A1" stroke-width="1.2" fill="none"/><path d="M2 6a11.5 11.5 0 0116 0" stroke="#0D47A1" stroke-width="1.2" fill="none"/></svg>` },

  { id: 'vpn', name: 'VPN Gateway', category: 'network', keywords: ['vpn','ipsec','openvpn','wireguard','tunnel'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6L10 2z" fill="#1565C0"/><text x="10" y="13" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">VPN</text></svg>` },

  { id: 'loadbalancer', name: 'Load Balancer', category: 'network', keywords: ['load balancer','haproxy','f5','nginx','lb','reverse proxy'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="5" r="2.5" fill="#00897B"/><circle cx="5" cy="15" r="2" fill="#00897B"/><circle cx="15" cy="15" r="2" fill="#00897B"/><path d="M10 7.5v3L5 13M10 10.5L15 13" stroke="#00897B" stroke-width="1"/></svg>` },

  { id: 'nas', name: 'NAS / SAN', category: 'network', keywords: ['nas','san','storage','synology','qnap','netapp'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="2" fill="#546E7A"/><rect x="5" y="5" width="10" height="2.5" rx=".5" fill="#37474F"/><rect x="5" y="8.5" width="10" height="2.5" rx=".5" fill="#37474F"/><rect x="5" y="12" width="10" height="2.5" rx=".5" fill="#37474F"/><circle cx="13.5" cy="6.2" r=".6" fill="#4CAF50"/><circle cx="13.5" cy="9.7" r=".6" fill="#4CAF50"/><circle cx="13.5" cy="13.2" r=".6" fill="#4CAF50"/></svg>` },

  { id: 'ipv4', name: 'IPv4 Address', category: 'network', keywords: ['ipv4','ip address','ip','address','cidr','subnet','network address'],
    svg: `<svg viewBox="0 0 20 20"><rect x="1" y="3" width="18" height="14" rx="2" fill="#2563EB"/><text x="10" y="11" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#fff">IP</text><text x="10" y="15" text-anchor="middle" font-size="5" font-weight="bold" fill="#93C5FD">v4</text></svg>` },

  { id: 'ipv6', name: 'IPv6 Address', category: 'network', keywords: ['ipv6','ip address','ip','address','prefix','network address','ipv6 address'],
    svg: `<svg viewBox="0 0 20 20"><rect x="1" y="3" width="18" height="14" rx="2" fill="#7C3AED"/><text x="10" y="11" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#fff">IP</text><text x="10" y="15" text-anchor="middle" font-size="5" font-weight="bold" fill="#C4B5FD">v6</text></svg>` },

  // ── Security ───────────────────────────────────────────────────────────
  { id: 'antivirus', name: 'Antivirus / EDR', category: 'security', keywords: ['antivirus','edr','crowdstrike','defender','sentinelone','sophos','kaspersky'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6L10 2z" fill="#4CAF50"/><path d="M7 10l2 2 4-4" stroke="#fff" stroke-width="1.5" fill="none"/></svg>` },

  { id: 'siem', name: 'SIEM', category: 'security', keywords: ['siem','splunk','qradar','sentinel','wazuh','log'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#880E4F"/><text x="10" y="12.5" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">SIEM</text></svg>` },

  { id: 'pki', name: 'PKI / CA', category: 'security', keywords: ['pki','certificate','ca','ssl','tls','openssl'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="8" r="4" fill="#F57F17" stroke="#E65100" stroke-width="1"/><rect x="9" y="11" width="2" height="5" fill="#E65100"/><rect x="7.5" y="14" width="5" height="2" rx="1" fill="#E65100"/></svg>` },

  { id: 'waf', name: 'WAF', category: 'security', keywords: ['waf','web application firewall','modsecurity','cloudflare'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6L10 2z" fill="#E65100"/><text x="10" y="13" text-anchor="middle" font-size="5" font-weight="bold" fill="#fff">WAF</text></svg>` },

  // ── Security Vendors — Firewalls ───────────────────────────────────────
  { id: 'fortinet', name: 'Fortinet / FortiGate', category: 'security', keywords: ['fortinet','fortigate','fortianalyzer','fortiweb','fortimail','fortios','forti'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#DA291C"/><path d="M6 7h3v3H6zM11 7h3v3h-3zM8.5 10.5h3v3h-3z" fill="#fff"/></svg>` },

  { id: 'paloalto', name: 'Palo Alto Networks', category: 'security', keywords: ['palo alto','paloalto','pan-os','panorama','prisma','cortex','xdr','ngfw','wildfire'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#FA582D"/><path d="M6 7h3.5v3H6zM10.5 7H14v3h-3.5zM6 10.5h3.5v3H6z" fill="#fff"/></svg>` },

  { id: 'checkpoint', name: 'Check Point', category: 'security', keywords: ['checkpoint','check point','smartconsole','gaia','threat prevention'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#E21F26"/><path d="M10 4v6h6" fill="none" stroke="#fff" stroke-width="2"/><path d="M10 10H4v0" fill="none" stroke="#E8B0B3" stroke-width="2"/><path d="M10 10v6" fill="none" stroke="#96171C" stroke-width="2"/></svg>` },

  { id: 'cisco-sec', name: 'Cisco Security', category: 'security', keywords: ['cisco','asa','firepower','meraki','umbrella','anyconnect','amp','talos'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2" fill="#049FD9"/><g fill="#fff"><rect x="5" y="7" width="1.5" height="6" rx=".5"/><rect x="7.5" y="9" width="1.5" height="4" rx=".5"/><rect x="10" y="6" width="1.5" height="7" rx=".5"/><rect x="12.5" y="8" width="1.5" height="5" rx=".5"/><rect x="15" y="7" width="1.5" height="6" rx=".5"/></g></svg>` },

  { id: 'sophos', name: 'Sophos', category: 'security', keywords: ['sophos','xg','intercept x','utm','endpoint','sophos central'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#003DA5"/><path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6L10 2z" fill="none" stroke="#fff" stroke-width="1"/><text x="10" y="13" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">S</text></svg>` },

  { id: 'pfsense', name: 'pfSense / OPNsense', category: 'security', keywords: ['pfsense','opnsense','netgate','bsd firewall','open source firewall'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#212121"/><path d="M10 5l-5 4h3v5h4v-5h3z" fill="#4CAF50"/></svg>` },

  { id: 'juniper', name: 'Juniper / SRX', category: 'security', keywords: ['juniper','srx','junos','juniper networks','mist'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#0F6C3B"/><path d="M10 5c-2 3-4 6-4 8h2c0-1.5 1-3.5 2-5.5 1 2 2 4 2 5.5h2c0-2-2-5-4-8z" fill="#fff"/></svg>` },

  // ── Security Vendors — EDR / XDR ───────────────────────────────────────
  { id: 'crowdstrike', name: 'CrowdStrike Falcon', category: 'security', keywords: ['crowdstrike','falcon','edr','xdr','threat intelligence','overwatch'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#EB0028"/><path d="M7 6c2 1 4 3 4 6-1-1-3-2-5-1 2-1 3.5 0 4.5 1.5C9 10 6 9 5 9c3 0 5 1.5 6 3.5.5-3-1.5-5.5-4-6.5z" fill="#fff"/></svg>` },

  { id: 'sentinelone', name: 'SentinelOne', category: 'security', keywords: ['sentinelone','sentinel one','singularity','edr','xdr','epp'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#6C2DC7"/><path d="M10 4v12M7 6l3 4 3-4M7 14l3-4 3 4" stroke="#fff" stroke-width="1.2" fill="none"/></svg>` },

  { id: 'defender', name: 'Microsoft Defender', category: 'security', keywords: ['defender','microsoft defender','mde','windows defender','atp','endpoint protection'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6L10 2z" fill="#0078D4"/><path d="M3 6l7 4v8c-4-1.5-7-5.6-7-10V6z" fill="#005A9E"/><path d="M17 6l-7 4v8c4-1.5 7-5.6 7-10V6z" fill="#0078D4"/></svg>` },

  { id: 'carbon-black', name: 'Carbon Black / VMware', category: 'security', keywords: ['carbon black','vmware carbon black','cb','edr','defense','response'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#1A1A1A"/><text x="10" y="12.5" text-anchor="middle" font-size="6" font-weight="bold" fill="#A0D468">CB</text></svg>` },

  { id: 'trellix', name: 'Trellix (ex-McAfee/FireEye)', category: 'security', keywords: ['trellix','mcafee','fireeye','mandiant','epo','edr','mvision','helix'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#CF202F"/><path d="M6 7l4 6 4-6" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M6 13l4-6 4 6" stroke="#fff" stroke-width="1" fill="none" opacity=".4"/></svg>` },

  { id: 'eset', name: 'ESET', category: 'security', keywords: ['eset','nod32','smart security','endpoint protection'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#1DAFEC"/><circle cx="10" cy="10" r="5" fill="#fff"/><circle cx="10" cy="10" r="3" fill="#1DAFEC"/><circle cx="10" cy="10" r="1" fill="#fff"/></svg>` },

  { id: 'kaspersky', name: 'Kaspersky', category: 'security', keywords: ['kaspersky','ksc','kedr','endpoint security','kav','kis'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#006D5C"/><path d="M10 3l-1 5h-5l4 3-1.5 5L10 13l3.5 3-1.5-5 4-3h-5z" fill="#fff"/></svg>` },

  { id: 'bitdefender', name: 'Bitdefender', category: 'security', keywords: ['bitdefender','gravityzone','endpoint','edr'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#ED1C24"/><path d="M10 5L6 10l4 5 4-5-4-5z" fill="#fff"/><path d="M10 7l-2.5 3 2.5 3 2.5-3L10 7z" fill="#ED1C24"/></svg>` },

  { id: 'symantec', name: 'Symantec / Broadcom', category: 'security', keywords: ['symantec','broadcom','sep','endpoint protection','norton','dlp'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#FFC300"/><circle cx="10" cy="10" r="5" fill="#212121"/><path d="M8 9.5a2.5 2.5 0 015 0" stroke="#FFC300" stroke-width="1.2" fill="none"/><circle cx="10" cy="12" r=".8" fill="#FFC300"/></svg>` },

  { id: 'trend-micro', name: 'Trend Micro', category: 'security', keywords: ['trend micro','apex one','deep security','vision one','xdr','tippingpoint'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#D71921"/><path d="M5 10h10M10 5v10" stroke="#fff" stroke-width="1.5"/><path d="M10 5l-3 5 3 5 3-5-3-5z" fill="none" stroke="#fff" stroke-width=".8"/></svg>` },

  // ── Security Vendors — Proxy / Web Gateway ─────────────────────────────
  { id: 'squid', name: 'Squid Proxy', category: 'security', keywords: ['squid','proxy','http proxy','cache','web proxy'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#F57C00"/><text x="10" y="12.5" text-anchor="middle" font-size="5" font-weight="bold" fill="#fff">Squid</text></svg>` },

  { id: 'zscaler', name: 'Zscaler', category: 'security', keywords: ['zscaler','zia','zpa','zero trust','cloud proxy','sase'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#0090D1"/><path d="M5 7h10L5 13h10" stroke="#fff" stroke-width="1.8" fill="none"/></svg>` },

  { id: 'bluecoat', name: 'Blue Coat / Symantec WSS', category: 'security', keywords: ['blue coat','bluecoat','proxysg','wss','web security','proxy appliance'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#003B71"/><path d="M10 6L6 10l4 4 4-4-4-4z" fill="#4FC3F7"/></svg>` },

  // ── Security Vendors — SIEM / SOC ──────────────────────────────────────
  { id: 'splunk', name: 'Splunk', category: 'security', keywords: ['splunk','siem','spl','search processing language','soar'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#000"/><text x="10" y="12" text-anchor="middle" font-size="5" font-weight="bold" fill="#78DC50">SPL</text><path d="M5 7l3 3-3 3" stroke="#78DC50" stroke-width=".8" fill="none"/></svg>` },

  { id: 'qradar', name: 'IBM QRadar', category: 'security', keywords: ['qradar','ibm','siem','soar','offense'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#054ADA"/><text x="10" y="12.5" text-anchor="middle" font-size="5" font-weight="bold" fill="#fff">QR</text></svg>` },

  { id: 'sentinel', name: 'Microsoft Sentinel', category: 'security', keywords: ['sentinel','azure sentinel','siem','microsoft sentinel','kql','log analytics'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#0078D4"/><path d="M10 5L6 10l4 5 4-5-4-5z" fill="#50E6FF" opacity=".7"/><path d="M10 5v10" stroke="#fff" stroke-width=".8"/></svg>` },

  { id: 'wazuh', name: 'Wazuh', category: 'security', keywords: ['wazuh','ossec','hids','open source siem','ids'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#00A9E5"/><text x="10" y="12.5" text-anchor="middle" font-size="5" font-weight="bold" fill="#fff">W</text></svg>` },

  // ── Security Vendors — Vulnerability / Pentest ─────────────────────────
  { id: 'nessus', name: 'Nessus / Tenable', category: 'security', keywords: ['nessus','tenable','vulnerability','scanner','vuln scan','tenable.io'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#212121"/><circle cx="10" cy="10" r="4" fill="#00B2A9"/><circle cx="10" cy="10" r="1.5" fill="#212121"/></svg>` },

  { id: 'qualys', name: 'Qualys', category: 'security', keywords: ['qualys','vmdr','vulnerability','cloud agent','was'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#ED1C24"/><path d="M10 4a6 6 0 11-4 10.5" stroke="#fff" stroke-width="2" fill="none"/><path d="M6 14.5l-2 2 2.5-.5-.5 2.5" stroke="#fff" stroke-width="1" fill="none"/></svg>` },

  { id: 'burpsuite', name: 'Burp Suite', category: 'security', keywords: ['burp','burpsuite','portswigger','web scan','pentest','appsec'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="2" fill="#FF6633"/><text x="10" y="13" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">B</text></svg>` },

  // ── Users & Identities ─────────────────────────────────────────────────
  { id: 'user-root', name: 'Root / Superuser', category: 'identity', keywords: ['root','superuser','sudo','uid0','privilege'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#C62828"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#C62828"/><text x="10" y="8" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">#</text></svg>` },

  { id: 'user-admin', name: 'Administrator', category: 'identity', keywords: ['admin','administrator','local admin','builtin','elevated'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#E65100"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#E65100"/><path d="M10 2L8.5 5h3L10 2z" fill="#FFD600"/></svg>` },

  { id: 'user-domain-admin', name: 'Domain Admin', category: 'identity', keywords: ['domain admin','da','domain administrator','ad admin','enterprise admin'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#B71C1C"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#B71C1C"/><path d="M7.5 4.5L10 2l2.5 2.5L10 6 7.5 4.5z" fill="#FFD600"/><path d="M10 2v1" stroke="#FFD600" stroke-width=".8"/></svg>` },

  { id: 'user-domain', name: 'Domain User', category: 'identity', keywords: ['domain user','ad user','active directory','domain account','utilisateur'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#0D47A1"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#0D47A1"/><circle cx="10" cy="6" r="2" fill="#fff" opacity=".3"/></svg>` },

  { id: 'user-local', name: 'Local User', category: 'identity', keywords: ['local user','local account','standard user','utilisateur local'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#546E7A"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#546E7A"/></svg>` },

  { id: 'user-power', name: 'Power User', category: 'identity', keywords: ['power user','elevated','operator'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#F57F17"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#F57F17"/><path d="M9 3l2 3h-1.5l1 3L8 6h1.5L9 3z" fill="#fff"/></svg>` },

  { id: 'user-dba', name: 'DBA', category: 'identity', keywords: ['dba','database admin','database administrator','sa','sysdba'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#4A148C"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#4A148C"/><ellipse cx="10" cy="5.5" rx="2.5" ry="1.2" fill="none" stroke="#fff" stroke-width=".8"/><path d="M7.5 5.5v2c0 .7 1.1 1.2 2.5 1.2s2.5-.5 2.5-1.2v-2" fill="none" stroke="#fff" stroke-width=".8"/></svg>` },

  { id: 'user-service', name: 'Service Account', category: 'identity', keywords: ['service account','service','svc','gmsa','managed service','system account','nt authority'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#00695C"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#00695C"/><path d="M8 5h4M10 4v4M8.5 6.5l3-3M11.5 6.5l-3-3" stroke="#fff" stroke-width=".7"/></svg>` },

  { id: 'user-guest', name: 'Guest / Anonymous', category: 'identity', keywords: ['guest','anonymous','anon','nobody','unauthenticated','public'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#9E9E9E"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#9E9E9E"/><text x="10" y="8" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">?</text></svg>` },

  { id: 'user-group', name: 'Group / Security Group', category: 'identity', keywords: ['group','security group','ad group','ou','organizational unit','role','gpo'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="7" cy="6" r="3" fill="#1565C0"/><circle cx="13" cy="6" r="3" fill="#1565C0"/><path d="M1 16c0-3.5 2.5-5.5 6-5.5" fill="#1565C0"/><path d="M19 16c0-3.5-2.5-5.5-6-5.5" fill="#1565C0"/><circle cx="10" cy="8" r="3" fill="#1976D2"/><path d="M4 18c0-3.5 2.5-6 6-6s6 2.5 6 6" fill="#1976D2"/></svg>` },

  { id: 'user-threat', name: 'Threat Actor', category: 'identity', keywords: ['threat actor','attacker','hacker','adversary','apt','intruder','malicious','red team'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#212121"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#212121"/><path d="M7 5l1.5 1.5M13 5l-1.5 1.5" stroke="#F44336" stroke-width="1"/><circle cx="8.5" cy="6.5" r=".6" fill="#F44336"/><circle cx="11.5" cy="6.5" r=".6" fill="#F44336"/></svg>` },

  { id: 'user-kerberos', name: 'Kerberos / SPN', category: 'identity', keywords: ['kerberos','spn','krbtgt','tgt','service principal','kerberoast','asrep'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#311B92"/><path d="M10 4l1.5 4h4l-3.3 2.5 1.3 4L10 12l-3.5 2.5 1.3-4L4.5 8h4z" fill="#FFD600"/></svg>` },

  { id: 'user-api', name: 'API Key / Bot', category: 'identity', keywords: ['api','bot','token','key','automation','script','robot','machine identity'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="3" fill="#37474F"/><circle cx="7.5" cy="10" r="1.5" fill="#00E676"/><circle cx="12.5" cy="10" r="1.5" fill="#00E676"/><rect x="6" y="13" width="8" height="1" rx=".5" fill="#00E676"/></svg>` },

  { id: 'user-shared', name: 'Shared Account', category: 'identity', keywords: ['shared','generic','shared account','common','team account'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="7" cy="7" r="3" fill="#FF8F00"/><circle cx="13" cy="7" r="3" fill="#FF8F00"/><path d="M4 18c0-3 2-5 6-5s6 2 6 5" fill="#FF8F00"/><path d="M9 7h2" stroke="#fff" stroke-width="1.2"/></svg>` },

  { id: 'user-privileged', name: 'Privileged Account', category: 'identity', keywords: ['privileged','pam','cyberark','vault','bastion','elevated','tier0'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#880E4F"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#880E4F"/><path d="M10 2L3 6v2c0 2.5 3 4.5 7 5.5 4-1 7-3 7-5.5V6L10 2z" fill="none" stroke="#FFD600" stroke-width=".8"/></svg>` },

  { id: 'user-network', name: 'Network Admin', category: 'identity', keywords: ['network admin','netadmin','network administrator','noc'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#1B5E20"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#1B5E20"/><path d="M7 5h6M10 4v4M7 7h6" stroke="#fff" stroke-width=".6"/><circle cx="7" cy="5" r=".5" fill="#4CAF50"/><circle cx="13" cy="5" r=".5" fill="#4CAF50"/><circle cx="7" cy="7" r=".5" fill="#4CAF50"/><circle cx="13" cy="7" r=".5" fill="#4CAF50"/></svg>` },

  { id: 'user-dev', name: 'Developer', category: 'identity', keywords: ['developer','dev','devops','engineer','programmer','sre'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#263238"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#263238"/><path d="M7.5 5l-1.5 1.5 1.5 1.5M12.5 5l1.5 1.5-1.5 1.5" stroke="#4FC3F7" stroke-width=".9" fill="none"/></svg>` },

  { id: 'user-helpdesk', name: 'Helpdesk / Support', category: 'identity', keywords: ['helpdesk','support','tier1','tier2','help desk','operator','technicien'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#00838F"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#00838F"/><path d="M6 5a4 4 0 018 0" fill="none" stroke="#fff" stroke-width=".8"/><circle cx="6.5" cy="6" r="1" fill="#fff"/><circle cx="13.5" cy="6" r="1" fill="#fff"/></svg>` },

  { id: 'user-auditor', name: 'Auditor / Compliance', category: 'identity', keywords: ['auditor','compliance','audit','inspector','reviewer','ciso','rssi'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#4E342E"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#4E342E"/><circle cx="11" cy="5.5" r="2" fill="none" stroke="#fff" stroke-width=".8"/><path d="M12.5 7l2 2" stroke="#fff" stroke-width=".8"/></svg>` },

  { id: 'user-email', name: 'Mailbox / Email Account', category: 'identity', keywords: ['mailbox','email account','mail','shared mailbox','distribution list','boite mail'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#1565C0"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#1565C0"/><rect x="7" y="4" width="6" height="4" rx=".8" fill="#fff" opacity=".9"/><path d="M7 4.5l3 2 3-2" stroke="#1565C0" stroke-width=".6" fill="none"/></svg>` },

  { id: 'user-vendor', name: 'Vendor / External', category: 'identity', keywords: ['vendor','external','contractor','prestataire','third party','supplier','partenaire'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="6" r="4" fill="#6D4C41"/><path d="M3 18c0-4 3.5-7 7-7s7 3 7 7" fill="#6D4C41"/><path d="M14 3l2 2-2 2" stroke="#FFB74D" stroke-width="1" fill="none"/></svg>` },

  { id: 'user-system', name: 'SYSTEM / NT AUTHORITY', category: 'identity', keywords: ['system','nt authority','local system','localsystem','machine account','computer account'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="3" fill="#263238"/><circle cx="10" cy="8" r="2.5" fill="#B0BEC5"/><path d="M6 15c0-2.5 1.8-4 4-4s4 1.5 4 4" fill="#B0BEC5"/><rect x="8.5" y="6" width="3" height="1" rx=".5" fill="#263238"/></svg>` },

  // ── Cloud ──────────────────────────────────────────────────────────────
  { id: 'aws', name: 'AWS', category: 'cloud', keywords: ['aws','amazon','cloud','ec2','s3'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2" fill="#232F3E"/><text x="10" y="12.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#FF9900">AWS</text></svg>` },

  { id: 'azure', name: 'Azure', category: 'cloud', keywords: ['azure','microsoft','cloud','entra'],
    svg: `<svg viewBox="0 0 20 20"><path d="M3 15L8 3h3L7 10l8 5H3z" fill="#0078D4"/><path d="M11 3l5 12H7l8-5L11 3z" fill="#50E6FF" opacity=".7"/></svg>` },

  { id: 'gcp', name: 'Google Cloud', category: 'cloud', keywords: ['gcp','google','cloud','gke'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 3L4 7v6l6 4 6-4V7l-6-4z" fill="#4285F4"/><path d="M10 3L4 7l6 4 6-4-6-4z" fill="#669DF6"/><path d="M10 11l-6-4v6l6 4v-6z" fill="#AECBFA"/></svg>` },

  { id: 'o365', name: 'Microsoft 365', category: 'cloud', keywords: ['office 365','microsoft 365','o365','m365','teams','onedrive'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="5" width="7" height="10" rx="1" fill="#D83B01"/><rect x="6" y="3" width="8" height="14" rx="1" fill="#EA3E23"/><rect x="10" y="5" width="8" height="10" rx="1" fill="#FF6A00" opacity=".9"/></svg>` },

  // ── Dev & CI/CD ────────────────────────────────────────────────────────
  { id: 'docker', name: 'Docker', category: 'dev', keywords: ['docker','container','containerization'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="9" width="16" height="7" rx="2" fill="#2496ED"/><g fill="#fff"><rect x="3.5" y="10" width="2.5" height="2" rx=".3"/><rect x="6.5" y="10" width="2.5" height="2" rx=".3"/><rect x="9.5" y="10" width="2.5" height="2" rx=".3"/><rect x="6.5" y="7.5" width="2.5" height="2" rx=".3"/><rect x="9.5" y="7.5" width="2.5" height="2" rx=".3"/><rect x="9.5" y="5" width="2.5" height="2" rx=".3"/></g></svg>` },

  { id: 'kubernetes', name: 'Kubernetes', category: 'dev', keywords: ['kubernetes','k8s','orchestration','container'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#326CE5" stroke="#fff" stroke-width=".8"/><path d="M10 4v3M10 13v3M4.5 7.5l2.5 1.5M13 11l2.5 1.5M4.5 12.5l2.5-1.5M13 9l2.5-1.5" stroke="#fff" stroke-width=".8"/><circle cx="10" cy="10" r="2" fill="#fff"/></svg>` },

  { id: 'git', name: 'Git / GitLab / GitHub', category: 'dev', keywords: ['git','gitlab','github','bitbucket','repository','scm'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="6" cy="6" r="2" fill="#F05033"/><circle cx="14" cy="6" r="2" fill="#F05033"/><circle cx="6" cy="14" r="2" fill="#F05033"/><path d="M6 8v4M8 6h4" stroke="#F05033" stroke-width="1.5"/></svg>` },

  { id: 'jenkins', name: 'Jenkins', category: 'dev', keywords: ['jenkins','ci','cd','pipeline','build'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#D33833"/><circle cx="10" cy="9" r="4" fill="#EFD0B2"/><circle cx="8.5" cy="8" r=".8" fill="#333"/><circle cx="11.5" cy="8" r=".8" fill="#333"/><path d="M8 11c1 1 3 1 4 0" stroke="#333" stroke-width=".6" fill="none"/><rect x="7" y="2.5" width="6" height="3" rx="1" fill="#333"/></svg>` },

  { id: 'ansible', name: 'Ansible', category: 'dev', keywords: ['ansible','automation','devops','playbook','tower'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#1A1918"/><path d="M10 4l5 10h-3.5L10 10.5 8.5 14H5l5-10z" fill="#fff"/></svg>` },

  // ── Mail & Collaboration ───────────────────────────────────────────────
  { id: 'email', name: 'Mail Server', category: 'mail', keywords: ['email','mail','smtp','imap','pop3','postfix','sendmail'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="2" fill="#1976D2"/><path d="M2 6l8 5 8-5" stroke="#fff" stroke-width="1.2" fill="none"/></svg>` },

  { id: 'teams', name: 'Microsoft Teams', category: 'mail', keywords: ['teams','microsoft','chat','collaboration'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="14" rx="3" fill="#5B5FC7"/><text x="10" y="13" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff">T</text></svg>` },

  { id: 'slack', name: 'Slack', category: 'mail', keywords: ['slack','chat','messaging'],
    svg: `<svg viewBox="0 0 20 20"><g fill-rule="evenodd"><rect x="8" y="2" width="3" height="6" rx="1.5" fill="#E01E5A"/><rect x="2" y="8" width="6" height="3" rx="1.5" fill="#36C5F0"/><rect x="8" y="12" width="3" height="6" rx="1.5" fill="#2EB67D"/><rect x="12" y="8" width="6" height="3" rx="1.5" fill="#ECB22E"/></g></svg>` },

  { id: 'zoom', name: 'Zoom', category: 'mail', keywords: ['zoom','video','conference','meeting'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" rx="3" fill="#2D8CFF"/><path d="M6 8h5v4H6zM12 9l3-1.5v5L12 11z" fill="#fff"/></svg>` },

  // ── Web ────────────────────────────────────────────────────────────────
  { id: 'apache', name: 'Apache HTTP', category: 'web', keywords: ['apache','httpd','web server'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#D22128"/><text x="10" y="13.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">A</text></svg>` },

  { id: 'nginx', name: 'Nginx', category: 'web', keywords: ['nginx','web server','reverse proxy'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" rx="2" fill="#009639"/><text x="10" y="13.5" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">N</text></svg>` },

  { id: 'nodejs', name: 'Node.js', category: 'web', keywords: ['nodejs','node','javascript','express','npm'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2L3 6v8l7 4 7-4V6l-7-4z" fill="#339933"/><text x="10" y="13" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">JS</text></svg>` },

  { id: 'php', name: 'PHP', category: 'web', keywords: ['php','laravel','symfony','wordpress'],
    svg: `<svg viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="8" ry="5" fill="#777BB4"/><text x="10" y="12.5" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">PHP</text></svg>` },

  { id: 'wordpress', name: 'WordPress', category: 'web', keywords: ['wordpress','cms','blog','wp'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#21759B"/><text x="10" y="14" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">W</text></svg>` },

  { id: 'java', name: 'Java / JBoss', category: 'web', keywords: ['java','jboss','wildfly','spring','jvm','jar'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#5382A1"/><text x="10" y="13" text-anchor="middle" font-size="8" font-weight="bold" fill="#F89820">☕</text></svg>` },

  { id: 'dotnet', name: '.NET / ASP.NET', category: 'web', keywords: ['dotnet','.net','asp','csharp','c#','microsoft'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#512BD4"/><text x="10" y="13" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">.NET</text></svg>` },

  { id: 'python-app', name: 'Python App', category: 'web', keywords: ['python','django','flask','fastapi'],
    svg: `<svg viewBox="0 0 20 20"><path d="M10 2C7 2 5 3.5 5 5.5V8h5v1H4c-1.5 0-3 1.5-3 3.5S2.5 16 4 16h2v-2.5C6 11.5 7.5 10 9.5 10H14c1.5 0 2-1 2-2.5V5.5C16 3.5 13 2 10 2z" fill="#306998"/><path d="M10 18c3 0 5-1.5 5-3.5V12h-5v-1h6c1.5 0 3-1.5 3-3.5S17.5 4 16 4h-2v2.5c0 2-1.5 3.5-3.5 3.5H6c-1.5 0-2 1-2 2.5v2c0 2 3 3.5 6 3.5z" fill="#FFD43B"/></svg>` },

  // ── Files & Data ───────────────────────────────────────────────────────
  { id: 'file-password', name: 'Passwords / Credentials', category: 'file', keywords: ['password','credentials','creds','secret','mot de passe','hash','ntlm','lsass','mimikatz','sam','ntds','shadow','passwd'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#C62828"/><circle cx="10" cy="8" r="2.5" fill="none" stroke="#fff" stroke-width="1.2"/><rect x="9.2" y="10" width="1.6" height="4" rx=".5" fill="#fff"/><rect x="8" y="12" width="4" height="1.5" rx=".5" fill="#fff"/></svg>` },

  { id: 'file-hash', name: 'Hashes', category: 'file', keywords: ['hash','ntlm','md5','sha1','sha256','hashcat','john','crack','rainbow'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#4E342E"/><text x="10" y="12" text-anchor="middle" font-size="8" font-weight="bold" fill="#FFD54F">#</text></svg>` },

  { id: 'file-dbdump', name: 'Database Dump', category: 'file', keywords: ['database dump','db dump','sql dump','mysqldump','pg_dump','backup','bak','mdf','export'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#1565C0"/><ellipse cx="10" cy="7" rx="5" ry="2" fill="#fff" opacity=".3"/><path d="M5 7v4c0 1.1 2.2 2 5 2s5-.9 5-2V7" fill="none" stroke="#fff" stroke-width=".8"/><ellipse cx="10" cy="11" rx="5" ry="2" fill="none" stroke="#fff" stroke-width=".5" opacity=".5"/></svg>` },

  { id: 'file-config', name: 'Configuration File', category: 'file', keywords: ['config','configuration','conf','ini','yaml','yml','toml','json','xml','env','properties','registry','gpo','policy'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#37474F"/><path d="M6 6h8M6 9h6M6 12h7M6 15h4" stroke="#B0BEC5" stroke-width=".8"/><circle cx="14" cy="13" r="2" fill="#FFB74D"/><path d="M14 11v1M14 15v-1M12.3 12.3l.5.5M15.2 14.2l.5.5M12 13h1M16 13h-1M12.3 14.2l.5-.5M15.2 12.3l.5-.5" stroke="#FFB74D" stroke-width=".4"/></svg>` },

  { id: 'file-pcap', name: 'Network Capture (PCAP)', category: 'file', keywords: ['pcap','capture','wireshark','tcpdump','network capture','packet','tshark','sniff','pcapng'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#00695C"/><path d="M6 7h8M6 10l2-1.5 2 1.5 2-1.5 2 1.5M6 13h8" stroke="#A5D6A7" stroke-width=".8"/><circle cx="14" cy="5" r="1.5" fill="#A5D6A7"/></svg>` },

  { id: 'file-log', name: 'Log File', category: 'file', keywords: ['log','logs','syslog','event log','journal','audit log','access log','error log'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#263238"/><path d="M6 5h8M6 7.5h6M6 10h7M6 12.5h8M6 15h5" stroke="#4FC3F7" stroke-width=".6"/><rect x="5" y="9.5" width="1" height="1" rx=".2" fill="#F44336"/></svg>` },

  { id: 'file-script', name: 'Script / Exploit', category: 'file', keywords: ['script','exploit','payload','shellcode','powershell','ps1','bash','sh','python','py','bat','vbs','macro'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#1A237E"/><path d="M6 6l3 3-3 3" stroke="#69F0AE" stroke-width="1.2" fill="none"/><path d="M10 13h5" stroke="#69F0AE" stroke-width="1"/></svg>` },

  { id: 'file-key', name: 'SSH Key / Private Key', category: 'file', keywords: ['ssh key','private key','public key','pem','ppk','rsa','ed25519','id_rsa','authorized_keys','certificate','pfx','p12'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#E65100"/><circle cx="8.5" cy="8" r="2.5" fill="none" stroke="#FFE0B2" stroke-width="1.2"/><path d="M10.5 9.5h4" stroke="#FFE0B2" stroke-width="1.2"/><path d="M13 9.5v2M14.5 9.5v1.5" stroke="#FFE0B2" stroke-width=".8"/></svg>` },

  { id: 'file-report', name: 'Report / Findings', category: 'file', keywords: ['report','finding','findings','vulnerability report','pentest report','audit','executive summary','deliverable'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#1565C0"/><rect x="5.5" y="4" width="9" height="5" rx="1" fill="#fff" opacity=".2"/><path d="M7 5.5h5M7 7.5h3" stroke="#fff" stroke-width=".6"/><path d="M6 11h8M6 13h6M6 15h7" stroke="#90CAF9" stroke-width=".6"/></svg>` },

  { id: 'file-screenshot', name: 'Screenshot / Evidence', category: 'file', keywords: ['screenshot','screen','capture','evidence','proof','image','photo','png','jpg','preuve'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="2" fill="#455A64"/><circle cx="10" cy="10" r="3" fill="#78909C"/><circle cx="10" cy="10" r="1.5" fill="#455A64"/><rect x="8" y="4" width="4" height="1.5" rx=".5" fill="#607D8B"/></svg>` },

  { id: 'file-email', name: 'Email / Phishing', category: 'file', keywords: ['email','mail','eml','msg','phishing','spear phishing','spearphishing','spam','header'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="2" fill="#AD1457"/><path d="M3 6l7 4.5L17 6" stroke="#fff" stroke-width="1" fill="none"/><circle cx="15" cy="5" r="2.5" fill="#F44336"/><text x="15" y="6.5" text-anchor="middle" font-size="4" font-weight="bold" fill="#fff">!</text></svg>` },

  { id: 'file-wordlist', name: 'Wordlist / Dictionary', category: 'file', keywords: ['wordlist','dictionary','rockyou','seclists','bruteforce','brute force','fuzzing','dirbuster'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#4A148C"/><path d="M6 5h8M6 7h7M6 9h5M6 11h8M6 13h6M6 15h7" stroke="#CE93D8" stroke-width=".6"/></svg>` },

  { id: 'file-binary', name: 'Binary / Executable', category: 'file', keywords: ['binary','exe','executable','dll','elf','pe','malware','sample','payload','backdoor','trojan','implant','beacon'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#212121"/><text x="10" y="8" text-anchor="middle" font-size="4.5" fill="#76FF03">01101</text><text x="10" y="12" text-anchor="middle" font-size="4.5" fill="#76FF03">10010</text><text x="10" y="16" text-anchor="middle" font-size="4.5" fill="#76FF03">11001</text></svg>` },

  { id: 'file-archive', name: 'Archive (ZIP/TAR)', category: 'file', keywords: ['archive','zip','tar','gz','rar','7z','compressed','loot','exfil'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#795548"/><rect x="9" y="3" width="2" height="1.5" fill="#5D4037"/><rect x="9" y="5.5" width="2" height="1.5" fill="#5D4037"/><rect x="9" y="8" width="2" height="1.5" fill="#5D4037"/><rect x="8" y="11" width="4" height="3" rx="1" fill="#5D4037"/><circle cx="10" cy="12.5" r=".6" fill="#BCAAA4"/></svg>` },

  { id: 'file-token', name: 'Token / Cookie / Session', category: 'file', keywords: ['token','cookie','session','jwt','bearer','oauth','api key','api token','saml','kerberos ticket'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#F57F17"/><circle cx="10" cy="9" r="3.5" fill="none" stroke="#fff" stroke-width="1"/><path d="M10 6v1.5M10 11v1.5M7 9h1.5M11.5 9H13M7.8 7.2l1 1M12.2 10.8l-1-1M12.2 7.2l-1 1M7.8 10.8l1-1" stroke="#fff" stroke-width=".5"/><rect x="8" y="13.5" width="4" height="1.5" rx=".5" fill="#fff" opacity=".5"/></svg>` },

  { id: 'file-scan', name: 'Scan Results', category: 'file', keywords: ['scan','nmap','masscan','nikto','gobuster','ffuf','dirsearch','nuclei','scan results','recon','enumeration'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#006064"/><circle cx="11" cy="8" r="3" fill="none" stroke="#80DEEA" stroke-width="1"/><path d="M13.2 10.2l2.5 2.5" stroke="#80DEEA" stroke-width="1.2"/><path d="M6 14h8M6 16h5" stroke="#80DEEA" stroke-width=".6"/></svg>` },

  { id: 'file-note', name: 'Notes / Memo', category: 'file', keywords: ['note','notes','memo','writeup','write-up','documentation','readme','todo','checklist'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#827717"/><path d="M6 5h8M6 7.5h6M6 10h7M6 12.5h5M6 15h4" stroke="#F0F4C3" stroke-width=".7"/></svg>` },

  { id: 'file-loot', name: 'Loot / Exfiltrated Data', category: 'file', keywords: ['loot','exfiltration','exfil','data','stolen','treasure','pillage','butin'],
    svg: `<svg viewBox="0 0 20 20"><path d="M5 8h10l-1 8H6L5 8z" fill="#F9A825"/><path d="M5 8c0-2 2-4 5-4s5 2 5 4" fill="none" stroke="#F9A825" stroke-width="1.5"/><circle cx="10" cy="11" r="1.5" fill="#795548"/><rect x="9.3" y="11.5" width="1.4" height="2.5" rx=".3" fill="#795548"/></svg>` },

  { id: 'file-network-map', name: 'Network Map / Diagram', category: 'file', keywords: ['network map','diagram','topology','schema','architecture','visio','drawio','map'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#0D47A1"/><circle cx="7" cy="7" r="1.5" fill="#64B5F6"/><circle cx="13" cy="7" r="1.5" fill="#64B5F6"/><circle cx="10" cy="13" r="1.5" fill="#64B5F6"/><path d="M7 7l6 0M7 7l3 6M13 7l-3 6" stroke="#64B5F6" stroke-width=".7"/></svg>` },

  { id: 'file-c2', name: 'C2 Config / Implant', category: 'file', keywords: ['c2','command and control','cobalt strike','covenant','sliver','metasploit','implant','beacon','malleable','profile','listener'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#B71C1C"/><text x="10" y="12" text-anchor="middle" font-size="7" font-weight="bold" fill="#EF9A9A">C2</text></svg>` },

  { id: 'file-vuln', name: 'Vulnerability / CVE', category: 'file', keywords: ['vulnerability','vuln','cve','exploit','poc','proof of concept','advisory','0day','zero day'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#E65100"/><path d="M10 5l5 9H5l5-9z" fill="none" stroke="#fff" stroke-width="1"/><text x="10" y="12.5" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">!</text></svg>` },

  { id: 'file-timeline', name: 'Timeline / IOC', category: 'file', keywords: ['timeline','ioc','indicator','compromise','forensic','forensics','evidence','artifact','chain of custody','yara','sigma'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#311B92"/><path d="M7 6v10" stroke="#B39DDB" stroke-width=".8"/><circle cx="7" cy="7" r="1.2" fill="#EDE7F6"/><circle cx="7" cy="11" r="1.2" fill="#EDE7F6"/><circle cx="7" cy="15" r="1.2" fill="#EDE7F6"/><path d="M9 7h5M9 11h4M9 15h3" stroke="#B39DDB" stroke-width=".6"/></svg>` },

  { id: 'file-pdf', name: 'PDF Document', category: 'file', keywords: ['pdf','document','acrobat','rapport','livrable'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#D32F2F"/><text x="10" y="13" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff">PDF</text></svg>` },

  { id: 'file-spreadsheet', name: 'Spreadsheet / CSV', category: 'file', keywords: ['spreadsheet','excel','csv','xlsx','xls','tableau','data','pivot'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" fill="#1B5E20"/><path d="M6 5h8M6 8h8M6 11h8M6 14h8" stroke="#A5D6A7" stroke-width=".5"/><path d="M9 5v10M13 5v10" stroke="#A5D6A7" stroke-width=".5"/></svg>` },

  // ── Other / Generic ────────────────────────────────────────────────────
  { id: 'server-generic', name: 'Generic Server', category: 'other', keywords: ['server','host','machine','box'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="5" rx="1" fill="#546E7A"/><circle cx="14.5" cy="4.5" r=".8" fill="#4CAF50"/><rect x="3" y="8" width="14" height="5" rx="1" fill="#546E7A"/><circle cx="14.5" cy="10.5" r=".8" fill="#4CAF50"/><rect x="3" y="14" width="14" height="4" rx="1" fill="#546E7A"/><circle cx="14.5" cy="16" r=".8" fill="#4CAF50"/></svg>` },

  { id: 'workstation', name: 'Workstation / PC', category: 'other', keywords: ['workstation','desktop','pc','computer','poste'],
    svg: `<svg viewBox="0 0 20 20"><rect x="2" y="3" width="16" height="10" rx="1.5" fill="#37474F"/><rect x="3" y="4" width="14" height="8" rx=".5" fill="#78909C"/><rect x="7" y="14" width="6" height="1" fill="#546E7A"/><rect x="5" y="15" width="10" height="1.5" rx=".5" fill="#546E7A"/></svg>` },

  { id: 'laptop', name: 'Laptop', category: 'other', keywords: ['laptop','notebook','portable'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="10" rx="1.5" fill="#37474F"/><rect x="4" y="4" width="12" height="8" rx=".5" fill="#78909C"/><path d="M1 14h18l-1 2H2l-1-2z" fill="#546E7A"/></svg>` },

  { id: 'phone', name: 'Smartphone', category: 'other', keywords: ['phone','mobile','smartphone','voip','sip'],
    svg: `<svg viewBox="0 0 20 20"><rect x="6" y="2" width="8" height="16" rx="2" fill="#37474F"/><rect x="7" y="4" width="6" height="10" fill="#78909C"/><circle cx="10" cy="16" r=".8" fill="#78909C"/></svg>` },

  { id: 'iot', name: 'IoT Device', category: 'other', keywords: ['iot','sensor','embedded','scada','plc','industrial'],
    svg: `<svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="2" fill="#00897B"/><circle cx="10" cy="10" r="3" fill="none" stroke="#fff" stroke-width="1"/><circle cx="10" cy="10" r="1" fill="#fff"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="#00897B" stroke-width="1.5"/></svg>` },

  { id: 'camera', name: 'IP Camera', category: 'other', keywords: ['camera','cctv','surveillance','ip camera','video'],
    svg: `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="5" fill="#37474F"/><circle cx="10" cy="10" r="3" fill="#78909C"/><circle cx="10" cy="10" r="1.5" fill="#37474F"/><rect x="14" y="7" width="4" height="6" rx="1" fill="#37474F"/></svg>` },

  { id: 'default', name: 'Default (📦)', category: 'other', keywords: ['default','generic','other','unknown','none'],
    svg: `<svg viewBox="0 0 20 20"><rect x="3" y="5" width="14" height="10" rx="2" fill="#7c3aed"/><path d="M3 8h14" stroke="#fff" stroke-width=".5" opacity=".3"/><text x="10" y="13" text-anchor="middle" font-size="7" fill="#fff">📦</text></svg>` },
];

/** Lookup map: id → icon */
export const ASSET_ICON_MAP = Object.fromEntries(ASSET_ICONS.map(i => [i.id, i]));

/**
 * Maps parser IDs (from parsers.js) to asset-icon IDs for auto-icon assignment.
 * When auto-detect identifies the content type, we also set the matching icon.
 */
export const PARSER_ICON_MAP = {
  // IP Addresses
  ip_address_v4:   'ipv4',
  ip_address_v6:   'ipv6',
  // Network / Identity
  ip_addr:         'file-config',
  ifconfig:        'file-config',
  ipconfig:        'file-config',
  id_whoami:       'user-local',
  whoami_all:      'user-local',
  uname:           'linux',
  os_release:      'linux',
  // Scanning
  nmap:            'file-scan',
  port_scan:       'file-scan',
  web_fuzz:        'file-scan',
  nikto:           'file-scan',
  dns_lookup:      'dns',
  // Connections & Routing
  netstat:         'file-log',
  ss:              'file-log',
  arp:             'switch',
  route:           'router',
  lsof:            'file-log',
  // Processes & Services
  ps_faux:         'file-log',
  ps_aux:          'file-log',
  tasklist:        'file-log',
  sc_query:        'file-config',
  schtasks:        'file-config',
  crontab:         'file-config',
  // System Info
  systeminfo:      'windows',
  mount_df:        'file-config',
  etc_fstab:       'file-config',
  env_vars:        'file-config',
  pkg_list:        'file-log',
  dir_ls:          'file-log',
  wmic:            'windows',
  // Files & Secrets
  etc_passwd:      'file-password',
  etc_shadow:      'file-password',
  etc_hosts:       'file-config',
  etc_group:       'user-group',
  resolv_conf:     'file-config',
  ssh_priv_key:    'file-key',
  ssh_pub_key:     'file-key',
  authorized_keys: 'file-key',
  known_hosts:     'file-key',
  ssh_keys:        'file-key',
  hash_list:       'file-hash',
  http_headers:    'file-log',
  cmd_history:     'file-script',
  // Users & Privileges
  net_user:        'user-domain',
  net_localgroup:  'user-group',
  net_share:       'samba',
  sudo_l:          'file-config',
  etc_sudoers:     'file-config',
  cmdkey:          'file-password',
  // Config Files
  sshd_config:     'file-config',
  apache_conf:     'apache',
  // Firewall
  iptables:        'firewall',
  // Registry
  reg_query:       'file-config',
  // Misc
  find_suid:       'file-binary',
  last_log:        'file-log',
};

/**
 * Returns the inline SVG string for a given icon id.
 * Falls back to the default box icon.
 * @param {string|null|undefined} iconId
 * @returns {string}
 */
export function getAssetIconSvg(iconId) {
  if (!iconId || iconId === 'default') return '📦';
  const icon = ASSET_ICON_MAP[iconId];
  return icon ? `<span class="asset-icon-svg" title="${icon.name}">${icon.svg}</span>` : '📦';
}
