# Banco di prova — comandi di sviluppo, verifica, Docker e pubblicazione. `make` elenca i target.
SHELL := /bin/bash
.DEFAULT_GOAL := help
NODE = source $$HOME/.nvm/nvm.sh; nvm use >/dev/null;
PORTA = $${DOCKER_PORT:-8803}

.PHONY: help install dev compila build play test test-difetti test-e2e test-all docker-build up rebuild down restart logs ps shell open image-size clean distclean
help: ## Elenca i comandi disponibili
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
install: ## Installa le dipendenze bloccate nel lockfile con Node 26
	@$(NODE) npm ci
dev: ## Vite con ricarica sulla 5183 (http://localhost:5183)
	@$(NODE) npm run dev
compila: ## Controlla TypeScript e genera il sito in dist/ (senza Docker)
	@$(NODE) npm run build
play: compila ## Avvia il gioco senza Docker sulla porta 8803
	@$(NODE) npm start
test: ## Prove del modello con valori noti (unità, antenna, linea, accordo, propagazione, missioni)
	@$(NODE) npm test
test-difetti: ## Inietta i difetti nel modello, uno alla volta, e pretende che le prove li colgano
	@$(NODE) node scripts/difetti.ts
test-e2e: compila ## Prova nel browser (Playwright, Chromium sulla GPU; Chromium senza interfaccia)
	@$(NODE) npm run test-e2e
test-all: ## Build, prove del motore, difetti iniettati e browser
	@$(NODE) npm run build && npm test && node scripts/difetti.ts && npm run test-e2e
build: ## Costruisce l'immagine Docker (make down && make build && make up, come negli altri giochi)
	docker compose build
docker-build: build ## Sinonimo di make build
# Regola vuota: make non cerca regole implicite per rigenerare i makefile.
Makefile deploy.local.mk: ;
# «make up -d» non passa -d a Docker: è il debug di make. Lo si ignora e si rilancia «make up» pulito.
ifneq ($(and $(filter-out -%,$(firstword $(MAKEFLAGS))),$(findstring d,$(firstword $(MAKEFLAGS)))),)
up:
	@echo "(-d è il debug di make, non di Docker: lo ignoro, «make up» parte già in background)"; MAKEFLAGS= $(MAKE) -s up
