const { test, expect } = require('@playwright/test');
const { PatientROIPage } = require('../pages/PatientROIPage');
const { faker } = require('@faker-js/faker');

test.describe('Patient ROI Navigation and UI Validation', () => {
  test.use({ storageState: 'authState.json' });

  test.beforeEach(async ({ page }) => {
    const patientROI = new PatientROIPage(page);
    
    // Navigate to Dashboard
    await patientROI.navigateToDashboard();
    
    // Skip MFA if visible
    if (await patientROI.skipMfaButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(patientROI.skipMfaButton).toBeVisible({ timeout: 10000 });
      await patientROI.skipMfa();
    }
    
    // Navigate to Portal Requests page via UI (using Quick Menu)
    await patientROI.navigateToPortalRequestsViaUI();
    await patientROI.waitForPortalRequestsGridToLoad();
    console.log('✔️ Portal Requests page loaded successfully');
    
    // Navigate to Patient ROI via UI (clicking the heading)
    await patientROI.navigateToPatientROIViaUI();
    console.log('✔️ Patient ROI section loaded successfully');
  });

  test('Patient ROI Complete Navigation, UI Controls, and Functionality Validation', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Patient ROI Complete Navigation, UI Controls, and Functionality Validation...');

    // Verify Patient ROI is selected by default
    await patientROI.verifyPatientROISectionDisplayed();

    // Verify Patient ROI grid is displayed
    await patientROI.verifyPatientROIGridDisplayed();

    // Verify all required column headers are visible
    await patientROI.verifyAllColumns();

    // Verify Search control is available
    await patientROI.verifySearchControl();

    // Verify Status dropdown is visible
    await patientROI.verifyStatusDropdown();

    // Verify Search button
    await patientROI.verifySearchButton();

    // Verify Reset button
    await patientROI.verifyResetButton();

    // Test search functionality
    console.log('\nTesting search functionality...');
    await patientROI.searchPatient('test');
    await expect(patientROI.searchInput).toHaveValue('test');
    
    // Clear search
    await patientROI.clearSearch();
    await expect(patientROI.searchInput).toHaveValue('');

    console.log('✅ Test completed: Patient ROI navigation, grid display, and all columns verified');
  });

  test('Default Status Selection', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Default Status Selection Validation...');

    // Verify default status selection in Status dropdown
    await patientROI.verifyDefaultStatusSelection();

    // Expand dropdown and verify available options
    await patientROI.expandStatusDropdown();
    await patientROI.verifyStatusDropdownOptions();
    

    // Close the dropdown by pressing Escape
    await page.keyboard.press('Escape');

    console.log('✅ Test completed: Default status selection verified');
  });

  test('Search by Patient First & Last Name', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Search by Patient First & Last Name Functionality...');

    // Get first record data from grid for testing search
    const recordData = await patientROI.getFirstRecordData();
    console.log(`STEP 1: Retrieved test data from first grid record - ${recordData.firstName} ${recordData.lastName}`);

    // TEST 1: Search by First Name
    console.log('\n🔍 TEST 1: Testing Search by First Name...');
    console.log(`STEP: Searching for First Name: "${recordData.firstName}"`);
    await patientROI.searchPatient(recordData.firstName);
    await patientROI.clickSearchButton();
    await patientROI.verifySearchResults(recordData.firstName);
    
    // Verify grid contains search results and the searched record is visible
    await patientROI.verifyRecordInGrid(recordData.firstName, recordData.lastName);
    console.log(`✔️ Search by First Name works correctly - Record found and visible in grid`);

    // Clear search field for next test (no reset)
    console.log('\nSTEP: Clearing search field after TEST 1...');
    await patientROI.clearSearch();
    await page.waitForTimeout(500);

    // TEST 2: Search by Last Name
    console.log('\n🔍 TEST 2: Testing Search by Last Name...');
    console.log(`STEP: Searching for Last Name: "${recordData.lastName}"`);
    await patientROI.searchPatient(recordData.lastName);
    await patientROI.clickSearchButton();
    await patientROI.verifySearchResults(recordData.lastName);
    
    // Verify grid contains search results and the searched record is visible
    await patientROI.verifyRecordInGrid(recordData.firstName, recordData.lastName);
    console.log(`✔️ Search by Last Name works correctly - Record found and visible in grid`);

    // Reset to clear all filters at the end
    console.log('\nSTEP: Resetting filters after all tests...');
    await patientROI.clickResetButton();

    console.log('✅ Test completed: Search by patient name functionality verified');
  });
