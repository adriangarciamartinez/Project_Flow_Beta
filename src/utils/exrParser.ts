/**
 * EXR Header Parser
 * 
 * Parses the binary EXR header to extract layer/channel/pass information.
 * Full pixel decoding of EXR requires native libs (e.g. OpenEXR), which
 * can't run in a browser renderer. We parse the ASCII header region,
 * extract channel names, infer pass types, and show metadata cleanly.
 * 
 * For actual pixel preview: we render a placeholder tile with pass info
 * and allow "Open in system viewer" for full quality EXR viewing.
 */

import { EXRMetadata, EXRPass } from '../types'

const EXR_MAGIC = 0x762f3101  // little-endian magic number

export function isEXRBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false
  const view = new DataView(buffer)
  return view.getUint32(0, true) === EXR_MAGIC
}

export function parseEXRHeader(buffer: ArrayBuffer): EXRMetadata {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // Verify magic
  if (view.getUint32(0, true) !== EXR_MAGIC) {
    throw new Error('Not a valid EXR file')
  }

  let offset = 8  // skip magic (4) + version (4)
  const attrs: Record<string, string> = {}
  let width = 0, height = 0, compression = 'unknown'

  // Parse attribute list
  while (offset < Math.min(buffer.byteLength, 65536)) {
    // Read null-terminated attribute name
    const nameStart = offset
    while (bytes[offset] !== 0 && offset < buffer.byteLength) offset++
    const name = String.fromCharCode(...bytes.slice(nameStart, offset))
    offset++ // skip null

    if (name === '') break  // end of header

    // Read null-terminated type name
    const typeStart = offset
    while (bytes[offset] !== 0 && offset < buffer.byteLength) offset++
    const type = String.fromCharCode(...bytes.slice(typeStart, offset))
    offset++ // skip null

    // Read 4-byte size
    if (offset + 4 > buffer.byteLength) break
    const size = view.getInt32(offset, true)
    offset += 4

    // Read value bytes
    const valueBytes = bytes.slice(offset, offset + size)
    offset += size

    // Decode known attributes
    if (type === 'box2i' && size === 16) {
      // dataWindow or displayWindow
      const xMin = new DataView(valueBytes.buffer, valueBytes.byteOffset, 16).getInt32(0, true)
      const yMin = new DataView(valueBytes.buffer, valueBytes.byteOffset, 16).getInt32(4, true)
      const xMax = new DataView(valueBytes.buffer, valueBytes.byteOffset, 16).getInt32(8, true)
      const yMax = new DataView(valueBytes.buffer, valueBytes.byteOffset, 16).getInt32(12, true)
      if (name === 'dataWindow') {
        width = xMax - xMin + 1
        height = yMax - yMin + 1
      }
      attrs[name] = `${xMin},${yMin} → ${xMax},${yMax}`
    } else if (type === 'compression' && size === 1) {
      const COMPRESSIONS = ['none', 'RLE', 'ZIPS', 'ZIP', 'PIZ', 'PXR24', 'B44', 'B44A', 'DWAA', 'DWAB']
      compression = COMPRESSIONS[valueBytes[0]] ?? `type_${valueBytes[0]}`
      attrs[name] = compression
    } else if (type === 'chlist') {
      // Channel list - key data!
      attrs['channels_raw'] = parseChannelList(valueBytes)
    } else if (type === 'string') {
      attrs[name] = String.fromCharCode(...valueBytes.filter(b => b >= 32 && b < 127))
    } else if (type === 'float' && size === 4) {
      attrs[name] = new DataView(valueBytes.buffer, valueBytes.byteOffset, 4).getFloat32(0, true).toFixed(4)
    } else {
      attrs[name] = `[${type}, ${size}b]`
    }
  }

  const passes = extractPasses(attrs['channels_raw'] || '')

  return { width, height, compression, passes, rawHeader: attrs }
}

