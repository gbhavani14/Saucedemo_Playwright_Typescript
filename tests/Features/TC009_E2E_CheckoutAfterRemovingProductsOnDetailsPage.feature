@allUsers
Feature: Bestellung nach dem Entfernen von Produkten auf ihren Produktdetailseiten
    Produkte, die auf der Produktseite hinzugefügt wurden, können auf ihren
    Produktdetailseiten wieder entfernt werden. Entfernte Produkte verschwinden
    aus dem Warenkorb und sind nicht Teil der Bestellung.

    Ziel:
      Prüfen, dass Produkte, die auf ihren Produktdetailseiten entfernt werden,
      aus dem Warenkorb und aus der Bestellung entfernt werden.

    Akzeptanzkriterien:
      - Nach dem Entfernen auf der Produktdetailseite zeigt die Schaltfläche
        wieder "Add to cart" an und die angezeigte Anzahl im Warenkorb sinkt.
      - Entfernte Produkte erscheinen weder im Warenkorb noch in der
        Bestellübersicht und werden bei der Berechnung der Bestellbeträge
        nicht berücksichtigt.
      - Wenn alle Produkte entfernt werden, ist der Warenkorb leer und
        die Warenkorbanzeige wird ausgeblendet.

    Erwartetes Ergebnis:
      Der Warenkorb und die Bestellung enthalten für StandardUser nur die
      verbleibenden Produkte. Fehler bei ProblemUser, ErrorUser oder VisualUser
      weisen auf die absichtlich eingebauten Fehler dieser Benutzer hin.
      Sie werden als gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page
        And I add the following products to the cart from the products page:
            | product    |
            | Backpack   |
            | BikeLight  |
            | BoltTShirt |

    Scenario: Eines von mehreren Produkten vor der Bestellung auf seiner Produktdetailseite entfernen
        When I remove the product "BikeLight" on its details page
        Then the product details page should have an "Add to cart" button
        And the cart badge should show 2
        When I go back to the products
        Then the products should have a "Remove" button:
            | product    |
            | Backpack   |
            | BoltTShirt |
        And the products should have an "Add to cart" button:
            | product   |
            | BikeLight |
        When I open the cart
        Then the cart should show the added products with the same details
        When I check out with the checkout information:
            | first_name | last_name | postal_code |
            | John       | Doe       | 67059       |
        Then the checkout overview should show the added products with the same details
        And the checkout overview should show the correct totals
        When I finish the order
        Then the order should be completed

    Scenario: Das Entfernen aller Produkte auf ihren Produktdetailseiten leert den Warenkorb
        When I remove the product "Backpack" on its details page
        And I go back to the products
        And I remove the product "BikeLight" on its details page
        And I go back to the products
        And I remove the product "BoltTShirt" on its details page
        Then the cart badge should not be shown
        When I open the cart
        Then the cart should be empty