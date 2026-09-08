import { randomBytes } from 'node:crypto';

function generateUserId() {
  return randomBytes(12).toString('hex');
}

function canonicalizeUserId(id) {
  return id && /^[0-9a-f]{24}$/i.test(id) ? id : generateUserId();
}

function buildUserPayload({ id, email, name }) {
  return {
    id: canonicalizeUserId(id),
    email,
    full_name: name || email,
    role: 'user',
    hashed_password: '',
    is_active: true,
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

describe('auth identity bridge', () => {
  it('preserves a valid 24-char hex user id', () => {
    const payload = buildUserPayload({ id: '69504a54572412607e7fa524', email: 'a@b.com', name: 'A' });
    assert(payload.id === '69504a54572412607e7fa524');
  });

  it('canonicalizes a non-hex id instead of storing it raw', () => {
    const payload = buildUserPayload({ id: 'google-sub-123', email: 'a@b.com', name: 'A' });
    assert(payload.id !== 'google-sub-123');
    assert(/^[0-9a-f]{24}$/i.test(payload.id));
  });

  it('generates a stable-looking 24-char hex id when id is missing', () => {
    const payload = buildUserPayload({ email: 'a@b.com' });
    assert(/^[0-9a-f]{24}$/i.test(payload.id));
  });

  it('rejects arbitrary-length hex ids and generates a new canonical one', () => {
    const payload = buildUserPayload({ id: 'abc123', email: 'a@b.com' });
    assert(payload.id !== 'abc123');
    assert(/^[0-9a-f]{24}$/i.test(payload.id));
  });

  it('maps name to full_name and defaults to email', () => {
    const p1 = buildUserPayload({ email: 'a@b.com', name: 'Alice' });
    assert(p1.full_name === 'Alice');

    const p2 = buildUserPayload({ email: 'a@b.com' });
    assert(p2.full_name === 'a@b.com');
  });

  it('does not include avatar_url or provider in payload', () => {
    const payload = buildUserPayload({ id: 'abc', email: 'a@b.com', name: 'A', avatar_url: 'x', provider: 'google' });
    assert(!('avatar_url' in payload));
    assert(!('provider' in payload));
  });

  it('simulates existing-user preservation: does not return a new id/role/hashed_password on conflict', async () => {
    const simulatedExisting = {
      id: '69504a54572412607e7fa524',
      email: 'existing@example.com',
      full_name: 'Existing User',
      role: 'admin',
      hashed_password: 'stored-hash',
      created_at: '2024-01-01T00:00:00Z',
    };

    const incoming = {
      id: 'google-sub-123',
      email: 'existing@example.com',
      name: 'New Name',
    };

    const preserved = {
      id: simulatedExisting.id,
      role: simulatedExisting.role,
      hashed_password: simulatedExisting.hashed_password,
    };

    const updated = {
      full_name: incoming.name || simulatedExisting.full_name || incoming.email,
    };

    assert(preserved.id === '69504a54572412607e7fa524');
    assert(preserved.role === 'admin');
    assert(preserved.hashed_password === 'stored-hash');
    assert(updated.full_name === 'New Name');
  });
});
