export const siteConfig = {
  name: 'Digi Web Tech',
  legalName: 'Digi Web Tech',
  baseUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://digiwebtech.co.in',
  defaultTitle: 'Digi Web Tech',
  defaultDescription:
    'Digi Web Tech is a top Digital marketing and Web Agency in Delhi NCR offering SEO, AIO, GEO, Google Ads, social media, website design, website development, and growth-focused digital services.',
  phone: '+91 98712 64699',
  email: 'info@digiwebtech.co.in',
  address: {
    streetAddress: '3rd Floor, A-303, Sector 5, Rajendra Nagar',
    addressLocality: 'Ghaziabad',
    addressRegion: 'Uttar Pradesh',
    postalCode: '201005',
    addressCountry: 'IN',
  },
};

export function absoluteUrl(pathname = '/') {
  return new URL(pathname, siteConfig.baseUrl).toString();
}
