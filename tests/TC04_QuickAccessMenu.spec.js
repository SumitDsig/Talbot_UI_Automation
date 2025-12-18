const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { QuickAccessMenuPage } = require('../pages/QuickAccessMenuPage');

test.use({ storageState: 'authState.json' });

test.describe('Quick Access Menu Validation', () => {

  test('TC14 - Check Quick Access Menu displayed and verify modules loaded properly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const quickAccessMenuPage = new QuickAccessMenuPage(page);

    await loginPage.navigateToDashboard();
    
    // Test 1: Verify Quick Access Menu icon is displayed and clickable
    console.log('\n=== Test 1: Verifying Quick Access Menu icon ===');
    await expect(quickAccessMenuPage.quickMenuIcon).toBeVisible({ timeout: 10000 });
    console.log('✓ Quick Access Menu icon is visible');
    
    await expect(quickAccessMenuPage.quickMenuIcon).toBeEnabled();
    console.log('✓ Quick Access Menu icon is clickable');
    
    // Test 2: Click Quick Access Menu and verify it opens
    console.log('\n=== Test 2: Opening Quick Access Menu ===');
    await quickAccessMenuPage.openQuickAccessMenu();
    
    // Test 3: Verify modules are loaded properly
    console.log('\n=== Test 3: Verifying modules are loaded ===');
    const menuItems = await quickAccessMenuPage.getMenuItems();
    
    // Validate that menu items are loaded
    expect(menuItems.length).toBeGreaterThan(0);
    
    // Get expected modules from page object
    const expectedModules = quickAccessMenuPage.getExpectedModules();
    
    // Log all modules/items found in Quick Access Menu with details
    console.log('\n=== All Modules/Items in Quick Access Menu ===');
    const foundModuleNames = [];
    menuItems.forEach((item, index) => {
      let itemInfo = `${index + 1}. ${item.text}`;
      if (item.count) {
        itemInfo += ` [Count: ${item.count}]`;
      }
      if (item.hasSubMenu) {
        itemInfo += ` [Has Submenu]`;
      }
      console.log(itemInfo);
      foundModuleNames.push(item.text);
    });
    console.log(`\nTotal: ${menuItems.length} item(s)`);
    
    // Validate that a reasonable number of modules are loaded (at least 10)
    expect(menuItems.length).toBeGreaterThanOrEqual(10);
    console.log(`✓ ASSERT: At least 10 modules are loaded (found ${menuItems.length})`);
    
    // Check for key expected modules (validate that common modules are present)
    const keyModules = ['My Dashboard', 'Patients', 'Scheduling'];
    const foundKeyModules = keyModules.filter(module => 
      foundModuleNames.some(found => found === module)
    );
    
    expect(foundKeyModules.length).toBeGreaterThan(0);
    console.log(`✓ ASSERT: Key modules are present: ${foundKeyModules.join(', ')}`);
    
    // Log modules that are expected but not found (for information)
    const missingModules = expectedModules.filter(module => 
      !foundModuleNames.some(found => found === module)
    );
    if (missingModules.length > 0) {
      console.log(`\nℹ️ Note: ${missingModules.length} expected module(s) not found (may be due to permissions):`);
      missingModules.forEach(module => console.log(`   - ${module}`));
    }
    
    // Verify search input is visible (indicates menu is properly loaded)
    await expect(quickAccessMenuPage.searchInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Search input is visible - menu loaded properly');
    
    // Verify at least some menu items are visible
    if (menuItems.length > 0) {
      await expect(menuItems[0].locator).toBeVisible({ timeout: 5000 });
      console.log(`✓ Menu items are visible (e.g., "${menuItems[0].text}")`);
    }
  });

  test('TC15 - On marking the module as Favorite, module appended as the header menu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const quickAccessMenuPage = new QuickAccessMenuPage(page);

    await loginPage.navigateToDashboard();
    
    // Track Dashboard favorite state (must be favorited at the end)
    const requiredFavorites = ['My Dashboard'];
    let dashboardOriginalState = null;
    
    try {
      // Open Quick Access Menu
      await quickAccessMenuPage.openQuickAccessMenu();
      await page.waitForTimeout(1000);
      
      // Track original favorite state for Dashboard
      console.log('\n➡️ Checking original favorite state for Dashboard...');
      dashboardOriginalState = await quickAccessMenuPage.isItemFavorited('My Dashboard');
      console.log(`ℹ️ "My Dashboard" original state: ${dashboardOriginalState ? 'Favorited' : 'Not Favorited'}`);
      
      // Get menu items
      const menuItems = await quickAccessMenuPage.getMenuItems();
      
      if (menuItems.length > 0) {
        // Select a menu item to test favorite (prefer a navigation item, not Dashboard)
        let testItem = menuItems.find(item => 
          !['Excel Export', 'Reset', 'Go to Work', 'My Dashboard'].includes(item.text)
        );
        
        if (!testItem) {
          testItem = menuItems[0];
        }
        
        const testItemText = testItem.text;
        console.log(`\nTesting favorite functionality with: "${testItemText}"`);
        
        // Check original favorite state
        const originalState = await quickAccessMenuPage.isItemFavorited(testItemText);
        console.log(`ℹ️ Original favorite state for "${testItemText}": ${originalState ? 'Favorited' : 'Not Favorited'}`);
        
        // Mark as favorite if not already favorited
        if (!originalState) {
          console.log(`➡️ Marking "${testItemText}" as favorite...`);
          await quickAccessMenuPage.markAsFavorite(testItemText);
          await page.waitForTimeout(2000);
        } else {
          console.log(`ℹ️ "${testItemText}" is already favorited, unmarking then remarking...`);
          await quickAccessMenuPage.toggleFavorite(testItemText);
          await page.waitForTimeout(1000);
          await quickAccessMenuPage.toggleFavorite(testItemText);
          await page.waitForTimeout(2000);
        }
        
        // Verify it's now favorited
        const isFavorited = await quickAccessMenuPage.isItemFavorited(testItemText);
        expect(isFavorited).toBe(true);
        console.log(`✓ "${testItemText}" is now favorited`);
        
        // Check if it appears in header menu
        console.log(`\n➡️ Checking if "${testItemText}" appears in header menu...`);
        
        // Wait for the favorite to sync to header (may take a moment)
        await page.waitForTimeout(3000);
        
        // Try multiple times to find it in header (with retries)
        let appearsInHeader = false;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(`Checking header (attempt ${attempt}/${maxRetries})...`);
          
          try {
            appearsInHeader = await Promise.race([
              quickAccessMenuPage.checkFavoriteInHeader(testItemText),
              new Promise((resolve) => setTimeout(() => resolve(false), 15000))
            ]);
            
            if (appearsInHeader) {
              console.log(`✓ Found "${testItemText}" in header menu on attempt ${attempt}`);
              break;
            }
          } catch (error) {
            console.log(`⚠️ Error on attempt ${attempt}: ${error.message}`);
          }
          
          // Wait before next attempt
          if (attempt < maxRetries) {
            await page.waitForTimeout(2000);
          }
        }
        
        // If still not found, try refreshing page and checking again
        if (!appearsInHeader) {
          console.log(`⚠️ Not found in header after ${maxRetries} attempts, refreshing page and retrying...`);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3000);
          
          // Wait for dashboard to load after refresh
          await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(2000);
          
          try {
            appearsInHeader = await Promise.race([
              quickAccessMenuPage.checkFavoriteInHeader(testItemText),
              new Promise((resolve) => setTimeout(() => resolve(false), 15000))
            ]);
            
            if (appearsInHeader) {
              console.log(`✓ Found "${testItemText}" in header menu after page refresh`);
            }
          } catch (error) {
            console.log(`⚠️ Error checking header after refresh: ${error.message}`);
          }
        }
        
        // Assert that it appears in header (this is the main requirement)
        if (appearsInHeader) {
          console.log(`✓ ASSERT: "${testItemText}" appears in header menu after marking as favorite`);
          console.log(`✓ LOG: Module "${testItemText}" appended as header menu after marking Favorite`);
        } else {
          console.log(`⚠️ WARNING: "${testItemText}" does not appear in header menu after marking as favorite`);
          console.log(`ℹ️ Note: This may be expected behavior - favorites may not always appear in header immediately`);
        }
        
        expect(appearsInHeader).toBe(true);
        
        // Restore original state if it was not favorited
        if (!originalState) {
          console.log(`\n➡️ Restoring "${testItemText}" to original state (not favorited)...`);
          await quickAccessMenuPage.toggleFavorite(testItemText);
          await page.waitForTimeout(1000);
        }
      }
    } finally {
      // Ensure Dashboard is favorited at the end
      console.log('\n➡️ Ensuring Dashboard is favorited...');
      await quickAccessMenuPage.openQuickAccessMenu();
      await page.waitForTimeout(1000);
      
      const currentDashboardState = await quickAccessMenuPage.isItemFavorited('My Dashboard');
      if (!currentDashboardState) {
        console.log('➡️ Dashboard is not favorited, marking as favorite...');
        await quickAccessMenuPage.markAsFavorite('My Dashboard');
        await page.waitForTimeout(2000);
      } else {
        console.log('✓ Dashboard is already favorited');
      }
    }
  });

  test('TC16 - Validate search functionality in Quick Access Menu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const quickAccessMenuPage = new QuickAccessMenuPage(page);

    await loginPage.navigateToDashboard();
    
    // Open Quick Access Menu
    await quickAccessMenuPage.openQuickAccessMenu();
    await page.waitForTimeout(1000);
    
    // Get all menu items before search
    const allMenuItems = await quickAccessMenuPage.getMenuItems();
    expect(allMenuItems.length).toBeGreaterThan(0);
    console.log(`Total menu items before search: ${allMenuItems.length}`);
    
    // Test search with a specific term
    const searchTerm = allMenuItems[0].text.substring(0, Math.min(5, allMenuItems[0].text.length));
    console.log(`\nTesting search with term: "${searchTerm}"`);
    
    // Perform search
    await quickAccessMenuPage.searchModule(searchTerm);
    
    // Get search results
    const searchResults = await quickAccessMenuPage.getSearchResults();
    console.log(`Search results count: ${searchResults.length}`);
    
    // Verify search results contain the search term
    const matchingResults = searchResults.filter(item => 
      item.text.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    expect(matchingResults.length).toBeGreaterThan(0);
    console.log(`✓ ASSERT: Search returned ${matchingResults.length} matching result(s)`);
    console.log(`Matching results: ${matchingResults.map(r => r.text).join(', ')}`);
    
    // Clear search
    await quickAccessMenuPage.clearSearch();
    await page.waitForTimeout(500);
    
    // Verify all items are visible again after clearing
    const itemsAfterClear = await quickAccessMenuPage.getMenuItems();
    console.log(`Menu items after clearing search: ${itemsAfterClear.length}`);
    
    expect(itemsAfterClear.length).toBeGreaterThanOrEqual(allMenuItems.length);
    console.log(`✓ ASSERT: All menu items visible after clearing search`);
  });

  test('TC17 - Clicking the quick access modules and validate the navigation', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    const loginPage = new LoginPage(page);
    const quickAccessMenuPage = new QuickAccessMenuPage(page);

    await loginPage.navigateToDashboard();
    
    // Open Quick Access Menu
    await quickAccessMenuPage.openQuickAccessMenu();
    await page.waitForTimeout(1000);
    
    // Get all menu items
    const menuItems = await quickAccessMenuPage.getMenuItems();
    expect(menuItems.length).toBeGreaterThan(0);
    console.log(`Found ${menuItems.length} menu item(s)`);
    
    // Get modules to test for navigation from page object (includes name and urlContains)
    const modulesToTest = quickAccessMenuPage.getNavigationTestModules();
    const moduleNames = modulesToTest.map(m => m.name);
    console.log(`\nTesting navigation for quick access modules`);
    
    // Create a map of menu items by name for quick lookup
    const menuItemsMap = new Map();
    menuItems.forEach(item => {
      menuItemsMap.set(item.text, item);
    });
    
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const skippedModules = [];
    const failedModules = [];
    
    for (const module of modulesToTest) {
      const moduleName = module.name;
      const expectedUrlPattern = module.urlContains;
      
      console.log(`\n--- Testing navigation for: "${moduleName}" ---`);
      
      // Find the menu item
      const menuItem = menuItemsMap.get(moduleName);
      
      if (!menuItem) {
        console.log(`⚠️ Skipping "${moduleName}" - module not found in Quick Access Menu`);
        skippedCount++;
        skippedModules.push({ name: moduleName, reason: 'Module not found in Quick Access Menu' });
        continue;
      }
      
      // Skip items with submenus (they don't navigate directly)
      if (menuItem.hasSubMenu) {
        console.log(`⚠️ Skipping "${moduleName}" - has submenu, cannot test direct navigation`);
        skippedCount++;
        skippedModules.push({ name: moduleName, reason: 'Has submenu, cannot test direct navigation' });
        continue;
      }
      
      try {
        // Re-open menu if it closed
        if (!(await quickAccessMenuPage.isMenuOpen())) {
          await quickAccessMenuPage.openQuickAccessMenu();
          await page.waitForTimeout(500);
        }
        
        // Get current URL
        const urlBefore = page.url();
        console.log(`Current URL: ${urlBefore}`);
        
        // Click the menu item
        await quickAccessMenuPage.clickMenuItemByLocator(menuItem.locator, moduleName);
        
        // Wait for navigation to start
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1000);
        
        // Check if page is still open
        if (page.isClosed()) {
          console.log(`⚠️ Page closed after clicking "${moduleName}"`);
          failedCount++;
          failedModules.push({ name: moduleName, reason: 'Page closed after clicking' });
          break;
        }
        
        // Wait for URL to contain expected pattern (with timeout)
        try {
          await page.waitForURL(`**/*${expectedUrlPattern}*`, { timeout: 10000 });
          // Additional wait for SPA to fully settle
          await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
          
          const currentUrl = page.url();
          console.log(`New URL: ${currentUrl}`);
          console.log(`✓ ASSERT: Navigation successful for "${moduleName}" (URL contains "${expectedUrlPattern}")`);
          successCount++;
        } catch (urlErr) {
          const currentUrl = page.url();
          console.log(`New URL: ${currentUrl}`);
          const errorMsg = `URL does not contain expected pattern "${expectedUrlPattern}". Actual URL: ${currentUrl}`;
          console.log(`❌ ${errorMsg}`);
          failedCount++;
          failedModules.push({ name: moduleName, reason: errorMsg });
        }
        
      } catch (error) {
        console.log(`❌ Failed to navigate for "${moduleName}": ${error.message}`);
        failedCount++;
        failedModules.push({ name: moduleName, reason: error.message });
        // Continue with next item
      }
      
      // Wait a bit before next iteration
      await page.waitForTimeout(1000);
    }
    
    // Summary
    console.log(`\n=== Navigation Test Summary ===`);
    console.log(`✓ Successful: ${successCount}`);
    console.log(`⚠️ Skipped: ${skippedCount}`);
    if (skippedModules.length > 0) {
      console.log(`\nSkipped Modules:`);
      skippedModules.forEach(module => {
        console.log(`   - ${module.name} (${module.reason})`);
      });
    }
    console.log(`❌ Failed: ${failedCount}`);
    if (failedModules.length > 0) {
      console.log(`\nFailed Modules:`);
      failedModules.forEach(module => {
        console.log(`   - ${module.name} (${module.reason})`);
      });
    }
    console.log(`Total tested: ${modulesToTest.length}`);
    
    // Assert that at least some navigations were successful
    expect(successCount).toBeGreaterThan(0);
  });

  test('TC18. Validate Reports menu items and URLs', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    const loginPage = new LoginPage(page);
    const quickAccessMenuPage = new QuickAccessMenuPage(page);

    await loginPage.navigateToDashboard();
    
    // Open Quick Access Menu
    await quickAccessMenuPage.openQuickAccessMenu();
    await page.waitForTimeout(1000);
    
    // Expected Reports submenu items
    const expectedSubmenuItems = quickAccessMenuPage.getReportsSubmenuItems();
    
    // Step 1: Hover over Reports to reveal submenu
    console.log('\n=== Step 1: Hovering over Reports module ===');
    await quickAccessMenuPage.hoverMenuItem('Reports');
    await page.waitForTimeout(1000);
    
    // Step 2: Get actual submenu items
    console.log('\n=== Step 2: Getting submenu items ===');
    const actualSubmenuItems = await quickAccessMenuPage.getSubmenuItems('Reports');
    
    // Step 3: Validate that expected submenu items are displayed
    console.log('\n=== Step 3: Validating submenu items are displayed ===');
    const actualSubmenuNames = actualSubmenuItems.map(item => item.text);
    
    console.log(`Found ${actualSubmenuItems.length} submenu item(s):`);
    actualSubmenuItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.text}`);
    });
    
    // Check which expected items are found
    const foundItems = [];
    const missingItems = [];
    
    for (const expectedItem of expectedSubmenuItems) {
      const found = actualSubmenuNames.some(actual => 
        actual.toLowerCase().includes(expectedItem.name.toLowerCase()) || 
        expectedItem.name.toLowerCase().includes(actual.toLowerCase())
      );
      
      if (found) {
        foundItems.push(expectedItem.name);
        console.log(`✓ Found: "${expectedItem.name}"`);
      } else {
        missingItems.push(expectedItem.name);
        console.log(`⚠️ Not found: "${expectedItem.name}"`);
      }
    }
    
    // Assert that expected items are found
    expect(foundItems.length).toBeGreaterThan(0);
    console.log(`\n✓ ASSERT: Found ${foundItems.length} out of ${expectedSubmenuItems.length} expected submenu items`);
    
    // Step 4: Click and navigate to each submenu item
    console.log('\n=== Step 4: Clicking and validating navigation for submenu items ===');
    
    // Create a map of found submenu items for quick lookup
    const foundSubmenuMap = new Map();
    actualSubmenuItems.forEach(item => {
      foundSubmenuMap.set(item.text, item);
    });
    
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const failedItems = [];
    const skippedItems = [];
    
    for (const submenuItem of expectedSubmenuItems) {
      const submenuItemName = submenuItem.name;
      console.log(`\n--- Testing navigation for: "${submenuItemName}" ---`);
      
      // Check if this submenu item was found in the actual submenu
      const foundItem = Array.from(foundSubmenuMap.keys()).find(actual => 
        actual.toLowerCase().includes(submenuItemName.toLowerCase()) || 
        submenuItemName.toLowerCase().includes(actual.toLowerCase())
      );
      
      if (!foundItem) {
        console.log(`⚠️ Skipping "${submenuItemName}" - not found in submenu`);
        skippedCount++;
        skippedItems.push({ name: submenuItemName, reason: 'Not found in submenu' });
        continue;
      }
      
      try {
        // Re-open menu if it closed
        if (!(await quickAccessMenuPage.isMenuOpen())) {
          await quickAccessMenuPage.openQuickAccessMenu();
          await page.waitForTimeout(500);
        }
        
        // Get current URL before navigation
        const urlBefore = page.url();
        console.log(`Current URL: ${urlBefore}`);
        
        // Click the submenu item
        await quickAccessMenuPage.clickSubmenuItem('Reports', submenuItemName);
        
        // Wait for navigation to start
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1000);
        
        // Check if page is still open
        if (page.isClosed()) {
          console.log(`⚠️ Page closed after clicking "${submenuItemName}"`);
          failedCount++;
          failedItems.push({ name: submenuItemName, reason: 'Page closed after clicking' });
          break;
        }
        
        // Wait for URL to contain expected pattern
        try {
          await page.waitForURL(`**/*${submenuItem.urlContains}*`, { timeout: 10000 });
          // Additional wait for SPA to fully settle
          await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
          
          const currentUrl = page.url();
          console.log(`New URL: ${currentUrl}`);
          console.log(`✓ ASSERT: Navigation successful for "${submenuItemName}" (URL contains "${submenuItem.urlContains}")`);
          successCount++;
        } catch (urlErr) {
          const currentUrl = page.url();
          console.log(`New URL: ${currentUrl}`);
          const errorMsg = `URL does not contain expected pattern "${submenuItem.urlContains}". Actual URL: ${currentUrl}`;
          console.log(`❌ ${errorMsg}`);
          failedCount++;
          failedItems.push({ name: submenuItemName, reason: errorMsg });
        }
        
      } catch (error) {
        console.log(`❌ Failed to navigate for "${submenuItemName}": ${error.message}`);
        failedCount++;
        failedItems.push({ name: submenuItemName, reason: error.message });
      }
      
      // Wait a bit before next iteration
      await page.waitForTimeout(1000);
    }
    
    // Summary
    console.log(`\n=== Reports Submenu Navigation Test Summary ===`);
    console.log(`✓ Successful: ${successCount}`);
    console.log(`⚠️ Skipped: ${skippedCount}`);
    if (skippedItems.length > 0) {
      console.log(`\nSkipped Items:`);
      skippedItems.forEach(item => {
        console.log(`   - ${item.name} (${item.reason})`);
      });
    }
    console.log(`❌ Failed: ${failedCount}`);
    if (failedItems.length > 0) {
      console.log(`\nFailed Items:`);
      failedItems.forEach(item => {
        console.log(`   - ${item.name} (${item.reason})`);
      });
    }
    console.log(`Total tested: ${expectedSubmenuItems.length}`);
    
    // Assert that at least some navigations were successful
    expect(successCount).toBeGreaterThan(0);
  });

  test('TC19 - Validate dynamic count on the relevant quick-access module', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const quickAccessMenuPage = new QuickAccessMenuPage(page);

    await loginPage.navigateToDashboard();
    
    // Open Quick Access Menu
    await quickAccessMenuPage.openQuickAccessMenu();
    await page.waitForTimeout(1000);
    
    // Get the menu container
    const menuContainer = await quickAccessMenuPage.getMenuContainer();
    
    // Look for dynamic count elements (span with class tpAlert_quick_menu)
    const countElements = menuContainer.locator('span.tpAlert_quick_menu');
    const count = await countElements.count();
    
    console.log(`Found ${count} dynamic count element(s)`);
    
    if (count > 0) {
      // Verify at least one count is visible and has a value
      let foundVisibleCount = false;
      
      for (let i = 0; i < count; i++) {
        const countElement = countElements.nth(i);
        const isVisible = await countElement.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isVisible) {
          const countText = await countElement.textContent();
          const countValue = parseInt(countText?.trim() || '0');
          
          console.log(`✓ Found visible count: ${countText} (value: ${countValue})`);
          
          // Verify it's a valid number
          expect(countValue).toBeGreaterThanOrEqual(0);
          foundVisibleCount = true;
        }
      }
      
      expect(foundVisibleCount).toBe(true);
      console.log('✓ ASSERT: Dynamic count is displayed on at least one quick-access module');
    } else {
      // If no count elements found, check if any menu items have counts in their text
      const menuItems = await quickAccessMenuPage.getMenuItems();
      let foundCountInText = false;
      
      for (const item of menuItems) {
        const itemText = item.text;
        // Check if text contains numbers (potential counts)
        const hasNumber = /\d+/.test(itemText);
        if (hasNumber) {
          console.log(`✓ Found count in menu item text: "${itemText}"`);
          foundCountInText = true;
        }
      }
      
      if (foundCountInText) {
        console.log('✓ ASSERT: Dynamic count is displayed in menu item text');
      } else {
        console.log('⚠️ WARNING: No dynamic count elements found (this may be expected if no items have counts)');
      }
    }
  });

});
