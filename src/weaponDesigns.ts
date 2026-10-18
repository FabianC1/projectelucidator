/**
 * Normalized, sword-local silhouette guides for later code-glyph construction.
 * x runs across the blade; y runs from its tip (-1) to the pommel (+1).
 * These point paths are design data only and are not drawn by the renderer.
 */
export type DesignPoint = readonly [x: number, y: number]

export type WeaponPart = 'blade' | 'guard' | 'grip' | 'pommel' | 'gem' | 'emblem' | 'inlay'

export type SilhouettePath = {
  part: WeaponPart
  closed: boolean
  points: readonly DesignPoint[]
}

export type WeaponDesign = {
  id: 'elucidator' | 'lambent-light'
  displayName: string
  palette: {
    edge: string
    glyph: string
    accent: string
    guard: string
    grip: string
    gem: string
    inlay: string
  }
  /** Blade length/width and grip length in normalized sword-local units. */
  proportions: {
    bladeLength: number
    bladeWidth: number
    gripLength: number
  }
  /** Opposing crossed pose around a shared center in normalized screen space. */
  finalPose: {
    center: DesignPoint
    rotationRadians: number
    lengthOfShortScreenSide: number
  }
  silhouette: readonly SilhouettePath[]
}

export const WEAPON_DESIGNS: readonly WeaponDesign[] = [
  {
    id: 'elucidator',
    displayName: 'Elucidator',
    palette: {
      edge: '#8794a5',
      glyph: '#2a91ff',
      accent: '#86d8ff',
      guard: '#29476c',
      grip: '#111923',
      gem: '#4d86ed',
      inlay: '#8492a4',
    },
    proportions: {
      bladeLength: 1.34,
      bladeWidth: 0.23,
      gripLength: 0.44,
    },
    finalPose: {
      center: [0.5, 0.5],
      rotationRadians: Math.PI / 4,
      lengthOfShortScreenSide: 0.78,
    },
    silhouette: [
      {
        part: 'blade',
        closed: true,
        points: [
          [0, -1], [-0.045, -0.91], [-0.08, -0.45], [-0.1, 0.12],
          [-0.115, 0.27], [-0.09, 0.34], [0.09, 0.34], [0.115, 0.27],
          [0.1, 0.12], [0.08, -0.45], [0.045, -0.91], [0, -1],
        ],
      },
      {
        part: 'emblem',
        closed: false,
        points: [[-0.025, -0.83], [0.025, -0.83]],
      },
      {
        part: 'emblem',
        closed: false,
        points: [[0, -0.86], [0, -0.8]],
      },
      {
        part: 'guard',
        closed: true,
        points: [
          [-0.31, 0.19], [-0.29, 0.31], [-0.22, 0.39], [-0.15, 0.34],
          [-0.11, 0.29], [-0.08, 0.32], [0.08, 0.32], [0.12, 0.29],
          [0.2, 0.34], [0.29, 0.31], [0.34, 0.19], [0.27, 0.23],
          [0.16, 0.22], [0.08, 0.26], [-0.08, 0.26], [-0.16, 0.22],
          [-0.25, 0.23], [-0.31, 0.19],
        ],
      },
      {
        part: 'guard',
        closed: false,
        points: [
          [0.12, 0.29], [0.21, 0.22], [0.24, 0.12], [0.23, 0.29],
          [0.19, 0.45], [0.11, 0.61], [0.06, 0.67],
        ],
      },
      {
        part: 'grip',
        closed: true,
        points: [
          [-0.085, 0.32], [-0.065, 0.39], [-0.055, 0.78], [-0.075, 0.83],
          [0.075, 0.83], [0.055, 0.78], [0.065, 0.39], [0.085, 0.32],
        ],
      },
      {
        part: 'pommel',
        closed: true,
        points: [
          [-0.09, 0.81], [-0.1, 0.88], [-0.075, 0.96], [0, 1],
          [0.075, 0.96], [0.1, 0.88], [0.09, 0.81], [0, 0.84],
          [-0.09, 0.81],
        ],
      },
    ],
  },
  {
    id: 'lambent-light',
    displayName: 'Lambent Light',
    palette: {
      edge: '#dce8f5',
      glyph: '#f1f5f7',
      accent: '#f0b8d9',
      guard: '#72bcb0',
      grip: '#276e66',
      gem: '#356bd1',
      inlay: '#79bdb1',
    },
    proportions: {
      bladeLength: 1.34,
      bladeWidth: 0.12,
      gripLength: 0.5,
    },
    finalPose: {
      center: [0.5, 0.5],
      rotationRadians: -Math.PI / 4,
      lengthOfShortScreenSide: 0.76,
    },
    silhouette: [
      {
        part: 'blade',
        closed: true,
        points: [
          [0, -1], [-0.018, -0.93], [-0.037, -0.56], [-0.047, -0.14],
          [-0.055, 0.22], [-0.06, 0.34], [0.06, 0.34], [0.055, 0.22],
          [0.047, -0.14], [0.037, -0.56], [0.018, -0.93], [0, -1],
        ],
      },
      {
        part: 'inlay',
        closed: false,
        points: [[-0.015, 0.2], [-0.022, -0.08], [-0.018, -0.38], [-0.009, -0.73]],
      },
      {
        part: 'inlay',
        closed: false,
        points: [[0.015, 0.2], [0.022, -0.08], [0.018, -0.38], [0.009, -0.73]],
      },
      {
        part: 'guard',
        closed: true,
        points: [
          [-0.27, 0.21], [-0.25, 0.31], [-0.18, 0.38], [-0.11, 0.36],
          [-0.065, 0.3], [-0.04, 0.25], [0.04, 0.25], [0.065, 0.3],
          [0.11, 0.36], [0.18, 0.38], [0.25, 0.31], [0.27, 0.21],
          [0.22, 0.16], [0.12, 0.18], [0, 0.2], [-0.12, 0.18],
          [-0.22, 0.16], [-0.27, 0.21],
        ],
      },
      {
        part: 'guard',
        closed: false,
        points: [
          [-0.2, 0.28], [-0.22, 0.37], [-0.2, 0.46], [-0.12, 0.52],
          [0, 0.55], [0.12, 0.52], [0.2, 0.46], [0.22, 0.37], [0.2, 0.28],
        ],
      },
      {
        part: 'guard',
        closed: false,
        points: [
          [-0.13, 0.34], [-0.145, 0.41], [-0.1, 0.47], [-0.035, 0.5],
        ],
      },
      {
        part: 'guard',
        closed: false,
        points: [
          [0.13, 0.34], [0.145, 0.41], [0.1, 0.47], [0.035, 0.5],
        ],
      },
      {
        part: 'gem',
        closed: true,
        points: [
          [-0.24, 0.29], [-0.21, 0.33], [-0.24, 0.37], [-0.27, 0.33], [-0.24, 0.29],
        ],
      },
      {
        part: 'gem',
        closed: true,
        points: [
          [0.24, 0.29], [0.27, 0.33], [0.24, 0.37], [0.21, 0.33], [0.24, 0.29],
        ],
      },
      {
        part: 'grip',
        closed: true,
        points: [
          [-0.06, 0.29], [-0.045, 0.38], [-0.04, 0.82], [-0.055, 0.87],
          [0.055, 0.87], [0.04, 0.82], [0.045, 0.38], [0.06, 0.29],
        ],
      },
      {
        part: 'pommel',
        closed: true,
        points: [
          [-0.09, 0.85], [-0.105, 0.91], [-0.07, 0.96], [0, 0.99],
          [0.07, 0.96], [0.105, 0.91], [0.09, 0.85], [0, 0.88],
          [-0.09, 0.8],
        ],
      },
    ],
  },
]
