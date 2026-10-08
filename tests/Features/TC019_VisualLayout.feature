@allUsers
Feature: Visuelles Layout
  Als Benutzer des Webshops
  möchte ich, dass sich Schaltflächen und Symbole an ihrer gewohnten Stelle befinden,
  damit ich sie ohne Suchen finden und verwenden kann.

  Das Layout jedes Benutzers wird mit dem von StandardUser verglichen,
  dessen Layout als korrekt gilt. VisualUser hat absichtlich eingebaute
  Layoutfehler. Daher wird erwartet, dass diese Szenarien für VisualUser
  fehlschlagen.

  Ziel:
    Prüfen, dass sich Schaltflächen und Symbole bei jedem Benutzer
    an derselben Stelle wie bei StandardUser befinden.

  Akzeptanzkriterien:
    - Die Menüschaltfläche, das Warenkorbsymbol, der Seitentitel und die
      Sortierauswahl haben dieselbe Position und Größe wie bei StandardUser
      (mit einer Toleranz von 3 px).
    - Auf der Warenkorbseite haben das Warenkorbsymbol sowie die Schaltflächen
      "Checkout" und "Continue Shopping" dieselbe Position und Größe
      wie bei StandardUser.

  Erwartetes Ergebnis:
    Die Tests bestehen für alle Benutzer außer VisualUser.
    Für VisualUser wird ein Fehlschlagen erwartet, da sein Warenkorbsymbol
    und seine Schaltfläche "Checkout" falsch positioniert sind
    (bekannter Fehler dieses Benutzers).

  Background:
    Given I am loggedin user
    And I should be on the "inventory" page

  Scenario: Die Elemente im Kopfbereich befinden sich auf der Produktseite an derselben Stelle
    Then the following elements should be at the same place as for "StandardUser":
      | element       |
      | menu button   |
      | cart icon     |
      | page title    |
      | sort dropdown |

  Scenario: Die Schaltflächen auf der Warenkorbseite befinden sich an derselben Stelle
    When I open the cart
    Then the following elements should be at the same place as for "StandardUser":
      | element                  |
      | cart icon                |
      | checkout button          |
      | continue shopping button |