Feature: Produktdetails
    Ein Klick auf ein Produkt auf der Produktseite öffnet dessen Detailseite.
    Diese zeigt denselben Namen, dieselbe Beschreibung, denselben Preis
    und dasselbe Bild. Der Benutzer kann das Produkt zum Warenkorb hinzufügen
    und wieder daraus entfernen.

    Ziel:
      Prüfen, dass die Detailseite jedes Produkts dieselben Produktangaben
      wie die Produktseite zeigt und der Warenkorb synchron bleibt.

    Akzeptanzkriterien:
      - Ein Klick auf ein Produkt öffnet dessen Detailseite mit demselben Namen,
        derselben Beschreibung, demselben Preis und demselben Bild.
      - Ein Produkt kann auf seiner Detailseite hinzugefügt und entfernt werden.
        Der Button und die Artikelanzahl am Warenkorbsymbol ändern sich entsprechend.
      - Wird ein Produkt auf einer Seite zum Warenkorb hinzugefügt,
        zeigt der Button auf der anderen Seite ebenfalls "Remove".

    Erwartetes Ergebnis:
      Alle Prüfungen sind für StandardUser erfolgreich.
      Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die absichtlich
      eingebauten Anwendungsfehler dieser Benutzer hin und werden als gefundene
      Fehler gemeldet, nicht als Fehler des Testframeworks.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page

    @allUsers
    Rule: Die Detailseite zeigt dasselbe Produkt wie die Produktseite

        Scenario Outline: Die Details von <product> stimmen mit den Angaben auf der Produktseite überein
            When I remember the details of the product "<product>"
            And I open the product "<product>"
            Then I should be on the product details page
            And the product details should match the inventory page

            Examples:
                | product      |
                | Backpack     |
                | BikeLight    |
                | BoltTShirt   |
                | FleeceJacket |
                | Onesie       |
                | RedTShirt    |

    @allUsers
    Rule: Produkte können auf der Detailseite zum Warenkorb hinzugefügt und daraus entfernt werden

        Scenario Outline: <product> auf der Detailseite zum Warenkorb hinzufügen und wieder entfernen
            When I open the product "<product>"
            Then the product details page should have an "Add to cart" button
            When I click on the "Add to cart" button on the product details page
            Then the product details page should have a "Remove" button
            And the cart badge should show 1
            When I click on the "Remove" button on the product details page
            Then the product details page should have an "Add to cart" button
            And the cart badge should not be shown

            Examples:
                | product      |
                | Backpack     |
                | BikeLight    |
                | BoltTShirt   |
                | FleeceJacket |
                | Onesie       |
                | RedTShirt    |

    Rule: Der Warenkorbstatus ist auf beiden Seiten gleich

        Scenario Outline: Nach dem Hinzufügen von <product> zum Warenkorb auf der Produktseite wird auf der Detailseite "Remove" angezeigt
            When I click on the "Add to cart" button for the product "<product>"
            And I open the product "<product>"
            Then the product details page should have a "Remove" button
            And the cart badge should show 1

            Examples:
                | product   |
                | Backpack  |
                | RedTShirt |

        Scenario Outline: Nach dem Hinzufügen von <product> zum Warenkorb auf der Detailseite wird auf der Produktseite "Remove" angezeigt
            When I open the product "<product>"
            And I click on the "Add to cart" button on the product details page
            And I go back to the products
            Then I should be on the "inventory" page
            And the products should have a "Remove" button:
                | product   |
                | <product> |
            And the cart badge should show 1

            Examples:
                | product   |
                | Backpack  |
                | RedTShirt |