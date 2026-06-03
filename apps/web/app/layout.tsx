import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';

const GA_ID = 'G-BM2W75RK7D';

const SITE_URL = 'https://emplorio.co.uk';
const TITLE = 'Emplorio · Apply Once. Send Everywhere.';
const DESCRIPTION =
  'Free Chrome extension that auto-fills job applications on Greenhouse, Lever, Workday, Ashby, LinkedIn, and Indeed. Generate tailored cover letters with AI, draft answers to open-ended questions, and track every application in one place.';
const SHORT_DESCRIPTION =
  'Auto-fill job applications, draft AI cover letters, and track every application. Free Chrome extension for Greenhouse, Lever, Workday, LinkedIn, and more.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: 'Emplorio · %s',
  },
  description: DESCRIPTION,
  applicationName: 'Emplorio',
  authors: [{ name: 'Emplorio' }],
  creator: 'Emplorio',
  publisher: 'Emplorio',
  keywords: [
    'job application autofill',
    'auto fill job applications',
    'AI cover letter generator',
    'Chrome extension for job applications',
    'Greenhouse autofill',
    'Lever autofill',
    'Workday autofill',
    'Ashby autofill',
    'LinkedIn easy apply',
    'Indeed autofill',
    'job application tracker',
    'apply to jobs faster',
    'ATS autofill',
    'cover letter AI',
    'job search tools',
    'Emplorio',
  ],
  category: 'productivity',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/emplorio-mark-dark.png',
    apple: '/emplorio-mark-dark.png',
  },
  openGraph: {
    title: TITLE,
    description: SHORT_DESCRIPTION,
    url: SITE_URL,
    siteName: 'Emplorio',
    type: 'website',
    locale: 'en_GB',
    images: [
      {
        url: '/emplorio-mark-dark.png',
        width: 512,
        height: 512,
        alt: 'Emplorio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: SHORT_DESCRIPTION,
    images: ['/emplorio-mark-dark.png'],
  },
};

const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/emplorio/gjljbmhpdijnjpphnhfbcfobldbhclfc';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Emplorio',
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Chrome',
      description: DESCRIPTION,
      url: SITE_URL,
      installUrl: CHROME_STORE_URL,
      downloadUrl: CHROME_STORE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GBP',
      },
      featureList: [
        'One-click autofill on Greenhouse, Lever, Workday, Ashby, LinkedIn, Indeed, Workable, SmartRecruiters, iCIMS',
        'AI-generated cover letters',
        'Drafts for open-ended application questions',
        'Follow-up email drafts',
        'Application history and response-rate insights',
        'Cross-device sync',
      ],
      image: `${SITE_URL}/emplorio-mark-dark.png`,
    },
    {
      '@type': 'Organization',
      name: 'Emplorio',
      url: SITE_URL,
      logo: `${SITE_URL}/emplorio-mark-dark.png`,
    },
    {
      '@type': 'WebSite',
      name: 'Emplorio',
      url: SITE_URL,
    },
  ],
};

const themeBootScript = `(function(){try{var t=localStorage.getItem('emplorio-theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        {children}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
      </body>
    </html>
  );
}
