@allUsers
Feature: Ein Produkt kaufen
    Ein angemeldeter Benutzer kann ein Produkt kaufen: vom Warenkorb über die
    Eingabe der Bestelldaten und die Bestellübersicht bis zur Bestellbestätigung.
    Die Bestelldaten sind erforderlich. Der Bestellvorgang kann in beiden
    Schritten abgebrochen werden.

    Ziel:
      Den vollständigen Bestellvorgang für ein Produkt prüfen, einschließlich
      der Pflichtfelder und des Abbruchs.

    Akzeptanzkriterien:
      - Die Bestellung kann vom Warenkorb über die Eingabe der Bestelldaten
        und die Bestellübersicht bis zur Bestätigung abgeschlossen werden.
      - Die Bestellübersicht zeigt das hinzugefügte Produkt mit denselben
        Details, der korrekten Artikelsumme, 8 % Steuer und dem Gesamtbetrag.
      - Die Zahlungsart ist "SauceCard #31337" und die Versandart ist
        "Free Pony Express Delivery!".
      - Vorname, Nachname und Postleitzahl sind Pflichtfelder.
        Für jedes fehlende Feld wird eine eigene Fehlermeldung angezeigt.
      - Ein Abbruch im ersten Schritt führt zurück zum Warenkorb.
        Ein Abbruch in der Bestellübersicht führt zurück zur Produktseite.
        Der Inhalt des Warenkorbs bleibt dabei erhalten.
      - Nach Abschluss der Bestellung ist der Warenkorb leer.

    Erwartetes Ergebnis:
      Die Bestellung wird für StandardUser erfolgreich abgeschlossen.
      Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die
      absichtlich eingebauten Fehler dieser Benutzer hin. Sie werden als
      gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page
        And I add the following products to the cart from the products page:
            | product  |
            | Backpack |
        And I open the cart

    Rule: Die Bestellung kann abgeschlossen werden

        Scenario: Den Bestellvorgang für ein Produkt abschließen
            When I proceed to checkout
            Then I should see the title of the page "Checkout: Your Information"
            When I enter the checkout information:
                | first_name | last_name | postal_code |
                | John       | Doe       | 67059       |
            And I continue to the checkout overview
            Then I should be redirected to the "checkout_step_two" page
            And I should see the title of the page "Checkout: Overview"
            And the checkout overview should show the added products with the same details
            And the checkout overview should show the correct totals
            And the payment information should be "SauceCard #31337"
            And the shipping information should be "Free Pony Express Delivery!"
            When I finish the order
            Then the order should be completed
            And the cart badge should not be shown

        Scenario: Nach Abschluss der Bestellung kann der Benutzer mit einem leeren Warenkorb zur Produktseite zurückkehren
            When I check out with the checkout information:
                | first_name | last_name | postal_code |
                | John       | Doe       | 67059       |
            And I finish the order
            And I go back home
            Then the cart badge should not be shown
            And the products should have an "Add to cart" button:
                | product  |
                | Backpack |

    Rule: Die Bestelldaten sind erforderlich

        Scenario Outline: Der Bestellvorgang wird ohne <missing_field> nicht fortgesetzt
            When I proceed to checkout
            And I enter the checkout information:
                | first_name   | last_name   | postal_code   |
                | <first_name> | <last_name> | <postal_code> |
            And I continue to the checkout overview
            Then I should see the error message "<error_message>"
            And I should stay on the checkout information page

            Examples:
                | missing_field | first_name | last_name | postal_code | error_message                  |
                | first name    |            | Doe       | 67059       | Error: First Name is required  |
                | last name     | John       |           | 67059       | Error: Last Name is required   |
                | postal code   | John       | Doe       |             | Error: Postal Code is required |

    Rule: Der Bestellvorgang kann abgebrochen werden

        Scenario: Ein Abbruch auf der Seite zur Eingabe der Bestelldaten führt zurück zum Warenkorb
            When I proceed to checkout
            And I cancel the checkout
            Then I should be redirected to the "cart" page
            And the cart should show the added products with the same details

        Scenario: Ein Abbruch in der Bestellübersicht führt zurück zur Produktseite und behält den Inhalt des Warenkorbs bei
            When I check out with the checkout information:
                | first_name | last_name | postal_code |
                | John       | Doe       | 67059       |
            And I cancel the checkout
            Then I should be redirected to the "inventory" page
            And the cart badge should show 1