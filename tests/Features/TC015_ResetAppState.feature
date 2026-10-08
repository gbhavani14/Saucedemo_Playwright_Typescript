@allUsers
Feature: Menüpunkt Reset App State
  Als angemeldeter Benutzer
  möchte ich den App-Zustand über das Menü zurücksetzen,
  damit ich mit einem leeren Warenkorb neu beginnen kann.

  Reset App State leert den Warenkorb, blendet die Warenkorbanzeige aus
  und setzt die Produktschaltflächen wieder auf "Add to cart".
  Der Benutzer bleibt angemeldet.

  Ziel:
    Prüfen, dass Reset App State den Warenkorb leert, ohne den Benutzer abzumelden.

  Akzeptanzkriterien:
    - Nach Reset App State ist die Warenkorbanzeige ausgeblendet
      und der Warenkorb leer.
    - Der Benutzer bleibt auf derselben Seite angemeldet.
    - Nach dem Neuladen zeigen alle Produkte wieder "Add to cart" an.
    - Auch ohne Neuladen sollten die Produktschaltflächen wieder
      "Add to cart" anzeigen (mit @knownBug gekennzeichnet).

  Erwartetes Ergebnis:
    Der Warenkorb wird für alle Benutzer geleert. Es wird erwartet,
    dass das Szenario mit @knownBug für jeden Benutzer fehlschlägt,
    da Sauce Demo weiterhin "Remove" anzeigt, bis die Seite neu geladen wird.

  Background:
    Given I am loggedin user
    And I should be on the "inventory" page
    And I add the following products to the cart from the products page:
      | product   |
      | Backpack  |
      | BikeLight |
    And the cart badge should show 2

  Scenario: Reset App State leert den Warenkorb
    When I click on the "Reset App State" menu item
    And I close the menu
    Then the cart badge should not be shown
    When I open the cart
    Then the cart should be empty

  Scenario: Nach Reset App State bleibt der Benutzer auf derselben Seite angemeldet
    When I click on the "Reset App State" menu item
    And I close the menu
    Then I should be on the "inventory" page
    And I should see the title of the page "Products"

  Scenario: Nach Reset App State können Produkte erneut hinzugefügt werden
    When I click on the "Reset App State" menu item
    And I close the menu
    And I reload the page
    Then the products should have an "Add to cart" button:
      | product   |
      | Backpack  |
      | BikeLight |

  @knownBug
  Scenario: Die Produktschaltflächen zeigen direkt nach Reset App State wieder "Add to cart" an
    When I click on the "Reset App State" menu item
    And I close the menu
    Then the products should have an "Add to cart" button:
      | product   |
      | Backpack  |
      | BikeLight |