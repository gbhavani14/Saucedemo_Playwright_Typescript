@allUsers
Feature: Abmeldefunktion
  Als angemeldeter Benutzer
  möchte ich mich über das Menü abmelden,
  damit niemand anderes mein Konto in diesem Browser nutzen kann.

  Ziel:
    Prüfen, dass die Abmeldung auf jeder Seite die Sitzung beendet und
    den Zugriff auf die Shopseiten verhindert.

  Akzeptanzkriterien:
    - Nach der Abmeldung von einer beliebigen Shopseite wird die
      Anmeldeseite mit leeren Eingabefeldern angezeigt.
    - Nach der Abmeldung können die Shopseiten weder direkt noch über
      die Zurück-Schaltfläche des Browsers geöffnet werden.
    - Der Benutzer kann sich nach der Abmeldung erneut anmelden.

  Erwartetes Ergebnis:
    Die Abmeldung funktioniert auf jeder Seite für alle Benutzer.

  Background:
    Given I am loggedin user
    And I should be on the "inventory" page

  Scenario Outline: Von der Seite <page> abmelden
    Given I am on the "<page>" page
    When I click on the "Logout" menu item
    Then I should be redirected to the "login" page
    And the login form should be shown with empty fields

    Examples:
      | page               |
      | inventory          |
      | cart               |
      | checkout_step_one  |
      | checkout_step_two  |
      | checkout_complete  |

  Scenario: Nach der Abmeldung können die Shopseiten nicht geöffnet werden
    When I click on the "Logout" menu item
    And I should be redirected to the "login" page
    And I try to open the "inventory" page
    Then I should be on the "login" page
    And I should see the error message "Epic sadface: You can only access '/inventory.html' when you are logged in."

  Scenario: Die Zurück-Schaltfläche des Browsers führt nach der Abmeldung nicht zurück zum Shop
    When I click on the "Logout" menu item
    And I should be redirected to the "login" page
    And I go back in the browser
    Then I should be on the "login" page

  Scenario: Nach der Abmeldung erneut anmelden
    When I click on the "Logout" menu item
    And I should be redirected to the "login" page
    And I am loggedin user
    Then I should be on the "inventory" page
    And I should see the title of the page "Products"