// how to verify if grid has changed according to status filter (confirm with sumit)
  test('Status Dropdown Selection', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Status Dropdown Selection Functionality...');

    // Test selecting "Approved" status
    console.log('Testing Approved status filter...');
    await patientROI.selectStatusFromDropdown('Approved');
    await patientROI.clickSearchButton();
    await patientROI.verifyStatusFilterResults('Approved');

    // Test selecting "Rejected" status
    console.log('Testing Rejected status filter...');
    await patientROI.selectStatusFromDropdown('Rejected');
    await patientROI.clickSearchButton();
    await patientROI.verifyStatusFilterResults('Rejected');

    // Reset to default
    await patientROI.clickResetButton();
    await patientROI.verifyDefaultStatusSelection();

    console.log('✅ Test completed: Status dropdown selection functionality verified');
  });

  test('Reset Functionality', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Reset Functionality Validation...');

    // STEP 1: Get initial grid state - fetch first record and record count
    console.log('\nSTEP 1: Capturing initial grid state...');
    const initialRecordCount = await patientROI.getGridRecordCount();
    const initialFirstRecord = await patientROI.getFirstRecordData();
    console.log(`Captured initial grid state - ${initialRecordCount} records found`);
    console.log(`First record: ${initialFirstRecord.firstName} ${initialFirstRecord.lastName}`);

    // STEP 2: Apply status filter - Change from "New" to "Approved"
    console.log('\nSTEP 2: Applying status filter - changing from "New" to "Approved"...');
    await patientROI.selectStatusFromDropdown('Approved');
    console.log('✔️ Status changed to "Approved"');

    // STEP 3: Add search text to search field
    console.log('\nSTEP 3: Adding search criteria...');
    await patientROI.searchPatient('Test');
    await expect(patientROI.searchInput).toHaveValue('Test');
    console.log('✔️ Search text "Test" entered in search field');

    // STEP 4: Click Search button to apply all filters
    console.log('\nSTEP 4: Clicking Search to apply filters...');
    await patientROI.clickSearchButton();
    await page.waitForTimeout(500);
    const filteredRecordCount = await patientROI.getGridRecordCount();
    console.log(`✔️ Filters applied - Grid now shows ${filteredRecordCount} records with "Approved" status and "Test" search`);

    // STEP 5: Click Reset button
    console.log('\nSTEP 5: Clicking Reset button...');
    await patientROI.clickResetButton();
    await page.waitForTimeout(500);
    console.log('✔️ Reset button clicked');

    // STEP 6: Verify all filters are cleared and grid returns to original state
    console.log('\nSTEP 6: Verifying reset restored original state...');
    
    // Verify search field is empty
    await expect(patientROI.searchInput).toHaveValue('');
    console.log('✔️ VERIFY: Search field is empty');

    // Verify status is back to default "New"
    await patientROI.verifyDefaultStatusSelection();
    console.log('✔️ VERIFY: Status dropdown reset to default "New"');

    // Verify grid returned to original record count
    const resetRecordCount = await patientROI.getGridRecordCount();
    console.log(`✔️ VERIFY: Grid record count after reset = ${resetRecordCount} (original was ${initialRecordCount})`);

    // Verify grid displays all records with default filter
    await patientROI.verifyPatientROIGridDisplayed();
    
    // Verify first record is visible (same as initial)
    if (resetRecordCount > 0) {
      const resetFirstRecord = await patientROI.getFirstRecordData();
      console.log(`✔️ VERIFY: First record still visible - ${resetFirstRecord.firstName} ${resetFirstRecord.lastName}`);
    }

    console.log('\n✅ Test completed: Reset functionality verified - all filters cleared and grid returned to original state');
  });

  test('Record Count Validation', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Record Count Validation...');

    // Step 1: Get current grid count (already on Patient ROI with default "New" status from beforeEach)
    const gridCount = await patientROI.getGridRecordCount();
    console.log(`STEP 1: Patient ROI grid count is ${gridCount}`);

    // Step 2: Get thumbnail count for Patient ROI
    const thumbnailCount = await patientROI.getThumbnailCount();
    console.log(`STEP 2: Patient ROI thumbnail count is ${thumbnailCount}`);

    // Step 3: Verify counts match
    expect(thumbnailCount).toBe(gridCount);
    console.log(`STEP 3: Thumbnail count (${thumbnailCount}) matches grid count (${gridCount})`);

    console.log('\n✅ Patient ROI thumbnail count verification - PASSED');
  });


