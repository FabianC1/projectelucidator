/**
 * Normalized sword-local profiles used to build both the 3D models and their
 * temporary code surfaces. x runs across the blade; y runs tip (-1) to pommel (+1).
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
  /** Normalized physical thickness used to build glyphs over beveled 3D surfaces. */
  depth: {
    blade: number
    guard: number
    grip: number
    pommel: number
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
      edge: '#a9c9e8',
      glyph: '#267dff',
      accent: '#8de8ff',
      guard: '#152b46',
      grip: '#080d16',
      gem: '#53ceff',
      inlay: '#84cfff',
    },
    proportions: {
      bladeLength: 1.34,
      bladeWidth: 0.23,
      gripLength: 0.44,
    },
    depth: { blade: 0.052, guard: 0.072, grip: 0.045, pommel: 0.06 },
    finalPose: {
      center: [0.5, 0.5],
      rotationRadians: Math.PI * 3 / 4,
      lengthOfShortScreenSide: 0.98,
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
          [-0.39, 0.16], [-0.32, 0.2], [-0.29, 0.39], [-0.2, 0.36],
          [-0.11, 0.29], [-0.075, 0.32], [0.075, 0.32], [0.11, 0.29],
          [0.2, 0.36], [0.29, 0.39], [0.32, 0.2], [0.39, 0.16],
          [0.29, 0.13], [0.18, 0.18], [0.08, 0.23], [-0.08, 0.23],
          [-0.18, 0.18], [-0.29, 0.13], [-0.39, 0.16],
        ],
      },
      {
        part: 'guard',
        closed: false,
        points: [
          [-0.24, 0.2], [-0.19, 0.27], [-0.1, 0.3], [0, 0.27],
          [0.1, 0.3], [0.19, 0.27], [0.24, 0.2],
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
      edge: '#f4f7ff',
      glyph: '#f4f7ff',
      accent: '#f1b8d7',
      guard: '#c5d0de',
      grip: '#34313b',
      gem: '#f0badb',
      inlay: '#d8e3f0',
    },
    proportions: {
      bladeLength: 1.34,
      bladeWidth: 0.12,
      gripLength: 0.5,
    },
    depth: { blade: 0.028, guard: 0.05, grip: 0.036, pommel: 0.045 },
    finalPose: {
      center: [0.5, 0.5],
      rotationRadians: -Math.PI * 3 / 4,
      lengthOfShortScreenSide: 0.98,
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
