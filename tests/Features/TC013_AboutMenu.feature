@allUsers
Feature: Menüpunkt About
  Als angemeldeter Benutzer
  möchte ich die About-Seite über das Menü öffnen,
  damit ich mehr über Sauce Labs erfahren kann.

  Ziel:
    Prüfen, dass der Menüpunkt About zur Website von Sauce Labs führt.

  Akzeptanzkriterien:
    - Der Link About verweist auf https://saucelabs.com/.
    - Ein Klick auf About öffnet die Website von Sauce Labs und keine Fehlerseite.
    - Die Zurück-Schaltfläche des Browsers führt zurück zur Produktseite.

  Erwartetes Ergebnis:
    Die Website von Sauce Labs wird für StandardUser geöffnet.
    Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die
    absichtlich eingebauten Fehler dieser Benutzer hin. Sie werden als
    gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

  Background:
    Given I am loggedin user
    And I should be on the "inventory" page

  Scenario: Der Menüpunkt About verlinkt auf die Website von Sauce Labs
    When I open the menu
    Then the "About" menu item should link to "https://saucelabs.com/"

  Scenario: Der Menüpunkt About öffnet die Website von Sauce Labs
    When I open the menu
    And I click on the "About" menu item
    Then I should be on the Sauce Labs website

  Scenario: Beim Zurückgehen von der About-Seite wird wieder die Produktseite angezeigt
    When I open the menu
    And I click on the "About" menu item
    And I should be on the Sauce Labs website
    And I go back in the browser
    Then I should be on the "inventory" page
    And I should see the title of the page "Products"