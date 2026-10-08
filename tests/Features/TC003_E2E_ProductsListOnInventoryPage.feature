@allUsers
Feature: Produktseite
    Angemeldete Benutzer sehen den vollständigen Produktkatalog mit korrekten Angaben
    und können Produkte zum Warenkorb hinzufügen und daraus entfernen.
    Die erwarteten Produkte, Beschreibungen und Preise stehen in tests/TestData/products.json.

    Ziel:
      Prüfen, dass die Produktseite für jeden Benutzer den vollständigen
      Produktkatalog mit korrekten Angaben anzeigt.

    Akzeptanzkriterien:
      - Genau die Produkte aus products.json werden angezeigt, jeweils einmal
        und in der Standardsortierung (Name A bis Z).
      - Jedes Produkt zeigt die Beschreibung und den Preis aus products.json.
      - Jedes Produkt zeigt dasselbe Bild wie bei StandardUser,
        und alle Bilder werden geladen.
      - Jedes Produkt hat einen "Add to cart"-Button,
        der nach dem Anklicken zu "Remove" wechselt.

    Erwartetes Ergebnis:
      Alle Prüfungen sind für StandardUser erfolgreich.
      Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die absichtlich
      eingebauten Anwendungsfehler dieser Benutzer hin und werden als gefundene
      Fehler gemeldet, nicht als Fehler des Testframeworks.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page

    Scenario: Prüfen, dass alle Produkte auf der Produktseite angezeigt werden
        Then I should see the title of the page "Products"
        And all products from the product list should be shown

    Scenario: Prüfen, dass jedes Produkt die korrekte Produktbeschreibung anzeigt
        Then every product should show the description from the product list

    Scenario: Prüfen, dass jedes Produkt den korrekten Preis anzeigt
        Then every product should show the price from the product list

    Scenario: Prüfen, dass jedes Produkt dasselbe Bild wie bei StandardUser anzeigt
        Then every product should show the same image as for "StandardUser"

    Scenario: Prüfen, dass jedes Produkt einen "Add to cart"-Button hat
        Then every product from the product list should have an "Add to cart" button

    Scenario: Prüfen, dass jedes Produkt nach dem Hinzufügen zum Warenkorb einen "Remove"-Button hat
        When I click on the "Add to cart" button for every product from the product list
        Then every product from the product list should have a "Remove" button