@allUsers
Feature: Menüpunkt All Items
  Als angemeldeter Benutzer
  möchte ich den Menüpunkt "All Items" verwenden,
  damit ich von jeder Stelle im Shop zur Produktseite zurückkehren kann.

  Ziel:
    Prüfen, dass der Menüpunkt All Items von jeder Stelle im Shop
    zur Produktseite zurückführt.

  Akzeptanzkriterien:
    - All Items öffnet von der Produktseite, dem Warenkorb, den Seiten
      des Bestellvorgangs und den Produktdetailseiten die Produktseite
      mit allen 6 Produkten.
    - Produkte im Warenkorb bleiben im Warenkorb und behalten
      ihre Schaltfläche "Remove".

  Erwartetes Ergebnis:
    Die Produktseite wird für StandardUser von jeder Seite aus geöffnet.
    Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die
    absichtlich eingebauten Fehler dieser Benutzer hin. Sie werden als
    gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

  Background:
    Given I am loggedin user
    And I should be on the "inventory" page

  Scenario Outline: All Items öffnet die Produktseite von der Seite <page> aus
    Given I am on the "<page>" page
    When I click on the "All Items" menu item
    Then I should be on the "inventory" page
    And I should see the title of the page "Products"
    And 6 products should be shown

    Examples:
      | page               |
      | inventory          |
      | cart               |
      | checkout_step_one  |
      | checkout_step_two  |
      | checkout_complete  |

  Scenario: All Items öffnet die Produktseite von einer Produktdetailseite aus
    When I open the product "Backpack"
    And I should be on the product details page
    And I click on the "All Items" menu item
    Then I should be on the "inventory" page
    And I should see the title of the page "Products"

  Scenario: All Items behält die Produkte im Warenkorb bei
    When I add the following products to the cart from the products page:
      | product   |
      | Backpack  |
      | BikeLight |
    And I open the cart
    And I click on the "All Items" menu item
    Then I should be on the "inventory" page
    And the cart badge should show 2
    And the products should have a "Remove" button:
      | product   |
      | Backpack  |
      | BikeLight |