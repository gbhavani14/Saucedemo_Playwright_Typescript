@allUsers
Feature: Menüpunkt Dynamic Catalog
  Als angemeldeter Benutzer
  möchte ich den Produktkatalog über das Menü in verschiedenen Ansichten öffnen,
  damit ich Produkte mit Lazy Load, einem Ladeindikator oder einem Slider
  ansehen kann.

  Ziel:
    Die drei Dynamic Catalog-Ansichten prüfen: Lazy Load, Spinner und Slider.

  Akzeptanzkriterien:
    - Der Menüpunkt Dynamic Catalog bietet Lazy Load, Spinner und Slider an.
    - Jede Ansicht zeigt Produkte an.
    - Lazy Load lädt die übrigen Produkte beim Scrollen nach unten.
    - Spinner zeigt einen Ladeindikator an, bevor die Produkte erscheinen.
    - Slider zeigt für jedes Produkt aus products.json einen Punkt an.
      Die Auswahl eines Punktes zeigt das zugehörige Produkt an.

  Erwartetes Ergebnis:
    Alle Ansichten funktionieren für StandardUser.
    Fehler bei ProblemUser, ErrorUser oder VisualUser weisen auf die
    absichtlich eingebauten Fehler dieser Benutzer hin. Sie werden als
    gefundene Bugs und nicht als Fehler des Testframeworks gemeldet.

  Background:
    Given I am loggedin user
    And I should be on the "inventory" page

  Scenario: Dynamic Catalog zeigt seine drei Katalogtypen an
    When I click on the "Dynamic Catalog" menu item
    Then the "Dynamic Catalog" menu item should show the following options:
      | name      |
      | Lazy Load |
      | Spinner   |
      | Slider    |

  Scenario Outline: Der Katalog vom Typ <type> zeigt die Produkte an
    When I open the "<type>" dynamic catalog
    Then the dynamic catalog should show products

    Examples:
      | type      |
      | Lazy Load |
      | Spinner   |
      | Slider    |

  Scenario: Lazy Load lädt die übrigen Produkte beim Scrollen nach unten
    When I open the "Lazy Load" dynamic catalog
    Then the remaining products should be loaded after scrolling down

  Scenario: Während die Produkte geladen werden, wird ein Spinner angezeigt
    When I open the "Spinner" dynamic catalog
    Then a loading spinner should be shown before the products

  Scenario: Der Slider hat für jedes Produkt einen Punkt
    When I open the "Slider" dynamic catalog
    Then the slider should have a dot for every product from the product list

  Scenario Outline: Die Auswahl von <product> im Slider zeigt das Produkt an
    When I open the "Slider" dynamic catalog
    And I select "<product>" in the slider
    Then the slider should show "<product>"

    Examples:
      | product   |
      | Backpack  |
      | Onesie    |
      | RedTShirt |