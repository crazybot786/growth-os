import { randomUUID } from 'node:crypto';

export function newId(): string {
  return randomUUID();
}

export function correlationIdFrom(value?: string | null): string {
  if (value && value.trim().length > 0) return value.trim();
  return newId();
}

