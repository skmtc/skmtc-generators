import { FetchBase } from './base.ts'

export class FetchFn extends FetchBase {
  override toString(): string {
    const { path, method } = this.operation
    const { subject, generator } = this.settings.enrichments
    const baseUrl = subject?.baseUrl ?? generator?.baseUrl ?? ''

    return `async () => {
  const res = await fetch('${baseUrl}${path}', { method: '${method.toUpperCase()}' })

  return res.json()
}`
  }
}
