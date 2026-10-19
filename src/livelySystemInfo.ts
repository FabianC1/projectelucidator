export type LivelySystemInfo = {
  cpuName: string | null
  cpuPercent: number | null
  gpuName: string | null
  gpu3dPercent: number | null
  networkName: string | null
  networkDownBytesPerSecond: number | null
  networkUpBytesPerSecond: number | null
  ramTotalMb: number | null
  ramAvailableMb: number | null
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalNumber(value: unknown, min = 0, max = Number.POSITIVE_INFINITY): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return null
  return value
}

export function parseLivelySystemInfo(input: unknown): LivelySystemInfo | null {
  let value: unknown = input
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const data = value as Record<string, unknown>
  const result: LivelySystemInfo = {
    cpuName: optionalText(data.NameCpu),
    cpuPercent: optionalNumber(data.CurrentCpu, 0, 100),
    gpuName: optionalText(data.NameGpu),
    gpu3dPercent: optionalNumber(data.CurrentGpu3D, 0, 100),
    networkName: optionalText(data.NameNetCard),
    networkDownBytesPerSecond: optionalNumber(data.CurrentNetDown),
    networkUpBytesPerSecond: optionalNumber(data.CurrentNetUp),
    ramTotalMb: optionalNumber(data.TotalRam),
    ramAvailableMb: optionalNumber(data.CurrentRamAvail),
  }

  if (result.ramTotalMb !== null && result.ramAvailableMb !== null && result.ramAvailableMb > result.ramTotalMb) {
    result.ramAvailableMb = null
  }

  return Object.values(result).some((field) => field !== null) ? result : null
}
