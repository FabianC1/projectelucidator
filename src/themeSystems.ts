export type ThemeId =
  | 'sao'
  | 'arise'
  | 'grimoire'
  | 'anti-magic'
  | 'domain-expansion'
  | 'limitless'
  | 'breathing-sun'
  | 'demon-mode'
  | 'dragon'

export type ThemeTransition = 'link-start' | 'arise' | 'anti-magic' | 'domain' | 'limitless' | 'breathing-sun' | 'demon' | 'system-scan' | 'sword-skill' | 'full-counter' | 'demon-mark'
export type ThemeSignature = 'aincrad' | 'demon-mark' | 'none'
export type ThemeFeatureDefinition = { name: string; aliases: string[]; effect: ThemeTransition; response: string[] }
export type ThemeActivationPresentation = {
  title: string
  subtitle: string
  accent: string
  secondary: string
}

export type ThemeSystemDefinition = {
  id: ThemeId
  label: string
  command: string
  aliases: string[]
  activationEffect?: ThemeTransition
  signature: ThemeSignature
  emblemAsset: string
  activationPresentation: ThemeActivationPresentation
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
    id: 'sao', label: 'SWORD ART ONLINE / AINCRAD', command: 'sao', aliases: ['sao', 'aincrad', 'sword art online', 'link start'],
    activationEffect: 'link-start', signature: 'aincrad',
    emblemAsset: './assets/emblems/link-start-crossed-swords.png',
    activationPresentation: { title: 'LINK START', subtitle: 'SWORD ART ONLINE SYSTEM', accent: '#00D8FF', secondary: '#EAFCFF' },
    activationResponse: ['ELUCIDATOR // AINCRAD SYSTEM', 'SYSTEM LINK ............ ESTABLISHED', 'HOLO-MENU .............. SYNCHRONIZED', 'SWORD SKILLS ........... READY', 'WORLD STATE ............ STABLE'],
    features: [
      { name: 'system scan', aliases: ['scan'], effect: 'system-scan', response: ['AINCRAD SYSTEM SCAN', 'PLAYER SIGNATURE ....... VERIFIED', 'WORLD LAYER ........... STABLE'] },
      { name: 'sword skill', aliases: ['sword skills', 'skill'], effect: 'sword-skill', response: ['SWORD SKILL // SONIC LEAP', 'TARGETING VECTOR ....... LOCKED', 'SKILL CONNECT .......... READY'] },
    ],
  },
  {
    id: 'arise', label: 'SOLO LEVELING / SHADOW MONARCH', command: 'arise', aliases: ['arise', 'solo leveling', 'shadow monarch'],
    activationEffect: 'arise', signature: 'none',
    emblemAsset: './assets/emblems/arise-shadow-monarch.png',
    activationPresentation: { title: 'ARISE', subtitle: 'SHADOW MONARCH SYSTEM', accent: '#9B5DE5', secondary: '#E0C2FF' },
    activationResponse: ['SHADOW PROTOCOL // ARISE', 'GATE SIGNATURE ......... DETECTED', 'SHADOW AUTHORITY ....... ONLINE', 'MONARCH SYSTEM ......... SYNCHRONIZED'],
  },
  {
    id: 'grimoire', label: 'BLACK CLOVER / GRIMOIRE', command: 'grimoire', aliases: ['grimoire', 'black clover'],
    signature: 'none',
    emblemAsset: './assets/emblems/grimoire.png',
    activationPresentation: { title: 'GRIMOIRE', subtitle: 'BLACK CLOVER SYSTEM', accent: '#EFA048', secondary: '#FFE0A5' },
    activationResponse: ['FIVE-LEAF GRIMOIRE DETECTED', 'CRIMSON SYSTEM .......... ONLINE', 'ANTI-MAGIC SEAL ........ STANDBY'],
  },
  {
    id: 'anti-magic', label: 'BLACK CLOVER / ANTI-MAGIC', command: 'anti-magic', aliases: ['anti magic', 'anti-magic'],
    activationEffect: 'anti-magic', signature: 'none',
    emblemAsset: './assets/emblems/anti-magic.png',
    activationPresentation: { title: 'ANTI-MAGIC', subtitle: 'FIVE-LEAF GRIMOIRE SYSTEM', accent: '#F43F5E', secondary: '#C4B5FD' },
    activationResponse: ['ANTI-MAGIC RELEASE', 'DARK ENERGY PULSE ....... DISCHARGED', 'WALLPAPER FIELD ......... STABLE'],
  },
  {
    id: 'domain-expansion', label: 'JUJUTSU KAISEN / DOMAIN EXPANSION', command: 'domain expansion', aliases: ['domain expansion', 'jujutsu kaisen'],
    activationEffect: 'domain', signature: 'none',
    emblemAsset: './assets/emblems/domain-expansion.png',
    activationPresentation: { title: 'DOMAIN EXPANSION', subtitle: 'JUJUTSU KAISEN SYSTEM', accent: '#9B7AFF', secondary: '#67C7FF' },
    activationResponse: ['CURSED ENERGY OUTPUT .... UNRESTRICTED', 'DOMAIN EXPANSION ........ DEPLOYED', 'SPATIAL FIELD ........... STABLE'],
  },
  {
    id: 'limitless', label: 'JUJUTSU KAISEN / LIMITLESS', command: 'limitless', aliases: ['limitless'],
    activationEffect: 'limitless', signature: 'none',
    emblemAsset: './assets/emblems/limitless.png',
    activationPresentation: { title: 'LIMITLESS', subtitle: 'JUJUTSU KAISEN SYSTEM', accent: '#60A5FA', secondary: '#C4B5FD' },
    activationResponse: ['LIMITLESS TECHNIQUE', 'SPATIAL DISTORTION ...... ACTIVE', 'INFINITY FIELD .......... STABLE'],
  },
  {
    id: 'breathing-sun', label: 'DEMON SLAYER / HINOKAMI KAGURA', command: 'hinokami kagura', aliases: ['hinokami kagura'],
    activationEffect: 'breathing-sun', signature: 'none',
    emblemAsset: './assets/emblems/hinokami-kagura.png',
    activationPresentation: { title: 'HINOKAMI KAGURA', subtitle: 'DEMON SLAYER SYSTEM', accent: '#F47B20', secondary: '#5DA8FF' },
    activationResponse: ['HINOKAMI KAGURA', 'FLAME BREATHING ......... IGNITED', 'SYSTEM COLOR ............ SUNSET RED'],
  },
  {
    id: 'demon-mode', label: 'SEVEN DEADLY SINS / DEMON MODE', command: 'demon mode', aliases: ['demon mode', 'seven deadly sins', 'meliodas'],
    activationEffect: 'demon', signature: 'demon-mark',
    emblemAsset: './assets/emblems/dragon-sin-of-wrath.png',
    activationPresentation: { title: 'DEMON MODE', subtitle: 'DRAGON SIN OF WRATH', accent: '#A879FF', secondary: '#E7C65A' },
    activationResponse: ['SEVEN DEADLY SINS // DEMON MODE', 'DEMON MARK ............. DETECTED', 'DARK ENERGY ............ AWAKENING', 'MAGIC POWER ............ UNRESTRICTED', 'MELIODAS PROTOCOL ...... ACTIVE'],
    features: [
      { name: 'demon mark surge', aliases: ['mark', 'mark surge'], effect: 'demon-mark', response: ['DEMON MARK // SURGE', 'DARK ENERGY ............ RELEASED', 'MAGIC OUTPUT ........... RISING'] },
      { name: 'full counter', aliases: ['counter'], effect: 'full-counter', response: ['FULL COUNTER', 'INCOMING FORCE ........ REFLECTED', 'RETURN WAVE ........... RELEASED'] },
    ],
  },
  {
    id: 'dragon', label: 'HTTYD / NIGHT FURY', command: 'httyd', aliases: ['httyd', 'night fury', 'toothless', 'dragon'],
    signature: 'none',
    emblemAsset: './assets/emblems/night-fury.png',
    activationPresentation: { title: 'HTTYD', subtitle: 'NIGHT FURY SYSTEM', accent: '#70E8FF', secondary: '#5265D8' },
    activationResponse: ['NIGHT FURY', 'ELUCIDATOR // TOOTHLESS PROTOCOL', 'PLASMA CORE ............ STANDBY', 'NIGHT FURY SIGNATURE ... DETECTED'],
  },
]

/** Identity for the persistent stealth mode, separate from the selected anime theme. */
export const STEALTH_PRESENTATION = {
  emblemAsset: './assets/emblems/stealth.png',
  title: 'STEALTH',
  subtitle: 'TACTICAL OPERATIONS SYSTEM',
  accent: '#D7DEE8',
  secondary: '#8993A3',
} satisfies ThemeActivationPresentation & { emblemAsset: string }

export function resolveThemeId(input: string): ThemeId | null {
  const value = input.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return THEME_SYSTEMS.find((system) => system.aliases.some((alias) => alias.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() === value))?.id ?? null
}
