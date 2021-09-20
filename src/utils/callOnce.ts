export function callOnce<T>(fun: () => T): () => T {
  let result: { value: T } | null = null
  return () => {
    if (!result) {
      result = { value: fun() }
    }

    return result.value
  }
}