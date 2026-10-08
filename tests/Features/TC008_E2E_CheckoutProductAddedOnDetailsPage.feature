@allUsers
Feature: Ein auf der Produktdetailseite hinzugefügtes Produkt bestellen
    Jedes Produkt, das auf seiner Produktdetailseite hinzugefügt wird,
    erscheint im Warenkorb und in der Bestellübersicht mit demselben Namen,
    derselben Beschreibung und demselben Preis wie auf der Produktdetailseite
    und kann bestellt werden.

    Ziel:
      Prüfen, dass jedes Produkt auf seiner eigenen Produktdetailseite
      hinzugefügt und bestellt werden kann.

    Akzeptanzkriterien:
      - Nach dem Hinzufügen auf der Produktdetailseite zeigt die
        Warenkorbanzeige 1 an.
      - Der Warenkorb und die Bestellübersicht zeigen das Produkt mit
        demselben Namen, derselben Beschreibung und demselben Preis
        wie auf der Produktdetailseite an.
      - Die Beträge sind korrekt und die Bestellung wird abgeschlossen.

    Erwartetes Ergebnis:
      Jedes Produkt kann für StandardUser auf diese Weise bestellt werden.
      Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die
      absichtlich eingebauten Fehler dieser Benutzer hin. Sie werden als
      gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page

    Scenario Outline: <product> bestellen, das auf seiner Produktdetailseite hinzugefügt wurde
        When I add the product "<product>" to the cart from its details page
        Then the cart badge should show 1
        When I open the cart
        Then the cart should show the added products with the same details
        When I check out with the checkout information:
            | first_name | last_name | postal_code |
            | John       | Doe       | 67059       |
        Then the checkout overview should show the added products with the same details
        And the checkout overview should show the correct totals
        When I finish the order
        Then the order should be completed

        Examples:
            | product      |
            | Backpack     |
            | BikeLight    |
            | BoltTShirt   |
            | FleeceJacket |
            | Onesie       |
            | RedTShirt    |