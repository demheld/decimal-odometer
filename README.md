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
- Die Rechentasten addieren (blau) oder subtrahieren (rosa) den jeweiligen
  Stellenwert. Die blaue und die rosa Taste eines Stellenwerts sind gleich
  breit, sodass beide Reihen übereinander ausgerichtet sind.
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

Unter dem Zählwerk kann eine Seitenansicht der Mechanik eingeblendet werden.
Sie ist beim Laden ausgeblendet; die runde Taste ⚙ unter ▶ blendet sie ein
und wieder aus. Aus Platzgründen zeigt sie nur Hunderter, Zehner und Einer;
das Tausenderrad fehlt nur in dieser Ansicht. Alle Teile bewegen sich
synchron mit den Zahlenrädern. Die Ansicht hat keinen eigenen Hintergrund,
sondern dieselbe Farbe wie die übrige Seite. Ein rotes Sichtfenster links an
jedem Rad rahmt die angezeigte Ziffer ein; es ist so groß, dass der Rahmen
keine Ziffer berührt, auch nicht die Unterlängen der Georgia-Ziffern 3, 4,
5, 7 und 9.

Das Getriebe ist ein Malteserkreuz-Getriebe (Genfer Getriebe):

- Jedes Zahlenrad hat 10 blaue Speichen, jeweils zwischen zwei Ziffern, mit
  einem runden Stift am Ende.
- Jedes Zahlenrad hat außerdem einen rosa Arm genau zwischen 9 und 0, ebenfalls
  mit einem Stift am Ende. Die 9 ist rosa.
- Zwischen zwei Rädern sitzt ein grauer Stern: eine kleine Scheibe mit vier
  schmalen Schlitzen. Die Stifte des linken (höheren) Rades laufen durch
  diese Schlitze. Eine Ziffer des linken Rades dreht den Stern also um eine
  Vierteldrehung, und umgekehrt.
- Der rosa Stift des rechten Rades erreicht den Stern nur beim Schritt von
  9 auf 0. Er läuft dann von der anderen Seite durch einen Schlitz, dreht
  den Stern um eine Vierteldrehung und damit das linke Rad um genau eine
  Ziffer weiter: 10 Einer werden zu 1 Zehner. Der Stern leuchtet dabei rosa,
  und „+1“ erscheint.
- Bei 99 + 1 schiebt der rosa Stift des Zehnerrads während des Übertrags
  gleich den Stern zum Hunderter mit.
- Beim Rückwärtszählen von 0 auf 9 läuft derselbe Vorgang rückwärts und
  zeigt „−1“; anders als ein Klinkenrad funktioniert dieses Getriebe in
  beide Richtungen.
- Die Stifte sitzen genau auf dem Radius, bei dem sie unter 45° in einen
  Schlitz eintreten und wieder austreten. So schiebt ein Stift den Stern
  nie seitlich, sondern läuft sauber durch den Schlitz.
- Wie in einem echten Zählwerk liegen die Teile in zwei Ebenen: Die Stifte
  von Rad w und der rosa Stift von Rad w + 1 liegen in der Ebene des Sterns
  dazwischen. Die hintere Ebene ist heller gezeichnet. So berühren sich
  Stifte benachbarter Räder nie.
- Bei 9999 + 1 gibt es kein fünftes Rad; das Zählwerk beginnt bei 0.

Die Maße stehen als `gearDesign` in `odometer.html`, die Bewegung berechnet
der Code zwischen `// gear mechanism start` und `// gear mechanism end`.
Das Skript [tools/check-gear-mechanism.cjs](./tools/check-gear-mechanism.cjs)
führt genau diesen Code aus und prüft:

- Der Stern dreht sich pro Schritt um genau 90°, und der rosa Stift braucht
  in jedem Moment denselben Sternwinkel wie der Stift des linken Rades
  (beide bleiben in ihrem Schlitz).
- Kein Stift schneidet in einen Stern: beim Übertrag, wenn das linke Rad
  allein dreht (rechtes Rad auf jeder Ziffer) und wenn das rechte Rad allein
  von 0 bis 9 dreht.
- Stifte benachbarter Räder in derselben Ebene berühren sich nie.
- Die Sterne liegen außerhalb der Zifferblätter.

```bash
node tools/check-gear-mechanism.cjs   # muss mit "Getriebe OK" enden
```

Nach jeder Änderung an `gearDesign` oder am Mechanik-Code das Skript
ausführen.

[getriebe.svg](./getriebe.svg) ist ein statisches Einzelbild dieser
Ansicht bei 199 zum Ansehen oder Ausdrucken. Es ist aus der Seite
erzeugt, wird aber nicht ins Docker-Image kopiert und ändert sich nicht
automatisch mit, wenn das Getriebe in `odometer.html` angepasst wird.

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
