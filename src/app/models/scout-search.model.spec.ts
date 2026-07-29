import {
  countActiveScoutVideoFilters,
  getScoutVideoFilterChips,
  removeScoutVideoFilter,
  validateScoutVideoFilters
} from './scout-search.model';
import { SKILL_CATALOG } from './skill.model';

describe('Scout video filters helpers', () => {
  it('counts range filters as one chip each', () => {
    const count = countActiveScoutVideoFilters({
      gender: 'FEMALE',
      minAge: 16,
      maxAge: 20,
      minHeight: 1.7,
      maxHeight: 1.85
    }, SKILL_CATALOG);

    expect(count).toBe(3);
  });

  it('removes individual position and skill chips', () => {
    const filters = {
      positions: ['Atacante', 'Meia'],
      offensiveSkillIds: ['DRIBBLING', 'FINISHING'],
      defensiveSkillIds: ['PRESSING']
    };

    const withoutPosition = removeScoutVideoFilter(filters, 'position:Meia');
    const withoutSkill = removeScoutVideoFilter(withoutPosition, 'skill:DRIBBLING');

    expect(withoutSkill.positions).toEqual(['Atacante']);
    expect(withoutSkill.offensiveSkillIds).toEqual(['FINISHING']);
    expect(withoutSkill.defensiveSkillIds).toEqual(['PRESSING']);
  });

  it('validates min and max ranges', () => {
    const validation = validateScoutVideoFilters({
      minAge: 21,
      maxAge: 18,
      minHeight: 1.9,
      maxHeight: 1.75
    });

    expect(validation.valid).toBeFalse();
    expect(validation.ageRange).toBeTruthy();
    expect(validation.heightRange).toBeTruthy();
  });

  it('builds skill chips using presentation labels', () => {
    const chips = getScoutVideoFilterChips({
      offensiveSkillIds: ['DRIBBLING']
    }, SKILL_CATALOG);

    expect(chips).toEqual([{ id: 'skill:DRIBBLING', label: 'Drible' }]);
  });
});
