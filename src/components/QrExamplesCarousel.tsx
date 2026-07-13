import { useRef, useState, type UIEvent } from 'react'
import { CalendarDays, Contact, FileText, Link, Mail, MapPin, MessageSquare, Phone, Wifi } from 'lucide-react'
import { emptyQrForm, mailFrontAgentForm, MAILFRONT_AGENT_EMAIL, type QrFormState } from '../domain/form'
import type { QrType } from '../domain/qr'
import { useI18n } from '../i18n/context'

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
} satisfies Record<ExampleType, typeof Link>

const translationId = (type: ExampleType) => `default-${type === 'VCARD' ? 'v-card' : type === 'LOCATION' ? 'maps' : type.toLowerCase()}`

export function QrExamplesCarousel({ onTry }: { onTry: (form: QrFormState) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  const updateActiveExample = (event: UIEvent<HTMLDivElement>) => {
    const track = event.currentTarget
    const center = track.scrollLeft + track.clientWidth / 2
    const cards = Array.from(track.children) as HTMLElement[]
    const nextIndex = cards.reduce((bestIndex, card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const bestCard = cards[bestIndex]
      const bestCenter = bestCard.offsetLeft + bestCard.offsetWidth / 2
      return Math.abs(cardCenter - center) < Math.abs(bestCenter - center) ? index : bestIndex
    }, 0)
    setActiveIndex(nextIndex)
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
