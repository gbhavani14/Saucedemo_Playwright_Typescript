@allUsers
Feature: Bestellübersicht als PDF
    Nach Abschluss einer Bestellung lädt die Schaltfläche "Generate PDF order"
    auf der Bestellbestätigungsseite die Bestellung als PDF herunter.
    Das PDF enthält das Bestelldatum, die Lieferadresse, die bestellten Produkte
    mit ihren Preisen, die Beträge und eine Dankesnachricht.
    Es enthält keine Produkte, die nicht bestellt wurden.

    Ziel:
      Prüfen, dass das nach Abschluss einer Bestellung heruntergeladene PDF
      die korrekten Bestelldetails enthält.

    Akzeptanzkriterien:
      - Die Schaltfläche "Generate PDF order" lädt eine gültige, lesbare PDF-Datei herunter.
      - Das PDF zeigt das heutige Datum als Bestelldatum sowie den bei der
        Bestellung eingegebenen Namen und die Postleitzahl als Lieferdaten.
      - Das PDF listet jedes bestellte Produkt mit seinem Preis auf und
        enthält keine Produkte, die nicht bestellt wurden.
      - Die Artikelsumme, die Steuer und der Gesamtbetrag im PDF stimmen
        mit der Bestellübersicht überein.
      - Das PDF enthält die Dankesnachricht.

    Erwartetes Ergebnis:
      Das PDF entspricht für StandardUser der aufgegebenen Bestellung.
      Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die
      absichtlich eingebauten Fehler dieser Benutzer hin. Sie werden als
      gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

    Background:
        Given I am loggedin user
        And I am on the "inventory" page
        And I add the following products to the cart from the products page:
            | product   |
            | Backpack  |
            | BikeLight |
        And I open the cart
        And I check out with the checkout information:
            | first_name | last_name | postal_code |
            | John       | Doe       | 67059       |
        And I finish the order
        And the order should be completed

    Scenario: Das Bestell-PDF enthält die Bestelldetails, die Produkte und die Beträge
        When I download the order PDF
        Then the PDF should be a valid PDF file
        And the PDF should show today as the order date
        And the PDF should ship to "John Doe" with postal code "67059"
        And the PDF should contain the added products with their prices
        And the PDF should contain the same totals as the checkout overview
        And the PDF should contain the text "Thank you for your order! It has been dispatched, and will arrive just as fast as the pony can get there."

    Scenario: Das Bestell-PDF enthält nur die bestellten Produkte
        When I download the order PDF
        Then the PDF should not contain the product "Onesie"
        And the PDF should not contain the product "FleeceJacket"