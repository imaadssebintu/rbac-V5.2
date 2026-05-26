import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from './models/index.js';

dotenv.config();

async function main() {
  const guideUsers = await User.findAll({
    where: { is_active: true },
    attributes: ['id', 'name', 'email', 'is_certified'],
    limit: 50
  });

  const matching = guideUsers.filter((u) =>
    String(u.name || '').toLowerCase().includes('kakaire david') ||
    String(u.email || '').toLowerCase().includes('kakaire.david')
  );

  console.log(JSON.stringify({
    totalActiveUsersChecked: guideUsers.length,
    matchingGuides: matching.map((u) => ({ id: u.id, name: u.name, email: u.email, is_certified: u.is_certified }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
