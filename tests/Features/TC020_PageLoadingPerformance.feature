@allUsers
Feature: Ladegeschwindigkeit der Seiten
  Als Benutzer des Sauce Demo-Webshops
  möchte ich, dass die Seiten innerhalb einer akzeptablen Zeit laden,
  damit ich meinen Einkauf ohne unnötige Wartezeiten abschließen kann.

  Ziel:
    Prüfen, dass die Anmeldung und die wichtigsten Shopseiten für jeden
    Benutzertyp innerhalb der akzeptierten Toleranz im Vergleich zum
    Referenzbenutzer StandardUser laden.

  Akzeptanzkriterien:
    - Ladezeit <= 2 x Ladezeit von StandardUser + 1000 ms Zeitpuffer.
    - Beide Zeiten werden im selben Testlauf unter identischen
      Bedingungen gemessen.
    - Die gemessenen Zeiten werden jedem Schritt im Cucumber-HTML-Bericht
      als Anhang hinzugefügt.

  Erwartetes Ergebnis:
    Die Tests bestehen für alle Benutzer außer PerformanceGlitchUser.
    Für PerformanceGlitchUser wird ein Fehlschlagen erwartet, da er einen
    absichtlich eingebauten Performancefehler hat (verzögerte Anmeldung).

  Scenario: Die Antwortzeit bei der Anmeldung liegt innerhalb der akzeptierten Toleranz
    When I log in and measure the loading time
    Then the loading time should be at most 2 times the loading time of "StandardUser"

  Scenario Outline: Die Ladezeit der Seite <page> liegt innerhalb der akzeptierten Toleranz
    Given I am loggedin user
    When I open the "<page>" page and measure the loading time
    Then the loading time should be at most 2 times the loading time of "StandardUser"

    Examples:
      | page      |
      | inventory |
      | cart      |