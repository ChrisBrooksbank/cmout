import { describe, it, expect } from 'vitest';
import { generateVapidKeys } from './vapid.js';

describe('generateVapidKeys', () => {
  it('returns an object with publicKey and privateKey', () => {
    const keys = generateVapidKeys();
    expect(keys).toHaveProperty('publicKey');
    expect(keys).toHaveProperty('privateKey');
  });

  it('publicKey is a non-empty string', () => {
    const { publicKey } = generateVapidKeys();
    expect(typeof publicKey).toBe('string');
    expect(publicKey.length).toBeGreaterThan(0);
  });

  it('privateKey is a non-empty string', () => {
    const { privateKey } = generateVapidKeys();
    expect(typeof privateKey).toBe('string');
    expect(privateKey.length).toBeGreaterThan(0);
  });

  it('publicKey decodes to 65 bytes (uncompressed P-256 point)', () => {
    const { publicKey } = generateVapidKeys();
    const bytes = Buffer.from(publicKey, 'base64url');
    expect(bytes.length).toBe(65);
  });

  it('publicKey starts with 0x04 (uncompressed point prefix)', () => {
    const { publicKey } = generateVapidKeys();
    const bytes = Buffer.from(publicKey, 'base64url');
    expect(bytes[0]).toBe(0x04);
  });

  it('privateKey decodes to 32 bytes (P-256 scalar)', () => {
    const { privateKey } = generateVapidKeys();
    const bytes = Buffer.from(privateKey, 'base64url');
    expect(bytes.length).toBe(32);
  });

  it('generates unique keys on each call', () => {
    const a = generateVapidKeys();
    const b = generateVapidKeys();
    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.privateKey).not.toBe(b.privateKey);
  });

  it('keys are base64url encoded (no + or / characters)', () => {
    const { publicKey, privateKey } = generateVapidKeys();
    expect(publicKey).not.toMatch(/[+/=]/);
    expect(privateKey).not.toMatch(/[+/=]/);
  });
});
