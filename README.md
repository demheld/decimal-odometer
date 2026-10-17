# Dezimalsystem-Zählwerk

Eine deutschsprachige Lernseite zum Dezimalsystem: mechanisch animierte
Zahlenräder sowie Addition und Subtraktion in Schritten von 1, 10, 100
und 1000.

## Bedienung

- Das Zählwerk zeigt Zahlen von 0 bis 9999. Ein Klick darauf addiert 1.
- Die kleine runde Taste ▶ neben dem Zählwerk startet das automatische
  Zählen: Nach einer Sekunde und anschließend jede Sekunde wird 1 addiert.
  Während des Zählens zeigt sie ❚❚ und hält es bei erneutem Tippen an.
  „Zurücksetzen“ stoppt das automatische Zählen, verwirft noch wartende
  Schritte und setzt den Wert auf 0.
  Die Rechentasten bleiben während des Zählens bedienbar.
  In Hintergrund-Tabs kann der Browser die Zeitabstände verlängern.
- Die Rechentasten addieren oder subtrahieren den jeweiligen Stellenwert.
- Schnelle Klicks gehen nicht verloren und überspringen keine Animation:
  Sie werden gesammelt und nacheinander ausgeführt, höchstens ein Schritt
  pro Drehung der Zahlenräder (420 ms).
- Mit „Schrittweise zählen“ wird jede Rechentaste in Einerschritten mit
  derselben Geschwindigkeit ausgeführt: +10 zählt also zehnmal +1
  (etwa 4 Sekunden), +1000 dauert entsprechend rund 7 Minuten. Das
  Einerrad läuft dabei gleichmäßig durch, ohne bei jeder Zahl anzuhalten;
  nur am Anfang beschleunigt und am Ende bremst es. Das gilt auch für
  gesammelte schnelle Klicks mit derselben Taste.
- Würde das Ergebnis negativ, bleibt das Zählwerk bei 0 und spielt einen
  lustigen Ton. Bei Addition über 9999 beginnt es wieder bei 0.

### Blick ins Getriebe

Unter dem Zählwerk zeigt eine Seitenansicht die Mechanik dahinter. Die
runde Taste ⚙ neben ▶ blendet sie aus und wieder ein. Die Zahnräder drehen
sich synchron mit den Zahlenrädern:

- Jedes Zahlenrad hat einen Zahnkranz und genau einen rosa Mitnehmer.
- Zwischen zwei Rädern sitzt ein kleines Zwischenrad. Es greift immer in
  den Zahnkranz des linken (höheren) Rades.
- Der Mitnehmer des rechten Rades erreicht das Zwischenrad nur beim
  Schritt von 9 auf 0. Dann schiebt er es eine Vierteldrehung weiter, und
  das linke Rad dreht sich um genau eine Ziffer: 10 Einer werden zu
  1 Zehner. Das Zwischenrad leuchtet dabei rosa und zeigt „+1“.
- Beim Rückwärtszählen von 0 auf 9 läuft derselbe Vorgang rückwärts und
  zeigt „−1“.
- Bei 9999 + 1 gibt es kein fünftes Rad; das Zählwerk beginnt bei 0.

### Zahlen-Entdeckerleiste (derzeit ausgeblendet)

Der Code für die Entdeckerleiste ist noch in [odometer.html](./odometer.html)
enthalten, die Taste „Entdeckerleiste einblenden“ ist aber per `hidden`
ausgeblendet. Zum Reaktivieren das Attribut `hidden` an der Taste mit
`id="toggleScaleBtn"` entfernen.

- Die Entdeckerleiste hat eine gleichmäßige und eine logarithmische Skala.
  Bei der logarithmischen Skala wird `log(1 + Zahl)` verwendet, damit auch
  die 0 dargestellt werden kann.
- Der blaue Punkt lässt sich mit Maus oder Finger verschieben und ändert
  dabei den Zählerstand sofort (wartende Schritte werden verworfen). Mit
  den Pfeiltasten ändert er sich um 1, mit Bild auf/ab um 100. Pos1 wählt
  0, Ende wählt 9999.
- Die Entdeckerleiste steht unter dem Zähler und ist beim Laden ausgeblendet.
  Mit „Entdeckerleiste einblenden“ bzw. „Entdeckerleiste ausblenden“ wird
  ihre Sichtbarkeit umgeschaltet; der Zählerstand bleibt erhalten.
