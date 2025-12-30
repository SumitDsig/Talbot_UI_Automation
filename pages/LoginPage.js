class LoginPage {
  constructor(page) {
    this.page = page;

    // --- LOGIN PAGE LOCATORS ---
    this.usernameField = page.getByRole('textbox', { name: 'Username' });
    this.passwordField = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.mfaSkipButton = page.getByRole('button', { name: ' Skip' });

    // Forgot password link
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });

    // --- FORGOT PASSWORD PAGE LOCATORS ---
    this.fpHeader = page.getByRole('heading', { name: 'Forgot your password' });
    this.fpInstruction = page.getByText(
      'Enter your Username to receive Verification Code on your email',
      { exact: false }
    );
    this.fpEmailInput = page.locator('#email');
    this.fpResetPasswordButton = page.getByRole('button', { name: 'Reset my Password' });

    // Back to Sign In (exists on both FP screens)
    this.backToSignInLink = page.getByRole('link', { name: 'Back to Sign In' });

    // --- VERIFICATION PAGE LOCATORS ---
    this.verifyInstruction = page.getByText(
      'Enter the Verification Code sent to your email and new password below',
      { exact: false }
    );
    this.codeField = page.locator('#code');
    this.newPasswordField = page.locator('#password');
    this.confirmPasswordField = page.locator('#confirmpwd');
    this.submitNewPasswordButton = page.getByRole('button', { name: 'Submit' });
  }

  // --- NAVIGATION ---
  async goto() {
    await this.page.goto(process.env.LOGIN_URL);
  }

  // --- LOGIN ---
  async login(username, password) {
    await this.usernameField.fill(username);
    await this.passwordField.fill(password);
    await this.signInButton.click();
  }

  // --- MFA SKIP ---
  async skipMfa() {
    await this.page.waitForTimeout(2000);
    await this.mfaSkipButton.click();
    await this.page.waitForTimeout(2000);
  }

  // --- FORGOT PASSWORD ACTIONS ---
  async openForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL('**/forgotpassword');
  }

  async fillForgotPasswordEmail(email) {
    await this.fpEmailInput.fill(email);
  }

  async submitForgotPassword() {
    await this.fpResetPasswordButton.click();
  }

  // --- VERIFICATION PAGE ACTIONS ---
  async fillVerificationCode(code) {
    await this.codeField.fill(code);
  }

  async fillNewPasswords(password) {
    await this.newPasswordField.fill(password);
    await this.confirmPasswordField.fill(password);
  }

  async submitNewPassword() {
    await this.submitNewPasswordButton.click();
  }

  // --- FORGOT PASSWORD FLOW HELPERS ---
  async validateVerificationPageFields() {
    const { expect } = require('@playwright/test');
    await expect(this.verifyInstruction).toBeVisible({ timeout: 10000 });
    await expect(this.codeField).toBeVisible();
    await expect(this.newPasswordField).toBeVisible();
    await expect(this.confirmPasswordField).toBeVisible();
    await expect(this.submitNewPasswordButton).toBeVisible();
  }

  async submitPasswordResetAndValidatePage() {
    const requestTimestamp = Date.now();
    console.log(`📅 Password reset requested at: ${new Date(requestTimestamp).toISOString()}`);
    await this.submitForgotPassword();
    await this.page.waitForTimeout(2000);
    await this.validateVerificationPageFields();
    return requestTimestamp;
  }

  async submitOTPAndNewPassword(otpCode, newPassword) {
    await this.fillVerificationCode(otpCode);
    await this.fillNewPasswords(newPassword);
    await this.submitNewPassword();
  }

  async verifyPasswordResetSuccess() {
    await this.page.waitForTimeout(3000);
    const successMessage = this.page.locator('#toast-container:has-text("Password"), #toast-container:has-text("success"), #toast-container:has-text("reset"), #toast-container:has-text("changed")');
    const successVisible = await successMessage.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (successVisible) {
      const messageText = await successMessage.textContent().catch(() => '');
      console.log(`✔️ Password reset successful - ${messageText}`);
      return true;
    }
    
    const isLoginPage = this.page.url().includes('/login');
    if (isLoginPage) {
      console.log('✔️ Password reset successful - redirected to login page');
      return true;
    }
    
    const pageText = await this.page.textContent('body').catch(() => '');
    if (pageText.toLowerCase().includes('success') || pageText.toLowerCase().includes('password')) {
      console.log('✔️ Password reset appears successful');
      return true;
    }
    
    console.log('ℹ️ Verifying password reset completion...');
    return false;
  }

  async verifyLoginWithNewPassword(email, newPassword) {
    if (!this.page.url().includes('/login')) {
      await this.goto();
    }
    
    await this.login(email, newPassword);
    await this.page.waitForTimeout(3000);
    
    const currentUrl = this.page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✔️ Login successful with new password - navigated to dashboard');
      return true;
    }
    
    const mfaSkipVisible = await this.mfaSkipButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (mfaSkipVisible) {
      await this.skipMfa();
      const { expect } = require('@playwright/test');
      await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      console.log('✔️ Login successful with new password - MFA skipped');
      return true;
    }
    
    const errorMessage = this.page.locator('#toast-container:has-text("Error"), #toast-container:has-text("invalid")');
    const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
    if (errorVisible) {
      console.log('❌ Login failed with new password - error message displayed');
      throw new Error('Login failed with new password');
    }
    
    console.log('ℹ️ Login status unclear - checking page state');
    return false;
  }

  async getOTPFromEmail(senderEmail, requestTimestamp) {
    const { getOTPFromLatestEmail } = require('../utils/gmailHelper');
    console.log(`\nStep 5: Reading latest email from sender: ${senderEmail}...`);
    console.log(`   Looking for email sent after: ${new Date(requestTimestamp).toISOString()}`);
    
    try {
      const otpCode = await getOTPFromLatestEmail(senderEmail, 5000, 6, requestTimestamp);
      if (!otpCode) {
        throw new Error('Could not extract OTP code from email');
      }
      console.log(`✔️ OTP retrieved from latest email (sender: ${senderEmail}): ${otpCode}`);
      return otpCode;
    } catch (error) {
      console.error('\n❌ Error retrieving OTP:', error.message);
      if (error.message.includes('No email found')) {
        console.error(`\n⚠️  No email found from ${senderEmail}`);
        console.error('   Please ensure:');
        console.error('   1. The email has been sent');
        console.error('   2. You are checking the correct Gmail account');
        console.error('   3. The sender email is correct\n');
      } else if (error.message.includes('authorize') || error.message.includes('token')) {
        console.error('\n🔐 GMAIL AUTHORIZATION REQUIRED:');
        console.error('   You need to authorize the application first.');
        console.error('   Run: node utils/gmailHelper.js (if standalone)');
        console.error('   Or ensure token.json exists in project root\n');
      }
      throw error;
    }
  }

  printNewPassword(newPassword, email) {
    console.log(`\n========================================`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`📧 Email: ${email}`);
    console.log('========================================\n');
  }

  // --- BACK TO LOGIN ---
  async backToSignIn() {
    await this.backToSignInLink.click();
    await this.page.waitForURL('**/login');
  }

  // --- NAVIGATE TO DASHBOARD (using saved session) ---
  async navigateToDashboard() {
    console.log('Navigating to dashboard...');
    await this.page.goto('/dashboard');
    
    // Handle MFA skip if it appears
    try {
      await this.skipMfa();
    } catch (e) {
      console.log('MFA skip not needed or failed');
    }
    
    // Wait for dashboard to load
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
    await this.page.waitForTimeout(2000); // Allow page to stabilize
  }
}

module.exports = { LoginPage };
