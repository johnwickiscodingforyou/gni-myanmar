const GNI_API = process.env.NEXT_PUBLIC_GNI_API_URL || 'https://gni-autonomous.vercel.app'
const GNI_KEY = process.env.NEXT_PUBLIC_GNI_API_KEY || ''

export async function fetchGNI(path: string) {
  const res = await fetch(`${GNI_API}${path}`, {
    headers: { 'X-GNI-Key': GNI_KEY, 'X-Client': 'gni-myanmar-v1' },
    next: { revalidate: 300 }
  })
  if (!res.ok) throw new Error(`GNI API error: ${res.status}`)
  return res.json()
}