else
up: ## Ricostruisce e avvia il gioco in Docker (in background), attende che risponda e mostra gli indirizzi
	@docker compose up -d --build --quiet-pull
	@printf "Attendo il server"; for i in $$(seq 1 30); do \
	  v=$$(curl -s -m 2 http://localhost:$(PORTA)/api/health | sed -n 's/.*"versione":"\([^"]*\)".*/\1/p'); \
	  [ -n "$$v" ] && { echo " ✔ versione $$v"; break; }; printf "."; sleep 1; done; \
	  [ -n "$$v" ] || { echo " ✘ nessuna risposta da /api/health: guarda make logs"; exit 1; }
	@echo "Gioco locale: http://localhost:$(PORTA)"
	@for n in /sys/class/net/*; do [ -e $$n/device ] || continue; \
	  ip -4 -o addr show dev $${n##*/} scope global | awk -v p=$(PORTA) -v d=$${n##*/} '{split($$4,a,"/"); printf "Gioco in LAN: http://%s:%s  (%s)\n", a[1], p, d}'; done
endif
rebuild: ## Ricostruisce l'immagine da zero (senza cache) e riavvia: quando «make up» sembra servire roba vecchia
	docker compose build --no-cache --pull
	@$(MAKE) -s up
down: ## Arresta e rimuove il contenitore locale
	docker compose down
restart: ## Riavvia il contenitore del gioco
	docker compose restart
logs: ## Segue i messaggi del server Docker
	docker compose logs -f --tail=100
ps: ## Mostra lo stato del contenitore
	docker compose ps
shell: ## Apre una shell dentro il contenitore
	docker exec -it banco-prova sh
open: ## Apre il gioco nel browser (serve make up o make play)
	@xdg-open "http://localhost:$(PORTA)" >/dev/null 2>&1
image-size: ## Dimensione dell'immagine locale
	@docker image ls banco-prova:latest --format '{{.Repository}}:{{.Tag}}  {{.Size}}'
clean: ## Rimuove dist/ e le immagini delle prove
	rm -rf dist test-results
distclean: clean down ## clean, più contenitore e immagine locale
	-docker image rm banco-prova:latest

## ------------------------------------------------------------ pubblicazione (come gli altri giochi)
# Host, cartella, URL e immagine del VPS stanno in deploy.local.mk (fuori da git).
-include deploy.local.mk
IMAGE        ?= banco-prova
DEPLOY_DIR   ?= banco-prova
DEPLOY_IMAGE ?= git.manzolo.it/manzolo/banco-prova
DEPLOY_TMP   := $(shell mktemp -d -u /tmp/bancoprova-deploy.XXXXXX)
SMOKE_PORT   ?= 18803
# La versione dell'ultimo commit (la scrive scripts/bump.sh): il tag deve esistere e il server la espone in /api/health.
DEPLOY_VER   = v$(shell git show HEAD:package.json 2>/dev/null | sed -n 's/^  "version": "\([^"]*\)",/\1/p')

.PHONY: verify check-public hooks bump deploy deploy-logs
verify: check-public test-all ## Tutti i controlli: file pubblicabili, build, motore, difetti e browser (lo lancia make bump)
check-public: ## Prima di pubblicare: niente prompt, log di Codex, segreti o nomi della rete di casa (tutta la storia)
	bash scripts/check-public.sh
hooks: ## Attiva gli hook del repo (pre-push: check-public prima di ogni push)
	git config core.hooksPath scripts/git-hooks
	@echo "hook attivi da scripts/git-hooks: $$(ls scripts/git-hooks | tr '\n' ' ')"
bump: ## Nuova versione (PARTE=patch|minor|major): verifica, commit e tag v<versione>; poi make deploy
	scripts/bump.sh $(or $(PARTE),patch)
deploy: ## Pubblica la versione dell'ultimo commit: immagine provata qui, push sul registry, pull e riavvio sul VPS
	@test -n "$(DEPLOY_HOST)" || { echo "manca DEPLOY_HOST: scrivilo in deploy.local.mk (vedi README, «Pubblicare»)"; exit 2; }
	@git rev-parse -q --verify 'refs/tags/$(DEPLOY_VER)' >/dev/null || { echo "manca il tag $(DEPLOY_VER): prima make bump"; exit 2; }
	mkdir -p $(DEPLOY_TMP) && git archive $(DEPLOY_VER) | tar -x -C $(DEPLOY_TMP)
	docker build -q -t $(DEPLOY_IMAGE):$(DEPLOY_VER) -t $(DEPLOY_IMAGE):latest $(DEPLOY_TMP)
	@docker rm -f $(IMAGE)-prova >/dev/null 2>&1 || true
	docker run -d --rm --name $(IMAGE)-prova -p 127.0.0.1:$(SMOKE_PORT):8803 $(DEPLOY_IMAGE):$(DEPLOY_VER) >/dev/null
	@ok=1; sleep 2; for u in / /api/health /assets/ui/logo.svg; do \
	  c=$$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$(SMOKE_PORT)$$u); echo "  prova $$u → $$c"; [ "$$c" = 200 ] || ok=0; done; \
	  curl -s http://127.0.0.1:$(SMOKE_PORT)/api/health | grep -qF '"versione":"$(patsubst v%,%,$(DEPLOY_VER))"' && echo "  prova /api/health → $(DEPLOY_VER)" || ok=0; \
	  docker rm -f $(IMAGE)-prova >/dev/null; [ $$ok = 1 ] || { echo "l'immagine non risponde come deve: non la spedisco"; exit 1; }
	docker push -q $(DEPLOY_IMAGE):$(DEPLOY_VER)
	docker push -q $(DEPLOY_IMAGE):latest
	git show HEAD:docker-compose.deploy.yml | sed 's|$(DEPLOY_IMAGE):VERSIONE|$(DEPLOY_IMAGE):$(DEPLOY_VER)|' | \
	  ssh $(DEPLOY_HOST) 'mkdir -p $(DEPLOY_DIR) && cat > $(DEPLOY_DIR)/docker-compose.yml'
	ssh $(DEPLOY_HOST) 'cd $(DEPLOY_DIR) && docker compose pull -q && docker compose up -d && \
	  docker image ls $(DEPLOY_IMAGE) --format "{{.Repository}}:{{.Tag}}" | grep -v -x -e $(DEPLOY_IMAGE):$(DEPLOY_VER) | xargs -r docker image rm >/dev/null; \
	  docker image prune -f >/dev/null'
	rm -rf $(DEPLOY_TMP)
	@v='"versione":"$(patsubst v%,%,$(DEPLOY_VER))"'; \
	  for i in 1 2 3 4 5 6; do curl -s -m 8 $(DEPLOY_URL)/api/health | grep -qF "$$v" && break; sleep 2; done; \
	  curl -s -m 8 $(DEPLOY_URL)/api/health | grep -qF "$$v" && echo "✔ $(DEPLOY_URL) serve $(DEPLOY_VER)" || \
	  echo "⚠ $(DEPLOY_URL) non serve ancora $(DEPLOY_VER): manca il proxy host su NPM (→ banco-prova:8803, Let's Encrypt) o il DNS"
deploy-logs: ## Messaggi del container sul VPS
	ssh $(DEPLOY_HOST) 'cd $(DEPLOY_DIR) && docker compose logs --tail=100'
