const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { SchedulingPage } = require('../pages/SchedulingPage');

test.use({ storageState: 'authState.json' });

test.describe('Scheduling Module - Add Appointment/Event', () => {

  test('TC37. Validate Add Event popup functionality', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const schedulingPage = new SchedulingPage(page);

    // Step 1: Setup scheduler and navigate to next day
    console.log('\n=== STEP 1: Setup scheduler for next day ===');
    await schedulingPage.setupSchedulerForNextDay(loginPage);

    // Step 2: Open Add Event popup by double-clicking on available time slot
    console.log('\n=== STEP 2: Open Add Event popup ===');
    await schedulingPage.openAddEventPopupOnNextDay();

    // Step 3: Validate basic popup features (visibility, close icon, close functionality)
    console.log('\n=== STEP 3: Validate Add Event popup basic features ===');
    await schedulingPage.validateAddEventPopupBasicFeatures();

    // Step 4: Reopen popup for further validations
    console.log('\n=== STEP 4: Reopen Add Event popup for form field validations ===');
    await schedulingPage.reopenAddEventPopup();

    // Step 5: Validate form fields (Provider control, Provider name, radio buttons)
    console.log('\n=== STEP 5: Validate Add Event popup form fields ===');
    await schedulingPage.validateAddEventPopupFormFields();

    // Final wait
    await page.waitForTimeout(2000);
    
    console.log('\n✓ TEST COMPLETED: All validations passed successfully');
  });

  test('TC38. Validate Appointment/Event selection and Event Type dropdown', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const schedulingPage = new SchedulingPage(page);

    // Step 1: Setup scheduler and navigate to next day
    console.log('\n=== STEP 1: Setup scheduler for next day ===');
    await schedulingPage.setupSchedulerForNextDay(loginPage);

    // Step 2: Open Add Event popup
    console.log('\n=== STEP 2: Open Add Event popup ===');
    await schedulingPage.openAddEventPopupOnNextDay();

    // Step 3: Validate user can select Appointment radio button
    console.log('\n=== STEP 3: Validate Appointment radio button selection ===');
    await schedulingPage.selectAppointmentRadioButton();
    console.log('✓ ASSERT: Appointment radio button can be selected');

    // Step 4: Validate Event Type dropdown is hidden when Appointment is selected
    console.log('\n=== STEP 4: Validate Event Type dropdown is hidden when Appointment is selected ===');
    await schedulingPage.verifyEventTypeDropdownHidden();
    console.log('✓ ASSERT: Event Type dropdown is hidden when Appointment is selected');

    // Step 5: Validate user can select Event radio button
    console.log('\n=== STEP 5: Validate Event radio button selection ===');
    await schedulingPage.selectEventRadioButton();
    console.log('✓ ASSERT: Event radio button can be selected');

    // Step 6: Validate Event Type dropdown is visible when Event is selected
    console.log('\n=== STEP 6: Validate Event Type dropdown is visible when Event is selected ===');
    await schedulingPage.verifyEventTypeDropdownVisible();
    console.log('✓ ASSERT: Event Type dropdown is visible when Event is selected');

    // Step 7: Validate Event Type dropdown is enabled
    console.log('\n=== STEP 7: Validate Event Type dropdown is enabled ===');
    await schedulingPage.verifyEventTypeDropdownEnabled();
    console.log('✓ ASSERT: Event Type dropdown is enabled');

    // Step 8: Select Event Type from dropdown
    console.log('\n=== STEP 8: Select Event Type from dropdown ===');
    const selectedEventType = await schedulingPage.selectFirstAvailableEventType();
    console.log(`✓ ASSERT: Event Type "${selectedEventType}" selected successfully`);

    // Final wait (with error handling in case page closes)
    try {
      await page.waitForTimeout(2000);
    } catch (e) {
      // Page may have closed, which is acceptable
      console.log('ℹ️ Page closed during final wait (expected behavior)');
    }
    
    console.log('\n✓ TEST COMPLETED: All validations passed successfully');
  });

  test('TC39. Validate Event Type, Start Time, Duration, End Time, and Edit Time controls', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const schedulingPage = new SchedulingPage(page);

    console.log('\n=== STEP 1: Setup scheduler for next day ===');
    await schedulingPage.setupSchedulerForNextDay(loginPage);

    console.log('\n=== STEP 2: Setup Event and select Event Type ===');
    await schedulingPage.setupEventAndSelectEventType();

    console.log('\n=== STEP 3: Validate Start Time controls ===');
    await schedulingPage.validateStartTimeControls();

    console.log('\n=== STEP 4: Validate Duration controls ===');
    await schedulingPage.validateDurationControls();

    console.log('\n=== STEP 5: Validate End Time and Edit Time controls ===');
    await schedulingPage.validateEndTimeAndEditTimeControls();

    try {
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('ℹ️ Page closed during final wait (expected behavior)');
    }
    
    console.log('\n✓ TEST COMPLETED: All validations passed successfully');
  });

});
