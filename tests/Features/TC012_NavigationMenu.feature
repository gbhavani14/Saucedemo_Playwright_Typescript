@allUsers
Feature: Navigationsmenü
    Das Menü im Kopfbereich ist nach der Anmeldung auf jeder Seite verfügbar
    und zeigt All Items, Dynamic Catalog, About, Logout und Reset App State an.

    Ziel:
      Prüfen, dass das Navigationsmenü auf jeder Shopseite verfügbar ist
      und alle Menüpunkte anzeigt.

    Akzeptanzkriterien:
      - Das Menü lässt sich auf der Produktseite, im Warenkorb und auf
        allen Seiten des Bestellvorgangs öffnen.
      - Es zeigt genau diese Menüpunkte an: All Items, Dynamic Catalog,
        About, Logout, Reset App State.
      - Das Menü lässt sich auf jeder Seite wieder schließen.

    Erwartetes Ergebnis:
      Das Menü funktioniert auf allen Seiten für alle Benutzer.

    Background:
        Given I am loggedin user

    Scenario Outline: Das Menü zeigt auf der Seite <page> alle Menüpunkte an
        Given I am on the "<page>" page
        When I open the menu
        Then the menu should show the following items:
            | All Items       |
            | Dynamic Catalog |
            | About           |
            | Logout          |
            | Reset App State |

        Examples:
            | page              |
            | inventory         |
            | cart              |
            | checkout_step_one |
            | checkout_step_two |
            | checkout_complete |

    Scenario: Das Menü kann wieder geschlossen werden
        Given I am on the "<page>" page
        When I open the menu
        And I close the menu
        Then the menu should be closed

        Examples:
            | page              |
            | inventory         |
            | cart              |
            | checkout_step_one |
            | checkout_step_two |
            | checkout_complete |