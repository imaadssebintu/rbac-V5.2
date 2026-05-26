import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User, Role, Task } from './models/index.js';

dotenv.config();

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const signToken = (id, role) => jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });

async function apiCall(path, token, method = 'GET', body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data };
}

async function getRoleUser(roleName) {
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) return null;
  return User.findOne({ where: { role_id: role.id, is_active: true } });
}

async function main() {
  const admin = await getRoleUser('Admin');
  const traveler = await getRoleUser('Walkee');
  const guide = await getRoleUser('Walker');

  if (!admin || !traveler || !guide) {
    console.log(JSON.stringify({ ok: false, reason: 'missing_users' }, null, 2));
    process.exitCode = 1;
    return;
  }

  const adminToken = signToken(admin.id, 'Admin');
  const travelerToken = signToken(traveler.id, 'Walkee');
  const guideToken = signToken(guide.id, 'Walker');

  const meVisit = await apiCall('/auth/me', travelerToken);
  const walkeeDashboardVisit = await apiCall('/dashboard/walkee', travelerToken);
  const walkerDashboardVisit = await apiCall('/dashboard/walker', guideToken);

  const logsRes = await apiCall('/dashboard/admin/logs', adminToken);
  const logs = logsRes.data?.logs || [];

  const hasTravelerVisitLog = logs.some((log) => {
    if (!String(log.action || '').includes('VISIT')) return false;
    return String(log.details || '').includes(String(traveler.id))
      || String(log.details || '').includes(String(traveler.email || ''));
  });

  const largeLogs = Array.from({ length: 650 }, (_, index) => ({
    timestamp: new Date(Date.now() - index * 1000).toISOString(),
    action: 'location_update',
    location: { lat: 0.3476, lng: 32.5825 },
    distance_traveled: 1
  }));

  const syntheticTask = await Task.create({
    description: 'Runtime max-packet fix verification task',
    walkee_id: traveler.id,
    walker_id: guide.id,
    pickup_location: { lat: 0.3476, lng: 32.5825 },
    destination: { lat: 0.3136, lng: 32.5811 },
    estimated_distance: 1200,
    estimated_duration: 20,
    price: 30,
    currency: 'USD',
    scheduled_time: new Date(Date.now() + 30 * 60 * 1000),
    status: 'assigned',
    session_logs: largeLogs
  });

  const completeRes = await apiCall(`/tasks/${syntheticTask.id}/complete`, travelerToken, 'POST', {});
  const completedTask = await Task.findByPk(syntheticTask.id);
  const cappedLength = Array.isArray(completedTask?.session_logs) ? completedTask.session_logs.length : 0;

  console.log(JSON.stringify({
    ok: meVisit.ok && walkeeDashboardVisit.ok && walkerDashboardVisit.ok && logsRes.ok && completeRes.ok,
    visits: {
      authMe: { ok: meVisit.ok, status: meVisit.status },
      walkeeDashboard: { ok: walkeeDashboardVisit.ok, status: walkeeDashboardVisit.status },
      walkerDashboard: { ok: walkerDashboardVisit.ok, status: walkerDashboardVisit.status },
      travelerVisitCapturedInAdminLogs: hasTravelerVisitLog
    },
    completion: {
      ok: completeRes.ok,
      status: completeRes.status,
      message: completeRes.data?.message,
      finalStatus: completedTask?.status,
      sessionLogsLengthAfterComplete: cappedLength,
      cappedTo200OrLess: cappedLength <= 200
    }
  }, null, 2));
}

main().catch((error) => {
  console.error('Runtime verification failed:', error);
  process.exitCode = 1;
});
