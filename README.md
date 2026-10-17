# Dezimalsystem-Zählwerk

Eine deutschsprachige Lernseite zum Dezimalsystem: mechanisch animierte
Zahlenräder, Addition und Subtraktion in Schritten von 1, 10, 100 und 1000
sowie eine einblendbare Zahlen-Entdeckerleiste.

## Bedienung

- Das Zählwerk zeigt Zahlen von 0 bis 9999. Ein Klick darauf addiert 1.
- Die Rechentasten addieren oder subtrahieren den jeweiligen Stellenwert.
- Würde das Ergebnis negativ, bleibt das Zählwerk bei 0 und spielt einen
  lustigen Ton. Bei Addition über 9999 beginnt es wieder bei 0.
- Die Entdeckerleiste hat eine gleichmäßige und eine logarithmische Skala.
  Bei der logarithmischen Skala wird `log(1 + Zahl)` verwendet, damit auch
  die 0 dargestellt werden kann.
- Der blaue Punkt lässt sich mit Maus oder Finger verschieben und ändert
  dabei den Zählerstand. Mit den Pfeiltasten ändert er sich um 1, mit
  Bild auf/ab um 100. Pos1 wählt 0, Ende wählt 9999.
- Die Entdeckerleiste kann vollständig aus- und wieder eingeblendet werden.
- Beispiele zeigen unterschiedliche Einheiten und teilweise angenommene
  Werte, keine allgemeingültigen Messwerte.

## Ohne Installation öffnen

[odometer.html](./odometer.html) direkt in einem aktuellen Browser öffnen.
Es werden keine externen Skripte, Schriften oder Audiodateien geladen.

## Mit Docker bereitstellen

Voraussetzung: Docker mit Unterstützung für Linux-Container.
Die folgenden Befehle im Projektverzeichnis ausführen:

```sh
docker build --pull -t decimal-odometer:local .
docker run -d --name decimal-odometer --restart unless-stopped -p 8080:8080 decimal-odometer:local
```

Die Seite ist dann unter `http://localhost:8080/` und
`http://localhost:8080/odometer.html` erreichbar. Auf einem Server ersetzt
dessen Hostname oder IP-Adresse `localhost`. Port 8080 muss für den
gewünschten Zugriff erreichbar sein.

Das Image basiert auf `nginxinc/nginx-unprivileged:stable-alpine`.
Nginx läuft ohne Root-Rechte und liefert die statische HTML-Datei auf
Container-Port 8080 aus. Ein Backend, eine Datenbank oder Volumes sind
nicht erforderlich. Der Tag `stable-alpine` ist veränderlich; `--pull`
bezieht beim Build das aktuelle Basisimage.

### Funktion prüfen

```sh
curl --fail http://localhost:8080/
docker logs decimal-odometer
```

Zusätzlich im Browser Rechentasten, Punktverschiebung, Skalenwechsel und
Aus-/Einblenden prüfen. Der Ton benötigt eine Benutzerinteraktion und
funktionierende Audioausgabe im Browser.

### Hinter einem bestehenden Webserver

Wenn bereits ein Reverse Proxy auf dem Server läuft, den Container-Port
nur lokal veröffentlichen:

```sh
docker run -d --name decimal-odometer --restart unless-stopped -p 127.0.0.1:8080:8080 decimal-odometer:local
```

Der bestehende Webserver kann dann an `http://127.0.0.1:8080` weiterleiten.
HTTPS und Zertifikate werden am Reverse Proxy eingerichtet; der Container
selbst stellt ausschließlich HTTP bereit. Die beiden Startvarianten sind
Alternativen, nicht gleichzeitig auszuführen.

### Aktualisieren

Nach dem Abrufen neuer Änderungen:

```sh
docker build --pull -t decimal-odometer:local .
docker stop decimal-odometer
docker rm decimal-odometer
docker run -d --name decimal-odometer --restart unless-stopped -p 8080:8080 decimal-odometer:local
```

Bei Betrieb hinter einem Reverse Proxy stattdessen wieder die lokale
Portbindung `-p 127.0.0.1:8080:8080` verwenden.

Diese Anleitung startet den Container auf dem jeweiligen Docker-Host.
Sie veröffentlicht kein Image in einer Registry und richtet keinen
externen Webserver automatisch ein.