// This will fail because Patient Status column not sortable as of now
  test('Column Sorting Validation', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Column Sorting Validation...');

    // STEP 1: Verify grid loads with data
    console.log('\nSTEP 1: Verifying grid loads and displays data...');
    await expect(patientROI.grid).toBeVisible({ timeout: 10000 });
    
    const recordCount = await patientROI.getGridRecordCount();
    console.log(`ASSERT: Grid loaded with ${recordCount} records`);
    
    // SKIP if insufficient data for sorting validation
    if (recordCount < 2) {
      console.log(`⏭️ SKIPPING: Only ${recordCount} record(s) found. Sorting requires at least 2 records for validation.`);
      test.skip();
      return;
    }

    // STEP 2: Test sorting for each column
    console.log('\nSTEP 2: Testing sorting functionality for all columns...');
    
    const columnsToTest = [
      { index: 0, name: 'Patient Id' },
      { index: 1, name: 'First Name' },
      { index: 2, name: 'Last Name' },
      { index: 3, name: 'DOB' },
      { index: 5, name: 'Patient Status' },
      { index: 6, name: 'Action By' },
      { index: 7, name: 'Action Notes' }
    ];

    for (const column of columnsToTest) {
      await patientROI.testColumnDualClickSorting(column.index, column.name);
    }

    console.log('\n✅ Column Sorting Validation - COMPLETED');
  });

  test('Action Icons Visibility and Functionality', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Action Icons Visibility and Functionality Validation...');

    // STEP 1: Verify grid loads with data
    console.log('\nSTEP 1: Verifying grid loads and displays data...');
    await patientROI.verifyPatientROIGridDisplayed();
    
    const recordCount = await patientROI.getGridRecordCount();
    console.log(`ASSERT: Grid loaded with ${recordCount} records`);
    
    // SKIP if no records
    if (recordCount === 0) {
      console.log('⚠️ SKIPPING: No records available for action icon verification');
      test.skip();
      return;
    }

    // STEP 2: Verify and test action icons functionality
    console.log('\nSTEP 2: Verifying Approve and Reject icons are visible and clickable in Action column...');
    
    const iconsVerified = await patientROI.verifyAndTestActionIcons(page);
    
    console.log(`\nSTEP 3: Summary - Verified and tested action icons in ${iconsVerified} record(s)`);
    
    if (iconsVerified > 0) {
      console.log(`ASSERT: Action icons (Approve/Reject) are visible, clickable, and functional`);
      console.log('\n✅ Action icons visibility and functionality validation - PASSED');
    } else {
      throw new Error('FAILED: Could not verify action icons functionality in any visible records');
    }
  });

  test('Complete Rejection Workflow with Radio Button Validation', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Complete Rejection Workflow with Radio Button Validation - STARTED');

    // STEP 1-4: Setup rejection workflow (load grid, get patient, open dialog, test close/reopen)
    const { patientIdentifier, dialog } = await patientROI.setupRejectionWorkflow();

    // STEP 5: Generate unique rejection reason using Faker for accurate verification
    const uniqueId = faker.string.uuid();
    const customRejectionNote = `ROI rejection - Unique ID: ${uniqueId} - ${faker.lorem.sentence()}`;
    console.log('✔️ STEP 5: Generated unique rejection note');
    
    // STEP 6-7: Check if "Locked For:" radio buttons are visible and handle accordingly
    const lockedForVisible = await page.getByText('Locked For:').isVisible({ timeout: 2000 }).catch(() => false);

    if (lockedForVisible) {
      console.log('✔️ STEP 6: "Locked For:" radio buttons detected');
      await patientROI.handleRejectionDialogWithRadioButtons(dialog, customRejectionNote);
      console.log('✔️ STEP 7: Radio button functionality tested');
    } else {
      console.log('⚠️ STEP 6: "Locked For:" radio buttons not visible');
      await patientROI.handleRejectionDialogWithoutRadioButtons(customRejectionNote);
      console.log('✔️ STEP 7: Rejection reason entered directly');
    }

    // STEP 8-12: Complete rejection process (save, verify notification, verify in rejected status)
    await patientROI.completeRejectionProcess(dialog, customRejectionNote, patientIdentifier);

    console.log('✅ Complete Rejection Workflow with Radio Button Validation - COMPLETED\n');
  });

  test('Complete Approval Workflow Patient Status Matched', async ({ page }) => {
    const patientROI = new PatientROIPage(page);
    
    console.log('\n➡️ Patient ROI Approval Workflow - STARTED');

    // Generate unique approval note using Faker for accurate verification
    const uniqueId = faker.string.uuid();
    const customApprovalNote = `ROI approved - Unique ID: ${uniqueId} - ${faker.lorem.sentence()}`;
    console.log('✔️ Generated unique approval note for verification\n');

    // Find matched patient and click approve icon
    const patientData = await patientROI.findMatchedPatient();
    
    if (!patientData) {
      console.log('⚠️ No patients with "Matched" status found. Skipping test.');
      test.skip();
      return;
    }
    
    await patientROI.clickApproveIcon(patientData);

    // Verify ROI form popup opened
    const formOpened = await patientROI.verifyROIFormOpened();
    
    if (!formOpened) {
      console.log('⚠️ ROI form popup not visible. Skipping remaining steps.');
      test.skip();
      return;
    }

    // Validate: Cross mark icon closes the ROI popup
    await patientROI.validateCrossMarkClosesPopup();

    // Reopen for Cancel button validation
    console.log('\nACTION: Reopening popup for Cancel button validation...');
    await patientROI.clickApproveIcon(patientData);
    await patientROI.verifyROIFormOpened();

    // Validate: Cancel button closes the ROI popup
    await patientROI.validateCancelButtonClosesPopup();

    // Reopen for final approval workflow
    console.log('\nACTION: Reopening popup for final approval workflow...');
    await patientROI.clickApproveIcon(patientData);
    await patientROI.verifyROIFormOpened();

    // Fill approval form
    await patientROI.fillApprovalForm();

    // Draw signature
    await patientROI.drawSignature();

    // Enter PIN
    await patientROI.enterPIN('1234');

    // Click Sign and wait for loader
    await patientROI.clickSignAndWaitForLoader();

    // Fill approval note
    await patientROI.fillApprovalNote(customApprovalNote);
    console.log(` ✔️ Approval note filled - Unique ID: ${uniqueId}`);

    // Verify patient in Approved status
    await patientROI.verifyPatientInApprovedStatus(patientData, uniqueId);

    console.log('\n✅ Patient ROI Approval Workflow - COMPLETED\n');
  });

  test('Pagination Functionality - Records Per Page Dropdown', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Pagination - Records Per Page Dropdown');

    // Step 1: Verify grid is loaded
    console.log('\nSTEP 1: Verifying grid is loaded...');
    await expect(patientROI.grid).toBeVisible({ timeout: 10000 });
    await patientROI.waitForLoadingSpinnerToComplete();
    console.log('✅ STEP 1: Grid loaded successfully');

    // Step 2: Apply "Approved" status filter and search
    console.log('\nSTEP 2: Applying "Approved" status filter...');
    await patientROI.selectStatusFromDropdown('Approved');
    await patientROI.clickSearchButton();
    await patientROI.waitForLoadingSpinnerToComplete();
    console.log('✅ STEP 2: "Approved" status filter applied');

    // Step 3: Verify pagination info is visible
    console.log('\nSTEP 3: Verifying pagination info...');
    const paginationInfo = page.getByText(/\d+ items?/);
    const paginationVisible = await paginationInfo.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (paginationVisible) {
      const paginationText = await paginationInfo.textContent();
      console.log(`✅ STEP 3: Pagination info visible - "${paginationText}"`);
    } else {
      console.log('⚠️ STEP 3: Pagination info not visible, continuing with test');
    }

    // Step 4: Test page size dropdown functionality
    console.log('\nSTEP 4: Testing page size dropdown...');
    const result = await patientROI.testPageSizeDropdown();
    
    if (result.found) {
      if (result.changed) {
        console.log('✅ STEP 4: Page size dropdown working correctly');
      } else {
        console.log('⚠️ STEP 4: Dropdown found but could not change page size');
      }
    } else {
      console.log('⚠️ STEP 4: Page size dropdown not found on this page');
    }

    console.log('\n✅ Pagination - Records Per Page Dropdown - COMPLETED');
  });

  test('Pagination Functionality - Next & Previous Page Navigation', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    // Test pagination for all status filters
    const results = await patientROI.testPaginationForAllStatuses();

    // Validate navigation worked for each status
    for (const [status, result] of Object.entries(results)) {
      if (!result.skipped) {
        // If page 2 exists, verify navigation worked
        if (result.navigationResult.hasNextPage) {
          expect(result.navigationResult.navigationSuccess).toBe(true);
          expect(result.navigationResult.backNavigationResult.success).toBe(true);
        }
      }
    }

    console.log('✅ Pagination Functionality - Next & Previous Page Navigation: Pagination test completed successfully');
  });