function parseChannelList(bytes: Uint8Array): string {
  const channels: string[] = []
  let i = 0
  while (i < bytes.length) {
    // Read channel name (null-terminated)
    const start = i
    while (i < bytes.length && bytes[i] !== 0) i++
    if (i === start) break  // empty name = end
    const chName = String.fromCharCode(...bytes.slice(start, i))
    channels.push(chName)
    i++  // skip null
    i += 16  // skip: pixelType(4) + linear(1) + reserved(3) + xSampling(4) + ySampling(4)
  }
  return channels.join(',')
}

function extractPasses(channelStr: string): EXRPass[] {
  if (!channelStr) return []
  const channels = channelStr.split(',').filter(Boolean)

  // Group channels by layer prefix (e.g. "diffuse.R", "diffuse.G" → layer "diffuse")
  const layerMap = new Map<string, string[]>()

  for (const ch of channels) {
    const dotIdx = ch.lastIndexOf('.')
    if (dotIdx > 0) {
      const layer = ch.slice(0, dotIdx)
      const component = ch.slice(dotIdx + 1)
      if (!layerMap.has(layer)) layerMap.set(layer, [])
      layerMap.get(layer)!.push(component)
    } else {
      // Top-level channel (R, G, B, A, Z, etc.)
      if (!layerMap.has('beauty')) layerMap.set('beauty', [])
      layerMap.get('beauty')!.push(ch)
    }
  }

  const passes: EXRPass[] = []

  layerMap.forEach((components, layer) => {
    passes.push({
      name: layer,
      channel: components.join('+'),
      type: inferPassType(layer),
    })
  })

  return passes
}

function inferPassType(name: string): EXRPass['type'] {
  const lower = name.toLowerCase()
  if (lower === 'beauty' || lower === 'rgba' || lower === 'combined') return 'beauty'
  if (lower.includes('diffuse') || lower.includes('diff')) return 'diffuse'
  if (lower.includes('specular') || lower.includes('spec') || lower.includes('glossy')) return 'specular'
  if (lower.includes('emit') || lower.includes('emission') || lower.includes('glow')) return 'emission'
  if (lower.includes('reflect') || lower.includes('refl')) return 'reflection'
  if (lower.includes('refract') || lower.includes('trans')) return 'refraction'
  if (lower.includes('crypto')) return 'cryptomatte'
  if (lower.includes('normal') || lower.includes('n.') || lower === 'n') return 'normals'
  if (lower === 'z' || lower.includes('depth') || lower.includes('zdepth')) return 'depth'
  return 'custom'
}

// Pass color coding for UI display
export const PASS_COLORS: Record<EXRPass['type'], { bg: string; text: string; dot: string }> = {
  beauty:      { bg: 'rgba(255,255,255,0.06)', text: '#f0f0ee',   dot: '#a0a0a0' },
  diffuse:     { bg: 'rgba(180,120,60,0.1)',   text: '#c88050',   dot: '#c88050' },
  specular:    { bg: 'rgba(200,200,255,0.08)', text: '#9090c8',   dot: '#9090c8' },
  emission:    { bg: 'rgba(255,200,80,0.08)',  text: '#c8a040',   dot: '#c8a040' },
  reflection:  { bg: 'rgba(80,160,200,0.08)',  text: '#5090b8',   dot: '#5090b8' },
  refraction:  { bg: 'rgba(80,200,180,0.08)',  text: '#50b8a8',   dot: '#50b8a8' },
  cryptomatte: { bg: 'rgba(200,80,200,0.08)',  text: '#a050a0',   dot: '#a050a0' },
  normals:     { bg: 'rgba(80,200,80,0.08)',   text: '#50a050',   dot: '#50a050' },
  depth:       { bg: 'rgba(80,80,200,0.08)',   text: '#5050a0',   dot: '#5050a0' },
  custom:      { bg: 'rgba(255,255,255,0.04)', text: '#707070',   dot: '#707070' },
}

export const PASS_LABELS: Record<EXRPass['type'], string> = {
  beauty:      'Beauty',
  diffuse:     'Diffuse',
  specular:    'Specular',
  emission:    'Emission',
  reflection:  'Reflection',
  refraction:  'Refraction',
  cryptomatte: 'Cryptomatte',
  normals:     'Normals',
  depth:       'Depth / Z',
  custom:      'Custom AOV',
}
