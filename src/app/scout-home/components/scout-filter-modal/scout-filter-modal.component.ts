import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, funnelOutline } from 'ionicons/icons';
import { SkillSelectorComponent } from '../../../components/skill-selector/skill-selector.component';
import { AthleteGender } from '../../../models/profile.model';
import {
  ScoutVideoFilters,
  ScoutVideoFilterValidation,
  validateScoutVideoFilters,
  normalizeScoutVideoFilters,
  DominantFoot
} from '../../../models/scout-search.model';
import { BR_STATE_OPTIONS, SCOUT_POSITION_OPTIONS } from '../../../models/scout-profile.model';
import { Skill } from '../../../models/skill.model';

@Component({
  selector: 'app-scout-filter-modal',
  templateUrl: './scout-filter-modal.component.html',
  styleUrls: ['./scout-filter-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SkillSelectorComponent]
})
export class ScoutFilterModalComponent {
  @Input() set filters(value: ScoutVideoFilters | null | undefined) {
    this.draftFilters = this.cloneFilters(value);
    this.validation = { valid: true };
  }

  @Input() skills: readonly Skill[] = [];

  draftFilters: ScoutVideoFilters = normalizeScoutVideoFilters(null);
  validation: ScoutVideoFilterValidation = { valid: true };

  readonly genderOptions: { label: string; value: AthleteGender }[] = [
    { label: 'Masculino', value: 'MALE' },
    { label: 'Feminino', value: 'FEMALE' }
  ];
  readonly footOptions: { label: string; value: DominantFoot }[] = [
    { label: 'Direito', value: 'RIGHT' },
    { label: 'Esquerdo', value: 'LEFT' },
    { label: 'Ambidestro', value: 'BOTH' }
  ];
  readonly positionOptions = SCOUT_POSITION_OPTIONS;
  readonly stateOptions = BR_STATE_OPTIONS;

  private readonly modalController = inject(ModalController);

  constructor() {
    addIcons({ closeOutline, funnelOutline });
  }

  get selectedSkillIds(): string[] {
    return [
      ...(this.draftFilters.offensiveSkillIds ?? []),
      ...(this.draftFilters.defensiveSkillIds ?? [])
    ];
  }

  onSelectedSkillIdsChange(skillIds: string[]): void {
    const offensiveSkillIds = skillIds.filter(skillId =>
      this.skills.some(skill => skill.id === skillId && skill.type === 'OFFENSIVE')
    );
    const defensiveSkillIds = skillIds.filter(skillId =>
      this.skills.some(skill => skill.id === skillId && skill.type === 'DEFENSIVE')
    );

    this.draftFilters = {
      ...this.draftFilters,
      offensiveSkillIds,
      defensiveSkillIds,
      skillMatchMode: 'ANY'
    };
  }

  onPositionSelectionChange(event: CustomEvent<{ value: string[] }>): void {
    const values = event.detail.value ?? [];

    this.draftFilters = {
      ...this.draftFilters,
      positions: values
    };
  }

  clearDraft(): void {
    this.draftFilters = normalizeScoutVideoFilters(null);
    this.validation = { valid: true };
  }

  apply(): void {
    const normalized = normalizeScoutVideoFilters(this.draftFilters);
    const validation = validateScoutVideoFilters(normalized);
    this.validation = validation;

    if (!validation.valid) {
      return;
    }

    this.modalController.dismiss(normalized, 'apply');
  }

  cancel(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  private cloneFilters(filters: ScoutVideoFilters | null | undefined): ScoutVideoFilters {
    const normalized = normalizeScoutVideoFilters(filters);
    return {
      ...normalized,
      positions: [...(normalized.positions ?? [])],
      offensiveSkillIds: [...(normalized.offensiveSkillIds ?? [])],
      defensiveSkillIds: [...(normalized.defensiveSkillIds ?? [])]
    };
  }
}
