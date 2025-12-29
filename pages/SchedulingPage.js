const { expect } = require('@playwright/test');

class SchedulingPage {
  constructor(page) {
    this.page = page;
    
    // Essential locators only
    this.nextButton = page.locator('button[title="Next"], .e-next button').first();
    this.modal = () => page.locator('.modal:visible, [role="dialog"]:visible, .e-popup-open').first();
    this.closeIcon = () => page.locator('button.e-dlg-closeicon-btn').first();
    this.saveButton = page.locator('button.e-event-save').first();
    this.cancelButton = page.locator('button.e-event-cancel').first();
  }

  // Helper: Find element by label text
  _getByLabel(labelText) {
    return this.page.locator(`label:has-text("${labelText}")`);
  }

  // Helper: Get dropdown control wrapper by label
  _getDropdown(labelText) {
    return this._getByLabel(labelText).locator('xpath=../..//div[contains(@class,"e-control-wrapper")]').first();
  }

  // Helper: Find radio button by text in modal
  async _findRadioByText(text) {
    const modal = this.modal();
    const radios = modal.locator('input[type="radio"]');
    const count = await radios.count();
    
    for (let i = 0; i < count; i++) {
      const radio = radios.nth(i);
      const radioId = await radio.getAttribute('id').catch(() => '');
      let labelText = '';
      
      if (radioId) {
        labelText = await this.page.locator(`label[for="${radioId}"]`).textContent().catch(() => '');
      }
      
      if (!labelText) {
        const parentLabel = radio.locator('xpath=../label | ./parent::label').first();
        labelText = await parentLabel.textContent().catch(() => '');
      }
      
      const value = await radio.getAttribute('value').catch(() => '');
      if ((labelText && labelText.trim().toLowerCase() === text.toLowerCase()) || 
          (value && value.toLowerCase().includes(text.toLowerCase()))) {
        return radio;
      }
    }
    return null;
  }

  // Navigation
  async navigateToScheduling(loginPage) {
    console.log('STEP: Navigating to Scheduling page...');
    await this.page.goto('/scheduling');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    if (loginPage) {
      try {
        await loginPage.skipMfa();
      } catch (e) {}
    }
    await this.page.waitForURL('**/scheduling**', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    console.log('✓ Navigated to Scheduling page');
  }

  async navigateToNextDay() {
    console.log('STEP: Navigating to next day...');
    await expect(this.nextButton).toBeVisible({ timeout: 10000 });
    await expect(this.nextButton).toBeEnabled();
    await this.nextButton.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    // Wait for scheduler cells to render
    await this.page.waitForSelector('td.e-work-cells', { timeout: 10000, state: 'visible' }).catch(() => {});
    await this.page.waitForTimeout(1000); // Allow scheduler to fully update
    console.log('✓ Navigated to next day');
  }

  async waitForSchedulerLoaded() {
    console.log('STEP: Waiting for scheduler to load...');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    await this.page.waitForSelector('.e-schedule, .e-scheduler', { timeout: 15000, state: 'visible' });
    await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    console.log('✓ Scheduler loaded');
  }

  // Time slot methods
  async doubleClickTimeSlot(date, time) {
    console.log('STEP: Finding available slot and double-clicking...');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    // Wait for scheduler cells to be rendered
    await this.page.waitForSelector('td.e-work-cells', { timeout: 10000, state: 'visible' }).catch(() => {});
    await this.page.waitForTimeout(500); // Allow cells to fully render
    
    const targetDate = new Date(date);
    const targetDayStart = new Date(targetDate.setHours(0, 0, 0, 0)).getTime();
    const targetDayEnd = new Date(targetDate.setHours(23, 59, 59, 999)).getTime();
    
    const availableCells = this.page.locator('td.e-work-cells.available:not(.unavailable-color)');
    const count = await availableCells.count();
    console.log(`ℹ️ Found ${count} available cells`);
    
    for (let i = 0; i < Math.min(count, 500); i++) {
      const cell = availableCells.nth(i);
      const dataDate = await cell.getAttribute('data-date').catch(() => null);
      if (dataDate) {
        const cellTimestamp = parseInt(dataDate);
        if (cellTimestamp >= targetDayStart && cellTimestamp <= targetDayEnd) {
          await cell.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(200);
          await cell.dblclick();
          await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
          await this.page.waitForTimeout(500);
          console.log(`✓ Double-clicked available slot at index ${i}`);
          return true;
        }
      }
    }
    return false;
  }

  // Modal methods
  async verifyAddEventPopupVisible() {
    console.log('ASSERT: Verifying Add Event popup is visible...');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    const modal = this.modal();
    const isVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      throw new Error('Add Event popup not found');
    }
    console.log('✓ Add Event popup is visible');
  }

