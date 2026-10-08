@knownBug
Feature: Warenkorb nach einem Benutzerwechsel
  Als Benutzer, der einen Browser mit anderen Benutzern teilt,
  möchte ich nach der Anmeldung nur meinen eigenen Warenkorb sehen,
  damit ich keine Produkte bestelle, die ein anderer Benutzer hinzugefügt hat.

  Bekannter Fehler: Sauce Demo speichert den Warenkorb im Browser und leert
  ihn nicht, wenn sich ein anderer Benutzer anmeldet. Der nächste Benutzer
  sieht daher die Produkte, die der vorherige Benutzer hinzugefügt hat.

  Ziel:
    Prüfen, dass ein Benutzer nach der Anmeldung in einem gemeinsam genutzten
    Browser nicht den Warenkorb des vorherigen Benutzers sieht.

  Akzeptanzkriterien:
    - StandardUser fügt Produkte hinzu und meldet sich ab.
    - Der nächste Benutzer meldet sich an und sieht keine Warenkorbanzeige
      und einen leeren Warenkorb.

  Erwartetes Ergebnis:
    Es wird erwartet, dass der Test für jeden nachfolgenden Benutzer
    fehlschlägt (bekannter Fehler): Sauce Demo behält den Warenkorb des
    vorherigen Benutzers bei. Der Test ist mit @knownBug gekennzeichnet
    und besteht, sobald der Fehler behoben ist.

  Scenario Outline: <second_user> sieht den Warenkorb von StandardUser nicht
    Given I am on the "login" page
    And I login as "StandardUser"
    And I should be on the "inventory" page
    And I add the following products to the cart from the products page:
      | product   |
      | Backpack  |
      | BikeLight |
    And the cart badge should show 2
    And I click on the "Logout" menu item
    And I should be redirected to the "login" page
    When I login as "<second_user>"
    Then I should be on the "inventory" page
    And the cart badge should not be shown
    When I open the cart
    Then the cart should be empty

    Examples:
      | second_user           |
      | ProblemUser           |
      | ErrorUser             |
      | VisualUser            |
      | PerformanceGlitchUser |