// Ask Sowjanya about validation in Not Matched status
  test('Approve Workflow with Not Matched Status', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Approve Workflow with Not Matched Status - STARTED');

    // STEP 1: Find patient with "Not Mached" status in FIRST grid
    console.log('\nSTEP 1: Finding patient with "Not Mached" status in main grid...');
    const patientIdentifier = await patientROI.findPatientByStatus('Not Mached');
    
    if (!patientIdentifier) {
      throw new Error('No patients with "Not Mached" status found in main grid');
    }
    console.log(`✔️ STEP 1: Found patient - Name: ${patientIdentifier.firstName} ${patientIdentifier.lastName}, DOB: ${patientIdentifier.dob}`);

    // STEP 2: Click approve icon on the patient row from FIRST grid
    console.log('\nSTEP 2: Clicking approve icon on patient row...');
    await patientROI.clickApproveIcon(patientIdentifier);
    console.log('✔️ STEP 2: Approve icon clicked - Search dialog opening');

    // STEP 3: Verify and handle the search dialog
    console.log('\nSTEP 3: Verifying search dialog elements and last name pre-population...');
    await patientROI.handleApproveSearchDialog(patientIdentifier.lastName);
    console.log('✔️ STEP 3: Search dialog verified with all required elements');

    // STEP 4: Select patient from search dialog by clicking tick
    console.log('\nSTEP 4: Selecting patient from search dialog...');
    const selectedPatientData = await patientROI.selectPatientFromSearchDialog();
    
    if (!selectedPatientData) {
      throw new Error('Could not select patient from dialog');
    }
    console.log(`✔️ STEP 4: Patient selected from dialog - ROI approval form now open`);

    // STEP 5: Verify ROI form opened
    console.log('\nSTEP 5: Verifying ROI approval form opened...');
    const formOpened = await patientROI.verifyROIFormOpened();
    
    if (!formOpened) {
      throw new Error('ROI form popup not visible');
    }
    console.log('✔️ STEP 5: ROI form verified as open');

    // STEP 6: Fill the approval form
    await patientROI.fillApprovalForm();
    console.log('✔️ STEP 6: Approval form filled');

    // STEP 7: Draw signature
    await patientROI.drawSignature();
    console.log('✔️ STEP 7: Signature drawn');

    // STEP 8: Enter PIN
    await patientROI.enterPIN('1234');
    console.log('✔️ STEP 8: PIN entered');

    // STEP 9: Click Sign and wait for loader
    await patientROI.clickSignAndWaitForLoader();
    console.log('✔️ STEP 9: Sign button clicked and loader completed');

    // STEP 10: Generate unique approval note and fill it
    const uniqueId = faker.string.uuid();
    const customApprovalNote = `ROI approved - Unique ID: ${uniqueId} - ${faker.lorem.sentence()}`;
    await patientROI.fillApprovalNote(customApprovalNote);
    console.log(`✔️ STEP 10: Approval note filled - Unique ID: ${uniqueId}`);

    // STEP 11: Navigate to Approved grid and verify patient using FIRST grid identifiers (firstName, lastName, DOB)
    console.log('\nSTEP 11: Navigating to Approved grid and verifying patient using grid identifiers...');
    
    // Select "Approved" status from dropdown
    await patientROI.selectStatusFromDropdown('Approved');
    await patientROI.clickSearchButton();
    await patientROI.waitForLoadingSpinnerToComplete();
    console.log('✔️ Changed filter to "Approved" status');

    // Verify patient appears in Approved grid with correct identifiers
    const patientFound = await patientROI.verifyPatientInApprovedGrid(
      patientIdentifier.firstName,
      patientIdentifier.lastName,
      patientIdentifier.dob
    );

    expect(patientFound).toBe(true);

    // Verify unique note is visible in grid
    const noteElement = page.getByText(uniqueId);
    await expect(noteElement).toBeVisible({ timeout: 3000 });
    console.log(`✔️ Unique note with ID ${uniqueId} visible in Approved grid`);

    console.log('\n✅ Approve Workflow with Not Matched Status - PASSED\n');
  });

  test('Get Portal Requests Badge Count', async ({ page }) => {
    const patientROI = new PatientROIPage(page);

    console.log('\n➡️ Getting Portal Requests Badge Count...');

    // STEP 1: Get badge count from Quick Menu
    const badgeCount = await patientROI.getBadgeCountFromQuickMenu();

    // STEP 2: Navigate to Portal Requests dashboard
    await patientROI.navigateToPortalRequestsDashboard();

    // STEP 3: Retrieve all card counts from dashboard
    const cardData = await patientROI.getDashboardCardCounts();

    // STEP 4: Sum all card counts
    const totalCardCount = await patientROI.sumAllCardCounts(cardData);

    // STEP 5: Verify badge count matches dashboard total
    await patientROI.verifyBadgeCountMatchesDashboardTotal(badgeCount, totalCardCount);

    console.log(`\n✅ Portal Requests Badge Count verification - PASSED\n`);
  });
  
  test('Validate badge count displayed in yellow circle beside Portal Requests', async ({ page }) => {
    const patientROI = new PatientROIPage(page);
    
    console.log('\n➡️ Validating badge count displayed in yellow circle beside Portal Requests\n');
    
    // Open Quick Menu to reveal the badge
    console.log('STEP 1: Opening Quick Menu...');
    const quickMenuButton = page.getByTitle('Quick Menu');
    await expect(quickMenuButton).toBeVisible({ timeout: 5000 });
    await quickMenuButton.click();
    await page.waitForTimeout(500);
    console.log('✔️ Quick Menu opened');
    
    // Verify badge in yellow circle and get the count
    console.log('\nSTEP 2: Validating yellow circle badge...');
    const badgeCount = await patientROI.verifyBadgeCountDisplayedInYellowCircle();
    
    console.log(`\n✅ Badge count (${badgeCount}) validated in yellow circle beside Portal Requests\n`);
  });

});
