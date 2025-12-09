# -------- Paths --------
ROOT_DIR := $(CURDIR)
INFRA := $(ROOT_DIR)/src/infra
BACKEND := $(ROOT_DIR)/src/backend
FRONTEND := $(ROOT_DIR)/src/frontend

# -------- Infra --------
.PHONY: infra-up infra-down infra-logs

infra-up:
	docker compose -f $(INFRA)/docker-compose.yml up -d

infra-down:
	docker compose -f $(INFRA)/docker-compose.yml down -v

infra-logs:
	docker compose -f $(INFRA)/docker-compose.yml logs -f

# -------- Backend (Node.js) --------
.PHONY: backend-setup backend backend-start migrate migrate-undo migrate-create lint test backend-test

backend-setup:
	cd $(BACKEND) && npm install

backend:
	cd $(BACKEND) && npm run dev

backend-start: backend-setup backend

migrate:
	cd $(BACKEND) && npm run migrate

migrate-undo:
	cd $(BACKEND) && npm run migrate:undo

migrate-create:
	@echo "Nombre de la migración:"; \
	read name; \
	cd $(BACKEND) && npm run migrate:create -- --name $$name

lint:
	cd $(BACKEND) && npm run lint

test:
	cd $(BACKEND) && npm test

backend-test:
	@echo "Testing backend connection..."
	@curl -s http://127.0.0.1:8000/health || echo "❌ Backend not running. Run 'make backend' first."

# -------- Frontend --------
.PHONY: frontend-setup frontend

frontend-setup:
	cd $(FRONTEND) && npm install

frontend:
	cd $(FRONTEND) && npm run dev

# -------- Convenience --------
.PHONY: urls dev start-all

urls:
	@echo "Backend (Express):  http://127.0.0.1:8000"
	@echo "  - Health:         http://127.0.0.1:8000/health"
	@echo "  - Metrics:        http://127.0.0.1:8000/metrics"
	@echo "Frontend (Next.js): http://127.0.0.1:3001"
	@echo "MailHog UI:         http://127.0.0.1:8025"
	@echo "Prometheus:         http://127.0.0.1:9090"
	@echo "Grafana:            http://127.0.0.1:3000"

dev: infra-up backend-start frontend
start-all: infra-up backend-start frontend