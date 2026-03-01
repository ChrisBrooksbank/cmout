import { generateKeyPairSync } from 'node:crypto';

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate a VAPID key pair using P-256 elliptic curve.
 * Returns base64url-encoded public and private keys for use with Web Push.
 *
 * - publicKey: 65-byte uncompressed EC point (0x04 || x || y), base64url encoded
 * - privateKey: 32-byte private scalar d, base64url encoded
 */
export function generateVapidKeys(): VapidKeys {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  // Export public key as JWK and build uncompressed point (0x04 || x || y)
  const pubJwk = pubKeyObj.export({ format: 'jwk' }) as {
    x: string;
    y: string;
  };
  const xBytes = Buffer.from(pubJwk.x, 'base64url');
  const yBytes = Buffer.from(pubJwk.y, 'base64url');
  const uncompressedPoint = Buffer.concat([Buffer.from([0x04]), xBytes, yBytes]);
  const publicKey = uncompressedPoint.toString('base64url');

  // Export private key as JWK and extract scalar d
  const privJwk = privKeyObj.export({ format: 'jwk' }) as { d: string };
  const privateKey = privJwk.d;

  return { publicKey, privateKey };
}
