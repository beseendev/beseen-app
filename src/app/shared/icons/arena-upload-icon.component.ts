import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-arena-upload-icon',
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 3.8H14"
        [attr.stroke]="stroke"
        [attr.stroke-width]="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M9.2 5.2H14.8L14 7.4H10L9.2 5.2Z"
        [attr.stroke]="stroke"
        [attr.stroke-width]="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M10.2 7.4H13.8L18.2 17H5.8L10.2 7.4Z"
        [attr.stroke]="stroke"
        [attr.stroke-width]="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M12 10.9V13.5M10.7 12.2H13.3"
        [attr.stroke]="stroke"
        [attr.stroke-width]="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M7.1 19.2C8.2 18.5 9.9 18.1 12 18.1C14.1 18.1 15.8 18.5 16.9 19.2M7.1 19.2C8.2 19.9 9.9 20.3 12 20.3C14.1 20.3 15.8 19.9 16.9 19.2"
        [attr.stroke]="stroke"
        [attr.stroke-width]="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  standalone: true,
})
export class ArenaUploadIconComponent {
  @Input() size = 24;
  @Input() stroke = 'currentColor';
  @Input() strokeWidth = 2;
}
