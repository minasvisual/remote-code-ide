/** SSRF-shaped risk mitigation: only ever issue requests to http(s) URLs the user configured. */
export function assertHttpUrl(url: string): void {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`AI provider baseUrl must use http:// or https:// (got: ${url})`)
  }
}
