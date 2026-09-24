/**
 * بيانات منظّمة (JSON-LD) تُعرّف المكتب والمحامي لمحركات البحث
 * ونماذج الذكاء الاصطناعي. لا تظهر للزائر، وتُقرأ آلياً فقط.
 */

const BASE = 'https://kathirilaw.com'

export const ORGANIZATION_ID = `${BASE}/#organization`
export const ATTORNEY_ID = `${BASE}/#attorney`

const legalService = {
  '@type': 'LegalService',
  '@id': ORGANIZATION_ID,
  name: 'مكتب وليد الكثيري للمحاماة والاستشارات القانونية والتحكيم',
  alternateName: 'مكتب وليد الكثيري للمحاماة',
  url: BASE,
  logo: `${BASE}/logo.png`,
  image: `${BASE}/og-image.png`,
  telephone: '+967771774502',
  email: 'alkathirilawfirm@gmail.com',
  description:
    'مكتب محاماة واستشارات قانونية في محافظة إب، يمثّل موكليه من الأفراد والشركات أمام مختلف درجات المحاكم والنيابات، ويتابع قضايا المغتربين اليمنيين بموجب وكالات شرعية.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'شارع المحافظة، جوار صالة حدة، أمام جامع المحافظة',
    addressLocality: 'إب',
    addressRegion: 'محافظة إب',
    addressCountry: 'YE',
  },
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'محافظة إب' },
    { '@type': 'Country', name: 'اليمن' },
  ],
  availableLanguage: { '@type': 'Language', name: 'Arabic', alternateName: 'ar' },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '13:00',
      closes: '22:00',
    },
  ],
  knowsLanguage: 'ar',
  employee: { '@id': ATTORNEY_ID },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'مجالات الممارسة',
    itemListElement: [
      'القضاء الجنائي',
      'الشركات والقضايا التجارية',
      'الأحوال الشخصية والمواريث',
      'القضاء المدني',
      'القضاء الإداري',
      'التحكيم والوسائل البديلة لتسوية النزاعات',
    ].map((name) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name, serviceType: name },
    })),
  },
}

const attorney = {
  '@type': 'Attorney',
  '@id': ATTORNEY_ID,
  name: 'وليد الكثيري',
  jobTitle: 'محامٍ ومستشار قانوني',
  worksFor: { '@id': ORGANIZATION_ID },
  url: `${BASE}/about`,
  telephone: '+967771774502',
  email: 'alkathirilawfirm@gmail.com',
  knowsLanguage: 'ar',
  hasCredential: [
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: 'بكالوريوس الشريعة والقانون',
    },
    {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'license',
      name: 'مترافع أمام المحكمة العليا',
      validFrom: '2023',
    },
  ],
  memberOf: { '@type': 'Organization', name: 'اتحاد المحامين العرب' },
  sameAs: ['https://www.facebook.com/share/1FV4CanHeU/'],
  knowsAbout: [
    'القضاء الجنائي',
    'القضايا التجارية',
    'الأحوال الشخصية والمواريث',
    'القضاء المدني',
    'القضاء الإداري',
    'التحكيم',
  ],
}

const website = {
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: BASE,
  name: 'مكتب وليد الكثيري للمحاماة',
  inLanguage: 'ar',
  publisher: { '@id': ORGANIZATION_ID },
}

export default function StructuredData() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [legalService, attorney, website],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
