import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountConfirmationPage } from './account-confirmation.page';

describe('AccountConfirmationPage', () => {
  let component: AccountConfirmationPage;
  let fixture: ComponentFixture<AccountConfirmationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountConfirmationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
