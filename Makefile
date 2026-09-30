up:
	docker compose up -d --build

logs:
	docker compose logs -f

down:
	docker compose down

commands:
	docker compose run --rm bot pnpm commands

.PHONY: up logs down commands
