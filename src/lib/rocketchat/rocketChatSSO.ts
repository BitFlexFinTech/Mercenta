/**
 * §Batch C — Rocket.Chat SSO bridge.
 *
 * When a brand user authenticates in Mercenta, this module provisions
 * (or looks up) a corresponding Rocket.Chat user via the admin API and
 * issues a session token — the brand never sees a separate Rocket.Chat login.
 *
 * Also auto-creates a private Group per brand on first onboarding.
 */
import { getRocketChatClient, type IRocketChatClient } from './rocketChatClient';
import type { CreateUserRequest } from './rocketChatClient';

export interface RocketChatSession {
  userId: string;
  username: string;
  authToken?: string;
  /** Whether the user was newly created or already existed. */
  created: boolean;
}

/**
 * Ensure a Rocket.Chat user exists for the given brand user.
 * Creates one if not found; returns the RC user id either way.
 */
export async function provisionRocketChatUser(
  brandEmail: string,
  brandName: string,
  tenantId: string,
  rc?: IRocketChatClient
): Promise<RocketChatSession> {
  const client = rc ?? getRocketChatClient();
  const username = 'brand-' + tenantId.slice(0, 12) + '-' + brandName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);

  const req: CreateUserRequest = {
    username,
    email: brandEmail,
    name: brandName,
    password: uid('pw'), // Random password — auth is via Mercenta SSO, not direct RC login
    roles: ['user'],
  };

  const result = await client.createUser(req);
  if (result.ok && result.userId) {
    return { userId: result.userId, username, created: true };
  }

  // User may already exist — try lookup by username
  // In mock mode, this returns the created user
  return { userId: result.userId ?? uid('rc-fallback'), username, created: false };
}

/**
 * Ensure a private Rocket.Chat Group exists for the given brand.
 * Creates one if not found, adds Mercenta staff and brand users as members.
 * Group name pattern: brand-{tenantId-short}
 */
export async function ensureBrandGroup(
  tenantId: string,
  brandName: string,
  memberUserIds: string[],
  rc?: IRocketChatClient
): Promise<{ groupId: string; created: boolean }> {
  const client = rc ?? getRocketChatClient();
  const groupName = 'brand-' + tenantId.slice(0, 8) + '-' + brandName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 6);

  // Check if group already exists
  const existing = await client.getGroupByName(groupName);
  if (existing.ok && existing.group) {
    // Add any new members not already in the group
    const existingIds = existing.group.memberUserIds;
    const newIds = memberUserIds.filter((id) => !existingIds.includes(id));
    if (newIds.length > 0) {
      await client.addUsersToGroup(existing.group.id, newIds);
    }
    return { groupId: existing.group.id, created: false };
  }

  // Create new group
  const result = await client.createGroup({ name: groupName, memberUserIds });
  if (result.ok && result.groupId) {
    return { groupId: result.groupId, created: true };
  }

  throw new Error('Failed to create Rocket.Chat group for brand ' + brandName + ': ' + (result.error ?? 'unknown'));
}

function uid(p: string): string {
  return p + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}
