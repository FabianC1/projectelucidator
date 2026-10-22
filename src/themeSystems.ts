export type ThemeId =
  | 'sao'
  | 'arise'
  | 'grimoire'
  | 'anti-magic'
  | 'domain-expansion'
  | 'limitless'
  | 'breathing-water'
  | 'breathing-sun'
  | 'demon-mode'
  | 'dragon'

export type ThemeTransition = 'link-start' | 'arise' | 'anti-magic' | 'domain' | 'limitless' | 'breathing-water' | 'breathing-sun' | 'demon' | 'plasma-charge' | 'system-scan' | 'sword-skill' | 'full-counter' | 'demon-mark'
export type ThemeSignature = 'aincrad' | 'demon-mark' | 'none'
export type ThemeFeatureDefinition = { name: string; aliases: string[]; effect: ThemeTransition; response: string[] }

export type ThemeSystemDefinition = {
  id: ThemeId
  label: string
  command: string
  aliases: string[]
  activationEffect?: ThemeTransition
  signature: ThemeSignature
  activationResponse: string[]
  defaultWidgetLayout?: 'free' | 'left' | 'right' | 'top' | 'bottom'
  features?: ThemeFeatureDefinition[]
  /** Optional local sound cue for a future user gesture based audio adapter. */
  activationSound?: string
  featureCommands?: string[]
}

/** Registry for command aliases, activation behavior, and theme identity UI. */
export const THEME_SYSTEMS: ThemeSystemDefinition[] = [
  {
    id: 'sao', label: 'SWORD ART ONLINE / AINCRAD', command: 'link start', aliases: ['sao', 'aincrad', 'sword art online', 'link start'],
    activationEffect: 'link-start', signature: 'aincrad',
    activationResponse: ['ELUCIDATOR // AINCRAD SYSTEM', 'SYSTEM LINK ............ ESTABLISHED', 'HOLO-MENU .............. SYNCHRONIZED', 'SWORD SKILLS ........... READY', 'WORLD STATE ............ STABLE'],
    features: [
      { name: 'system scan', aliases: ['scan'], effect: 'system-scan', response: ['AINCRAD SYSTEM SCAN', 'PLAYER SIGNATURE ....... VERIFIED', 'WORLD LAYER ........... STABLE'] },
      { name: 'sword skill', aliases: ['sword skills', 'skill'], effect: 'sword-skill', response: ['SWORD SKILL // SONIC LEAP', 'TARGETING VECTOR ....... LOCKED', 'SKILL CONNECT .......... READY'] },
    ],
  },
  {
    id: 'arise', label: 'SOLO LEVELING / SHADOW MONARCH', command: 'arise', aliases: ['arise', 'solo leveling', 'shadow monarch'],
    activationEffect: 'arise', signature: 'none',
    activationResponse: ['SHADOW PROTOCOL // ARISE', 'GATE SIGNATURE ......... DETECTED', 'SHADOW AUTHORITY ....... ONLINE', 'MONARCH SYSTEM ......... SYNCHRONIZED'],
  },
  {
    id: 'grimoire', label: 'BLACK CLOVER / GRIMOIRE', command: 'grimoire', aliases: ['grimoire', 'black clover'],
    signature: 'none',
    activationResponse: ['FIVE-LEAF GRIMOIRE DETECTED', 'CRIMSON SYSTEM .......... ONLINE', 'ANTI-MAGIC SEAL ........ STANDBY'],
  },
  {
    id: 'anti-magic', label: 'BLACK CLOVER / ANTI-MAGIC', command: 'anti-magic', aliases: ['anti magic', 'anti-magic'],
    activationEffect: 'anti-magic', signature: 'none',
    activationResponse: ['ANTI-MAGIC RELEASE', 'DARK ENERGY PULSE ....... DISCHARGED', 'WALLPAPER FIELD ......... STABLE'],
  },
  {
    id: 'domain-expansion', label: 'JUJUTSU KAISEN / DOMAIN EXPANSION', command: 'domain expansion', aliases: ['domain expansion', 'jujutsu kaisen'],
    activationEffect: 'domain', signature: 'none',
    activationResponse: ['CURSED ENERGY OUTPUT .... UNRESTRICTED', 'DOMAIN EXPANSION ........ DEPLOYED', 'SPATIAL FIELD ........... STABLE'],
  },
  {
    id: 'limitless', label: 'JUJUTSU KAISEN / LIMITLESS', command: 'limitless', aliases: ['limitless'],
    activationEffect: 'limitless', signature: 'none',
    activationResponse: ['LIMITLESS TECHNIQUE', 'SPATIAL DISTORTION ...... ACTIVE', 'INFINITY FIELD .......... STABLE'],
  },
  {
    id: 'breathing-water', label: 'DEMON SLAYER / WATER BREATHING', command: 'breathing water', aliases: ['breathing water', 'water breathing'],
    activationEffect: 'breathing-water', signature: 'none',
    activationResponse: ['WATER BREATHING', 'FLOW STATE .............. SYNCHRONIZED', 'SYSTEM COLOR ............ DEEP WATER BLUE'],
  },
  {
    id: 'breathing-sun', label: 'DEMON SLAYER / HINOKAMI KAGURA', command: 'hinokami kagura', aliases: ['hinokami kagura', 'breathing sun', 'sun breathing'],
    activationEffect: 'breathing-sun', signature: 'none',
    activationResponse: ['HINOKAMI KAGURA', 'FLAME BREATHING ......... IGNITED', 'SYSTEM COLOR ............ SUNSET RED'],
  },
  {
    id: 'demon-mode', label: 'SEVEN DEADLY SINS / DEMON MODE', command: 'demon mode', aliases: ['demon mode', 'seven deadly sins', 'meliodas'],
    activationEffect: 'demon', signature: 'demon-mark',
    activationResponse: ['SEVEN DEADLY SINS // DEMON MODE', 'DEMON MARK ............. DETECTED', 'DARK ENERGY ............ AWAKENING', 'MAGIC POWER ............ UNRESTRICTED', 'MELIODAS PROTOCOL ...... ACTIVE'],
    features: [
      { name: 'demon mark surge', aliases: ['mark', 'mark surge'], effect: 'demon-mark', response: ['DEMON MARK // SURGE', 'DARK ENERGY ............ RELEASED', 'MAGIC OUTPUT ........... RISING'] },
      { name: 'full counter', aliases: ['counter'], effect: 'full-counter', response: ['FULL COUNTER', 'INCOMING FORCE ........ REFLECTED', 'RETURN WAVE ........... RELEASED'] },
    ],
  },
  {
    id: 'dragon', label: 'HTTYD / NIGHT FURY', command: 'httyd', aliases: ['httyd', 'night fury', 'toothless', 'dragon'],
    signature: 'none',
    activationResponse: ['NIGHT FURY', 'ELUCIDATOR // TOOTHLESS PROTOCOL', 'PLASMA CORE ............ STANDBY', 'NIGHT FURY SIGNATURE ... DETECTED'],
  },
]

export function resolveThemeId(input: string): ThemeId | null {
  const value = input.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return THEME_SYSTEMS.find((system) => system.aliases.some((alias) => alias.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() === value))?.id ?? null
}
