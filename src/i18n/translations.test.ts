import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FluentResource } from '@fluent/bundle'
import { LOCALES } from './context'

function loadLocale(locale: string): string {
  return readFileSync(resolve(process.cwd(), 'public', 'lang', `${locale}.ftl`), 'utf8')
}

function messageIds(source: string): string[] {
  return [...source.matchAll(/^([a-z0-9-]+)=/gm)].map((match) => match[1]).sort()
}

describe('translations', () => {
  const englishIds = messageIds(loadLocale('en-US'))

  it.each(LOCALES)('$name has every English message', ({ id }) => {
    const source = loadLocale(id)
    expect(() => new FluentResource(source)).not.toThrow()
    expect(messageIds(source)).toEqual(englishIds)
  })
})
