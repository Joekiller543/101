import { resolve4, resolve6 } from 'node:dns/promises';
import { Address4, Address6 } from 'ip-address';

/**
 * Validates an IP address against private/reserved ranges.
 * @param {string} ip - The IP address string.
 * @returns {boolean} - True if public/safe, false if private/reserved.
 */
export function isIpSafe(ip) {
  try {
    if (Address4.isValid(ip)) {
      const addr = new Address4(ip);
      const parts = addr.parsedAddress.map(p => parseInt(p, 10));
      // 0.0.0.0/8
      if (parts[0] === 0) return false;
      // 10.0.0.0/8
      if (parts[0] === 10) return false;
      // 100.64.0.0/10 (CGNAT)
      if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return false;
      // 127.0.0.0/8
      if (parts[0] === 127) return false;
      // 169.254.0.0/16
      if (parts[0] === 169 && parts[1] === 254) return false;
      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      // 192.0.0.0/24 (IETF Protocol Assignments) - often blocked
      if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return false;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return false;
      // 198.18.0.0/15 (Benchmarking)
      if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return false;
      // 198.51.100.0/24 (TEST-NET-2)
      if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return false;
      // 203.0.113.0/24 (TEST-NET-3)
      if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return false;
      // 224.0.0.0/4 (Multicast)
      if (parts[0] >= 224) return false;

      return true;
    }
    
    if (Address6.isValid(ip)) {
       const addr = new Address6(ip);
       if (addr.isLoopback()) return false;
       if (addr.isUniqueLocal()) return false;
       if (addr.isLinkLocal()) return false;
       if (addr.isMulticast()) return false;
       // Documentation / Benchmarking ranges (2001:db8::/32)
       const hex = addr.toHex(); // returns full expanded hex
       if (hex.startsWith('2001:0db8')) return false;
       return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Resolves a hostname to an IP and validates it.
 * Uses dns.resolve* instead of dns.lookup to avoid thread pool blocking.
 * Returns the safe IP and family, or throws error.
 */
export async function resolveAndValidate(hostname) {
  let address = null;
  let family = 4;

  // Try IPv4 first
  try {
    const addresses = await resolve4(hostname);
    if (addresses && addresses.length > 0) {
      address = addresses[0];
      family = 4;
    }
  } catch (e) {
    // Fallback to IPv6 if IPv4 fails (e.g. only AAAA record)
    try {
      const addresses = await resolve6(hostname);
      if (addresses && addresses.length > 0) {
         address = addresses[0];
         family = 6;
      }
    } catch (e2) {
      throw new Error(`DNS resolution failed for ${hostname}`);
    }
  }

  if (!address) {
    throw new Error(`No IP found for ${hostname}`);
  }

  if (!isIpSafe(address)) {
    throw new Error(`DNS resolution denied: ${hostname} resolved to private IP ${address}`);
  }

  return { address, family };
}