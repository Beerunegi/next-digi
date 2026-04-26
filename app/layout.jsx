import './globals.css';
import 'react-quill-new/dist/quill.snow.css';

import { siteConfig } from '@/lib/site-config';

export const metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: siteConfig.defaultTitle,
  description: siteConfig.defaultDescription,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/images/favicon.svg',
    shortcut: '/images/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="keywords"
          content="Digital Marketing Company Delhi NCR, Web Agency Delhi NCR, SEO Services Delhi NCR, AIO Optimization Delhi NCR, GEO Targeting, Google Ads Agency Delhi NCR, Website Development, Digi Web Tech"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/next-blog.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
