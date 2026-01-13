const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { RecurringAppointmentsPage } = require('../pages/RecurringAppointmentsPage');

test.use({ storageState: 'authState.json' });

test.describe('Scheduling Module - Recurring Appointments', () => {

  test('TC72: Recurring pattern generates individual appointments', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const recurringAppointmentsPage = new RecurringAppointmentsPage(page);

    console.log('\n=== TC72: Recurring pattern generates individual appointments ===');
    
    // Setup scheduler for next day
    await recurringAppointmentsPage.setupSchedulerForNextDay(loginPage);
    
    // First, open the modal to inspect its structure
    console.log('\n--- Inspecting appointment modal structure ---');
    await recurringAppointmentsPage.openAddEventPopupOnNextDay();
    await recurringAppointmentsPage.selectAppointmentRadioButton();
    
    // Inspect modal to see what's available
    await recurringAppointmentsPage.inspectModalForRecurringElements();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/appointment-modal-inspection.png', fullPage: true }).catch(() => {});
    console.log('ℹ️ Screenshot saved to test-results/appointment-modal-inspection.png for inspection');
    
    // Close modal and proceed with test
    await recurringAppointmentsPage.closePopupSafely();
    await page.waitForTimeout(1000);
    
    // Test that recurring pattern generates individual appointments
    try {
      const result = await recurringAppointmentsPage.testRecurringPatternGeneratesIndividualAppointments('Weekly', 1, 4);
      
      // Assertions
      expect(result.appointmentCount).toBeGreaterThanOrEqual(4);
      console.log(`✓ ASSERT: Recurring pattern generated ${result.appointmentCount} individual appointment(s) (expected at least ${result.occurrences})`);
      
      console.log('\n✓ TEST COMPLETED: TC72 validation completed');
    } catch (error) {
      console.log(`\n⚠️ TEST FAILED: ${error.message}`);
      console.log('\nℹ️ INSTRUCTIONS:');
      console.log('1. Check the screenshot: test-results/appointment-modal-inspection.png');
      console.log('2. Look for any buttons, links, or tabs related to "Recurring", "Repeat", or "Series"');
      console.log('3. Verify if recurring functionality is accessed through a different UI pattern');
      console.log('4. Update RecurringAppointmentsPage.js with the correct locators based on your UI');
      throw error;
    }
  });

  test('TC73: Each occurrence can be individually modified', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const recurringAppointmentsPage = new RecurringAppointmentsPage(page);

    console.log('\n=== TC73: Each occurrence can be individually modified ===');
    
    // Setup scheduler for next day
    await recurringAppointmentsPage.setupSchedulerForNextDay(loginPage);
    
    // Test that each occurrence can be individually modified
    const result = await recurringAppointmentsPage.testOccurrenceIndividualModification('Weekly', 1, 4);
    
    // Assertions
    expect(result).toBe(true);
    console.log('✓ ASSERT: Each occurrence can be individually modified');
    
    console.log('\n✓ TEST COMPLETED: TC73 validation completed');
  });

  test('TC74: Cancelling one occurrence does not cancel series', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const recurringAppointmentsPage = new RecurringAppointmentsPage(page);

    console.log('\n=== TC74: Cancelling one occurrence does not cancel series ===');
    
    // Setup scheduler for next day
    await recurringAppointmentsPage.setupSchedulerForNextDay(loginPage);
    
    // Test that cancelling one occurrence does not cancel the series
    const result = await recurringAppointmentsPage.testCancellingOccurrenceDoesNotCancelSeries('Weekly', 1, 4);
    
    // Assertions
    expect(result.initialCount).toBeGreaterThan(0);
    expect(result.finalCount).toBeGreaterThan(0);
    expect(result.finalCount).toBeLessThan(result.initialCount);
    console.log(`✓ ASSERT: One occurrence cancelled (${result.initialCount} -> ${result.finalCount}), series not cancelled`);
    
    console.log('\n✓ TEST COMPLETED: TC74 validation completed');
  });

  test('TC75: Modifying pattern affects only future occurrences', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const recurringAppointmentsPage = new RecurringAppointmentsPage(page);

    console.log('\n=== TC75: Modifying pattern affects only future occurrences ===');
    
    // Setup scheduler for next day
    await recurringAppointmentsPage.setupSchedulerForNextDay(loginPage);
    
    // Test that modifying pattern affects only future occurrences
    const result = await recurringAppointmentsPage.testModifyingPatternAffectsOnlyFutureOccurrences('Weekly', 1, 4);
    
    // Assertions
    expect(result).toBe(true);
    console.log('✓ ASSERT: Pattern modification affects only future occurrences');
    
    console.log('\n✓ TEST COMPLETED: TC75 validation completed');
  });

  test('TC76: Maximum 52 occurrences per series', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const recurringAppointmentsPage = new RecurringAppointmentsPage(page);

    console.log('\n=== TC76: Maximum 52 occurrences per series ===');
    
    // Setup scheduler for next day
    await recurringAppointmentsPage.setupSchedulerForNextDay(loginPage);
    
    // Test that maximum 52 occurrences per series is enforced
    const result = await recurringAppointmentsPage.testMaximumOccurrencesPerSeries('Weekly', 1);
    
    // Assertions
    expect(result).toBe(true);
    console.log('✓ ASSERT: Maximum 52 occurrences per series is enforced');
    
    console.log('\n✓ TEST COMPLETED: TC76 validation completed');
  });

});
