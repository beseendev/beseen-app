import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateProfilePlayerPage } from './create-profile-player.page';

describe('CreateProfilePlayerPage', () => {
  let component: CreateProfilePlayerPage;
  let fixture: ComponentFixture<CreateProfilePlayerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateProfilePlayerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
