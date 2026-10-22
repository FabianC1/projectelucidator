export type ThemeId =
  | 'sao'
  | 'arise'
  | 'grimoire'
  | 'limitless'
  | 'breathing-sun'
  | 'demon-mode'
  | 'dragon'
  | 'tokyo-ghoul'

export type ThemeTransition = 'link-start' | 'arise' | 'grimoire' | 'limitless' | 'breathing-sun' | 'demon' | 'night-fury-stealth' | 'tokyo-ghoul'
export type ThemeSignature = 'aincrad' | 'demon-mark' | 'none'
export type ThemeActivationPresentation = {
  title: string
  subtitle: string
  accent: string
  secondary: string
}

export type ThemeSystemDefinition = {
  id: ThemeId
  label: string
  status: 'ready' | 'wip'
  command: string
  aliases: string[]
  activationEffect?: ThemeTransition
  signature: ThemeSignature
  emblemAsset: string
  activationPresentation: ThemeActivationPresentation
  activationResponse: string[]
  defaultWidgetLayout?: 'free' | 'left' | 'right' | 'top' | 'bottom'
}

/** Registry for command aliases, activation behavior, and theme identity UI. */
export const THEME_SYSTEMS: ThemeSystemDefinition[] = [
  {
    id: 'sao', label: 'SWORD ART ONLINE / AINCRAD', status: 'wip', command: 'sao', aliases: ['sao', 'aincrad', 'sword art online', 'link start'],
    activationEffect: 'link-start', signature: 'aincrad',
    emblemAsset: './assets/emblems/link-start-crossed-swords.png',
    activationPresentation: { title: 'LINK START', subtitle: 'SWORD ART ONLINE SYSTEM', accent: '#00D8FF', secondary: '#EAFCFF' },
    activationResponse: ['ELUCIDATOR // AINCRAD SYSTEM', 'SYSTEM LINK ............ ESTABLISHED', 'HOLO-MENU .............. SYNCHRONIZED', 'WORLD STATE ............ STABLE'],
  },
  {
    id: 'arise', label: 'SOLO LEVELING / SHADOW MONARCH', status: 'ready', command: 'arise', aliases: ['arise', 'solo leveling', 'shadow monarch'],
    activationEffect: 'arise', signature: 'none',
    emblemAsset: './assets/emblems/arise-shadow-monarch.png',
    activationPresentation: { title: 'ARISE', subtitle: 'SHADOW MONARCH SYSTEM', accent: '#9B5DE5', secondary: '#E0C2FF' },
    activationResponse: ['SHADOW PROTOCOL // ARISE', 'GATE SIGNATURE ......... DETECTED', 'SHADOW AUTHORITY ....... ONLINE', 'MONARCH SYSTEM ......... SYNCHRONIZED'],
  },
  {
    id: 'grimoire', label: 'BLACK CLOVER / GRIMOIRE', status: 'wip', command: 'grimoire', aliases: ['grimoire', 'black clover'],
    activationEffect: 'grimoire', signature: 'none',
    emblemAsset: './assets/emblems/grimoire.png',
    activationPresentation: { title: 'GRIMOIRE', subtitle: 'BLACK CLOVER SYSTEM', accent: '#EFA048', secondary: '#FFE0A5' },
    activationResponse: ['FIVE-LEAF GRIMOIRE DETECTED', 'GRIMOIRE INTERFACE ...... ONLINE', 'MAGIC SIGNATURE ......... RESONANT'],
  },
  {
    id: 'limitless', label: 'JUJUTSU KAISEN / LIMITLESS', status: 'ready', command: 'limitless', aliases: ['limitless'],
    activationEffect: 'limitless', signature: 'none',
    emblemAsset: './assets/emblems/limitless1.png',
    activationPresentation: { title: 'LIMITLESS', subtitle: 'JUJUTSU KAISEN SYSTEM', accent: '#60A5FA', secondary: '#C4B5FD' },
    activationResponse: ['LIMITLESS TECHNIQUE', 'SPATIAL DISTORTION ...... ACTIVE', 'INFINITY FIELD .......... STABLE'],
  },
  {
    id: 'breathing-sun', label: 'DEMON SLAYER / HINOKAMI KAGURA', status: 'ready', command: 'hinokami kagura', aliases: ['hinokami kagura'],
    activationEffect: 'breathing-sun', signature: 'none',
    emblemAsset: './assets/emblems/hinokami-kagura.png',
    activationPresentation: { title: 'HINOKAMI KAGURA', subtitle: 'DEMON SLAYER SYSTEM', accent: '#F47B20', secondary: '#5DA8FF' },
    activationResponse: ['HINOKAMI KAGURA', 'FLAME BREATHING ......... IGNITED', 'SYSTEM COLOR ............ SUNSET RED'],
  },
  {
    id: 'demon-mode', label: 'SEVEN DEADLY SINS / DEMON MODE', status: 'ready', command: 'demon mode', aliases: ['demon mode', 'seven deadly sins', 'meliodas'],
    activationEffect: 'demon', signature: 'demon-mark',
    emblemAsset: './assets/emblems/dragon-sin-of-wrath.png',
    activationPresentation: { title: 'DEMON MODE', subtitle: 'DRAGON SIN OF WRATH', accent: '#A879FF', secondary: '#E7C65A' },
    activationResponse: ['SEVEN DEADLY SINS // DEMON MODE', 'DEMON MARK ............. DETECTED', 'DARK ENERGY ............ AWAKENING', 'MAGIC POWER ............ UNRESTRICTED', 'MELIODAS PROTOCOL ...... ACTIVE'],
  },
  {
    id: 'dragon', label: 'HTTYD / NIGHT FURY', command: 'httyd', aliases: ['httyd', 'night fury', 'toothless', 'dragon'],
    status: 'wip', activationEffect: 'night-fury-stealth', signature: 'none',
    emblemAsset: './assets/emblems/night-fury.png',
    activationPresentation: { title: 'HTTYD', subtitle: 'NIGHT FURY SYSTEM', accent: '#70E8FF', secondary: '#5265D8' },
    activationResponse: ['NIGHT FURY', 'ELUCIDATOR // TOOTHLESS PROTOCOL', 'PLASMA CORE ............ STANDBY', 'NIGHT FURY SIGNATURE ... DETECTED'],
  },
  {
    id: 'tokyo-ghoul', label: 'TOKYO GHOUL / ONE-EYED KING', command: 'tokyo ghoul', aliases: ['tokyo ghoul', 'tokyo-ghoul', 'kaneki'],
    status: 'wip', activationEffect: 'tokyo-ghoul', signature: 'none',
    emblemAsset: './assets/emblems/tokyo-ghoul.png',
    activationPresentation: { title: 'TOKYO GHOUL', subtitle: 'ONE-EYED KING SYSTEM', accent: '#E53946', secondary: '#E8E8ED' },
    activationResponse: ['TOKYO GHOUL PROTOCOL', 'RC SIGNATURE ........... DETECTED', 'ONE-EYED KING .......... ONLINE', 'SYSTEM COLOR ........... CRIMSON / WHITE'],
  },
]

/** Identity for the persistent stealth mode, separate from the selected anime theme. */
export const STEALTH_PRESENTATION = {
  title: 'STEALTH',
  subtitle: 'TACTICAL OPERATIONS SYSTEM',
  accent: '#D7DEE8',
  secondary: '#8993A3',
} satisfies ThemeActivationPresentation

export function resolveThemeId(input: string): ThemeId | null {
  const value = input.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return THEME_SYSTEMS.find((system) => system.aliases.some((alias) => alias.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() === value))?.id ?? null
}
