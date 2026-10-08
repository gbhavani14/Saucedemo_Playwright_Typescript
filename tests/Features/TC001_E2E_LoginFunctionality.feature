Feature: Anmeldefunktion
  Als registrierter Benutzer des Sauce-Demo-Webshops möchte ich mich
  mit meinem Benutzernamen und Passwort anmelden,
  damit ich Produkte ansehen und Bestellungen aufgeben kann.

  Gültige Benutzer werden nach der Anmeldung zur Produktseite weitergeleitet.
  Bei gesperrten Benutzern, falschen Zugangsdaten oder leeren Pflichtfeldern
  wird die Anmeldung mit einer klaren Fehlermeldung abgelehnt.
  Der Benutzer bleibt auf der Anmeldeseite.

  Ziel:
    Prüfen, dass sich nur gültige, aktive Benutzer anmelden können
    und bei jeder abgelehnten Anmeldung die passende Fehlermeldung erscheint.

  Akzeptanzkriterien:
    - Jeder gültige Benutzer aus loginCredentials.json wird zur Produktseite weitergeleitet.
    - Die Anmeldung wird bei einem gesperrten Benutzer, einem falschen Passwort,
      einem leeren Benutzernamen oder einem leeren Passwort abgelehnt.
    - Jede abgelehnte Anmeldung zeigt die entsprechende Fehlermeldung.
      Der Benutzer bleibt auf der Anmeldeseite.
    - Die Zugangsdaten werden aus tests/TestData/loginCredentials.json gelesen
      und niemals direkt in der Feature-Datei hinterlegt.

  Erwartetes Ergebnis:
    Alle gültigen Benutzer können sich erfolgreich anmelden.
    Alle ungültigen Anmeldeversuche werden mit der richtigen Fehlermeldung abgelehnt.

    Background:
        Given I am on the "login" page

    Scenario Outline: Erfolgreiche Anmeldung
        When I login as "<user>"
        Then I should be redirected to the "inventory" page

        Examples:
            | user                  |
            | StandardUser          |
            | ProblemUser           |
            | PerformanceGlitchUser |
            | ErrorUser             |
            | VisualUser            |

    Scenario Outline: Fehlgeschlagene Anmeldung
        When I login as "<user>"
        Then I should see the error message "<error_message>"
        And I should be on the "login" page

        Examples:
            | user          | error_message                                                |
            | LockedOutUser | Sorry, this user has been locked out                         |
            | InvalidUser   | Username and password do not match any user in this service  |
            | EmptyUsername | Username is required                                         |
            | EmptyPassword | Password is required                                         |