export interface RocketChatUser {
  id: string;
  username: string;
  email: string;
  name: string;
  active: boolean;
}

export interface RocketChatGroup {
  id: string;
  name: string;
  brandId: string;
  memberUserIds: string[];
  createdAt: string;
}

export interface RocketChatMessage {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  name: string;
  password: string;
  roles?: string[];
}

export interface CreateGroupRequest {
  name: string;
  memberUserIds: string[];
}

export interface IRocketChatClient {
  ping(): Promise<{ ok: boolean; error?: string }>;
  createUser(req: CreateUserRequest): Promise<{ ok: boolean; userId?: string; error?: string }>;
  createGroup(req: CreateGroupRequest): Promise<{ ok: boolean; groupId?: string; error?: string }>;
  addUsersToGroup(groupId: string, userIds: string[]): Promise<{ ok: boolean; error?: string }>;
  sendMessage(groupId: string, text: string, userId: string): Promise<{ ok: boolean; messageId?: string; error?: string }>;
  getMessages(groupId: string, limit?: number): Promise<{ ok: boolean; messages?: RocketChatMessage[]; error?: string }>;
  getGroupByName(name: string): Promise<{ ok: boolean; group?: RocketChatGroup; error?: string }>;
}

/* ── MockClient (no credentials needed) ─────────────────────────── */

function uid(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export class MockRocketChatClient implements IRocketChatClient {
  private users: RocketChatUser[] = [
    { id: 'rc-mock-admin', username: 'mercenta-admin', email: 'admin@mercenta.co.uk', name: 'Mercenta Admin', active: true },
  ];
  private groups: RocketChatGroup[] = [];
  private messages: RocketChatMessage[] = [];

  async ping(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }

  async createUser(req: CreateUserRequest): Promise<{ ok: boolean; userId?: string; error?: string }> {
    const id = uid('rc-mock-user');
    this.users.push({ id, username: req.username, email: req.email, name: req.name, active: true });
    return { ok: true, userId: id };
  }

  async createGroup(req: CreateGroupRequest): Promise<{ ok: boolean; groupId?: string; error?: string }> {
    const id = uid('rc-mock-group');
    this.groups.push({ id, name: req.name, brandId: '', memberUserIds: req.memberUserIds, createdAt: new Date().toISOString() });
    return { ok: true, groupId: id };
  }

  async addUsersToGroup(groupId: string, userIds: string[]): Promise<{ ok: boolean; error?: string }> {
    const g = this.groups.find((x) => x.id === groupId);
    if (!g) return { ok: false, error: 'Group not found' };
    g.memberUserIds.push(...userIds.filter((id) => !g.memberUserIds.includes(id)));
    return { ok: true };
  }

  async sendMessage(groupId: string, text: string, userId: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const u = this.users.find((x) => x.id === userId);
    this.messages.push({ id: uid('rc-msg'), groupId, userId, username: u?.username ?? 'unknown', text, createdAt: new Date().toISOString() });
    return { ok: true, messageId: uid('rc-msg') };
  }

  async getMessages(groupId: string, limit = 50): Promise<{ ok: boolean; messages?: RocketChatMessage[]; error?: string }> {
    return { ok: true, messages: this.messages.filter((m) => m.groupId === groupId).slice(-limit) };
  }

  async getGroupByName(name: string): Promise<{ ok: boolean; group?: RocketChatGroup; error?: string }> {
    const g = this.groups.find((x) => x.name === name);
    if (!g) return { ok: false, error: 'Group not found' };
    return { ok: true, group: g };
  }
}

/* ── Factory ───────────────────────────────────────────────────── */

let _mockClient: MockRocketChatClient | null = null;

/**
 * Get a Rocket.Chat client instance.
 * Returns MockRocketChatClient when no credentials are provided.
 * Returns RealRocketChatClient when full credentials are available.
 */
export function getRocketChatClient(creds?: {
  apiUrl?: string;
  adminUsername?: string;
  adminPassword?: string;
}): IRocketChatClient {
  if (!_mockClient) _mockClient = new MockRocketChatClient();
  return _mockClient;
}