- Beispiele zeigen unterschiedliche Einheiten und teilweise angenommene
  Werte, keine allgemeingültigen Messwerte.

## Ohne Installation öffnen

[odometer.html](./odometer.html) direkt in einem aktuellen Browser öffnen.
Es werden keine externen Skripte, Schriften oder Audiodateien geladen.

## Auf einem Server bereitstellen (deploy.sh)

Voraussetzung auf dem Server: `git`, Docker mit Compose-Plugin und
Lesezugriff auf das private Repository (z. B. per SSH-Deploy-Key oder
Personal Access Token).

Einmalig klonen, `docker-compose.yml` anlegen (siehe
[Mit Docker Compose bereitstellen](#mit-docker-compose-bereitstellen))
und starten:

```sh
git clone git@github.com:demheld/decimal-odometer.git
cd decimal-odometer
# docker-compose.yml anlegen
chmod +x deploy.sh   # nur falls das Ausführungsrecht fehlt
./deploy.sh
```

Für jede spätere Aktualisierung im Projektverzeichnis erneut
`./deploy.sh` ausführen. Das Skript

1. holt den Branch `main` (anderer Branch über `DEPLOY_BRANCH=<name>`)
   und aktualisiert ihn per Fast-Forward; lokale Änderungen oder
   abweichende Historie brechen das Skript ab,
2. baut das Image mit `docker compose build --pull` neu,
3. startet den Container mit `docker compose up -d --remove-orphans`
   (ersetzt ihn nur, wenn sich das Image oder die Konfiguration geändert hat),
4. zeigt den Status mit `docker compose ps`.

Die Portbindung lässt sich mit der Beispiel-`docker-compose.yml` auch hier
über `ODOMETER_PORT` setzen, z. B.
`ODOMETER_PORT=127.0.0.1:8080 ./deploy.sh` hinter einem Reverse Proxy
(siehe unten).

## Mit Docker Compose bereitstellen

`docker-compose.yml` ist absichtlich nicht im Repository (siehe
[.gitignore](./.gitignore)), damit jeder Server eine eigene Konfiguration
behalten kann, die `git pull` und `deploy.sh` nicht überschreiben.
Die Datei im Projektverzeichnis anlegen, zum Beispiel:

```yaml
services:
  decimal-odometer:
    build: .
    image: decimal-odometer:local
    container_name: decimal-odometer
    restart: unless-stopped
    ports:
      - "${ODOMETER_PORT:-8080}:8080"
```

Voraussetzung: Docker mit Compose-Plugin (`docker compose`) und
Unterstützung für Linux-Container. Im Projektverzeichnis ausführen:

```sh
docker compose up -d --build
```

Mit diesem Beispiel baut Compose das Image `decimal-odometer:local` aus dem
[Dockerfile](./Dockerfile), startet den Container `decimal-odometer` mit
`restart: unless-stopped` und veröffentlicht ihn auf Host-Port 8080.
Die Seite ist dann unter `http://localhost:8080/` erreichbar.

Die Portbindung wird über die Umgebungsvariable `ODOMETER_PORT` gesteuert
(Standard: `8080`). Beispiele, alternativ in einer `.env`-Datei neben
`docker-compose.yml`:

```sh
ODOMETER_PORT=8081 docker compose up -d --build            # anderer Host-Port
ODOMETER_PORT=127.0.0.1:8080 docker compose up -d --build  # nur lokal, für Reverse Proxy
```

Weitere Befehle:

```sh
docker compose ps                 # Status
docker compose logs -f            # Logs
git pull && docker compose up -d --build   # aktualisieren
docker compose down               # stoppen und Container entfernen
```

## Mit Docker bereitstellen (ohne Compose)

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

Zusätzlich im Browser Rechentasten, schnelle Mehrfachklicks und
„Schrittweise zählen“ prüfen. Der Ton benötigt eine Benutzerinteraktion und
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

Compose, `deploy.sh` und `docker run` verwenden denselben Containernamen
`decimal-odometer`. Einen per `docker run` gestarteten Container vor dem
Wechsel zu Compose mit `docker rm -f decimal-odometer` entfernen.

Diese Anleitung startet den Container auf dem jeweiligen Docker-Host.
Sie veröffentlicht kein Image in einer Registry und richtet keinen
externen Webserver automatisch ein.
