import { Helmet } from 'react-helmet-async';

/**
 * SEO component — injects per-page meta tags, OG tags, Twitter cards,
 * canonical URL, and JSON-LD structured data.
 *
 * Usage:
 *   <SEO
 *     title="Page Title"           // will append " | Voya"
 *     description="Page description"
 *     image="https://..."          // OG image (defaults to Voya brand image)
 *     url="/some-path"             // canonical path
 *     type="website"               // OG type
 *     jsonLd={[...]}               // array of JSON-LD structured data objects
 *   />
 */

const BASE_URL = process.env.REACT_APP_SITE_URL || 'https://voya.app';
const DEFAULT_IMAGE = 'https://res.cloudinary.com/dyaedwcae/image/upload/q_auto/f_auto/v1777038685/app_nxb8oj.jpg';
const SITE_NAME = 'Voya';
const SITE_DESCRIPTION = 'Voya connects travelers with verified local guides, security escorts, and destination experts. Plan your route and move with confidence.';

const SEO = ({
  title,
  description = SITE_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url = '/',
  type = 'website',
  jsonLd = [],
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Verified Travel Companions`;
  const canonicalUrl = `${BASE_URL}${url}`;

  const defaultJsonLd = [
    // ── Organization ──
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
      logo: DEFAULT_IMAGE,
      description: SITE_DESCRIPTION,
      sameAs: [
        // Add social profiles here when available
      ],
    },
    // ── WebSite ──
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: BASE_URL,
      description: SITE_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/guides?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  const allJsonLd = [...defaultJsonLd, ...jsonLd];

  return (
    <Helmet>
      {/* ── Primary meta ── */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* ── Open Graph ── */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* ── Twitter Card ── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* ── JSON-LD structured data ── */}
      <script type="application/ld+json">
        {JSON.stringify(allJsonLd)}
      </script>
    </Helmet>
  );
};

export default SEO;
