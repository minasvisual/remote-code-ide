/**
 * Hand-rolled SSE reader: decodes a fetch Response body stream and yields each
 * `data: {...}` frame as parsed JSON. Avoids adding an HTTP/SSE client dependency.
 */
export async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      let sepIndex: number
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)

        for (const line of rawEvent.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice('data:'.length).trim()
          if (data === '[DONE]') return
          try {
            yield JSON.parse(data)
          } catch {
            // Malformed/partial frame — skip it rather than aborting the whole stream.
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
