Feature: Zugriffskontrolle für geschützte Webshop-Seiten
    Geschützte Seiten können nur von angemeldeten Benutzern geöffnet werden.
    Nicht angemeldete Besucher und Benutzer mit gesperrten Konten
    werden mit einer Erklärung zur Anmeldeseite weitergeleitet.

    Ziel:
      Prüfen, dass nur angemeldete Benutzer die geschützten Shop-Seiten öffnen können.

    Akzeptanzkriterien:
      - Ohne Anmeldung wird jeder Zugriff auf eine geschützte Seite
        zur Anmeldeseite weitergeleitet. Dabei erscheint die Fehlermeldung
        "You can only access '/<page>' when you are logged in".
      - Ein gesperrter Benutzer kann sich nicht anmelden
        und keine geschützte Seite öffnen.
      - Jeder angemeldete Benutzer kann jede geschützte Seite
        ohne Fehlermeldung öffnen.

    Erwartetes Ergebnis:
      Nicht angemeldeten Besuchern und gesperrten Benutzern wird der Zugriff verweigert.
      Allen angemeldeten Benutzern wird der Zugriff gewährt.

    Rule: Nicht angemeldete Besucher können keine geschützten Seiten öffnen

        Scenario Outline: Öffnen der Seite <page> ohne Anmeldung
            When I try to open the "<page>" page
            Then I should be redirected to the "login" page
            And I should see the error message "You can only access '/<path>' when you are logged in"

            Examples:
                | page              | path                    |
                | inventory         | inventory.html          |
                | cart              | cart.html               |
                | checkout_step_one | checkout-step-one.html  |
                | checkout_step_two | checkout-step-two.html  |
                | checkout_complete | checkout-complete.html  |

    Rule: Gesperrte Benutzer können sich nicht anmelden und keine geschützten Seiten öffnen

        Background:
            Given I am on the "login" page
            When I login as "LockedOutUser"

        Scenario: Gesperrter Benutzer sieht bei der Anmeldung eine Fehlermeldung
            Then I should see the error message "Sorry, this user has been locked out"
            And I should be redirected to the "login" page

        Scenario Outline: Gesperrter Benutzer kann die Seite <page> nicht öffnen
            When I try to open the "<page>" page
            Then I should be redirected to the "login" page
            And I should see the error message "You can only access '/<path>' when you are logged in"

            Examples:
                | page              | path                    |
                | inventory         | inventory.html          |
                | cart              | cart.html               |
                | checkout_step_one | checkout-step-one.html  |
                | checkout_step_two | checkout-step-two.html  |
                | checkout_complete | checkout-complete.html  |

    @allUsers
    Rule: Angemeldete Benutzer können geschützte Seiten öffnen

        Background:
            Given I am loggedin user

        Scenario Outline: Angemeldeter Benutzer kann die Seite <page> öffnen
            When I try to open the "<page>" page
            Then I should be on the "<page>" page
            And I should not see an error message

            Examples:
                | page              |
                | inventory         |
                | cart              |
                | checkout_step_one |
                | checkout_step_two |
                | checkout_complete |