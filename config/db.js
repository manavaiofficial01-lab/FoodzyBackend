const mysql = require("mysql2");
const dotenv = require("dotenv");
const dns = require("dns");

dotenv.config();

// Custom DNS lookup with public DNS fallback for restricted ISP environments
const customLookup = (hostname, options, callback) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return dns.lookup(hostname, options, callback);
  }
  
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) {
      console.log(`[DNS] OS lookup failed for ${hostname}. Querying fallback public DNS (Google/Cloudflare)...`);
      const dnsPromises = require('dns').promises;
      dnsPromises.setServers(['8.8.8.8', '1.1.1.1']);
      dnsPromises.resolve4(hostname)
        .then(addresses => {
          if (addresses && addresses.length > 0) {
            console.log(`[DNS] Resolved ${hostname} to ${addresses[0]} via public DNS.`);
            callback(null, addresses[0], 4);
          } else {
            callback(err);
          }
        })
        .catch(fallbackErr => {
          console.error(`[DNS] Public DNS fallback failed for ${hostname}:`, fallbackErr.message);
          callback(err);
        });
    } else {
      callback(null, address, family);
    }
  });
};

const { execSync } = require('child_process');

function resolveHostSync(host) {
  if (!host || host === 'localhost' || host === '127.0.0.1') return host;
  try {
    console.log(`[DNS-PRE] Synchronously resolving hostname via nslookup: ${host}`);
    const stdout = execSync(`nslookup ${host} 8.8.8.8`, { timeout: 5000 }).toString();
    const parts = stdout.split(/Name:/i);
    if (parts.length > 1) {
      const ipMatches = parts[1].match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g);
      if (ipMatches) {
        console.log(`[DNS-PRE] Successfully resolved ${host} to IP: ${ipMatches[0]}`);
        return ipMatches[0];
      }
    }
  } catch (e) {
    console.error("[DNS-PRE] nslookup Sync error:", e.message);
  }
  return host;
}

const cleanEnvVar = (val) => typeof val === 'string' ? val.trim() : val;

const rawHost = cleanEnvVar(process.env.DB_HOST);
const resolvedHost = resolveHostSync(rawHost);

const db = mysql.createPool({
  host: resolvedHost,
  user: cleanEnvVar(process.env.DB_USER),
  password: cleanEnvVar(process.env.DB_PASSWORD),
  database: cleanEnvVar(process.env.DB_NAME),
  port: parseInt(cleanEnvVar(process.env.DB_PORT) || '3306'),
  lookup: customLookup,
  waitForConnections: true,
  connectionLimit: 2, 
  queueLimit: 0
});

// Use the pool for queries. The .promise() wrapper is often useful but we'll stick to callbacks for now to match your existing code.
console.log("Database connection pool created.");

module.exports = db;