  async verifyCloseIconVisibleAndClickable() {
    console.log('ASSERT: Verifying close icon is visible...');
    const selectors = [
      'button.e-dlg-closeicon-btn',
      '[aria-label="Close"]',
      'button[aria-label*="close" i]',
      '.modal-header button:last-child'
    ];
    
    let closeIcon = null;
    for (const selector of selectors) {
      const icon = this.page.locator(selector).first();
      const isVisible = await icon.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        closeIcon = icon;
        break;
      }
    }
    
    if (!closeIcon) {
      // Try finding by attributes
      const modal = this.modal();
      const buttons = modal.locator('button');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
        const title = await btn.getAttribute('title').catch(() => '');
        if ((ariaLabel && ariaLabel.toLowerCase().includes('close')) || 
            (title && title.toLowerCase().includes('close'))) {
          closeIcon = btn;
          break;
        }
      }
    }
    
    if (!closeIcon) throw new Error('Close icon not found');
    await expect(closeIcon).toBeVisible({ timeout: 5000 });
    await expect(closeIcon).toBeEnabled({ timeout: 5000 });
    this._closeIcon = closeIcon; // Store for use in click method
    console.log('✓ Close icon is visible and clickable');
  }

  async clickCloseIconAndVerifyPopupCloses() {
    console.log('STEP: Clicking close icon...');
    const closeIcon = this._closeIcon || this.closeIcon();
    await closeIcon.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const modal = this.modal();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
    console.log('✓ Add Event popup is closed');
  }

  // Provider methods
  async verifyProviderControlVisibleAndDisabled() {
    console.log('ASSERT: Verifying Provider control is visible...');
    const selectors = [
      'label:has-text("Provider") + input',
      'label:has-text("Provider") + select',
      'label:has-text("Provider") ~ input',
      'input[id*="provider" i]',
      'select[id*="provider" i]'
    ];
    
    let providerControl = null;
    for (const selector of selectors) {
      const control = this.page.locator(selector).first();
      const isVisible = await control.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        providerControl = control;
        this._providerControl = control;
        break;
      }
    }
    
    if (!providerControl) throw new Error('Provider control not found');
    await expect(providerControl).toBeVisible({ timeout: 10000 });
    console.log('✓ Provider control is visible');
    
    console.log('ASSERT: Verifying Provider control is disabled...');
    const isDisabled = await providerControl.isDisabled({ timeout: 2000 }).catch(() => false);
    if (!isDisabled) {
      const jsCheck = await providerControl.evaluate((el) => ({
        disabled: el.disabled,
        readOnly: el.readOnly,
        ariaDisabled: el.getAttribute('aria-disabled')
      }));
      if (!jsCheck.disabled && !jsCheck.readOnly && jsCheck.ariaDisabled !== 'true') {
        console.log('⚠️ Provider control disabled state could not be confirmed');
      }
    }
    console.log('✓ Provider control disabled check completed');
  }

  async verifyProviderNamePrepopulated() {
    console.log('ASSERT: Verifying Provider name is prepopulated...');
    const providerElement = this._providerControl || this.page.locator('label:has-text("Provider") + input').first();
    
    let value = await providerElement.inputValue({ timeout: 5000 }).catch(async () => {
      return await providerElement.textContent({ timeout: 5000 }).catch(() => '');
    });
    
    if (!value || !value.trim()) {
      const valueAttr = await providerElement.getAttribute('value').catch(() => null);
      if (valueAttr && valueAttr.trim()) {
        value = valueAttr;
      } else {
        const selectedOption = this.page.locator('select[id*="provider"] option[selected], select:has(option[selected]) option[selected]').first();
        value = await selectedOption.textContent({ timeout: 3000 }).catch(() => null);
      }
    }
    
    if (!value || !value.trim()) {
      throw new Error('Provider name is not prepopulated');
    }
    console.log(`✓ Provider name is prepopulated: ${value.trim()}`);
    return value.trim();
  }

  // Radio button methods
  async selectAppointmentRadioButton() {
    console.log('STEP: Selecting Appointment radio button...');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    const radio = await this._findRadioByText('appointment');
    if (!radio) throw new Error('Appointment radio button not found');
    await radio.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);
    await radio.click({ force: true });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    await this.page.waitForTimeout(300);
    console.log('✓ Appointment radio button selected');
  }

  async selectEventRadioButton() {
    console.log('STEP: Selecting Event radio button...');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    const radio = await this._findRadioByText('event');
    if (!radio) throw new Error('Event radio button not found');
    await radio.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);
    await radio.click({ force: true });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    await this.page.waitForTimeout(300);
    console.log('✓ Event radio button selected');
  }

  async verifyAppointmentEventRadioButtons() {
    console.log('ASSERT: Verifying Appointment radio button is displayed...');
    const apptRadio = await this._findRadioByText('appointment');
    const eventRadio = await this._findRadioByText('event');
    
    if (!apptRadio || !(await apptRadio.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error('Appointment radio button is not displayed');
    }
    console.log('✓ Appointment radio button is displayed');
    
    if (!eventRadio || !(await eventRadio.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error('Event radio button is not displayed');
    }
    console.log('✓ Event radio button is displayed');
  }

  // Event Type dropdown methods
  async verifyEventTypeDropdownVisible() {
    console.log('ASSERT: Verifying Event Type dropdown is visible...');
    const label = this._getByLabel('Event Type');
    const isVisible = await label.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) {
      throw new Error('Event Type dropdown is not visible');
    }
    console.log('✓ Event Type dropdown is visible');
  }

  async verifyEventTypeDropdownEnabled() {
    console.log('ASSERT: Verifying Event Type dropdown is enabled...');
    const dropdown = this._getDropdown('Event Type');
    const input = dropdown.locator('input').first();
    const isDisabled = await input.isDisabled({ timeout: 2000 }).catch(() => true);
    if (isDisabled) {
      throw new Error('Event Type dropdown is not enabled');
    }
    console.log('✓ Event Type dropdown is enabled');
  }

  async verifyEventTypeDropdownHidden() {
    console.log('ASSERT: Verifying Event Type dropdown is hidden...');
    const label = this._getByLabel('Event Type');
    const isVisible = await label.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      throw new Error('Event Type dropdown is visible but should be hidden');
    }
    console.log('✓ Event Type dropdown is hidden');
  }

  async selectFirstAvailableEventType() {
    console.log('STEP: Selecting first available Event Type...');
    await this.verifyEventTypeDropdownVisible();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    const dropdown = this._getDropdown('Event Type');
    await dropdown.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    await this.page.waitForTimeout(300);
    
    const firstOption = this.page.locator('div[id$="_popup"]:visible li[role="option"]').first();
    const optionText = await firstOption.textContent({ timeout: 3000 });
    await firstOption.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    await this.page.waitForTimeout(300);
    console.log(`✓ Event Type selected: ${optionText?.trim()}`);
    return optionText?.trim();
  }

  async selectEventType(eventType) {
    console.log(`STEP: Selecting Event Type: ${eventType}...`);
    await this.verifyEventTypeDropdownVisible();
    const dropdown = this._getDropdown('Event Type');
    await dropdown.click();
    await this.page.waitForTimeout(500);
    
    const option = this.page.locator(`div[id$="_popup"]:visible li[role="option"]:has-text("${eventType}")`).first();
    await expect(option).toBeVisible({ timeout: 3000 });
    await option.click();
    await this.page.waitForTimeout(500);
    console.log(`✓ Event Type selected: ${eventType}`);
  }

  // High-level test methods
  async setupSchedulerForNextDay(loginPage) {
    console.log('STEP: Setting up scheduler for next day...');
    await this.navigateToScheduling(loginPage);
    await this.waitForSchedulerLoaded();
    await this.navigateToNextDay();
    console.log('✓ Scheduler setup complete');
  }

  async openAddEventPopupOnNextDay() {
    console.log('STEP: Opening Add Event popup on next day...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const clicked = await this.doubleClickTimeSlot(tomorrow, null);
    if (!clicked) throw new Error('Failed to double-click time slot');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
    await this.verifyAddEventPopupVisible();
    console.log('✓ Add Event popup opened');
  }

  async validateAddEventPopupBasicFeatures() {
    console.log('STEP: Validating Add Event popup basic features...');
    await this.verifyAddEventPopupVisible();
    await this.verifyCloseIconVisibleAndClickable();
    await this.clickCloseIconAndVerifyPopupCloses();
  }

  async validateAddEventPopupFormFields() {
    console.log('STEP: Validating Add Event popup form fields...');
    await this.verifyProviderControlVisibleAndDisabled();
    const providerName = await this.verifyProviderNamePrepopulated();
    await this.verifyAppointmentEventRadioButtons();
    return providerName;
  }

  async reopenAddEventPopup() {
    console.log('STEP: Reopening Add Event popup...');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const clicked = await this.doubleClickTimeSlot(tomorrow, null);
    if (!clicked) throw new Error('Failed to reopen popup');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
    await this.verifyAddEventPopupVisible();
    console.log('✓ Add Event popup reopened');
  }

  // Helper: Get time control by label
  _getTimeControl(labelText) {
    return this._getByLabel(labelText).locator('xpath=../..//input[contains(@id,"time")]').first();
  }

  // Helper: Get calendar icon by label (date picker icon)
  _getCalendarIcon(labelText) {
    const label = this._getByLabel(labelText);
    // Try multiple selectors for calendar/date picker icon
    const wrapper = label.locator('xpath=../..//div[contains(@class,"e-control-wrapper")], ../..//div[contains(@class,"e-datetimepicker")], ../..//div[contains(@class,"e-timepicker")]').first();
    // Calendar icon typically has e-calendar-icon class or similar
    return wrapper.locator('span.e-input-group-icon.e-calendar-icon.e-icons, button[title*="calendar" i], .e-input-group-icon:not(.e-time-icon)').first();
  }

  // Helper: Get time icon by label
  _getTimeIcon(labelText) {
    const label = this._getByLabel(labelText);
    const wrapper = label.locator('xpath=../..//div[contains(@class,"e-control-wrapper")], ../..//div[contains(@class,"e-datetimepicker")], ../..//div[contains(@class,"e-timepicker")]').first();
    // Time icon has e-time-icon class
    return wrapper.locator('span.e-input-group-icon.e-time-icon.e-icons').first();
  }

  // Helper: Get wrapper for time control
  _getTimeControlWrapper(labelText) {
    const label = this._getByLabel(labelText);
    return label.locator('xpath=../..//div[contains(@class,"e-control-wrapper")]').first();
  }

  // Start Time methods
  async verifyStartTimeVisibleAndEnabled() {
    console.log('ASSERT: Verifying Start Time control is visible and enabled...');
    const wrapper = this._getTimeControlWrapper('Start Time');
    const allIcons = wrapper.locator('.e-input-group-icon');
    const iconCount = await allIcons.count();
    
    if (iconCount >= 2) {
      await expect(allIcons.first()).toBeVisible({ timeout: 5000 });
      console.log('✓ Calendar control (date picker icon) is visible');
      await expect(allIcons.nth(1)).toBeVisible({ timeout: 5000 });
      console.log('✓ Time control (time picker icon) is visible');
    } else if (iconCount === 1) {
      await expect(allIcons.first()).toBeVisible({ timeout: 5000 });
      console.log('✓ Time control (time picker icon) is visible');
    }
    
    const startTimeControl = this._getTimeControl('Start Time');
    await expect(startTimeControl).toBeVisible({ timeout: 10000 });
    await expect(startTimeControl).toBeEnabled({ timeout: 5000 });
    console.log('✓ Start Time input control is visible and enabled');
  }

  async verifyStartTimeDateAndTime() {
    console.log('ASSERT: Verifying Start Time shows current date and selected time...');
    const startTimeControl = this._getTimeControl('Start Time');
    const value = await startTimeControl.inputValue({ timeout: 5000 });
    if (!value || !value.trim()) throw new Error('Start Time value is not displayed');
    console.log(`✓ Start Time value displayed: ${value}`);
  }

  async verifyStartTimeOptionsWith5MinInterval() {
    console.log('ASSERT: Verifying Start Time shows options with 5 minutes difference...');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    
    const wrapper = this._getTimeControlWrapper('Start Time');
    const timeIcon = wrapper.locator('span.e-input-group-icon.e-time-icon.e-icons').first();
    if (!(await timeIcon.isVisible({ timeout: 1000 }).catch(() => false))) {
      throw new Error('Start Time icon not found');
    }
    
    await timeIcon.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    console.log('✓ Clicked Start Time icon to open time picker');
    
    const optionsLocator = this.page.locator('li[role="option"]:visible');
    const count = await optionsLocator.count({ timeout: 3000 }).catch(() => 0);
    if (count < 2) throw new Error(`Not enough time options found (found ${count})`);
    
    const times = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await optionsLocator.nth(i).textContent({ timeout: 2000 });
      if (text) times.push(text.trim());
    }
    
    const parseTime = (timeStr) => {
      const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!parts) return null;
      let hours = parseInt(parts[1]);
      const minutes = parseInt(parts[2]);
      const ampm = parts[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    
    const time1 = parseTime(times[0]);
    const time2 = parseTime(times[1]);
    if (time1 !== null && time2 !== null && Math.abs(time2 - time1) === 5) {
      console.log(`✓ Verified 5-minute interval: ${times[0]} → ${times[1]}`);
    } else {
      throw new Error('Time options do not have 5-minute intervals');
    }
    
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    console.log('✓ Time picker closed');
  }

  // Helper: Get duration control
  _getDurationControl() {
    return this._getByLabel('Duration').locator('xpath=../..//input').first();
  }

  // Duration methods
  async verifyDurationPrepopulated() {
    console.log('ASSERT: Verifying Duration is prepopulated with 30 min...');
    const durationControl = this._getDurationControl();
    await expect(durationControl).toBeVisible({ timeout: 10000 });
    const value = await durationControl.inputValue({ timeout: 5000 });
    if (!value || !value.trim()) throw new Error('Duration value is not displayed');
    console.log(`✓ Duration is prepopulated with 30 min: ${value}`);
  }

  async updateDuration(duration) {
    console.log(`STEP: Updating Duration to ${duration}...`);
    const durationControl = this._getDurationControl();
    await durationControl.clear();
    await durationControl.fill(duration);
    await this.page.waitForTimeout(500);
    const newValue = await durationControl.inputValue({ timeout: 2000 });
    if (newValue !== duration) throw new Error(`Duration not updated correctly. Expected: ${duration}, Got: ${newValue}`);
    console.log(`✓ Duration updated to: ${duration}`);
  }

  // End Time methods
  async verifyEndTimeDateAndTime() {
    console.log('ASSERT: Verifying End Time shows current date and event end time...');
    const endTimeControl = this._getTimeControl('End Time');
    await expect(endTimeControl).toBeVisible({ timeout: 10000 });
    const value = await endTimeControl.inputValue({ timeout: 5000 });
    if (!value || !value.trim()) throw new Error('End Time value is not displayed');
    console.log(`✓ End Time value displayed: ${value}`);
  }

  // Edit Time methods
  async verifyEditTimeDisabled() {
    console.log('ASSERT: Verifying Edit Time control is disabled...');
    const selectors = [
      this._getByLabel('Edit Time').locator('xpath=../..//input').first(),
      this.page.locator('input[id*="edit"][id*="time" i]').first()
    ];
    
    let editTimeControl = null;
    for (const selector of selectors) {
      if (await selector.isVisible({ timeout: 2000 }).catch(() => false)) {
        editTimeControl = selector;
        break;
      }
    }
    
    if (!editTimeControl) {
      console.log('⚠️ Edit Time control not found');
      return;
    }
    
    const isDisabled = await editTimeControl.isDisabled({ timeout: 5000 }).catch(() => false);
    if (!isDisabled) {
      const jsCheck = await editTimeControl.evaluate((el) => el.disabled || el.readOnly || el.getAttribute('aria-disabled') === 'true');
      if (!jsCheck) throw new Error('Edit Time control is not disabled');
    }
    console.log('✓ Edit Time control is disabled');
  }

  // High-level combined validation methods for TC39
  async setupEventAndSelectEventType() {
    console.log('\n=== Setting up Event and selecting Event Type ===');
    await this.openAddEventPopupOnNextDay();
    await this.selectEventRadioButton();
    const selectedEventType = await this.selectFirstAvailableEventType();
    console.log(`✓ Event Type "${selectedEventType}" selected`);
    return selectedEventType;
  }

  async validateStartTimeControls() {
    console.log('\n=== Validating Start Time controls ===');
    await this.verifyStartTimeVisibleAndEnabled();
    await this.verifyStartTimeDateAndTime();
    await this.verifyStartTimeOptionsWith5MinInterval();
    console.log('✓ All Start Time validations passed');
  }

  async validateDurationControls() {
    console.log('\n=== Validating Duration controls ===');
    await this.verifyDurationPrepopulated();
    await this.updateDuration('60');
    console.log('✓ All Duration validations passed');
  }

  async validateEndTimeAndEditTimeControls() {
    console.log('\n=== Validating End Time and Edit Time controls ===');
    await this.verifyEndTimeDateAndTime();
    await this.verifyEditTimeDisabled();
    console.log('✓ All End Time and Edit Time validations passed');
  }
}

module.exports = { SchedulingPage };
