import { useRef, useState, type UIEvent } from 'react'
import { BadgeEuro, Barcode, CalendarDays, Contact, CreditCard, FileKey2, FileText, Link, Mail, MapPin, MessageCircle, MessageSquare, Phone, Smartphone, Wifi } from 'lucide-react'
import { emptyQrForm, mailFrontAgentForm, MAILFRONT_AGENT_EMAIL, type QrFormState } from '../domain/form'
import type { QrType } from '../domain/qr'
import { useI18n } from '../i18n/context'
import { activeExampleIndex } from './carouselActiveIndex'

type ExampleType = QrType

interface QrExample {
  type: ExampleType
  name: string
  preview: string[]
  form: QrFormState
}

const exampleForm = (type: ExampleType, values: Partial<QrFormState>): QrFormState => ({
  ...emptyQrForm(),
  type,
  ...values,
})

const EXAMPLES: QrExample[] = [
  {
    type: 'EMAIL',
    name: 'Email the Agent',
    preview: ['MailFront', MAILFRONT_AGENT_EMAIL],
    form: mailFrontAgentForm(),
  },
  {
    type: 'URL',
    name: 'FORMATION website',
    preview: ['https://tryformation.com', 'Open a website directly.'],
    form: exampleForm('URL', { name: 'FORMATION website', url: 'https://tryformation.com' }),
  },
  {
    type: 'TEXT',
    name: 'Welcome note',
    preview: ['Welcome to Code Hoover 2.0', 'Share a short message without a link.'],
    form: exampleForm('TEXT', { name: 'Welcome note', text: 'Welcome to Code Hoover 2.0' }),
  },
  {
    type: 'WIFI',
    name: 'Guest Wi-Fi',
    preview: ['FORMATION Guest', 'WPA · welcome2026'],
    form: exampleForm('WIFI', { name: 'Guest Wi-Fi', ssid: 'FORMATION Guest', password: 'welcome2026', encryption: 'WPA' }),
  },
  {
    type: 'PHONE',
    name: 'Call the office',
    preview: ['+49 30 123456', 'Start a phone call with one scan.'],
    form: exampleForm('PHONE', { name: 'Call the office', phone: '+49 30 123456' }),
  },
  {
    type: 'SMS',
    name: 'Arrival message',
    preview: ['+49 170 1234567', 'I have arrived at the gate.'],
    form: exampleForm('SMS', { name: 'Arrival message', smsPhone: '+49 170 1234567', smsMessage: 'I have arrived at the gate.' }),
  },
  {
    type: 'LOCATION',
    name: 'Brandenburg Gate',
    preview: ['Brandenburg Gate, Berlin', '52.516275, 13.377704'],
    form: exampleForm('LOCATION', {
      name: 'Brandenburg Gate',
      locationLabel: 'Brandenburg Gate',
      locationQuery: 'Brandenburg Gate, Berlin',
      locationLatitude: '52.516275',
      locationLongitude: '13.377704',
    }),
  },
  {
    type: 'EVENT',
    name: 'Team meetup',
    preview: ['20 July 2026 · 09:00', 'Berlin office'],
    form: exampleForm('EVENT', {
      name: 'Team meetup',
      eventTitle: 'Team meetup',
      eventStart: '20260720T090000',
      eventEnd: '20260720T100000',
      eventLocation: 'Berlin office',
      eventDescription: 'Weekly project meetup',
    }),
  },
  {
    type: 'VCARD',
    name: 'Alex Example',
    preview: ['Product Designer · FORMATION', 'alex@example.com'],
    form: exampleForm('VCARD', {
      name: 'Alex Example vcard',
      vcardFullName: 'Alex Example',
      vcardFirstName: 'Alex',
      vcardLastName: 'Example',
      vcardTitle: 'Product Designer',
      vcardOrganization: 'FORMATION',
      vcardEmail: 'alex@example.com',
      vcardEmailType: 'INTERNET',
      vcardPhone: '+49 30 123456',
      vcardPhoneType: 'WORK',
      vcardUrl: 'https://tryformation.com',
    }),
  },
  {
    type: 'BARCODE',
    name: 'Loyalty card',
    preview: ['CODE 128 · MEMBER-2026-1042', 'Add a membership number manually.'],
    form: exampleForm('BARCODE', { name: 'Loyalty card', barcodeFormat: 'CODE_128', barcodeText: 'MEMBER-2026-1042' }),
  },
  {
    type: 'SEPA',
    name: 'Invoice payment',
    preview: ['Example GmbH · EUR 49.90', 'SEPA bank-transfer details.'],
    form: exampleForm('SEPA', {
      name: 'Invoice payment', sepaRecipient: 'Example GmbH', sepaIban: 'DE89370400440532013000',
      sepaBic: 'COBADEFFXXX', sepaAmount: '49.90', sepaReference: 'RF18539007547034',
    }),
  },
  {
    type: 'WHATSAPP',
    name: 'Message FORMATION',
    preview: ['+49 30 123456', 'Hi, I would like to know more.'],
    form: exampleForm('WHATSAPP', { name: 'Message FORMATION', whatsappPhone: '+49 30 123456', whatsappMessage: 'Hi, I would like to know more.' }),
  },
  {
    type: 'DEEPLINK',
    name: 'Open in the app',
    preview: ['formation://projects/demo', 'Open a specific screen or app.'],
    form: exampleForm('DEEPLINK', { name: 'Open in the app', deepLinkLabel: 'Demo project', deepLinkUrl: 'formation://projects/demo' }),
  },
  {
    type: 'PAYMENT',
    name: 'PayPal payment',
    preview: ['PayPal · EUR 25.00', 'Open a provider payment request.'],
    form: exampleForm('PAYMENT', { name: 'PayPal payment', paymentProvider: 'PayPal', paymentTarget: 'your-paypal-name', paymentAmount: '25.00', paymentCurrency: 'EUR', paymentNote: 'Demo payment' }),
  },
  {
    type: 'OTP',
    name: 'Authenticator setup',
    preview: ['Example · alice@example.com', 'Temporary and local-only.'],
    form: exampleForm('OTP', {
      name: 'Example authenticator', otpType: 'totp', otpIssuer: 'Example', otpAccount: 'alice@example.com',
      otpSecret: 'JBSWY3DPEHPK3PXP', otpAlgorithm: 'SHA1', otpDigits: '6', otpPeriod: '30',
    }),
  },
]

