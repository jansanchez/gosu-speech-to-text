# GNU Make entry points for Linux (and development tasks on macOS).
.DEFAULT_GOAL := help
.NOTPARALLEL:
PYTHON ?= python3
PREFIX ?= $(HOME)/.local
TASK = $(PYTHON) scripts/make_tasks.py

.PHONY: help doctor setup dev run test check frontend engine appimage deb bundle build extension smoke install uninstall clean
help:
	@$(TASK) help
doctor:
	@$(TASK) doctor
setup:
	$(TASK) setup
dev:
	$(TASK) dev
run: dev
test:
	$(TASK) test
check:
	$(TASK) check
frontend:
	$(TASK) frontend
engine:
	$(TASK) engine
appimage:
	$(TASK) appimage
deb:
	$(TASK) deb
bundle:
	$(TASK) bundle
build: appimage
extension:
	$(TASK) extension
smoke:
	$(TASK) smoke
install:
	$(TASK) install --prefix "$(PREFIX)"
uninstall:
	$(TASK) uninstall --prefix "$(PREFIX)"
clean:
	$(TASK) clean
