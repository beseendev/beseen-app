import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, footballOutline, cameraOutline } from 'ionicons/icons';
import { Profile } from '../../models/profile.model';

const POSITION_ABBREVIATIONS: Record<string, string> = {
  'Goleiro': 'GOL',
  'Zagueiro': 'ZAG',
  'Lateral': 'LAT',
  'Volante': 'VOL',
  'Meia': 'MEI',
  'Atacante': 'ATA',
  'Ponta': 'PON'
};

const DOMINANT_FOOT_LABELS: Record<string, string> = {
  RIGHT: 'Destro',
  LEFT: 'Canhoto',
  BOTH: 'Ambidestro'
};

/**
 * Card estilo FIFA para exibir o perfil de um jogador (idade, posição, foto, nome e atributos ATA/DEF/HAB/FOR).
 * Aceita dados parciais para poder ser usado em telas que só têm acesso a um resumo do perfil (ex.: foto).
 */
@Component({
  selector: 'app-player-card',
  templateUrl: './player-card.component.html',
  styleUrls: ['./player-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner]
})
export class PlayerCardComponent implements OnChanges, OnDestroy {
  @Input() profile: Partial<Profile> | null | undefined = null;
  @Input() size: 'full' | 'small' | 'xsmall' = 'full';
  @Input() shortName = false;
  @Input() editable = false;
  @Input() uploading = false;

  @Output() photoClick = new EventEmitter<void>();
  /** Emitido ao clicar no card fora do modo de edição (ex.: abrir o mesmo menu de opções do "⋯"). */
  @Output() cardClick = new EventEmitter<void>();

  /** Controla o efeito de "levantar + brilho" ao clicar/tocar no card (equivalente ao :hover em telas sem mouse). */
  isPressed = false;

  private imageLoadFailed = false;
  private pressEffectTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    addIcons({ personCircleOutline, footballOutline, cameraOutline });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profile']) {
      this.imageLoadFailed = false;
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.pressEffectTimeout);
  }

  /**
   * Dispara o efeito completo assim que o card é clicado/tocado, em vez de depender de
   * segurar pressionado (o :active de CSS exigiria manter o dedo/mouse até a transição terminar).
   *
   * Fora do modo de edição, o clique também abre o menu de opções (mesma lógica do "⋯").
   * Durante a edição, o clique é reservado para trocar a foto (ver onPhotoClick), então não
   * emitimos cardClick para evitar os dois comportamentos disputando o mesmo toque.
   */
  onCardClick(): void {
    this.isPressed = true;
    clearTimeout(this.pressEffectTimeout);
    this.pressEffectTimeout = setTimeout(() => {
      this.isPressed = false;
    }, 700);

    if (!this.editable) {
      this.cardClick.emit();
    }
  }

  get photoUrl(): string | null {
    if (this.imageLoadFailed) {
      return null;
    }

    return this.profile?.urlProfileImage || this.profile?.urlPerfil || null;
  }

  onImageError(): void {
    this.imageLoadFailed = true;
  }

  get displayName(): string {
    const name = this.profile?.name ?? '';
    return this.shortName ? name.split(' ')[0] : name;
  }

  get dominantFootLabel(): string | null {
    const foot = this.profile?.dominantFoot;
    if (!foot) {
      return null;
    }

    return DOMINANT_FOOT_LABELS[foot] ?? foot;
  }

  get age(): number | null {
    if (!this.profile?.dateOfBirth) {
      return null;
    }

    const birthDate = new Date(this.profile.dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  get positionAbbreviation(): string | null {
    const position = this.profile?.positions?.[0];
    if (!position) {
      return null;
    }

    return POSITION_ABBREVIATIONS[position] ?? position.slice(0, 3).toUpperCase();
  }

  /** Média dos atributos (ATA/DEF/HAB/FOR), exibida como "OVR" no cantinho do card pequeno. */
  get overallRating(): number | null {
    const stats = [this.profile?.ata, this.profile?.def, this.profile?.hab, this.profile?.forca]
      .filter((value): value is number => typeof value === 'number');

    if (!stats.length) {
      return null;
    }

    return Math.round(stats.reduce((sum, value) => sum + value, 0) / stats.length);
  }

  onPhotoClick(): void {
    if (this.editable && !this.uploading) {
      this.photoClick.emit();
    }
  }
}