const ICONS = {
  URL: Link,
  TEXT: FileText,
  EMAIL: Mail,
  WIFI: Wifi,
  PHONE: Phone,
  SMS: MessageSquare,
  LOCATION: MapPin,
  EVENT: CalendarDays,
  VCARD: Contact,
  BARCODE: Barcode,
  SEPA: BadgeEuro,
  WHATSAPP: MessageCircle,
  DEEPLINK: Smartphone,
  PAYMENT: CreditCard,
  OTP: FileKey2,
} satisfies Record<ExampleType, typeof Link>

const translationId = (type: ExampleType) => `default-${type === 'VCARD' ? 'v-card' : type === 'LOCATION' ? 'maps' : type === 'DEEPLINK' ? 'app-link' : type === 'OTP' ? 'authenticator' : type.toLowerCase()}`

export function QrExamplesCarousel({ onTry }: { onTry: (form: QrFormState) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  const updateActiveExample = (event: UIEvent<HTMLDivElement>) => {
    const track = event.currentTarget
    const cards = Array.from(track.children) as HTMLElement[]
    setActiveIndex(activeExampleIndex(track.scrollLeft, track.clientWidth, track.scrollWidth, cards))
  }

  const showExample = (index: number) => {
    const card = trackRef.current?.children[index] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    setActiveIndex(index)
  }

  return (
    <section className="mt-2 flex min-w-0 flex-col gap-3" aria-labelledby="qr-examples-title">
      <div>
        <h2 id="qr-examples-title" className="m-0 text-base font-semibold">{t('default-examples')}</h2>
        <p className="m-0 mt-1 text-xs opacity-70">{t('default-examples-description')}</p>
      </div>
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
        role="region"
        aria-roledescription="carousel"
        aria-label={t('default-examples')}
        onScroll={updateActiveExample}
      >
        {EXAMPLES.map((example, index) => {
          const Icon = ICONS[example.type]
          const typeLabel = t(translationId(example.type))
          return (
            <article
              key={example.type}
              className="card min-w-[85%] snap-center gap-3 border border-base-300 bg-base-200 p-4 sm:min-w-80"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${EXAMPLES.length}: ${typeLabel}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-base-100"><Icon size={18} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide opacity-60">{typeLabel}</p>
                  <h3 className="m-0 truncate text-base font-semibold">{example.name}</h3>
                </div>
              </div>
              <div className="min-h-11">
                {example.preview.map((line) => <p key={line} className="m-0 truncate text-sm opacity-75">{line}</p>)}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-neutral self-start"
                aria-label={`${t('default-try-example')}: ${typeLabel}`}
                onClick={() => onTry(example.form)}
              >{t('default-try-example')}</button>
            </article>
          )
        })}
      </div>
      <div className="flex justify-center gap-2" aria-label={t('default-example-pages')}>
        {EXAMPLES.map((example, index) => {
          const typeLabel = t(translationId(example.type))
          return (
            <button
              key={example.type}
              type="button"
              className={`h-2.5 w-2.5 rounded-full border border-base-content transition-opacity ${activeIndex === index ? 'bg-base-content opacity-100' : 'bg-transparent opacity-35'}`}
              aria-label={t('default-show-example', { type: typeLabel })}
              aria-current={activeIndex === index ? 'true' : undefined}
              onClick={() => showExample(index)}
            />
          )
        })}
      </div>
    </section>
  )
}
