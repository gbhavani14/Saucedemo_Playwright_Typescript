@allUsers
Feature: Mehrere Produkte bestellen
    Mehrere Produkte können in einer Bestellung gekauft werden. Der Warenkorb
    und die Bestellübersicht zeigen alle Produkte an. Die Artikelsumme,
    die Steuer und der Gesamtbetrag werden korrekt berechnet.

    Ziel:
      Prüfen, dass mehrere Produkte gemeinsam bestellt werden können und
      die Beträge korrekt berechnet werden.

    Akzeptanzkriterien:
      - Die Warenkorbanzeige zeigt die Anzahl der hinzugefügten Produkte.
      - Der Warenkorb und die Bestellübersicht zeigen alle hinzugefügten
        Produkte mit denselben Details an.
      - Die Artikelsumme entspricht der Summe der Produktpreise.
        Die Steuer beträgt 8 % der Artikelsumme, mit einer Toleranz von 1 Cent.
        Der Gesamtbetrag entspricht der Artikelsumme zuzüglich der Steuer.
      - Ein im Warenkorb entferntes Produkt ist nicht Teil der Bestellung.

    Erwartetes Ergebnis:
      Bestellungen mit drei Produkten, mit allen Produkten und mit einer
      reduzierten Produktauswahl werden für StandardUser erfolgreich abgeschlossen.
      Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die
      absichtlich eingebauten Fehler dieser Benutzer hin. Sie werden als
      gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page

    Scenario: Drei Produkte bestellen
        When I add the following products to the cart from the products page:
            | product   |
            | Backpack  |
            | BikeLight |
            | Onesie    |
        Then the cart badge should show 3
        When I open the cart
        Then the cart should show the added products with the same details
        When I check out with the checkout information:
            | first_name | last_name | postal_code |
            | John       | Doe       | 67059       |
        Then the checkout overview should show the added products with the same details
        And the checkout overview should show the correct totals
        When I finish the order
        Then the order should be completed

    Scenario: Alle Produkte bestellen
        When I add all products to the cart from the products page
        Then the cart badge should show 6
        When I open the cart
        Then the cart should show the added products with the same details
        When I check out with the checkout information:
            | first_name | last_name | postal_code |
            | John       | Doe       | 67059       |
        Then the checkout overview should show the added products with the same details
        And the checkout overview should show the correct totals
        When I finish the order
        Then the order should be completed

    Scenario: Ein im Warenkorb entferntes Produkt ist nicht Teil der Bestellung
        When I add the following products to the cart from the products page:
            | product    |
            | Backpack   |
            | BikeLight  |
            | BoltTShirt |
        And I open the cart
        And I remove the product "BikeLight" from the cart
        Then the cart should show the added products with the same details
        And the cart badge should show 2
        When I check out with the checkout information:
            | first_name | last_name | postal_code |
            | John       | Doe       | 67059       |
        Then the checkout overview should show the added products with the same details
        And the checkout overview should show the correct totals
        When I finish the order
        Then the order should be completed