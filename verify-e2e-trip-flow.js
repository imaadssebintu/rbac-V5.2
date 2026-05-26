import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User, Role, Task, Payment } from './models/index.js';

dotenv.config();

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const headersFor = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

const signToken = (userId, role) => jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1h' });

async function apiCall(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headersFor(token),
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { parseError: true };
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

async function ensureRole(name, description, permissions = []) {
  const [role] = await Role.findOrCreate({
    where: { name },
    defaults: { description, permissions, is_default: name === 'Walkee' }
  });
  return role;
}

async function ensureUser({ name, email, phone, roleId, isCertified = false }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    await existing.update({ role_id: roleId, is_active: true, is_certified: isCertified });
    return existing;
  }

  return User.create({
    name,
    email,
    phone,
    password: 'TestPass123!',
    role_id: roleId,
    is_active: true,
    is_verified: true,
    is_certified: isCertified,
    preferred_currency: 'USD'
  });
}

function printStep(name, result) {
  const summary = {
    step: name,
    ok: result.ok,
    status: result.status,
    success: result.data?.success,
    message: result.data?.message,
    taskStatus: result.data?.task?.status,
    paymentStatus: result.data?.payment?.status,
    txRef: result.data?.tx_ref || result.data?.payment?.transaction_id || null
  };
  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  try {
    const adminRole = await ensureRole('Admin', 'Administrator', ['*']);
    const walkerRole = await ensureRole('Walker', 'Service provider', ['task.execute']);
    const walkeeRole = await ensureRole('Walkee', 'Customer', ['task.create']);

    const admin = await ensureUser({
      name: 'Flow Admin',
      email: 'flow.admin@voya.test',
      phone: '+256700000001',
      roleId: adminRole.id
    });

    const guide = await ensureUser({
      name: 'Kakaire David',
      email: 'kakaire.david@voya.test',
      phone: '+256700000002',
      roleId: walkerRole.id,
      isCertified: true
    });

    const traveler = await ensureUser({
      name: 'Flow Traveler',
      email: 'flow.traveler@voya.test',
      phone: '+256700000003',
      roleId: walkeeRole.id
    });

    await Payment.destroy({ where: { user_id: traveler.id } });

    const task = await Task.create({
      description: 'E2E lifecycle verification trip',
      walkee_id: traveler.id,
      walker_id: guide.id,
      pickup_location: { lat: 0.3476, lng: 32.5825 },
      destination: { lat: 0.3136, lng: 32.5811 },
      estimated_distance: 1200,
      estimated_duration: 25,
      price: 15000,
      currency: 'USD',
      scheduled_time: new Date(Date.now() + 60 * 60 * 1000),
      status: 'pending'
    });

    const adminToken = signToken(admin.id, 'Admin');
    const travelerToken = signToken(traveler.id, 'Walkee');

    console.log('Created test task:', task.id);

    const approve = await apiCall(`/tasks/${task.id}/approve`, {
      method: 'POST',
      token: adminToken,
      body: { note: 'Automated approval test' }
    });
    printStep('approve', approve);

    const checkout = await apiCall('/payments/flutterwave/checkout', {
      method: 'POST',
      token: travelerToken,
      body: {
        user_id: traveler.id,
        amount: Number(task.price),
        currency: 'USD',
        email: traveler.email,
        full_name: traveler.name,
        payment_type: 'task_payment',
        task_id: task.id
      }
    });
    printStep('flutterwave_checkout', checkout);

    const txRef = checkout.data?.tx_ref || checkout.data?.payment?.transaction_id;

    const confirm = await apiCall('/payments/flutterwave/confirm', {
      method: 'POST',
      token: travelerToken,
      body: {
        tx_ref: txRef,
        status: 'successful',
        simulated: true
      }
    });
    printStep('flutterwave_confirm', confirm);

    const complete = await apiCall(`/tasks/${task.id}/complete`, {
      method: 'POST',
      token: travelerToken,
      body: {}
    });
    printStep('traveler_complete', complete);

    const feedback = await apiCall(`/tasks/${task.id}/feedback`, {
      method: 'POST',
      token: travelerToken,
      body: {
        rating: 5,
        feedback: 'Guide was punctual and professional',
        complaint: false
      }
    });
    printStep('feedback_submit', feedback);

    const finalTask = await Task.findByPk(task.id);
    console.log(JSON.stringify({
      final: {
        taskId: finalTask?.id,
        status: finalTask?.status,
        walkee_rating: finalTask?.walkee_rating
      }
    }, null, 2));
  } catch (error) {
    console.error('E2E flow failed:', error);
    process.exitCode = 1;
  }
}

main();
