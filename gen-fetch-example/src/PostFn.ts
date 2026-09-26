import { FetchBase } from './base.ts'

export class PostFn extends FetchBase {
  override toString(): string {
    const { path } = this.operation
    const { subject, generator } = this.settings.enrichments
    const baseUrl = subject?.baseUrl ?? generator?.baseUrl ?? ''

    return `async (body: unknown) => {
  const res = await fetch('${baseUrl}${path}', { method: 'POST', body: JSON.stringify(body) })

  return res.json()
}`
  }
}
