import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateProfilePage } from './create-profile.page';

describe('CreateProfilePage', () => {
  let component: CreateProfilePage;
  let fixture: ComponentFixture<CreateProfilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
