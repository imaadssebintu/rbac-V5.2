import express from 'express';
import { Op } from 'sequelize';
import User from '../models/user.js';
import Role from '../models/role.js';

const router = express.Router();

/**
 * GET /api/sitemap/guides.xml
 *
 * Dynamically generates a sitemap listing all active guide profiles
 * so search engines can index individual /guides/:id pages.
 */
router.get('/guides.xml', async (req, res) => {
  try {
    const roleRecord = await Role.findOne({ where: { name: 'guide' } });
    if (!roleRecord) {
      return res.status(404).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }

    const guides = await User.findAll({
      where: { role_id: roleRecord.id, is_active: true },
      attributes: ['id', 'name', 'updatedAt', 'profile_image'],
      order: [['updatedAt', 'DESC']],
    });

    const baseUrl = process.env.SITE_URL || 'https://voya.app';
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    for (const guide of guides) {
      const lastmod = guide.updatedAt
        ? new Date(guide.updatedAt).toISOString().split('T')[0]
        : today;

      const imageTag = guide.profile_image
        ? `
  <image:image>
    <image:loc>${escapeXml(guide.profile_image)}</image:loc>
    <image:title>${escapeXml(guide.name || 'Guide Profile')}</image:title>
  </image:image>`
        : '';

      xml += `  <url>
    <loc>${baseUrl}/guides/${guide.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageTag}
  </url>
`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // cache for 1 hour
    res.send(xml);
  } catch (error) {
    console.error('Error generating guide sitemap:', error);
    res.status(500).type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
  }
});

/**
 * Escape XML special characters for safe inclusion in XML output.
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;
