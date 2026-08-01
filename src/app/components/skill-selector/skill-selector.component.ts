import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Skill } from '../../models/skill.model';

@Component({
  selector: 'app-skill-selector',
  templateUrl: './skill-selector.component.html',
  styleUrls: ['./skill-selector.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SkillSelectorComponent {
  @Input() skills: readonly Skill[] = [];
  @Input() selectedSkillIds: readonly string[] = [];
  @Output() selectedSkillIdsChange = new EventEmitter<string[]>();

  get offensiveSkills(): readonly Skill[] {
    return this.skills.filter(skill => skill.type === 'OFFENSIVE');
  }

  get defensiveSkills(): readonly Skill[] {
    return this.skills.filter(skill => skill.type === 'DEFENSIVE');
  }

  isSelected(skillId: string): boolean {
    return this.selectedSkillIds.includes(skillId);
  }

  toggleSkill(skill: Skill): void {
    const selected = new Set(this.selectedSkillIds);

    if (selected.has(skill.id)) {
      selected.delete(skill.id);
    } else {
      selected.add(skill.id);
    }

    this.selectedSkillIdsChange.emit(Array.from(selected));
  }

  trackBySkillId(_: number, skill: Skill): string {
    return skill.id;
  }
}
