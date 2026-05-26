import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User, Role } from './models/index.js';

dotenv.config();

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const signToken = (userId, role) => jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });

async function callApi(path, token, method = 'GET', body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

async function findUserByRole(roleName, preferredNameIncludes = null) {
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) return null;

  const users = await User.findAll({
    where: { role_id: role.id, is_active: true },
    attributes: ['id', 'name', 'email']
  });

  if (!users.length) return null;
  if (!preferredNameIncludes) return users[0];

  const match = users.find((u) =>
    String(u.name || '').toLowerCase().includes(preferredNameIncludes.toLowerCase())
  );

  return match || users[0];
}

function summarizeUnread(label, beforeRes, afterRes) {
  const before = Number(beforeRes?.data?.count ?? -1);
  const after = Number(afterRes?.data?.count ?? -1);
  return {
    label,
    before,
    after,
    delta: after - before,
    success: beforeRes?.ok && afterRes?.ok && after >= before
  };
}

async function main() {
  try {
    const admin = await findUserByRole('Admin');
    const traveler = await findUserByRole('Walkee');
    const guide = await findUserByRole('Walker', 'kakaire david');

    if (!admin || !traveler || !guide) {
      console.log(JSON.stringify({
        ok: false,
        reason: 'required_users_missing',
        found: {
          admin: Boolean(admin),
          traveler: Boolean(traveler),
          guide: Boolean(guide)
        }
      }, null, 2));
      process.exitCode = 1;
      return;
    }

    const adminToken = signToken(admin.id, 'Admin');
    const travelerToken = signToken(traveler.id, 'Walkee');
    const guideToken = signToken(guide.id, 'Walker');

    const travelerUnreadBefore = await callApi('/messages/unread/count', travelerToken);
    const guideUnreadBefore = await callApi('/messages/unread/count', guideToken);

    const title = `E2E Announcement ${Date.now()}`;
    const message = 'Propagation check for traveler and guide notification feeds';

    const createAnnouncement = await callApi(
      '/dashboard/admin/announcements',
      adminToken,
      'POST',
      {
        title,
        message,
        type: 'info',
        target_role: 'all'
      }
    );

    const travelerFeed = await callApi('/messages/notifications/feed?limit=20&page=1', travelerToken);
    const guideFeed = await callApi('/messages/notifications/feed?limit=20&page=1', guideToken);
    const travelerUnreadAfter = await callApi('/messages/unread/count', travelerToken);
    const guideUnreadAfter = await callApi('/messages/unread/count', guideToken);

    const travelerHasAnnouncement = Array.isArray(travelerFeed.data?.notifications)
      && travelerFeed.data.notifications.some((n) => String(n.content || '').includes(title));

    const guideHasAnnouncement = Array.isArray(guideFeed.data?.notifications)
      && guideFeed.data.notifications.some((n) => String(n.content || '').includes(title));

    const result = {
      ok: createAnnouncement.ok && travelerFeed.ok && guideFeed.ok,
      announcement: {
        requestOk: createAnnouncement.ok,
        status: createAnnouncement.status,
        delivered_to: createAnnouncement.data?.delivered_to ?? null,
        title
      },
      traveler: {
        user: { id: traveler.id, name: traveler.name, email: traveler.email },
        unread: summarizeUnread('traveler', travelerUnreadBefore, travelerUnreadAfter),
        announcementInFeed: travelerHasAnnouncement,
        feedUnreadCount: travelerFeed.data?.unreadCount ?? null
      },
      guide: {
        user: { id: guide.id, name: guide.name, email: guide.email },
        unread: summarizeUnread('guide', guideUnreadBefore, guideUnreadAfter),
        announcementInFeed: guideHasAnnouncement,
        feedUnreadCount: guideFeed.data?.unreadCount ?? null
      }
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Announcement propagation verification failed:', error);
    process.exitCode = 1;
  }
}

main();
