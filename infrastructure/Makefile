# ============================================================
# AquaGuard — Makefile
# Shortcuts cho Docker Compose commands
# Run from project root: make -f infrastructure/Makefile <target>
# Or from infrastructure/: make <target>
# ============================================================

# Docker compose file path (works from infrastructure/ directory)
DC := docker compose
DC_PROD := docker compose -f docker-compose.prod.yml
DC_REFACTOR := docker compose -f docker-compose.refactor.yml
DC_REFACTOR_PROD := docker compose -f docker-compose.refactor.prod.yml

.PHONY: help dev up down build logs restart clean \
        logs-fe logs-be logs-db \
        shell-fe shell-be shell-db \
        db-reset db-psql \
        prod prod-down prod-logs \
        r-dev r-up r-down r-build r-logs r-shell-be r-prod r-prod-down r-prod-logs

# ── Default: show help ──
help: ## Hiển thị danh sách commands
	@echo ""
	@echo "🌊 AquaGuard — Docker Commands"
	@echo "================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================
# 🚀 Development
# ============================================================

dev: ## Khởi chạy development (build + start)
	$(DC) up --build

up: ## Khởi chạy development (không build lại)
	$(DC) up

down: ## Dừng tất cả services
	$(DC) down

build: ## Build lại tất cả images
	$(DC) build

restart: ## Restart tất cả services
	$(DC) restart

# ============================================================
# 📋 Logs
# ============================================================

logs: ## Xem logs tất cả services
	$(DC) logs -f

logs-fe: ## Xem logs frontend
	$(DC) logs -f frontend

logs-be: ## Xem logs backend
	$(DC) logs -f backend

logs-db: ## Xem logs PostgreSQL
	$(DC) logs -f postgres

# ============================================================
# 🐚 Shell Access
# ============================================================

shell-fe: ## Mở shell trong frontend container
	$(DC) exec frontend sh

shell-be: ## Mở shell trong backend container
	$(DC) exec backend sh

shell-db: ## Mở shell trong PostgreSQL container
	$(DC) exec postgres sh

# ============================================================
# 🐘 Database
# ============================================================

db-psql: ## Kết nối psql vào database
	$(DC) exec postgres psql -U aquaguard -d aquaguard_db

db-reset: ## Reset database (xoá data, chạy lại init)
	$(DC) down -v
	$(DC) up --build -d

db-migrate: ## Chạy migration file (usage: make db-migrate F=009_user_locations.sql)
	@if [ -z "$(F)" ]; then echo "❌ Usage: make db-migrate F=<filename.sql>"; exit 1; fi
	$(DC) exec -T postgres psql -U aquaguard -d aquaguard_db -f /dev/stdin < ../backend/migrations/$(F)
	@echo "✅ Migration $(F) applied successfully"

# ============================================================
# 🏭 Production (VPS)
# ============================================================

prod: ## Khởi chạy production (VPS)
	$(DC_PROD) up --build -d

prod-down: ## Dừng production
	$(DC_PROD) down

prod-logs: ## Xem logs production
	$(DC_PROD) logs -f

prod-restart: ## Restart production
	$(DC_PROD) restart

# ============================================================
# 🧹 Cleanup
# ============================================================

clean: ## Dừng services + xoá volumes + images
	$(DC) down -v --rmi local
	@echo "✅ Cleaned up containers, volumes, and local images"

clean-all: ## Xoá tất cả (bao gồm cached layers)
	$(DC) down -v --rmi all
	docker system prune -f
	@echo "✅ Full cleanup complete"

# ============================================================
# 🔁 Refactored backend stack (project: aquaguard-refactor)
# Dùng song song với stack cũ — khác project name, isolated containers.
# Lưu ý: cùng dùng port 5001/5173/5433 → KHÔNG chạy đồng thời với stack cũ.
# ============================================================

r-dev: ## [refactor] Khởi chạy dev stack (build + start)
	$(DC_REFACTOR) up --build

r-up: ## [refactor] Start không build lại
	$(DC_REFACTOR) up

r-down: ## [refactor] Dừng dev stack
	$(DC_REFACTOR) down

r-build: ## [refactor] Build lại images
	$(DC_REFACTOR) build

r-logs: ## [refactor] Xem logs tất cả services
	$(DC_REFACTOR) logs -f

r-shell-be: ## [refactor] Mở shell trong backend container
	$(DC_REFACTOR) exec backend sh

r-prod: ## [refactor] Khởi chạy production
	$(DC_REFACTOR_PROD) up --build -d

r-prod-down: ## [refactor] Dừng production
	$(DC_REFACTOR_PROD) down

r-prod-logs: ## [refactor] Xem logs production
	$(DC_REFACTOR_PROD) logs -f
