import { AthleteGender, Profile } from './profile.model';
import { Skill } from './skill.model';

export type DominantFoot = NonNullable<Profile['dominantFoot']>;
export type SkillMatchMode = 'ANY' | 'ALL';

export interface ScoutVideoFilters {
  gender?: AthleteGender | null;
  minAge?: number | null;
  maxAge?: number | null;
  dominantFoot?: DominantFoot | null;
  positions?: string[];
  estado?: string | null;
  cidade?: string | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  offensiveSkillIds?: string[];
  defensiveSkillIds?: string[];
  skillMatchMode?: SkillMatchMode;
}

export interface ScoutVideoFilterChip {
  id: string;
  label: string;
}

export interface ScoutVideoFilterValidation {
  valid: boolean;
  ageRange?: string;
  heightRange?: string;
}

export const DEFAULT_SCOUT_VIDEO_FILTERS: ScoutVideoFilters = {
  skillMatchMode: 'ANY',
  positions: [],
  offensiveSkillIds: [],
  defensiveSkillIds: []
};

const genderLabels: Record<AthleteGender, string> = {
  MALE: 'Masculino',
  FEMALE: 'Feminino'
};

const dominantFootLabels: Record<DominantFoot, string> = {
  RIGHT: 'Direito',
  LEFT: 'Esquerdo',
  BOTH: 'Ambidestro'
};

export function normalizeScoutVideoFilters(filters: ScoutVideoFilters | null | undefined): ScoutVideoFilters {
  return {
    ...DEFAULT_SCOUT_VIDEO_FILTERS,
    ...filters,
    cidade: normalizeText(filters?.cidade),
    estado: normalizeText(filters?.estado),
    positions: normalizeStringArray(filters?.positions),
    offensiveSkillIds: normalizeStringArray(filters?.offensiveSkillIds),
    defensiveSkillIds: normalizeStringArray(filters?.defensiveSkillIds),
    minAge: normalizeNumber(filters?.minAge),
    maxAge: normalizeNumber(filters?.maxAge),
    minHeight: normalizeNumber(filters?.minHeight),
    maxHeight: normalizeNumber(filters?.maxHeight),
    skillMatchMode: filters?.skillMatchMode ?? 'ANY'
  };
}

export function getScoutVideoFilterChips(filters: ScoutVideoFilters, skills: readonly Skill[] = []): ScoutVideoFilterChip[] {
  const normalized = normalizeScoutVideoFilters(filters);
  const chips: ScoutVideoFilterChip[] = [];

  if (normalized.gender) {
    chips.push({ id: 'gender', label: genderLabels[normalized.gender] });
  }

  if (normalized.minAge != null || normalized.maxAge != null) {
    chips.push({ id: 'age', label: formatRangeLabel(normalized.minAge, normalized.maxAge, 'anos') });
  }

  if (normalized.dominantFoot) {
    chips.push({ id: 'dominantFoot', label: dominantFootLabels[normalized.dominantFoot] });
  }

  for (const position of normalized.positions ?? []) {
    chips.push({ id: `position:${position}`, label: position });
  }

  if (normalized.minHeight != null || normalized.maxHeight != null) {
    chips.push({ id: 'height', label: formatRangeLabel(normalized.minHeight, normalized.maxHeight, 'm') });
  }

  if (normalized.estado) {
    chips.push({ id: 'estado', label: normalized.estado });
  }

  if (normalized.cidade) {
    chips.push({ id: 'cidade', label: normalized.cidade });
  }

  const skillMap = new Map(skills.map(skill => [skill.id, skill.name]));
  for (const skillId of [...(normalized.offensiveSkillIds ?? []), ...(normalized.defensiveSkillIds ?? [])]) {
    chips.push({ id: `skill:${skillId}`, label: skillMap.get(skillId) ?? skillId });
  }

  return chips;
}

export function countActiveScoutVideoFilters(filters: ScoutVideoFilters, skills: readonly Skill[] = []): number {
  return getScoutVideoFilterChips(filters, skills).length;
}

export function hasActiveScoutVideoFilters(filters: ScoutVideoFilters): boolean {
  return getScoutVideoFilterChips(filters).length > 0;
}

export function removeScoutVideoFilter(filters: ScoutVideoFilters, chipId: string): ScoutVideoFilters {
  const normalized = normalizeScoutVideoFilters(filters);

  if (chipId === 'gender') return { ...normalized, gender: null };
  if (chipId === 'age') return { ...normalized, minAge: null, maxAge: null };
  if (chipId === 'dominantFoot') return { ...normalized, dominantFoot: null };
  if (chipId === 'height') return { ...normalized, minHeight: null, maxHeight: null };
  if (chipId === 'estado') return { ...normalized, estado: null };
  if (chipId === 'cidade') return { ...normalized, cidade: null };

  if (chipId.startsWith('position:')) {
    const position = chipId.slice('position:'.length);
    return {
      ...normalized,
      positions: (normalized.positions ?? []).filter(value => value !== position)
    };
  }

  if (chipId.startsWith('skill:')) {
    const skillId = chipId.slice('skill:'.length);
    return {
      ...normalized,
      offensiveSkillIds: (normalized.offensiveSkillIds ?? []).filter(value => value !== skillId),
      defensiveSkillIds: (normalized.defensiveSkillIds ?? []).filter(value => value !== skillId)
    };
  }

  return normalized;
}

export function validateScoutVideoFilters(filters: ScoutVideoFilters): ScoutVideoFilterValidation {
  const normalized = normalizeScoutVideoFilters(filters);
  const validation: ScoutVideoFilterValidation = { valid: true };

  if (
    normalized.minAge != null &&
    normalized.maxAge != null &&
    normalized.minAge > normalized.maxAge
  ) {
    validation.valid = false;
    validation.ageRange = 'A idade mínima não pode ser maior que a máxima.';
  }

  if (
    normalized.minHeight != null &&
    normalized.maxHeight != null &&
    normalized.minHeight > normalized.maxHeight
  ) {
    validation.valid = false;
    validation.heightRange = 'A altura mínima não pode ser maior que a máxima.';
  }

  return validation;
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed || null;
}

function normalizeStringArray(values: string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map(value => value.trim()).filter(Boolean)));
}

function normalizeNumber(value: number | string | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatRangeLabel(min: number | null | undefined, max: number | null | undefined, suffix: string): string {
  if (min != null && max != null) return `${min}-${max} ${suffix}`;
  if (min != null) return `A partir de ${min} ${suffix}`;
  return `Até ${max} ${suffix}`;
}
