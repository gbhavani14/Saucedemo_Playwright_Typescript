Feature: Produkte sortieren
    Angemeldete Benutzer können die Produkte auf der Produktseite nach Name und Preis sortieren.
    Die Sortierung ändert nur die Reihenfolge:
    Alle Produkte bleiben sichtbar und ihre Funktionen bleiben erhalten.

    Ziel:
      Prüfen, dass Produkte nach Name und Preis sortiert werden können
      und die Sortierung weder die Produktdaten noch den Warenkorb verändert.

    Akzeptanzkriterien:
      - Die Standardsortierung ist Name (A bis Z).
      - Die Dropdown-Liste bietet genau diese Optionen:
        "Name (A to Z)", "Name (Z to A)", "Price (low to high)"
        und "Price (high to low)".
      - Jede Option sortiert die Produkte korrekt.
        Preise werden als Zahlen verglichen und alle 6 Produkte bleiben sichtbar.
      - Produkte im Warenkorb behalten nach der Sortierung ihren "Remove"-Button.
        Die Artikelanzahl am Warenkorbsymbol bleibt korrekt.

    Erwartetes Ergebnis:
      Alle Sortieroptionen funktionieren für StandardUser.
      Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die absichtlich
      eingebauten Anwendungsfehler dieser Benutzer hin und werden als gefundene
      Fehler gemeldet, nicht als Fehler des Testframeworks.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page

    Rule: Die Dropdown-Liste zur Sortierung bietet alle Sortieroptionen.

        Scenario: Produkte werden standardmäßig nach Name von A bis Z sortiert
            Then the sort dropdown should show "Name (A to Z)"
            And the products should be sorted by name ascending

        Scenario: Die Dropdown-Liste zur Sortierung bietet vier Sortieroptionen
            Then the sort dropdown should have the following options:
                | Name (A to Z)       |
                | Name (Z to A)       |
                | Price (low to high) |
                | Price (high to low) |

    @allUsers
    Rule: Die Sortierung ordnet die Produkte korrekt an

        Scenario Outline: Produkte nach <sort_option> sortieren
            When I sort the products by "<sort_option>"
            Then the sort dropdown should show "<sort_option>"
            And the products should be sorted by <sort_order>
            And 6 products should be shown

            Examples:
                | sort_option         | sort_order       |
                | Name (A to Z)       | name ascending   |
                | Name (Z to A)       | name descending  |
                | Price (low to high) | price ascending  |
                | Price (high to low) | price descending |

        Scenario: Eine erneute Sortierung ersetzt die vorherige Reihenfolge
            When I sort the products by "Price (high to low)"
            And I sort the products by "Name (A to Z)"
            Then the sort dropdown should show "Name (A to Z)"
            And the products should be sorted by name ascending

    Rule: Die Sortierung hat keinen Einfluss auf den Warenkorb

        Scenario: Das erste Produkt nach der Sortierung kann zum Warenkorb hinzugefügt werden
            When I sort the products by "Price (low to high)"
            And I click on the "Add to cart" button for the first product
            Then the products should have a "Remove" button:
                | product |
                | Onesie  |
            And the cart badge should show 1

        Scenario: Produkte im Warenkorb behalten nach der Sortierung ihren "Remove"-Button
            When I click on the "Add to cart" button for the following products:
                | product  |
                | Backpack |
            And I sort the products by "Price (high to low)"
            Then the products should have a "Remove" button:
                | product  |
                | Backpack |
            And the cart badge should show 1