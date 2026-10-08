@allUsers @knownBug
Feature: Bestellvorgang mit ausschließlich Leerzeichen in den Bestelldaten
  Als Betreiber eines Webshops
  möchte ich, dass der Bestellvorgang Namen und Postleitzahlen ablehnt,
  die nur Leerzeichen enthalten,
  damit jede Bestellung gültige Lieferdaten enthält.

  Bekannter Fehler: Sauce Demo prüft nur, ob die Felder nicht leer sind.
  Daher werden Leerzeichen akzeptiert und die Bestellung kann ohne
  Namen oder Postleitzahl abgeschlossen werden.

  Ziel:
    Prüfen, dass der Bestellvorgang Vorname, Nachname und Postleitzahl
    ablehnt, wenn diese nur Leerzeichen enthalten.

  Akzeptanzkriterien:
    - Ein Feld mit ausschließlich Leerzeichen wird wie ein leeres Feld
      behandelt und zeigt die zugehörige Fehlermeldung "is required" an.
    - Der Benutzer bleibt auf der Seite zur Eingabe der Bestelldaten
      und kann die Bestellung nicht abschließen.

  Erwartetes Ergebnis:
    Es wird erwartet, dass der Test für jeden Benutzer fehlschlägt
    (bekannter Fehler): Sauce Demo akzeptiert Leerzeichen und öffnet
    die Bestellübersicht. Der Test ist mit @knownBug gekennzeichnet.

  Background:
    Given I am loggedin user
    And I should be on the "inventory" page
    And I add the following products to the cart from the products page:
      | product  |
      | Backpack |
    And I open the cart
    And I proceed to checkout

  Scenario Outline: Der Bestellvorgang wird abgelehnt, wenn das Feld <field> nur Leerzeichen enthält
    When I enter the checkout information:
      | first_name   | last_name   | postal_code   |
      | <first_name> | <last_name> | <postal_code> |
    And I continue to the checkout overview
    Then I should stay on the checkout information page
    And I should see the error message "<error>"

    Examples:
      | field       | first_name              | last_name               | postal_code             | error                          |
      | first name  | {space}{space}{space}   | Doe                     | 67059                   | Error: First Name is required  |
      | last name   | John                    | {space}{space}{space}   | 67059                   | Error: Last Name is required   |
      | postal code | John                    | Doe                     | {space}{space}{space}   | Error: Postal Code is required |
      | all fields  | {space}{space}{space}   | {space}{space}{space}   | {space}{space}{space}   | Error: First Name is required  |

  Scenario: Eine Bestellung mit ausschließlich Leerzeichen in den Bestelldaten kann nicht abgeschlossen werden
    When I enter the checkout information:
      | first_name            | last_name             | postal_code           |
      | {space}{space}{space} | {space}{space}{space} | {space}{space}{space} |
    And I continue to the checkout overview
    Then I should stay on the checkout information page