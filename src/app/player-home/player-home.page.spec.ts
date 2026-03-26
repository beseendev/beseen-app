import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerHomePage } from './player-home.page';

describe('PlayerHomePage', () => {
  let component: PlayerHomePage;
  let fixture: ComponentFixture<PlayerHomePage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(PlayerHomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
