# ============================================================
# AquaGuard — Makefile
# Shortcuts cho Docker Compose commands
# Usage: make <target>
# ============================================================

.PHONY: help dev up down build logs restart clean \
        logs-fe logs-be logs-db \
        shell-fe shell-be shell-db \
        db-reset db-psql \
        prod prod-down prod-logs

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
	docker compose up --build

up: ## Khởi chạy development (không build lại)
	docker compose up

down: ## Dừng tất cả services
	docker compose down

build: ## Build lại tất cả images
	docker compose build

restart: ## Restart tất cả services
	docker compose restart

# ============================================================
# 📋 Logs
# ============================================================

logs: ## Xem logs tất cả services
	docker compose logs -f

logs-fe: ## Xem logs frontend
	docker compose logs -f frontend

logs-be: ## Xem logs backend
	docker compose logs -f backend

logs-db: ## Xem logs PostgreSQL
	docker compose logs -f postgres

# ============================================================
# 🐚 Shell Access
# ============================================================

shell-fe: ## Mở shell trong frontend container
	docker compose exec frontend sh

shell-be: ## Mở shell trong backend container
	docker compose exec backend sh

shell-db: ## Mở shell trong PostgreSQL container
	docker compose exec postgres sh

# ============================================================
# 🐘 Database
# ============================================================

db-psql: ## Kết nối psql vào database
	docker compose exec postgres psql -U aquaguard -d aquaguard_db

db-reset: ## Reset database (xoá data, chạy lại init)
	docker compose down -v
	docker compose up --build -d

# ============================================================
# 🏭 Production (VPS)
# ============================================================

prod: ## Khởi chạy production (VPS)
	docker compose -f docker-compose.prod.yml up --build -d

prod-down: ## Dừng production
	docker compose -f docker-compose.prod.yml down

prod-logs: ## Xem logs production
	docker compose -f docker-compose.prod.yml logs -f

prod-restart: ## Restart production
	docker compose -f docker-compose.prod.yml restart

# ============================================================
# 🧹 Cleanup
# ============================================================

clean: ## Dừng services + xoá volumes + images
	docker compose down -v --rmi local
	@echo "✅ Cleaned up containers, volumes, and local images"

clean-all: ## Xoá tất cả (bao gồm cached layers)
	docker compose down -v --rmi all
	docker system prune -f
	@echo "✅ Full cleanup complete"
